import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Quando o usuário logado é "analista", toda escrita (insert/update/upsert/delete/rpc de escrita)
// é desviada para a fila `acoes_pendentes` e só é executada quando o superior aprova.
const EXEMPT_TABLES = new Set(["acoes_pendentes", "analista_vinculos", "notificacoes", "profiles"]);
const READ_RPC = /^(get_|can_|is_|has_|marcar_intimacoes_lidas|sortear_magistrado$|sortear_desembargador$)/;
const PASSTHROUGH = new Set(["select", "single", "maybeSingle", "order", "limit", "throwOnError", "returns", "abortSignal"]);

let mode: { active: boolean; userId?: string; nome?: string } = { active: false };
// Tabelas ligadas ao cargo do superior: só essas exigem aprovação. null = ainda carregando (tudo exige).
let tabelasAprovacao: Set<string> | null = null;
export function setAnalistaMode(active: boolean, userId?: string, nome?: string) {
  mode = { active, userId, nome };
  tabelasAprovacao = null;
  if (active) {
    origRpc("get_analista_tabelas_aprovacao" as any).then(({ data }: any) => {
      if (Array.isArray(data)) tabelasAprovacao = new Set(data);
    });
  }
}
const requerAprovacao = (t: string) => !tabelasAprovacao || tabelasAprovacao.has(t);

const OP_LABEL: Record<string, string> = { insert: "Criar", update: "Editar", upsert: "Salvar", delete: "Excluir", rpc: "Executar" };

export const TABELA_LABEL: Record<string, string> = {
  processos: "Processo", movimentacoes: "Movimentação", atos_judiciais: "Ato Judicial",
  sentencas: "Sentença", apelacoes: "Apelação", embargos_declaracao: "Embargos de Declaração",
  audiencias: "Audiência", envolvidos_audiencia: "Envolvido em Audiência", intimacoes: "Intimação",
  mandados: "Mandado", prazos_processuais: "Prazo Processual", certificacoes: "Certidão",
  documentos_processo: "Documento do Processo", interessados_processo: "Interessado no Processo",
  procuracoes: "Procuração", renuncias_prazo: "Renúncia de Prazo", votos_apelacao: "Voto de Apelação",
  jurisprudencias: "Jurisprudência", tcos: "TCO", envolvidos_tco: "Envolvido em TCO",
  jurados: "Jurado", jurados_convocados: "Jurado Convocado", convocacoes_jurados: "Convocação de Jurados",
  leis_municipais: "Lei", concursos: "Concurso", inscricoes_concurso: "Inscrição em Concurso",
  questoes_concurso: "Questão de Concurso", respostas_concurso: "Resposta de Concurso",
  comunicados_concurso: "Comunicado de Concurso", comunicados_oab: "Comunicado da OAB",
  inscricoes_oab: "Inscrição na OAB", carteiras_oab: "Carteira da OAB",
  procedimentos_disciplinares: "Procedimento Disciplinar", inscricoes_unisp: "Inscrição UNISP",
  registros_cartorio: "Registro de Cartório", denuncias_ouvidoria: "Denúncia na Ouvidoria",
  modelos_documentos: "Modelo de Documento", modelos_favoritos: "Modelo Favorito",
  user_roles: "Cargo", cargo_historico: "Histórico de Cargo", ranking_destaques: "Destaque de Ranking",
  config_sistema: "Configuração do Sistema",
};

export function rotuloTabela(tabela: string): string {
  if (tabela.startsWith("rpc:")) return tabela.slice(4).replace(/_/g, " ");
  return TABELA_LABEL[tabela] || tabela.replace(/_/g, " ");
}

export const CAMPO_LABEL: Record<string, string> = {
  processo_id: "Processo", autor_id: "Autor (ID)", autor_nome: "Autor", tipo: "Tipo",
  titulo: "Título", conteudo: "Conteúdo", descricao: "Descrição", assinado: "Assinado",
  data_assinatura: "Data da assinatura", numero: "Número", status: "Situação",
  fundamentacao: "Fundamentação", dispositivo: "Dispositivo", ementa: "Ementa",
  destinatario_nome: "Destinatário", data_hora: "Data e hora", local: "Local",
  observacoes: "Observações", magistrado_id: "Magistrado (ID)", advogado_nome: "Advogado",
  parte: "Parte", nome: "Nome", nome_completo: "Nome completo", valor_causa: "Valor da causa",
  assunto: "Assunto", classe: "Classe", vara: "Vara", pedido: "Pedido",
  data_envio: "Data de envio", prazo_dias: "Prazo (dias)", cargo_intimado: "Cargo intimado",
};

export function rotuloCampo(campo: string): string {
  return CAMPO_LABEL[campo] || campo.replace(/_/g, " ");
}

// Ações enfileiradas em sequência rápida (ex.: despacho = ato judicial + movimentação)
// compartilham um grupo e são aprovadas juntas.
let grupoAtual: { id: string; em: number } | null = null;
function grupoId(): string {
  const agora = Date.now();
  if (!grupoAtual || agora - grupoAtual.em > 3000) {
    grupoAtual = { id: crypto.randomUUID(), em: agora };
  } else {
    grupoAtual.em = agora;
  }
  return grupoAtual.id;
}

async function enfileirar(tabela: string, operacao: string, payload: any, filtros: any[]) {
  const { data: v } = await supabase.from("analista_vinculos" as any).select("supervisor_id").eq("analista_id", mode.userId!).maybeSingle();
  const supervisor = (v as any)?.supervisor_id;
  if (!supervisor) {
    const error = { message: "Você é analista mas ainda não tem um superior vinculado. Peça ao administrador para vincular." };
    toast.error(error.message);
    return { data: null, error, count: null, status: 400, statusText: "" };
  }
  const { error } = await (origFrom as any)("acoes_pendentes").insert({
    analista_id: mode.userId,
    analista_nome: mode.nome,
    supervisor_id: supervisor,
    tabela,
    operacao,
    payload: payload ?? null,
    filtros,
    grupo_id: grupoId(),
    descricao: `${OP_LABEL[operacao] || operacao}: ${rotuloTabela(tabela)}`,
  });
  if (error) return { data: null, error, count: null, status: 400, statusText: "" };
  toast.info("Ação enviada para aprovação do seu superior.");
  const fake = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? { ...payload } : null;
  return { data: fake, error: null, count: null, status: 202, statusText: "Pendente" };
}

function fakeBuilder(tabela: string, operacao: string, payload: any) {
  const filtros: any[] = [];
  let promise: Promise<any> | null = null;
  const run = () => (promise ??= enfileirar(tabela, operacao, payload, filtros));
  const proxy: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === "then") return (res: any, rej: any) => run().then(res, rej);
      if (prop === "catch") return (rej: any) => run().catch(rej);
      if (prop === "finally") return (f: any) => run().finally(f);
      return (...args: any[]) => {
        if (!PASSTHROUGH.has(prop)) filtros.push({ m: prop, a: args });
        return proxy;
      };
    },
  });
  return proxy;
}

const origFrom = supabase.from.bind(supabase);
const origRpc = supabase.rpc.bind(supabase);
let installed = false;

export function installAnalistaInterceptor() {
  if (installed) return;
  installed = true;
  (supabase as any).from = (table: string) => {
    const b: any = origFrom(table as any);
    if (!mode.active || EXEMPT_TABLES.has(table)) return b;
    return new Proxy(b, {
      get(target, prop: string) {
        if (["insert", "update", "upsert", "delete"].includes(prop)) {
          return (payload?: any) => fakeBuilder(table, prop, prop === "delete" ? null : payload);
        }
        const v = target[prop];
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
  };
  (supabase as any).rpc = (fn: string, args?: any, opts?: any) => {
    if (!mode.active || READ_RPC.test(fn)) return origRpc(fn as any, args, opts);
    return fakeBuilder(`rpc:${fn}`, "rpc", args ?? {});
  };
}

// Executa, com a sessão do superior, uma ação aprovada.
export async function executarAcaoPendente(a: { tabela: string; operacao: string; payload: any; filtros: any[] }) {
  if (a.operacao === "rpc") return origRpc(a.tabela.replace(/^rpc:/, "") as any, a.payload);
  let q: any = origFrom(a.tabela as any);
  q = a.operacao === "delete" ? q.delete() : q[a.operacao](a.payload);
  for (const f of a.filtros || []) {
    if (typeof q[f.m] === "function") q = q[f.m](...(f.a || []));
  }
  return q;
}

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Quando o usuário logado é "analista", toda escrita (insert/update/upsert/delete/rpc de escrita)
// é desviada para a fila `acoes_pendentes` e só é executada quando o superior aprova.
const EXEMPT_TABLES = new Set(["acoes_pendentes", "analista_vinculos", "notificacoes", "profiles"]);
const READ_RPC = /^(get_|can_|is_|has_|marcar_intimacoes_lidas)/;
const PASSTHROUGH = new Set(["select", "single", "maybeSingle", "order", "limit", "throwOnError", "returns", "abortSignal"]);

let mode: { active: boolean; userId?: string; nome?: string } = { active: false };
export function setAnalistaMode(active: boolean, userId?: string, nome?: string) {
  mode = { active, userId, nome };
}

const OP_LABEL: Record<string, string> = { insert: "Criar", update: "Editar", upsert: "Salvar", delete: "Excluir", rpc: "Executar" };

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
    descricao: `${OP_LABEL[operacao] || operacao} em ${tabela.replace(/^rpc:/, "")}`,
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

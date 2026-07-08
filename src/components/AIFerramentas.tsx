import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2, Copy, Check, Gavel, Scale, FileText, AlertTriangle, BookOpen, RefreshCw, Inbox, FileSearch, GitCompare, Copyright, Briefcase } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS_EXTRA, PROMPTS, PROMPTS_FASE3 } from "@/lib/ai/prompts";
import { extrairNomes } from "@/lib/modelosVars";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeRichHtml, normalizeRichText } from "@/lib/sanitize";

type Tool = "minuta" | "parecer" | "documento" | "peca" | "prazos" | "fundamentacao" | "triagem" | "extracao" | "comparar" | "duplicidade" | null;

interface Props {
  processo?: any;
  movimentacoes?: any[];
}

export default function AIFerramentas({ processo, movimentacoes }: Props) {
  const { roles } = useAuth();
  const isAdvogado = roles.includes("advogado") || roles.includes("presidente_oab") || roles.includes("bacharel_direito");
  const isMagistrado = roles.some((r) => ["admin", "magistrado", "desembargador", "presidente_tribunal"].includes(r));
  const isMP = roles.some((r) => ["ministerio_publico", "procurador_geral", "procurador_estado"].includes(r));
  const isCartorio = roles.includes("oficial_justica") || isMagistrado;

  const [tool, setTool] = useState<Tool>(null);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const { run, loading } = useAI();

  // Config por ferramenta
  const [minutaTipo, setMinutaTipo] = useState<"sentenca" | "decisao">("sentenca");
  const [minutaTese, setMinutaTese] = useState("");
  const [minutaInstrucao, setMinutaInstrucao] = useState("");
  const [minutaExtenso, setMinutaExtenso] = useState(false);
  const [parecerTipo, setParecerTipo] = useState<"denuncia" | "arquivamento" | "manifestacao">("manifestacao");
  const [parecerInstrucao, setParecerInstrucao] = useState("");
  const [parecerExtenso, setParecerExtenso] = useState(false);
  const [docTipo, setDocTipo] = useState<"mandado" | "oficio" | "certidao" | "alvara">("mandado");
  const [docDestinatario, setDocDestinatario] = useState("");
  const [docFinalidade, setDocFinalidade] = useState("");
  const [docInstrucao, setDocInstrucao] = useState("");
  const [docExtenso, setDocExtenso] = useState(false);
  const [pecaTipo, setPecaTipo] = useState<"peticao_inicial" | "contestacao" | "replica" | "recurso_apelacao" | "alegacoes_finais" | "embargos_declaracao" | "agravo">("peticao_inicial");
  const [pecaTese, setPecaTese] = useState("");
  const [pecaInstrucao, setPecaInstrucao] = useState("");
  const [pecaExtenso, setPecaExtenso] = useState(false);
  const [prazosJson, setPrazosJson] = useState<any>(null);
  const [tema, setTema] = useState("");
  // Fase 3
  const [pecaInput, setPecaInput] = useState("");
  const [pecaA, setPecaA] = useState("");
  const [pecaB, setPecaB] = useState("");
  const [rotuloA, setRotuloA] = useState("Contestação");
  const [rotuloB, setRotuloB] = useState("Réplica");
  const [extracaoJson, setExtracaoJson] = useState<any>(null);
  const [triagemJson, setTriagemJson] = useState<any>(null);
  const [duplicidadeJson, setDuplicidadeJson] = useState<any>(null);
  const [buscandoDup, setBuscandoDup] = useState(false);

  // ── Enriquecimento de contexto: qualificações e advogados do processo ──
  const [partesAutores, setPartesAutores] = useState<{ nome: string; id_personagem?: string | null }[]>([]);
  const [partesReus, setPartesReus] = useState<{ nome: string; id_personagem?: string | null }[]>([]);
  const [advogadosCtx, setAdvogadosCtx] = useState<{ nome: string; oab?: string | null; id_personagem?: string | null; representa: string[] }[]>([]);
  const [juizNome, setJuizNome] = useState<string | null>(null);

  const parseJsonPartes = (raw: any): { nome: string; id_personagem?: string | null }[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((x: any) => ({ nome: x?.nome || String(x || ""), id_personagem: x?.id_personagem ?? null })).filter(p => p.nome);
    if (typeof raw === "string") {
      const s = raw.trim();
      if (s.startsWith("[")) {
        try { return parseJsonPartes(JSON.parse(s)); } catch { /* ignore */ }
      }
      return s ? [{ nome: s }] : [];
    }
    return [];
  };

  useEffect(() => {
    if (!processo?.id) {
      setPartesAutores([]); setPartesReus([]); setAdvogadosCtx([]); setJuizNome(null);
      return;
    }
    const autores = parseJsonPartes(processo.autor_nome);
    const reus = parseJsonPartes(processo.reu_nome);
    setPartesAutores(autores);
    setPartesReus(reus);

    (async () => {
      // Procurações ativas + perfis dos advogados (nome, OAB, id_personagem)
      const { data: procs } = await supabase
        .from("procuracoes")
        .select("advogado_id, advogado_nome, parte, status")
        .eq("processo_id", processo.id)
        .eq("status", "ativa");
      const advIds = [...new Set((procs || []).map((p: any) => p.advogado_id).filter(Boolean))];
      let perfis: Record<string, any> = {};
      if (advIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, nome_completo, numero_oab, id_personagem")
          .in("user_id", advIds);
        (profs || []).forEach((p: any) => { perfis[p.user_id] = p; });
      }
      const agrup = new Map<string, { nome: string; oab?: string | null; id_personagem?: string | null; representa: string[] }>();
      (procs || []).forEach((p: any) => {
        const perfil = p.advogado_id ? perfis[p.advogado_id] : null;
        const nome = perfil?.nome_completo || p.advogado_nome || "Advogado(a)";
        const key = p.advogado_id || nome;
        const cur = agrup.get(key) || { nome, oab: perfil?.numero_oab ?? null, id_personagem: perfil?.id_personagem ?? null, representa: [] };
        cur.representa.push(String(p.parte || "").replace(/^autor:/i, "AUTOR ").replace(/^reu:/i, "RÉU "));
        agrup.set(key, cur);
      });
      setAdvogadosCtx([...agrup.values()]);

      // Juiz
      if (processo.juiz_id) {
        const { data: juiz } = await supabase.from("profiles").select("nome_completo").eq("user_id", processo.juiz_id).maybeSingle();
        setJuizNome(juiz?.nome_completo || null);
      } else {
        setJuizNome(null);
      }
    })();
  }, [processo?.id, processo?.autor_nome, processo?.reu_nome, processo?.juiz_id]);

  const ctx = () => ({
    numero: processo?.numero,
    classe: processo?.classe,
    assunto: processo?.assunto,
    autor: partesAutores.map(p => p.nome).join(", ") || extrairNomes(processo?.autor_nome),
    reu: partesReus.map(p => p.nome).join(", ") || extrairNomes(processo?.reu_nome),
    status: processo?.status,
    valor_causa: processo?.valor_causa,
    partesAutores,
    partesReus,
    advogados: advogadosCtx,
    juiz: juizNome,
    movimentacoes: (movimentacoes || []).map((m: any) => ({ tipo: m.tipo, descricao: m.descricao })),
  });

  const reset = () => {
    setTexto(""); setPrazosJson(null); setCopiado(false);
    setExtracaoJson(null); setTriagemJson(null); setDuplicidadeJson(null);
  };

  const abrir = (t: Tool) => { reset(); setTool(t); };

  const gerar = async () => {
    reset();
    let req: any = null;
    if (tool === "minuta") {
      req = { operation: "gerar_sentenca", prompt: PROMPTS_EXTRA.minutaJudicial({ ...ctx(), tipo: minutaTipo, tese: minutaTese.trim() || undefined, instrucao: minutaInstrucao.trim() || undefined, extenso: minutaExtenso }) };
    } else if (tool === "parecer") {
      req = { operation: "gerar_parecer_mp", prompt: PROMPTS_EXTRA.parecerMP({ ...ctx(), tipo: parecerTipo, instrucao: parecerInstrucao.trim() || undefined, extenso: parecerExtenso }) };
    } else if (tool === "documento") {
      const opMap: any = { mandado: "gerar_mandado", oficio: "gerar_oficio", certidao: "gerar_certidao", alvara: "gerar_alvara" };
      req = { operation: opMap[docTipo], prompt: PROMPTS_EXTRA.documentoCartorio({ ...ctx(), tipo: docTipo, destinatario: docDestinatario, finalidade: docFinalidade, instrucao: docInstrucao.trim() || undefined, extenso: docExtenso }) };
    } else if (tool === "prazos") {
      req = { operation: "custom", prompt: PROMPTS_EXTRA.analisePrazosRiscos(ctx()), options: { responseSchema: { type: "object" }, temperature: 0.2 } };
    } else if (tool === "fundamentacao") {
      if (!tema.trim()) { toast.error("Informe o tema jurídico."); return; }
      req = { operation: "sugerir_fundamentacao", prompt: PROMPTS_EXTRA.sugerirFundamentacao(tema, ctx()) };
    } else if (tool === "triagem") {
      if (!pecaInput.trim()) { toast.error("Cole o texto da petição."); return; }
      req = { operation: "analisar_peticao", prompt: PROMPTS_FASE3.triagemPeticao(pecaInput), options: { responseSchema: { type: "object" }, temperature: 0.2 } };
    } else if (tool === "extracao") {
      if (!pecaInput.trim()) { toast.error("Cole o texto extraído do PDF."); return; }
      req = { operation: "classificar_documento", prompt: PROMPTS_FASE3.extrairDados(pecaInput), options: { responseSchema: { type: "object" }, temperature: 0.1 } };
    } else if (tool === "comparar") {
      if (!pecaA.trim() || !pecaB.trim()) { toast.error("Cole o texto das duas peças."); return; }
      req = { operation: "custom", prompt: PROMPTS_FASE3.compararPecas(pecaA, pecaB, rotuloA, rotuloB) };
    } else if (tool === "peca") {
      req = { operation: "custom", prompt: PROMPTS_EXTRA.pecaAdvogado({ ...ctx(), tipo: pecaTipo, tese: pecaTese.trim() || undefined, instrucao: pecaInstrucao.trim() || undefined, extenso: pecaExtenso }) };
    } else if (tool === "duplicidade") {
      await rodarDuplicidade(); return;
    }
    if (!req) return;
    const res = await run(req);
    if (res.ok) {
      if (tool === "prazos") setPrazosJson(res.json ?? tryParse(res.data as string));
      else if (tool === "triagem") setTriagemJson(res.json ?? tryParse(res.data as string));
      else if (tool === "extracao") setExtracaoJson(res.json ?? tryParse(res.data as string));
      else setTexto(res.data as string);
    }
  };

  const rodarDuplicidade = async () => {
    if (!processo?.id) return;
    setBuscandoDup(true);
    setDuplicidadeJson(null);
    try {
      const autores = extrairNomes(processo.autor_nome);
      const reus = extrairNomes(processo.reu_nome);
      const { data } = await supabase.from("processos").select("id,numero,classe,assunto,autor_nome,reu_nome,status").neq("id", processo.id).limit(200);
      const nomesAlvo = new Set([...autores.split(/,\s*/), ...reus.split(/,\s*/)].map(n => n.toLowerCase().trim()).filter(Boolean));
      const candidatos = (data || [])
        .map((p: any) => {
          const a = extrairNomes(p.autor_nome).toLowerCase();
          const r = extrairNomes(p.reu_nome).toLowerCase();
          const overlap = [...nomesAlvo].some(n => n.length > 3 && (a.includes(n) || r.includes(n)));
          const mesmoAssunto = processo.assunto && p.assunto && p.assunto.toLowerCase().includes((processo.assunto || "").toLowerCase().slice(0, 20));
          return { p, score: (overlap ? 2 : 0) + (mesmoAssunto ? 1 : 0) };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15)
        .map(x => ({ numero: x.p.numero, classe: x.p.classe, assunto: x.p.assunto, autor: extrairNomes(x.p.autor_nome), reu: extrairNomes(x.p.reu_nome) }));

      if (candidatos.length === 0) { setDuplicidadeJson({ resultados: [] }); return; }
      const res = await run({
        operation: "custom",
        prompt: PROMPTS_FASE3.detectarDuplicidade(
          { numero: processo.numero, classe: processo.classe, assunto: processo.assunto, autor: autores, reu: reus },
          candidatos,
        ),
        options: { responseSchema: { type: "object" }, temperature: 0.2 },
      });
      if (res.ok) setDuplicidadeJson(res.json ?? tryParse(res.data as string));
    } finally {
      setBuscandoDup(false);
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopiado(false), 2000);
  };

  const titulo: Record<Exclude<Tool, null>, string> = {
    minuta: "Minuta de Sentença/Decisão",
    parecer: "Parecer do MP",
    documento: "Documento Cartorário",
    peca: "Peça Advocatícia",
    prazos: "Análise de Prazos e Riscos",
    fundamentacao: "Sugerir Fundamentação Jurídica",
    triagem: "Triagem de Petição",
    extracao: "Extração de Dados (PDF)",
    comparar: "Comparar Peças",
    duplicidade: "Detectar Duplicidade / Litispendência",
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-xl">
            <Wand2 className="h-4 w-4 mr-1" /> Ferramentas IA
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Gerar com IA</DropdownMenuLabel>
          {isMagistrado && (
            <DropdownMenuItem onClick={() => abrir("minuta")}><Gavel className="h-4 w-4 mr-2" /> Minuta de sentença/decisão</DropdownMenuItem>
          )}
          {isMP && (
            <DropdownMenuItem onClick={() => abrir("parecer")}><Scale className="h-4 w-4 mr-2" /> Parecer do MP</DropdownMenuItem>
          )}
          {isAdvogado && (
            <DropdownMenuItem onClick={() => abrir("peca")}><Briefcase className="h-4 w-4 mr-2" /> Petição inicial / Contestação / Recurso</DropdownMenuItem>
          )}
          {isCartorio && (
            <DropdownMenuItem onClick={() => abrir("documento")}><FileText className="h-4 w-4 mr-2" /> Mandado / Ofício / Certidão / Alvará</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Análise</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => abrir("prazos")}><AlertTriangle className="h-4 w-4 mr-2" /> Checar prazos e riscos</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("fundamentacao")}><BookOpen className="h-4 w-4 mr-2" /> Sugerir fundamentação</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("triagem")}><Inbox className="h-4 w-4 mr-2" /> Triagem de petição</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("extracao")}><FileSearch className="h-4 w-4 mr-2" /> Extrair dados de PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("comparar")}><GitCompare className="h-4 w-4 mr-2" /> Comparar peças</DropdownMenuItem>
          {(isMagistrado || isMP) && (
            <DropdownMenuItem onClick={() => abrir("duplicidade")}><Copyright className="h-4 w-4 mr-2" /> Detectar duplicidade</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!tool} onOpenChange={(o) => !o && setTool(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" /> {tool && titulo[tool]}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {tool === "minuta" && (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={minutaTipo} onValueChange={(v: any) => setMinutaTipo(v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sentenca">Sentença</SelectItem>
                      <SelectItem value="decisao">Decisão interlocutória</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Tese/orientação principal (opcional)" value={minutaTese} onChange={(e) => setMinutaTese(e.target.value)} className="rounded-xl" />
                </div>
                <Textarea placeholder="Orientações adicionais (opcional) — ex: julgar procedente por prescrição, aplicar pena mínima, deferir gratuidade..." value={minutaInstrucao} onChange={(e) => setMinutaInstrucao(e.target.value)} className="rounded-xl min-h-[70px] text-xs" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={minutaExtenso} onChange={(e) => setMinutaExtenso(e.target.checked)} className="rounded" />
                  Gerar versão extensa e detalhada (padrão: curta e objetiva)
                </label>
              </div>
            )}

            {tool === "parecer" && (
              <div className="space-y-2">
                <Select value={parecerTipo} onValueChange={(v: any) => setParecerTipo(v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="denuncia">Denúncia</SelectItem>
                    <SelectItem value="arquivamento">Promoção de arquivamento</SelectItem>
                    <SelectItem value="manifestacao">Manifestação ministerial</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Orientações adicionais (opcional) — ex: requerer diligências, capitular no art. X, pugnar pela absolvição..." value={parecerInstrucao} onChange={(e) => setParecerInstrucao(e.target.value)} className="rounded-xl min-h-[70px] text-xs" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={parecerExtenso} onChange={(e) => setParecerExtenso(e.target.checked)} className="rounded" />
                  Gerar versão extensa e detalhada (padrão: curta e objetiva)
                </label>
              </div>
            )}

            {tool === "documento" && (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={docTipo} onValueChange={(v: any) => setDocTipo(v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mandado">Mandado</SelectItem>
                      <SelectItem value="oficio">Ofício</SelectItem>
                      <SelectItem value="certidao">Certidão</SelectItem>
                      <SelectItem value="alvara">Alvará</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Destinatário (opcional)" value={docDestinatario} onChange={(e) => setDocDestinatario(e.target.value)} className="rounded-xl" />
                  <Input placeholder="Finalidade (opcional)" value={docFinalidade} onChange={(e) => setDocFinalidade(e.target.value)} className="rounded-xl sm:col-span-2" />
                </div>
                <Textarea placeholder="Orientações adicionais (opcional)" value={docInstrucao} onChange={(e) => setDocInstrucao(e.target.value)} className="rounded-xl min-h-[60px] text-xs" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={docExtenso} onChange={(e) => setDocExtenso(e.target.checked)} className="rounded" />
                  Gerar versão extensa e detalhada (padrão: curta e objetiva)
                </label>
              </div>
            )}

            {tool === "peca" && (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={pecaTipo} onValueChange={(v: any) => setPecaTipo(v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="peticao_inicial">Petição inicial</SelectItem>
                      <SelectItem value="contestacao">Contestação</SelectItem>
                      <SelectItem value="replica">Réplica</SelectItem>
                      <SelectItem value="alegacoes_finais">Alegações finais / Memoriais</SelectItem>
                      <SelectItem value="recurso_apelacao">Recurso de apelação</SelectItem>
                      <SelectItem value="agravo">Agravo de instrumento</SelectItem>
                      <SelectItem value="embargos_declaracao">Embargos de declaração</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Tese/orientação principal (opcional)" value={pecaTese} onChange={(e) => setPecaTese(e.target.value)} className="rounded-xl" />
                </div>
                <Textarea placeholder="Orientações adicionais (opcional) — ex: pedido de tutela de urgência, danos morais, gratuidade..." value={pecaInstrucao} onChange={(e) => setPecaInstrucao(e.target.value)} className="rounded-xl min-h-[70px] text-xs" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={pecaExtenso} onChange={(e) => setPecaExtenso(e.target.checked)} className="rounded" />
                  Gerar versão extensa e detalhada (padrão: curta e objetiva)
                </label>
              </div>
            )}


            {tool === "fundamentacao" && (
              <Textarea placeholder="Descreva o tema jurídico (ex: prescrição da pretensão punitiva em crime tributário)" value={tema} onChange={(e) => setTema(e.target.value)} className="rounded-xl min-h-[80px]" />
            )}

            {(tool === "triagem" || tool === "extracao") && (
              <Textarea
                placeholder={tool === "triagem" ? "Cole o texto integral da petição..." : "Cole o texto extraído do PDF (partes, valores, datas, pedidos)..."}
                value={pecaInput}
                onChange={(e) => setPecaInput(e.target.value)}
                className="rounded-xl min-h-[180px] text-xs"
              />
            )}

            {tool === "comparar" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Input placeholder="Rótulo A" value={rotuloA} onChange={(e) => setRotuloA(e.target.value)} className="rounded-xl mb-1" />
                  <Textarea placeholder="Texto da peça A..." value={pecaA} onChange={(e) => setPecaA(e.target.value)} className="rounded-xl min-h-[200px] text-xs" />
                </div>
                <div>
                  <Input placeholder="Rótulo B" value={rotuloB} onChange={(e) => setRotuloB(e.target.value)} className="rounded-xl mb-1" />
                  <Textarea placeholder="Texto da peça B..." value={pecaB} onChange={(e) => setPecaB(e.target.value)} className="rounded-xl min-h-[200px] text-xs" />
                </div>
              </div>
            )}

            {tool === "duplicidade" && !duplicidadeJson && !buscandoDup && (
              <p className="text-xs text-muted-foreground">Clique em <strong>Gerar</strong> para buscar processos semelhantes por partes/objeto e analisar duplicidade, litispendência, conexão e continência.</p>
            )}

            <div className="flex justify-end">
              <Button size="sm" className="rounded-xl" onClick={gerar} disabled={loading || buscandoDup}>
                {(loading || buscandoDup) ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                {texto || prazosJson || extracaoJson || triagemJson || duplicidadeJson ? "Gerar novamente" : "Gerar"}
              </Button>
            </div>

            {(loading || buscandoDup) && (
              <div className="py-8 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> {buscandoDup ? "Buscando processos semelhantes..." : "Gerando..."}
              </div>
            )}

            {tool === "prazos" && prazosJson && !loading && <PrazosView data={prazosJson} />}
            {tool === "triagem" && triagemJson && !loading && <TriagemView data={triagemJson} />}
            {tool === "extracao" && extracaoJson && !loading && <ExtracaoView data={extracaoJson} />}
            {tool === "duplicidade" && duplicidadeJson && !loading && !buscandoDup && <DuplicidadeView data={duplicidadeJson} />}

            {(tool === "minuta" || tool === "parecer" || tool === "documento" || tool === "peca" || tool === "fundamentacao" || tool === "comparar") && texto && !loading && (
              <>
                <div className="rounded-xl border border-border bg-background p-4 max-h-[420px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none [&_p]:my-2 [&_strong]:font-semibold [&_em]:italic [&_u]:underline text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(normalizeRichText(texto)) }}
                />
                <details className="rounded-xl border border-border bg-secondary/20">
                  <summary className="cursor-pointer text-xs px-3 py-2 text-muted-foreground">Editar código-fonte (HTML)</summary>
                  <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="rounded-b-xl border-0 min-h-[240px] font-mono text-xs" />
                </details>
                <p className="text-[10px] text-muted-foreground">⚠️ Gerado por IA — revise fatos, valores, artigos e jurisprudência antes de utilizar.</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function tryParse(s: string) { try { return JSON.parse(s); } catch { return null; } }

function PrazosView({ data }: { data: any }) {
  if (!data) return <p className="text-sm text-muted-foreground">Sem dados retornados.</p>;
  const cor = (s: string) => s === "vencido" ? "text-destructive" : s === "iminente" ? "text-orange-600" : "text-foreground";
  const grav = (g: string) => g === "alta" ? "text-destructive" : g === "media" ? "text-orange-600" : "text-muted-foreground";
  return (
    <div className="space-y-4 text-sm">
      <Bloco titulo="Prazos">
        {(data.prazos || []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhum prazo identificado.</p> :
          <ul className="space-y-1">
            {data.prazos.map((p: any, i: number) => (
              <li key={i} className="border-l-2 border-border pl-2">
                <span className={`font-medium ${cor(p.situacao)}`}>[{(p.situacao || "").toUpperCase()}]</span> {p.descricao}
                {p.observacao && <p className="text-xs text-muted-foreground">{p.observacao}</p>}
              </li>
            ))}
          </ul>}
      </Bloco>
      <Bloco titulo="Preclusões">
        {(data.preclusoes || []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma.</p> :
          <ul className="list-disc pl-5 space-y-1">{data.preclusoes.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>}
      </Bloco>
      <Bloco titulo="Nulidades aparentes">
        {(data.nulidades || []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma.</p> :
          <ul className="list-disc pl-5 space-y-1">{data.nulidades.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>}
      </Bloco>
      <Bloco titulo="Riscos">
        {(data.riscos || []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhum.</p> :
          <ul className="space-y-1">
            {data.riscos.map((r: any, i: number) => (
              <li key={i}><span className={`font-medium ${grav(r.gravidade)}`}>[{(r.gravidade || "").toUpperCase()}]</span> {r.tipo} — {r.observacao}</li>
            ))}
          </ul>}
      </Bloco>
      <Bloco titulo="Recomendações">
        {(data.recomendacoes || []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma.</p> :
          <ul className="list-disc pl-5 space-y-1">{data.recomendacoes.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>}
      </Bloco>
      <p className="text-[10px] text-muted-foreground">⚠️ Análise assistida por IA — sempre valide prazos e nulidades manualmente.</p>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{titulo}</p>
      {children}
    </div>
  );
}

function TriagemView({ data }: { data: any }) {
  const filaCor = data.fila === "liminar" ? "bg-destructive/10 text-destructive" : data.fila === "urgente" ? "bg-orange-500/10 text-orange-600" : "bg-muted text-foreground";
  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-2 flex-wrap">
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase ${filaCor}`}>Fila: {data.fila}</span>
        <span className="px-2 py-1 rounded-lg text-xs font-semibold uppercase bg-muted">Prioridade: {data.prioridade}</span>
        {data.tipo && <span className="px-2 py-1 rounded-lg text-xs bg-muted">{data.tipo}</span>}
      </div>
      {data.resumo && <Bloco titulo="Resumo"><p className="text-sm">{data.resumo}</p></Bloco>}
      {data.justificativa && <Bloco titulo="Justificativa"><p className="text-sm">{data.justificativa}</p></Bloco>}
      {data.prazoSugerido && <Bloco titulo="Prazo sugerido"><p className="text-sm">{data.prazoSugerido}</p></Bloco>}
      {data.pedidos?.length > 0 && <Bloco titulo="Pedidos"><ul className="list-disc pl-5 text-sm space-y-1">{data.pedidos.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul></Bloco>}
    </div>
  );
}

function ExtracaoView({ data }: { data: any }) {
  const secoes: { titulo: string; itens: any[]; render: (x: any) => string }[] = [
    { titulo: "Valores", itens: data.valores || [], render: (x) => `${x.descricao}: ${x.valor}` },
    { titulo: "CPFs", itens: data.cpfs || [], render: (x) => `${x.nome} — ${x.cpf}` },
    { titulo: "CNPJs", itens: data.cnpjs || [], render: (x) => `${x.nome} — ${x.cnpj}` },
    { titulo: "Datas", itens: data.datas || [], render: (x) => `${x.descricao}: ${x.data}` },
    { titulo: "Endereços", itens: data.enderecos || [], render: (x) => `${x.parte}: ${x.endereco}` },
    { titulo: "Pedidos", itens: data.pedidos || [], render: (x) => x },
    { titulo: "Outros", itens: data.outros || [], render: (x) => `${x.campo}: ${x.valor}` },
  ];
  return (
    <div className="space-y-3 text-sm">
      {data.partes && (
        <Bloco titulo="Partes">
          <p className="text-xs"><strong>Autor(es):</strong> {(data.partes.autores || []).join(", ") || "—"}</p>
          <p className="text-xs"><strong>Réu(s):</strong> {(data.partes.reus || []).join(", ") || "—"}</p>
        </Bloco>
      )}
      {secoes.filter(s => s.itens.length > 0).map(s => (
        <Bloco key={s.titulo} titulo={s.titulo}>
          <ul className="list-disc pl-5 space-y-0.5 text-xs">
            {s.itens.map((it, i) => <li key={i}>{s.render(it)}</li>)}
          </ul>
        </Bloco>
      ))}
      <p className="text-[10px] text-muted-foreground">⚠️ Dados extraídos por IA — confira antes de preencher.</p>
    </div>
  );
}

function DuplicidadeView({ data }: { data: any }) {
  const resultados = (data.resultados || []).filter((r: any) => r.tipo !== "nenhum");
  if (resultados.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma duplicidade ou conexão detectada nos processos analisados.</p>;
  const cor = (t: string) => t === "duplicidade" ? "text-destructive" : t === "litispendencia" ? "text-destructive" : t === "conexao" ? "text-orange-600" : "text-foreground";
  return (
    <div className="space-y-2 text-sm">
      {resultados.map((r: any, i: number) => (
        <div key={i} className="border border-border rounded-xl p-3">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <span className="font-mono text-xs">{r.numero}</span>
            <div className="flex gap-2">
              <span className={`text-xs font-semibold uppercase ${cor(r.tipo)}`}>{r.tipo}</span>
              <span className="text-xs text-muted-foreground">Similaridade: {r.similaridade}%</span>
            </div>
          </div>
          <p className="text-xs mt-1 text-muted-foreground">{r.motivo}</p>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">⚠️ Análise assistida por IA — confirme manualmente antes de reunir/redistribuir os processos.</p>
    </div>
  );
}

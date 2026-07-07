import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2, Copy, Check, Gavel, Scale, FileText, AlertTriangle, BookOpen, RefreshCw, Inbox, FileSearch, GitCompare, Copyright } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS_EXTRA, PROMPTS, PROMPTS_FASE3 } from "@/lib/ai/prompts";
import { extrairNomes } from "@/lib/modelosVars";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tool = "minuta" | "parecer" | "documento" | "prazos" | "fundamentacao" | "triagem" | "extracao" | "comparar" | "duplicidade" | null;

interface Props {
  processo?: any;
  movimentacoes?: any[];
}

export default function AIFerramentas({ processo, movimentacoes }: Props) {
  const [tool, setTool] = useState<Tool>(null);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const { run, loading } = useAI();

  // Config por ferramenta
  const [minutaTipo, setMinutaTipo] = useState<"sentenca" | "decisao">("sentenca");
  const [minutaTese, setMinutaTese] = useState("");
  const [parecerTipo, setParecerTipo] = useState<"denuncia" | "arquivamento" | "manifestacao">("manifestacao");
  const [docTipo, setDocTipo] = useState<"mandado" | "oficio" | "certidao" | "alvara">("mandado");
  const [docDestinatario, setDocDestinatario] = useState("");
  const [docFinalidade, setDocFinalidade] = useState("");
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

  const ctx = () => ({
    numero: processo?.numero,
    classe: processo?.classe,
    assunto: processo?.assunto,
    autor: extrairNomes(processo?.autor_nome),
    reu: extrairNomes(processo?.reu_nome),
    status: processo?.status,
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
      req = { operation: "gerar_sentenca", prompt: PROMPTS_EXTRA.minutaJudicial({ ...ctx(), tipo: minutaTipo, tese: minutaTese.trim() || undefined }) };
    } else if (tool === "parecer") {
      req = { operation: "gerar_parecer_mp", prompt: PROMPTS_EXTRA.parecerMP({ ...ctx(), tipo: parecerTipo }) };
    } else if (tool === "documento") {
      const opMap: any = { mandado: "gerar_mandado", oficio: "gerar_oficio", certidao: "gerar_certidao", alvara: "gerar_alvara" };
      req = { operation: opMap[docTipo], prompt: PROMPTS_EXTRA.documentoCartorio({ ...ctx(), tipo: docTipo, destinatario: docDestinatario, finalidade: docFinalidade }) };
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
          <DropdownMenuItem onClick={() => abrir("minuta")}><Gavel className="h-4 w-4 mr-2" /> Minuta de sentença/decisão</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("parecer")}><Scale className="h-4 w-4 mr-2" /> Parecer do MP</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("documento")}><FileText className="h-4 w-4 mr-2" /> Mandado / Ofício / Certidão / Alvará</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Análise</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => abrir("prazos")}><AlertTriangle className="h-4 w-4 mr-2" /> Checar prazos e riscos</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("fundamentacao")}><BookOpen className="h-4 w-4 mr-2" /> Sugerir fundamentação</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("triagem")}><Inbox className="h-4 w-4 mr-2" /> Triagem de petição</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("extracao")}><FileSearch className="h-4 w-4 mr-2" /> Extrair dados de PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("comparar")}><GitCompare className="h-4 w-4 mr-2" /> Comparar peças</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("duplicidade")}><Copyright className="h-4 w-4 mr-2" /> Detectar duplicidade</DropdownMenuItem>
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
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={minutaTipo} onValueChange={(v: any) => setMinutaTipo(v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sentenca">Sentença</SelectItem>
                    <SelectItem value="decisao">Decisão interlocutória</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Tese/orientação (opcional)" value={minutaTese} onChange={(e) => setMinutaTese(e.target.value)} className="rounded-xl" />
              </div>
            )}

            {tool === "parecer" && (
              <Select value={parecerTipo} onValueChange={(v: any) => setParecerTipo(v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="denuncia">Denúncia</SelectItem>
                  <SelectItem value="arquivamento">Promoção de arquivamento</SelectItem>
                  <SelectItem value="manifestacao">Manifestação ministerial</SelectItem>
                </SelectContent>
              </Select>
            )}

            {tool === "documento" && (
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
            )}

            {tool === "fundamentacao" && (
              <Textarea placeholder="Descreva o tema jurídico (ex: prescrição da pretensão punitiva em crime tributário)" value={tema} onChange={(e) => setTema(e.target.value)} className="rounded-xl min-h-[80px]" />
            )}

            <div className="flex justify-end">
              <Button size="sm" className="rounded-xl" onClick={gerar} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                {texto || prazosJson ? "Gerar novamente" : "Gerar"}
              </Button>
            </div>

            {loading && (
              <div className="py-8 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
              </div>
            )}

            {tool === "prazos" && prazosJson && !loading && (
              <PrazosView data={prazosJson} />
            )}

            {tool !== "prazos" && texto && !loading && (
              <>
                <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="rounded-xl min-h-[360px] font-mono text-xs" />
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground">⚠️ Gerado por IA — revise fatos, valores, artigos e jurisprudência antes de utilizar.</p>
                  <Button size="sm" className="rounded-xl" onClick={copiar}>
                    {copiado ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copiado ? "Copiado" : "Copiar texto"}
                  </Button>
                </div>
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

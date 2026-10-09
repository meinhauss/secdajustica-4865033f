import { useState } from "react";
import { AlertTriangle, Brain, CheckCircle2, ClipboardCheck, FileDown, FileText, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAI } from "@/hooks/useAI";
import { CODIGO_PENAL, formatBRL, formatFianca, formatPena } from "@/data/codigoPenal";
import { toast } from "sonner";
import { generateTriagemBOPDF } from "@/lib/pdfGenerator";


const CIRCUNSTANCIAS = [
  { id: "primario", label: "Réu Primário", percentual: "-50% (Art. 37, I)" },
  { id: "advogado", label: "Assistência de Advogado constituído com atuação", percentual: "-30% a -50% (Art. 37, II)" },
  { id: "confissao", label: "Réu Confesso", percentual: "-5% a -10% (Art. 37, III)" },
  { id: "custodia15", label: "Custódia de 15 a 30 minutos", percentual: "-10% (Art. 37, IV)" },
  { id: "custodia60", label: "Custódia de 60 minutos ou mais", percentual: "-30% (Art. 37, IV)" },
  { id: "reincidente", label: "Reincidente", percentual: "+25%" },
] as const;

const CATALOGO_PENAL = CODIGO_PENAL.map((artigo) => ({
  artigo: artigo.artigo,
  crime: artigo.crime,
  penaMeses: artigo.penaMeses,
  multa: artigo.multa,
  fianca: formatFianca(artigo.fianca),
  inafiançavel: artigo.fianca === "sem_fianca",
}));

const SYSTEM_TRIAGEM = `Você é uma autoridade auxiliar de triagem penal para uso interno policial. Não retorne marcações HTML, incluindo <p>, <br> ou <strong>; retorne texto limpo ou markdown leve, sempre dentro do JSON estrito. Analise exclusivamente o relato fornecido e o catálogo do Código Penal abaixo. Não invente artigos, crimes, penas, multas ou fianças: use somente correspondências existentes no catálogo e sinalize incertezas. A resposta deve ser JSON estrito, sem markdown, com as chaves: qualificacao (objeto com vitimas, testemunhas, policiaisCondutores e autoresInvestigados, todos arrays de objetos {nome, papel, evidencias}), tipificacao (array de {autor, artigo, crime, penaBaseMeses, multaBase, fianca, inafiançavel}), cabimentoTCO ("cabível" ou "não cabível"), fundamentoTCO, fiança ("inafiançável" ou "cabível", valorTotal, fundamento), dosimetria (penaBaseMeses, multaBase, reducoes, majoracoes, penaFinalMeses, multaFinal) e alertas. Considere TCO cabível somente quando a soma das penas máximas for de até 20 meses e nenhum crime for inafiançável. Os percentuais selecionados são uma simulação auxiliar e devem ser aplicados em cascata sobre pena e multa. Isso não substitui a decisão da autoridade policial.

CATÁLOGO DO CÓDIGO PENAL DO SERVIDOR:
${JSON.stringify(CATALOGO_PENAL)}`;

export default function TriagemBOSection() {
  const [relato, setRelato] = useState("");
    const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [presoAssistido, setPresoAssistido] = useState(false);
  const [nomeAdvogado, setNomeAdvogado] = useState("");
  const [registroAdvogado, setRegistroAdvogado] = useState("");
  const [resultado, setResultado] = useState<unknown>(null);
  const limparTexto = (valor: unknown) => String(valor ?? "-").replace(/<[^>]+>/g, "").trim() || "-";
  const advogadoValidado = presoAssistido && nomeAdvogado.trim() && registroAdvogado.trim();
  const { run, loading } = useAI();

  const alternarCircunstancia = (id: string, checked: boolean | "indeterminate") => {
    if (checked === true) setSelecionadas((atual) => [...new Set([...atual, id])]);
    else setSelecionadas((atual) => atual.filter((item) => item !== id));
  };

    const circunstaciasSelecionadas = () => CIRCUNSTANCIAS
    .filter((item) => selecionadas.includes(item.id))
    .map(({ label, percentual }) => `${label} (${percentual})`);

  const gerarRelatorio = () => {
    if (!resultado) return;
    generateTriagemBOPDF({ relato, resultado, circunstancias: circunstaciasSelecionadas() });
    toast.success("Relatório PDF gerado");
  };

  const prepararTCO = () => {
    if (!resultado || typeof resultado !== "object") return;
    const dados = resultado as any;
    const primeiraTipificacao = Array.isArray(dados.tipificacao) ? dados.tipificacao[0] : null;
    const textoTipificacao = primeiraTipificacao
      ? `${primeiraTipificacao.artigo || ""} — ${primeiraTipificacao.crime || ""}`.trim()
      : "";
    window.dispatchEvent(new CustomEvent("triagem-bo-preencher-tco", {
      detail: {
        relato,
        tipificacao: textoTipificacao,
        natureza: primeiraTipificacao?.crime || "",
        descricao: relato.slice(0, 120),
      },
    }));
    toast.success("Dados preparados para o TCO");
  };

  const analisar = async () => {

    if (!relato.trim()) {
      toast.error("Cole o B.O., histórico da ocorrência ou depoimento antes de analisar.");
      return;
    }

    const circunstancias = CIRCUNSTANCIAS
      .filter((item) => selecionadas.includes(item.id))
      .map(({ label, percentual }) => `${label} (${percentual})`);
    const res = await run({
      operation: "custom",
      prompt: `Analise o relato policial abaixo. Separe os papéis, indique somente os crimes do catálogo que forem sustentados pelos fatos, calcule a soma das penas máximas e a fiança conforme as regras fornecidas. Circunstâncias selecionadas: ${circunstancias.join(", ") || "nenhuma"}. Relato:\n${relato.trim().slice(0, 18000)}`,
      options: {
        systemInstruction: SYSTEM_TRIAGEM,
        temperature: 0.1,
                maxOutputTokens: 8192,
        responseSchema: {
          type: "object",
          properties: {
            qualificacao: {
              type: "object",
              properties: {
                vitimas: { type: "array", items: { type: "object" } },
                testemunhas: { type: "array", items: { type: "object" } },
                policiaisCondutores: { type: "array", items: { type: "object" } },
                autoresInvestigados: { type: "array", items: { type: "object" } },
              },
            },
            tipificacao: { type: "array", items: { type: "object" } },
            cabimentoTCO: { type: "string", enum: ["cabível", "não cabível"] },
            fundamentoTCO: { type: "string" },
            fiança: { type: "object" },
            dosimetria: { type: "object" },
            alertas: { type: "array", items: { type: "string" } },
          },
          required: ["qualificacao", "tipificacao", "cabimentoTCO", "fundamentoTCO", "fiança", "dosimetria", "alertas"],
        },
      },
    });

    if (res.ok) {
            let estruturado: unknown = res.json;
      if (!estruturado) {
        try { estruturado = JSON.parse(res.data as string); } catch { estruturado = null; }
      }
      if (!estruturado || typeof estruturado !== "object") {
        toast.error("A IA retornou uma resposta fora do formato estruturado esperado.");
        return;
      }
      setResultado(estruturado);
      toast.success("Ocorrência analisada pela IA");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-institutional" />
            <h2 className="font-display text-2xl font-bold text-foreground">Triagem de B.O. & Enquadramento Penal IA</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Análise auxiliar para Polícia Civil, Delegados, PM, PF, Corregedoria, GAECO e Administração.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1 border-institutional/30 text-institutional"><ShieldCheck className="h-3 w-3" /> Uso interno policial</Badge>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-institutional sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gold" />
          <h3 className="font-display font-semibold">Relato da ocorrência</h3>
        </div>
        <Textarea
          value={relato}
          onChange={(event) => setRelato(event.target.value)}
          placeholder="Cole o Boletim de Ocorrência, o histórico da ocorrência ou o depoimento dos policiais..."
          className="min-h-[240px] rounded-xl resize-y"
          aria-label="Relato do Boletim de Ocorrência"
        />
        <p className="mt-2 text-xs text-muted-foreground">A IA fará uma sugestão preliminar. Revise todos os dados e fundamentos antes de formalizar o procedimento.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-institutional sm:p-6">
        <h3 className="font-display font-semibold">Circunstâncias rápidas</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CIRCUNSTANCIAS.map((item) => (
            <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
              <Checkbox checked={selecionadas.includes(item.id)} onCheckedChange={(checked) => alternarCircunstancia(item.id, checked)} />
              <span className="text-sm font-medium">{item.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{item.percentual}</span>
            </label>
          ))}
        </div>
      </div>

      <Button onClick={analisar} disabled={loading} className="h-12 w-full rounded-xl bg-institutional text-base font-semibold hover:bg-institutional/90 sm:w-auto sm:px-8">
        {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analisando ocorrência...</> : <><Brain className="mr-2 h-5 w-5" /> Analisar Ocorrência e Enquadrar com IA</>}
      </Button>

      {loading && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5" aria-label="Carregando análise">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>
      )}

      {resultado && !loading && (
        <div className="rounded-2xl border border-institutional/20 bg-institutional/5 p-5">
          <div className="mb-2 flex items-center gap-2 font-semibold text-institutional"><CheckCircle2 className="h-4 w-4" /> Análise estruturada recebida</div>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-foreground">{JSON.stringify(resultado, null, 2)}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={gerarRelatorio}>
              <FileDown className="mr-2 h-4 w-4" /> Gerar relatório PDF
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={prepararTCO}>
              <ClipboardCheck className="mr-2 h-4 w-4" /> Preparar preenchimento do TCO
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => navigator.clipboard?.writeText(JSON.stringify(resultado, null, 2))}>
              <FileText className="mr-2 h-4 w-4" /> Copiar análise estruturada
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">A análise é auxiliar e deve ser revisada pela autoridade policial antes de qualquer formalização.</p>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { AlertTriangle, Grid3X3, CheckCircle2, ClipboardCheck, FileDown, FileText, Loader2, ShieldCheck } from "lucide-react";
import { PersonLookupInput } from "@/components/PersonLookupInput";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAI } from "@/hooks/useAI";
import { supabase } from "@/integrations/supabase/client";
import { CODIGO_PENAL, formatBRL, formatFianca, formatPena } from "@/data/codigoPenal";
import { toast } from "sonner";
import { generateTriagemBOPDF } from "@/lib/pdfGenerator";
import { triagemValueToText } from "@/lib/triagemFormatting";
import TriagemResults from "@/components/triagem/TriagemResults";
import { useAuth } from "@/hooks/useAuth";
import { imageToBase64 } from "@/lib/pdfGenerator";
import logoSjc from "@/assets/logo-sjc.jpg";


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

const SYSTEM_TRIAGEM = `Você é uma autoridade auxiliar de triagem penal para uso interno policial. Faça análise estritamente fática: ignore capitulações, enquadramentos, títulos de crimes e indicações jurídicas previamente escritos no cabeçalho ou em outras partes do B.O.; considere somente os fatos narrados no corpo do relato. Só tipifique um crime do catálogo quando a conduta narrada preencher integralmente, de forma clara, todos os elementos do tipo penal. Se o relato for genérico, vago ou insuficiente, não tipifique o crime. Compare obrigatoriamente qualquer capitulação prévia do B.O. com os fatos narrados e, se houver discrepância ou incongruência (inclusive crime mais grave que os fatos sustentam), inclua no array alertas uma advertência clara descrevendo a divergência fática e o enquadramento que os fatos realmente permitem, sem repetir a capitulação como se fosse comprovada. PROIBIDO retornar qualquer marcação HTML em qualquer campo do JSON, incluindo <p>, <br>, <strong> ou <div>; use somente texto puro e conciso ou markdown leve, sempre dentro do JSON estrito. Analise exclusivamente o relato fornecido e o catálogo do Código Penal abaixo. Não invente artigos, crimes, penas, multas ou fianças: use somente correspondências existentes no catálogo e sinalize incertezas. A resposta deve ser JSON estrito, sem markdown, com as chaves: qualificacao (objeto com vitimas, testemunhas, policiaisCondutores e autoresInvestigados, todos arrays de objetos {nome, papel, evidencias}), tipificacao (array de {autor, artigo, crime, penaBaseMeses, multaBase, fianca, inafiançavel}), cabimentoTCO ("cabível" ou "não cabível"), fundamentoTCO, fiança ("inafiançável" ou "cabível", valorTotal, fundamento), dosimetria (penaBaseMeses, multaBase, reducoes, majoracoes, penaFinalMeses, multaFinal) e alertas. Considere TCO cabível somente quando a soma das penas máximas for de até 20 meses e nenhum crime for inafiançável. Os percentuais selecionados são uma simulação auxiliar e devem ser aplicados em cascata sobre pena e multa. Isso não substitui a decisão da autoridade policial.

CATÁLOGO DO CÓDIGO PENAL DO SERVIDOR:
${JSON.stringify(CATALOGO_PENAL)}`;

export default function TriagemBOSection({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const { user, profile } = useAuth();
  const [exportando, setExportando] = useState(false);
    const [relato, setRelato] = useState("");
  const [numeroBo, setNumeroBo] = useState("");
    const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [presoAssistido, setPresoAssistido] = useState(false);
    const [nomeAdvogado, setNomeAdvogado] = useState("");
  const [idAdvogado, setIdAdvogado] = useState("");
  const [registroAdvogado, setRegistroAdvogado] = useState("");
    const [atuacaoAdvogado, setAtuacaoAdvogado] = useState(30);
  const [confissaoReducao, setConfissaoReducao] = useState(5);
  const [custodiaReducao, setCustodiaReducao] = useState(0);
  const [resultado, setResultado] = useState<unknown>(null);
  const limparTexto = triagemValueToText;
    const advogadoValidado = presoAssistido && Boolean(nomeAdvogado.trim() && idAdvogado.trim() && registroAdvogado.trim());
  const reducoesSelecionadas = {
    primario: selecionadas.includes("primario") ? 50 : 0,
    advogado: selecionadas.includes("advogado") ? atuacaoAdvogado : 0,
    confissao: selecionadas.includes("confissao") ? confissaoReducao : 0,
    custodia: selecionadas.includes("custodia15") || selecionadas.includes("custodia60") ? custodiaReducao : 0,
  };
  const totalReducoes = Math.min(70, Object.values(reducoesSelecionadas).reduce((total, valor) => total + valor, 0));
  const tetoAtingido = Object.values(reducoesSelecionadas).reduce((total, valor) => total + valor, 0) > 70;
  const { run, loading } = useAI();

  const alternarCircunstancia = (id: string, checked: boolean | "indeterminate") => {
    if (checked === true) setSelecionadas((atual) => [...new Set([...atual, id])]);
    else setSelecionadas((atual) => atual.filter((item) => item !== id));
  };

    const circunstaciasSelecionadas = () => CIRCUNSTANCIAS
    .filter((item) => selecionadas.includes(item.id))
    .map(({ label, percentual }) => `${label} (${percentual})`);

  const gerarRelatorio = async () => {
    if (!resultado || exportando) return;
    if (!user || profile?.user_id !== user.id || !profile?.nome_completo?.trim()) {
      toast.error("Aguarde a identificação do agente logado antes de exportar o relatório.");
      return;
    }
    setExportando(true);
    try {
      const logoBase64 = await imageToBase64(logoSjc);
      if (!logoBase64) throw new Error("Timbrado indisponível");
      generateTriagemBOPDF({
        relato, resultado, circunstancias: circunstaciasSelecionadas(), logoBase64,
        agente: { nome: profile.nome_completo, idPersonagem: profile.id_personagem || undefined },
      });
      toast.success("Relatório PDF gerado");
    } catch {
      toast.error("Não foi possível gerar o relatório com timbrado. Tente novamente.");
    } finally {
      setExportando(false);
    }
  };

    const prepararTCO = () => {
    if (!resultado || typeof resultado !== "object") return;
    const dados = resultado as any;
    const primeiraTipificacao = Array.isArray(dados.tipificacao) ? dados.tipificacao[0] : null;
    const envolvidos = [
      ...(Array.isArray(dados.qualificacao?.autoresInvestigados) ? dados.qualificacao.autoresInvestigados.map((envolvido: any) => ({ tipo: "autor_fato", nome: envolvido.nome || "", qualificacao: envolvido.papel || envolvido.evidencias || "", id_personagem: envolvido.id_personagem || "", observacoes: "" })) : []),
      ...(Array.isArray(dados.qualificacao?.vitimas) ? dados.qualificacao.vitimas.map((envolvido: any) => ({ tipo: "vitima", nome: envolvido.nome || "", qualificacao: envolvido.papel || envolvido.evidencias || "", id_personagem: envolvido.id_personagem || "", observacoes: "" })) : []),
    ].filter((envolvido) => envolvido.nome.trim());
    sessionStorage.setItem("tco_prefill_data", JSON.stringify({
      relato,
      natureza: primeiraTipificacao?.crime || "",
      tipificacao: primeiraTipificacao ? `${primeiraTipificacao.artigo || ""} — ${primeiraTipificacao.crime || ""}`.trim() : "",
      descricao: dados.descricao || relato.trim(),
      envolvidos,
    }));
    onNavigate?.("tco");
    window.dispatchEvent(new CustomEvent("triagem-bo-preencher-tco"));
    toast.success("Dados preparados para o TCO");
  };

      const analisar = async () => {

    if (!numeroBo.trim()) {
      toast.error("Informe o número do Boletim de Ocorrência antes de prosseguir com a análise.");
      return;
    }
    if (!relato.trim()) {
      toast.error("Cole o B.O., histórico da ocorrência ou depoimento antes de analisar.");
      return;
    }
    if (selecionadas.some((id) => id !== "reincidente") && !advogadoValidado) {
      toast.error("Valide o advogado constituído antes de selecionar reduções de pena.");
      return;
    }

    const circunstancias = CIRCUNSTANCIAS
      .filter((item) => selecionadas.includes(item.id))
      .map(({ label, percentual }) => `${label} (${percentual})`);
    const res = await run({
      operation: "custom",
      prompt: `Analise o B.O. abaixo com estrita prioridade aos fatos narrados no corpo do relato. Ignore capitulações, enquadramentos, títulos de crimes e indicações jurídicas previamente anotados no cabeçalho ou no texto do B.O.; eles são apenas referências a serem confrontadas, nunca prova. Para cada crime, exija que a narrativa descreva claramente a conduta e preencha integralmente os elementos do tipo penal do catálogo; diante de relato genérico, vago ou incompleto, não tipifique. Compare obrigatoriamente o título ou enquadramento prévio com os fatos e, se houver incongruência, inclua no array alertas uma advertência objetiva sobre a discrepância e sobre o que os fatos efetivamente sustentam. Separe os papéis, indique somente os crimes do catálogo que forem sustentados pelos fatos, calcule a soma das penas máximas e a fiança conforme as regras fornecidas. Circunstâncias selecionadas: ${circunstancias.join(", ") || "nenhuma"}. Relato:\n${relato.trim().slice(0, 18000)}`,
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
            <Grid3X3 className="h-6 w-6 text-institutional" />
                        <h2 className="font-display text-2xl font-bold text-foreground">Triagem Penal</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Análise penal auxiliar para Polícia Civil, Delegados, PM, PF, Corregedoria, GAECO e Administração, com revisão obrigatória da autoridade policial.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1 border-institutional/30 text-institutional"><ShieldCheck className="h-3 w-3" /> Uso interno policial</Badge>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-institutional sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gold" />
          <h3 className="font-display font-semibold">Relato da ocorrência</h3>
        </div>
                <Input
          value={numeroBo}
          onChange={(event) => setNumeroBo(event.target.value)}
          placeholder="Ex: BO-000001/2026"
          aria-label="Número do Boletim de Ocorrência"
          required
          className="mb-3 rounded-xl"
        />
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
        <h3 className="font-display font-semibold">Validação da assistência jurídica</h3>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
          <Checkbox checked={presoAssistido} onCheckedChange={(checked) => setPresoAssistido(checked === true)} />
          <span className="text-sm font-medium">Preso assistido por Advogado Constituído?</span>
        </label>
                {presoAssistido && (
          <div className="mt-3 space-y-3">
            <PersonLookupInput
              idValue={idAdvogado}
              nomeValue={nomeAdvogado}
              onIdChange={setIdAdvogado}
              onNomeChange={setNomeAdvogado}
                            onLookupResult={async (result) => {
                setNomeAdvogado(result?.nome_completo || "");
                setIdAdvogado(result?.id_personagem || "");
                if (!result) {
                  setRegistroAdvogado("");
                  return;
                }
                if (result.oab_numero) {
                  setRegistroAdvogado(result.oab_numero);
                  return;
                }
                const { data } = await supabase
                  .from("carteiras_oab")
                  .select("numero_oab")
                  .eq("id_personagem", result.id_personagem)
                  .maybeSingle();
                setRegistroAdvogado(data?.numero_oab || "");
              }}
              idLabel="ID do Personagem do Advogado"
              idPlaceholder="Buscar por ID do Personagem"
              nomeLabel="Nome Completo do Advogado"
              nomePlaceholder="Buscar por nome completo"
              required
            />
            <Input value={registroAdvogado} onChange={(event) => setRegistroAdvogado(event.target.value)} placeholder="Nº OAB ou RG do Advogado" aria-label="Nº OAB ou RG do Advogado" required />
            {advogadoValidado && <p className="text-xs text-green-600">✓ Advogado identificado e validado para a dosimetria.</p>}
          </div>
        )}
                {!advogadoValidado && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">Art. 39 do Decreto-Lei nº 006/2024: Sem a assistência de um advogado constituído, a autoridade policial não concede benefícios de redução de pena.</div>}
        <h3 className="mt-6 font-display font-semibold">Reduções e majorações legais</h3>
        <div className={`mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${!advogadoValidado ? "pointer-events-none opacity-50" : ""}`} aria-disabled={!advogadoValidado}>
          <label className="flex items-center gap-3 rounded-xl border border-border p-3"><Checkbox disabled={!advogadoValidado} checked={selecionadas.includes("primario")} onCheckedChange={(checked) => alternarCircunstancia("primario", checked)} /><span className="text-sm font-medium">Réu Primário</span><span className="ml-auto text-xs text-muted-foreground">-50% (Art. 37, I)</span></label>
          <div className="rounded-xl border border-border p-3"><div className="flex justify-between text-sm font-medium"><span>Atuação do Advogado Constituído</span><span>{atuacaoAdvogado}%</span></div><Slider disabled={!advogadoValidado} value={[atuacaoAdvogado]} onValueChange={([value]) => { setAtuacaoAdvogado(value); if (!selecionadas.includes("advogado")) alternarCircunstancia("advogado", true); }} min={30} max={50} step={5} className="mt-3" /><p className="mt-1 text-xs text-muted-foreground">Art. 37, II · 30% a 50%</p></div>
          <div className="rounded-xl border border-border p-3"><div className="flex justify-between text-sm font-medium"><span>Réu Confesso</span><span>{confissaoReducao}%</span></div><Slider disabled={!advogadoValidado} value={[confissaoReducao]} onValueChange={([value]) => { setConfissaoReducao(value); if (!selecionadas.includes("confissao")) alternarCircunstancia("confissao", true); }} min={5} max={10} step={1} className="mt-3" /><p className="mt-1 text-xs text-muted-foreground">Art. 37, III · 5% a 10%</p></div>
          <div className="rounded-xl border border-border p-3"><div className="flex justify-between text-sm font-medium"><span>Tempo de Custódia</span><span>{custodiaReducao ? `${custodiaReducao}%` : "Não selecionado"}</span></div><div className="mt-3 flex gap-2"><Button type="button" size="sm" variant={custodiaReducao === 10 ? "default" : "outline"} disabled={!advogadoValidado} onClick={() => { setCustodiaReducao(10); setSelecionadas((atual) => [...atual.filter((id) => id !== "custodia60"), "custodia15"]); }}>10% · 15–30 min</Button><Button type="button" size="sm" variant={custodiaReducao === 30 ? "default" : "outline"} disabled={!advogadoValidado} onClick={() => { setCustodiaReducao(30); setSelecionadas((atual) => [...atual.filter((id) => id !== "custodia15"), "custodia60"]); }}>30% · 60+ min</Button></div><p className="mt-1 text-xs text-muted-foreground">Art. 37, IV</p></div>
          <label className="flex items-center gap-3 rounded-xl border border-border p-3"><Checkbox disabled={!advogadoValidado} checked={selecionadas.includes("reincidente")} onCheckedChange={(checked) => alternarCircunstancia("reincidente", checked)} /><span className="text-sm font-medium">Reincidente</span><span className="ml-auto text-xs text-muted-foreground">+25%</span></label>
        </div>
        <div className={`mt-4 rounded-xl border p-3 text-sm ${tetoAtingido ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200" : "border-border bg-muted/30"}`}><strong>Redução total: {totalReducoes}% / 70%</strong>{tetoAtingido && <span className="ml-2">Teto legal do Art. 37, parágrafo único, aplicado automaticamente.</span>}</div>
      </div>

            <Button onClick={analisar} disabled={loading} className="h-12 w-full rounded-xl bg-primary text-primary-foreground shadow hover:bg-primary/90 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:px-8">
        {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analisando ocorrência...</> : <><Grid3X3 className="mr-2 h-5 w-5" /> Analisar Ocorrência e Enquadrar com IA</>}
      </Button>

      {loading && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5" aria-label="Carregando análise">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>
      )}

      {resultado && !loading && (
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center gap-2 font-semibold text-institutional"><CheckCircle2 className="h-4 w-4" /> Resultado da análise</div>
          <TriagemResults resultado={resultado} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={gerarRelatorio} disabled={exportando}>
              {exportando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} Gerar relatório PDF
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={prepararTCO}>
              <ClipboardCheck className="mr-2 h-4 w-4" /> Preparar preenchimento do TCO
            </Button>
             <Button variant="outline" className="rounded-xl" onClick={() => navigator.clipboard?.writeText(limparTexto(resultado))}>
              <FileText className="mr-2 h-4 w-4" /> Copiar análise estruturada
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">A análise é auxiliar e deve ser revisada pela autoridade policial antes de qualquer formalização.</p>
        </div>
      )}
    </div>
  );
}

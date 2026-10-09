import { formatBRL } from "@/data/codigoPenal";
import { triagemValueToText } from "@/lib/triagemFormatting";

export interface TriagemReportSection { title: string; paragraphs: string[] }

function record(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try { return record(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function list(value: unknown): unknown[] {
  if (typeof value === "string") {
    try { return list(JSON.parse(value)); } catch { return value.trim() ? [value] : []; }
  }
  return Array.isArray(value) ? value : value == null ? [] : [value];
}
const text = (value: unknown) => triagemValueToText(value);
const money = (value: unknown) => typeof value === "number" ? formatBRL(value) : text(value);
const months = (value: unknown) => typeof value === "number" ? `${value} meses` : text(value);
const present = (value: unknown) => value != null && value !== "";

/** Compose prose from the existing analysis, never supplying missing legal grounds. */
export function buildTriagemReport(relato: string, resultado: unknown, circunstancias: string[]): TriagemReportSection[] {
  const data = record(resultado);
  const qualification = record(data.qualificacao);
  const crimes = list(data.tipificacao);
  const sentence = record(data.dosimetria);
  const bail = record(data.fiança ?? data.fianca);
  const people = [["autoresInvestigados", "investigado(a)"], ["vitimas", "vítima"], ["testemunhas", "testemunha"], ["policiaisCondutores", "policial condutor(a)"]]
    .flatMap(([key, role]) => list(qualification[key]).map(value => {
      const person = record(value);
      return `${text(person.nome ?? value)} foi identificado(a) no relato como ${role}.${present(person.evidencias) ? ` Elementos apontados na análise: ${text(person.evidencias)}` : " A análise não informou elementos individualizados de participação."}`;
    }));
  const chargeParagraphs = crimes.map(value => {
    const crime = record(value);
    if (!Object.keys(crime).length) return text(value);
    const description = `Para ${text(crime.autor)}, a análise sugere, em caráter preliminar, o enquadramento em ${text(crime.artigo)} — ${text(crime.crime)}.`;
    const penalties = ` A pena-base indicada é de ${months(crime.penaBaseMeses)}, com multa-base de ${money(crime.multaBase)}.`;
    const reasoning = crime.fundamento ?? crime.evidencias ?? crime.justificativa;
    return description + penalties + (present(reasoning) ? ` Fundamentação indicada: ${text(reasoning)}` : " Não foi apresentada fundamentação individualizada para esta imputação; a correspondência entre os fatos e o artigo deve ser conferida pela autoridade policial.");
  });
  const bailStatus = bail.cabimento ?? bail.status ?? (typeof data.fiança === "string" ? data.fiança : undefined);
  const adjustments = (value: unknown, label: string) => {
    const items = list(value);
    if (!items.length) return `A análise não registrou ${label}.`;
    return `${label.charAt(0).toUpperCase() + label.slice(1)} registradas: ${items.map(item => {
      const adjustment = record(item);
      if (!Object.keys(adjustment).length) return text(item);
      const name = adjustment.descricao ?? adjustment.motivo ?? adjustment.tipo;
      return `${text(name)}${present(adjustment.percentual) ? ` (${text(adjustment.percentual)}%)` : ""}${present(adjustment.fundamento) ? `, com fundamento em ${text(adjustment.fundamento)}` : ""}`;
    }).join("; ")}.`;
  };
  return [
    { title: "1. Objeto e relato da ocorrência", paragraphs: ["Este relatório apresenta a triagem penal preliminar do relato fornecido, para revisão pela autoridade policial. As conclusões abaixo reproduzem os dados e fundamentos disponíveis na análise e não constituem decisão definitiva.", text(relato)] },
    { title: "2. Identificação e participação dos envolvidos", paragraphs: people.length ? people : ["A análise não identificou envolvidos de forma estruturada. É necessária a conferência de sua qualificação antes da formalização do procedimento.", ...(present(data.qualificacao) && !Object.keys(qualification).length ? [text(data.qualificacao)] : [])] },
    { title: "3. Enquadramento penal preliminar", paragraphs: chargeParagraphs.length ? chargeParagraphs : ["A análise não indicou tipificação penal. Não se presume a inexistência de infração; o relato deve ser revisto pela autoridade competente."] },
    { title: "4. Cabimento do Termo Circunstanciado de Ocorrência", paragraphs: [`Quanto ao TCO, a conclusão informada pela análise é: ${text(data.cabimentoTCO)}.`, present(data.fundamentoTCO) ? `Fundamentação: ${text(data.fundamentoTCO)}` : "A análise não apresentou fundamento para o cabimento ou não cabimento do TCO. A conclusão necessita de validação antes de sua adoção."] },
    { title: "5. Fiança", paragraphs: [`Quanto à fiança, a situação indicada é: ${text(bailStatus)}.${present(bail.valorTotal) ? ` O valor total informado é de ${money(bail.valorTotal)}.` : ""}`, present(bail.fundamento) ? `Fundamentação: ${text(bail.fundamento)}` : "A análise não apresentou fundamento específico sobre a fiança. A autoridade competente deve conferir a possibilidade de concessão e o valor aplicável."] },
    { title: "6. Dosimetria preliminar", paragraphs: [`A análise indica pena-base total de ${months(sentence.penaBaseMeses)} e multa-base de ${money(sentence.multaBase)}.`, circunstancias.length ? `Circunstâncias selecionadas para a análise: ${circunstancias.map(text).join("; ")}.` : "Nenhuma circunstância foi selecionada para a análise.", adjustments(sentence.reducoes, "reduções"), adjustments(sentence.majoracoes, "majorações"), `O resultado sugerido é de ${months(sentence.penaFinalMeses)}, com multa final de ${money(sentence.multaFinal)}. Os valores devem ser conferidos à luz do ordenamento aplicável antes da formalização.`, ...(present(sentence.fundamento) ? [`Fundamentação da dosimetria: ${text(sentence.fundamento)}`] : [])] },
    { title: "7. Ressalvas e conclusão", paragraphs: [...list(data.alertas).map(text), "Submete-se a presente triagem à revisão da autoridade policial, especialmente quanto à qualificação dos envolvidos, à adequação dos fatos aos tipos penais, ao cabimento do TCO, à fiança e à dosimetria. Fundamentos ausentes não foram supridos por presunção neste relatório."] },
  ];
}
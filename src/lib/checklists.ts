/**
 * Itens obrigatórios/recomendados por tipo de movimentação.
 * Servem como lembrete visual — não bloqueiam o envio.
 */
export interface ChecklistItem {
  id: string;
  label: string;
  /** Regex opcional para auto-marcar quando o texto contém o termo. */
  regex?: RegExp;
}

export const CHECKLISTS: Record<string, ChecklistItem[]> = {
  sentenca: [
    { id: "relatorio", label: "Relatório dos fatos", regex: /relat[óo]rio|trata-se|vistos/i },
    { id: "fundamentacao", label: "Fundamentação jurídica", regex: /fundament|nos termos|art\.|artigo/i },
    { id: "dispositivo", label: "Dispositivo (julgo procedente/improcedente)", regex: /julgo|dispositivo|condeno|absolvo/i },
    { id: "custas", label: "Custas processuais", regex: /custas/i },
    { id: "intimacoes", label: "Intimações das partes", regex: /intime-se|intimem-se|publique-se/i },
  ],
  decisao_judicial: [
    { id: "fundamentacao", label: "Fundamentação (art. 93, IX, CF)", regex: /fundament|nos termos|art\./i },
    { id: "dispositivo", label: "Dispositivo/decisão", regex: /defiro|indefiro|decido|determino/i },
    { id: "intimacoes", label: "Intimações", regex: /intime-se|intimem-se/i },
  ],
  despacho: [
    { id: "determinacao", label: "Determinação clara", regex: /determino|cumpra|expe|intime|cite/i },
  ],
  denuncia: [
    { id: "qualificacao", label: "Qualificação do denunciado" },
    { id: "fatos", label: "Descrição do fato criminoso", regex: /no dia|por volta|nas circunst/i },
    { id: "tipificacao", label: "Tipificação legal (art./CP)", regex: /art\.\s*\d+/i },
    { id: "rol_testemunhas", label: "Rol de testemunhas" },
    { id: "pedido", label: "Pedido de recebimento e citação", regex: /receb|cite-se/i },
  ],
  parecer_mp: [
    { id: "relatorio", label: "Relatório", regex: /trata-se|relat[óo]rio/i },
    { id: "fundamentacao", label: "Fundamentação", regex: /fundament|nos termos/i },
    { id: "manifestacao", label: "Manifestação conclusiva", regex: /opin[ao]|manifest|requer/i },
  ],
  peticao: [
    { id: "enderecamento", label: "Endereçamento ao juízo", regex: /excelent[íi]ssim|meritíssim/i },
    { id: "qualificacao", label: "Qualificação da parte" },
    { id: "fatos_direito", label: "Dos fatos e do direito" },
    { id: "pedido", label: "Pedido", regex: /requer/i },
  ],
  recurso: [
    { id: "tempestividade", label: "Tempestividade" },
    { id: "razoes", label: "Razões recursais" },
    { id: "pedido", label: "Pedido de reforma", regex: /requer|reform/i },
  ],
  mandado: [
    { id: "destinatario", label: "Destinatário identificado" },
    { id: "endereco", label: "Endereço de cumprimento" },
    { id: "finalidade", label: "Finalidade (citação/intimação/prisão)" },
  ],
};

export function getChecklist(tipo: string): ChecklistItem[] {
  return CHECKLISTS[tipo] || [];
}

/**
 * Prazos processuais automáticos: mapa de tipo de movimentação -> horas.
 * Ao criar uma movimentação, agenda automaticamente o prazo correspondente.
 * Convenção do projeto: prazos em HORAS.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PrazoAutomatico {
  horas: number;
  descricao: string;
}

export const PRAZOS_AUTOMATICOS: Record<string, PrazoAutomatico> = {
  citacao: { horas: 72, descricao: "Prazo para apresentação de defesa" },
  intimacao: { horas: 72, descricao: "Prazo para manifestação" },
  despacho: { horas: 24, descricao: "Prazo para cumprimento" },
  decisao_judicial: { horas: 72, descricao: "Prazo para recurso" },
  sentenca: { horas: 72, descricao: "Prazo para recurso/embargos" },
  conclusao: { horas: 24, descricao: "Prazo para decisão" },
  denuncia: { horas: 72, descricao: "Prazo para resposta à acusação" },
  parecer_mp: { horas: 72, descricao: "Prazo para vista das partes" },
  manifestacao_mp: { horas: 72, descricao: "Prazo para réplica" },
  peticao: { horas: 72, descricao: "Prazo para manifestação da parte contrária" },
  contestacao: { horas: 72, descricao: "Prazo para réplica" },
  recurso: { horas: 72, descricao: "Prazo para contrarrazões" },
  recurso_mp: { horas: 72, descricao: "Prazo para contrarrazões" },
  alegacoes_finais: { horas: 72, descricao: "Prazo para alegações finais da parte contrária" },
  mandado: { horas: 72, descricao: "Prazo para cumprimento do mandado" },
  alvara: { horas: 24, descricao: "Prazo para expedição/retirada" },
  cumprimento_mandado: { horas: 24, descricao: "Prazo para juntada aos autos" },
};

export function getPrazoAutomatico(tipo: string): PrazoAutomatico | null {
  return PRAZOS_AUTOMATICOS[tipo] ?? null;
}

/**
 * Cria um prazo processual no backend baseado no tipo da movimentação.
 * Retorna true se agendou, false se o tipo não tem prazo automático.
 * Silencioso em erro (não bloqueia o fluxo principal).
 */
export async function agendarPrazoAutomatico(
  processoId: string,
  tipo: string,
  responsavelId?: string | null
): Promise<PrazoAutomatico | null> {
  const p = getPrazoAutomatico(tipo);
  if (!p || !processoId) return null;
  const agora = new Date();
  const fim = new Date(agora.getTime() + p.horas * 60 * 60 * 1000);
  const { error } = await supabase.from("prazos_processuais").insert({
    processo_id: processoId,
    tipo,
    descricao: `${p.descricao} (${p.horas}h)`,
    data_inicio: agora.toISOString(),
    data_fim: fim.toISOString(),
    dias_uteis: p.horas,
    responsavel_id: responsavelId ?? null,
    status: "pendente",
  });
  if (error) {
    console.error("[prazo automático]", error);
    return null;
  }
  return p;
}

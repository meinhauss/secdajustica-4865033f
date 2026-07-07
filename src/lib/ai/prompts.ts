/**
 * Prompts padronizados. Centralizar aqui garante consistência de estilo jurídico.
 */
export const SYSTEM_JURIDICO =
  "Você é um assistente jurídico brasileiro. Redija em português formal, técnico, com precisão terminológica. Nunca invente fatos, artigos de lei ou jurisprudência. Se algum dado faltar, aponte a lacuna.";

export const PROMPTS = {
  resumirProcesso: (ctx: {
    numero?: string; classe?: string; assunto?: string;
    autor?: string; reu?: string; status?: string;
    movimentacoes?: { tipo: string; descricao: string; data?: string }[];
  }) => `Resuma este processo judicial em português, de forma objetiva e estruturada.

Dados:
- Número: ${ctx.numero || "-"}
- Classe: ${ctx.classe || "-"}
- Assunto: ${ctx.assunto || "-"}
- Autor(es): ${ctx.autor || "-"}
- Réu(s): ${ctx.reu || "-"}
- Status atual: ${ctx.status || "-"}

Últimas movimentações (mais recentes primeiro):
${(ctx.movimentacoes || []).slice(0, 20).map((m, i) => `${i + 1}. [${m.tipo}] ${m.data || ""} — ${(m.descricao || "").replace(/<[^>]+>/g, " ").slice(0, 500)}`).join("\n") || "(nenhuma)"}

Formato da resposta (markdown):
**Partes:** ...
**Pedido/Objeto:** ...
**Últimos atos relevantes:** bullets curtos
**Situação atual:** 1–2 frases
**Próximos passos sugeridos:** bullets`,

  resumirTexto: (texto: string) =>
    `Faça um TL;DR (2–4 frases) do texto jurídico abaixo, em português, preservando termos técnicos e o dispositivo/pedido principal.\n\nTEXTO:\n${texto.replace(/<[^>]+>/g, " ").slice(0, 8000)}`,

  melhorarRedacao: (texto: string) =>
    `Reescreva o texto abaixo mantendo integralmente o sentido jurídico, os fatos, os pedidos e as referências normativas. Melhore clareza, coesão, ortografia e concisão. Preserve o tom formal. Devolva APENAS o texto reescrito, sem comentários, sem cabeçalho, sem marcações de código. Se o original tinha parágrafos, mantenha a separação com linhas em branco.\n\nTEXTO:\n${texto.replace(/<[^>]+>/g, "\n").trim()}`,

  corrigirGramatica: (texto: string) =>
    `Corrija apenas ortografia, pontuação, concordância e regência do texto abaixo. NÃO reescreva, NÃO altere estilo, NÃO adicione conteúdo. Devolva APENAS o texto corrigido, mantendo quebras de linha.\n\nTEXTO:\n${texto.replace(/<[^>]+>/g, "\n").trim()}`,

  explicarTermo: (termo: string, contexto?: string) =>
    `Explique de forma objetiva (máximo 3 frases) o termo jurídico "${termo}" em português.${contexto ? ` Considere o contexto: "${contexto.slice(0, 400)}"` : ""} Se aplicável, cite o dispositivo legal principal. Não invente jurisprudência.`,
};

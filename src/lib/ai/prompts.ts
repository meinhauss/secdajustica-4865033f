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

  sugerirDespacho: (ctx: {
    tipoAto: string;
    tituloAto?: string;
    numero?: string; classe?: string; assunto?: string;
    autor?: string; reu?: string; status?: string;
    movimentacoes?: { tipo: string; descricao: string }[];
    rascunhoAtual?: string;
    instrucao?: string;
  }) => `Gere o texto do ato judicial abaixo em português, tom formal, técnico, pronto para ser publicado. NÃO invente fatos, nomes, valores, artigos ou jurisprudência que não estejam no contexto. Use marcadores como [data] apenas quando o dado for realmente desconhecido.

Tipo do ato: ${ctx.tipoAto}
${ctx.tituloAto ? `Título proposto: ${ctx.tituloAto}\n` : ""}Processo nº ${ctx.numero || "-"} — Classe: ${ctx.classe || "-"} — Assunto: ${ctx.assunto || "-"}
Autor(es): ${ctx.autor || "-"}
Réu(s): ${ctx.reu || "-"}
Status: ${ctx.status || "-"}

Últimas movimentações:
${(ctx.movimentacoes || []).slice(0, 10).map((m, i) => `${i + 1}. [${m.tipo}] ${(m.descricao || "").replace(/<[^>]+>/g, " ").slice(0, 400)}`).join("\n") || "(nenhuma)"}

${ctx.rascunhoAtual ? `Rascunho atual do usuário (aprimore se pertinente):\n${ctx.rascunhoAtual.replace(/<[^>]+>/g, "\n")}\n` : ""}${ctx.instrucao ? `Instrução adicional: ${ctx.instrucao}\n` : ""}
Devolva APENAS o texto do ato, sem cabeçalhos "Aqui está", sem markdown de código.`,

  classificarPeticao: (texto: string) =>
    `Classifique a petição jurídica abaixo. Devolva JSON estrito no formato:
{"tipo":"...","urgencia":"baixa|media|alta","resumo":"...","pedidos":["..."],"encaminhamento":"..."}

- tipo: classificação processual (ex.: Contestação, Petição de juntada, Requerimento de liminar, Embargos de declaração, Manifestação, Recurso, etc.).
- urgencia: baixa/média/alta conforme o pedido.
- resumo: 1–2 frases objetivas.
- pedidos: até 5 pedidos formulados.
- encaminhamento: sugestão prática (ex.: "Concluso ao juiz para despacho", "Intime-se a parte contrária em 15 dias").

TEXTO:
${texto.replace(/<[^>]+>/g, "\n").slice(0, 12000)}`,

  assistenteSystem: (ctx: {
    numero?: string; classe?: string; assunto?: string; autor?: string; reu?: string; status?: string;
    movimentacoes?: { tipo: string; descricao: string }[];
  }) => `${SYSTEM_JURIDICO}

Você é o assistente jurídico deste sistema (SecDaJustiça). Responda apenas com base no contexto abaixo e em conhecimento jurídico geral. Se faltar dado, diga qual dado falta. Não invente jurisprudência nem números de artigo.

CONTEXTO DO PROCESSO EM ANÁLISE:
- Nº ${ctx.numero || "-"} — Classe ${ctx.classe || "-"} — Assunto ${ctx.assunto || "-"}
- Autor(es): ${ctx.autor || "-"}
- Réu(s): ${ctx.reu || "-"}
- Status: ${ctx.status || "-"}

Últimas movimentações:
${(ctx.movimentacoes || []).slice(0, 15).map((m, i) => `${i + 1}. [${m.tipo}] ${(m.descricao || "").replace(/<[^>]+>/g, " ").slice(0, 300)}`).join("\n") || "(nenhuma)"}`,
};

// ═══════════ Prompts adicionais ═══════════

type ProcCtx = {
  numero?: string; classe?: string; assunto?: string;
  autor?: string; reu?: string; status?: string;
  movimentacoes?: { tipo: string; descricao: string }[];
};

const ctxBlock = (ctx: ProcCtx) =>
  `Processo nº ${ctx.numero || "-"} — Classe: ${ctx.classe || "-"} — Assunto: ${ctx.assunto || "-"}
Autor(es): ${ctx.autor || "-"}
Réu(s): ${ctx.reu || "-"}
Status: ${ctx.status || "-"}

Últimas movimentações:
${(ctx.movimentacoes || []).slice(0, 15).map((m, i) => `${i + 1}. [${m.tipo}] ${(m.descricao || "").replace(/<[^>]+>/g, " ").slice(0, 400)}`).join("\n") || "(nenhuma)"}`;

export const PROMPTS_EXTRA = {
  minutaJudicial: (ctx: ProcCtx & { tipo: "sentenca" | "decisao"; tese?: string; instrucao?: string }) =>
    `Gere a minuta de ${ctx.tipo === "sentenca" ? "SENTENÇA" : "DECISÃO INTERLOCUTÓRIA"} em português formal, com estrutura clássica:

I – RELATÓRIO
II – FUNDAMENTAÇÃO
III – DISPOSITIVO

Não invente fatos, valores, artigos ou jurisprudência que não estejam no contexto. Use [colchetes] para dados faltantes. ${ctx.tese ? `Adote a seguinte tese/orientação principal: ${ctx.tese}` : "Adote posicionamento neutro compatível com o contexto."} ${ctx.instrucao ? `Instrução adicional: ${ctx.instrucao}` : ""}

${ctxBlock(ctx)}

Devolva APENAS o texto da minuta, sem markdown de código.`,

  parecerMP: (ctx: ProcCtx & { tipo: "denuncia" | "arquivamento" | "manifestacao"; instrucao?: string }) => {
    const titulo = ctx.tipo === "denuncia" ? "DENÚNCIA (art. 41 CPP)"
      : ctx.tipo === "arquivamento" ? "PROMOÇÃO DE ARQUIVAMENTO"
      : "MANIFESTAÇÃO MINISTERIAL";
    return `Gere ${titulo} em português formal, tom técnico do Ministério Público. Estrutura:
- Endereçamento ao Juízo
- Exposição fática objetiva
- Fundamentação jurídica (indicar dispositivos aplicáveis)
- Pedido/Promoção final

Não invente fatos, valores, artigos ou jurisprudência que não estejam no contexto. Use [colchetes] para dados faltantes. ${ctx.instrucao ? `Instrução: ${ctx.instrucao}` : ""}

${ctxBlock(ctx)}

Devolva APENAS o texto da peça, sem markdown de código.`;
  },

  documentoCartorio: (ctx: ProcCtx & { tipo: "mandado" | "oficio" | "certidao" | "alvara"; destinatario?: string; finalidade?: string }) => {
    const titulo = { mandado: "MANDADO", oficio: "OFÍCIO", certidao: "CERTIDÃO", alvara: "ALVARÁ JUDICIAL" }[ctx.tipo];
    return `Gere ${titulo} judicial em português formal, com estrutura oficial (cabeçalho, corpo, dispositivo, fecho). Preencha automaticamente partes, endereços e dispositivo quando o dado existir no contexto; use [colchetes] para o que faltar.

${ctx.destinatario ? `Destinatário: ${ctx.destinatario}` : ""}
${ctx.finalidade ? `Finalidade: ${ctx.finalidade}` : ""}

${ctxBlock(ctx)}

Devolva APENAS o texto do documento, sem markdown de código.`;
  },

  analisePrazosRiscos: (ctx: ProcCtx) =>
    `Analise a timeline do processo e devolva JSON estrito:
{"prazos":[{"descricao":"...","situacao":"em_curso|vencido|iminente","observacao":"..."}],
 "preclusoes":["..."],
 "nulidades":["..."],
 "riscos":[{"tipo":"...","gravidade":"baixa|media|alta","observacao":"..."}],
 "recomendacoes":["..."]}

Considere apenas o que está evidenciado nas movimentações. Se não houver elementos, devolva listas vazias. Não invente prazos.

${ctxBlock(ctx)}`,

  sugerirFundamentacao: (tema: string, ctx?: ProcCtx) =>
    `Sugira fundamentação jurídica para o tema abaixo, em português. Estruture:
**Dispositivos aplicáveis:** liste artigos com número, lei e ementa curta (apenas os que tiver certeza).
**Princípios:** bullets.
**Argumentação:** 1–2 parágrafos.
**Ressalvas:** aponte o que precisa ser conferido pelo operador.

⚠️ IA pode errar — sempre confira os dispositivos citados na fonte oficial.

Tema: ${tema}
${ctx ? `\nContexto do processo:\n${ctxBlock(ctx)}` : ""}`,
};

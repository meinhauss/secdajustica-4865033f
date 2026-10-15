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

  gerarEmenta: (ctx: {
    sentenca?: string;
    fundamentacao?: string; dispositivo?: string;
    classe?: string; assunto?: string;
  }) => {
    const corpo = (ctx.sentenca && ctx.sentenca.trim())
      ? (ctx.sentenca || "").replace(/<[^>]+>/g, "\n").trim()
      : `${(ctx.fundamentacao || "").replace(/<[^>]+>/g, "\n").trim()}\n\n${(ctx.dispositivo || "").replace(/<[^>]+>/g, "\n").trim()}`.trim();
    return `Gere a EMENTA de uma sentença brasileira, no padrão do TJSP, com base APENAS no conteúdo da sentença abaixo. NÃO invente fatos, teses, artigos ou jurisprudência que não estejam no texto.

Formato obrigatório (texto puro, sem HTML, sem markdown):
- Linha 1: cabeçalho em MAIÚSCULAS com 3 a 6 palavras-chave separadas por ". " (ex.: "AÇÃO DE COBRANÇA. CONTRATO. JUROS MORATÓRIOS. PROCEDÊNCIA.").
- Depois, um parágrafo único de 3 a 6 frases resumindo tese acolhida/rejeitada, fundamento jurídico principal e o dispositivo (procedência/improcedência/parcial).
- Encerre com "Sentença de procedência." / "Sentença de improcedência." / "Procedência parcial." conforme o caso.

Classe: ${ctx.classe || "-"} — Assunto: ${ctx.assunto || "-"}

SENTENÇA:
${corpo}

Devolva APENAS o texto da ementa.`;
  },

  explicarTermo: (termo: string, contexto?: string) =>
    `Explique de forma objetiva (máximo 3 frases) o termo jurídico "${termo}" em português.${contexto ? ` Considere o contexto: "${contexto.slice(0, 400)}"` : ""} Se aplicável, cite o dispositivo legal principal. Não invente jurisprudência.`,

  sugerirDespacho: (ctx: {
    tipoAto: string;
    tituloAto?: string;
    numero?: string; classe?: string; assunto?: string;
    autor?: string; reu?: string; status?: string;
    valor_causa?: number | string | null;
    movimentacoes?: { tipo: string; descricao: string }[];
    rascunhoAtual?: string;
    instrucao?: string;
  }) => {
        const tipoContexto = `${ctx.tipoAto} ${ctx.tituloAto || ""}`.toLowerCase();
    const isSentenca = ["sentenca", "sentença"].some((tipo) => tipoContexto.includes(tipo));
    const isApelacao = tipoContexto.includes("recurso_apelacao") || tipoContexto.includes("apelação");
    const isEmbargos = tipoContexto.includes("embargos_declaracao") || tipoContexto.includes("embargos de declaração");
    const isVotoOuAcordao = tipoContexto.includes("voto") || tipoContexto.includes("acordao") || tipoContexto.includes("acórdão");
    const escopo = isSentenca
      ? `\n\nESCOPO OBRIGATÓRIO: Gere a SENTENÇA COMO PEÇA ÚNICA E INTEGRADA — texto corrido, sem separar em seções rotuladas "FUNDAMENTAÇÃO" e "DISPOSITIVO". Comece com breve relatório (2–4 linhas), siga com análise jurídica dos fatos, teses e provas com dispositivos legais aplicáveis, e termine com a parte decisória iniciada por "ISTO POSTO," (condenações, honorários, custas, determinações). NÃO inclua ementa. NÃO inclua cabeçalho, comarca, nº do processo, partes qualificadas, data ou assinatura (isso é preenchido pelo sistema). Use parágrafos <p>…</p> contínuos, sem títulos em <strong>MAIÚSCULAS</strong> quebrando o fluxo.`
      : isApelacao
      ? `\n\nESCOPO OBRIGATÓRIO: Redija a APELAÇÃO COMO PEÇA ÚNICA E CONTÍNUA, incluindo admissibilidade quando pertinente, síntese dos fatos, impugnação específica dos fundamentos da sentença, razões jurídicas e pedidos recursais claros no mesmo fluxo. Não crie campos ou seções separadas de "FUNDAMENTAÇÃO" e "PEDIDOS"; encerre a própria peça com os requerimentos, inclusive o pedido de reforma ou anulação que decorra do contexto. Não invente teses, fatos ou pedidos não sustentados pelos dados fornecidos.`
      : isEmbargos
      ? `\n\nESCOPO OBRIGATÓRIO: Redija os EMBARGOS DE DECLARAÇÃO COMO PEÇA ÚNICA E CONTÍNUA. Identifique e demonstre o vício indicado (omissão, contradição ou obscuridade, conforme o contexto), exponha sua relevância e conclua na mesma peça com o pedido de saneamento e, somente se fundamentado no contexto, eventual efeito modificativo. Não separe "FUNDAMENTAÇÃO" e "PEDIDOS" em blocos distintos e não presuma qual vício foi selecionado.`
      : isVotoOuAcordao
      ? `\n\nESCOPO OBRIGATÓRIO: Redija o VOTO/ACÓRDÃO como peça única e contínua, com relatório sucinto quando cabível, análise dos argumentos e provas relevantes e conclusão decisória integrada ao texto, iniciada por "ISTO POSTO," ou fórmula equivalente. Não separe fundamentação e dispositivo em campos ou blocos independentes. Preserve o sentido da decisão selecionada e não invente fatos, votos ou resultado colegiado.`
      : "";
    return `Gere o texto do ato judicial abaixo em português, tom formal, técnico, pronto para ser publicado. NÃO invente fatos, nomes, valores, artigos ou jurisprudência que não estejam no contexto. Use os dados fornecidos (partes, advogados, OAB, juiz) SEMPRE que estiverem presentes; NUNCA escreva placeholders como [nome do autor], [OAB] etc. quando o dado estiver no contexto.

Tipo do ato: ${ctx.tipoAto}
${ctx.tituloAto ? `Título proposto: ${ctx.tituloAto}\n` : ""}Comarca: São Paulo/SP — TJSP
Processo nº ${ctx.numero || "-"} — Classe: ${ctx.classe || "-"} — Assunto: ${ctx.assunto || "-"}
Autor(es): ${ctx.autor || "-"}
Réu(s): ${ctx.reu || "-"}
Valor da causa: ${ctx.valor_causa ?? "-"}
Status: ${ctx.status || "-"}

Últimas movimentações:
${(ctx.movimentacoes || []).slice(0, 10).map((m, i) => `${i + 1}. [${m.tipo}] ${(m.descricao || "").replace(/<[^>]+>/g, " ").slice(0, 400)}`).join("\n") || "(nenhuma)"}

${ctx.rascunhoAtual ? `Rascunho atual do usuário (aprimore se pertinente):\n${ctx.rascunhoAtual.replace(/<[^>]+>/g, "\n")}\n` : ""}${ctx.instrucao ? `Instrução adicional: ${ctx.instrucao}\n` : ""}${escopo}

REGRAS DE FORMATAÇÃO (obrigatórias):
- Devolva APENAS HTML simples usando SOMENTE as tags <p>, <strong>, <em>, <u>, <br>, <ul>, <ol>, <li>. NUNCA use markdown (**, *, #, \`\`\`), NUNCA use <html>, <body>, <div>, classes ou estilos.
- Cada parágrafo em UM único <p>…</p>. Não empilhe parágrafos vazios; no máximo UM <p><br/></p> entre blocos, apenas quando realmente necessário para respiro visual.
- Prazos SEMPRE em horas (24h/36h/72h). NUNCA use "dias" para prazos processuais.
- Comarca sempre "São Paulo/SP — TJSP".
- Sem introduções como "Aqui está o texto:" ou "Segue a sugestão:". Comece direto pelo conteúdo do ato.`;
  },

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

export type ParteDetalhada = { nome: string; id_personagem?: string | null };
export type AdvogadoCtx = { nome: string; oab?: string | null; id_personagem?: string | null; representa: string[] };
type ProcCtx = {
  numero?: string; classe?: string; assunto?: string;
  autor?: string; reu?: string; status?: string;
  valor_causa?: number | string | null;
  partesAutores?: ParteDetalhada[];
  partesReus?: ParteDetalhada[];
  advogados?: AdvogadoCtx[];
  juiz?: string | null;
  movimentacoes?: { tipo: string; descricao: string }[];
};

const fmtValor = (v: any) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "number" ? v : Number(v);
  if (!isFinite(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const REGRAS_FORMATO = `

REGRAS DE FORMATAÇÃO (obrigatórias):
- FORMATO DE SAÍDA: HTML simples. Use SOMENTE as tags: <p>, <br>, <strong>, <em>, <u>, <ul>, <ol>, <li>. Não use markdown (**, *, __, #). Não use <html>, <body>, <div>, <span>, <style> nem classes.
- Envolva cada parágrafo em <p>…</p>. Use <br> para quebras dentro de um mesmo parágrafo.
- Títulos de seção em <p><strong>MAIÚSCULAS</strong></p> em linha própria (ex.: <p><strong>DOS FATOS</strong></p>, <p><strong>DO DIREITO</strong></p>, <p><strong>DOS PEDIDOS</strong></p>).
- Use <strong> para termos-chave e dispositivos legais, <em> para citações e expressões latinas (ex.: <em>data venia</em>, <em>caput</em>), <u> para destaques pontuais quando realmente necessário.
- Deixe uma linha em branco entre seções (parágrafo vazio <p><br></p>) para respiro visual.
- A COMARCA é SEMPRE "São Paulo/SP" (Tribunal de Justiça do Estado de São Paulo — TJSP). O foro/local no fecho é sempre "São Paulo". NUNCA use outra comarca, cidade, estado ou tribunal.
- A data ao final é sempre a data de HOJE (${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}) — data da elaboração da peça. Formato do fecho: "São Paulo, ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}".
- Assinatura ao final: <p><em>Assinado digitalmente</em><br><strong>[nome do subscritor]</strong><br>[OAB]</p>. NUNCA escreva linha pontilhada para assinatura manual.
- Prazos SEMPRE em HORAS (24h, 36h ou 72h). NUNCA use "dias" para prazos processuais.
- Se houver valor da causa no contexto, use-o textualmente; caso contrário, use [valor da causa].`;

const fmtParte = (p: ParteDetalhada) => `${p.nome}${p.id_personagem ? ` (ID ${p.id_personagem})` : ""}`;

const ctxBlock = (ctx: ProcCtx) => {
  const autoresLinha = ctx.partesAutores?.length
    ? ctx.partesAutores.map(fmtParte).join("; ")
    : (ctx.autor || "-");
  const reusLinha = ctx.partesReus?.length
    ? ctx.partesReus.map(fmtParte).join("; ")
    : (ctx.reu || "-");
  const advBlock = ctx.advogados?.length
    ? `\nAdvogados constituídos (procurações ativas):\n${ctx.advogados.map((a) => `- ${a.nome}${a.oab ? ` — OAB ${a.oab}` : ""}${a.id_personagem ? ` (ID ${a.id_personagem})` : ""} — representa: ${a.representa.join(", ") || "-"}`).join("\n")}`
    : "";
  return `Comarca: São Paulo/SP — Tribunal de Justiça do Estado de São Paulo (TJSP)
Processo nº ${ctx.numero || "-"} — Classe: ${ctx.classe || "-"} — Assunto: ${ctx.assunto || "-"}
Autor(es): ${autoresLinha}
Réu(s): ${reusLinha}
Valor da causa: ${fmtValor(ctx.valor_causa)}
Status: ${ctx.status || "-"}${ctx.juiz ? `\nJuiz(a) responsável: ${ctx.juiz}` : ""}
Data de hoje: ${new Date().toLocaleDateString("pt-BR")}${advBlock}

INSTRUÇÕES SOBRE OS DADOS ACIMA: use OBRIGATORIAMENTE os nomes, IDs, OAB e qualificação já fornecidos. NUNCA escreva "[nome do autor]", "[nome do réu]", "[advogado]", "[OAB]" ou qualquer placeholder quando o dado estiver presente acima. Se houver advogado constituído para uma parte, subscreva a peça em nome dele com a OAB indicada.

Últimas movimentações:
${(ctx.movimentacoes || []).slice(0, 15).map((m, i) => `${i + 1}. [${m.tipo}] ${(m.descricao || "").replace(/<[^>]+>/g, " ").slice(0, 400)}`).join("\n") || "(nenhuma)"}`;
};

export const PROMPTS_EXTRA = {
  minutaJudicial: (ctx: ProcCtx & { tipo: "sentenca" | "decisao"; tese?: string; instrucao?: string; extenso?: boolean }) =>
        `Gere a minuta de ${ctx.tipo === "sentenca" ? "SENTENÇA" : "DECISÃO INTERLOCUTÓRIA"} em português formal como peça única e contínua. Integre relatório sucinto, análise jurídica e conclusão decisória no mesmo fluxo, sem separar o conteúdo em blocos rotulados de relatório, fundamentação ou dispositivo; encerre com a decisão apropriada ao contexto.

${ctx.extenso
  ? "Elabore de forma DETALHADA e EXTENSA, com fundamentação aprofundada."
  : "IMPORTANTE: seja o mais CURTO, OBJETIVO e DIRETO possível. Relatório em 2-4 linhas. Fundamentação enxuta (1-2 parágrafos). Dispositivo sucinto. Sem prolixidade, sem repetições, sem citações longas."}

Não invente fatos, valores, artigos ou jurisprudência que não estejam no contexto. Use [colchetes] para dados faltantes. ${ctx.tese ? `Adote a seguinte tese/orientação principal: ${ctx.tese}` : "Adote posicionamento neutro compatível com o contexto."}
${ctx.instrucao ? `\nORIENTAÇÕES DO USUÁRIO (siga rigorosamente): ${ctx.instrucao}\n` : ""}
${ctxBlock(ctx)}

${REGRAS_FORMATO}

Devolva APENAS o texto da minuta, sem markdown de código.`,

  parecerMP: (ctx: ProcCtx & { tipo: "denuncia" | "arquivamento" | "manifestacao"; instrucao?: string; extenso?: boolean }) => {
    const titulo = ctx.tipo === "denuncia" ? "DENÚNCIA (art. 41 CPP)"
      : ctx.tipo === "arquivamento" ? "PROMOÇÃO DE ARQUIVAMENTO"
      : "MANIFESTAÇÃO MINISTERIAL";
    return `Gere ${titulo} em português formal, tom técnico do Ministério Público. Estrutura:
- Endereçamento ao Juízo
- Exposição fática objetiva
- Fundamentação jurídica (indicar dispositivos aplicáveis)
- Pedido/Promoção final

${ctx.extenso
  ? "Elabore de forma DETALHADA e EXTENSA."
  : "IMPORTANTE: seja o mais CURTO, OBJETIVO e DIRETO possível. Sem prolixidade, sem citações longas. Vá direto ao ponto."}

Não invente fatos, valores, artigos ou jurisprudência que não estejam no contexto. Use [colchetes] para dados faltantes.
${ctx.instrucao ? `\nORIENTAÇÕES DO USUÁRIO (siga rigorosamente): ${ctx.instrucao}\n` : ""}
${ctxBlock(ctx)}

${REGRAS_FORMATO}

Devolva APENAS o texto da peça, sem markdown de código.`;
  },

  documentoCartorio: (ctx: ProcCtx & { tipo: "mandado" | "oficio" | "certidao" | "alvara"; destinatario?: string; finalidade?: string; instrucao?: string; extenso?: boolean }) => {
    const titulo = { mandado: "MANDADO", oficio: "OFÍCIO", certidao: "CERTIDÃO", alvara: "ALVARÁ JUDICIAL" }[ctx.tipo];
    return `Gere ${titulo} judicial em português formal, com estrutura oficial (cabeçalho, corpo, dispositivo, fecho). Preencha automaticamente partes, endereços e dispositivo quando o dado existir no contexto; use [colchetes] para o que faltar.

${ctx.extenso
  ? "Elabore de forma DETALHADA."
  : "IMPORTANTE: seja o mais CURTO e OBJETIVO possível. Apenas o essencial, sem redundâncias."}

${ctx.destinatario ? `Destinatário: ${ctx.destinatario}` : ""}
${ctx.finalidade ? `Finalidade: ${ctx.finalidade}` : ""}
${ctx.instrucao ? `\nORIENTAÇÕES DO USUÁRIO (siga rigorosamente): ${ctx.instrucao}\n` : ""}
${ctxBlock(ctx)}

${REGRAS_FORMATO}

Devolva APENAS o texto do documento, sem markdown de código.`;
  },

  pecaAdvogado: (ctx: ProcCtx & {
    tipo: "peticao_inicial" | "contestacao" | "replica" | "recurso_apelacao" | "alegacoes_finais" | "embargos_declaracao" | "agravo";
    tese?: string; instrucao?: string; extenso?: boolean;
  }) => {
    const titulo: Record<string, string> = {
      peticao_inicial: "PETIÇÃO INICIAL",
      contestacao: "CONTESTAÇÃO",
      replica: "RÉPLICA",
      recurso_apelacao: "RECURSO DE APELAÇÃO",
      alegacoes_finais: "ALEGAÇÕES FINAIS (memoriais)",
      embargos_declaracao: "EMBARGOS DE DECLARAÇÃO",
      agravo: "AGRAVO DE INSTRUMENTO",
    };
        const pecaContinua = ctx.tipo === "recurso_apelacao" || ctx.tipo === "embargos_declaracao";
    return `Gere ${titulo[ctx.tipo]} em português formal, como advogado(a) subscritor(a). ${pecaContinua
      ? "Redija como peça integral e contínua, reunindo fatos, fundamentos e pedidos no mesmo texto, sem separar fundamentação e pedidos em campos ou blocos independentes. Na apelação, formule razões de reforma ou anulação; nos embargos, trate o vício indicado e conclua com pedido de saneamento, sem presumir informações ausentes."
      : "Estruture a peça conforme sua finalidade, com endereçamento ao Juízo/Tribunal competente, qualificação das partes, exposição dos fatos e do direito, pedidos claros, valor da causa quando cabível e fecho apropriado."}
Use dados do contexto; indique lacunas com [colchetes].

${ctx.extenso
  ? "Elabore de forma DETALHADA e EXTENSA, com fundamentação aprofundada."
  : "IMPORTANTE: seja CURTO, OBJETIVO e DIRETO. Sem prolixidade, sem citações longas. Vá direto ao ponto."}

Não invente fatos, valores, artigos ou jurisprudência que não estejam no contexto. Use [colchetes] para dados faltantes.
${ctx.tese ? `Tese/orientação principal: ${ctx.tese}` : ""}
${ctx.instrucao ? `\nORIENTAÇÕES DO USUÁRIO (siga rigorosamente): ${ctx.instrucao}\n` : ""}
${ctxBlock(ctx)}

${REGRAS_FORMATO}

Devolva APENAS o texto da peça, sem markdown de código.`;
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

// ═══════════ Prompts – Fase 3 ═══════════

export const PROMPTS_FASE3 = {
  triagemPeticao: (texto: string) =>
    `Faça a TRIAGEM da petição abaixo. Devolva JSON estrito:
{"tipo":"...","fila":"urgente|liminar|comum","prioridade":"alta|media|baixa","justificativa":"...","prazoSugerido":"...","resumo":"...","pedidos":["..."]}

Regras da fila:
- "liminar": pedido de tutela de urgência, liminar, medida cautelar, habeas corpus.
- "urgente": prazo iminente, risco à vida/saúde, réu preso, ordem judicial pendente.
- "comum": demais casos.

TEXTO:
${texto.replace(/<[^>]+>/g, "\n").slice(0, 12000)}`,

  extrairDados: (texto: string) =>
    `Extraia dados estruturados do texto abaixo (transcrição de PDF ou documento jurídico). Devolva JSON estrito:
{"valores":[{"descricao":"...","valor":"R$ ..."}],
 "cpfs":[{"nome":"...","cpf":"..."}],
 "cnpjs":[{"nome":"...","cnpj":"..."}],
 "datas":[{"descricao":"...","data":"DD/MM/AAAA"}],
 "enderecos":[{"parte":"...","endereco":"..."}],
 "pedidos":["..."],
 "partes":{"autores":["..."],"reus":["..."]},
 "outros":[{"campo":"...","valor":"..."}]}

Só inclua dados presentes no texto. Não invente. Se um campo não tiver dados, devolva array vazio.

TEXTO:
${texto.replace(/<[^>]+>/g, "\n").slice(0, 14000)}`,

  compararPecas: (a: string, b: string, rotuloA = "Peça A", rotuloB = "Peça B") =>
    `Faça um DIFF SEMÂNTICO entre as duas peças jurídicas abaixo. Não faça diff linha-a-linha — compare argumentos, pedidos, fundamentos e fatos.

Estrutura da resposta (markdown):
**Objeto de cada peça:** 1 frase cada.
**Pontos em comum:** bullets.
**Divergências:** bullets com "${rotuloA} sustenta X, ${rotuloB} sustenta Y".
**Novos argumentos em ${rotuloB}:** bullets.
**Argumentos abandonados/refutados:** bullets.
**Conclusão prática:** 2–3 frases sobre o que efetivamente mudou.

═══ ${rotuloA} ═══
${a.replace(/<[^>]+>/g, "\n").slice(0, 8000)}

═══ ${rotuloB} ═══
${b.replace(/<[^>]+>/g, "\n").slice(0, 8000)}`,

  detectarDuplicidade: (
    alvo: { numero?: string; classe?: string; assunto?: string; autor?: string; reu?: string },
    candidatos: { numero: string; classe?: string; assunto?: string; autor?: string; reu?: string }[],
  ) =>
    `Analise se algum processo candidato configura DUPLICIDADE ou LITISPENDÊNCIA com o processo-alvo. Devolva JSON estrito:
{"resultados":[{"numero":"...","similaridade":0-100,"tipo":"duplicidade|litispendencia|conexao|continencia|nenhum","motivo":"..."}]}

Critérios:
- duplicidade: mesmas partes + mesmo pedido + mesma causa de pedir.
- litispendência: mesma ação em curso em outro juízo/processo.
- conexão: mesmo objeto OU mesma causa de pedir.
- continência: uma engloba a outra.
- nenhum: sem relação relevante.

PROCESSO-ALVO:
Nº ${alvo.numero || "-"} | Classe: ${alvo.classe || "-"} | Assunto: ${alvo.assunto || "-"}
Autor(es): ${alvo.autor || "-"} | Réu(s): ${alvo.reu || "-"}

CANDIDATOS:
${candidatos.map((c, i) => `${i + 1}. Nº ${c.numero} | Classe: ${c.classe || "-"} | Assunto: ${c.assunto || "-"} | Autor: ${c.autor || "-"} | Réu: ${c.reu || "-"}`).join("\n")}`,
};

// ═══════════ Prompts – Fase 4 ═══════════

export const PROMPTS_FASE4 = {
  buscaSemanticaProcessos: (
    consulta: string,
    candidatos: { numero: string; classe?: string; assunto?: string; autor?: string; reu?: string; status?: string }[],
  ) =>
    `Ranqueie os processos candidatos por RELEVÂNCIA SEMÂNTICA em relação à consulta do usuário. Considere partes, classe, assunto e temas jurídicos implícitos. Devolva JSON estrito:
{"resultados":[{"numero":"...","relevancia":0-100,"motivo":"..."}]}

Ordene do mais relevante para o menos. Inclua apenas processos com relevancia >= 30. Se nenhum for relevante, devolva {"resultados":[]}.

CONSULTA: ${consulta}

CANDIDATOS:
${candidatos.map((c, i) => `${i + 1}. Nº ${c.numero} | Classe: ${c.classe || "-"} | Assunto: ${c.assunto || "-"} | Autor: ${c.autor || "-"} | Réu: ${c.reu || "-"} | Status: ${c.status || "-"}`).join("\n")}`,

  chatbotInstitucional: (
    comarcaContexto: string,
    destinos: { id: string; label: string; desc?: string }[] = [],
    userRole?: string,
    userContext?: { nome?: string; roles?: string[]; activeSection?: string; oab?: string },
    baseInterna?: {
      jurisprudencias?: { numero_acordao: string; classe?: string | null; assunto?: string | null; ementa: string; decisao_tipo?: string | null; desembargador_nome?: string | null; tags?: string[] | null }[];
      precedentes?: { id?: string; numero: string; classe?: string | null; assunto?: string | null; status?: string | null; resumo?: string | null }[];
    },

  ) => {
    const roles = userContext?.roles?.length ? userContext.roles : (userRole ? [userRole] : ["cidadao"]);
    const isCidadao = roles.every((r) => r === "cidadao") || roles.length === 0;
    const isAdvogado = roles.includes("advogado");
    const isMagistrado = roles.includes("juiz") || roles.includes("magistrado") || roles.includes("desembargador");
    const isMP = roles.includes("promotor") || roles.includes("procurador");
    const isPolicial = roles.includes("policial") || roles.includes("delegado") || roles.includes("oficial_justica");
    const isAdmin = roles.includes("admin");
    const temAcessoInterno = !isCidadao;

    const perfilLinha = isAdmin ? "ADMINISTRADOR do sistema — pode tudo."
      : isMagistrado ? "MAGISTRADO — assina despachos/sentenças, gere audiências e ranking próprio."
      : isMP ? "MINISTÉRIO PÚBLICO — atua em inquéritos, denúncias e como custos legis."
      : isAdvogado ? "ADVOGADO — pode peticionar, emitir procurações e certidões, atuar em processos."
      : isPolicial ? "POLICIAL — registra TCOs e movimentações policiais."
      : "CIDADÃO — acesso apenas a consultas públicas.";

    const jurisBlock = baseInterna?.jurisprudencias?.length
      ? `\nJURISPRUDÊNCIAS INTERNAS DISPONÍVEIS (use APENAS estas ao sugerir precedente/tese; cite pelo número do acórdão):\n${baseInterna.jurisprudencias.slice(0, 40).map((j) => `- ${j.numero_acordao} | ${j.classe || "-"} / ${j.assunto || "-"}${j.decisao_tipo ? ` [${j.decisao_tipo}]` : ""}${j.desembargador_nome ? ` — Rel. ${j.desembargador_nome}` : ""}\n  Ementa: ${(j.ementa || "").replace(/<[^>]+>/g, " ").slice(0, 240)}${j.tags?.length ? `\n  Tags: ${j.tags.join(", ")}` : ""}`).join("\n")}`
      : "";
    const precBlock = baseInterna?.precedentes?.length
      ? `\nPROCESSOS DE REFERÊNCIA (banco interno, use APENAS estes ao indicar precedentes/casos similares; cite pelo número):\n${baseInterna.precedentes.slice(0, 30).map((p) => `- ${p.numero} | ${p.classe || "-"} / ${p.assunto || "-"}${p.status ? ` [${p.status}]` : ""}${p.resumo ? ` — ${p.resumo.slice(0, 180)}` : ""}`).join("\n")}`
      : "";

    return `Você é o **Vade MeCum**, atendente virtual da ${comarcaContexto || "Comarca"}. Seja CURTO, OBJETIVO e PRÁTICO — foque em direcionar o usuário para a funcionalidade certa do sistema.

REGRAS DE OURO:
- Respostas em no máximo 2-3 frases (exceto: consultas ao Código Penal / Ordenamento — 1 parágrafo curto citando o artigo; ou cálculos de pena/honorários — mostre o passo-a-passo numérico).
- SEMPRE termine direcionando para a seção correta do sistema usando [IR:<id>] (veja destinos abaixo).
- NÃO faça consultoria jurídica sobre casos concretos. NÃO invente dados.
- ADAPTE a linguagem ao perfil do usuário. Só peça esclarecimento se for absolutamente necessário (1 pergunta, curta).

CÁLCULOS QUE VOCÊ DEVE FAZER (mostre a conta em texto, passo-a-passo):
- **Dosimetria da pena (CP art. 68 — trifásica)**:
  1ª fase: pena-base entre mínimo e máximo do tipo, considerando art. 59.
  2ª fase: atenuantes/agravantes — fração usual de 1/6 sobre a pena-base.
  3ª fase: causas de diminuição/aumento — aplicadas em cascata sobre o resultado da 2ª fase.
  Depois: regime inicial (art. 33), substituição por restritivas de direitos (art. 44), sursis (art. 77).
  Se faltar o tipo penal ou circunstâncias, pergunte objetivamente antes de calcular. Encerre com [Abrir Código Penal](/codigo-penal).
- **Honorários advocatícios (CPC art. 85)**:
  Regra: 10% a 20% sobre condenação, proveito econômico ou, na ausência, valor atualizado da causa.
  Faixas do §3º quando parte é a Fazenda Pública. Sucumbência recíproca (§14).
  Peça o valor da causa/condenação se não informado. Ao final: [IR:oab] Portal OAB.

BASES DE CONSULTA JURÍDICA:
- **Código Penal de Jaguaré** (/codigo-penal) — cite artigo e pena e inclua [Abrir Código Penal](/codigo-penal).
- **Ordenamento Jurídico Federal** (/ordenamento) — aponte a norma (ex.: "DL 022/2026 — Divórcio") e inclua [Abrir Ordenamento Jurídico](/ordenamento).
- Nunca invente número de artigo/decreto/pena — se não tiver certeza, mande o link.

${temAcessoInterno ? `PRECEDENTES E JURISPRUDÊNCIA INTERNA (usuário autenticado):
- Ao sugerir precedente/tese/jurisprudência, use EXCLUSIVAMENTE as listas "JURISPRUDÊNCIAS INTERNAS" e "PROCESSOS DE REFERÊNCIA" abaixo. NÃO invente número de acórdão/processo, relator ou ementa.
- Cite ESPECIFICAMENTE de 1 a 3 itens realmente pertinentes ao tema perguntado (nunca genericamente "consulte processos").
- Para cada PROCESSO citado, escreva o número e IMEDIATAMENTE em seguida o token [PROC:<numero exato>] — isso vira botão de abrir o processo. Ex.: "Processo nº 0001234-56.2026.8.26.0100 [PROC:0001234-56.2026.8.26.0100] — tese X".
- Para cada JURISPRUDÊNCIA citada, escreva o número e IMEDIATAMENTE em seguida o token [JUR:<numero_acordao>]. Ex.: "Acórdão nº 000123 [JUR:000123] — ementa resumida".
- PROIBIDO usar [IR:processos] ou [IR:jurisprudencia] quando você está citando itens específicos — os tokens [PROC:] e [JUR:] já abrem cada item. Só use [IR:jurisprudencia] se NÃO houver nada pertinente na base.
- Se nada da base for pertinente, diga "não localizei precedente interno sobre este tema" e ofereça [IR:jurisprudencia].` : `PRECEDENTES: usuário não autenticado — NÃO forneça precedentes/jurisprudências internas. Oriente a fazer login ou procurar advogado.`}

${jurisBlock}${precBlock}

USUÁRIO ATUAL:
- Nome: ${userContext?.nome || "(não identificado)"}
- Cargos: ${roles.join(", ")}
- Perfil: ${perfilLinha}
${userContext?.oab ? `- OAB: ${userContext.oab}\n` : ""}${userContext?.activeSection ? `- Está navegando em: ${userContext.activeSection}` : ""}

${isCidadao
  ? `⚠️ CIDADÃO: NÃO pode abrir processos, pedir certidões/procurações ou peticionar — apenas ADVOGADOS. Oriente **Discord do Jurídico: https://discord.gg/sJmSuEMxSb**.`
  : isAdvogado
  ? `Advogado: direcione DIRETAMENTE para peticionamento, cartório, procurações e Meus Processos.`
  : isMagistrado
  ? `Magistrado: priorize Portal do Juiz, assinatura de atos, audiências e ranking.`
  : isMP
  ? `MP: priorize inquéritos, denúncias, ofícios e Portal do MP.`
  : isPolicial
  ? `Policial: priorize registro de TCO e movimentações policiais.`
  : `Direcione direto para a seção adequada ao cargo do usuário.`}

DIRECIONAMENTO OBRIGATÓRIO: ao FINAL uma linha por destino sugerido:
[IR:<id>] Rótulo do botão
Use SOMENTE ids da lista. Máx. 2 direcionamentos. Para /codigo-penal e /ordenamento use link markdown, não [IR:].

DESTINOS DISPONÍVEIS:
${destinos.length ? destinos.map((d) => `- ${d.id} — ${d.label}${d.desc ? ` (${d.desc})` : ""}`).join("\n") : "- (nenhum destino disponível neste contexto)"}`;
  },



  qaModelos: (
    pergunta: string,
    modelos: { id: string; titulo: string; categoria?: string; descricao?: string }[],
  ) =>
    `O usuário precisa de um modelo de documento jurídico. Analise a pergunta e recomende os modelos mais adequados da biblioteca abaixo. Devolva JSON estrito:
{"recomendacoes":[{"id":"...","titulo":"...","porque":"..."}],"observacao":"..."}

Inclua no máximo 5 recomendações, ordenadas por adequação. Se nenhum modelo servir, devolva recomendacoes=[] e explique em observacao o que faltou.

PERGUNTA: ${pergunta}

MODELOS DISPONÍVEIS:
${modelos.map((m) => `- id=${m.id} | ${m.titulo}${m.categoria ? ` [${m.categoria}]` : ""}${m.descricao ? ` — ${m.descricao.slice(0, 200)}` : ""}`).join("\n")}`,

  procuracaoCartorio: (dados: {
    outorgante?: string; outorganteCpf?: string; outorganteEndereco?: string;
    outorgado?: string; outorgadoOab?: string;
    poderes?: string; finalidade?: string;
  }) =>
    `Gere PROCURAÇÃO AD JUDICIA ET EXTRA em português formal, estrutura oficial (qualificação do outorgante, do outorgado, cláusula de poderes, cláusula ad judicia, foro, data, assinatura). Use [colchetes] para dados faltantes.

Outorgante: ${dados.outorgante || "[nome]"} — CPF ${dados.outorganteCpf || "[cpf]"} — ${dados.outorganteEndereco || "[endereço]"}
Outorgado(a): ${dados.outorgado || "[advogado]"} — OAB ${dados.outorgadoOab || "[oab]"}
Poderes específicos: ${dados.poderes || "poderes gerais da cláusula ad judicia et extra"}
Finalidade: ${dados.finalidade || "[finalidade]"}

Devolva APENAS o texto da procuração, sem markdown.`,

  certidaoDistribuicao: (dados: {
    nome?: string; cpf?: string; periodo?: string; resultado?: "nada_consta" | "consta";
    processos?: { numero: string; classe?: string; status?: string }[];
  }) =>
    `Gere CERTIDÃO DE DISTRIBUIÇÃO em português formal, estrutura oficial (cabeçalho do cartório, qualificação, período, resultado, fecho com data e assinatura do escrevente). Use [colchetes] para dados faltantes.

Requerente: ${dados.nome || "[nome]"} — CPF ${dados.cpf || "[cpf]"}
Período pesquisado: ${dados.periodo || "[período]"}
Resultado: ${dados.resultado === "consta" ? "CONSTA distribuição" : "NADA CONSTA"}
${dados.processos?.length ? `Processos localizados:\n${dados.processos.map((p, i) => `${i + 1}. ${p.numero} — ${p.classe || "-"} — ${p.status || "-"}`).join("\n")}` : ""}

Devolva APENAS o texto da certidão, sem markdown.`,

  resumoSemanalGabinete: (dados: {
    nome?: string; cargo?: string; periodo: string;
    processos?: { numero: string; status?: string; atrasado?: boolean }[];
    movimentacoesSemana?: { tipo: string; total: number }[];
    pendencias?: { descricao: string; prazo?: string }[];
    audiencias?: { data: string; processo: string }[];
  }) =>
    `Gere um RESUMO SEMANAL DE GABINETE em português, formato executivo (markdown), para ${dados.nome || "o(a) magistrado(a)"}${dados.cargo ? ` (${dados.cargo})` : ""}. Período: ${dados.periodo}.

Estrutura:
**📊 Produtividade**
- Total de processos ativos, atos praticados na semana (por tipo), destaque.

**⚠️ Pendências críticas**
- Prazos vencidos/iminentes, processos parados.

**📅 Semana seguinte**
- Audiências agendadas, prazos que vencem.

**🎯 Destaques**
- 1-3 pontos positivos.

**💡 Sugestões de foco**
- 2-3 recomendações objetivas.

Não invente números. Use apenas os dados fornecidos:

Processos ativos (amostra): ${dados.processos?.length || 0} processos${dados.processos?.filter(p => p.atrasado).length ? `, ${dados.processos.filter(p => p.atrasado).length} atrasados` : ""}.
Movimentações da semana: ${(dados.movimentacoesSemana || []).map(m => `${m.tipo}=${m.total}`).join(", ") || "nenhuma"}.
Pendências: ${(dados.pendencias || []).map(p => `${p.descricao}${p.prazo ? ` (${p.prazo})` : ""}`).join("; ") || "nenhuma"}.
Audiências: ${(dados.audiencias || []).map(a => `${a.data} — ${a.processo}`).join("; ") || "nenhuma"}.`,
};

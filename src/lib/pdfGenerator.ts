import jsPDF from "jspdf";

/** Parse JSON array partes or plain text for PDF display */
function formatPartesForPdf(value: string): string {
  if (!value) return "-";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((p: any) => p.id_personagem ? `${p.nome} (ID: ${p.id_personagem})` : p.nome).join(", ");
    }
  } catch { /* not JSON */ }
  return value;
}

/* ─── Shared PDF helpers ─── */

/** Convert simple HTML (from rich text editor) to plain text preserving block breaks */
function htmlToPlain(input: string): string {
  if (!input) return "";
  let s = String(input);
  if (!/<\/?[a-z][^>]*>/i.test(s)) return s;
  // Block-level breaks
  s = s.replace(/<\s*br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "- ");
  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, "");
  // Decode common entities
  s = s.replace(/&nbsp;/g, " ")
       .replace(/&amp;/g, "&")
       .replace(/&lt;/g, "<")
       .replace(/&gt;/g, ">")
       .replace(/&quot;/g, '"')
       .replace(/&#39;|&apos;/g, "'")
       .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
       .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
  // Collapse 3+ newlines
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

/** Sanitize text for jsPDF standard fonts (Latin1 only) */
function sanitize(text: string): string {
  let s = htmlToPlain(String(text || ""));
  s = s.replace(/\u2713|\u2714/g, "(OK)");
  s = s.replace(/\u2022|\u2023|\u25CF|\u25CB/g, "-");
  s = s.replace(/\u2014|\u2015/g, "-");
  s = s.replace(/\u2013/g, "-");
  s = s.replace(/\u2018|\u2019|\u02BC|\u0060|\u00B4/g, "'");
  s = s.replace(/\u201C|\u201D|\u201E|\u201F/g, '"');
  s = s.replace(/\u2026/g, "...");
  s = s.replace(/\u2192/g, "->");
  s = s.replace(/\u2190/g, "<-");
  s = s.replace(/\u00A0/g, " ");
  s = s.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
  s = s.replace(/[àáâãä]/g, "a").replace(/[ÀÁÂÃÄ]/g, "A");
  s = s.replace(/[èéêë]/g, "e").replace(/[ÈÉÊË]/g, "E");
  s = s.replace(/[ìíîï]/g, "i").replace(/[ÌÍÎÏ]/g, "I");
  s = s.replace(/[òóôõö]/g, "o").replace(/[ÒÓÔÕÖ]/g, "O");
  s = s.replace(/[ùúûü]/g, "u").replace(/[ÙÚÛÜ]/g, "U");
  s = s.replace(/ç/g, "c").replace(/Ç/g, "C");
  s = s.replace(/ñ/g, "n").replace(/Ñ/g, "N");
  s = s.replace(/[ýÿ]/g, "y").replace(/Ý/g, "Y");
  s = s.replace(/[^\x20-\x7E\n\r\t]/g, "");
  return s;
}

/** Split text into plain-text and URL segments */
function splitTextAndUrls(text: string): { text: string; isUrl: boolean }[] {
  const urlRegex = /(https?:\/\/[^\s,;]+)/g;
  const parts: { text: string; isUrl: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index).trim(), isUrl: false });
    }
    parts.push({ text: match[1], isUrl: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex).trim();
    if (remaining) parts.push({ text: remaining, isUrl: false });
  }
  return parts.length ? parts : [{ text, isUrl: false }];
}

const MARGIN = 18;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

function checkPage(doc: jsPDF, y: number, needed: number = 12): number {
  if (y + needed > 278) {
    doc.addPage();
    return 20;
  }
  return y;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(sanitize(text), maxWidth);
  for (const line of lines) {
    y = checkPage(doc, y, lineHeight + 1);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

type RichSegment = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; href?: string };
type RichBlock = { segments: RichSegment[]; align?: "left" | "center" | "right" | "justify"; heading?: boolean; bullet?: string };

function hasHtml(input: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(input || "");
}

function getAlign(el: HTMLElement): RichBlock["align"] {
  const raw = el.style.textAlign || /text-align\s*:\s*(left|center|right|justify)/i.exec(el.getAttribute("style") || "")?.[1] || "left";
  return ["left", "center", "right", "justify"].includes(raw) ? raw as RichBlock["align"] : "left";
}

function parseInline(node: Node, inherited: Omit<RichSegment, "text"> = {}): RichSegment[] {
  if (node.nodeType === Node.TEXT_NODE) return [{ ...inherited, text: node.textContent || "" }];
  if (!(node instanceof HTMLElement)) return [];
  if (node.tagName === "BR") return [{ ...inherited, text: "\n" }];
  const tag = node.tagName.toLowerCase();
  const next = {
    ...inherited,
    bold: inherited.bold || tag === "strong" || tag === "b",
    italic: inherited.italic || tag === "em" || tag === "i",
    underline: inherited.underline || tag === "u",
    href: inherited.href || (tag === "a" ? node.getAttribute("href") || undefined : undefined),
  };
  return Array.from(node.childNodes).flatMap((child) => parseInline(child, next));
}

function parseRichBlocks(input: string): RichBlock[] {
  if (!input) return [];
  if (typeof document === "undefined" || !hasHtml(input)) {
    return String(input).split("\n").map((line) => ({ segments: [{ text: line }] }));
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = input;
  const blocks: RichBlock[] = [];
  const blockTags = new Set(["p", "div", "h1", "h2", "h3", "h4", "blockquote", "li"]);

  const visit = (node: Node, listType?: "ul" | "ol", index?: number) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      blocks.push({ segments: [{ text: node.textContent }] });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") {
      Array.from(node.children).forEach((child, idx) => visit(child, tag as "ul" | "ol", idx + 1));
      return;
    }
    if (blockTags.has(tag)) {
      blocks.push({
        segments: parseInline(node),
        align: getAlign(node),
        heading: /^h[1-4]$/.test(tag),
        bullet: tag === "li" ? (listType === "ol" ? `${index}.` : "•") : undefined,
      });
      return;
    }
    Array.from(node.childNodes).forEach((child) => visit(child));
  };

  Array.from(wrapper.childNodes).forEach((child) => visit(child));
  return blocks.length ? blocks : [{ segments: parseInline(wrapper) }];
}

function expandLineBreaks(blocks: RichBlock[]): RichBlock[] {
  const expanded: RichBlock[] = [];
  for (const block of blocks) {
    let current: RichSegment[] = [];
    const push = () => { expanded.push({ ...block, segments: current }); current = []; };
    for (const seg of block.segments) {
      const parts = seg.text.split("\n");
      parts.forEach((part, idx) => {
        if (idx > 0) push();
        if (part) current.push({ ...seg, text: part });
      });
    }
    push();
  }
  return expanded;
}

function setRichFont(doc: jsPDF, seg: RichSegment, size: number) {
  doc.setFontSize(size);
  doc.setFont("helvetica", seg.bold && seg.italic ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal");
}

function segmentWidth(doc: jsPDF, seg: RichSegment, size: number): number {
  setRichFont(doc, seg, size);
  return doc.getTextWidth(sanitize(seg.text));
}

function renderRichText(doc: jsPDF, input: string, x: number, y: number, maxWidth: number, lineHeight = 4, fontSize = 8, textColor: [number, number, number] = [50, 50, 50]): number {
  const blocks = expandLineBreaks(parseRichBlocks(input));
  for (const block of blocks) {
    const size = block.heading ? fontSize + 1.5 : fontSize;
    const prefix = block.bullet ? `${block.bullet} ` : "";
    const lines: { segments: RichSegment[]; width: number }[] = [];
    let line: RichSegment[] = prefix ? [{ text: prefix, bold: true }] : [];
    let width = prefix ? segmentWidth(doc, line[0], size) : 0;

    const pushLine = () => { lines.push({ segments: line, width }); line = []; width = 0; };
    for (const source of block.segments) {
      const tokens = source.text.split(/(\s+)/).filter((token) => token.length > 0);
      for (const token of tokens) {
        const text = /^\s+$/.test(token) ? " " : token;
        if (!line.length && text === " ") continue;
        const seg = { ...source, text };
        const tokenWidth = segmentWidth(doc, seg, size);
        if (line.length && width + tokenWidth > maxWidth) pushLine();
        line.push(seg);
        width += tokenWidth;
      }
    }
    if (line.length || !lines.length) pushLine();

    for (const [lineIndex, renderedLine] of lines.entries()) {
      y = checkPage(doc, y, lineHeight + 2);
      let cursorX = x;
      if (block.align === "center") cursorX = x + (maxWidth - renderedLine.width) / 2;
      if (block.align === "right") cursorX = x + maxWidth - renderedLine.width;
      const justifyGaps = block.align === "justify" && lineIndex < lines.length - 1
        ? renderedLine.segments.filter((seg) => /^\s+$/.test(seg.text)).length
        : 0;
      const justifyExtra = justifyGaps ? Math.max(0, maxWidth - renderedLine.width) / justifyGaps : 0;
      for (const seg of renderedLine.segments) {
        const txt = sanitize(seg.text);
        if (!txt) continue;
        setRichFont(doc, { ...seg, bold: block.heading || seg.bold }, size);
        const link = seg.href || (/^https?:\/\//i.test(txt) ? txt : undefined);
        if (link) doc.setTextColor(0, 50, 150); else doc.setTextColor(...textColor);
        if (link) doc.textWithLink(txt, cursorX, y, { url: link }); else doc.text(txt, cursorX, y);
        if (seg.underline || link) {
          const w = doc.getTextWidth(txt);
          doc.line(cursorX, y + 0.6, cursorX + w, y + 0.6);
        }
        cursorX += doc.getTextWidth(txt) + (/^\s+$/.test(seg.text) ? justifyExtra : 0);
      }
      y += block.heading ? lineHeight + 1 : lineHeight;
    }
    y += 1;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...textColor);
  return y;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  y = checkPage(doc, y, 14);
  // Colored bar
  doc.setFillColor(25, 55, 85);
  doc.rect(MARGIN, y - 1, CONTENT_W, 7, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(sanitize(title), MARGIN + 3, y + 4);
  doc.setTextColor(50);
  return y + 11;
}

function drawLightSeparator(doc: jsPDF, y: number): number {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 3;
}

function addFooter(doc: jsPDF, text: string, baixadoPor?: string) {
  const pages = doc.getNumberOfPages();
  const stamp = new Date().toLocaleString("pt-BR");
  const downloader = baixadoPor ? `Baixado por: ${baixadoPor} em ${stamp}` : "";
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(25, 55, 85);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, 282, PAGE_W - MARGIN, 282);
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text(sanitize(text), MARGIN, 286);
    doc.text(sanitize(`Pagina ${i} de ${pages}`), PAGE_W - MARGIN, 286, { align: "right" });
    if (downloader) {
      doc.setFontSize(6);
      doc.setTextColor(140);
      doc.text(sanitize(downloader), MARGIN, 290);
    }
  }
}

function drawInfoRow(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth: number = 38): number {
  y = checkPage(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(25, 55, 85);
  doc.text(sanitize(label), x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  const valLines = doc.splitTextToSize(sanitize(String(value || "-")), CONTENT_W - labelWidth - 2);
  doc.text(valLines, x + labelWidth, y);
  return y + Math.max(valLines.length * 4.5, 5);
}

/* ─── TRIBUNAL DE JUSTIÇA PDF ─── */
export function generateProcessoPDF(params: {
  processo: any;
  juizNome: string;
  movimentacoes: any[];
  atos: any[];
  audiencias: any[];
  sentencas: any[];
  procuracoes: any[];
  interessados: any[];
  apelacoes?: any[];
  embargos?: any[];
  logoBase64: string;
  baixadoPor?: string;
}) {
  const { processo, juizNome, movimentacoes, atos, audiencias, sentencas, procuracoes, interessados, apelacoes, embargos, logoBase64, baixadoPor } = params;
  const doc = new jsPDF();

  // ─── HEADER ───
  // Top bar
  doc.setFillColor(25, 55, 85);
  doc.rect(0, 0, PAGE_W, 3, "F");

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", MARGIN, 6, 20, 20); } catch {}
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 55, 85);
  doc.text("PODER JUDICIARIO", PAGE_W / 2, 13, { align: "center" });
  doc.setFontSize(9);
  doc.text("TRIBUNAL DE JUSTICA DO ESTADO DE SAO PAULO", PAGE_W / 2, 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text("Comarca de Sao Paulo - Jaguare RP", PAGE_W / 2, 23, { align: "center" });

  // Header line
  doc.setDrawColor(25, 55, 85);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 28, PAGE_W - MARGIN, 28);
  doc.setDrawColor(180, 140, 50);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 29, PAGE_W - MARGIN, 29);

  let y = 34;

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 55, 85);
  doc.text("INTEGRA DO PROCESSO", PAGE_W / 2, y, { align: "center" });
  y += 3;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(sanitize(processo.numero), PAGE_W / 2, y + 4, { align: "center" });
  y += 10;

  // ─── DADOS DO PROCESSO ───
  y = drawSectionHeader(doc, "DADOS DO PROCESSO", y);

  const infoRows: [string, string][] = [
    ["No Processo:", processo.numero],
    ["Classe:", processo.classe?.toUpperCase()],
    ["Assunto:", processo.assunto],
    ["Vara:", processo.vara || "-"],
    ["Juiz(a):", juizNome || "Nao atribuido"],
    ["Status:", processo.status?.replace(/_/g, " ").toUpperCase()],
    ["Data Autuacao:", new Date(processo.created_at).toLocaleString("pt-BR")],
    ["Autor(es):", formatPartesForPdf(processo.autor_nome)],
    ["Reu(s):", formatPartesForPdf(processo.reu_nome)],
  ];
  if (processo.valor_causa) {
    infoRows.push(["Valor da Causa:", Number(processo.valor_causa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })]);
  }
  if (processo.sigilo && processo.sigilo !== "publico") {
    infoRows.push(["Sigilo:", processo.sigilo === "segredo_justica" ? "Segredo de Justica" : "Sigilo Absoluto"]);
  }

  for (const [label, value] of infoRows) {
    y = drawInfoRow(doc, label, value, MARGIN + 2, y);
  }

  if (processo.descricao) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(25, 55, 85);
    doc.text("Sintese dos Fatos:", MARGIN + 2, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.setFontSize(8);
    y = addWrappedText(doc, processo.descricao, MARGIN + 2, y, CONTENT_W - 4, 3.8);
  }

  // ─── PROCURAÇÕES ───
  if (procuracoes?.length) {
    y += 4;
    y = drawSectionHeader(doc, "PROCURACOES", y);
    doc.setFontSize(8);
    doc.setTextColor(50);
    for (const p of procuracoes) {
      y = checkPage(doc, y, 6);
      doc.setFont("helvetica", "bold");
      const name = sanitize(`${p.advogado_nome}`);
      doc.text(`- ${name}`, MARGIN + 2, y);
      doc.setFont("helvetica", "normal");
      const labelParte = p.parte === "autor" ? "Autor" : "Reu";
      doc.text(sanitize(` | ${labelParte} | ${p.status}`), MARGIN + 2 + doc.getTextWidth(`- ${name}`), y);
      y += 5;
    }
  }

  // ─── INTERESSADOS ───
  if (interessados?.length) {
    y += 4;
    y = drawSectionHeader(doc, "INTERESSADOS NO PROCESSO", y);
    doc.setFontSize(8);
    doc.setTextColor(50);
    for (const i of interessados) {
      y = checkPage(doc, y, 5);
      doc.setFont("helvetica", "normal");
      doc.text(sanitize(`- ${i.orgao || ""} - ${i.nome || ""}`), MARGIN + 2, y);
      y += 5;
    }
  }

  // ─── ATOS JUDICIAIS ───
  if (atos?.length) {
    y += 4;
    y = drawSectionHeader(doc, "ATOS JUDICIAIS", y);
    for (const a of atos) {
      y = checkPage(doc, y, 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(25, 55, 85);
      doc.text(sanitize(`${a.tipo?.toUpperCase()} - ${a.titulo}`), MARGIN + 2, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(sanitize(`${new Date(a.created_at).toLocaleString("pt-BR")} - ${a.autor_nome || "Sistema"} ${a.assinado ? "(OK) Assinado" : ""}`), MARGIN + 2, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(50);
      y = addWrappedText(doc, a.conteudo || "", MARGIN + 2, y, CONTENT_W - 4, 3.5);
      y = drawLightSeparator(doc, y + 2);
    }
  }

  // ─── AUDIÊNCIAS ───
  if (audiencias?.length) {
    y += 4;
    y = drawSectionHeader(doc, "AUDIENCIAS", y);
    doc.setFontSize(8);
    doc.setTextColor(50);
    for (const a of audiencias) {
      y = checkPage(doc, y, 6);
      doc.setFont("helvetica", "normal");
      doc.text(sanitize(`- ${a.tipo} | ${new Date(a.data_hora).toLocaleString("pt-BR")} | ${a.local || "-"} | ${a.status}`), MARGIN + 2, y);
      y += 5;
    }
  }

  // ─── SENTENÇAS ───
  if (sentencas?.length) {
    y += 4;
    y = drawSectionHeader(doc, "SENTENCAS", y);
    for (const s of sentencas) {
      y = checkPage(doc, y, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(25, 55, 85);
      doc.text(sanitize(`${s.tipo?.toUpperCase()} - ${s.assinado ? "(OK) Assinado" : "Pendente de assinatura"}`), MARGIN + 2, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(50);
      if (s.ementa) {
        doc.setFont("helvetica", "italic");
        y = addWrappedText(doc, `Ementa: ${s.ementa}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
        y += 1;
      }
      doc.setFont("helvetica", "normal");
      doc.setFont("helvetica", "bold");
      doc.text("Fundamentacao:", MARGIN + 2, y);
      y += 4;
      y = renderRichText(doc, s.fundamentacao || "-", MARGIN + 2, y, CONTENT_W - 4, 3.5, 8);
      y += 1;
      doc.setFont("helvetica", "bold");
      doc.text("Dispositivo:", MARGIN + 2, y);
      y += 4;
      y = renderRichText(doc, s.dispositivo || "-", MARGIN + 2, y, CONTENT_W - 4, 3.5, 8);
      y = drawLightSeparator(doc, y + 2);
    }
  }

  // ─── APELAÇÕES ───
  if (apelacoes?.length) {
    y += 4;
    y = drawSectionHeader(doc, "RECURSOS DE APELACAO", y);
    const statusLabels: Record<string, string> = {
      interposta: "Interposta", admitida: "Admitida", em_julgamento: "Em Julgamento",
      provida: "Provida", improvida: "Improvida", parcialmente_provida: "Parcialmente Provida",
      nao_conhecida: "Nao Conhecida",
    };
    for (const ap of apelacoes) {
      y = checkPage(doc, y, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(25, 55, 85);
      doc.text(sanitize(`APELACAO - ${ap.apelante_nome} (${ap.apelante_tipo === "reu" ? "Reu" : ap.apelante_tipo === "autor" ? "Autor" : "Ambas as partes"})`), MARGIN + 2, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text(sanitize(`${new Date(ap.created_at).toLocaleString("pt-BR")} | Status: ${statusLabels[ap.status] || ap.status}`), MARGIN + 2, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(50);
      y = addWrappedText(doc, `Fundamentacao: ${ap.fundamentacao}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
      y += 1;
      y = addWrappedText(doc, `Pedido: ${ap.pedido}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
      if (ap.decisao_fundamentacao) {
        y += 1;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(25, 55, 85);
        doc.text("Decisao do Tribunal:", MARGIN + 2, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        y = addWrappedText(doc, `Tipo: ${ap.decisao_tipo || "-"} | Acordao: ${ap.numero_acordao || "-"}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
        y = addWrappedText(doc, ap.decisao_fundamentacao, MARGIN + 2, y, CONTENT_W - 4, 3.5);
        if (ap.decisao_dispositivo) {
          y = addWrappedText(doc, `Dispositivo: ${ap.decisao_dispositivo}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
        }
      }
      y = drawLightSeparator(doc, y + 2);
    }
  }

  // ─── EMBARGOS DE DECLARAÇÃO ───
  if (embargos?.length) {
    y += 4;
    y = drawSectionHeader(doc, "EMBARGOS DE DECLARACAO", y);
    const tipoLabels: Record<string, string> = { omissao: "Omissao", contradicao: "Contradicao", obscuridade: "Obscuridade" };
    const statusLabels: Record<string, string> = { opostos: "Opostos", acolhidos: "Acolhidos", rejeitados: "Rejeitados", parcialmente_acolhidos: "Parcialmente Acolhidos" };
    for (const emb of embargos) {
      y = checkPage(doc, y, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(25, 55, 85);
      doc.text(sanitize(`EMBARGOS DE DECLARACAO - ${tipoLabels[emb.tipo] || emb.tipo}`), MARGIN + 2, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text(sanitize(`${new Date(emb.created_at).toLocaleString("pt-BR")} | Embargante: ${emb.embargante_nome} | Status: ${statusLabels[emb.status] || emb.status}`), MARGIN + 2, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(50);
      y = addWrappedText(doc, `Fundamentacao: ${emb.fundamentacao}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
      y += 1;
      y = addWrappedText(doc, `Pedido: ${emb.pedido}`, MARGIN + 2, y, CONTENT_W - 4, 3.5);
      if (emb.decisao) {
        y += 1;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(25, 55, 85);
        doc.text("Decisao:", MARGIN + 2, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        y = addWrappedText(doc, emb.decisao, MARGIN + 2, y, CONTENT_W - 4, 3.5);
      }
      y = drawLightSeparator(doc, y + 2);
    }
  }

  // ─── MOVIMENTAÇÕES ───
  if (movimentacoes?.length) {
    y += 4;
    y = drawSectionHeader(doc, "MOVIMENTACOES PROCESSUAIS", y);
    // Numera sequencialmente: #1 = mais antiga, #N = mais recente (igual à UI)
    const movsOrdenadas = [...movimentacoes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const totalMovs = movsOrdenadas.length;
    // Exibe da mais recente para a mais antiga, mas com numeração estável
    const movsExibidas = [...movsOrdenadas].reverse();
    for (const m of movsExibidas) {
      const numero = movsOrdenadas.indexOf(m) + 1;
      y = checkPage(doc, y, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(25, 55, 85);
      doc.text(sanitize(`MOV #${numero}/${totalMovs} - ${new Date(m.created_at).toLocaleString("pt-BR")} - ${m.tipo?.toUpperCase()}`), MARGIN + 2, y);
      y += 3.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(80);
      const authorLine = sanitize(`${m.autor_nome || "Sistema"}:`);
      doc.text(authorLine, MARGIN + 4, y);
      y += 3;
      y = renderRichText(doc, m.descricao || "", MARGIN + 4, y, CONTENT_W - 8, 3.2, 7, [50, 50, 50]);
      y += 2;
    }
  }

  addFooter(doc, `Processo no ${processo.numero} - Tribunal de Justica do Estado de Sao Paulo - Sistema Judiciario vBETA`, baixadoPor);

  doc.save(`Processo_${processo.numero.replace(/\W/g, "_")}.pdf`);
}

/* ─── CARTÓRIO PDF ─── */
export function generateCartorioPDF(params: {
  registro: any;
  requerentes: { nome: string; id_personagem: string }[];
  envolvidos: { nome: string; id_personagem: string }[];
  links: string[];
  logoBase64: string;
}) {
  const { registro, requerentes, envolvidos, links, logoBase64 } = params;
  const doc = new jsPDF();

  // Header with cartório logo
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", PAGE_W / 2 - 15, 6, 30, 22); } catch {}
  }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 40, 40);
  doc.text("CARTORIO DE REGISTRO CIVIL", PAGE_W / 2, 32, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Comarca de Jaguare RP - Estado de Sao Paulo", PAGE_W / 2, 37, { align: "center" });

  let y = 43;
  y = drawLightSeparator(doc, y);

  // Document type title
  const tipoLabels: Record<string, string> = {
    certidao_nascimento: "CERTIDAO DE NASCIMENTO",
    certidao_casamento: "CERTIDAO DE CASAMENTO",
    certidao_obito: "CERTIDAO DE OBITO",
    divorcio: "CERTIDAO DE DIVORCIO",
    adocao: "TERMO DE ADOCAO",
    antecedentes: "CERTIDAO DE ANTECEDENTES",
    contrato: "REGISTRO DE CONTRATO",
    escritura: "ESCRITURA PUBLICA",
    procuracao: "PROCURACAO PUBLICA",
    reconhecimento_firma: "RECONHECIMENTO DE FIRMA",
    autenticacao: "AUTENTICACAO DE DOCUMENTO",
  };

  const requerenteLabels: Record<string, string> = {
    certidao_nascimento: "REGISTRANDO",
    certidao_casamento: "CONJUGE 1",
    certidao_obito: "SOLICITANTE (FAMILIAR/RESPONSAVEL)",
    certidao_distribuicao: "SOLICITANTE",
    divorcio: "CONJUGE 1",
    adocao: "ADOTANTE(S)",
    antecedentes: "PESSOA CONSULTADA",
    contrato: "PARTE 1",
    escritura: "OUTORGANTE(S)",
    procuracao: "OUTORGANTE(S)",
    reconhecimento_firma: "SOLICITANTE",
    autenticacao: "SOLICITANTE",
  };

  const envolvidosLabels: Record<string, string> = {
    certidao_nascimento: "PAIS / RESPONSAVEIS",
    certidao_casamento: "CONJUGE 2",
    certidao_obito: "FALECIDO(A)",
    divorcio: "CONJUGE 2",
    adocao: "ADOTADO(A)",
    contrato: "DEMAIS PARTES",
    escritura: "OUTORGADO(S) / ADQUIRENTE(S)",
    procuracao: "OUTORGADO(S)",
  };

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(sanitize(tipoLabels[registro.tipo] || registro.tipo.toUpperCase()), PAGE_W / 2, y + 6, { align: "center" });
  y += 14;

  // Registry info
  doc.setFontSize(9);
  doc.setTextColor(50);
  const rows = [
    ["No Registro:", registro.numero_registro],
    ["Status:", registro.status?.toUpperCase()],
    ["Data da Solicitacao:", new Date(registro.created_at).toLocaleString("pt-BR")],
  ];
  if (registro.emitido_por_nome) rows.push(["Emitido por:", registro.emitido_por_nome]);

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(sanitize(label), MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(String(value || "-")), MARGIN + 40, y);
    y += 5;
  }

  // Requerentes
  y += 3;
  y = drawLightSeparator(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(requerenteLabels[registro.tipo] || "REQUERENTE(S)", MARGIN, y + 3);
  y += 8;
  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");
  for (const r of requerentes) {
    doc.text(sanitize(`- ${r.nome} (ID: ${r.id_personagem})`), MARGIN + 2, y);
    y += 5;
  }
  if (!requerentes.length) {
    doc.text(sanitize(registro.requerente_nome || "-"), MARGIN + 2, y);
    y += 5;
  }

  // Envolvidos
  if (envolvidos.length) {
    y += 3;
    y = drawLightSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(envolvidosLabels[registro.tipo] || "PARTES ENVOLVIDAS", MARGIN, y + 3);
    y += 8;
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    for (const e of envolvidos) {
      doc.text(sanitize(`- ${e.nome} (ID: ${e.id_personagem})`), MARGIN + 2, y);
      y += 5;
    }
  }

  // Descrição
  y += 3;
  y = drawLightSeparator(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("DESCRICAO", MARGIN, y + 3);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.setFontSize(9);
  y = addWrappedText(doc, registro.descricao || "-", MARGIN, y, CONTENT_W, 4.5);

  // For procuração, show digital signatures section instead of raw JSON observacoes
  if (registro.tipo === "procuracao" && registro.observacoes) {
    let signatures: any[] = [];
    try { signatures = JSON.parse(registro.observacoes); } catch {}
    if (Array.isArray(signatures) && signatures.length > 0) {
      y += 4;
      y = drawLightSeparator(doc, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("ASSINATURAS DIGITAIS", MARGIN, y + 3);
      y += 8;
      doc.setTextColor(50);
      doc.setFont("helvetica", "normal");
      for (const sig of signatures) {
        const status = sig.confirmed ? "Confirmada" : "Pendente";
        doc.text(sanitize(`- ${sig.nome} (ID: ${sig.id_personagem}) - ${status}`), MARGIN + 2, y);
        y += 5;
      }
    }
  } else if (registro.tipo === "certidao_distribuicao" && registro.observacoes) {
    y += 4;
    y = drawLightSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("PROCESSOS DISTRIBUIDOS", MARGIN, y + 3);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.setFontSize(8);
    y = addWrappedText(doc, registro.observacoes, MARGIN, y, CONTENT_W, 4);
    doc.setFontSize(9);
  } else if (registro.observacoes) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Observacoes:", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, registro.observacoes, MARGIN, y, CONTENT_W, 4.5);
  }

  // Links / Documentos Anexos
  if (links.length) {
    y += 4;
    y = drawLightSeparator(doc, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("DOCUMENTOS ANEXOS", MARGIN, y + 3);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    for (let idx = 0; idx < links.length; idx++) {
      if (y > 275) { doc.addPage(); y = 20; }
      const url = links[idx];
      const label = `${idx + 1}. ${url.length > 90 ? url.substring(0, 87) + "..." : url}`;
      doc.setTextColor(0, 50, 150);
      doc.textWithLink(label, MARGIN + 2, y, { url });
      y += 5;
    }
    doc.setTextColor(50);
  }

  // Signature area
  y += 15;
  if (y > 250) { doc.addPage(); y = 40; }
  doc.setDrawColor(50);
  doc.line(PAGE_W / 2 - 35, y, PAGE_W / 2 + 35, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(sanitize(registro.emitido_por_nome || "Oficial de Justica / Cartorario"), PAGE_W / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(7);
  doc.text("Cartorio de Registro Civil - Comarca de Jaguare RP", PAGE_W / 2, y, { align: "center" });

  addFooter(doc, `Registro ${registro.numero_registro} - Cartorio de Registro Civil - Comarca de Jaguare RP`);

  doc.save(`Cartorio_${registro.numero_registro.replace(/\W/g, "_")}.pdf`);
}

/* ─── Logo to Base64 converter ─── */
export function imageToBase64(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
}

/* ─── MOVIMENTAÇÃO INDIVIDUAL — PDF TIMBRADO ─── */
export function generateMovimentacaoPDF(params: {
  processo: { numero: string; classe?: string; assunto?: string; vara?: string; autor_nome?: string; reu_nome?: string };
  movimentacao: {
    tipo: string;
    titulo?: string;
    descricao: string;
    autor?: string;
    data: string; // ISO
    attachments?: { nome: string; url: string }[];
    link?: string;
    numero?: number;
    total?: number;
  };
  logoBase64: string;
  baixadoPor?: string;
}) {
  const { processo, movimentacao, logoBase64, baixadoPor } = params;
  const doc = new jsPDF();

  // ─── HEADER TIMBRADO ───
  doc.setFillColor(25, 55, 85);
  doc.rect(0, 0, PAGE_W, 3, "F");

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", MARGIN, 6, 20, 20); } catch {}
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 55, 85);
  doc.text("PODER JUDICIARIO", PAGE_W / 2, 13, { align: "center" });
  doc.setFontSize(9);
  doc.text("TRIBUNAL DE JUSTICA DO ESTADO DE SAO PAULO", PAGE_W / 2, 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text("Comarca de Sao Paulo - Jaguare RP", PAGE_W / 2, 23, { align: "center" });

  doc.setDrawColor(25, 55, 85);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 28, PAGE_W - MARGIN, 28);
  doc.setDrawColor(180, 140, 50);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 29, PAGE_W - MARGIN, 29);

  let y = 36;

  // Title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 55, 85);
  const numLabel = movimentacao.numero
    ? ` #${movimentacao.numero}${movimentacao.total ? `/${movimentacao.total}` : ""}`
    : "";
  doc.text(sanitize(`CERTIDAO DE MOVIMENTACAO PROCESSUAL${numLabel}`), PAGE_W / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(sanitize(`Processo no ${processo.numero}`), PAGE_W / 2, y, { align: "center" });
  y += 8;

  // ─── DADOS DO PROCESSO ───
  y = drawSectionHeader(doc, "DADOS DO PROCESSO", y);
  y = drawInfoRow(doc, "No Processo:", processo.numero, MARGIN + 2, y);
  if (processo.classe) y = drawInfoRow(doc, "Classe:", processo.classe.toUpperCase(), MARGIN + 2, y);
  if (processo.assunto) y = drawInfoRow(doc, "Assunto:", processo.assunto, MARGIN + 2, y);
  if (processo.vara) y = drawInfoRow(doc, "Vara:", processo.vara, MARGIN + 2, y);
  if (processo.autor_nome) y = drawInfoRow(doc, "Autor(es):", formatPartesForPdf(processo.autor_nome), MARGIN + 2, y);
  if (processo.reu_nome) y = drawInfoRow(doc, "Reu(s):", formatPartesForPdf(processo.reu_nome), MARGIN + 2, y);

  y += 4;

  // ─── MOVIMENTAÇÃO ───
  y = drawSectionHeader(doc, "MOVIMENTACAO", y);

  y = drawInfoRow(doc, "Tipo:", (movimentacao.tipo || "").toUpperCase(), MARGIN + 2, y);
  if (movimentacao.numero) {
    const numTxt = movimentacao.total ? `${movimentacao.numero} de ${movimentacao.total}` : String(movimentacao.numero);
    y = drawInfoRow(doc, "Movimentacao no:", numTxt, MARGIN + 2, y);
  }
  y = drawInfoRow(doc, "Data/Hora:", new Date(movimentacao.data).toLocaleString("pt-BR"), MARGIN + 2, y);
  if (movimentacao.autor) y = drawInfoRow(doc, "Responsavel:", movimentacao.autor, MARGIN + 2, y);
  if (movimentacao.titulo) y = drawInfoRow(doc, "Titulo:", movimentacao.titulo, MARGIN + 2, y);

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(25, 55, 85);
  doc.text("Descricao:", MARGIN + 2, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50);

  y = renderRichText(doc, movimentacao.descricao || "", MARGIN + 2, y, CONTENT_W - 4, 4.5, 9, [50, 50, 50]);

  // ─── ANEXOS / LINKS ───
  if (movimentacao.attachments?.length || movimentacao.link) {
    y += 4;
    y = drawSectionHeader(doc, "ANEXOS", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    if (movimentacao.link) {
      y = checkPage(doc, y, 5);
      doc.setTextColor(0, 50, 150);
      doc.textWithLink(sanitize("- Documento principal: " + movimentacao.link), MARGIN + 2, y, { url: movimentacao.link });
      doc.setTextColor(50);
      y += 5;
    }
    for (const att of movimentacao.attachments || []) {
      y = checkPage(doc, y, 5);
      doc.setTextColor(50);
      doc.text(sanitize(`- ${att.nome}: `), MARGIN + 2, y);
      const labelW = doc.getTextWidth(sanitize(`- ${att.nome}: `));
      doc.setTextColor(0, 50, 150);
      doc.textWithLink(sanitize(att.url), MARGIN + 2 + labelW, y, { url: att.url });
      doc.setTextColor(50);
      y += 5;
    }
  }

  // ─── RODAPÉ DE CERTIFICAÇÃO ───
  y += 6;
  y = checkPage(doc, y, 18);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  const certText = `Documento emitido eletronicamente pelo Sistema Judiciario em ${new Date().toLocaleString("pt-BR")}. A autenticidade pode ser verificada consultando o processo no 0${processo.numero} no sistema.`;
  y = addWrappedText(doc, certText, MARGIN, y, CONTENT_W, 3.8);

  addFooter(doc, `Processo no ${processo.numero} - Movimentacao individual - Tribunal de Justica do Estado de Sao Paulo`, baixadoPor);

  const safeNum = processo.numero.replace(/\W/g, "_");
  const safeTipo = (movimentacao.tipo || "movimentacao").replace(/\W/g, "_");
  const dt = new Date(movimentacao.data).toISOString().slice(0, 10);
  const numPart = movimentacao.numero ? `_n${movimentacao.numero}` : "";
  doc.save(`Movimentacao${numPart}_${safeNum}_${safeTipo}_${dt}.pdf`);
}

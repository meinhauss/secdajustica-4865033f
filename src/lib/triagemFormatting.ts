import { sanitizeRichHtml } from "@/lib/sanitize";

const labels: Record<string, string> = {
  vitimas: "Vítimas", testemunhas: "Testemunhas", policiaisCondutores: "Policiais condutores",
  autoresInvestigados: "Autores investigados", nome: "Nome", papel: "Papel", evidencias: "Evidências",
  autor: "Autor", artigo: "Artigo", crime: "Crime", penaBaseMeses: "Pena-base (meses)",
  multaBase: "Multa-base", fianca: "Fiança", "fiança": "Fiança", "inafiançavel": "Inafiançável",
  inafiancavel: "Inafiançável", valorTotal: "Valor total", fundamento: "Fundamento",
  reducoes: "Reduções", majoracoes: "Majorações", penaFinalMeses: "Pena final (meses)",
  multaFinal: "Multa final", percentual: "Percentual", descricao: "Descrição", motivo: "Motivo",
  tipo: "Tipo", valor: "Valor", cabimento: "Cabimento", status: "Situação",
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Decode before sanitizing: providers may escape markup more than once. */
function decodeMarkup(input: string): string {
  let text = input.replace(/\\u003c/gi, "<").replace(/\\u003e/gi, ">")
    .replace(/\\n/g, "\n").replace(/\\"/g, '"');
  for (let pass = 0; pass < 8; pass++) {
    const decoded = new DOMParser().parseFromString(`<body>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>`, "text/html").body.textContent || "";
    if (decoded === text) break;
    text = decoded;
  }
  return text.replace(/^\s*```(?:html|markdown|json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
}

function formatString(input: string): string {
  const text = decodeMarkup(input);
  // Sometimes an entire section is returned as JSON encoded inside a string.
  if (/^[\[{]/.test(text)) {
    try { return formatTriagemValue(JSON.parse(text)); } catch { /* ordinary prose */ }
  }
  const inline = (line: string) => escapeHtml(line)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  if (/<\/?[a-z][^>]*>/i.test(text)) {
    const doc = new DOMParser().parseFromString(sanitizeRichHtml(text), "text/html");
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const nodes: Node[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const span = doc.createElement("span");
      span.innerHTML = inline(node.textContent || "");
      node.parentNode?.replaceChild(span, node);
    }
    return sanitizeRichHtml(doc.body.innerHTML);
  }
  return text.split(/\r?\n/).map((line) => {
    const heading = /^#{1,6}\s+(.+)/.exec(line);
    if (heading) return `<p><strong>${inline(heading[1])}</strong></p>`;
    const item = /^\s*(?:[-*•]|\d+[.)])\s+(.+)/.exec(line);
    if (item) return `<ul><li>${inline(item[1])}</li></ul>`;
    return line.trim() ? `<p>${inline(line)}</p>` : "<br>";
  }).join("");
}

/** One safe, human-readable representation for cards and PDF rich-text layout. */
export function formatTriagemValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "<p>Não informado</p>";
  if (Array.isArray(value)) {
    if (!value.length) return "<p>Nenhum registro</p>";
    if (value.some((item) => item !== null && typeof item === "object")) {
      return value.map((item, index) => `<p><strong>Registro ${index + 1}</strong></p>${formatTriagemValue(item)}`).join("");
    }
    return `<ul>${value.map((item) => `<li>${formatTriagemValue(item)}</li>`).join("")}</ul>`;
  }
  if (typeof value === "object") {
    return Object.entries(value).map(([key, item]) => {
      const label = labels[key] || key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
      const heading = `<p><strong>${escapeHtml(label.charAt(0).toUpperCase() + label.slice(1))}:</strong></p>`;
      return heading + formatTriagemValue(item);
    }).join("") || "<p>Não informado</p>";
  }
  if (typeof value === "boolean") return `<p>${value ? "Sim" : "Não"}</p>`;
  return formatString(String(value));
}

export function triagemValueToText(value: unknown): string {
  const html = formatTriagemValue(value).replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li>/g, "<li>• ").replace(/<\/(p|li|ul)>/g, "\n</$1>");
  return (new DOMParser().parseFromString(html, "text/html").body.textContent || "")
    .replace(/\n{3,}/g, "\n\n").trim();
}
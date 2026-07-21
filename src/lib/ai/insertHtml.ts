/**
 * Sanitiza e insere saída de IA em editores RichText.
 * Corrige problemas comuns:
 *  - AI devolve fences de código (```html)
 *  - AI devolve tags <html>/<body>
 *  - AI devolve HTML já formatado, mas o caller re-envolvia em <p> (gerando <p><p>…</p></p>)
 *  - excesso de parágrafos vazios seguidos (quebras de linha exageradas)
 */
export function sanitizeAiHtml(raw: string): string {
  if (!raw) return "";
  let s = String(raw).trim();

  // Remove fences ```html ... ```
  s = s.replace(/^```[a-zA-Z]*\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  // Remove wrappers de documento
  s = s.replace(/<\/?(html|body|head|meta|title|link|style)[^>]*>/gi, "").trim();

  // Remove prefixos "Aqui está..." "Segue...:" antes da 1a tag
  s = s.replace(/^(?:aqui\s+est[áa][^<]*[:.]?\s*|segue[^<]*[:.]?\s*|texto sugerido[^<]*[:.]?\s*)/i, "").trim();

  const looksHtml = /<(p|br|div|ul|ol|li|strong|em|u|h[1-6])[\s/>]/i.test(s);

  if (!looksHtml) {
    // Texto puro → converte quebras em <p>/<br/>
    s = s
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
  } else {
    // Converte markdown residual (**bold**, *italic*) se AI ignorou instrução
    s = s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,;:!?)]|$)/g, "$1<em>$2</em>");
  }

  // Colapsa múltiplos parágrafos vazios consecutivos em UM só (respiro visual)
  s = s.replace(/(?:\s*<p>\s*(?:<br\s*\/?>)?\s*<\/p>\s*){2,}/gi, "<p><br/></p>");

  // Remove parágrafos vazios no início/fim
  s = s.replace(/^(?:\s*<p>\s*(?:<br\s*\/?>)?\s*<\/p>\s*)+/i, "");
  s = s.replace(/(?:\s*<p>\s*(?:<br\s*\/?>)?\s*<\/p>\s*)+$/i, "");

  return s.trim();
}

/** Anexa (ou insere) conteúdo sanitizado no rascunho atual. */
export function appendAiHtml(prev: string, add: string): string {
  const clean = sanitizeAiHtml(add);
  if (!clean) return prev || "";
  const empty = !prev || prev === "<p></p>" || prev === "<p><br/></p>" || prev.replace(/<[^>]+>/g, "").trim() === "";
  if (empty) return clean;
  return prev + clean;
}

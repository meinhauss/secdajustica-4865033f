import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span", "div",
];

const ALLOWED_ATTR = ["style", "class"];

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^$/, // disallow links/URIs
  });
}

/**
 * True when the string contains HTML markup likely produced by the rich editor.
 * Used to decide whether to render with dangerouslySetInnerHTML or as plain text.
 */
export function isRichHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?(p|br|strong|em|u|s|ul|ol|li|h[1-4]|blockquote|span|div)\b/i.test(value);
}

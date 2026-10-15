import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span", "div", "a",
];

const ALLOWED_ATTR = ["style", "class", "href", "target", "rel"];

const DISALLOWED_STYLE_PROPERTIES = ["color", "background", "background-color", "caret-color", "text-shadow"];

function removeVisibilityBreakingStyles(html: string): string {
  if (!html) return "";

  if (typeof document === "undefined") {
    return html.replace(/\sstyle="([^"]*)"/gi, (_match, style: string) => {
      const cleaned = style
        .split(";")
        .map((rule) => rule.trim())
        .filter(Boolean)
        .filter((rule) => {
          const property = rule.split(":")[0]?.trim().toLowerCase();
          return property && !DISALLOWED_STYLE_PROPERTIES.includes(property);
        })
        .join("; ");

      return cleaned ? ` style="${cleaned}"` : "";
    });
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  wrapper.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    DISALLOWED_STYLE_PROPERTIES.forEach((property) => element.style.removeProperty(property));
    if (!element.getAttribute("style")?.trim()) element.removeAttribute("style");
  });
  return wrapper.innerHTML;
}

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|r2:)/i,
  });
  const withTargets = typeof document !== "undefined"
    ? (() => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = sanitized;
        wrapper.querySelectorAll("a[href]").forEach((a) => {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer nofollow");
        });
        return wrapper.innerHTML;
      })()
    : sanitized.replace(/<a\s+([^>]*?)>/gi, (_m, attrs) => `<a ${attrs} target="_blank" rel="noopener noreferrer nofollow">`);
  return removeVisibilityBreakingStyles(withTargets);
}

/**
 * True when the string contains HTML markup likely produced by the rich editor.
 * Used to decide whether to render with dangerouslySetInnerHTML or as plain text.
 */
export function isRichHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?(p|br|strong|em|u|s|ul|ol|li|h[1-4]|blockquote|span|div)\b/i.test(value);
}

export function plainTextToRichHtml(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r|\n/g, "<br>");
}

export function normalizeRichText(value: string | null | undefined): string {
  if (!value) return "";
  return isRichHtml(value) ? sanitizeRichHtml(value) : plainTextToRichHtml(value);
}

/**
 * Valida se a string é uma URL pública http(s). Rejeita esquemas perigosos ou
 * caminhos locais (file://, C:\, \\servidor, javascript:, data:, etc.), que
 * jamais são acessíveis a outros usuários e podem quebrar links do sistema.
 */
export function isValidPublicUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  if (/^r2:\/\/processos\//.test(raw)) return true;
  // Rejeitar padrões locais/anti-web comuns
  if (/^(file:|about:|javascript:|data:|blob:|vbscript:)/i.test(raw)) return false;
  if (/^[a-zA-Z]:[\\/]/.test(raw)) return false; // C:\ ou C:/
  if (/^\\\\/.test(raw)) return false;           // UNC \\server\share
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

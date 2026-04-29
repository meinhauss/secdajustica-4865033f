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
    ALLOWED_URI_REGEXP: /^$/, // disallow links/URIs
  });
  return removeVisibilityBreakingStyles(sanitized);
}

/**
 * True when the string contains HTML markup likely produced by the rich editor.
 * Used to decide whether to render with dangerouslySetInnerHTML or as plain text.
 */
export function isRichHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?(p|br|strong|em|u|s|ul|ol|li|h[1-4]|blockquote|span|div)\b/i.test(value);
}

import { describe, it, expect } from "vitest";
import { formatTriagemValue, triagemValueToText } from "./triagemFormatting";

describe("Triagem Penal formatting", () => {
  it.each([
    "<p><strong>Confissão</strong></p><ul><li>Confirmada</li></ul>",
    "&lt;p&gt;&lt;strong&gt;Confissão&lt;/strong&gt;&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Confirmada&lt;/li&gt;&lt;/ul&gt;",
    "&amp;lt;p&amp;gt;&amp;lt;strong&amp;gt;Confissão&amp;lt;/strong&amp;gt;&amp;lt;/p&amp;gt;&amp;lt;ul&amp;gt;&amp;lt;li&amp;gt;Confirmada&amp;lt;/li&amp;gt;&amp;lt;/ul&amp;gt;",
    "```html\n<p><strong>Confissão</strong></p><ul><li>Confirmada</li></ul>\n```",
  ])("decodes HTML and preserves emphasis without visible tags", (input) => {
    const html = formatTriagemValue(input);
    expect(html).toContain("<strong>Confissão</strong>");
    const text = triagemValueToText(input);
    expect(text).toContain("Confissão");
    expect(text).toContain("Confirmada");
    expect(text).not.toMatch(/<\/?\w|&lt;|```/);
  });

  it("formats nested records with labels, not JSON", () => {
    const text = triagemValueToText({ autoresInvestigados: [{ nome: "<b>João</b>", evidencias: "&lt;p&gt;Relato&lt;/p&gt;" }], penaFinalMeses: 10 });
    expect(text).toContain("Autores investigados:");
    expect(text).toContain("João");
    expect(text).toContain("Pena final (meses):");
    expect(text).not.toMatch(/[{}\[\]]|<\/?\w|&lt;/);
  });

  it("removes unsafe markup after entity decoding", () => {
    const html = formatTriagemValue('&lt;img src=x onerror=alert(1)&gt;<p onclick="bad()">Seguro</p><script>alert(1)</script>');
    expect(html).not.toMatch(/onerror|onclick|<script|<img/);
    expect(html).toContain("Seguro");
  });

  it("formats markdown, booleans, empty values and JSON string sections", () => {
    expect(formatTriagemValue("**Atenção**\n- Revisar")).toContain("<strong>Atenção</strong>");
    expect(triagemValueToText(true)).toBe("Sim");
    expect(triagemValueToText([])).toBe("Nenhum registro");
    expect(triagemValueToText(null)).toBe("Não informado");
    expect(triagemValueToText('{"crime":"&lt;b&gt;Furto&lt;/b&gt;"}')).toContain("Furto");
    expect(triagemValueToText("Pena < 20 meses e multa > 0")).toBe("Pena < 20 meses e multa > 0");
  });
});
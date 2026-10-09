import { describe, expect, it } from "vitest";
import { buildTriagemReport } from "./triagemReport";

describe("Triagem narrative report", () => {
  it("preserves grounds, accents and money without exposing markup", () => {
    const sections = buildTriagemReport("Relato da ocorrência.", {
      qualificacao: { vitimas: [{ nome: "&lt;b&gt;Maria&lt;/b&gt;", evidencias: "<p>Depoimento confirmado.</p>" }] },
      tipificacao: [{ autor: "João", artigo: "Art. 1", crime: "Crime de teste", penaBaseMeses: 10, multaBase: 1000, fundamento: "Reconhecimento relatado pela vítima." }],
      cabimentoTCO: "cabível", fundamentoTCO: "&lt;p&gt;Fundamento informado.&lt;/p&gt;",
      fiança: { cabimento: "cabível", valorTotal: 1000, fundamento: "Hipótese prevista no catálogo." },
      dosimetria: { penaBaseMeses: 10, multaBase: 1000, penaFinalMeses: 10, multaFinal: 1000, reducoes: [], majoracoes: [] },
    }, []);
    const prose = sections.flatMap(section => section.paragraphs).join("\n");
    expect(prose).toContain("Maria foi identificado(a)");
    expect(prose).toContain("Reconhecimento relatado pela vítima.");
    expect(prose).toContain("Fundamento informado.");
    expect(prose).toContain("1.000,00");
    expect(prose).not.toMatch(/<\/?(?:p|b)>|&lt;|Registro 1/);
    expect(sections).toHaveLength(7);
  });
  it("flags missing grounds instead of fabricating law", () => {
    const prose = buildTriagemReport("Relato", { tipificacao: [{ autor: "João", artigo: "Art. 1", crime: "Teste" }] }, []).flatMap(section => section.paragraphs).join("\n");
    expect(prose).toContain("Não foi apresentada fundamentação individualizada");
    expect(prose).toContain("não apresentou fundamento para o cabimento");
    expect(prose).not.toContain("Art. 37");
  });
});
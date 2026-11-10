import { describe, expect, it } from "vitest";
import { canDPGManageConcurso, canDesembargadorManageConcurso } from "./concursosPermissions";

describe("concursos da Defensoria", () => {
  it("permite ao DPG gerir concurso para Defensor Público", () => {
    expect(canDPGManageConcurso(["defensor_publico_geral"], "Defensor Público")).toBe(true);
  });
  it("não estende o poder do DPG a concursos de outras instituições", () => {
    expect(canDPGManageConcurso(["defensor_publico_geral"], "Promotor de Justiça")).toBe(false);
    expect(canDPGManageConcurso(["defensor_publico_geral"], "Juiz de Direito")).toBe(false);
  });
  it("não permite que defensor sem chefia administre o concurso", () => {
    expect(canDPGManageConcurso(["defensor_publico"], "Defensor Público")).toBe(false);
  });
});
describe("concursos de Analista", () => {
  it("permite ao desembargador gerir concurso de Analista Judiciário", () => {
    expect(canDesembargadorManageConcurso(["desembargador"], "Analista Judiciário")).toBe(true);
  });
  it("não permite ao desembargador gerir concurso de outro cargo", () => {
    expect(canDesembargadorManageConcurso(["desembargador"], "Juiz de Direito")).toBe(false);
  });
});

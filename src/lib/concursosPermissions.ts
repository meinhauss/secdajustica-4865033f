/** DPG competition controls are restricted to the Defensoria career. */
export function canDPGManageConcurso(roles: readonly string[], cargo: string): boolean {
  return roles.includes("defensor_publico_geral") && cargo === "Defensor Público";
}

/** Desembargadores manage only Analista competitions. */
export function canDesembargadorManageConcurso(roles: readonly string[], cargo: string): boolean {
  return roles.includes("desembargador") && cargo === "Analista Judiciário";
}

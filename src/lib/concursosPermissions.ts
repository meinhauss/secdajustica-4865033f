/** DPG competition controls are restricted to the Defensoria career. */
export function canDPGManageConcurso(roles: readonly string[], cargo: string): boolean {
  return roles.includes("defensor_publico_geral") && cargo === "Defensor Público";
}
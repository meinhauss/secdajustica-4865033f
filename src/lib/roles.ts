/**
 * Definição centralizada de roles do sistema.
 * Evita duplicação de arrays de permissão em múltiplos componentes.
 */

export const ALL_ROLES = [
  "admin",
  "presidente_tribunal",
  "desembargador",
  "magistrado",
  "ministerio_publico",
  "procurador_geral",
  "procurador_geral_adjunto",
  "procurador_estado",
  "oficial_justica",
  "advogado",
  "cidadao",
  "presidente_oab",
  "bacharel_direito",
  "policia_civil",
  "policia_militar",
  "policia_federal",
  "delegado",
  "corregedor",
  "gaeco",
  "chefe_gaeco",
  "hospital",
  "detran",
  "analista",
  "investigador",
  "defensor_publico",
  "defensor_publico_geral",
] as const;

export type Role = (typeof ALL_ROLES)[number];

/** Roles com acesso ao sistema judicial (processos, audiências, etc.) */
export const JUDICIAL_ROLES: Role[] = [
  "admin", "magistrado", "presidente_tribunal", "desembargador",
  "ministerio_publico", "advogado", "procurador_estado", "delegado",
  "procurador_geral", "procurador_geral_adjunto", "oficial_justica",
  "corregedor", "gaeco", "chefe_gaeco", "analista",
];

/** Roles administrativas */
export const ADMIN_ROLES: Role[] = ["admin"];

/** Roles policiais / segurança */
export const POLICE_ROLES: Role[] = [
  "policia_civil", "policia_militar", "policia_federal",
  "delegado", "corregedor", "gaeco", "chefe_gaeco", "investigador",
];

/** Roles que exigem foto de perfil obrigatória */
export const AVATAR_REQUIRED_ROLES: Role[] = [
  "advogado", "magistrado", "desembargador", "presidente_tribunal",
  "ministerio_publico", "procurador_geral", "procurador_geral_adjunto",
  "procurador_estado", "delegado", "presidente_oab", "bacharel_direito",
  "admin",
];

/** Labels legíveis para cada role */
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  presidente_tribunal: "Presidente do Tribunal",
  desembargador: "Desembargador(a)",
  magistrado: "Juiz(a) de Direito",
  gaeco: "GAECO",
  chefe_gaeco: "Chefe GAECO",
  corregedor: "Corregedor(a)",
  ministerio_publico: "Promotor(a)",
  procurador_geral: "Procurador(a)-Geral",
  procurador_geral_adjunto: "Procurador(a)-Geral Adjunto(a)",
  oficial_justica: "Oficial de Justiça",
  presidente_oab: "Presidente da OAB",
  advogado: "Advogado(a)",
  bacharel_direito: "Bacharel em Direito",
  cidadao: "Cidadão",
  delegado: "Delegado(a)",
  policia_civil: "Polícia Civil",
  policia_militar: "Polícia Militar",
  policia_federal: "Polícia Federal",
  hospital: "Hospital",
  detran: "DETRAN",
  procurador_estado: "Procurador(a) Geral do Estado",
  defensor_publico_geral: "Defensor(a) Público(a)-Geral",
  defensor_publico: "Defensor(a) Público(a)",
  analista: "Analista",
  investigador: "Investigador(a)",
};

/** Verifica se o usuário possui alguma das roles permitidas */
export function hasAnyRole(userRoles: string[], ...allowed: Role[]): boolean {
  return allowed.some((r) => userRoles.includes(r));
}

/** Retorna o label legível da primeira role do usuário, ou fallback */
export function getPrimaryRoleLabel(userRoles: string[]): string {
  for (const r of userRoles) {
    if (r in ROLE_LABELS) return ROLE_LABELS[r as Role];
  }
  return "Cidadão";
}

/** Prioridade de roles para exibição (primeira match vence) */
export const ROLE_PRIORITY: Role[] = [
  "admin", "presidente_tribunal", "desembargador", "magistrado",
  "procurador_geral", "procurador_geral_adjunto", "ministerio_publico",
  "procurador_estado", "presidente_oab", "advogado", "bacharel_direito",
  "chefe_gaeco", "gaeco", "delegado", "policia_federal", "policia_civil",
  "policia_militar", "oficial_justica", "hospital", "detran", "cidadao",
];

/** Retorna a role primária do usuário segundo a prioridade */
export function getPrimaryRole(userRoles: string[]): Role {
  return ROLE_PRIORITY.find((r) => userRoles.includes(r)) || "cidadao";
}
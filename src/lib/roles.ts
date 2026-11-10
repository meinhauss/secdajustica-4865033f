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
/** Cargos com capacidade postulatória equiparada à advocacia. */
export const ADVOGADO_LIKE_ROLES = ["advogado", "defensor_publico", "defensor_publico_geral", "procurador_estado"] as const;
export function isAdvogadoLike(userRoles: string[]): boolean {
  return userRoles.some((r) => (ADVOGADO_LIKE_ROLES as readonly string[]).includes(r));
}

export function hasAnyRole(userRoles: string[], ...allowed: Role[]): boolean {
  return allowed.some((r) => userRoles.includes(r));
}

/** Retorna os cargos do usuário combinados (ignora "Cidadão" se houver outro cargo) */
export function getPrimaryRoleLabel(userRoles: string[]): string {
  const known = userRoles.filter((r): r is Role => r in ROLE_LABELS && r !== "cidadao");
  if (!known.length) return "Cidadão";
  const order = (r: Role) => {
    const i = ROLE_PRIORITY.indexOf(r);
    return i === -1 ? 999 : i;
  };
  const sorted = [...new Set(known)].sort((a, b) => order(a) - order(b));
  const corpos: Record<string, string> = {
    policia_civil: "da Polícia Civil",
    policia_militar: "da Polícia Militar",
    policia_federal: "da Polícia Federal",
  };
  const labels: string[] = [];
  const consumed = new Set<Role>();
  if (sorted.includes("corregedor")) {
    const inst = sorted.filter((r) => r in corpos);
    if (inst.length) {
      labels.push(`Corregedor(a) ${inst.map((r) => corpos[r]).join(" e ")}`);
      consumed.add("corregedor");
      inst.forEach((r) => consumed.add(r));
    }
  }
  for (const r of sorted) if (!consumed.has(r)) labels.push(ROLE_LABELS[r]);
  return labels.join(" / ");
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
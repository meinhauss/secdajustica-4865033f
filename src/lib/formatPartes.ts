/** Shared helpers to parse and display autor_nome / reu_nome JSON fields */

export type ParteEntry = { nome: string; id_personagem?: string };

export function parsePartesFromString(value: string): ParteEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return [{ nome: value }];
}

export function formatPartesDisplay(partes: ParteEntry[]): string {
  return partes.map(p => p.id_personagem ? `${p.nome} (ID: ${p.id_personagem})` : p.nome).join(", ");
}

export function formatPartesShort(value: string): string {
  const partes = parsePartesFromString(value);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].nome;
  return `${partes[0].nome} e outros (${partes.length})`;
}

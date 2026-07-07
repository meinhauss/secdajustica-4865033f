// Formata telefone in-game no padrão: (14) 9 0000-0000
export function formatTelefoneIngame(value: string): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 11);
  const len = digits.length;
  if (len === 0) return "";
  if (len <= 2) return `(${digits}`;
  if (len === 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (len <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

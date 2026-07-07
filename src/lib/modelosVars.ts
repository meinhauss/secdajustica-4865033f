/**
 * Substituição de variáveis em modelos de documentos.
 * Sintaxe: {{variavel}}
 */

export interface ModeloContext {
  numero_processo?: string;
  nome_autor?: string;
  nome_reu?: string;
  nome_usuario?: string;
  juiz?: string;
  classe?: string;
  data_hoje?: string;
  [key: string]: string | undefined;
}

export const VARIAVEIS_DISPONIVEIS = [
  { key: "numero_processo", label: "Número do processo" },
  { key: "nome_autor", label: "Nome do autor" },
  { key: "nome_reu", label: "Nome do réu" },
  { key: "nome_usuario", label: "Seu nome" },
  { key: "juiz", label: "Juiz do processo" },
  { key: "classe", label: "Classe processual" },
  { key: "data_hoje", label: "Data de hoje" },
] as const;

export function aplicarVariaveis(texto: string, ctx: ModeloContext = {}): string {
  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const contexto: ModeloContext = { data_hoje: hoje, ...ctx };
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const val = contexto[key];
    return val && val.trim() !== "" ? val : `{{${key}}}`;
  });
}

/**
 * Extrai apenas o nome (string) do formato JSON array usado em processos.
 * autor_nome/reu_nome podem ser `[{"nome":"X","id_personagem":"1"}]` ou texto simples.
 */
export function extrairNomes(campo: string | null | undefined): string {
  if (!campo) return "";
  if (typeof campo !== "string") return "";
  if (!campo.trim().startsWith("[")) return campo;
  try {
    const arr = JSON.parse(campo);
    if (Array.isArray(arr)) {
      return arr.map((e: any) => e?.nome || "").filter(Boolean).join(", ");
    }
  } catch {
    /* ignore */
  }
  return campo;
}

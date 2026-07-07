import { z } from "zod";

/**
 * Schemas Zod centralizados para formulários do sistema.
 * Use `schema.safeParse(dados)` no submit e exiba `result.error.issues[0].message`.
 */

/* ─── Primitivos reutilizáveis ─── */
const idPersonagem = z
  .string()
  .trim()
  .regex(/^\d{1,10}$/, "ID do personagem deve conter apenas números")
  .optional()
  .or(z.literal(""));

const nomeCompleto = z
  .string()
  .trim()
  .min(3, "Nome deve ter ao menos 3 caracteres")
  .max(120, "Nome muito longo");

const parteEntry = z.object({
  nome: nomeCompleto,
  id_personagem: z.string().trim().optional(),
});

const partesArray = z
  .array(parteEntry)
  .min(1, "Informe ao menos uma parte");

/* ─── Processo ─── */
export const processoSchema = z.object({
  classe: z.enum(
    ["civel", "criminal", "familia", "trabalhista", "administrativo", "constitucional"],
    { message: "Selecione a classe do processo" }
  ),
  assunto: z.string().trim().min(5, "Assunto muito curto").max(300, "Assunto muito longo"),
  descricao: z.string().trim().min(20, "Descreva com mais detalhes (mín. 20 caracteres)").max(20000),
  autor_nome: partesArray,
  reu_nome: partesArray,
  valor_causa: z.number().nonnegative().nullable().optional(),
  sigilo: z.enum(["publico", "segredo_justica", "sigilo_absoluto"]).default("publico"),
});
export type ProcessoInput = z.infer<typeof processoSchema>;

/* ─── TCO ─── */
export const tcoSchema = z.object({
  autor_nome: nomeCompleto,
  autor_id_personagem: idPersonagem,
  natureza: z.string().trim().min(3, "Informe a natureza da ocorrência").max(200),
  local_fato: z.string().trim().min(3, "Informe o local").max(200),
  data_fato: z.string().min(1, "Informe a data do fato"),
  descricao: z.string().trim().min(20, "Descreva o fato com mais detalhes").max(20000),
});
export type TCOInput = z.infer<typeof tcoSchema>;

/* ─── Cartório (registro) ─── */
export const cartorioSchema = z.object({
  tipo: z.enum(
    ["procuracao", "certidao", "escritura", "reconhecimento_firma", "autenticacao", "outro"],
    { message: "Selecione o tipo" }
  ),
  descricao: z.string().trim().min(5, "Descrição obrigatória").max(2000),
  requerente_nome: nomeCompleto.optional(),
  partes_envolvidas: z.string().trim().max(5000).optional(),
});
export type CartorioInput = z.infer<typeof cartorioSchema>;

/* ─── Denúncia / Ouvidoria ─── */
export const denunciaSchema = z.object({
  categoria: z.string().trim().min(2, "Selecione a categoria"),
  descricao: z.string().trim().min(30, "Descreva com mais detalhes (mín. 30 caracteres)").max(5000),
  denunciante_nome: z.string().trim().max(120).optional(),
});
export type DenunciaInput = z.infer<typeof denunciaSchema>;

/* ─── Helper ─── */
/**
 * Executa parse e retorna a primeira mensagem de erro, ou null se ok.
 * ```ts
 * const err = validate(processoSchema, dados);
 * if (err) return toast.error(err);
 * ```
 */
export function validate<T extends z.ZodTypeAny>(schema: T, data: unknown): string | null {
  const r = schema.safeParse(data);
  if (r.success) return null;
  return r.error.issues[0]?.message ?? "Dados inválidos";
}

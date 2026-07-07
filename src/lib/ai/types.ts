/**
 * Contratos tipados de todas as operações de IA do sistema.
 * Cada tela usa apenas estes tipos — o provider (Gemini/OpenAI/etc) é intercambiável.
 */

/** Operações padronizadas do domínio jurídico + acadêmico. */
export type AIOperation =
  // Judicial
  | "gerar_despacho"
  | "gerar_sentenca"
  | "gerar_decisao"
  | "gerar_parecer_mp"
  | "gerar_mandado"
  | "gerar_certidao"
  | "gerar_oficio"
  | "gerar_alvara"
  | "resumir_processo"
  | "resumir_inquerito"
  | "classificar_documento"
  | "analisar_peticao"
  | "sugerir_fundamentacao"
  | "revisar_gramatica"
  | "assistente_juridico"
  | "chatbot_institucional"
  // Acadêmico (UNISP)
  | "gerar_prova"
  | "gerar_questoes"
  | "corrigir_prova"
  | "gerar_feedback_aluno"
  | "resumir_aula"
  | "criar_conteudo_academico"
  // Genérico
  | "custom";

export interface AIMessage {
  role: "user" | "model" | "system";
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  /** Chave estável para cachear a resposta. Se ausente, não cacheia. */
  cacheKey?: string;
  /** Ignora o cache mesmo se cacheKey vier preenchido. */
  bypassCache?: boolean;
  /** JSON schema simplificado — se presente, força o modelo a retornar JSON. */
  responseSchema?: Record<string, unknown>;
}

export interface AIRequest {
  operation: AIOperation;
  /** Prompt textual único OU messages (multi-turn). */
  prompt?: string;
  messages?: AIMessage[];
  options?: AIRequestOptions;
}

export interface AITokenUsage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AIResponse<T = string> {
  ok: boolean;
  data: T;
  /** JSON parseado quando responseSchema foi fornecido. */
  json?: unknown;
  model: string;
  provider: string;
  operation: AIOperation;
  usage?: AITokenUsage;
  cached: boolean;
  latencyMs: number;
  /** Preenchido apenas quando ok=false. */
  error?: { code: string; message: string; retriable: boolean };
}

/** Interface abstrata para permitir troca de provedor (OpenAI, Anthropic, etc). */
export interface AIProvider {
  readonly name: string;
  run(req: AIRequest): Promise<AIResponse>;
  stream?(req: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse>;
}

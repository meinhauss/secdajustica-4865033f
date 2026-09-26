/**
 * Configuração central do serviço de IA.
 * Alterações de modelo/parâmetros ficam aqui — não espalhe pelo código.
 */
export const AI_CONFIG = {
  provider: "gemini" as const,
  defaultModel: "gemini-3.6-flash",
  fallbackModel: "gemini-3.6-flash",
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  timeoutMs: 140_000,
  maxRetries: 2,
  retryBaseDelayMs: 800,
  cache: {
    enabled: true,
    ttlMs: 2 * 60 * 60 * 1000, // 2h — reduz chamadas repetidas
    maxEntries: 300,
  },
  safety: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
  ],
} as const;

export type AIConfig = typeof AI_CONFIG;

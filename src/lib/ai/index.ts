/**
 * Ponto de entrada único do módulo de IA.
 * Use sempre `ai.run(...)` — nunca importe geminiService diretamente nas telas.
 * Trocar de provedor no futuro = trocar apenas esta linha.
 */
import { geminiService } from "./geminiService";
import type { AIProvider, AIRequest, AIResponse } from "./types";

export const ai: AIProvider = geminiService;

/** Helper de conveniência para prompts simples de texto. */
export async function askAI(
  operation: AIRequest["operation"],
  prompt: string,
  options?: AIRequest["options"],
): Promise<AIResponse> {
  return ai.run({ operation, prompt, options });
}

export type { AIRequest, AIResponse, AIProvider } from "./types";
export { AI_CONFIG } from "./config";

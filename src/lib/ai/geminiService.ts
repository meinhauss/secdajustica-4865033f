/**
 * GeminiService (client-side).
 * Nunca chama a API do Google diretamente — sempre passa pela edge function 'gemini'.
 * Implementa AIProvider para permitir troca por outros provedores no futuro.
 */
import { supabase } from "@/integrations/supabase/client";
import { AI_CONFIG } from "./config";
import { cacheGet, cacheSet } from "./cache";
import type { AIProvider, AIRequest, AIResponse } from "./types";

class GeminiService implements AIProvider {
  readonly name = "gemini";

  async run(req: AIRequest): Promise<AIResponse> {
    const cacheKey = req.options?.cacheKey;
    if (cacheKey && !req.options?.bypassCache) {
      const hit = cacheGet(cacheKey);
      if (hit) return hit;
    }

    const started = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("gemini", {
        body: {
          operation: req.operation,
          prompt: req.prompt,
          messages: req.messages,
          options: {
            model: req.options?.model ?? AI_CONFIG.defaultModel,
            temperature: req.options?.temperature ?? AI_CONFIG.temperature,
            topP: req.options?.topP ?? AI_CONFIG.topP,
            topK: req.options?.topK ?? AI_CONFIG.topK,
            maxOutputTokens: req.options?.maxOutputTokens ?? AI_CONFIG.maxOutputTokens,
            systemInstruction: req.options?.systemInstruction,
            responseSchema: req.options?.responseSchema,
          },
        },
      });

      if (error) {
        console.error("[GeminiService]", error);
        return {
          ok: false,
          data: "",
          model: req.options?.model ?? AI_CONFIG.defaultModel,
          provider: this.name,
          operation: req.operation,
          cached: false,
          latencyMs: performance.now() - started,
          error: { code: "invoke_error", message: error.message, retriable: true },
        };
      }

      const resp: AIResponse = {
        ok: !!data?.ok,
        data: data?.data ?? "",
        json: data?.json,
        model: data?.model ?? AI_CONFIG.defaultModel,
        provider: this.name,
        operation: req.operation,
        usage: data?.usage,
        cached: false,
        latencyMs: performance.now() - started,
        error: data?.error,
      };

      if (resp.ok && cacheKey) cacheSet(cacheKey, resp);
      return resp;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[GeminiService] exception", message);
      return {
        ok: false,
        data: "",
        model: req.options?.model ?? AI_CONFIG.defaultModel,
        provider: this.name,
        operation: req.operation,
        cached: false,
        latencyMs: performance.now() - started,
        error: { code: "network_error", message, retriable: true },
      };
    }
  }
}

export const geminiService = new GeminiService();

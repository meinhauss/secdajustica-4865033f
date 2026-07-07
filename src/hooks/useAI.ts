import { useState } from "react";
import { ai } from "@/lib/ai";
import type { AIRequest, AIResponse } from "@/lib/ai/types";
import { SYSTEM_JURIDICO } from "@/lib/ai/prompts";
import { toast } from "sonner";

/**
 * Hook padronizado para chamar IA a partir de qualquer tela.
 * Cuida de loading, erro e toast.
 */
export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);

  const run = async (req: AIRequest): Promise<AIResponse> => {
    setLoading(true);
    setError(null);
    const merged: AIRequest = {
      ...req,
      options: {
        systemInstruction: SYSTEM_JURIDICO,
        ...req.options,
      },
    };
    const res = await ai.run(merged);
    setLoading(false);
    setLastResponse(res);
    if (!res.ok) {
      const msg = res.error?.message || "Falha ao consultar IA.";
      setError(msg);
      toast.error(msg);
    }
    return res;
  };

  return { run, loading, error, lastResponse };
}

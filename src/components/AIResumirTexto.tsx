import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS } from "@/lib/ai/prompts";

interface Props {
  texto: string;
  minChars?: number;
  cacheKey?: string;
}

/** Botão inline "TL;DR" que aparece só quando o texto é longo. */
export default function AIResumirTexto({ texto, minChars = 400, cacheKey }: Props) {
  const plain = (texto || "").replace(/<[^>]+>/g, " ").trim();
  const [aberto, setAberto] = useState(false);
  const [resumo, setResumo] = useState("");
  const { run, loading } = useAI();

  if (plain.length < minChars) return null;

  const gerar = async () => {
    setAberto(true);
    if (resumo) return;
    const res = await run({
      operation: "custom",
      prompt: PROMPTS.resumirTexto(plain),
      options: { cacheKey, maxOutputTokens: 512 },
    });
    if (res.ok) setResumo(res.data as string);
  };

  return (
    <div className="mt-2">
      {!aberto ? (
        <button
          type="button"
          onClick={gerar}
          className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Sparkles className="h-3 w-3" /> TL;DR com IA
        </button>
      ) : (
        <div className="text-xs bg-primary/5 border border-primary/20 rounded-lg p-2">
          <div className="flex items-center gap-1 font-semibold text-primary mb-1">
            <Sparkles className="h-3 w-3" /> Resumo
          </div>
          {loading ? (
            <div className="text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> gerando...
            </div>
          ) : (
            <p className="text-foreground whitespace-pre-wrap">{resumo}</p>
          )}
        </div>
      )}
    </div>
  );
}

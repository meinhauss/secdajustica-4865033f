import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS } from "@/lib/ai/prompts";

/**
 * Envolve qualquer bloco de texto. Ao selecionar 2+ palavras dentro dele,
 * mostra um botão flutuante "Explicar" que consulta o Gemini.
 */
export default function AIExplicarSelecao({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<{ termo: string; contexto: string; top: number; left: number } | null>(null);
  const [explicacao, setExplicacao] = useState<string>("");
  const { run, loading } = useAI();

  useEffect(() => {
    const onUp = () => {
      const s = window.getSelection?.();
      const text = s?.toString().trim() || "";
      if (!text || text.length < 3 || text.length > 120) { setSel(null); return; }
      if (!s || s.rangeCount === 0) return;
      const range = s.getRangeAt(0);
      if (!wrapRef.current?.contains(range.commonAncestorContainer)) { setSel(null); return; }
      const rect = range.getBoundingClientRect();
      const wrapRect = wrapRef.current.getBoundingClientRect();
      const contexto = range.commonAncestorContainer.textContent || "";
      setSel({
        termo: text,
        contexto,
        top: rect.bottom - wrapRect.top + 4,
        left: rect.left - wrapRect.left,
      });
      setExplicacao("");
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, []);

  const explicar = async () => {
    if (!sel) return;
    const res = await run({
      operation: "custom",
      prompt: PROMPTS.explicarTermo(sel.termo, sel.contexto),
      options: {
        cacheKey: `explicar:${sel.termo.toLowerCase()}`,
        maxOutputTokens: 300,
      },
    });
    if (res.ok) setExplicacao(res.data as string);
  };

  return (
    <div ref={wrapRef} className="relative">
      {children}
      {sel && (
        <div
          className="absolute z-40 max-w-xs rounded-lg border border-border bg-popover shadow-lg p-2 text-xs"
          style={{ top: sel.top, left: sel.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {!explicacao && !loading && (
            <button
              type="button"
              onClick={explicar}
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
            >
              <Sparkles className="h-3 w-3" /> Explicar "{sel.termo.slice(0, 30)}"
            </button>
          )}
          {loading && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> consultando...
            </span>
          )}
          {explicacao && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-primary inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {sel.termo}
                </span>
                <button type="button" onClick={() => setSel(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{explicacao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

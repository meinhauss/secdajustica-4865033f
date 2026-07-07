import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ClipboardList } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS } from "@/lib/ai/prompts";

interface Classificacao {
  tipo?: string;
  urgencia?: "baixa" | "media" | "alta";
  resumo?: string;
  pedidos?: string[];
  encaminhamento?: string;
}

export default function AIClassificarPeticao() {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [result, setResult] = useState<Classificacao | null>(null);
  const { run, loading } = useAI();

  const analisar = async () => {
    if (!texto.trim()) return;
    setResult(null);
    const res = await run({
      operation: "classificar_documento",
      prompt: PROMPTS.classificarPeticao(texto),
      options: {
        responseSchema: {
          type: "object",
          properties: {
            tipo: { type: "string" },
            urgencia: { type: "string" },
            resumo: { type: "string" },
            pedidos: { type: "array", items: { type: "string" } },
            encaminhamento: { type: "string" },
          },
        },
      },
    });
    if (res.ok) {
      const parsed = (res.json as Classificacao) || (() => {
        try { return JSON.parse(res.data as string) as Classificacao; } catch { return null; }
      })();
      if (parsed) setResult(parsed);
    }
  };

  const urgColor = result?.urgencia === "alta" ? "destructive" : result?.urgencia === "media" ? "default" : "secondary";

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
        <ClipboardList className="h-4 w-4 mr-1" /> Classificar petição
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Classificar petição avulsa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui o texto integral da petição..."
              className="w-full min-h-[180px] rounded-xl border border-border bg-background p-3 text-sm"
            />
            <Button className="w-full rounded-xl" onClick={analisar} disabled={loading || !texto.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analisando...</> : <><Sparkles className="h-4 w-4 mr-1" /> Analisar com IA</>}
            </Button>

            {result && (
              <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{result.tipo || "—"}</Badge>
                  {result.urgencia && <Badge variant={urgColor as any}>urgência: {result.urgencia}</Badge>}
                </div>
                {result.resumo && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Resumo</p>
                    <p className="text-sm">{result.resumo}</p>
                  </div>
                )}
                {result.pedidos && result.pedidos.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pedidos</p>
                    <ul className="text-sm list-disc pl-5">
                      {result.pedidos.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {result.encaminhamento && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Encaminhamento sugerido</p>
                    <p className="text-sm">{result.encaminhamento}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">Gerado por IA — confira antes de decidir.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

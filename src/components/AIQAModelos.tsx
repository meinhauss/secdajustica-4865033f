import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS_FASE4 } from "@/lib/ai/prompts";
import { toast } from "sonner";

interface Modelo {
  id: string;
  titulo: string;
  categoria?: string;
  descricao?: string;
}

interface Props {
  modelos: Modelo[];
  onSelect?: (id: string) => void;
}

export default function AIQAModelos({ modelos, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const { run, loading } = useAI();

  const perguntar = async () => {
    if (!pergunta.trim()) { toast.error("Descreva o que você precisa."); return; }
    setResultado(null);
    const res = await run({
      operation: "custom",
      prompt: PROMPTS_FASE4.qaModelos(pergunta, modelos),
      options: { responseSchema: { type: "object" }, temperature: 0.2 },
    });
    if (res.ok) {
      const json: any = res.json ?? (() => { try { return JSON.parse(res.data as string); } catch { return null; } })();
      setResultado(json);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4 mr-1" /> Qual modelo usar?
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Recomendador de Modelos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Ex.: preciso do modelo para intimar testemunha em audiência criminal..."
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              className="rounded-xl min-h-[80px]"
            />
            <div className="flex justify-end">
              <Button size="sm" className="rounded-xl" onClick={perguntar} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Recomendar
              </Button>
            </div>
            {loading && (
              <div className="py-6 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Analisando...
              </div>
            )}
            {resultado && !loading && (
              <div className="space-y-2">
                {(resultado.recomendacoes || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum modelo adequado encontrado.</p>
                ) : (
                  (resultado.recomendacoes || []).map((r: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => { onSelect?.(r.id); setOpen(false); }}
                      className="w-full text-left border border-border rounded-xl p-3 hover:bg-muted transition"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{r.titulo}</span>
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground">{r.porque}</p>
                    </button>
                  ))
                )}
                {resultado.observacao && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">{resultado.observacao}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS_FASE4 } from "@/lib/ai/prompts";
import { extrairNomes } from "@/lib/modelosVars";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onOpen?: (numero: string) => void;
}

export default function AIBuscaSemantica({ onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const { run, loading } = useAI();

  const buscar = async () => {
    if (!q.trim()) { toast.error("Descreva o que procura."); return; }
    setBuscando(true);
    setResultados([]);
    try {
      const { data } = await supabase
        .from("processos")
        .select("id,numero,classe,assunto,autor_nome,reu_nome,status")
        .limit(300);
      const candidatos = (data || []).map((p: any) => ({
        numero: p.numero,
        classe: p.classe,
        assunto: p.assunto,
        autor: extrairNomes(p.autor_nome),
        reu: extrairNomes(p.reu_nome),
        status: p.status,
      }));
      if (candidatos.length === 0) { toast.info("Nenhum processo disponível."); return; }
      const res = await run({
        operation: "custom",
        prompt: PROMPTS_FASE4.buscaSemanticaProcessos(q, candidatos),
        options: { responseSchema: { type: "object" }, temperature: 0.2 },
      });
      if (res.ok) {
        const json: any = res.json ?? (() => { try { return JSON.parse(res.data as string); } catch { return null; } })();
        setResultados(json?.resultados || []);
      }
    } finally {
      setBuscando(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4 mr-1" /> Busca semântica
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Busca semântica de processos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: acidentes de trânsito com vítima em avenida movimentada..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
                className="rounded-xl"
              />
              <Button size="sm" className="rounded-xl" onClick={buscar} disabled={loading || buscando}>
                {(loading || buscando) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>
            {(loading || buscando) && (
              <div className="py-8 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
              </div>
            )}
            {!loading && !buscando && resultados.length === 0 && q && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum resultado relevante.</p>
            )}
            <div className="space-y-2">
              {resultados.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { onOpen?.(r.numero); setOpen(false); }}
                  className="w-full text-left border border-border rounded-xl p-3 hover:bg-muted transition"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-mono text-xs">{r.numero}</span>
                    <span className="text-xs text-muted-foreground">Relevância: {r.relevancia}%</span>
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground">{r.motivo}</p>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

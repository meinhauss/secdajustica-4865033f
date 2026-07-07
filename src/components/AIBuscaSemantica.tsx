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
      // Pré-filtro por texto para reduzir a lista antes de mandar à IA.
      const termo = q.trim();
      let query = supabase
        .from("processos")
        .select("id,numero,classe,assunto,autor_nome,reu_nome,status")
        .limit(60);
      if (termo.length >= 3) {
        query = query.or(
          `assunto.ilike.%${termo}%,autor_nome.ilike.%${termo}%,reu_nome.ilike.%${termo}%,numero.ilike.%${termo}%`,
        );
      }
      let { data } = await query;
      // Fallback: se filtro não trouxe nada, pega os 60 mais recentes.
      if (!data || data.length === 0) {
        const r = await supabase
          .from("processos")
          .select("id,numero,classe,assunto,autor_nome,reu_nome,status")
          .order("created_at", { ascending: false })
          .limit(60);
        data = r.data || [];
      }
      const candidatos = (data || []).map((p: any) => ({
        numero: p.numero,
        classe: p.classe,
        assunto: (p.assunto || "").slice(0, 120),
        autor: extrairNomes(p.autor_nome).slice(0, 80),
        reu: extrairNomes(p.reu_nome).slice(0, 80),
        status: p.status,
      }));
      if (candidatos.length === 0) { toast.info("Nenhum processo disponível."); return; }
      const res = await run({
        operation: "custom",
        prompt: PROMPTS_FASE4.buscaSemanticaProcessos(termo, candidatos),
        options: { temperature: 0.2, maxOutputTokens: 2048 },
      });
      if (res.ok) {
        const raw = String(res.data || "");
        const match = raw.match(/\{[\s\S]*\}/);
        let json: any = null;
        try { json = match ? JSON.parse(match[0]) : JSON.parse(raw); } catch { json = null; }
        setResultados(json?.resultados || []);
        if (!json) toast.error("Não consegui interpretar o resultado. Tente refinar a busca.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha na busca.");
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

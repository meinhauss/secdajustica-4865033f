import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, RefreshCw, Check } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS } from "@/lib/ai/prompts";
import { extrairNomes } from "@/lib/modelosVars";

interface Props {
  tipoAto: string;
  tituloAto?: string;
  rascunhoAtual?: string;
  processo?: any;
  movimentacoes?: any[];
  onInsert: (texto: string) => void;
  label?: string;
}

export default function AISugerirDespacho({ tipoAto, tituloAto, rascunhoAtual, processo, movimentacoes, onInsert, label = "Sugerir com IA" }: Props) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [instrucao, setInstrucao] = useState("");
  const { run, loading } = useAI();

  const gerar = async (bypassCache = false) => {
    const res = await run({
      operation: "gerar_despacho",
      prompt: PROMPTS.sugerirDespacho({
        tipoAto,
        tituloAto,
        rascunhoAtual,
        instrucao: instrucao.trim() || undefined,
        numero: processo?.numero,
        classe: processo?.classe,
        assunto: processo?.assunto,
        autor: extrairNomes(processo?.autor_nome),
        reu: extrairNomes(processo?.reu_nome),
        status: processo?.status,
        movimentacoes: (movimentacoes || []).map((m) => ({ tipo: m.tipo, descricao: m.descricao })),
      }),
      options: {
        cacheKey: instrucao ? undefined : `despacho:${processo?.id}:${tipoAto}:${movimentacoes?.length ?? 0}`,
        bypassCache,
      },
    });
    if (res.ok) setTexto(res.data as string);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => { setOpen(true); if (!texto) gerar(); }}>
        <Sparkles className="h-4 w-4 mr-1" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Sugestão de {tituloAto || tipoAto}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Instrução opcional (ex: designar audiência de conciliação)" value={instrucao} onChange={(e) => setInstrucao(e.target.value)} className="rounded-xl" />
              <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => gerar(true)} disabled={loading}>
                <RefreshCw className="h-3 w-3 mr-1" /> Gerar
              </Button>
            </div>
            {loading ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
              </div>
            ) : texto ? (
              <>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className="w-full min-h-[300px] rounded-xl border border-border bg-background p-3 text-sm font-mono"
                />
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground">Gerado por IA — revise antes de usar.</p>
                  <Button size="sm" className="rounded-xl" onClick={() => { onInsert(texto); setOpen(false); }}>
                    <Check className="h-4 w-4 mr-1" /> Usar este texto
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem sugestão.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

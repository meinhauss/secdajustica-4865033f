import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS } from "@/lib/ai/prompts";
import { extrairNomes } from "@/lib/modelosVars";
import ReactMarkdown from "react-markdown";

interface Props {
  processo: any;
  movimentacoes?: any[];
}

export default function AIResumoProcesso({ processo, movimentacoes }: Props) {
  const [open, setOpen] = useState(false);
  const [resumo, setResumo] = useState<string>("");
  const { run, loading } = useAI();

  const gerar = async (bypassCache = false) => {
    const res = await run({
      operation: "resumir_processo",
      prompt: PROMPTS.resumirProcesso({
        numero: processo?.numero,
        classe: processo?.classe,
        assunto: processo?.assunto,
        autor: extrairNomes(processo?.autor_nome),
        reu: extrairNomes(processo?.reu_nome),
        status: processo?.status,
        movimentacoes: (movimentacoes || []).map((m) => ({
          tipo: m.tipo,
          descricao: m.descricao,
          data: m.created_at,
        })),
      }),
      options: {
        cacheKey: `resumo:${processo?.id}:${movimentacoes?.length ?? 0}`,
        bypassCache,
      },
    });
    if (res.ok) setResumo(res.data as string);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={() => { setOpen(true); if (!resumo) gerar(); }}
      >
        <Sparkles className="h-4 w-4 mr-1" /> Resumir com IA
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Resumo do processo
            </DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando resumo...
            </div>
          ) : resumo ? (
            <>
              <RichTextView html={resumo.replace(/\n/g, "<br/>")} />
              <div className="flex justify-end mt-3">
                <Button size="sm" variant="ghost" onClick={() => gerar(true)}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Regenerar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Gerado por IA — confira antes de utilizar.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem resumo.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

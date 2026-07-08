import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS } from "@/lib/ai/prompts";
import { toast } from "sonner";

interface Props {
  fundamentacao: string;
  dispositivo: string;
  classe?: string;
  assunto?: string;
  onGenerated: (ementa: string) => void;
}

/** Gera ementa a partir da fundamentação + dispositivo. Só habilita se ambos tiverem conteúdo real. */
export default function AIGerarEmenta({ fundamentacao, dispositivo, classe, assunto, onGenerated }: Props) {
  const { run, loading } = useAI();
  const stripLen = (s: string) => (s || "").replace(/<[^>]+>/g, " ").trim().length;
  const pronto = stripLen(fundamentacao) >= 80 && stripLen(dispositivo) >= 40;

  const gerar = async () => {
    if (!pronto) {
      toast.info("Complete a fundamentação e o dispositivo antes de gerar a ementa.");
      return;
    }
    const res = await run({
      operation: "gerar_ementa",
      prompt: PROMPTS.gerarEmenta({ fundamentacao, dispositivo, classe, assunto }),
      options: { temperature: 0.4 },
    });
    if (res.ok && res.data) {
      onGenerated(String(res.data).trim());
      toast.success("Ementa gerada.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-xl"
      onClick={gerar}
      disabled={loading || !pronto}
      title={pronto ? "Gerar ementa com IA" : "Preencha fundamentação e dispositivo primeiro"}
    >
      {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
      Gerar ementa
    </Button>
  );
}

import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS } from "@/lib/ai/prompts";
import { toast } from "sonner";

interface Props {
  /** Sentença como peça única (preferido). */
  sentenca?: string;
  /** Compat: partes separadas. */
  fundamentacao?: string;
  dispositivo?: string;
  classe?: string;
  assunto?: string;
  onGenerated: (ementa: string) => void;
}

/** Gera ementa a partir da sentença (ou fundamentação + dispositivo, no modo legado). */
export default function AIGerarEmenta({ sentenca, fundamentacao, dispositivo, classe, assunto, onGenerated }: Props) {
  const { run, loading } = useAI();
  const stripLen = (s?: string) => (s || "").replace(/<[^>]+>/g, " ").trim().length;
  const pronto = sentenca !== undefined
    ? stripLen(sentenca) >= 120
    : stripLen(fundamentacao) >= 80 && stripLen(dispositivo) >= 40;

  const gerar = async () => {
    if (!pronto) {
      toast.info("Escreva a sentença antes de gerar a ementa.");
      return;
    }
    const res = await run({
      operation: "gerar_sentenca",
      prompt: PROMPTS.gerarEmenta({ sentenca, fundamentacao, dispositivo, classe, assunto }),
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
      title={pronto ? "Gerar ementa com IA" : "Escreva a sentença primeiro"}
    >
      {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
      Gerar ementa
    </Button>
  );
}

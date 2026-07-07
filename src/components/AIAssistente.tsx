import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, Sparkles, Eraser } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS } from "@/lib/ai/prompts";
import { extrairNomes } from "@/lib/modelosVars";
import type { AIMessage } from "@/lib/ai/types";

interface Props {
  processo?: any;
  movimentacoes?: any[];
}

export default function AIAssistente({ processo, movimentacoes }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const { run, loading } = useAI();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const system = PROMPTS.assistenteSystem({
    numero: processo?.numero,
    classe: processo?.classe,
    assunto: processo?.assunto,
    autor: extrairNomes(processo?.autor_nome),
    reu: extrairNomes(processo?.reu_nome),
    status: processo?.status,
    movimentacoes: (movimentacoes || []).map((m: any) => ({ tipo: m.tipo, descricao: m.descricao })),
  });

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    const next: AIMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    const res = await run({
      operation: "assistente_juridico",
      messages: next,
      options: { systemInstruction: system, temperature: 0.4 },
    });
    if (res.ok) {
      setMessages([...next, { role: "model", content: res.data as string }]);
    }
  };

  const sugestoes = [
    "Qual o status atual e próximos passos?",
    "Existe algum prazo em curso?",
    "Faça um resumo objetivo para leigo.",
    "Há vícios processuais aparentes?",
  ];

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setOpen(true)}>
        <Bot className="h-4 w-4 mr-1" /> Assistente
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Assistente Jurídico
            </SheetTitle>
            {processo?.numero && (
              <p className="text-[11px] text-muted-foreground font-mono">Contexto: {processo.numero}</p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Pergunte sobre este processo. Sugestões:</p>
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="w-full text-left text-xs rounded-lg border border-border px-3 py-2 hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="rounded-xl px-3 py-2 bg-muted mr-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Pensando...
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border px-3 py-2 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Pergunte ao assistente..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                className="rounded-xl"
                disabled={loading}
              />
              <Button size="icon" className="rounded-xl shrink-0" onClick={send} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-muted-foreground">IA pode errar — confira antes de agir.</p>
              {messages.length > 0 && (
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setMessages([])}>
                  <Eraser className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

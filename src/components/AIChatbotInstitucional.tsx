import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Loader2, X } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS_FASE4 } from "@/lib/ai/prompts";
import type { AIMessage } from "@/lib/ai/types";

interface Props {
  comarca?: string;
}

export default function AIChatbotInstitucional({ comarca = "Comarca de Suzano" }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const { run, loading } = useAI();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const system = PROMPTS_FASE4.chatbotInstitucional(comarca);

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    const next: AIMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    const res = await run({
      operation: "chatbot_institucional",
      messages: next,
      options: { systemInstruction: system, temperature: 0.5 },
    });
    if (res.ok) setMessages([...next, { role: "model", content: res.data as string }]);
  };

  const sugestoes = [
    "Como consulto meu processo?",
    "Onde fica o cartório?",
    "Como fazer uma denúncia na Ouvidoria?",
    "Como encontrar um advogado gratuito?",
  ];

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-semibold text-sm">Atendimento Institucional</p>
              <p className="text-[10px] text-muted-foreground">{comarca}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Olá! Como posso ajudar?</p>
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
              <div key={i} className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary/10 ml-6" : "bg-muted mr-6"}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="rounded-xl px-3 py-2 bg-muted mr-6 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Digitando...
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-border p-2 flex gap-2">
            <Input
              placeholder="Digite sua dúvida..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
              disabled={loading}
              className="rounded-xl"
            />
            <Button size="icon" className="rounded-xl shrink-0" onClick={send} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

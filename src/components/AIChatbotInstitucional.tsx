import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Loader2, X, ArrowRight } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS_FASE4 } from "@/lib/ai/prompts";
import type { AIMessage } from "@/lib/ai/types";

export interface ChatbotDestino {
  id: string;
  label: string;
  desc?: string;
}

interface Props {
  comarca?: string;
  destinos?: ChatbotDestino[];
  onNavigate?: (id: string) => void;
}

// Destinos padrão da área autenticada
const DEFAULT_DESTINOS: ChatbotDestino[] = [
  { id: "dashboard", label: "Painel Geral" },
  { id: "processos", label: "Processos", desc: "consulta e gestão de processos judiciais" },
  { id: "meus-processos", label: "Meus Processos", desc: "processos em que o usuário é parte ou tem interesse" },
  { id: "audiencias", label: "Audiências" },
  { id: "cartorio", label: "Cartório Civil", desc: "certidões, procurações, registros" },
  { id: "oab", label: "Portal OAB", desc: "advogados, carteira, honorários" },
  { id: "mp", label: "Ministério Público", desc: "denúncias e ouvidoria interna" },
  { id: "tribunal", label: "Tribunal de Justiça" },
  { id: "magistrado", label: "Portal do Juiz" },
  { id: "jurisprudencia", label: "Jurisprudência" },
  { id: "concursos", label: "Concursos" },
  { id: "modelos", label: "Modelos de documento" },
  { id: "tco", label: "TCO", desc: "Termo Circunstanciado (polícia)" },
  { id: "jurados", label: "Tribunal do Júri" },
  { id: "meu-perfil", label: "Meu Perfil" },
];

interface ParsedMessage {
  text: string;
  actions: { id: string; label: string }[];
}

function parseMessage(raw: string): ParsedMessage {
  const actions: { id: string; label: string }[] = [];
  const re = /\[IR:([a-z0-9_-]+)\]\s*([^\n]*)/gi;
  const text = raw
    .replace(re, (_m, id: string, label: string) => {
      actions.push({ id: id.trim(), label: (label || id).trim() });
      return "";
    })
    .trim();
  return { text, actions };
}

export default function AIChatbotInstitucional({
  comarca = "Comarca de Suzano",
  destinos,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const { run, loading } = useAI();
  const endRef = useRef<HTMLDivElement>(null);

  const destinosFinal = destinos ?? DEFAULT_DESTINOS;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const system = useMemo(
    () => PROMPTS_FASE4.chatbotInstitucional(comarca, destinosFinal),
    [comarca, destinosFinal],
  );

  const send = async (override?: string) => {
    const q = (override ?? input).trim();
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
    "Como faço uma denúncia na Ouvidoria?",
    "Onde vejo os concursos abertos?",
    "Preciso de uma certidão do cartório",
  ];

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
          size="icon"
          aria-label="Abrir assistente Vade MeCum"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-semibold text-sm">Vade MeCum</p>
              <p className="text-[10px] text-muted-foreground">Atendente virtual · {comarca}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Oi! Sou o Vade MeCum 👋 Em que posso ajudar hoje?</p>
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left text-xs rounded-lg border border-border px-3 py-2 hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <div key={i} className="rounded-xl px-3 py-2 text-sm whitespace-pre-wrap bg-primary/10 ml-6">
                    {m.content}
                  </div>
                );
              }
              const { text, actions } = parseMessage(m.content);
              const validActions = actions.filter((a) => destinosFinal.some((d) => d.id === a.id));
              return (
                <div key={i} className="space-y-1.5 mr-6">
                  {text && (
                    <div className="rounded-xl px-3 py-2 text-sm whitespace-pre-wrap bg-muted">
                      {text}
                    </div>
                  )}
                  {validActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {validActions.map((a, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs rounded-lg"
                          onClick={() => {
                            if (onNavigate) {
                              onNavigate(a.id);
                              setOpen(false);
                            }
                          }}
                          disabled={!onNavigate}
                        >
                          {a.label} <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
            <Button size="icon" className="rounded-xl shrink-0" onClick={() => send()} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, X, ArrowRight } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { useAuth } from "@/hooks/useAuth";
import { PROMPTS_FASE4 } from "@/lib/ai/prompts";
import type { AIMessage } from "@/lib/ai/types";
import vadeAvatar from "@/assets/vade-mecum-avatar.png.asset.json";
import logoSjc from "@/assets/logo-sjc.jpg";

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

function parseMessage(raw: string) {
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

const BOT_NAME = "Vade MeCum";

export default function AIChatbotInstitucional({
  comarca = "Comarca de Suzano",
  destinos,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const { run, loading } = useAI();
  const { profile, user } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);

  const destinosFinal = destinos ?? DEFAULT_DESTINOS;

  const userName = user ? (profile?.nome_completo || "Você") : "Cidadão";
  const userAvatar = user ? profile?.avatar_url : logoSjc;
  const userInitial = (userName?.[0] || "C").toUpperCase();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  const BotAvatar = ({ size = 32 }: { size?: number }) => (
    <Avatar className="shrink-0" style={{ width: size, height: size }}>
      <AvatarImage src={vadeAvatar.url} alt={BOT_NAME} className="object-cover" />
      <AvatarFallback className="bg-primary text-primary-foreground text-xs">VM</AvatarFallback>
    </Avatar>
  );

  const UserAvatar = ({ size = 28 }: { size?: number }) => (
    <Avatar className="shrink-0" style={{ width: size, height: size }}>
      {userAvatar && <AvatarImage src={userAvatar} alt={userName} className="object-cover" />}
      <AvatarFallback className="bg-muted text-foreground text-[10px]">{userInitial}</AvatarFallback>
    </Avatar>
  );

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 rounded-full h-16 w-16 shadow-2xl z-50 overflow-hidden ring-2 ring-gold/50 hover:ring-gold transition-all hover:scale-105 bg-institutional"
          aria-label="Abrir assistente Vade MeCum"
        >
          <img src={vadeAvatar.url} alt="Vade MeCum" className="w-full h-full object-cover" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <BotAvatar size={36} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{BOT_NAME}</p>
              <p className="text-[10px] text-muted-foreground truncate">Atendente virtual · {comarca}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <BotAvatar />
                  <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-sm bg-muted">
                    Oi{profile?.nome_completo ? `, ${profile.nome_completo.split(" ")[0]}` : ""}! Sou o {BOT_NAME} 👋 Em que posso ajudar hoje?
                  </div>
                </div>
                <div className="pl-10 space-y-1.5">
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
              </div>
            )}

            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <div key={i} className="flex items-start gap-2 justify-end">
                    <div className="flex flex-col items-end gap-0.5 max-w-[80%]">
                      <span className="text-[10px] text-muted-foreground pr-1">{userName}</span>
                      <div className="rounded-2xl rounded-tr-sm px-3 py-2 text-sm whitespace-pre-wrap bg-primary/10">
                        {m.content}
                      </div>
                    </div>
                    <UserAvatar />
                  </div>
                );
              }
              const { text, actions } = parseMessage(m.content);
              const validActions = actions.filter((a) => destinosFinal.some((d) => d.id === a.id));
              return (
                <div key={i} className="flex items-start gap-2">
                  <BotAvatar />
                  <div className="flex flex-col gap-1.5 max-w-[80%]">
                    <span className="text-[10px] text-muted-foreground pl-1">{BOT_NAME}</span>
                    {text && (
                      <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-sm bg-muted prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1 prose-headings:text-sm prose-strong:text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
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
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2">
                <BotAvatar />
                <div className="rounded-2xl rounded-tl-sm px-3 py-2 bg-muted flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Digitando...
                </div>
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

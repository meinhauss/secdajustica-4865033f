/**
 * Painel lateral proativo. Escuta o bus e mostra dicas contextuais.
 * Pode ser oculto (persistido em localStorage: `assistente_hidden`).
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight, ChevronLeft, Trash2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeTips, dismissTip, clearTips, type AssistenteTip } from "@/lib/assistente/bus";
import { useAssistenteAdvogado } from "@/hooks/useAssistenteAdvogado";
import { useAssistenteMagistrado } from "@/hooks/useAssistenteMagistrado";
import { useAuth } from "@/hooks/useAuth";

const LS_KEY = "assistente_hidden";

function relTime(t: number): string {
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export default function AssistenteProativo() {
  const { user, roles } = useAuth();
  const [tips, setTips] = useState<AssistenteTip[]>([]);
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LS_KEY) === "1";
  });

  useEffect(() => subscribeTips(setTips), []);

  // Regras automáticas por cargo
  useAssistenteAdvogado(!hidden && !!user);
  useAssistenteMagistrado(!hidden && !!user);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    window.localStorage.setItem(LS_KEY, next ? "1" : "0");
  };

  if (!user) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggle}
        aria-label={hidden ? "Mostrar assistente" : "Ocultar assistente"}
        className="fixed z-40 right-0 top-1/2 -translate-y-1/2 bg-institutional hover:bg-institutional-light text-gold-light px-1.5 py-3 rounded-l-xl shadow-lg border border-r-0 border-gold/30"
      >
        {hidden ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {!hidden && (
          <motion.aside
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed z-30 right-0 top-16 bottom-0 w-80 bg-card border-l border-border shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-institutional text-gold-light">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">Assistente</span>
              </div>
              <div className="flex items-center gap-1">
                {tips.length > 0 && (
                  <button onClick={clearTips} className="p-1 rounded hover:bg-white/10" aria-label="Limpar dicas">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={toggle} className="p-1 rounded hover:bg-white/10" aria-label="Ocultar">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Nenhuma dica agora.</p>
                  <p className="text-[10px] mt-1 opacity-70">Dicas aparecerão conforme você trabalha.</p>
                </div>
              ) : (
                tips.map((t) => (
                  <div key={t.id} className="rounded-xl border border-border bg-background p-3 space-y-1 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{t.titulo}</p>
                      <button onClick={() => dismissTip(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground" aria-label="Dispensar">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{t.mensagem}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">{relTime(t.criadoEm)}</span>
                      {t.acao && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] rounded-lg" onClick={() => { t.acao!.run(); dismissTip(t.id); }}>
                          {t.acao.label}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-3 py-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                Cargo: {roles[0] || "—"} · Oculte pelo botão lateral
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

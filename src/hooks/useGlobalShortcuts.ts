import { useEffect } from "react";

/**
 * Atalhos de teclado globais estilo Gmail (sequência de duas teclas).
 * - g p → Meus Processos
 * - g d → Dashboard
 * - g h → Início
 * - g e → Estatísticas
 * - g m → Modelos
 * - n m → Nova movimentação (dispara evento 'shortcut:nova-movimentacao')
 * - ? → mostra painel de atalhos (dispara 'shortcut:show-help')
 */
export function useGlobalShortcuts(onNavigate: (section: string) => void) {
  useEffect(() => {
    let last = "";
    let lastAt = 0;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        target?.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      ) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        window.dispatchEvent(new CustomEvent("shortcut:show-help"));
        return;
      }

      const now = Date.now();
      const key = e.key.toLowerCase();

      if (now - lastAt > 1200) last = "";

      if (!last && (key === "g" || key === "n")) {
        last = key;
        lastAt = now;
        return;
      }

      if (last === "g") {
        const map: Record<string, string> = {
          p: "meus-processos",
          d: "dashboard",
          h: "dashboard",
          e: "estatisticas",
          m: "modelos",
          a: "audiencias",
          j: "jurisprudencia",
        };
        if (map[key]) {
          e.preventDefault();
          onNavigate(map[key]);
        }
        last = "";
        return;
      }

      if (last === "n") {
        if (key === "m") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("shortcut:nova-movimentacao"));
        }
        last = "";
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNavigate]);
}

export const SHORTCUTS_LIST: { keys: string; desc: string }[] = [
  { keys: "g p", desc: "Ir para Meus Processos" },
  { keys: "g d", desc: "Ir para Dashboard" },
  { keys: "g e", desc: "Ir para Estatísticas" },
  { keys: "g m", desc: "Ir para Modelos" },
  { keys: "g a", desc: "Ir para Audiências" },
  { keys: "g j", desc: "Ir para Jurisprudência" },
  { keys: "n m", desc: "Nova movimentação (dentro do processo)" },
  { keys: "?", desc: "Mostrar esta ajuda" },
];

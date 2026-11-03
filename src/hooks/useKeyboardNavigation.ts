import { useEffect, useRef } from "react";

/**
 * Mapa único de atalhos estilo Vim (sequência de duas teclas).
 * Usado tanto pelo CommandPalette quanto pelo listener global,
 * eliminando duplicação e inconsistências entre os dois sistemas.
 */
export const KEYBOARD_SHORTCUTS: Record<string, { section: string; desc: string }> = {
  "g d": { section: "dashboard", desc: "Ir para Dashboard" },
  "g p": { section: "processos", desc: "Ir para Processos" },
  "g m": { section: "meus-processos", desc: "Ir para Meus Processos" },
  "g a": { section: "audiencias", desc: "Ir para Audiências" },
  "g u": { section: "meu-perfil", desc: "Ir para Meu Perfil" },
  "g t": { section: "tribunal", desc: "Ir para Tribunal" },
  "g o": { section: "oab", desc: "Ir para OAB" },
  "g c": { section: "cartorio", desc: "Ir para Cartório" },
  "g x": { section: "tco", desc: "Ir para TCO" },
  "g n": { section: "concursos", desc: "Ir para Concursos" },
  "g e": { section: "estatisticas", desc: "Ir para Estatísticas" },
  "g j": { section: "jurisprudencia", desc: "Ir para Jurisprudência" },
};

/** Lista formatada para exibição no diálogo de ajuda */
export const SHORTCUTS_LIST: { keys: string; desc: string }[] = Object.entries(KEYBOARD_SHORTCUTS).map(
  ([keys, { desc }]) => ({ keys, desc })
);

/**
 * Hook que registra o listener global de atalhos de teclado.
 * Substitui useGlobalShortcuts e a lógica duplicada do CommandPalette.
 */
export function useKeyboardNavigation(onNavigate: (section: string) => void) {
  const bufferRef = useRef<{ key: string; ts: number } | null>(null);

  useEffect(() => {
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

      // ? → mostra ajuda
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        window.dispatchEvent(new CustomEvent("shortcut:show-help"));
        return;
      }

      const now = Date.now();
      const key = e.key.toLowerCase();

      // Reset buffer após 1.2s
      if (bufferRef.current && now - bufferRef.current.ts > 1200) {
        bufferRef.current = null;
      }

      // Primeira tecla da sequência
      if (!bufferRef.current && (key === "g" || key === "n")) {
        bufferRef.current = { key, ts: now };
        return;
      }

      // Sequência "g <letra>"
      if (bufferRef.current?.key === "g") {
        const combo = `g ${key}`;
        const match = KEYBOARD_SHORTCUTS[combo];
        bufferRef.current = null;
        if (match) {
          e.preventDefault();
          onNavigate(match.section);
        }
        return;
      }

      // Sequência "n m" → nova movimentação
      if (bufferRef.current?.key === "n" && key === "m") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcut:nova-movimentacao"));
        bufferRef.current = null;
        return;
      }

      // Tecla não reconhecida → limpa buffer
      bufferRef.current = null;
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNavigate]);
}

/** Retorna o shortcut associado a uma section, se existir */
export function getShortcutForSection(sectionId: string): string | undefined {
  for (const [combo, { section }] of Object.entries(KEYBOARD_SHORTCUTS)) {
    if (section === sectionId) return combo;
  }
  return undefined;
}
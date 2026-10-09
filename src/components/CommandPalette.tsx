import { useEffect, useRef, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import type { ComponentType } from "react";

export interface PaletteItem {
  id: string;
  label: string;
  /** Aceita ícones Lucide e componentes SVG próprios (ex.: AlgemaIcon). */
  icon: ComponentType<{ className?: string }>;
  shortcut?: string; // ex: "g p"
}

interface CommandPaletteProps {
  items: PaletteItem[];
  onSelect: (id: string) => void;
}

/**
 * Paleta de comandos global.
 * - Abrir: ⌘K / Ctrl+K
 * - Sequência estilo Vim: `g` + letra (ex: `g p` → Processos, `g d` → Dashboard)
 *   O primeiro item com `shortcut` que casar é ativado.
 */
export default function CommandPalette({ items, onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const bufferRef = useRef<{ key: string; ts: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // ⌘K / Ctrl+K → abre paleta (ignora se já digitando em input... mas cmd+k é intencional)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      // Sequência "g <letra>"
      const now = Date.now();
      if (e.key.toLowerCase() === "g") {
        bufferRef.current = { key: "g", ts: now };
        return;
      }
      if (bufferRef.current?.key === "g" && now - bufferRef.current.ts < 1200) {
        const combo = `g ${e.key.toLowerCase()}`;
        const match = items.find((i) => i.shortcut === combo);
        bufferRef.current = null;
        if (match) {
          e.preventDefault();
          onSelect(match.id);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, onSelect]);

  const handlePick = (id: string) => {
    setOpen(false);
    onSelect(id);
  };

  const withShortcut = items.filter((i) => i.shortcut);
  const rest = items.filter((i) => !i.shortcut);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar seção, ação ou atalho..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        {withShortcut.length > 0 && (
          <CommandGroup heading="Atalhos">
            {withShortcut.map((item) => (
              <CommandItem key={item.id} onSelect={() => handlePick(item.id)}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                <kbd className="ml-auto text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded border border-border">
                  {item.shortcut}
                </kbd>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {rest.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navegação">
              {rest.map((item) => (
                <CommandItem key={item.id} onSelect={() => handlePick(item.id)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

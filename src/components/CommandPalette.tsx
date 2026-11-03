import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import type { ComponentType } from "react";
import { getShortcutForSection } from "@/hooks/useKeyboardNavigation";

export interface PaletteItem {
  id: string;
  label: string;
  /** Aceita ícones Lucide e componentes SVG próprios (ex.: AlgemaIcon). */
  icon: ComponentType<{ className?: string }>;
  shortcut?: string;
}

interface CommandPaletteProps {
  items: PaletteItem[];
  onSelect: (id: string) => void;
}

/**
 * Paleta de comandos global.
 * - Abrir: ⌘K / Ctrl+K
 * - Atalhos são resolvidos pelo hook useKeyboardNavigation (mapa único).
 *   Este componente apenas exibe os atalhos na UI — não duplica a lógica.
 */
export default function CommandPalette({ items, onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handlePick = (id: string) => {
    setOpen(false);
    onSelect(id);
  };

  // Enriquece itens com atalhos do mapa centralizado
  const enrichedItems = items.map((item) => ({
    ...item,
    shortcut: item.shortcut ?? getShortcutForSection(item.id),
  }));

  const withShortcut = enrichedItems.filter((i) => i.shortcut);
  const rest = enrichedItems.filter((i) => !i.shortcut);

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

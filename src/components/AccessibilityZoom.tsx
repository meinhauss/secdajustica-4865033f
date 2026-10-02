import { useEffect, useState } from "react";
import { Accessibility, ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";

const KEY = "a11y-zoom";
const MIN = 80;
const MAX = 150;
const STEP = 10;

export default function AccessibilityZoom() {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(() => Number(localStorage.getItem(KEY)) || 100);

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoom}%`;
    localStorage.setItem(KEY, String(zoom));
  }, [zoom]);

  const btn = "h-11 w-11 flex items-center justify-center rounded-full bg-card text-foreground border border-border shadow-lg hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="fixed right-3 bottom-24 lg:bottom-6 z-[60] flex flex-col items-end gap-2 print:hidden">
      {open && (
        <div role="group" aria-label="Ajuste de tamanho do texto" className="flex flex-col items-center gap-2 rounded-2xl bg-card/95 backdrop-blur p-2 border border-border shadow-xl">
          <button className={btn} aria-label="Aumentar zoom" disabled={zoom >= MAX} onClick={() => setZoom((z) => Math.min(MAX, z + STEP))}><ZoomIn className="h-5 w-5" /></button>
          <span className="text-xs font-semibold text-foreground" aria-live="polite">{zoom}%</span>
          <button className={btn} aria-label="Diminuir zoom" disabled={zoom <= MIN} onClick={() => setZoom((z) => Math.max(MIN, z - STEP))}><ZoomOut className="h-5 w-5" /></button>
          <button className={btn} aria-label="Restaurar tamanho padrão" onClick={() => setZoom(100)}><RotateCcw className="h-4 w-4" /></button>
        </div>
      )}
      <button
        className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={open ? "Fechar acessibilidade" : "Abrir acessibilidade (zoom)"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-5 w-5" /> : <Accessibility className="h-6 w-6" />}
      </button>
    </div>
  );
}

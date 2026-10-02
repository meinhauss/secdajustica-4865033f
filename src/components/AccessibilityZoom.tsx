import { useEffect, useRef, useState } from "react";
import { Accessibility, ZoomIn, ZoomOut, RotateCcw, X, EyeOff, GripVertical } from "lucide-react";

const KEY = "a11y-zoom";
const POS_KEY = "a11y-pos";
const HIDE_KEY = "a11y-hidden";
const MIN = 80;
const MAX = 150;
const STEP = 10;

type Pos = { x: number; y: number } | null;

function loadPos(): Pos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === "number" && typeof p?.y === "number") return p;
  } catch { /* ignore */ }
  return null;
}

function clampPos(p: { x: number; y: number }) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.min(Math.max(0, p.x), Math.max(0, w - 56)),
    y: Math.min(Math.max(0, p.y), Math.max(0, h - 56)),
  };
}

export default function AccessibilityZoom() {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(() => Number(localStorage.getItem(KEY)) || 100);
  const [pos, setPos] = useState<Pos>(() => loadPos());
  const [hidden, setHidden] = useState<boolean>(() => localStorage.getItem(HIDE_KEY) === "1");
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoom}%`;
    localStorage.setItem(KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }, [pos]);

  useEffect(() => {
    localStorage.setItem(HIDE_KEY, hidden ? "1" : "0");
  }, [hidden]);

  // Mantém o botão dentro da tela ao redimensionar/girar o aparelho.
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampPos(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // ignora micro-movimento (clique)
    d.moved = true;
    setPos(clampPos({ x: d.baseX + dx, y: d.baseY + dy }));
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) setOpen((o) => !o); // foi um clique, não um arrasto
  };

  const btn = "h-11 w-11 flex items-center justify-center rounded-full bg-card text-foreground border border-border shadow-lg hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  // Estado escondido: aba discreta na borda esquerda para reexibir.
  if (hidden) {
    return (
      <button
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[60] h-16 w-5 flex items-center justify-center rounded-r-full bg-primary/70 text-primary-foreground shadow-lg hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
        aria-label="Mostrar botão de acessibilidade"
        title="Mostrar acessibilidade"
        onClick={() => setHidden(false)}
      >
        <Accessibility className="h-3.5 w-3.5" />
      </button>
    );
  }

  // Altura aproximada do painel aberto (5 botões de 44px + espaços + padding).
  const PANEL_H = 300;
  // O painel abre ACIMA do botão; ao abrir, sobe o container para que o
  // botão (e o painel) continuem dentro da tela, mesmo perto da borda inferior.
  const style: React.CSSProperties = pos
    ? {
        left: pos.x,
        top: Math.max(8, Math.min(pos.y - (open ? PANEL_H : 0), window.innerHeight - 56 - (open ? PANEL_H : 0))),
      }
    : { bottom: "6rem" };

  return (
    <div
      ref={rootRef}
      style={style}
      className={`fixed z-[60] flex flex-col items-start gap-2 print:hidden ${pos ? "" : "left-3 lg:left-[19rem] lg:bottom-6"}`}
    >
      {open && (
        <div role="group" aria-label="Ajuste de tamanho do texto" className="flex flex-col items-center gap-2 rounded-2xl bg-card/95 backdrop-blur p-2 border border-border shadow-xl">
          <button className={btn} aria-label="Aumentar zoom" disabled={zoom >= MAX} onClick={() => setZoom((z) => Math.min(MAX, z + STEP))}><ZoomIn className="h-5 w-5" /></button>
          <span className="text-xs font-semibold text-foreground" aria-live="polite">{zoom}%</span>
          <button className={btn} aria-label="Diminuir zoom" disabled={zoom <= MIN} onClick={() => setZoom((z) => Math.max(MIN, z - STEP))}><ZoomOut className="h-5 w-5" /></button>
          <button className={btn} aria-label="Restaurar tamanho padrão" onClick={() => setZoom(100)}><RotateCcw className="h-4 w-4" /></button>
          <button className={btn} aria-label="Esconder botão de acessibilidade" title="Esconder (reexiba pela aba na borda da tela)" onClick={() => { setHidden(true); setOpen(false); }}><EyeOff className="h-4 w-4" /></button>
        </div>
      )}
      <button
        className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-grab active:cursor-grabbing touch-none select-none"
        aria-label={open ? "Fechar acessibilidade" : "Abrir acessibilidade (zoom). Arraste para mover."}
        aria-expanded={open}
        title="Clique para abrir · arraste para mover"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        {open ? <X className="h-5 w-5" /> : <Accessibility className="h-6 w-6" />}
        {!open && <GripVertical className="h-3 w-3 absolute -right-0.5 -top-0.5 opacity-70" />}
      </button>
    </div>
  );
}

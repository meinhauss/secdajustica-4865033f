/**
 * Assistente proativo — barramento simples de eventos + dicas.
 * Componentes emitem eventos ("despacho_criado", "peticao_recebida", ...) via `emitTip`
 * e o painel lateral (AssistenteProativo) consome. Estado é apenas em memória (por sessão).
 */
import { toast } from "sonner";

export interface AssistenteTip {
  id: string;
  titulo: string;
  mensagem: string;
  criadoEm: number;
  cargo?: string;
  processoId?: string | null;
  acao?: { label: string; run: () => void } | null;
  severity?: "info" | "success" | "warning";
}

type Listener = (tips: AssistenteTip[]) => void;

let tips: AssistenteTip[] = [];
const listeners = new Set<Listener>();

function notify() {
  const snapshot = [...tips];
  listeners.forEach((l) => l(snapshot));
}

export function subscribeTips(l: Listener): () => void {
  listeners.add(l);
  l([...tips]);
  return () => { listeners.delete(l); };
}

export function emitTip(t: Omit<AssistenteTip, "id" | "criadoEm"> & { id?: string }): AssistenteTip {
  const id = t.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  // Dedup by id
  if (tips.some((x) => x.id === id)) return tips.find((x) => x.id === id)!;
  const tip: AssistenteTip = { ...t, id, criadoEm: Date.now() };
  tips = [tip, ...tips].slice(0, 30);
  toast(t.titulo, {
    description: t.mensagem,
    action: t.acao ? { label: t.acao.label, onClick: () => t.acao!.run() } : undefined,
  });
  notify();
  return tip;
}

export function dismissTip(id: string) {
  tips = tips.filter((t) => t.id !== id);
  notify();
}

export function clearTips() {
  tips = [];
  notify();
}

// ── Regras contextuais ─────────────────────────────────────────
/** Analisa o conteúdo de um despacho recém-proferido e sugere próximas ações. */
export function analisarDespacho(params: {
  conteudo: string;
  processoId?: string | null;
  onEmitirAtoCartorio?: (sugestao: string) => void;
}) {
  const txt = params.conteudo.toLowerCase();
  const sugestoes: string[] = [];
  if (/intim[ea]|intimem-se|intime-se/.test(txt)) sugestoes.push("emitir intimação");
  if (/cite-se|cita[çc][ãa]o/.test(txt)) sugestoes.push("emitir citação");
  if (/expe[çc]a-se\s+mandado|mandado\s+de/.test(txt)) sugestoes.push("expedir mandado");
  if (/arquive-se|arquivamento/.test(txt)) sugestoes.push("registrar arquivamento");
  if (/audi[êe]ncia/.test(txt)) sugestoes.push("designar audiência");

  if (!sugestoes.length) return;
  emitTip({
    titulo: "Sugestão do assistente",
    mensagem: `Detectei no seu despacho: "${sugestoes.join(", ")}". Deseja que o cartório execute automaticamente?`,
    processoId: params.processoId,
    severity: "info",
    acao: params.onEmitirAtoCartorio
      ? { label: "Abrir cartório", run: () => params.onEmitirAtoCartorio!(sugestoes[0]) }
      : null,
  });
}

/**
 * Regras proativas para advogados: detecta novas movimentações em processos onde o
 * usuário atua e sugere ações (contestação, réplica, etc.).
 * Poll leve a cada 90s. Dedup via localStorage.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { emitTip } from "@/lib/assistente/bus";

const LS_SEEN = "assistente_adv_seen";
const POLL_MS = 90_000;

const ROLES_ADVOGADO = ["advogado", "presidente_oab", "bacharel_direito"];

function getSeen(): Record<string, true> {
  try { return JSON.parse(window.localStorage.getItem(LS_SEEN) || "{}"); } catch { return {}; }
}
function markSeen(ids: string[]) {
  const s = getSeen();
  ids.forEach((id) => { s[id] = true; });
  window.localStorage.setItem(LS_SEEN, JSON.stringify(s));
}

export function useAssistenteAdvogado(enabled: boolean) {
  const { user, roles, profile } = useAuth();
  const timerRef = useRef<number | null>(null);
  const isAdv = roles.some((r) => ROLES_ADVOGADO.includes(r));

  useEffect(() => {
    if (!enabled || !user || !isAdv) return;

    const check = async () => {
      const idPers = profile?.id_personagem;
      if (!idPers) return;

      // processos onde o usuário aparece nas partes (busca por id_personagem no JSON)
      const { data: procs } = await supabase
        .from("processos")
        .select("id, numero, autor_nome, reu_nome")
        .or(`autor_nome.ilike.%${idPers}%,reu_nome.ilike.%${idPers}%`)
        .limit(50);
      if (!procs?.length) return;

      const ids = procs.map((p: any) => p.id);
      const { data: movs } = await supabase
        .from("movimentacoes")
        .select("id, processo_id, tipo, descricao, created_at")
        .in("processo_id", ids)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!movs?.length) return;

      const seen = getSeen();
      const novos = movs.filter((m: any) => !seen[m.id]);
      if (!novos.length) return;

      const toMark: string[] = [];
      novos.forEach((m: any) => {
        toMark.push(m.id);
        const proc = procs.find((p: any) => p.id === m.processo_id);
        const desc = String(m.descricao || "").toLowerCase();
        if (/intim|cite-se|contesta/.test(desc)) {
          emitTip({
            id: `adv-${m.id}`,
            titulo: "Nova intimação no seu processo",
            mensagem: `Processo ${proc?.numero || ""}: você foi intimado. Quer dicas para elaborar a peça?`,
            processoId: m.processo_id,
            severity: "warning",
            acao: {
              label: "Ver processo",
              run: () => { window.dispatchEvent(new CustomEvent("nav:processo", { detail: { id: m.processo_id } })); },
            },
          });
        }
      });
      markSeen(toMark);
    };

    check();
    timerRef.current = window.setInterval(check, POLL_MS);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [enabled, user, isAdv, profile?.id_personagem]);
}

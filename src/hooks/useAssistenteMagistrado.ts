/**
 * Regras proativas para magistrados: detecta processos parados aguardando decisão
 * ou movimentações recentes das partes que ainda não foram apreciadas.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { emitTip } from "@/lib/assistente/bus";

const LS_SEEN = "assistente_mag_seen";
const POLL_MS = 120_000;

const ROLES_MAG = ["magistrado", "desembargador", "presidente_tribunal"];

function getSeen(): Record<string, true> {
  try { return JSON.parse(window.localStorage.getItem(LS_SEEN) || "{}"); } catch { return {}; }
}
function markSeen(ids: string[]) {
  const s = getSeen();
  ids.forEach((id) => { s[id] = true; });
  window.localStorage.setItem(LS_SEEN, JSON.stringify(s));
}

export function useAssistenteMagistrado(enabled: boolean) {
  const { user, roles } = useAuth();
  const timerRef = useRef<number | null>(null);
  const isMag = roles.some((r) => ROLES_MAG.includes(r));

  useEffect(() => {
    if (!enabled || !user || !isMag) return;

    const check = async () => {
      const { data: procs } = await supabase
        .from("processos")
        .select("id, numero, status, juiz_id")
        .eq("juiz_id", user.id)
        .in("status", ["em_andamento", "concluso"])
        .limit(50);
      if (!procs?.length) return;

      const ids = procs.map((p: any) => p.id);
      const { data: movs } = await supabase
        .from("movimentacoes")
        .select("id, processo_id, tipo, descricao, created_at")
        .in("processo_id", ids)
        .in("tipo", ["peticao", "peticao_intercorrente", "contestacao", "manifestacao"])
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
        emitTip({
          id: `mag-${m.id}`,
          titulo: "Petição aguardando despacho",
          mensagem: `Processo ${proc?.numero || ""} tem nova petição das partes. Deseja proferir despacho agora?`,
          processoId: m.processo_id,
          severity: "info",
          acao: {
            label: "Abrir",
            run: () => { window.dispatchEvent(new CustomEvent("nav:processo", { detail: { id: m.processo_id } })); },
          },
        });
      });
      markSeen(toMark);
    };

    check();
    timerRef.current = window.setInterval(check, POLL_MS);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [enabled, user, isMag]);
}

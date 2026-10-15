import { supabase } from "@/integrations/supabase/client";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/r2-files`;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export async function uploadArquivoProcesso(file: File, processoId: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("processo_id", processoId);
  const r = await fetch(`${FN_URL}?action=upload`, { method: "POST", headers: await authHeaders(), body: fd });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || "Falha no envio do arquivo");
  return body.url as string;
}

export async function uploadArquivoAnexo(file: File, contexto: "cartorio" | "ouvidoria"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("contexto", contexto);
  const r = await fetch(`${FN_URL}?action=upload`, { method: "POST", headers: await authHeaders(), body: fd });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || "Falha no envio do arquivo");
  return body.url as string;
}

export async function abrirArquivoR2(ref: string) {
  const win = window.open("", "_blank");
  try {
    const r = await fetch(`${FN_URL}?action=view&ref=${encodeURIComponent(ref)}`, { headers: await authHeaders() });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || "Falha ao abrir");
    if (win) win.location.href = body.url; else window.location.href = body.url;
  } catch (e) {
    win?.close();
    alert((e as Error).message);
  }
}

/** Intercepta cliques em qualquer link r2:// (inclusive dentro de textos formatados). */
export function installR2LinkHandler() {
  document.addEventListener("click", (ev) => {
    const a = (ev.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
    const href = a?.getAttribute("href");
    if (href?.startsWith("r2://")) {
      ev.preventDefault();
      ev.stopPropagation();
      abrirArquivoR2(href);
    }
  }, true);
}

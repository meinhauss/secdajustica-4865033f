import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Public read-only JSON feed for the Pearson law firm. Protected by PEARSON_API_TOKEN;
// lawyers are identified by OAB numbers or character IDs listed in PEARSON_ADVOGADOS.
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });

const STATUS: Record<string, string> = {
  novo: "Criado", em_andamento: "Em andamento", concluso: "Concluso", sentenciado: "Sentenciado",
  arquivado: "Finalizado", suspenso: "Suspenso", prescrito: "Prescrito",
};

const safeEq = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};
const norm = (s: string) => s.replace(/\D/g, "").replace(/^0+/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Método não permitido" }, 405);
  const expected = Deno.env.get("PEARSON_API_TOKEN") ?? "";
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!expected || !token || token.length > 256 || !safeEq(token, expected)) return json({ error: "Token inválido" }, 401);

  const lista = (Deno.env.get("PEARSON_ADVOGADOS") ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  if (!lista.length) return json({ error: "Nenhum advogado da Pearson configurado" }, 500);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: perfis }, { data: carteiras }] = await Promise.all([
    sb.from("profiles").select("user_id, nome_completo, oab_numero, id_personagem"),
    sb.from("carteiras_oab").select("user_id, numero_oab, nome_completo"),
  ]);
  const alvosOab = new Set(lista.map(norm).filter(Boolean));
  const alvosId = new Set(lista.map((s) => s.toLowerCase()));
  const adv = new Map<string, { nome: string; oab: string | null }>();
  for (const c of carteiras ?? []) if (alvosOab.has(norm(c.numero_oab))) adv.set(c.user_id, { nome: c.nome_completo, oab: c.numero_oab });
  for (const p of perfis ?? []) {
    const hit = (p.oab_numero && alvosOab.has(norm(p.oab_numero))) || (p.id_personagem && alvosId.has(p.id_personagem.toLowerCase()));
    if (hit || adv.has(p.user_id)) adv.set(p.user_id, { nome: p.nome_completo, oab: adv.get(p.user_id)?.oab ?? p.oab_numero });
  }
  const ids = [...adv.keys()];
  if (!ids.length) return json({ escritorio: "Pearson", gerado_em: new Date().toISOString(), resumo: { total: 0 }, processos: [] });

  const lst = ids.join(",");
  const { data: procs, error } = await sb.from("processos")
    .select("id, numero, classe, status, assunto, autor_nome, reu_nome, vara, instancia, sigilo, advogado_autor_id, advogado_reu_id, created_at, updated_at")
    .or(`advogado_autor_id.in.(${lst}),advogado_reu_id.in.(${lst})`)
    .order("updated_at", { ascending: false }).limit(1000);
  if (error) return json({ error: "Falha ao consultar processos" }, 500);

  const pids = (procs ?? []).map((p) => p.id);
  const ultima = new Map<string, { tipo: string; descricao: string; data: string }>();
  for (let i = 0; i < pids.length; i += 100) {
    const { data: movs } = await sb.from("movimentacoes").select("processo_id, tipo, descricao, created_at")
      .in("processo_id", pids.slice(i, i + 100)).order("created_at", { ascending: false });
    for (const m of movs ?? []) if (!ultima.has(m.processo_id)) ultima.set(m.processo_id, { tipo: m.tipo, descricao: m.descricao, data: m.created_at });
  }

  const resumo: Record<string, number> = { total: 0 };
  const processos = (procs ?? []).map((p) => {
    const ladoAutor = p.advogado_autor_id && adv.has(p.advogado_autor_id);
    const a = adv.get(ladoAutor ? p.advogado_autor_id! : p.advogado_reu_id!)!;
    const status = STATUS[p.status] ?? p.status;
    resumo.total++; resumo[status] = (resumo[status] ?? 0) + 1;
    const sigiloso = p.sigilo && p.sigilo !== "publico";
    const mov = ultima.get(p.id);
    return {
      numero: p.numero, status, classe: p.classe, assunto: sigiloso ? "Sigiloso" : p.assunto,
      cliente: ladoAutor ? p.autor_nome : p.reu_nome, polo: ladoAutor ? "Autor" : "Réu",
      parte_contraria: sigiloso ? "Sigiloso" : (ladoAutor ? p.reu_nome : p.autor_nome),
      advogado_responsavel: a.nome, oab: a.oab, vara: p.vara, instancia: p.instancia, sigiloso: !!sigiloso,
      criado_em: p.created_at, atualizado_em: p.updated_at,
      ultima_movimentacao: mov ? { tipo: mov.tipo, descricao: sigiloso ? "Sigilosa" : mov.descricao.slice(0, 500), data: mov.data } : null,
    };
  });
  return json({ escritorio: "Pearson", gerado_em: new Date().toISOString(), resumo, processos });
});

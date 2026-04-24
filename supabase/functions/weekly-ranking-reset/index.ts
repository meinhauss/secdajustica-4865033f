import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    // Calculate last Friday (start of current week) — Brasília time
    const brt = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dow = brt.getDay();
    const daysBack = dow >= 5 ? dow - 5 : dow + 2;
    const lastFriday = new Date(brt);
    lastFriday.setDate(brt.getDate() - daysBack);
    lastFriday.setHours(0, 0, 0, 0);

    const semanaInicio = lastFriday.toISOString();
    const semanaFim = now.toISOString();

    const rankings = [
      { tipo: "magistrado", rpc: "get_magistrado_ranking" },
      { tipo: "promotor", rpc: "get_promotor_ranking" },
      { tipo: "advogado", rpc: "get_advogado_ranking" },
    ];

    const results: string[] = [];

    for (const r of rankings) {
      const { data, error } = await supabase.rpc(r.rpc);
      if (error) {
        results.push(`${r.tipo}: error - ${error.message}`);
        continue;
      }
      const list = ((data as any[]) || []).filter((x) => Number(x.score) > 0).slice(0, 3);
      if (list.length === 0) {
        results.push(`${r.tipo}: nenhum destaque (sem pontuação)`);
        continue;
      }
      const rows = list.map((top, idx) => ({
        tipo_ranking: r.tipo,
        user_id: top.user_id,
        nome_completo: top.nome_completo,
        avatar_url: top.avatar_url || top.foto_url || null,
        id_personagem: top.id_personagem || null,
        score: Number(top.score),
        posicao: idx + 1,
        semana_inicio: semanaInicio,
        semana_fim: semanaFim,
      }));
      await supabase.from("ranking_destaques").insert(rows);
      results.push(`${r.tipo}: top ${rows.length} salvos`);
    }

    return new Response(JSON.stringify({ success: true, destaques: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

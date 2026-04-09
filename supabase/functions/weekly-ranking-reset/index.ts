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
    // Calculate last Friday (start of current week)
    const dow = now.getUTCDay();
    const daysBack = dow >= 5 ? dow - 5 : dow + 2;
    const lastFriday = new Date(now);
    lastFriday.setUTCDate(now.getUTCDate() - daysBack);
    lastFriday.setUTCHours(0, 0, 0, 0);

    const semanaInicio = lastFriday.toISOString();
    const semanaFim = now.toISOString();

    // Get current rankings before they reset (next call to get_last_friday will return today = new friday)
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
      const list = (data as any[]) || [];
      if (list.length > 0 && Number(list[0].score) > 0) {
        const top = list[0];
        await supabase.from("ranking_destaques").insert({
          tipo_ranking: r.tipo,
          user_id: top.user_id,
          nome_completo: top.nome_completo,
          avatar_url: top.avatar_url || null,
          id_personagem: top.id_personagem || null,
          score: Number(top.score),
          semana_inicio: semanaInicio,
          semana_fim: semanaFim,
        });
        results.push(`${r.tipo}: ${top.nome_completo} (${top.score} pts)`);
      } else {
        results.push(`${r.tipo}: nenhum destaque (sem pontuação)`);
      }
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

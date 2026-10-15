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
    // Brasília time
    const brt = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dow = brt.getDay();
    // Friday that just ended (start of the week being closed = previous Friday from "now")
    // When invoked at Fri 00:00 BRT, this returns the Friday 7 days ago.
    const daysBackToPrevFriday = dow >= 5 ? dow - 5 + 7 : dow + 2;
    const semanaInicioDate = new Date(brt);
    semanaInicioDate.setDate(brt.getDate() - daysBackToPrevFriday);
    semanaInicioDate.setHours(0, 0, 0, 0);

    const semanaInicio = semanaInicioDate.toISOString();
    const semanaFim = now.toISOString();

    // 1) Cleanup destaques older than 7 days (keep only 1 week of backup)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: cleanupError } = await supabase
      .from("ranking_destaques")
      .delete()
      .lt("created_at", sevenDaysAgo);
    if (cleanupError) {
      console.error("Cleanup error:", cleanupError.message);
    }

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
            const uniqueByUser = new Map<string, any>();
      for (const item of ((data as any[]) || []).filter((x) => Number(x.score) > 0)) {
        if (!item.user_id) continue;
        const current = uniqueByUser.get(item.user_id);
        if (!current || Number(item.score) > Number(current.score)) uniqueByUser.set(item.user_id, item);
      }
      const list = Array.from(uniqueByUser.values()).slice(0, 3);
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
            const { error: deleteWeekError } = await supabase
        .from("ranking_destaques")
        .delete()
        .eq("tipo_ranking", r.tipo)
        .eq("semana_inicio", semanaInicio);
      if (deleteWeekError) throw deleteWeekError;

      const { error: insertError } = await supabase.from("ranking_destaques").insert(rows);
      if (insertError) throw insertError;
      results.push(`${r.tipo}: top ${rows.length} salvos`);
    }

    return new Response(JSON.stringify({ success: true, destaques: results, semanaInicio, semanaFim }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

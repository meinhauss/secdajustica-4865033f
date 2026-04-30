import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  // Buscar processos arquivados
  const { data: arquivados, error: fetchErr } = await supabase
    .from("processos")
    .select("id, numero")
    .eq("status", "arquivado");

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let cleanedCount = 0;
  const details: any[] = [];

  for (const proc of arquivados ?? []) {
    // Encontrar a movimentação de arquivamento mais recente
    const { data: arqMovs } = await supabase
      .from("movimentacoes")
      .select("id, created_at, tipo")
      .eq("processo_id", proc.id)
      .in("tipo", ["arquivamento_automatico", "arquivamento", "arquivamento_manual"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (!arqMovs?.length) continue;

    const arquivadoEm = new Date(arqMovs[0].created_at);
    if (arquivadoEm.getTime() > Date.now() - 15 * 24 * 60 * 60 * 1000) continue;

    // Verificar se já foi limpo (existe aviso de limpeza)
    const { data: avisoExistente } = await supabase
      .from("movimentacoes")
      .select("id")
      .eq("processo_id", proc.id)
      .eq("tipo", "limpeza_pos_arquivamento")
      .limit(1);

    if (avisoExistente?.length) continue;

    // Deletar TODAS as movimentações do processo
    const { error: delErr } = await supabase
      .from("movimentacoes")
      .delete()
      .eq("processo_id", proc.id);

    if (delErr) {
      details.push({ processo: proc.numero, error: delErr.message });
      continue;
    }

    // Inserir aviso único
    await supabase.from("movimentacoes").insert({
      processo_id: proc.id,
      tipo: "limpeza_pos_arquivamento",
      descricao:
        "As movimentações deste processo foram apagadas automaticamente após 15 dias do arquivamento. Apenas a sentença foi mantida para fins de estudo e consulta.",
    });

    cleanedCount++;
    details.push({ processo: proc.numero, status: "limpo" });
  }

  return new Response(
    JSON.stringify({ cleaned: cleanedCount, details }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

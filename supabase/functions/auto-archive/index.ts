import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find processes that were sentenced more than 3 days ago and have no pending appeals
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Get all sentenced processes where the latest sentença is older than 3 days
  const { data: sentenciados, error: fetchErr } = await supabase
    .from("processos")
    .select("id, numero")
    .eq("status", "sentenciado");

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  if (!sentenciados?.length) {
    return new Response(JSON.stringify({ archived: 0 }));
  }

  let archivedCount = 0;

  for (const proc of sentenciados) {
    // Check the latest sentença date
    const { data: sentencas } = await supabase
      .from("sentencas")
      .select("created_at")
      .eq("processo_id", proc.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!sentencas?.length) continue;

    const sentencaDate = new Date(sentencas[0].created_at);
    if (sentencaDate.getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000) continue;

    // Check if there are any active (non-judged, non-inadmitida) appeals
    const { data: activeAppeals } = await supabase
      .from("apelacoes")
      .select("id")
      .eq("processo_id", proc.id)
      .not("status", "in", '("julgada","inadmitida")');

    if (activeAppeals?.length) continue;

    // Archive the process
    const { error: updateErr } = await supabase
      .from("processos")
      .update({ status: "arquivado" })
      .eq("id", proc.id);

    if (!updateErr) {
      // Add movimentação
      await supabase.from("movimentacoes").insert({
        processo_id: proc.id,
        tipo: "arquivamento_automatico",
        descricao: "Processo arquivado automaticamente após 3 dias da sentença sem interposição de recurso.",
      });
      archivedCount++;
    }
  }

  return new Response(JSON.stringify({ archived: archivedCount }));
});

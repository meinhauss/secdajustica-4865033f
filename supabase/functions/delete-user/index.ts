import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller via getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = claimsData.claims.sub;

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem excluir usuários" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (user_id === callerId) {
      return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Nullify references in tables that have FK to auth.users
    await supabaseAdmin.from("movimentacoes").update({ autor_id: null }).eq("autor_id", user_id);
    await supabaseAdmin.from("processos").update({ juiz_id: null }).eq("juiz_id", user_id);
    await supabaseAdmin.from("processos").update({ advogado_autor_id: null }).eq("advogado_autor_id", user_id);
    await supabaseAdmin.from("processos").update({ advogado_reu_id: null }).eq("advogado_reu_id", user_id);
    await supabaseAdmin.from("boletins_ocorrencia").update({ vitima_id: null }).eq("vitima_id", user_id);
    await supabaseAdmin.from("boletins_ocorrencia").update({ delegado_id: null }).eq("delegado_id", user_id);
    await supabaseAdmin.from("cargo_historico").update({ nomeado_por: null }).eq("nomeado_por", user_id);
    // Nullify non-FK references (no constraint but good cleanup)
    await supabaseAdmin.from("atos_judiciais").update({ autor_id: null }).eq("autor_id", user_id);
    await supabaseAdmin.from("mandados").update({ cumprido_por: null }).eq("cumprido_por", user_id);
    await supabaseAdmin.from("sentencas").update({ magistrado_id: null }).eq("magistrado_id", user_id);
    await supabaseAdmin.from("intimacoes").update({ destinatario_id: null }).eq("destinatario_id", user_id);
    await supabaseAdmin.from("procuracoes").update({ advogado_id: null }).eq("advogado_id", user_id);
    await supabaseAdmin.from("documentos_processo").update({ autor_id: null }).eq("autor_id", user_id);
    await supabaseAdmin.from("protocolos").update({ remetente_id: null }).eq("remetente_id", user_id);
    await supabaseAdmin.from("prazos_processuais").update({ responsavel_id: null }).eq("responsavel_id", user_id);
    await supabaseAdmin.from("certificacoes").update({ emitido_por: null }).eq("emitido_por", user_id);
    await supabaseAdmin.from("pareceres_mp").update({ promotor_id: null }).eq("promotor_id", user_id);
    await supabaseAdmin.from("denuncias_mp").update({ promotor_id: null }).eq("promotor_id", user_id);
    await supabaseAdmin.from("requisicoes_diligencia_mp").update({ promotor_id: null }).eq("promotor_id", user_id);
    await supabaseAdmin.from("arquivamentos_mp").update({ promotor_id: null }).eq("promotor_id", user_id);
    await supabaseAdmin.from("procedimentos_disciplinares").update({ advogado_user_id: null }).eq("advogado_user_id", user_id);
    await supabaseAdmin.from("procedimentos_disciplinares").update({ denunciante_id: null }).eq("denunciante_id", user_id);
    await supabaseAdmin.from("notificacoes").delete().eq("user_id", user_id);
    await supabaseAdmin.from("inscricoes_oab").delete().eq("user_id", user_id);
    await supabaseAdmin.from("inscricoes_concurso").delete().eq("user_id", user_id);

    // Delete owned records
    await supabaseAdmin.from("cargo_historico").delete().eq("user_id", user_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
    await supabaseAdmin.from("carteiras_oab").delete().eq("user_id", user_id);
    await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      console.error("Auth delete error:", deleteError);
      return new Response(JSON.stringify({ error: "Erro ao excluir usuário: " + deleteError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro inesperado: " + err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

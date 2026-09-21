// Envia notificação por DM no Discord para o usuário
// Chamado pelo trigger de public.notificacoes via pg_net (não requer JWT)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendDm } from "../_shared/discord.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN não configurado");

    const payload = await req.json();
    const { notificacao_id, user_id, titulo, mensagem, tipo } = payload;
    const linkSecao: string | null = payload.link_secao ?? payload.link ?? null;
    let discordUserId: string | null = payload.discord_user_id ?? null;

    if (!discordUserId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_user_id, discord, discord_dm_enabled")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!profile || profile.discord_dm_enabled === false) {
        return new Response(JSON.stringify({ skipped: true, reason: "perfil sem DM" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      discordUserId = profile.discord_user_id
        || (profile.discord && /^[0-9]{17,20}$/.test(profile.discord) ? profile.discord : null);
    }

    if (!discordUserId) {
      return new Response(JSON.stringify({ skipped: true, reason: "sem discord id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultado = await sendDm(BOT_TOKEN, discordUserId, {
      titulo,
      mensagem,
      tipo,
      link_secao: linkSecao,
      referencia: notificacao_id ? String(notificacao_id) : null,
    });

    if (!resultado.ok) {
      console.error("discord-notify falha:", resultado.motivo);
      return new Response(
        JSON.stringify({ error: "envio falhou", detail: resultado.motivo }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, notificacao_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("discord-notify erro:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

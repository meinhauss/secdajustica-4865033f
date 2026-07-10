// Envia notificação por DM no Discord para o usuário
// Chamado pelo trigger de public.notificacoes via pg_net (não requer JWT)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DISCORD_API = "https://discord.com/api/v10";
const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");

function stripHtml(text: string): string {
  if (!text) return "";
  let s = text.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

async function discordFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN não configurado");

    const payload = await req.json();
    const { notificacao_id, user_id, titulo, mensagem, tipo } = payload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("discord_user_id, discord_dm_enabled, nome_completo")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile?.discord_user_id || profile.discord_dm_enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "sem discord_user_id ou DM desativada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Abrir DM channel
    const dmRes = await discordFetch("/users/@me/channels", {
      method: "POST",
      body: JSON.stringify({ recipient_id: profile.discord_user_id }),
    });
    if (!dmRes.ok) {
      const err = await dmRes.text();
      console.error("Erro abrir DM:", err);
      return new Response(JSON.stringify({ error: "abrir DM falhou", detail: err }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dm = await dmRes.json();

    // 2) Enviar embed
    const embed = {
      title: titulo?.slice(0, 250) || "Nova notificação",
      description: stripHtml(mensagem || "").slice(0, 3800),
      color: tipo === "intimacao" ? 0xE11D48 : tipo === "cartorio" ? 0x0EA5E9 : 0x6366F1,
      footer: { text: "Secretaria de Justiça — Sistema Judicial" },
      timestamp: new Date().toISOString(),
    };

    const msgRes = await discordFetch(`/channels/${dm.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!msgRes.ok) {
      const err = await msgRes.text();
      console.error("Erro enviar msg:", err);
      return new Response(JSON.stringify({ error: "envio falhou", detail: err }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

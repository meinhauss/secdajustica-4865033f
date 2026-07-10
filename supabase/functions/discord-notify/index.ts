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

    // 1) Abrir DM channel
    const dmRes = await discordFetch("/users/@me/channels", {
      method: "POST",
      body: JSON.stringify({ recipient_id: discordUserId }),
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
    const APP_URL = "https://secdajustica.lovable.app";
    let absLink: string | null = null;
    if (linkSecao) {
      if (/^https?:\/\//i.test(linkSecao)) {
        absLink = linkSecao;
      } else {
        // Formato interno: "secao" ou "secao:id". O app é SPA em "/", então
        // convertemos para query params que o Index.tsx interpreta.
        const [secao, id] = linkSecao.split(":");
        const params = new URLSearchParams({ section: secao });
        if (id) params.set("processo", id);
        absLink = `${APP_URL}/?${params.toString()}`;
      }
    }

    const tipoLabels: Record<string, string> = {
      intimacao: "📩 Intimação",
      movimentacao: "⚖️ Movimentação Processual",
      prazo: "⏰ Prazo Processual",
      cartorio: "📜 Cartório",
      convocacao: "🔔 Convocação",
      audiencia: "🏛️ Audiência",
      sentenca: "📄 Sentença",
      despacho: "✍️ Despacho",
      teste: "🧪 Teste",
    };
    const tipoLabel = tipoLabels[tipo] || "📢 Notificação";

    const corpo = stripHtml(mensagem || "");
    const descricao = [
      `**${tipoLabel}**`,
      "",
      corpo || "_(sem conteúdo)_",
      "",
      absLink ? `🔗 **[Abrir no sistema](${absLink})**` : "_Acesse o sistema para mais detalhes._",
    ].join("\n").slice(0, 3800);

    const embed: Record<string, unknown> = {
      title: titulo?.slice(0, 250) || "Nova notificação",
      url: absLink || undefined,
      description: descricao,
      color: tipo === "intimacao" ? 0xE11D48
        : tipo === "cartorio" ? 0x0EA5E9
        : tipo === "prazo" ? 0xF59E0B
        : tipo === "audiencia" ? 0x8B5CF6
        : 0x6366F1,
      author: {
        name: "Secretaria de Justiça e Cidadania",
        url: APP_URL,
      },
      fields: [
        { name: "Categoria", value: tipoLabel, inline: true },
        { name: "Referência", value: notificacao_id ? `\`${String(notificacao_id).slice(0, 8)}\`` : "—", inline: true },
        ...(absLink ? [{ name: "Link direto", value: absLink, inline: false }] : []),
      ],
      footer: { text: "Sistema Judicial • Notificação automática" },
      timestamp: new Date().toISOString(),
    };

    const content = absLink ? `Você recebeu uma nova notificação oficial. Acesse: ${absLink}` : undefined;

    const msgRes = await discordFetch(`/channels/${dm.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, embeds: [embed] }),
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

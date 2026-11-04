// Publica intimações no canal do Diário da Justiça Eletrônico (DJEM) no Discord,
// marcando o intimado, e opcionalmente envia a íntegra por DM.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { discordFetchComRetry, sendDm, stripHtml, APP_URL } from "../_shared/discord.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const CHANNEL_ID = Deno.env.get("DISCORD_DJEM_CHANNEL_ID") || "1498832038424346644";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!BOT_TOKEN) return json({ error: "DISCORD_BOT_TOKEN não configurado" }, 500);

    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Não autenticado" }, 401);

    const b = await req.json().catch(() => ({}));
    const discordId = String(b.discord_user_id || "").trim();
    if (!/^[0-9]{17,20}$/.test(discordId)) return json({ error: "Discord ID inválido" }, 400);
    const nome = String(b.destinatario_nome || "").slice(0, 200);
    const numero = String(b.processo_numero || "-").slice(0, 60);
    const prazo = String(b.prazo || "").slice(0, 20);
    const teor = stripHtml(String(b.conteudo || "")).slice(0, 3000);
    if (!teor) return json({ error: "Conteúdo vazio" }, 400);

    const embed = {
      title: `📰 DJEM — Intimação • Processo nº ${numero}`,
      color: 0xe11d48,
      author: { name: "Diário da Justiça Eletrônico Municipal", url: APP_URL },
      description: teor,
      fields: [
        { name: "Intimado(a)", value: `${nome || "—"} (<@${discordId}>)`, inline: true },
        { name: "Prazo", value: prazo ? `${prazo} horas` : "—", inline: true },
      ],
      footer: { text: "Publicação oficial • Sistema Judicial" },
      timestamp: new Date().toISOString(),
    };
    let publicado = false;
    let pubErro: string | null = null;
    if (b.publicar_djem !== false) {
      const pub = await discordFetchComRetry(`/channels/${CHANNEL_ID}/messages`, BOT_TOKEN, {
        method: "POST",
        body: JSON.stringify({
          content: `<@${discordId}>, fica V. Sa. **INTIMADO(A)** nos autos do processo nº ${numero}.`,
          embeds: [embed],
          allowed_mentions: { users: [discordId] },
        }),
      });
      publicado = pub.ok;
      pubErro = pub.ok ? null : (await pub.text().catch(() => "")).slice(0, 200);
      if (!publicado) console.error("DJEM falhou:", pubErro);
    }

    let dm: unknown = null;
    if (b.enviar_dm !== false) {
      dm = await sendDm(BOT_TOKEN, discordId, {
        titulo: String(b.titulo_dm || `Intimação Judicial — Processo ${numero}`),
        mensagem: String(b.mensagem_dm || b.conteudo),
        tipo: "intimacao",
        link_secao: b.link_secao || null,
      });
    }
    return json({ publicado, erro_publicacao: pubErro, dm });
  } catch (e: any) {
    console.error("discord-djem erro:", e);
    return json({ error: e.message }, 500);
  }
});

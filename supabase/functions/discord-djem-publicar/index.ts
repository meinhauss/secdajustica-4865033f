// Publicação livre no canal do DJEM (Discord), com imagem opcional e menção ao cargo.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { DISCORD_API } from "../_shared/discord.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const CHANNEL_ID = Deno.env.get("DISCORD_DJEM_CHANNEL_ID") || "1498832038424346644";
const ROLE_ID = "1219213571754561537";
const PERMITIDOS = ["admin", "magistrado", "desembargador", "presidente_tribunal", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "oficial_justica", "presidente_oab", "defensor_publico_geral"];
const MAX_IMG = 8 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!BOT_TOKEN) return json({ error: "Bot do Discord não configurado" }, 500);
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const sb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rs } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const roles = (rs || []).map((r: any) => r.role);
    if (!roles.some((r: string) => PERMITIDOS.includes(r))) return json({ error: "Sem permissão para publicar no DJEM" }, 403);
    const { data: perfil } = await admin.from("profiles").select("nome_completo").eq("user_id", u.user.id).maybeSingle();

    const b = await req.json().catch(() => ({}));
    const titulo = String(b.titulo || "").trim().slice(0, 250);
    const texto = String(b.texto || "").trim().slice(0, 4000);
    const marcar = b.marcar_cargo !== false;
    if (!texto) return json({ error: "Escreva o texto da publicação" }, 400);

    let imgBytes: Uint8Array | null = null;
    let imgNome = "imagem.png";
    let imgTipo = "image/png";
    if (b.imagem_base64) {
      imgTipo = String(b.imagem_tipo || "image/png");
      if (!/^image\/(png|jpe?g|gif|webp)$/.test(imgTipo)) return json({ error: "Formato de imagem não suportado" }, 400);
      const ext = imgTipo.split("/")[1].replace("jpeg", "jpg");
      imgNome = `djem.${ext}`;
      const bin = atob(String(b.imagem_base64));
      imgBytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      if (imgBytes.length > MAX_IMG) return json({ error: "Imagem acima de 8 MB" }, 400);
    }

    const embed: Record<string, unknown> = {
      title: titulo ? `📰 ${titulo}` : "📰 Diário da Justiça Eletrônico Municipal",
      description: texto,
      color: 0xe11d48,
      footer: { text: `Publicado por ${perfil?.nome_completo || "Autoridade"} • DJEM` },
      timestamp: new Date().toISOString(),
    };
    if (imgBytes) embed.image = { url: `attachment://${imgNome}` };

    const payload = {
      content: marcar ? `<@&${ROLE_ID}>` : undefined,
      embeds: [embed],
      allowed_mentions: { roles: marcar ? [ROLE_ID] : [] },
      attachments: imgBytes ? [{ id: 0, filename: imgNome }] : undefined,
    };
    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));
    if (imgBytes) form.append("files[0]", new Blob([imgBytes], { type: imgTipo }), imgNome);

    const r = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      body: form,
    });
    if (!r.ok) {
      const t = (await r.text().catch(() => "")).slice(0, 300);
      console.error("DJEM publicar falhou:", r.status, t);
      return json({ error: r.status === 403 ? "O bot não tem permissão no canal do DJEM" : "Falha ao publicar no Discord" }, 502);
    }
    return json({ ok: true });
  } catch (e: any) {
    console.error("discord-djem-publicar erro:", e);
    return json({ error: e.message }, 500);
  }
});

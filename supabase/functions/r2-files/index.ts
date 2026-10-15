import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif", "text/plain"];

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const r2 = new AwsClient({
  accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
  secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  service: "s3",
  region: "auto",
});
const BASE = `${Deno.env.get("R2_ENDPOINT")}/${Deno.env.get("R2_BUCKET_NAME")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    if (!u?.user && !(action === "upload" && req.method === "POST")) {
      return json({ error: "Não autenticado" }, 401);
    }

    if (action === "upload" && req.method === "POST") {
      const form = await req.formData();
      const file = form.get("file");
      const processoId = String(form.get("processo_id") ?? "");
      const contexto = String(form.get("contexto") ?? "");
      if (!(file instanceof File)) return json({ error: "Arquivo ausente" }, 400);
      if (file.size > MAX_BYTES) return json({ error: "Arquivo maior que 20 MB" }, 400);
      if (!ALLOWED.includes(file.type)) return json({ error: "Tipo não permitido (use PDF ou imagem PNG, JPEG, WebP ou GIF)" }, 400);

      const safe = file.name.normalize("NFD").replace(/[^\w.\-]+/g, "_").slice(-100);
      let key: string;
      if (processoId) {
        if (!/^[0-9a-f-]{36}$/i.test(processoId)) return json({ error: "Processo inválido" }, 400);
        const { data: proc } = await sb.from("processos").select("id").eq("id", processoId).maybeSingle();
        if (!proc) return json({ error: "Sem acesso a este processo" }, 403);
        key = `processos/${processoId}/${crypto.randomUUID()}-${safe}`;
      } else {
        if (contexto !== "cartorio" && contexto !== "ouvidoria") return json({ error: "Contexto de anexo inválido" }, 400);
        if (!u?.user && contexto !== "ouvidoria") return json({ error: "Não autenticado" }, 401);
        key = `anexos/${contexto}/${u?.user?.id ?? "public"}/${crypto.randomUUID()}-${safe}`;
      }
      const r = await r2.fetch(`${BASE}/${key}`, {
        method: "PUT",
        body: await file.arrayBuffer(),
        headers: { "Content-Type": file.type, "Content-Disposition": `inline; filename="${safe}"` },
      });
      if (!r.ok) {
        const t = await r.text();
        console.error("R2 upload", r.status, t);
        return json({ error: "Falha no armazenamento", status: r.status }, 502);
      }
      return json({ url: `r2://${key}` });
    }

    if (action === "view") {
      const ref = url.searchParams.get("ref") ?? "";
      const key = ref.slice(5);
      if (ref.startsWith("r2://processos/")) {
        const processoId = key.split("/")[1];
        const { data: proc } = await sb.from("processos").select("id").eq("id", processoId).maybeSingle();
        if (!proc) return json({ error: "Sem acesso a este documento" }, 403);
      } else if (!ref.startsWith("r2://anexos/cartorio/") && !ref.startsWith("r2://anexos/ouvidoria/")) {
        return json({ error: "Referência inválida" }, 400);
      }
      const signed = await r2.sign(
        new Request(`${BASE}/${key}?X-Amz-Expires=900`, { method: "GET" }),
        { aws: { signQuery: true } },
      );
      return json({ url: signed.url });
    }
    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const TOKEN = "tmp_9f3a71c4e58b4d0aa2c6b7e1d4f80912";

Deno.serve(async (req) => {
  if (req.headers.get("x-runner-token") !== TOKEN) {
    return new Response("forbidden", { status: 403 });
  }
  const sql_text = await req.text();
  const url = Deno.env.get("SUPABASE_DB_URL")!;
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql.unsafe(sql_text);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } finally {
    await sql.end();
  }
});

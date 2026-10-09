// deno-lint-ignore-file no-explicit-any
// Edge function: única origem de chamadas ao modelo Gemini via Lovable AI Gateway.
// Migrado de Google Gemini direto → Lovable AI Gateway para eliminar quotas de free-tier
// e permitir fallback automático. Mantém contrato de resposta (AIResponse) do frontend.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_TIMEOUT = 100_000;
const MAX_RETRIES = 1;
const RETRY_BASE = 800;

interface AIMessage { role: "user" | "model" | "system"; content: string }
interface Options {
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  responseSchema?: Record<string, unknown>;
}
interface Body {
  operation: string;
  prompt?: string;
  messages?: AIMessage[];
  options?: Options;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

// Mapeia modelos "gemini-*" (legado) para os ids do gateway ("google/gemini-*").
function normalizeModel(input?: string): string {
  const m = (input || "gemini-3.6-flash").trim();
  if (m.startsWith("google/") || m.startsWith("openai/") || m.startsWith("anthropic/")) return m;
  if (m.startsWith("gemini-")) return `google/${m}`;
  return `google/${m}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const openaiKeyEarly = Deno.env.get("OPENAI_API_KEY");
  const geminiKeyEarly = Deno.env.get("GEMINI_API_KEY");
  if (!openaiKeyEarly && !geminiKeyEarly && !Deno.env.get("GROQ_API_KEY")) {
    return json({
      ok: false,
      data: "",
      error: { code: "no_api_key", message: "OPENAI_API_KEY/GEMINI_API_KEY não configuradas.", retriable: false },
    }, 200);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, data: "", error: { code: "bad_json", message: "JSON inválido.", retriable: false } }, 400);
  }

  if (!body.operation) {
    return json({ ok: false, data: "", error: { code: "missing_operation", message: "operation é obrigatório.", retriable: false } }, 400);
  }
  if (!body.prompt && !body.messages?.length) {
    return json({ ok: false, data: "", error: { code: "missing_prompt", message: "prompt ou messages obrigatório.", retriable: false } }, 400);
  }

  const opts = body.options || {};
  const model = normalizeModel(opts.model);
  const systemInstruction =
    opts.systemInstruction ||
    body.messages?.find((m) => m.role === "system")?.content;

  // Converte "model" (Gemini) → "assistant" (OpenAI-compat) e injeta system.
  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
  if (systemInstruction) chatMessages.push({ role: "system", content: systemInstruction });
  if (body.messages?.length) {
    for (const m of body.messages) {
      if (m.role === "system") continue;
      chatMessages.push({ role: m.role === "model" ? "assistant" : "user", content: m.content });
    }
  } else if (body.prompt) {
    chatMessages.push({ role: "user", content: body.prompt });
  }

  const LONG_OPS = ["gerar_sentenca", "gerar_despacho", "gerar_peticao", "gerar_parecer"];
  const minTokens = LONG_OPS.includes(body.operation) ? 12000 : 4096;
  const payload: Record<string, unknown> = {
    model,
    messages: chatMessages,
    temperature: opts.temperature ?? 0.7,
    top_p: opts.topP ?? 0.95,
    max_tokens: Math.min(16000, Math.max(opts.maxOutputTokens ?? 0, minTokens)),
  };
  if (opts.responseSchema) {
    payload.response_format = { type: "json_object" };
  }

  // Cadeia de fallback: OpenAI direto → Gemini direto. Lovable AI desabilitado.
  const openaiKey = openaiKeyEarly;
  const geminiKey = geminiKeyEarly;
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const GEMINI_OAI = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  type ChainStep = { endpoint: string; model: string; key: string; provider: string };
  const FALLBACK_CHAIN: ChainStep[] = [
    ...(openaiKey ? [
      { endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini", key: openaiKey, provider: "openai" },
      { endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o", key: openaiKey, provider: "openai" },
    ] : []),
    ...(geminiKey ? [
      { endpoint: GEMINI_OAI, model: "gemini-3.6-flash", key: geminiKey, provider: "gemini-direct" },
      { endpoint: GEMINI_OAI, model: "gemini-flash-latest", key: geminiKey, provider: "gemini-direct" },
    ] : []),
    ...(groqKey ? [
      { endpoint: "https://api.groq.com/openai/v1/chat/completions", model: "openai/gpt-oss-120b", key: groqKey, provider: "groq" },
      { endpoint: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.1-8b-instant", key: groqKey, provider: "groq" },
    ] : []),
  ].filter((s, i, a) => a.findIndex((x) => x.endpoint === s.endpoint && x.model === s.model) === i);


  const started = Date.now();
  let lastErr: unknown = null;
  let lastStatus = 0;
  let usedModel = model;

  outer: for (const step of FALLBACK_CHAIN) {
    usedModel = step.model;
    const currentPayload = { ...payload, model: step.model };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await withTimeout(
          fetch(step.endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${step.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(currentPayload),
          }),
          DEFAULT_TIMEOUT,
        );
        lastStatus = res.status;

        if ([400, 401, 402, 403, 404, 413, 429].includes(res.status)) {
          const errText = await res.text().catch(() => "");
          lastErr = new Error(`${step.provider} ${res.status}: ${errText.slice(0, 200)}`);
          console.warn(`[gemini] provider=${step.provider} model=${step.model} status=${res.status} body=${errText.slice(0, 400)} → fallback`);
          continue outer;
        }

        if (res.status >= 500) {
          const errText = await res.text().catch(() => "");
          lastErr = new Error(`${step.provider} ${res.status}: ${errText.slice(0, 200)}`);
          console.error(`[gemini] provider=${step.provider} model=${step.model} attempt=${attempt} status=${res.status}`);
          if (attempt === MAX_RETRIES) continue outer;
          await new Promise((r) => setTimeout(r, RETRY_BASE * Math.pow(2, attempt)));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          return json({
            ok: false,
            data: "",
            model: step.model,
            provider: step.provider,
            operation: body.operation,
            cached: false,
            latencyMs: Date.now() - started,
            error: { code: `gateway_${res.status}`, message: errText.slice(0, 500), retriable: false },
          }, 200);
        }

        const result: any = await res.json();
        let text: string = result?.choices?.[0]?.message?.content ?? "";
        let finish = result?.choices?.[0]?.finish_reason;
        // Continua automaticamente se o texto foi cortado por limite de tamanho.
        for (let c = 0; c < 2 && finish === "length" && !opts.responseSchema && Date.now() - started < 90_000; c++) {
          try {
            const cont = await withTimeout(fetch(step.endpoint, {
              method: "POST",
              headers: { Authorization: `Bearer ${step.key}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                ...currentPayload,
                messages: [
                  ...chatMessages,
                  { role: "assistant", content: text },
                  { role: "user", content: "Continue exatamente de onde parou, sem repetir nada e sem comentários." },
                ],
              }),
            }), DEFAULT_TIMEOUT);
            if (!cont.ok) break;
            const cj: any = await cont.json();
            text += cj?.choices?.[0]?.message?.content ?? "";
            finish = cj?.choices?.[0]?.finish_reason;
          } catch { break; }
        }

        let parsedJson: unknown = undefined;
        if (opts.responseSchema && text) {
          try { parsedJson = JSON.parse(text); } catch { /* keep raw */ }
        }

        const u = result?.usage;
        const usage = u
          ? {
              promptTokens: u.prompt_tokens ?? 0,
              outputTokens: u.completion_tokens ?? 0,
              totalTokens: u.total_tokens ?? 0,
            }
          : undefined;

        console.log(`[gemini] op=${body.operation} provider=${step.provider} model=${step.model} ms=${Date.now() - started} tokens=${usage?.totalTokens ?? "?"}`);

        return json({
          ok: true,
          data: text,
          json: parsedJson,
          model: step.model,
          provider: step.provider,
          operation: body.operation,
          usage,
          cached: false,
          latencyMs: Date.now() - started,

        });
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[gemini] provider=${step.provider} model=${step.model} attempt=${attempt} err=${msg}`);
        if (attempt === MAX_RETRIES) continue outer;
        await new Promise((r) => setTimeout(r, RETRY_BASE * Math.pow(2, attempt)));
      }
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  const isRateLimit = lastStatus === 429;
  const isPayment = lastStatus === 402;
  const friendly = isRateLimit
    ? "Muitas requisições no momento — aguarde alguns instantes e tente novamente."
    : isPayment
      ? "Créditos de IA esgotados no workspace. Adicione créditos para continuar."
      : "Serviço de IA indisponível no momento. Tente novamente em instantes.";

  // Retorna 200 para não quebrar o cliente com blank screen; o frontend usa `ok:false` + `data:""`.
  return json({
    ok: false,
    data: "",
    model,
    provider: "openai",
    operation: body.operation,
    cached: false,
    latencyMs: Date.now() - started,
    error: {
      code: isRateLimit ? "rate_limited" : isPayment ? "payment_required" : "gateway_error",
      message: friendly,
      detail: message.slice(0, 500),
      retriable: isRateLimit || lastStatus >= 500,
    },
  }, 200);
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

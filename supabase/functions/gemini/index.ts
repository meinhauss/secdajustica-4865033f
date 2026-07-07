// deno-lint-ignore-file no-explicit-any
// Edge function: única origem de chamadas ao Google Gemini.
// Recebe requisições padronizadas do GeminiService (frontend) e devolve AIResponse.
import { GoogleGenAI } from "npm:@google/genai@^1.0.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_TIMEOUT = 60_000;
const MAX_RETRIES = 2;
const RETRY_BASE = 800;

interface AIMessage { role: "user" | "model" | "system"; content: string }
interface Options {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
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

function isRetriable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("503") ||
    msg.includes("500") ||
    msg.includes("429") ||
    msg.includes("network") ||
    msg.includes("fetch")
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json({
      ok: false,
      data: "",
      error: { code: "no_api_key", message: "GEMINI_API_KEY não configurada.", retriable: false },
    }, 500);
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
  const model = opts.model || "gemini-2.5-flash";
  const systemInstruction =
    opts.systemInstruction ||
    body.messages?.find((m) => m.role === "system")?.content;

  // Monta contents no formato do SDK.
  const contents = body.messages
    ? body.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "model" ? "model" : "user", parts: [{ text: m.content }] }))
    : [{ role: "user", parts: [{ text: body.prompt! }] }];

  const genAI = new GoogleGenAI({ apiKey });

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.7,
    topP: opts.topP ?? 0.95,
    topK: opts.topK ?? 40,
    maxOutputTokens: opts.maxOutputTokens ?? 8192,
  };
  if (opts.responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = opts.responseSchema;
  }

  const started = Date.now();
  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result: any = await withTimeout(
        genAI.models.generateContent({
          model,
          contents,
          config: {
            ...generationConfig,
            ...(systemInstruction ? { systemInstruction } : {}),
          },
        }),
        DEFAULT_TIMEOUT,
      );

      const text: string =
        result?.text ??
        result?.response?.text?.() ??
        result?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") ??
        "";

      let parsedJson: unknown = undefined;
      if (opts.responseSchema && text) {
        try { parsedJson = JSON.parse(text); } catch { /* keep raw */ }
      }

      const usageMeta = result?.usageMetadata || result?.response?.usageMetadata;
      const usage = usageMeta
        ? {
            promptTokens: usageMeta.promptTokenCount ?? 0,
            outputTokens: usageMeta.candidatesTokenCount ?? 0,
            totalTokens: usageMeta.totalTokenCount ?? 0,
          }
        : undefined;

      console.log(`[gemini] op=${body.operation} model=${model} attempt=${attempt} ms=${Date.now() - started} tokens=${usage?.totalTokens ?? "?"}`);

      return json({
        ok: true,
        data: text,
        json: parsedJson,
        model,
        provider: "gemini",
        operation: body.operation,
        usage,
        cached: false,
        latencyMs: Date.now() - started,
      });
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[gemini] op=${body.operation} attempt=${attempt} err=${msg}`);
      if (!isRetriable(err) || attempt === MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, RETRY_BASE * Math.pow(2, attempt)));
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  return json({
    ok: false,
    data: "",
    model,
    provider: "gemini",
    operation: body.operation,
    cached: false,
    latencyMs: Date.now() - started,
    error: { code: "gemini_error", message, retriable: isRetriable(lastErr) },
  }, 502);
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

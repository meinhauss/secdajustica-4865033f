import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Authenticate via X-API-Key header
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return jsonResponse({ error: "Header X-API-Key é obrigatório" }, 401);
  }

  const { data: keyData, error: keyError } = await supabase
    .from("api_keys_externas")
    .select("*")
    .eq("api_key", apiKey)
    .eq("ativo", true)
    .single();

  if (keyError || !keyData) {
    return jsonResponse({ error: "API Key inválida ou inativa" }, 403);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api-mp\/?/, "").replace(/^\//, "");

  try {
    // ============================================
    // POST /enviar-inquerito
    // Envia um inquérito para o MP
    // ============================================
    if (req.method === "POST" && path === "enviar-inquerito") {
      const body = await req.json();
      const { titulo, conteudo, envolvidos, links, numero_referencia } = body;

      if (!titulo || !conteudo) {
        return jsonResponse({ error: "titulo e conteudo são obrigatórios" }, 400);
      }

      const { data, error } = await supabase.from("comunicacoes_externas").insert({
        api_key_id: keyData.id,
        orgao_origem: keyData.orgao,
        tipo: "inquerito",
        direcao: "entrada",
        titulo,
        conteudo,
        envolvidos: envolvidos || [],
        links: links || [],
        numero_referencia: numero_referencia || null,
        status: "pendente",
      }).select("id, created_at").single();

      if (error) throw error;
      return jsonResponse({ sucesso: true, mensagem: "Inquérito enviado ao MP com sucesso", id: data.id, criado_em: data.created_at });
    }

    // ============================================
    // POST /enviar-denuncia
    // Envia uma denúncia para o MP
    // ============================================
    if (req.method === "POST" && path === "enviar-denuncia") {
      const body = await req.json();
      const { titulo, conteudo, envolvidos, links, numero_referencia } = body;

      if (!titulo || !conteudo) {
        return jsonResponse({ error: "titulo e conteudo são obrigatórios" }, 400);
      }

      const { data, error } = await supabase.from("comunicacoes_externas").insert({
        api_key_id: keyData.id,
        orgao_origem: keyData.orgao,
        tipo: "denuncia",
        direcao: "entrada",
        titulo,
        conteudo,
        envolvidos: envolvidos || [],
        links: links || [],
        numero_referencia: numero_referencia || null,
        status: "pendente",
      }).select("id, created_at").single();

      if (error) throw error;
      return jsonResponse({ sucesso: true, mensagem: "Denúncia enviada ao MP com sucesso", id: data.id, criado_em: data.created_at });
    }

    // ============================================
    // POST /enviar-comunicacao
    // Envia uma comunicação genérica para o MP
    // ============================================
    if (req.method === "POST" && path === "enviar-comunicacao") {
      const body = await req.json();
      const { titulo, conteudo, envolvidos, links, numero_referencia, resposta_a } = body;

      if (!titulo || !conteudo) {
        return jsonResponse({ error: "titulo e conteudo são obrigatórios" }, 400);
      }

      const { data, error } = await supabase.from("comunicacoes_externas").insert({
        api_key_id: keyData.id,
        orgao_origem: keyData.orgao,
        tipo: "comunicacao",
        direcao: "entrada",
        titulo,
        conteudo,
        envolvidos: envolvidos || [],
        links: links || [],
        numero_referencia: numero_referencia || null,
        resposta_a: resposta_a || null,
        status: "pendente",
      }).select("id, created_at").single();

      if (error) throw error;
      return jsonResponse({ sucesso: true, mensagem: "Comunicação enviada ao MP com sucesso", id: data.id, criado_em: data.created_at });
    }

    // ============================================
    // GET /comunicacoes
    // Lista comunicações do MP para o órgão (saída)
    // ============================================
    if (req.method === "GET" && path === "comunicacoes") {
      const status = url.searchParams.get("status");
      const desde = url.searchParams.get("desde"); // ISO date
      const limite = parseInt(url.searchParams.get("limite") || "50");
      const pagina = parseInt(url.searchParams.get("pagina") || "1");

      let query = supabase
        .from("comunicacoes_externas")
        .select("id, tipo, direcao, titulo, conteudo, envolvidos, links, numero_referencia, status, resposta_a, created_at, updated_at", { count: "exact" })
        .eq("api_key_id", keyData.id)
        .eq("direcao", "saida")
        .order("created_at", { ascending: false })
        .range((pagina - 1) * limite, pagina * limite - 1);

      if (status) query = query.eq("status", status);
      if (desde) query = query.gte("created_at", desde);

      const { data, error, count } = await query;
      if (error) throw error;

      return jsonResponse({ comunicacoes: data, total: count, pagina, limite });
    }

    // ============================================
    // GET /comunicacoes/:id
    // Busca uma comunicação específica
    // ============================================
    if (req.method === "GET" && path.startsWith("comunicacoes/")) {
      const id = path.replace("comunicacoes/", "");

      const { data, error } = await supabase
        .from("comunicacoes_externas")
        .select("*")
        .eq("id", id)
        .eq("api_key_id", keyData.id)
        .single();

      if (error || !data) {
        return jsonResponse({ error: "Comunicação não encontrada" }, 404);
      }

      return jsonResponse(data);
    }

    // ============================================
    // PUT /marcar-lido/:id
    // Marca uma comunicação de saída como lida
    // ============================================
    if (req.method === "PUT" && path.startsWith("marcar-lido/")) {
      const id = path.replace("marcar-lido/", "");

      const { data, error } = await supabase
        .from("comunicacoes_externas")
        .update({ status: "lido", lido_em: new Date().toISOString() })
        .eq("id", id)
        .eq("api_key_id", keyData.id)
        .eq("direcao", "saida")
        .select("id")
        .single();

      if (error || !data) {
        return jsonResponse({ error: "Comunicação não encontrada" }, 404);
      }

      return jsonResponse({ sucesso: true, mensagem: "Marcado como lido" });
    }

    // ============================================
    // GET /status
    // Verifica status da API e do órgão autenticado
    // ============================================
    if (req.method === "GET" && path === "status") {
      return jsonResponse({
        status: "online",
        orgao: keyData.orgao,
        sistema: keyData.nome_sistema,
        versao_api: "1.0.0",
      });
    }

    return jsonResponse({ error: "Rota não encontrada. Rotas disponíveis: POST /enviar-inquerito, POST /enviar-denuncia, POST /enviar-comunicacao, GET /comunicacoes, GET /comunicacoes/:id, PUT /marcar-lido/:id, GET /status" }, 404);
  } catch (err) {
    console.error("API MP Error:", err);
    return jsonResponse({ error: "Erro interno do servidor", detalhes: err.message }, 500);
  }
});

// Envio em massa de DMs individuais no Discord para integrantes de cargos do servidor.
// Chamado pelo card "Envio em massa no Discord" (Estatísticas), somente administradores.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { discordFetchComRetry, sendDm, sleep } from "../_shared/discord.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") || "1483576897995804897";
const ESPACAMENTO_MS = 350;
const ORCAMENTO_MS = 80_000;
const MAX_PAGINAS = 10;

type Membro = { id: string; nome: string; bot: boolean; roles: string[] };
type Perfil = { user_id: string; nome: string; dm_ativa: boolean };
type Alvo = { discord_id: string; nome: string; cadastrado: boolean };
type Falha = { discord_id: string; nome: string; motivo: string };

const Snowflake = z.string().regex(/^[0-9]{17,20}$/, "ID do Discord inválido");

const BodySchema = z.object({
  action: z.enum(["roles", "preview", "send"]),
  role_ids: z.array(Snowflake).max(60).default([]),
  discord_ids: z.array(Snowflake).max(2000).optional(),
  apenas_cadastrados: z.boolean().default(true),
  titulo: z.string().trim().max(250).optional(),
  mensagem: z.string().trim().max(4000).optional(),
  tipo: z.string().trim().max(40).default("aviso"),
  link_secao: z.string().trim().max(300).nullish(),
});

function responder(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function listarCargos(): Promise<unknown[]> {
  const res = await discordFetchComRetry(`/guilds/${GUILD_ID}/roles`, BOT_TOKEN!);
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`não foi possível ler os cargos (${res.status}): ${detalhe.slice(0, 200)}`);
  }
  const cargos = await res.json();
  if (!Array.isArray(cargos)) return [];
  return cargos
    .filter((c: any) => c?.id && c.id !== GUILD_ID)
    .map((c: any) => ({
      id: String(c.id),
      name: String(c.name),
      color: typeof c.color === "number" ? c.color : null,
      position: typeof c.position === "number" ? c.position : 0,
      managed: !!c.managed,
    }))
    .sort((a: any, b: any) => b.position - a.position || a.name.localeCompare(b.name));
}

// Plano B quando o Discord bloqueia a listagem geral (Server Members Intent desligado):
// consulta cada cadastro individualmente, o que não exige intent privilegiada.
async function membrosPorCadastro(perfis: Map<string, Perfil>): Promise<Membro[]> {
  const ids = [...perfis.keys()];
  const membros: Membro[] = [];
  for (const id of ids) {
    const res = await discordFetchComRetry(`/guilds/${GUILD_ID}/members/${id}`, BOT_TOKEN!);
    if (res.ok) {
      const m = await res.json();
      if (m?.user?.id) {
        membros.push({
          id: String(m.user.id),
          nome: m.user.global_name || m.user.username || String(m.user.id),
          bot: !!m.user.bot,
          roles: Array.isArray(m.roles) ? m.roles.map(String) : [],
        });
      }
    } else {
      await res.text().catch(() => "");
    }
    await sleep(120);
  }
  return membros;
}

async function listarMembros(): Promise<{ membros: Membro[]; limitado: boolean }> {
  const todos = new Map<string, Membro>();
  let depois: string | null = null;
  let limitado = false;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const consulta = `?limit=1000${depois ? `&after=${depois}` : ""}`;
    const res = await discordFetchComRetry(`/guilds/${GUILD_ID}/members${consulta}`, BOT_TOKEN!);

    if (!res.ok) {
      const detalhe = await res.text().catch(() => "");
      if (pagina === 0) {
        throw new Error(
          `não foi possível listar os integrantes (${res.status}): ${detalhe.slice(0, 220)}`
        );
      }
      limitado = true;
      break;
    }

    const lote = await res.json();
    if (!Array.isArray(lote) || lote.length === 0) break;

    const tamanhoAntes = todos.size;
    for (const m of lote) {
      if (!m?.user?.id) continue;
      todos.set(String(m.user.id), {
        id: String(m.user.id),
        nome: m.user.global_name || m.user.username || String(m.user.id),
        bot: !!m.user.bot,
        roles: Array.isArray(m.roles) ? m.roles.map(String) : [],
      });
    }

    // Sem progresso na paginação: paramos para não repetir os mesmos IDs.
    if (todos.size === tamanhoAntes) {
      limitado = true;
      break;
    }
    if (lote.length < 1000) break;

    depois = String(lote[lote.length - 1]?.user?.id ?? "");
    if (!depois) {
      limitado = true;
      break;
    }
    await sleep(150);
  }

  return { membros: [...todos.values()], limitado };
}

async function carregarPerfis(
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<Map<string, Perfil>> {
  const mapa = new Map<string, Perfil>();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, nome_completo, discord_user_id, discord, discord_dm_enabled");

  if (error) throw new Error(`falha ao ler os cadastros: ${error.message}`);

  for (const p of data || []) {
    const legado =
      typeof p.discord === "string" && /^[0-9]{17,20}$/.test(p.discord) ? p.discord : null;
    const id = p.discord_user_id || legado;
    if (!id) continue;
    mapa.set(String(id), {
      user_id: p.user_id,
      nome: p.nome_completo,
      dm_ativa: p.discord_dm_enabled !== false,
    });
  }
  return mapa;
}

function selecionarAlvos(
  membros: Membro[],
  roleIds: string[],
  perfis: Map<string, Perfil>,
  apenasCadastrados: boolean
): { alvos: Alvo[]; semCadastro: number; dmDesativada: number; ignorados: number } {
  const wanted = new Set(roleIds);
  const alvos: Alvo[] = [];
  let semCadastro = 0;
  let dmDesativada = 0;
  let ignorados = 0;

  for (const m of membros) {
    if (m.bot) {
      ignorados++;
      continue;
    }
    if (!m.roles.some((r) => wanted.has(r))) continue;

    const perfil = perfis.get(m.id);
    if (perfil && !perfil.dm_ativa) {
      dmDesativada++;
      continue;
    }
    if (!perfil && apenasCadastrados) {
      semCadastro++;
      continue;
    }
    alvos.push({
      discord_id: m.id,
      nome: perfil?.nome || m.nome,
      cadastrado: !!perfil,
    });
  }

  return { alvos, semCadastro, dmDesativada, ignorados };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN não configurado");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return responder({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) return responder({ error: "Não autorizado" }, 401);

    const callerId = String(claimsData.claims.sub);
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) {
      return responder({ error: "Apenas administradores podem enviar mensagens em massa" }, 403);
    }

    const bruto = await req.json().catch(() => null);
    const analisado = BodySchema.safeParse(bruto);
    if (!analisado.success) {
      return responder(
        { error: "Dados inválidos", detalhes: analisado.error.flatten().fieldErrors },
        400
      );
    }
    const body = analisado.data;

    if (body.action === "roles") {
      return responder({ cargos: await listarCargos(), guild_id: GUILD_ID });
    }

    const perfis = await carregarPerfis(supabaseAdmin);

    let membros: Membro[] = [];
    let limitado = false;
    let somenteCadastrados = false;
    try {
      const listagem = await listarMembros();
      membros = listagem.membros;
      limitado = listagem.limitado;
    } catch (erroListagem: any) {
      const msg = String(erroListagem?.message || "");
      const bloqueio = msg.includes("(403)") || msg.includes("50001") || msg.includes("(401)");
      if (!bloqueio) throw erroListagem;
      // Sem a intent de integrantes: verificamos apenas quem tem cadastro no sistema.
      console.log("discord-broadcast: listagem geral bloqueada, usando cadastros");
      membros = await membrosPorCadastro(perfis);
      limitado = true;
      somenteCadastrados = true;
      if (!membros.length) {
        return responder(
          {
            error:
              "O Discord bloqueou a consulta de integrantes. Ative 'Server Members Intent' no Portal do Desenvolvedor (Bot → Privileged Gateway Intents) e confirme que o bot está no servidor.",
          },
          403
        );
      }
    }

    let alvos: Alvo[];
    let semCadastro = 0;
    let dmDesativada = 0;
    let ignorados = 0;

    if (body.discord_ids?.length) {
      // Reenvio para quem falhou: usa a lista devolvida pelo envio anterior.
      alvos = [];
      for (const id of body.discord_ids) {
        const perfil = perfis.get(id);
        if (perfil && !perfil.dm_ativa) {
          dmDesativada++;
          continue;
        }
        alvos.push({ discord_id: id, nome: perfil?.nome || id, cadastrado: !!perfil });
      }
    } else {
      if (!body.role_ids.length) {
        return responder({ error: "Selecione pelo menos um cargo" }, 400);
      }
      const sel = selecionarAlvos(membros, body.role_ids, perfis, body.apenas_cadastrados);
      alvos = sel.alvos;
      semCadastro = sel.semCadastro;
      dmDesativada = sel.dmDesativada;
      ignorados = sel.ignorados;
    }

    if (body.action === "preview") {
      return responder({
        total: alvos.length,
        amostra: alvos.slice(0, 30),
        sem_cadastro: semCadastro,
        dm_desativada: dmDesativada,
        bots_ignorados: ignorados,
        servidores: membros.length,
        limitado,
      });
    }

    if (!body.mensagem) {
      return responder({ error: "A mensagem é obrigatória" }, 400);
    }
    if (!alvos.length) {
      return responder({ total: 0, enviados: 0, falhas: [], pendentes: [], mensagem: null });
    }

    const lote = crypto.randomUUID();
    const inicio = Date.now();
    const enviados: Alvo[] = [];
    const falhas: Falha[] = [];
    let pendentes: Alvo[] = [];

    for (let i = 0; i < alvos.length; i++) {
      if (Date.now() - inicio > ORCAMENTO_MS) {
        pendentes = alvos.slice(i);
        break;
      }
      const alvo = alvos[i];
      const resultado = await sendDm(BOT_TOKEN, alvo.discord_id, {
        titulo: body.titulo,
        mensagem: body.mensagem,
        tipo: body.tipo,
        link_secao: body.link_secao,
        referencia: lote,
      });
      if (resultado.ok) {
        enviados.push(alvo);
      } else {
        falhas.push({ discord_id: alvo.discord_id, nome: alvo.nome, motivo: resultado.motivo });
      }
      await sleep(ESPACAMENTO_MS);
    }

    console.log(
      `discord-broadcast lote=${lote} total=${alvos.length} enviados=${enviados.length} falhas=${falhas.length} pendentes=${pendentes.length}`
    );

    return responder({
      total: alvos.length,
      enviados: enviados.length,
      falhas,
      pendentes,
      incomplete: pendentes.length > 0,
      lote,
      sem_cadastro: semCadastro,
      dm_desativada: dmDesativada,
      limitado,
    });
  } catch (e: any) {
    console.error("discord-broadcast erro:", e);
    return responder({ error: e?.message || "erro desconhecido" }, 500);
  }
});

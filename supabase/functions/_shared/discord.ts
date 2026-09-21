// Helpers compartilhados pelas funções discord-notify e discord-broadcast.
// Mantém o visual das DMs idêntico entre notificações automáticas e envios manuais.

export const DISCORD_API = "https://discord.com/api/v10";
export const APP_URL = "https://secdajustica.lovable.app";

export type DmMessage = {
  titulo?: string | null;
  mensagem?: string | null;
  tipo?: string | null;
  link_secao?: string | null;
  referencia?: string | null;
};

export type DmResult = { ok: true } | { ok: false; status: number; motivo: string };

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripHtml(text: string): string {
  if (!text) return "";
  let s = text.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

export const TIPO_LABELS: Record<string, string> = {
  intimacao: "📩 Intimação",
  movimentacao: "⚖️ Movimentação Processual",
  prazo: "⏰ Prazo Processual",
  cartorio: "📜 Cartório",
  convocacao: "🔔 Convocação",
  convocacao_jurado: "🔔 Convocação de Jurado",
  audiencia: "🏛️ Audiência",
  sentenca: "📄 Sentença",
  despacho: "✍️ Despacho",
  concurso: "📝 Concurso Público",
  concurso_lembrete_prova: "📝 Concurso Público",
  aviso: "📣 Comunicado Oficial",
  comunicado: "📣 Comunicado Oficial",
  teste: "🧪 Teste",
};

export function rotuloTipo(tipo?: string | null): string {
  return TIPO_LABELS[tipo || "aviso"] || "📢 Notificação";
}

// Converte "secao" ou "secao:id" em URL absoluta. A consulta pública é restrita,
// então "processos" é sempre redirecionado para "meus-processos".
export function resolverLinkApp(linkSecao?: string | null): string | null {
  if (!linkSecao) return null;
  if (/^https?:\/\//i.test(linkSecao)) return linkSecao;
  const [secaoRaw, id] = linkSecao.split(":");
  const secao = secaoRaw === "processos" ? "meus-processos" : secaoRaw;
  const params = new URLSearchParams({ section: secao });
  if (id) params.set("processo", id);
  return `${APP_URL}/?${params.toString()}`;
}

function corPorTipo(tipo: string): number {
  if (tipo === "intimacao") return 0xe11d48;
  if (tipo === "cartorio") return 0x0ea5e9;
  if (tipo.startsWith("prazo")) return 0xf59e0b;
  if (tipo === "audiencia") return 0x8b5cf6;
  return 0x6366f1;
}

export function montarPayloadDm(msg: DmMessage): { payload: Record<string, unknown>; absLink: string | null } {
  const absLink = resolverLinkApp(msg.link_secao);
  const tipo = msg.tipo || "aviso";
  const tipoLabel = rotuloTipo(tipo);
  const corpo = stripHtml(msg.mensagem || "");

  const descricao = [
    `**${tipoLabel}**`,
    "",
    corpo || "_(sem conteúdo)_",
    "",
    absLink ? `🔗 **[Abrir no sistema](${absLink})**` : "_Acesse o sistema para mais detalhes._",
  ]
    .join("\n")
    .slice(0, 3800);

  const embed: Record<string, unknown> = {
    title: msg.titulo?.slice(0, 250) || "Nova notificação",
    url: absLink || undefined,
    description: descricao,
    color: corPorTipo(tipo),
    author: {
      name: "Secretaria de Justiça e Cidadania",
      url: APP_URL,
    },
    fields: [
      { name: "Categoria", value: tipoLabel, inline: true },
      {
        name: "Referência",
        value: msg.referencia ? `\`${String(msg.referencia).slice(0, 8)}\`` : "—",
        inline: true,
      },
      ...(absLink ? [{ name: "Link direto", value: absLink, inline: false }] : []),
    ],
    footer: { text: "Sistema Judicial • Notificação automática" },
    timestamp: new Date().toISOString(),
  };

  const content = absLink
    ? `Você recebeu uma nova notificação oficial. Acesse: ${absLink}`
    : undefined;

  return { payload: { content, embeds: [embed] }, absLink };
}

export async function discordFetch(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// Respeita o bloqueio temporário do Discord (429) esperando o retry_after.
export async function discordFetchComRetry(
  path: string,
  token: string,
  init: RequestInit = {},
  tentativas = 2
): Promise<Response> {
  let ultima: Response | null = null;
  for (let i = 0; i < tentativas; i++) {
    const res = await discordFetch(path, token, init);
    if (res.status !== 429) return res;
    ultima = res;
    let espera = Number(res.headers.get("retry-after") || "1");
    try {
      const corpo = await res.json();
      if (corpo?.retry_after) espera = Number(corpo.retry_after);
    } catch {
      /* corpo pode não ser JSON */
    }
    await sleep(Math.min(Math.ceil(espera * 1000) + 250, 15000));
  }
  return ultima as Response;
}

export async function sendDm(
  token: string,
  discordUserId: string,
  msg: DmMessage
): Promise<DmResult> {
  const dmRes = await discordFetchComRetry("/users/@me/channels", token, {
    method: "POST",
    body: JSON.stringify({ recipient_id: discordUserId }),
  });

  if (!dmRes.ok) {
    const detalhe = await dmRes.text().catch(() => "");
    return {
      ok: false,
      status: dmRes.status,
      motivo: `não foi possível abrir o privado (${detalhe.slice(0, 180) || dmRes.status})`,
    };
  }

  const dm = await dmRes.json();
  const { payload } = montarPayloadDm(msg);

  const msgRes = await discordFetchComRetry(`/channels/${dm.id}/messages`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!msgRes.ok) {
    const detalhe = await msgRes.text().catch(() => "");
    return {
      ok: false,
      status: msgRes.status,
      motivo: `mensagem recusada (${detalhe.slice(0, 180) || msgRes.status})`,
    };
  }

  return { ok: true };
}

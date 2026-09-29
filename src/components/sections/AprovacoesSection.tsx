import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { executarAcaoPendente, rotuloTabela, rotuloCampo } from "@/lib/analistaInterceptor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, ClipboardCheck, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

const STATUS_CLS: Record<string, string> = {
  pendente: "bg-gold/10 text-gold-dark",
  aprovada: "bg-primary/10 text-primary",
  rejeitada: "bg-destructive/10 text-destructive",
  erro: "bg-destructive/10 text-destructive",
};

// Campos de texto longo/formatado que devem ser exibidos como o analista os escreveu.
const CAMPOS_FORMATADOS = new Set(["conteudo", "descricao", "fundamentacao", "dispositivo", "ementa", "ata", "relato_bo", "descricao_fatos", "parecer", "justificativa", "motivacao", "pedido"]);

function camposFormatados(payload: any): [string, string][] {
  if (!payload) return [];
  const obj = Array.isArray(payload) ? payload[0] : payload;
  return Object.entries(obj || {})
    .filter(([k, v]) => CAMPOS_FORMATADOS.has(k) && typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => [k, v as string]);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resumo(payload: any) {
  if (!payload) return null;
  const obj = Array.isArray(payload) ? payload[0] : payload;
  return Object.entries(obj || {})
    .filter(([k, v]) => v !== null && v !== "" && typeof v !== "object" && !CAMPOS_FORMATADOS.has(k)
      && !k.endsWith("_id") && k !== "id" && !UUID_RE.test(String(v)))
    .slice(0, 8)
    .map(([k, v]) => `${rotuloCampo(k)}: ${String(v).replace(/<[^>]+>/g, " ").slice(0, 160)}`);
}

// Converte descrições antigas no formato "Criar em movimentacoes" para rótulos amigáveis.
function descricaoAmigavel(a: any): string {
  const d: string = a.descricao || "";
  const m = d.match(/^(\w+) em (.+)$/);
  if (m) return `${m[1]}: ${rotuloTabela(m[2])}`;
  return d || `${a.operacao}: ${rotuloTabela(a.tabela)}`;
}

export default function AprovacoesSection() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin");
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [novoAnalista, setNovoAnalista] = useState("");
  const [novoSupervisor, setNovoSupervisor] = useState("");
  const [aba, setAba] = useState<"pendentes" | "concluidas">("pendentes");

  const { data: acoes = [] } = useQuery({
    queryKey: ["acoes-pendentes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("acoes_pendentes").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["aprov-profiles"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("profiles").select("user_id,nome_completo").order("nome_completo")).data || [],
  });
  const { data: analistaRoles = [] } = useQuery({
    queryKey: ["aprov-analistas"],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("user_roles").select("user_id,role")).data || [],
  });
  const { data: vinculos = [] } = useQuery({
    queryKey: ["analista-vinculos"],
    enabled: !!user,
    queryFn: async () => (await db.from("analista_vinculos").select("*")).data || [],
  });

  const nome = (uid: string) => profiles.find((p: any) => p.user_id === uid)?.nome_completo || uid.slice(0, 8);
  const analistas = [...new Set(analistaRoles.filter((r: any) => r.role === "analista").map((r: any) => r.user_id))] as string[];

  const decidir = useMutation({
    mutationFn: async ({ grupo, aprovar }: { grupo: any[]; aprovar: boolean }) => {
      const gid = grupo[0]?.id;
      for (const a of grupo) {
        if (aprovar) {
          const res: any = await executarAcaoPendente(a);
          if (res?.error) {
            await db.from("acoes_pendentes").update({ status: "erro", erro: res.error.message, decidido_em: new Date().toISOString() }).eq("id", a.id);
            throw new Error(res.error.message);
          }
        }
        const { error } = await db.from("acoes_pendentes").update({
          status: aprovar ? "aprovada" : "rejeitada",
          motivo: motivos[gid] || null,
          decidido_em: new Date().toISOString(),
        }).eq("id", a.id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => { toast.success(v.aprovar ? "Ação aprovada e executada." : "Ação rejeitada."); qc.invalidateQueries(); },
    onError: (e: any) => { toast.error("Falha ao executar: " + e.message); qc.invalidateQueries({ queryKey: ["acoes-pendentes"] }); },
  });

  const vincular = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("analista_vinculos").upsert(
        { analista_id: novoAnalista, supervisor_id: novoSupervisor, created_by: user?.id },
        { onConflict: "analista_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Superior vinculado!"); setNovoAnalista(""); setNovoSupervisor(""); qc.invalidateQueries({ queryKey: ["analista-vinculos"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const desvincular = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("analista_vinculos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analista-vinculos"] }),
  });
  const retirar = useMutation({
    mutationFn: async (grupo: any[]) => {
      const { error } = await db.from("acoes_pendentes").delete().in("id", grupo.map((a) => a.id)).eq("status", "pendente");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Solicitação retirada."); qc.invalidateQueries({ queryKey: ["acoes-pendentes"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Agrupa ações feitas juntas (mesmo grupo) em um único pedido de aprovação.
  const agrupar = (lista: any[]): any[][] => {
    const mapa = new Map<string, any[]>();
    for (const a of lista) {
      const chave = a.grupo_id || a.id;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(a);
    }
    return [...mapa.values()].map((g) => g.sort((x, y) => x.created_at.localeCompare(y.created_at)));
  };

  const paraMim = agrupar(acoes.filter((a) => a.supervisor_id === user?.id || (isAdmin && a.analista_id !== user?.id)));
  const minhas = agrupar(acoes.filter((a) => a.analista_id === user?.id));
  const meuSuperior = vinculos.find((v: any) => v.analista_id === user?.id);

  const Card = ({ grupo, decide }: { grupo: any[]; decide: boolean }) => {
    const primeiro = grupo[0];
    const status = grupo.every((a) => a.status === "pendente") ? "pendente" : primeiro.status;
    const titulo = grupo.length > 1
      ? `${descricaoAmigavel(primeiro)} (+${grupo.length - 1} registro${grupo.length > 2 ? "s" : ""} vinculado${grupo.length > 2 ? "s" : ""})`
      : descricaoAmigavel(primeiro);
    return (
      <div className="bg-card rounded-xl p-4 border border-border shadow-institutional space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground">{titulo}</p>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[status] || ""}`}>{status}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {decide ? `Analista: ${primeiro.analista_nome || "—"} · ` : ""}{new Date(primeiro.created_at).toLocaleString("pt-BR")}
        </p>
        {grupo.map((a, i) => (
          <div key={a.id} className={grupo.length > 1 ? "border-l-2 border-border pl-3 space-y-2" : "space-y-2"}>
            {grupo.length > 1 && <p className="text-xs font-semibold text-foreground">{i + 1}. {descricaoAmigavel(a)}</p>}
            {resumo(a.payload)?.length ? (
              <ul className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2 space-y-0.5">
                {resumo(a.payload)!.map((l) => <li key={l} className="break-words">{l}</li>)}
              </ul>
            ) : null}
            {camposFormatados(a.payload).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{rotuloCampo(k)}</p>
                <div
                  className="text-sm text-foreground bg-muted/40 rounded-lg p-3 prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-1"
                  dangerouslySetInnerHTML={{ __html: v }}
                />
              </div>
            ))}
            {a.erro && <p className="text-xs text-destructive">Erro: {a.erro}</p>}
          </div>
        ))}
        {primeiro.motivo && <p className="text-xs text-foreground">Observação: {primeiro.motivo}</p>}
        {decide && status === "pendente" && (
          <div className="flex gap-2 flex-wrap items-center pt-1">
            <Input placeholder="Observação (opcional)" className="h-8 text-xs rounded-lg flex-1 min-w-40"
              value={motivos[primeiro.id] || ""} onChange={(e) => setMotivos({ ...motivos, [primeiro.id]: e.target.value })} />
            <Button size="sm" className="h-8 rounded-lg" disabled={decidir.isPending} onClick={() => decidir.mutate({ grupo, aprovar: true })}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
            </Button>
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-destructive" disabled={decidir.isPending} onClick={() => decidir.mutate({ grupo, aprovar: false })}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Sub-abas: pendentes de um lado, aprovadas/rejeitadas/erro do outro.
  const Abas = ({ grupos }: { grupos: any[][] }) => {
    const pend = grupos.filter((g) => g.every((a) => a.status === "pendente")).length;
    const conc = grupos.length - pend;
    const cls = (ativo: boolean) =>
      `px-3 py-1 rounded-full text-xs font-semibold transition-colors ${ativo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`;
    return (
      <div className="flex gap-1">
        <button className={cls(aba === "pendentes")} onClick={() => setAba("pendentes")}>Pendentes ({pend})</button>
        <button className={cls(aba === "concluidas")} onClick={() => setAba("concluidas")}>Concluídas ({conc})</button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Aprovações de Analistas</h2>
        <p className="text-sm text-muted-foreground">Toda ação de um analista só é executada depois de aprovada pelo superior vinculado.</p>
      </div>

      {roles.includes("analista") && !isAdmin && (
        <div className="bg-card rounded-xl p-4 border border-border text-sm">
          {meuSuperior ? <>Seu superior: <strong>{meuSuperior.supervisor_nome || "vinculado"}</strong>. Suas ações aguardam aprovação dele.</>
            : <span className="text-destructive">Você ainda não tem superior vinculado. Peça ao administrador.</span>}
        </div>
      )}

      {isAdmin && (
        <div className="bg-card rounded-xl p-4 border border-border shadow-institutional space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Link2 className="h-4 w-4" /> Vincular analista ao superior</p>
          <div className="flex gap-2 flex-wrap">
            <select className="h-9 text-sm rounded-lg border border-border bg-background px-2 flex-1 min-w-48" value={novoAnalista} onChange={(e) => setNovoAnalista(e.target.value)}>
              <option value="">Analista...</option>
              {analistas.map((id) => <option key={id} value={id}>{nome(id)}</option>)}
            </select>
            <select className="h-9 text-sm rounded-lg border border-border bg-background px-2 flex-1 min-w-48" value={novoSupervisor} onChange={(e) => setNovoSupervisor(e.target.value)}>
              <option value="">Superior (promotor, juiz...)</option>
              {profiles.filter((p: any) => p.user_id !== novoAnalista).map((p: any) => <option key={p.user_id} value={p.user_id}>{p.nome_completo}</option>)}
            </select>
            <Button disabled={!novoAnalista || !novoSupervisor || vincular.isPending} onClick={() => vincular.mutate()} className="rounded-lg">Vincular</Button>
          </div>
          {!analistas.length && <p className="text-xs text-muted-foreground">Nenhum usuário com o cargo Analista ainda. Dê o cargo em "Usuários".</p>}
          <div className="space-y-1">
            {vinculos.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between text-xs border-t border-border pt-1">
                <span>{nome(v.analista_id)} → {nome(v.supervisor_id)}</span>
                <button aria-label="Remover vínculo" className="text-destructive" onClick={() => desvincular.mutate(v.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(paraMim.length > 0 || !roles.includes("analista")) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Aguardando minha decisão</h3>
            {paraMim.length > 0 && <Abas grupos={paraMim} />}
          </div>
          {(() => {
            const lista = paraMim.filter((g) => (aba === "pendentes" ? g.every((a) => a.status === "pendente") : !g.every((a) => a.status === "pendente")));
            return lista.length
              ? lista.map((g) => <Card key={g[0].grupo_id || g[0].id} grupo={g} decide />)
              : <p className="text-sm text-muted-foreground">{aba === "pendentes" ? "Nenhuma ação de analista." : "Nenhuma decisão concluída."}</p>;
          })()}
        </div>
      )}

      {minhas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold">Minhas solicitações</h3>
            <Abas grupos={minhas} />
          </div>
          {(() => {
            const lista = minhas.filter((g) => (aba === "pendentes" ? g.every((a) => a.status === "pendente") : !g.every((a) => a.status === "pendente")));
            return lista.length
              ? lista.map((g) => <Card key={g[0].grupo_id || g[0].id} grupo={g} decide={false} />)
              : <p className="text-sm text-muted-foreground">{aba === "pendentes" ? "Nenhuma solicitação pendente." : "Nenhuma decisão concluída."}</p>;
          })()}
        </div>
      )}
    </div>
  );
}

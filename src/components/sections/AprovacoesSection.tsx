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

function resumo(payload: any) {
  if (!payload) return null;
  const obj = Array.isArray(payload) ? payload[0] : payload;
  return Object.entries(obj || {})
    .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
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
    mutationFn: async ({ a, aprovar }: { a: any; aprovar: boolean }) => {
      if (aprovar) {
        const res: any = await executarAcaoPendente(a);
        if (res?.error) {
          await db.from("acoes_pendentes").update({ status: "erro", erro: res.error.message, decidido_em: new Date().toISOString() }).eq("id", a.id);
          throw new Error(res.error.message);
        }
      }
      const { error } = await db.from("acoes_pendentes").update({
        status: aprovar ? "aprovada" : "rejeitada",
        motivo: motivos[a.id] || null,
        decidido_em: new Date().toISOString(),
      }).eq("id", a.id);
      if (error) throw error;
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

  const paraMim = acoes.filter((a) => a.supervisor_id === user?.id || (isAdmin && a.analista_id !== user?.id));
  const minhas = acoes.filter((a) => a.analista_id === user?.id);
  const meuSuperior = vinculos.find((v: any) => v.analista_id === user?.id);

  const Card = ({ a, decide }: { a: any; decide: boolean }) => (
    <div className="bg-card rounded-xl p-4 border border-border shadow-institutional space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium text-foreground">{descricaoAmigavel(a)}</p>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[a.status] || ""}`}>{a.status}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {decide ? `Analista: ${a.analista_nome || "—"} · ` : ""}{new Date(a.created_at).toLocaleString("pt-BR")}
      </p>
      {resumo(a.payload)?.length ? (
        <ul className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2 space-y-0.5">
          {resumo(a.payload)!.map((l) => <li key={l} className="break-words">{l}</li>)}
        </ul>
      ) : null}
      {a.motivo && <p className="text-xs text-foreground">Observação: {a.motivo}</p>}
      {a.erro && <p className="text-xs text-destructive">Erro: {a.erro}</p>}
      {decide && a.status === "pendente" && (
        <div className="flex gap-2 flex-wrap items-center pt-1">
          <Input placeholder="Observação (opcional)" className="h-8 text-xs rounded-lg flex-1 min-w-40"
            value={motivos[a.id] || ""} onChange={(e) => setMotivos({ ...motivos, [a.id]: e.target.value })} />
          <Button size="sm" className="h-8 rounded-lg" disabled={decidir.isPending} onClick={() => decidir.mutate({ a, aprovar: true })}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-destructive" disabled={decidir.isPending} onClick={() => decidir.mutate({ a, aprovar: false })}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
          </Button>
        </div>
      )}
    </div>
  );

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
          <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Aguardando minha decisão</h3>
          {paraMim.length ? paraMim.map((a) => <Card key={a.id} a={a} decide />) : <p className="text-sm text-muted-foreground">Nenhuma ação de analista.</p>}
        </div>
      )}

      {minhas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Minhas solicitações</h3>
          {minhas.map((a) => <Card key={a.id} a={a} decide={false} />)}
        </div>
      )}
    </div>
  );
}

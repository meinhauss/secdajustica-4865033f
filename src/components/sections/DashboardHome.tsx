import { motion } from "framer-motion";
import {
  FileText, Scale, Users, Clock, CheckCircle, Gavel, Send,
  Briefcase, GraduationCap, Stamp, BarChart3, Bell, ArrowRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const JUDICIAL_ROLES = ["admin", "magistrado", "presidente_tribunal", "desembargador", "ministerio_publico", "advogado"];


interface DashboardHomeProps {
  onNavigate?: (section: string) => void;
}

export default function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { profile, roles } = useAuth();

  const isJudicial = roles.some((r) => JUDICIAL_ROLES.includes(r));
  
  const isAdmin = roles.includes("admin");
  const isAdvogado = roles.includes("advogado");
  const isMagistrado = roles.includes("magistrado") || roles.includes("desembargador") || roles.includes("presidente_tribunal");
  const isMP = roles.includes("ministerio_publico");

  const { data: processosCount } = useQuery({
    queryKey: ["dash-processos"], queryFn: async () => {
      const { count } = await supabase.from("processos").select("*", { count: "exact", head: true });
      return count || 0;
    }, enabled: isJudicial || isAdmin,
  });

  const { data: processosConclusos } = useQuery({
    queryKey: ["dash-conclusos"], queryFn: async () => {
      const { count } = await supabase.from("processos").select("*", { count: "exact", head: true }).eq("status", "concluso");
      return count || 0;
    }, enabled: isMagistrado || isAdmin,
  });


  const { data: audienciasCount } = useQuery({
    queryKey: ["dash-audiencias"], queryFn: async () => {
      const { count } = await supabase.from("audiencias").select("*", { count: "exact", head: true }).eq("status", "agendada");
      return count || 0;
    }, enabled: isJudicial || isAdmin,
  });

  const { data: intimacoesPendentes } = useQuery({
    queryKey: ["dash-intimacoes"], queryFn: async () => {
      const { count } = await supabase.from("intimacoes").select("*", { count: "exact", head: true }).eq("status", "pendente");
      return count || 0;
    }, enabled: isJudicial || isAdmin,
  });

  const { data: concursosAbertos } = useQuery({
    queryKey: ["dash-concursos"], queryFn: async () => {
      const { count } = await supabase.from("concursos").select("*", { count: "exact", head: true }).eq("status", "inscricoes_abertas");
      return count || 0;
    },
  });

  const { data: recentMovimentacoes } = useQuery({
    queryKey: ["dash-movimentacoes", profile?.user_id], queryFn: async () => {
      const userId = profile?.user_id;
      if (!userId) return [];

      // Get processo IDs where the user is involved
      const { data: userProcessos } = await supabase.from("processos")
        .select("id")
        .or(`juiz_id.eq.${userId},advogado_autor_id.eq.${userId},advogado_reu_id.eq.${userId}`);
      
      const processoIds = (userProcessos || []).map(p => p.id);
      if (!processoIds.length) return [];

      const { data } = await supabase.from("movimentacoes")
        .select("id, tipo, descricao, created_at, processo_id, autor_id")
        .in("processo_id", processoIds)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!data?.length) return [];
      const autorIds = [...new Set(data.map(m => m.autor_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (autorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, nome_completo").in("user_id", autorIds);
        if (profiles) profiles.forEach(p => { profilesMap[p.user_id] = p.nome_completo; });
      }
      return data.map(m => ({ ...m, autor_nome: m.autor_id ? profilesMap[m.autor_id] || "Usuário do sistema" : "Sistema" }));
    },
    enabled: !!profile?.user_id,
  });

  const { data: recentProcessos } = useQuery({
    queryKey: ["dash-recent-processos", profile?.user_id], queryFn: async () => {
      const userId = profile?.user_id;
      if (!userId) return [];
      const { data } = await supabase.from("processos")
        .select("id, numero, autor_nome, reu_nome, status, classe, assunto")
        .or(`juiz_id.eq.${userId},advogado_autor_id.eq.${userId},advogado_reu_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    }, enabled: !!profile?.user_id,
  });

  const nav = (s: string) => onNavigate?.(s);

  // Build stats cards
  const stats: { label: string; value: number; icon: any; onClick?: string }[] = [];
  if (isJudicial || isAdmin) stats.push({ label: "Processos", value: processosCount ?? 0, icon: FileText, onClick: "processos" });
  if (isMagistrado || isAdmin) stats.push({ label: "Conclusos p/ Decisão", value: processosConclusos ?? 0, icon: Gavel, onClick: "magistrado" });
  
  if (isJudicial || isAdmin) stats.push({ label: "Audiências Agendadas", value: audienciasCount ?? 0, icon: Clock, onClick: "audiencias" });
  if (isJudicial || isAdmin) stats.push({ label: "Intimações Pendentes", value: intimacoesPendentes ?? 0, icon: Bell, onClick: "cartorio" });
  stats.push({ label: "Concursos Abertos", value: concursosAbertos ?? 0, icon: GraduationCap, onClick: "concursos" });

  // Quick actions based on role
  const quickActions: { label: string; icon: any; section: string; desc: string }[] = [];
  if (isJudicial) quickActions.push({ label: "Processos", icon: FileText, section: "processos", desc: "Gerenciar processos judiciais" });
  if (isMagistrado || isAdmin) quickActions.push({ label: "Portal Magistrado", icon: Gavel, section: "magistrado", desc: "Despachos, sentenças e mandados" });
  if (isMP || isAdmin) quickActions.push({ label: "Ministério Público", icon: Scale, section: "mp", desc: "Denúncias e pareceres" });
  
  if (isAdvogado || isAdmin) quickActions.push({ label: "Portal OAB", icon: Briefcase, section: "oab", desc: "Inscrição e carteira digital" });
  if (isJudicial || isAdmin) quickActions.push({ label: "Cartório", icon: Stamp, section: "cartorio", desc: "Protocolos e intimações" });
  if (isJudicial || isAdmin) quickActions.push({ label: "Audiências", icon: Clock, section: "audiencias", desc: "Agenda de audiências" });
  quickActions.push({ label: "Concursos", icon: GraduationCap, section: "concursos", desc: "Editais e inscrições" });
  quickActions.push({ label: "Consultar Credencial", icon: Scale, section: "consulta", desc: "Verificar credenciais de servidores" });

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      novo: "bg-blue-100 text-blue-800", em_andamento: "bg-amber-100 text-amber-800",
      concluso: "bg-emerald-100 text-emerald-800", sentenciado: "bg-purple-100 text-purple-800",
      arquivado: "bg-muted text-muted-foreground", suspenso: "bg-destructive/10 text-destructive",
    };
    return m[s] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Bem-vindo, {profile?.nome_completo?.split(" ")[0] || "Usuário"}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Painel de controle — Secretaria da Justiça e Cidadania — SP
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => stat.onClick && nav(stat.onClick)}
            className="bg-card rounded-xl p-4 shadow-institutional border border-border cursor-pointer hover:border-accent transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="h-4 w-4 text-accent" />
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-tight">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => nav(action.section)}
            className="bg-card rounded-xl p-4 shadow-institutional border border-border cursor-pointer hover:border-accent transition-colors flex flex-col gap-1"
          >
            <action.icon className="h-5 w-5 text-accent mb-1" />
            <span className="text-sm font-semibold text-foreground">{action.label}</span>
            <span className="text-[10px] text-muted-foreground">{action.desc}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Processos */}
        {recentProcessos && recentProcessos.length > 0 && (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Últimos Processos</CardTitle>
              <button onClick={() => nav("processos")} className="text-xs text-primary hover:underline">Ver todos</button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(!recentProcessos || recentProcessos.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum processo registrado.</p>
              )}
              {recentProcessos?.map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg bg-muted/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-foreground">{p.numero}</span>
                    <Badge className={`text-[10px] ${statusColor(p.status)}`}>{p.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.autor_nome} vs {p.reu_nome}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.assunto}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Movimentacoes - only if user has related processes */}
        {recentMovimentacoes && recentMovimentacoes.length > 0 && (
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(!recentMovimentacoes || recentMovimentacoes.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação recente.</p>
            )}
            {recentMovimentacoes?.map((m) => (
              <div key={m.id} className="p-2.5 rounded-lg hover:bg-muted/40 transition-colors border border-border/50">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground whitespace-pre-wrap">{m.descricao}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {" • "}
                      <span className="capitalize">{m.tipo.replace(/_/g, " ")}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground italic mt-0.5">
                      Assinado digitalmente por: <span className="font-semibold text-foreground/70">{(m as any).autor_nome || "Sistema"}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}

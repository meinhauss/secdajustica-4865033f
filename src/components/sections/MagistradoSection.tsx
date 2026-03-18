import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gavel, FileText, Clock, Search, ArrowLeft, ChevronRight,
  Calendar, Shield, Send, BookOpen, BarChart3, Eye,
  CheckCircle, AlertTriangle, Scale, Plus, Stamp, Scroll,
  PenTool, Users, MapPin
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Status configs ─── */
const PROC_STATUS: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-institutional/10 text-institutional" },
  em_andamento: { label: "Em Andamento", color: "bg-gold/10 text-gold-dark" },
  concluso: { label: "Concluso", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400" },
  sentenciado: { label: "Sentenciado", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
  suspenso: { label: "Suspenso", color: "bg-destructive/10 text-destructive" },
};

const MANDADO_TIPOS = [
  { value: "prisao", label: "Mandado de Prisão" },
  { value: "busca_apreensao", label: "Busca e Apreensão" },
  { value: "conducao_coercitiva", label: "Condução Coercitiva" },
  { value: "cautelar", label: "Medida Cautelar" },
  { value: "intimacao", label: "Intimação" },
  { value: "citacao", label: "Citação" },
  { value: "determinacao", label: "Determinação Administrativa" },
];

const AUDIENCIA_TIPOS = [
  "instrução", "julgamento", "conciliação", "custódia", "justificação", "admonitória"
];

/* ─── Stat card ─── */
function StatCard({ label, value, icon: Icon, delay = 0 }: { label: string; value: number; icon: any; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-card rounded-xl p-4 border border-border shadow-institutional">
      <Icon className="h-4 w-4 text-institutional mb-1" />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════ */
/*  MAIN                                       */
/* ═══════════════════════════════════════════ */
export default function MagistradoSection() {
  const { roles } = useAuth();
  const [view, setView] = useState<"dashboard" | "processo-detail">("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (view === "processo-detail" && selectedId) {
    return <ProcessoDetail processoId={selectedId} onBack={() => { setView("dashboard"); setSelectedId(null); }} />;
  }

  return <MagistradoDashboard onSelectProcesso={(id) => { setSelectedId(id); setView("processo-detail"); }} />;
}

/* ═══════════════════════════════════════════ */
/*  DASHBOARD                                  */
/* ═══════════════════════════════════════════ */
function MagistradoDashboard({ onSelectProcesso }: { onSelectProcesso: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filterClasse, setFilterClasse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: processos } = useQuery({
    queryKey: ["mag-processos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").order("prioridade", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: atos } = useQuery({
    queryKey: ["mag-atos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("atos_judiciais").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: audiencias } = useQuery({
    queryKey: ["mag-audiencias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audiencias").select("*").order("data_hora", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: mandados } = useQuery({
    queryKey: ["mag-mandados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mandados").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: sentencas } = useQuery({
    queryKey: ["mag-sentencas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sentencas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const conclusos = processos?.filter((p) => p.status === "concluso") || [];
  const filtered = processos?.filter((p) => {
    const matchSearch = !search ||
      p.numero?.toLowerCase().includes(search.toLowerCase()) ||
      p.autor_nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.reu_nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.assunto?.toLowerCase().includes(search.toLowerCase());
    const matchClasse = filterClasse === "all" || p.classe === filterClasse;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchClasse && matchStatus;
  }) || [];

  const stats = {
    conclusos: conclusos.length,
    total: processos?.length || 0,
    despachos: atos?.length || 0,
    audiencias: audiencias?.length || 0,
    mandados: mandados?.length || 0,
    sentencas: sentencas?.length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Portal do Magistrado</h2>
        <p className="text-sm text-muted-foreground">Gabinete Digital — Processos, despachos, audiências e decisões</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Conclusos" value={stats.conclusos} icon={Gavel} delay={0} />
        <StatCard label="Total Processos" value={stats.total} icon={FileText} delay={0.05} />
        <StatCard label="Despachos" value={stats.despachos} icon={PenTool} delay={0.1} />
        <StatCard label="Audiências" value={stats.audiencias} icon={Calendar} delay={0.15} />
        <StatCard label="Mandados" value={stats.mandados} icon={Stamp} delay={0.2} />
        <StatCard label="Sentenças" value={stats.sentencas} icon={Scroll} delay={0.25} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número, partes ou assunto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={filterClasse} onValueChange={setFilterClasse}>
          <SelectTrigger className="rounded-xl w-full sm:w-44"><SelectValue placeholder="Classe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Classes</SelectItem>
            <SelectItem value="criminal">Criminal</SelectItem>
            <SelectItem value="civil">Civil</SelectItem>
            <SelectItem value="administrativo">Administrativo</SelectItem>
            <SelectItem value="constitucional">Constitucional</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="rounded-xl w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="concluso">Conclusos</SelectItem>
            <SelectItem value="novo">Novos</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="sentenciado">Sentenciados</SelectItem>
            <SelectItem value="suspenso">Suspensos</SelectItem>
            <SelectItem value="arquivado">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="conclusos" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="conclusos" className="rounded-lg text-xs"><Gavel className="h-3 w-3 mr-1" /> Conclusos ({stats.conclusos})</TabsTrigger>
          <TabsTrigger value="todos" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Todos ({filtered.length})</TabsTrigger>
          <TabsTrigger value="despachos" className="rounded-lg text-xs"><PenTool className="h-3 w-3 mr-1" /> Despachos ({stats.despachos})</TabsTrigger>
          <TabsTrigger value="audiencias" className="rounded-lg text-xs"><Calendar className="h-3 w-3 mr-1" /> Audiências ({stats.audiencias})</TabsTrigger>
          <TabsTrigger value="mandados" className="rounded-lg text-xs"><Stamp className="h-3 w-3 mr-1" /> Mandados ({stats.mandados})</TabsTrigger>
          <TabsTrigger value="sentencas" className="rounded-lg text-xs"><Scroll className="h-3 w-3 mr-1" /> Sentenças ({stats.sentencas})</TabsTrigger>
          <TabsTrigger value="estatisticas" className="rounded-lg text-xs"><BarChart3 className="h-3 w-3 mr-1" /> Estatísticas</TabsTrigger>
        </TabsList>

        {/* CONCLUSOS */}
        <TabsContent value="conclusos" className="mt-4">
          <ProcessoList processos={conclusos} onSelect={onSelectProcesso} emptyText="Nenhum processo concluso para decisão." />
        </TabsContent>

        {/* TODOS */}
        <TabsContent value="todos" className="mt-4">
          <ProcessoList processos={filtered} onSelect={onSelectProcesso} emptyText="Nenhum processo encontrado." />
        </TabsContent>

        {/* DESPACHOS */}
        <TabsContent value="despachos" className="mt-4">
          {!atos?.length ? <EmptyState icon={PenTool} text="Nenhum despacho registrado." /> : (
            <div className="space-y-2">
              {atos.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{a.tipo}</span>
                    {a.assinado && <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400">Assinado</span>}
                  </div>
                  <p className="text-sm font-medium text-foreground">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.conteudo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AUDIÊNCIAS */}
        <TabsContent value="audiencias" className="mt-4">
          {!audiencias?.length ? <EmptyState icon={Calendar} text="Nenhuma audiência agendada." /> : (
            <div className="space-y-2">
              {audiencias.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Calendar className="h-4 w-4 text-institutional" />
                    <span className="font-mono text-sm font-semibold text-institutional">{format(new Date(a.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{a.tipo}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${a.status === 'realizada' ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' : a.status === 'cancelada' ? 'bg-destructive/10 text-destructive' : 'bg-gold/10 text-gold-dark'}`}>{a.status}</span>
                  </div>
                  {a.local && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{a.local}</p>}
                  {a.observacoes && <p className="text-xs text-muted-foreground mt-1">{a.observacoes}</p>}
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MANDADOS */}
        <TabsContent value="mandados" className="mt-4">
          {!mandados?.length ? <EmptyState icon={Stamp} text="Nenhum mandado expedido." /> : (
            <div className="space-y-2">
              {mandados.map((m: any, i: number) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Stamp className="h-4 w-4 text-institutional" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{MANDADO_TIPOS.find(t => t.value === m.tipo)?.label || m.tipo}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${m.status === 'cumprido' ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' : m.status === 'devolvido' ? 'bg-muted text-muted-foreground' : 'bg-gold/10 text-gold-dark'}`}>{m.status}</span>
                  </div>
                  <p className="text-sm text-foreground">Destinatário: {m.destinatario_nome}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{m.descricao}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SENTENÇAS */}
        <TabsContent value="sentencas" className="mt-4">
          {!sentencas?.length ? <EmptyState icon={Scroll} text="Nenhuma sentença proferida." /> : (
            <div className="space-y-2">
              {sentencas.map((s: any, i: number) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Scroll className="h-4 w-4 text-gold-dark" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{s.tipo?.replace("_", " ")}</span>
                    {s.assinado && <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400">Assinada</span>}
                  </div>
                  {s.ementa && <p className="text-sm font-medium text-foreground">{s.ementa}</p>}
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{s.dispositivo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ESTATÍSTICAS */}
        <TabsContent value="estatisticas" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Processos Conclusos", value: stats.conclusos },
              { label: "Despachos Proferidos", value: stats.despachos },
              { label: "Audiências Realizadas", value: audiencias?.filter(a => a.status === "realizada").length || 0 },
              { label: "Mandados Expedidos", value: stats.mandados },
              { label: "Sentenças Proferidas", value: stats.sentencas },
              { label: "Processos Sentenciados", value: processos?.filter(p => p.status === "sentenciado").length || 0 },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
                <p className="text-3xl font-bold text-institutional">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  PROCESSO LIST                              */
/* ═══════════════════════════════════════════ */
function ProcessoList({ processos, onSelect, emptyText }: { processos: any[]; onSelect: (id: string) => void; emptyText: string }) {
  if (!processos.length) return <EmptyState icon={FileText} text={emptyText} />;
  return (
    <div className="space-y-2">
      {processos.map((p, i) => {
        const cfg = PROC_STATUS[p.status] || PROC_STATUS.novo;
        return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            onClick={() => onSelect(p.id)}
            className="bg-card rounded-xl p-4 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-institutional">{p.numero}</span>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{p.classe}</span>
                  {p.prioridade && <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Urgente</span>}
                </div>
                <p className="text-sm text-foreground mt-1">{p.autor_nome} vs {p.reu_nome}</p>
                <p className="text-xs text-muted-foreground">{p.assunto}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  PROCESSO DETAIL                            */
/* ═══════════════════════════════════════════ */
function ProcessoDetail({ processoId, onBack }: { processoId: string; onBack: () => void }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<string>("none");

  const { data: processo } = useQuery({
    queryKey: ["mag-proc", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("id", processoId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: movs } = useQuery({
    queryKey: ["mag-movs", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("movimentacoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      const autorIds = [...new Set((data || []).map(m => m.autor_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (autorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, nome_completo").in("user_id", autorIds);
        if (profiles) profiles.forEach(p => { profilesMap[p.user_id] = p.nome_completo; });
      }
      return (data || []).map(m => ({ ...m, autor_nome: m.autor_id ? profilesMap[m.autor_id] || "Usuário do sistema" : "Sistema" }));
    },
  });

  const { data: atos } = useQuery({
    queryKey: ["mag-proc-atos", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("atos_judiciais").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: audiencias } = useQuery({
    queryKey: ["mag-proc-aud", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("audiencias").select("*").eq("processo_id", processoId).order("data_hora", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["mag-proc-docs", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentos_processo").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pareceres } = useQuery({
    queryKey: ["mag-proc-pareceres", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pareceres_mp").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // ── DESPACHO ──
  const [despachoForm, setDespachoForm] = useState({ titulo: "", conteudo: "", tipo: "despacho" });
  const criarDespacho = useMutation({
    mutationFn: async () => {
      if (!despachoForm.titulo || !despachoForm.conteudo) throw new Error("Preencha título e conteúdo.");
      const { error } = await supabase.from("atos_judiciais").insert({
        processo_id: processoId,
        titulo: despachoForm.titulo,
        conteudo: despachoForm.conteudo,
        tipo: despachoForm.tipo,
        autor_id: user!.id,
        autor_nome: profile?.nome_completo || "Magistrado",
        assinado: true,
        data_assinatura: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "despacho",
        descricao: `DESPACHO — ${despachoForm.titulo}\n\n${despachoForm.conteudo}`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setActiveAction("none");
      setDespachoForm({ titulo: "", conteudo: "", tipo: "despacho" });
      toast.success("Despacho proferido e assinado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── AUDIÊNCIA ──
  const [audForm, setAudForm] = useState({ data_hora: "", tipo: "instrução", local: "Sala de Audiências 1", observacoes: "" });
  const designarAudiencia = useMutation({
    mutationFn: async () => {
      if (!audForm.data_hora) throw new Error("Informe data e horário.");
      const { error } = await supabase.from("audiencias").insert({
        processo_id: processoId,
        data_hora: new Date(audForm.data_hora).toISOString(),
        tipo: audForm.tipo,
        local: audForm.local,
        observacoes: audForm.observacoes || null,
      });
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "audiencia_designada",
        descricao: `Audiência de ${audForm.tipo} designada para ${format(new Date(audForm.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}.`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setActiveAction("none");
      setAudForm({ data_hora: "", tipo: "instrução", local: "Sala de Audiências 1", observacoes: "" });
      toast.success("Audiência designada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── MANDADO ──
  const [mandadoForm, setMandadoForm] = useState({ tipo: "intimacao", destinatario_nome: "", descricao: "" });
  const expedirMandado = useMutation({
    mutationFn: async () => {
      if (!mandadoForm.destinatario_nome || !mandadoForm.descricao) throw new Error("Preencha todos os campos.");
      const { error } = await supabase.from("mandados").insert({
        processo_id: processoId,
        magistrado_id: user!.id,
        tipo: mandadoForm.tipo,
        destinatario_nome: mandadoForm.destinatario_nome,
        descricao: mandadoForm.descricao,
      } as any);
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "mandado_expedido",
        descricao: `MANDADO DE ${(MANDADO_TIPOS.find(t => t.value === mandadoForm.tipo)?.label || mandadoForm.tipo).toUpperCase()}\n\nDestinatário: ${mandadoForm.destinatario_nome}\n\n${mandadoForm.descricao}`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setActiveAction("none");
      setMandadoForm({ tipo: "intimacao", destinatario_nome: "", descricao: "" });
      toast.success("Mandado expedido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── SENTENÇA ──
  const [sentencaForm, setSentencaForm] = useState({ tipo: "sentenca", ementa: "", fundamentacao: "", dispositivo: "" });
  const proferirSentenca = useMutation({
    mutationFn: async () => {
      if (!sentencaForm.fundamentacao || !sentencaForm.dispositivo) throw new Error("Fundamentação e dispositivo obrigatórios.");
      const { error } = await supabase.from("sentencas").insert({
        processo_id: processoId,
        magistrado_id: user!.id,
        tipo: sentencaForm.tipo,
        ementa: sentencaForm.ementa || null,
        fundamentacao: sentencaForm.fundamentacao,
        dispositivo: sentencaForm.dispositivo,
        assinado: true,
        data_publicacao: new Date().toISOString(),
      } as any);
      if (error) throw error;
      await supabase.from("processos").update({ status: "sentenciado" as const }).eq("id", processoId);
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "sentenca",
        descricao: `Sentença proferida e publicada.`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setActiveAction("none");
      setSentencaForm({ tipo: "sentenca", ementa: "", fundamentacao: "", dispositivo: "" });
      toast.success("Sentença proferida e publicada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── STATUS UPDATE ──
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("processos").update({ status: status as any }).eq("id", processoId);
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "status",
        descricao: `Status alterado para: ${PROC_STATUS[status]?.label || status}.`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Status atualizado!");
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["mag-proc", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-movs", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-proc-atos", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-proc-aud", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-processos"] });
    queryClient.invalidateQueries({ queryKey: ["mag-atos"] });
    queryClient.invalidateQueries({ queryKey: ["mag-audiencias"] });
    queryClient.invalidateQueries({ queryKey: ["mag-mandados"] });
    queryClient.invalidateQueries({ queryKey: ["mag-sentencas"] });
  };

  if (!processo) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const cfg = PROC_STATUS[processo.status] || PROC_STATUS.novo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-foreground">{processo.numero}</h2>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{processo.classe}</span>
            {processo.prioridade && <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Urgente</span>}
          </div>
          <p className="text-sm text-muted-foreground">{processo.autor_nome} vs {processo.reu_nome}</p>
        </div>
      </div>

      {/* Processo Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoCard label="Assunto" value={processo.assunto} />
        <InfoCard label="Vara" value={processo.vara || "Não definida"} />
        <InfoCard label="Valor da Causa" value={processo.valor_causa ? `R$ ${Number(processo.valor_causa).toLocaleString("pt-BR")}` : "—"} />
        <InfoCard label="Distribuído em" value={format(new Date(processo.created_at), "dd/MM/yyyy", { locale: ptBR })} />
      </div>

      {processo.descricao && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-2">Descrição</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{processo.descricao}</p>
        </div>
      )}

      {/* Quick Status */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
        <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alterar Status</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROC_STATUS).map(([key, val]) => (
            <Button key={key} variant={processo.status === key ? "default" : "outline"} size="sm" className="rounded-lg text-xs"
              onClick={() => updateStatus.mutate(key)} disabled={processo.status === key}>
              {val.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Actions */}
      {activeAction === "none" && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Ações do Magistrado</h3>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setActiveAction("despacho")} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <PenTool className="h-4 w-4 mr-2" /> Despacho
            </Button>
            <Button onClick={() => setActiveAction("audiencia")} variant="outline" className="rounded-xl">
              <Calendar className="h-4 w-4 mr-2" /> Designar Audiência
            </Button>
            <Button onClick={() => setActiveAction("mandado")} variant="outline" className="rounded-xl">
              <Stamp className="h-4 w-4 mr-2" /> Expedir Mandado
            </Button>
            <Button onClick={() => setActiveAction("sentenca")} className="rounded-xl bg-gold hover:bg-gold/90 text-foreground">
              <Scroll className="h-4 w-4 mr-2" /> Proferir Sentença
            </Button>
          </div>
        </div>
      )}

      {/* DESPACHO FORM */}
      {activeAction === "despacho" && (
        <ActionCard title="Proferir Despacho" icon={PenTool} onCancel={() => setActiveAction("none")}>
          <form onSubmit={(e) => { e.preventDefault(); criarDespacho.mutate(); }} className="space-y-4">
            <Select value={despachoForm.tipo} onValueChange={(v) => setDespachoForm({ ...despachoForm, tipo: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="despacho">Despacho</SelectItem>
                <SelectItem value="decisao_interlocutoria">Decisão Interlocutória</SelectItem>
                <SelectItem value="despacho_ordinatorio">Despacho Ordinatório</SelectItem>
                <SelectItem value="determinacao">Determinação</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Título do despacho" value={despachoForm.titulo} onChange={(e) => setDespachoForm({ ...despachoForm, titulo: e.target.value })} className="rounded-xl" required />
            <Textarea placeholder="Conteúdo do despacho..." value={despachoForm.conteudo} onChange={(e) => setDespachoForm({ ...despachoForm, conteudo: e.target.value })} rows={5} className="rounded-xl" required />
            <Button type="submit" disabled={criarDespacho.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              {criarDespacho.isPending ? "Processando..." : "Proferir e Assinar Despacho"}
            </Button>
          </form>
        </ActionCard>
      )}

      {/* AUDIÊNCIA FORM */}
      {activeAction === "audiencia" && (
        <ActionCard title="Designar Audiência" icon={Calendar} onCancel={() => setActiveAction("none")}>
          <form onSubmit={(e) => { e.preventDefault(); designarAudiencia.mutate(); }} className="space-y-4">
            <Input type="datetime-local" value={audForm.data_hora} onChange={(e) => setAudForm({ ...audForm, data_hora: e.target.value })} className="rounded-xl" required />
            <Select value={audForm.tipo} onValueChange={(v) => setAudForm({ ...audForm, tipo: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCIA_TIPOS.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Local / Sala" value={audForm.local} onChange={(e) => setAudForm({ ...audForm, local: e.target.value })} className="rounded-xl" />
            <Textarea placeholder="Observações (opcional)" value={audForm.observacoes} onChange={(e) => setAudForm({ ...audForm, observacoes: e.target.value })} rows={2} className="rounded-xl" />
            <Button type="submit" disabled={designarAudiencia.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              {designarAudiencia.isPending ? "Processando..." : "Designar Audiência"}
            </Button>
          </form>
        </ActionCard>
      )}

      {/* MANDADO FORM */}
      {activeAction === "mandado" && (
        <ActionCard title="Expedir Mandado" icon={Stamp} onCancel={() => setActiveAction("none")}>
          <form onSubmit={(e) => { e.preventDefault(); expedirMandado.mutate(); }} className="space-y-4">
            <Select value={mandadoForm.tipo} onValueChange={(v) => setMandadoForm({ ...mandadoForm, tipo: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MANDADO_TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Nome do destinatário" value={mandadoForm.destinatario_nome} onChange={(e) => setMandadoForm({ ...mandadoForm, destinatario_nome: e.target.value })} className="rounded-xl" required />
            <Textarea placeholder="Descrição e determinações do mandado..." value={mandadoForm.descricao} onChange={(e) => setMandadoForm({ ...mandadoForm, descricao: e.target.value })} rows={4} className="rounded-xl" required />
            <Button type="submit" disabled={expedirMandado.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              {expedirMandado.isPending ? "Processando..." : "Expedir Mandado"}
            </Button>
          </form>
        </ActionCard>
      )}

      {/* SENTENÇA FORM */}
      {activeAction === "sentenca" && (
        <ActionCard title="Proferir Sentença" icon={Scroll} onCancel={() => setActiveAction("none")}>
          <form onSubmit={(e) => { e.preventDefault(); proferirSentenca.mutate(); }} className="space-y-4">
            <Select value={sentencaForm.tipo} onValueChange={(v) => setSentencaForm({ ...sentencaForm, tipo: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sentenca">Sentença</SelectItem>
                <SelectItem value="sentenca_absolutoria">Sentença Absolutória</SelectItem>
                <SelectItem value="sentenca_condenatoria">Sentença Condenatória</SelectItem>
                <SelectItem value="acordao">Acórdão</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Ementa (opcional)" value={sentencaForm.ementa} onChange={(e) => setSentencaForm({ ...sentencaForm, ementa: e.target.value })} className="rounded-xl" />
            <Textarea placeholder="Fundamentação jurídica..." value={sentencaForm.fundamentacao} onChange={(e) => setSentencaForm({ ...sentencaForm, fundamentacao: e.target.value })} rows={6} className="rounded-xl" required />
            <Textarea placeholder="Dispositivo (decisão)..." value={sentencaForm.dispositivo} onChange={(e) => setSentencaForm({ ...sentencaForm, dispositivo: e.target.value })} rows={4} className="rounded-xl" required />
            <Button type="submit" disabled={proferirSentenca.isPending} className="rounded-xl bg-gold hover:bg-gold/90 text-foreground">
              {proferirSentenca.isPending ? "Processando..." : "Proferir e Publicar Sentença"}
            </Button>
          </form>
        </ActionCard>
      )}

      {/* Peças & Pareceres */}
      <Tabs defaultValue="movimentacoes" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="movimentacoes" className="rounded-lg text-xs">Movimentações ({movs?.length || 0})</TabsTrigger>
          <TabsTrigger value="atos" className="rounded-lg text-xs">Atos Judiciais ({atos?.length || 0})</TabsTrigger>
          <TabsTrigger value="audiencias_proc" className="rounded-lg text-xs">Audiências ({audiencias?.length || 0})</TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-lg text-xs">Documentos ({docs?.length || 0})</TabsTrigger>
          <TabsTrigger value="pareceres_mp" className="rounded-lg text-xs">Pareceres MP ({pareceres?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="movimentacoes" className="mt-4">
          {!movs?.length ? <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação.</p> : (
            <div className="space-y-1">
              {movs.map((m) => (
                <div key={m.id} className="bg-secondary/30 rounded-lg p-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{m.tipo?.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(m.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{m.descricao}</p>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                      <PenTool className="h-3 w-3" />
                      Assinado digitalmente por: <span className="font-semibold text-foreground/80">{(m as any).autor_nome || "Sistema"}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="atos" className="mt-4">
          {!atos?.length ? <p className="text-sm text-muted-foreground text-center py-8">Nenhum ato judicial.</p> : (
            <div className="space-y-2">
              {atos.map((a) => (
                <div key={a.id} className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{a.tipo}</span>
                    {a.assinado && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </div>
                  <p className="text-sm font-medium text-foreground">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.conteudo}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audiencias_proc" className="mt-4">
          {!audiencias?.length ? <p className="text-sm text-muted-foreground text-center py-8">Nenhuma audiência.</p> : (
            <div className="space-y-2">
              {audiencias.map((a) => (
                <div key={a.id} className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-institutional flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">{a.tipo} — {format(new Date(a.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    <p className="text-xs text-muted-foreground">{a.local} • {a.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          {!docs?.length ? <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento.</p> : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
                  <FileText className="h-4 w-4 text-institutional flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.nome}</p>
                    <p className="text-xs text-muted-foreground">{d.tipo} • {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pareceres_mp" className="mt-4">
          {!pareceres?.length ? <p className="text-sm text-muted-foreground text-center py-8">Nenhum parecer do MP.</p> : (
            <div className="space-y-2">
              {pareceres.map((p: any) => (
                <div key={p.id} className="bg-secondary/30 rounded-lg p-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{p.tipo}</span>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{p.conteudo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Helper Components ─── */
function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function ActionCard({ title, icon: Icon, onCancel, children }: { title: string; icon: any; onCancel: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl p-5 border-2 border-institutional/30 shadow-institutional">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-institutional" /> {title}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-lg text-xs">Cancelar</Button>
      </div>
      {children}
    </div>
  );
}

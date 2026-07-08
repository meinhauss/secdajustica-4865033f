import { useState, useEffect } from "react";
import { formatPartesShort, parsePartesFromString } from "@/lib/formatPartes";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor, RichTextView } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gavel, FileText, Clock, Search, ArrowLeft, ChevronRight,
  Calendar, Shield, Send, BookOpen, BarChart3, Eye,
  CheckCircle, AlertTriangle, Scale, Plus, Stamp, Scroll,
  PenTool, Users, MapPin, ShieldAlert, Lock, User, Megaphone, UserPlus, Trash2, X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PodiumDestaque } from "@/components/PodiumDestaque";
import { normalizeRichText } from "@/lib/sanitize";
import ModeloPicker from "@/components/ModeloPicker";
import AISugerirDespacho from "@/components/AISugerirDespacho";
import AIGerarEmenta from "@/components/AIGerarEmenta";
import { extrairNomes, type ModeloContext } from "@/lib/modelosVars";
import { analisarDespacho } from "@/lib/assistente/bus";

const textoToHtml = (t: string) => t.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
const appendHtml = (prev: string, add: string) => (prev && prev !== "<p></p>" ? prev + add : add);

/* ─── Profile Lookup Hook ─── */
function useProfileLookup() {
  const [result, setResult] = useState<{ nome_completo: string; id_personagem: string } | null>(null);
  const lookup = async (idPersonagem: string) => {
    setResult(null);
    if (!idPersonagem) return null;
    const { data } = await supabase.from("profiles").select("nome_completo, id_personagem").eq("id_personagem", idPersonagem).maybeSingle();
    if (data) setResult({ nome_completo: data.nome_completo, id_personagem: data.id_personagem || "" });
    return data;
  };
  return { result, lookup, clear: () => setResult(null) };
}

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

const SIGILO_LABELS: Record<string, string> = {
  publico: "Público",
  segredo_justica: "Segredo de Justiça",
  sigilo_absoluto: "Sigilo Absoluto",
};

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterClasse, setFilterClasse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Recesso state
  const { data: profile } = useQuery({
    queryKey: ["mag-profile-recesso", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, recesso").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleRecesso = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase.from("profiles").update({ recesso: val }).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: (_, val) => {
      queryClient.invalidateQueries({ queryKey: ["mag-profile-recesso"] });
      toast.success(val ? "Recesso ativado — você foi removido do sorteio." : "Recesso desativado — você voltou ao sorteio.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: processos } = useQuery({
    queryKey: ["mag-processos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("juiz_id", user!.id).order("prioridade", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const processoIds = processos?.map(p => p.id) || [];

  const { data: atos } = useQuery({
    queryKey: ["mag-atos", user?.id],
    queryFn: async () => {
      if (!processoIds.length) return [];
      const { data, error } = await supabase.from("atos_judiciais").select("*").in("processo_id", processoIds).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!processos,
  });

  const { data: audiencias } = useQuery({
    queryKey: ["mag-audiencias", user?.id],
    queryFn: async () => {
      if (!processoIds.length) return [];
      const { data, error } = await supabase.from("audiencias").select("*").in("processo_id", processoIds).order("data_hora", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!processos,
  });

  const { data: mandados } = useQuery({
    queryKey: ["mag-mandados", user?.id],
    queryFn: async () => {
      if (!processoIds.length) return [];
      const { data, error } = await supabase.from("mandados").select("*").in("processo_id", processoIds).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!processos,
  });

  const { data: sentencas } = useQuery({
    queryKey: ["mag-sentencas", user?.id],
    queryFn: async () => {
      if (!processoIds.length) return [];
      const { data, error } = await supabase.from("sentencas").select("*").in("processo_id", processoIds).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!processos,
  });

  const conclusos = processos?.filter((p) => p.status === "concluso") || [];
  const emAndamento = processos?.filter((p) => p.status === "em_andamento") || [];
  const arquivados = processos?.filter((p) => p.status === "arquivado") || [];
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
    em_andamento: emAndamento.length,
    arquivados: arquivados.length,
    total: processos?.length || 0,
    audiencias: audiencias?.length || 0,
    mandados: mandados?.length || 0,
    sentencas: sentencas?.length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Portal do Juiz de Direito</h2>
          <p className="text-sm text-muted-foreground">Gabinete Digital — Processos, despachos, audiências e decisões</p>
        </div>
        <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-2.5 border border-border shadow-institutional">
          <div className="text-right">
            <p className="text-xs font-semibold text-foreground">Recesso</p>
            <p className="text-[10px] text-muted-foreground">{profile?.recesso ? "Fora do sorteio" : "Ativo no sorteio"}</p>
          </div>
          <Switch
            checked={profile?.recesso ?? false}
            onCheckedChange={(val) => toggleRecesso.mutate(val)}
            disabled={toggleRecesso.isPending}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Conclusos" value={stats.conclusos} icon={Gavel} delay={0} />
        <StatCard label="Total Processos" value={stats.total} icon={FileText} delay={0.05} />
        <StatCard label="Em Andamento" value={stats.em_andamento} icon={Clock} delay={0.1} />
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
      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="todos" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Todos ({filtered.length})</TabsTrigger>
          <TabsTrigger value="conclusos" className="rounded-lg text-xs"><Gavel className="h-3 w-3 mr-1" /> Conclusos ({stats.conclusos})</TabsTrigger>
          <TabsTrigger value="em_andamento" className="rounded-lg text-xs"><Clock className="h-3 w-3 mr-1" /> Em Andamento ({stats.em_andamento})</TabsTrigger>
          <TabsTrigger value="arquivados" className="rounded-lg text-xs"><Shield className="h-3 w-3 mr-1" /> Arquivados ({stats.arquivados})</TabsTrigger>
          <TabsTrigger value="audiencias" className="rounded-lg text-xs"><Calendar className="h-3 w-3 mr-1" /> Audiências ({stats.audiencias})</TabsTrigger>
          <TabsTrigger value="mandados" className="rounded-lg text-xs"><Stamp className="h-3 w-3 mr-1" /> Mandados ({stats.mandados})</TabsTrigger>
          <TabsTrigger value="sentencas" className="rounded-lg text-xs"><Scroll className="h-3 w-3 mr-1" /> Sentenças ({stats.sentencas})</TabsTrigger>
          <TabsTrigger value="ranking" className="rounded-lg text-xs"><Scale className="h-3 w-3 mr-1" /> Ranking</TabsTrigger>
        </TabsList>

        {/* TODOS */}
        <TabsContent value="todos" className="mt-4">
          <ProcessoList processos={filtered} onSelect={onSelectProcesso} emptyText="Nenhum processo encontrado." />
        </TabsContent>

        {/* CONCLUSOS */}
        <TabsContent value="conclusos" className="mt-4">
          <ProcessoList processos={conclusos} onSelect={onSelectProcesso} emptyText="Nenhum processo concluso para decisão." />
        </TabsContent>

        {/* EM ANDAMENTO */}
        <TabsContent value="em_andamento" className="mt-4">
          <ProcessoList processos={emAndamento} onSelect={onSelectProcesso} emptyText="Nenhum processo em andamento." />
        </TabsContent>

        {/* ARQUIVADOS */}
        <TabsContent value="arquivados" className="mt-4">
          <ProcessoList processos={arquivados} onSelect={onSelectProcesso} emptyText="Nenhum processo arquivado." />
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
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{m.tipo.includes("+") ? m.tipo.split("+").map((t: string) => MANDADO_TIPOS.find(mt => mt.value === t)?.label || t).join(" + ") : (MANDADO_TIPOS.find(t => t.value === m.tipo)?.label || m.tipo)}</span>
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

        {/* RANKING */}
        <TabsContent value="ranking" className="mt-4">
          <MagistradoRanking />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  MAGISTRADO RANKING                         */
/* ═══════════════════════════════════════════ */
function MagistradoRanking() {
  const { data: ranking, isLoading } = useQuery({
    queryKey: ["magistrado-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_magistrado_ranking");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const CARGO_LABELS: Record<string, string> = {
    magistrado: "Juiz(a) de Direito",
    desembargador: "Desembargador(a)",
    presidente_tribunal: "Presidente do Tribunal",
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando ranking...</div>;
  if (!ranking?.length) return <EmptyState icon={Scale} text="Nenhum magistrado com atividade registrada." />;

  return (
    <div className="space-y-4">
      <PodiumDestaque tipoRanking="magistrado" fallbackIcon={<Gavel className="h-6 w-6 text-gold-dark" />} />

      <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
        <h3 className="font-display text-lg font-bold text-foreground mb-1">Sistema de Pontuação</h3>
        <p className="text-[10px] text-muted-foreground mb-2">Pontos zerados toda sexta-feira. O líder da semana recebe o título de Servidor Destaque.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span>📋 Processo atribuído: <strong className="text-foreground">10 pts</strong></span>
          <span>📜 Sentença proferida: <strong className="text-foreground">25 pts</strong></span>
          <span>⚖️ Trânsito em julgado: <strong className="text-foreground">50 pts</strong></span>
          <span>🎙️ Audiência realizada: <strong className="text-foreground">15 pts</strong></span>
          <span>⚡ Sentença rápida (&lt;24h): <strong className="text-foreground">+20 pts</strong></span>
          <span>📑 Acórdão proferido: <strong className="text-foreground">30 pts</strong></span>
        </div>
      </div>

      <div className="space-y-2">
        {ranking.map((m: any, i: number) => (
          <motion.div key={m.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`bg-card rounded-xl p-4 border shadow-institutional ${i === 0 ? 'border-gold ring-1 ring-gold/20' : i === 1 ? 'border-gray-400 dark:border-gray-500' : i === 2 ? 'border-amber-600 dark:border-amber-700' : 'border-border'}`}>
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-gold/20 text-gold-dark' : i === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : i === 2 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-secondary text-muted-foreground'}`}>
                {i + 1}º
              </div>
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-institutional/10 flex items-center justify-center">
                  <Gavel className="h-5 w-5 text-institutional" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{m.nome_completo}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-institutional/10 text-institutional font-semibold">
                    {CARGO_LABELS[m.cargo] || m.cargo}
                  </span>
                </div>
                {m.id_personagem && <span className="text-[10px] text-muted-foreground">ID: {m.id_personagem}</span>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                  <span>{m.processos_count} {Number(m.processos_count) === 1 ? 'processo' : 'processos'}</span>
                  <span>•</span>
                  <span>{m.sentencas} {Number(m.sentencas) === 1 ? 'sentença' : 'sentenças'}</span>
                  <span>•</span>
                  <span>{m.transito_julgado} trânsito(s) em julgado</span>
                  {Number(m.sentencas_rapidas) > 0 && <><span>•</span><span className="text-green-600 dark:text-green-400">⚡ {m.sentencas_rapidas} rápida(s)</span></>}
                  {Number(m.audiencias_realizadas) > 0 && <><span>•</span><span>{m.audiencias_realizadas} audiência(s)</span></>}
                  {Number(m.acordaos) > 0 && <><span>•</span><span>{m.acordaos} acórdão(s)</span></>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-bold text-institutional">{Number(m.score)}</span>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
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
                <p className="text-sm text-foreground mt-1">{formatPartesShort(p.autor_nome)} vs {formatPartesShort(p.reu_nome)}</p>
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
  const { user, profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<string>("none");

  // Helper to get judge name reliably (profile may not be loaded yet)
  const getJudgeName = async (): Promise<string> => {
    if (profile?.nome_completo) return profile.nome_completo;
    if (!user?.id) return "Magistrado(a)";
    const { data } = await supabase.from("profiles").select("nome_completo").eq("user_id", user.id).maybeSingle();
    return data?.nome_completo || "Magistrado(a)";
  };

  const { data: processo } = useQuery({
    queryKey: ["mag-proc", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("id", processoId).single();
      if (error) throw error;
      return data;
    },
  });

  // Judge profile lookup
  const { data: juizProfile } = useQuery({
    queryKey: ["mag-juiz-profile", processo?.juiz_id],
    queryFn: async () => {
      if (!processo?.juiz_id) return null;
      const { data } = await supabase.from("profiles").select("nome_completo").eq("user_id", processo.juiz_id).maybeSingle();
      return data;
    },
    enabled: !!processo?.juiz_id,
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

  const pareceres: any[] = [];

  // Procuracoes
  const { data: procuracoes } = useQuery({
    queryKey: ["mag-procuracoes", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("procuracoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[] || [];
    },
  });

  // Interessados
  const { data: interessadosData } = useQuery({
    queryKey: ["mag-interessados", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("interessados_processo").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map(i => i.user_id))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, nome_completo").in("user_id", userIds);
        if (profiles) profiles.forEach(p => { profilesMap[p.user_id] = p.nome_completo; });
      }
      return (data || []).map(i => ({ ...i, nome: profilesMap[i.user_id] || "Usuário" }));
    },
  });

  // Sentenças
  const { data: sentencasProc } = useQuery({
    queryKey: ["mag-sentencas-proc", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sentencas").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Apelações
  const { data: apelacoesProc } = useQuery({
    queryKey: ["mag-apelacoes-proc", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("apelacoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Embargos de declaração
  const { data: embargosProc } = useQuery({
    queryKey: ["mag-embargos-proc", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("embargos_declaracao").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const { data: prazos } = useQuery({
    queryKey: ["mag-prazos", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("prazos_processuais").select("*").eq("processo_id", processoId).order("data_fim", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Certidões
  const { data: certidoes } = useQuery({
    queryKey: ["mag-certidoes", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificacoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Advogados from procuracoes
  const advAutor = procuracoes?.filter((p: any) => p.status === "ativa" && p.parte === "autor") || [];
  const advReu = procuracoes?.filter((p: any) => p.status === "ativa" && p.parte === "reu") || [];

  // ── DESPACHO ──
  const [despachoForm, setDespachoForm] = useState({ titulo: "", conteudo: "", tipo: "despacho" });
  const criarDespacho = useMutation({
    mutationFn: async () => {
      if (!despachoForm.conteudo) throw new Error("Preencha o conteúdo.");
      const tipoLabel = despachoForm.tipo === "decisao_interlocutoria" ? "Decisão Interlocutória" : despachoForm.tipo === "despacho_ordinatorio" ? "Despacho Ordinatório" : despachoForm.tipo === "determinacao" ? "Determinação" : "Despacho";
      despachoForm.titulo = tipoLabel;
      const judgeName = await getJudgeName();
      const { error } = await supabase.from("atos_judiciais").insert({
        processo_id: processoId,
        titulo: despachoForm.titulo,
        conteudo: despachoForm.conteudo,
        tipo: despachoForm.tipo,
        autor_id: user!.id,
        autor_nome: judgeName,
        assinado: true,
        data_assinatura: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "despacho",
        descricao: despachoForm.conteudo,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      const conteudo = despachoForm.conteudo;
      setActiveAction("none");
      setDespachoForm({ titulo: "", conteudo: "", tipo: "despacho" });
      toast.success("Despacho proferido e assinado!");
      analisarDespacho({
        conteudo,
        processoId,
        onEmitirAtoCartorio: () => setActiveAction("cartorio"),
      });
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
  const [mandadoForm, setMandadoForm] = useState({ tipos: [] as string[], destinatarios: [{ id: "", nome: "" }] as { id: string; nome: string }[], descricao: "" });
  const toggleMandadoTipo = (val: string) => {
    setMandadoForm(f => ({
      ...f,
      tipos: f.tipos.includes(val) ? f.tipos.filter(t => t !== val) : [...f.tipos, val],
    }));
  };
  const addDestinatario = () => setMandadoForm(f => ({ ...f, destinatarios: [...f.destinatarios, { id: "", nome: "" }] }));
  const removeDestinatario = (idx: number) => setMandadoForm(f => ({ ...f, destinatarios: f.destinatarios.filter((_, i) => i !== idx) }));
  const updateDestinatario = (idx: number, field: "id" | "nome", value: string) => {
    setMandadoForm(f => {
      const dest = [...f.destinatarios];
      dest[idx] = { ...dest[idx], [field]: value };
      return { ...f, destinatarios: dest };
    });
  };
  const mandadoLookup = useProfileLookup();
  const expedirMandado = useMutation({
    mutationFn: async () => {
      const validDest = mandadoForm.destinatarios.filter(d => d.nome.trim());
      if (validDest.length === 0 || !mandadoForm.descricao) throw new Error("Preencha todos os campos.");
      if (mandadoForm.tipos.length === 0) throw new Error("Selecione pelo menos um tipo de mandado.");
      const tipoStr = mandadoForm.tipos.join("+");
      const tipoLabel = mandadoForm.tipos.map(t => MANDADO_TIPOS.find(mt => mt.value === t)?.label || t).join(" + ");
      const allNames = validDest.map(d => d.nome).join(", ");
      const rows = validDest.map(d => ({
        processo_id: processoId,
        magistrado_id: user!.id,
        tipo: tipoStr,
        destinatario_nome: d.nome,
        descricao: mandadoForm.descricao,
      }));
      const { error } = await supabase.from("mandados").insert(rows as any);
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "mandado_expedido",
        descricao: `MANDADO DE ${tipoLabel.toUpperCase()}\n\nDestinatário(s): ${allNames}\n\n${mandadoForm.descricao}`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setActiveAction("none");
      setMandadoForm({ tipos: [], destinatarios: [{ id: "", nome: "" }], descricao: "" });
      mandadoLookup.clear();
      toast.success("Mandado(s) expedido(s)!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── INTIMAR CARGO ──
  const CARGOS_INTIMAVEIS: { value: string; label: string }[] = [
    { value: "ministerio_publico", label: "Promotor(a) de Justiça" },
    { value: "advogado", label: "Advogado(a)" },
    { value: "oficial_justica", label: "Oficial de Justiça" },
    { value: "delegado", label: "Delegado(a)" },
    { value: "policia_civil", label: "Polícia Civil" },
    { value: "policia_militar", label: "Polícia Militar" },
    { value: "policia_federal", label: "Polícia Federal" },
    { value: "hospital", label: "Hospital" },
    { value: "detran", label: "DETRAN" },
    { value: "presidente_oab", label: "Presidente da OAB" },
    { value: "procurador_geral", label: "Procurador(a)-Geral" },
    { value: "procurador_estado", label: "Procurador(a) Geral do Estado" },
    { value: "desembargador", label: "Desembargador(a)" },
    { value: "presidente_tribunal", label: "Presidente do Tribunal" },
  ];
  const [cargoIntForm, setCargoIntForm] = useState({ cargo: "ministerio_publico", conteudo: "", prazo: "24" });
  const intimarCargo = useMutation({
    mutationFn: async () => {
      if (!cargoIntForm.conteudo) throw new Error("Preencha o conteúdo da intimação.");
      const cargoLabel = CARGOS_INTIMAVEIS.find(c => c.value === cargoIntForm.cargo)?.label || cargoIntForm.cargo;
      // Insert intimação record
      await supabase.from("intimacoes").insert({
        processo_id: processoId,
        destinatario_nome: `Cargo: ${cargoLabel}`,
        conteudo: cargoIntForm.conteudo,
        tipo: "intimacao",
        prazo_dias: parseInt(cargoIntForm.prazo) || 24,
        cargo_intimado: cargoIntForm.cargo,
      } as any);
      // Register movimentação
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "intimacao",
        descricao: `INTIMAÇÃO AO CARGO: ${cargoLabel}\n\nPrazo: ${cargoIntForm.prazo} horas\n\n${cargoIntForm.conteudo}`,
        autor_id: user!.id,
      });
      // Notify all users with that role
      await supabase.rpc("notify_cargo_intimacao", {
        _processo_id: processoId,
        _cargo: cargoIntForm.cargo as any,
        _conteudo: cargoIntForm.conteudo,
        _autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setActiveAction("none");
      setCargoIntForm({ cargo: "ministerio_publico", conteudo: "", prazo: "24" });
      toast.success("Intimação ao cargo expedida! Todos os servidores com esse cargo foram notificados.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── CONCEDER ACESSO SIGILO ──
  const [acessoIdPersonagem, setAcessoIdPersonagem] = useState("");
  const acessoLookup = useProfileLookup();
  const concederAcesso = useMutation({
    mutationFn: async () => {
      if (!acessoLookup.result) throw new Error("Busque um usuário pelo ID do Personagem primeiro.");
      // Find user_id from id_personagem
      const { data: profileData } = await supabase.from("profiles").select("user_id, nome_completo").eq("id_personagem", acessoIdPersonagem).maybeSingle();
      if (!profileData) throw new Error("Usuário não encontrado com esse ID.");
      // Check if already has access
      const { data: existing } = await supabase.from("interessados_processo").select("id").eq("processo_id", processoId).eq("user_id", profileData.user_id).maybeSingle();
      if (existing) throw new Error("Este usuário já possui acesso a este processo.");
      const { error } = await supabase.from("interessados_processo").insert({
        processo_id: processoId,
        user_id: profileData.user_id,
        orgao: profileData.nome_completo,
        qualificacao: "acesso_autorizado",
      });
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "acesso_concedido",
        descricao: `Acesso ao processo sigiloso concedido a ${profileData.nome_completo} (ID: ${acessoIdPersonagem}).`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setAcessoIdPersonagem("");
      acessoLookup.clear();
      toast.success("Acesso concedido com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });
  const revogarAcesso = useMutation({
    mutationFn: async (interessadoId: string) => {
      const { data: int } = await supabase.from("interessados_processo").select("*").eq("id", interessadoId).single();
      await supabase.from("interessados_processo").delete().eq("id", interessadoId);
      if (int) {
        await supabase.from("movimentacoes").insert({
          processo_id: processoId,
          tipo: "acesso_revogado",
          descricao: `Acesso ao processo sigiloso revogado de ${int.orgao}.`,
          autor_id: user!.id,
        });
      }
    },
    onSuccess: () => { invalidateAll(); toast.success("Acesso revogado."); },
    onError: (err: any) => toast.error(err.message),
  });

  // ── SENTENÇA ──
  const [sentencaForm, setSentencaForm] = useState({ tipo: "sentenca", ementa: "", fundamentacao: "", dispositivo: "" });
  const proferirSentenca = useMutation({
    mutationFn: async () => {
      if (!sentencaForm.fundamentacao || !sentencaForm.dispositivo) throw new Error("Fundamentação e dispositivo obrigatórios.");
      const fundamentacaoHtml = normalizeRichText(sentencaForm.fundamentacao);
      const dispositivoHtml = normalizeRichText(sentencaForm.dispositivo);
      const { error } = await supabase.from("sentencas").insert({
        processo_id: processoId,
        magistrado_id: user!.id,
        tipo: sentencaForm.tipo,
        ementa: sentencaForm.ementa || null,
        fundamentacao: fundamentacaoHtml,
        dispositivo: dispositivoHtml,
        assinado: true,
        data_publicacao: new Date().toISOString(),
      } as any);
      if (error) throw error;
      await supabase.from("processos").update({ status: "sentenciado" as const }).eq("id", processoId);
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "sentenca",
        descricao: `<h2>SENTENÇA</h2>${sentencaForm.ementa ? `<p><strong>Ementa:</strong> ${normalizeRichText(sentencaForm.ementa)}</p>` : ""}<p><strong>Fundamentação:</strong></p>${fundamentacaoHtml}<p><strong>Dispositivo:</strong></p>${dispositivoHtml}`,
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

  // ── SIGILO UPDATE ──
  const updateSigilo = useMutation({
    mutationFn: async (sigilo: string) => {
      const { error } = await supabase.from("processos").update({ sigilo } as any).eq("id", processoId);
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "sigilo",
        descricao: `Sigilo do processo alterado para: ${SIGILO_LABELS[sigilo] || sigilo}.`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Sigilo atualizado!");
    },
  });

  // ── SUSPEIÇÃO ──
  const declararSuspeicao = useMutation({
    mutationFn: async (justificativa: string) => {
      if (!justificativa) throw new Error("Informe a justificativa.");
      const judgeName = await getJudgeName();
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "suspeicao",
        descricao: `DECLARAÇÃO DE SUSPEIÇÃO\n\nO(A) Magistrado(a) ${judgeName} declarou-se suspeito(a) para atuar neste processo.\n\nJustificativa: ${justificativa}`,
        autor_id: user!.id,
      });
      const { data: newJudgeId, error: sortError } = await supabase.rpc("sortear_magistrado");
      if (sortError) throw sortError;
      const { error } = await supabase.from("processos").update({ juiz_id: newJudgeId } as any).eq("id", processoId);
      if (error) throw error;
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "redistribuicao",
        descricao: `Processo redistribuído por sorteio a novo magistrado em razão de declaração de suspeição.`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Suspeição declarada. Processo redistribuído a novo magistrado.");
      onBack();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── ATOS DO CARTÓRIO ──
  const [cartorioForm, setCartorioForm] = useState({ tipo: "juntada", titulo: "", conteudo: "", anexo_urls: [""] });
  const createAtoCartorio = useMutation({
    mutationFn: async () => {
      if (!cartorioForm.titulo || !cartorioForm.conteudo) throw new Error("Preencha título e conteúdo.");
      const autorNome = "Escrevente Técnico Judiciário Abel Haus";
      const { error } = await supabase.from("atos_judiciais").insert({
        processo_id: processoId, tipo: cartorioForm.tipo, titulo: cartorioForm.titulo, conteudo: cartorioForm.conteudo,
        autor_id: null, autor_nome: autorNome, assinado: true, data_assinatura: new Date().toISOString(),
      });
      if (error) throw error;
      const validUrls = cartorioForm.anexo_urls.filter((url) => url.trim());
      if (validUrls.length > 0) {
        const { error: docsError } = await supabase.from("documentos_processo").insert(
          validUrls.map((url, idx) => ({
            processo_id: processoId,
            nome: validUrls.length > 1 ? `${cartorioForm.titulo} — Anexo ${idx + 1}` : cartorioForm.titulo,
            tipo: cartorioForm.tipo === "juntada" ? "certidao" : "outros",
            arquivo_url: url,
            autor_id: null,
          }))
        );
        if (docsError) throw docsError;
      }
      await supabase.from("movimentacoes").insert({
        processo_id: processoId, tipo: cartorioForm.tipo,
        descricao: `${cartorioForm.tipo === "juntada" ? "JUNTADA" : "ATO ORDINATÓRIO"} — ${cartorioForm.titulo}\n\n${cartorioForm.conteudo}\n\nAssinado por: ${autorNome}`,
        autor_id: null,
      });
    },
    onSuccess: () => {
      invalidateAll();
      setActiveAction("none");
      setCartorioForm({ tipo: "juntada", titulo: "", conteudo: "", anexo_urls: [""] });
      toast.success("Ato do Cartório registrado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addCartorioLink = () => {
    setCartorioForm((prev) => ({ ...prev, anexo_urls: [...prev.anexo_urls, ""] }));
  };

  const removeCartorioLink = (index: number) => {
    setCartorioForm((prev) => ({
      ...prev,
      anexo_urls: prev.anexo_urls.length === 1 ? [""] : prev.anexo_urls.filter((_, idx) => idx !== index),
    }));
  };

  const updateCartorioLink = (index: number, value: string) => {
    setCartorioForm((prev) => ({
      ...prev,
      anexo_urls: prev.anexo_urls.map((url, idx) => (idx === index ? value : url)),
    }));
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["mag-proc", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-movs", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-proc-atos", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-proc-aud", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-procuracoes", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-interessados", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-sentencas-proc", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-apelacoes-proc", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-prazos", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-certidoes", processoId] });
    queryClient.invalidateQueries({ queryKey: ["mag-processos"] });
    queryClient.invalidateQueries({ queryKey: ["mag-atos"] });
    queryClient.invalidateQueries({ queryKey: ["mag-audiencias"] });
    queryClient.invalidateQueries({ queryKey: ["mag-mandados"] });
    queryClient.invalidateQueries({ queryKey: ["mag-sentencas"] });
  };

  if (!processo) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const cfg = PROC_STATUS[processo.status] || PROC_STATUS.novo;

  const modeloCtx: ModeloContext = {
    numero_processo: processo?.numero,
    nome_autor: extrairNomes(processo?.autor_nome),
    nome_reu: extrairNomes(processo?.reu_nome),
    nome_usuario: profile?.nome_completo || "",
    juiz: profile?.nome_completo || "",
    classe: processo?.classe,
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>

      {/* ═══ CABEÇALHO DO PROCESSO ═══ */}
      <div className="bg-card rounded-xl border border-border shadow-institutional overflow-hidden">
        {/* Top bar with number and status */}
        <div className="bg-institutional/5 border-b border-border px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Nº do Processo</p>
            <h2 className="font-display text-xl font-bold text-foreground font-mono">{processo.numero}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{processo.classe}</span>
            {processo.prioridade && <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Urgente</span>}
            {(processo as any).sigilo && (processo as any).sigilo !== "publico" && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                <Lock className="h-3 w-3" /> {SIGILO_LABELS[(processo as any).sigilo] || (processo as any).sigilo}
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Dados do processo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Data de Autuação</p>
              <p className="text-sm font-medium text-foreground">{format(new Date(processo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Situação</p>
              <p className="text-sm font-medium text-foreground">{cfg.label}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Órgão Julgador</p>
              <p className="text-sm font-medium text-foreground">{processo.vara || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Juiz(a)</p>
              <p className="text-sm font-medium text-foreground">{juizProfile?.nome_completo || "Não atribuído"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Classe Processual</p>
              <p className="text-sm font-medium text-foreground capitalize">{processo.classe}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Assunto</p>
              <p className="text-sm font-medium text-foreground">{processo.assunto}</p>
            </div>
          </div>

          {/* Partes e Representantes */}
          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Partes e Representantes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Autor</p>
                {parsePartesFromString(processo.autor_nome).map((p, idx) => (
                  <p key={idx} className="text-sm font-medium text-foreground">
                    {p.nome}{p.id_personagem ? <span className="text-xs text-muted-foreground ml-1">(ID: {p.id_personagem})</span> : ""}
                  </p>
                ))}
                {advAutor.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {advAutor.map((a: any) => (
                      <p key={a.id} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3 text-institutional" /> Adv. {a.advogado_nome}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Réu</p>
                {parsePartesFromString(processo.reu_nome).map((p, idx) => (
                  <p key={idx} className="text-sm font-medium text-foreground">
                    {p.nome}{p.id_personagem ? <span className="text-xs text-muted-foreground ml-1">(ID: {p.id_personagem})</span> : ""}
                  </p>
                ))}
                {advReu.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {advReu.map((a: any) => (
                      <p key={a.id} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3 text-institutional" /> Adv. {a.advogado_nome}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interessados */}
          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Interessados</h3>
            <div className="flex flex-wrap gap-2">
              {processo.classe === "criminal" && (
                <span className="text-xs px-3 py-1.5 rounded-lg bg-institutional/10 text-institutional font-medium flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> Ministério Público (parte)
                </span>
              )}
              {interessadosData && interessadosData.length > 0 ? interessadosData.map((int: any) => (
                <span key={int.id} className="text-xs px-3 py-1.5 rounded-lg bg-institutional/10 text-institutional font-medium flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> {int.orgao} — {int.nome} ({int.qualificacao})
                </span>
              )) : null}
              {(!interessadosData || interessadosData.length === 0) && processo.classe !== "criminal" && (
                <p className="text-xs text-muted-foreground italic">Nenhum interessado registrado.</p>
              )}
            </div>
          </div>

          {/* Informações Adicionais */}
          {(processo.valor_causa || processo.descricao) && (
            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Informações Adicionais</h3>
              {processo.valor_causa && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Valor da Causa</p>
                  <p className="text-sm font-bold text-foreground">{Number(processo.valor_causa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                </div>
              )}
              {processo.descricao && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Síntese dos Fatos</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{processo.descricao}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

      {/* Sigilo */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
        <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" /> Sigilo do Processo
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SIGILO_LABELS).map(([key, label]) => (
            <Button key={key} variant={(processo as any).sigilo === key || (!(processo as any).sigilo && key === "publico") ? "default" : "outline"} size="sm" className="rounded-lg text-xs"
              onClick={() => updateSigilo.mutate(key)} disabled={(processo as any).sigilo === key || (!(processo as any).sigilo && key === "publico")}>
              {label}
            </Button>
          ))}
        </div>

        {/* Conceder Acesso a Sigiloso */}
        {((processo as any).sigilo === "segredo_justica" || (processo as any).sigilo === "sigilo_absoluto") && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5" /> Conceder Acesso por ID do Personagem
            </h4>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ID do Personagem"
                    value={acessoIdPersonagem}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setAcessoIdPersonagem(val);
                      if (val.length >= 2) await acessoLookup.lookup(val);
                      else acessoLookup.clear();
                    }}
                    className="rounded-xl pl-10"
                  />
                </div>
                {acessoLookup.result && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-xs">
                    <User className="h-3 w-3 text-green-600" />
                    <span className="text-green-800 dark:text-green-300 font-medium">{acessoLookup.result.nome_completo}</span>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                className="rounded-xl"
                disabled={!acessoLookup.result || concederAcesso.isPending}
                onClick={() => concederAcesso.mutate()}
              >
                {concederAcesso.isPending ? "..." : "Conceder"}
              </Button>
            </div>

            {/* Lista de acessos concedidos */}
            {interessadosData && interessadosData.filter((i: any) => i.qualificacao === "acesso_autorizado").length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Acessos concedidos</p>
                {interessadosData.filter((i: any) => i.qualificacao === "acesso_autorizado").map((int: any) => (
                  <div key={int.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/30 border border-border text-xs">
                    <span className="font-medium text-foreground">{int.orgao || int.nome}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => revogarAcesso.mutate(int.id)}
                      disabled={revogarAcesso.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
            <Button onClick={() => setActiveAction("suspeicao")} variant="outline" className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10">
              <ShieldAlert className="h-4 w-4 mr-2" /> Declarar Suspeição
            </Button>
            <Button onClick={() => setActiveAction("intimar_cargo")} variant="outline" className="rounded-xl">
              <Megaphone className="h-4 w-4 mr-2" /> Intimar Cargo
            </Button>
            <Button onClick={() => setActiveAction("ato_cartorio")} variant="outline" className="rounded-xl">
              <FileText className="h-4 w-4 mr-2" /> Atos do Cartório
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
            
            <div className="flex justify-end gap-2 flex-wrap">
              <AISugerirDespacho tipoAto={despachoForm.tipo} tituloAto="Despacho" rascunhoAtual={despachoForm.conteudo} processo={processo} movimentacoes={movs} onInsert={(t) => setDespachoForm(f => ({ ...f, conteudo: appendHtml(f.conteudo, textoToHtml(t)) }))} />
              <ModeloPicker categoria="despacho" context={modeloCtx} onInsert={(t) => setDespachoForm(f => ({ ...f, conteudo: appendHtml(f.conteudo, textoToHtml(t)) }))} />
            </div>
            <RichTextEditor placeholder="Conteúdo do despacho..." value={despachoForm.conteudo} onChange={(html) => setDespachoForm({ ...despachoForm, conteudo: html })} minHeight="160px" />
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo(s) de Mandado</label>
              <div className="grid grid-cols-2 gap-2">
                {MANDADO_TIPOS.map((t) => (
                  <label key={t.value} className={`flex items-center gap-2 cursor-pointer rounded-xl border px-3 py-2 text-sm transition-colors ${mandadoForm.tipos.includes(t.value) ? 'border-institutional bg-institutional/10 text-institutional font-medium' : 'border-border bg-background text-foreground hover:bg-muted'}`}>
                    <Checkbox checked={mandadoForm.tipos.includes(t.value)} onCheckedChange={() => toggleMandadoTipo(t.value)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Destinatário(s)</label>
                <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs" onClick={addDestinatario}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              {mandadoForm.destinatarios.map((dest, idx) => (
                <div key={idx} className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                    {mandadoForm.destinatarios.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0 text-destructive" onClick={() => removeDestinatario(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ID do Personagem"
                      value={dest.id}
                      onChange={(e) => { updateDestinatario(idx, "id", e.target.value); }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const data = await mandadoLookup.lookup(dest.id);
                          if (data) updateDestinatario(idx, "nome", data.nome_completo);
                        }
                      }}
                      className="rounded-xl pl-10"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="text-xs w-full" onClick={async () => {
                    const data = await mandadoLookup.lookup(dest.id);
                    if (data) updateDestinatario(idx, "nome", data.nome_completo);
                  }} disabled={!dest.id.trim()}>
                    <Search className="h-3 w-3 mr-1" /> Buscar por ID
                  </Button>
                  <Input placeholder="Nome do destinatário (buscar ou preencher)" value={dest.nome} onChange={(e) => updateDestinatario(idx, "nome", e.target.value)} className="rounded-xl" required />
                  <Button type="button" variant="ghost" size="sm" className="text-xs w-full" onClick={async () => {
                    if (!dest.nome.trim()) return;
                    const { data } = await supabase.from("profiles").select("nome_completo, id_personagem").ilike("nome_completo", `%${dest.nome.trim()}%`).limit(1).maybeSingle();
                    if (data) {
                      updateDestinatario(idx, "nome", data.nome_completo);
                      if (data.id_personagem) updateDestinatario(idx, "id", data.id_personagem);
                    }
                  }} disabled={!dest.nome.trim()}>
                    <Search className="h-3 w-3 mr-1" /> Buscar por Nome
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
              <AISugerirDespacho tipoAto="mandado" tituloAto="Mandado" rascunhoAtual={mandadoForm.descricao} processo={processo} movimentacoes={movs} onInsert={(t) => setMandadoForm(f => ({ ...f, descricao: appendHtml(f.descricao, textoToHtml(t)) }))} />
              <ModeloPicker context={modeloCtx} onInsert={(t) => setMandadoForm(f => ({ ...f, descricao: appendHtml(f.descricao, textoToHtml(t)) }))} />
            </div>
            <RichTextEditor placeholder="Descrição e determinações do mandado..." value={mandadoForm.descricao} onChange={(html) => setMandadoForm({ ...mandadoForm, descricao: html })} minHeight="140px" />
            <Button type="submit" disabled={expedirMandado.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              {expedirMandado.isPending ? "Processando..." : "Expedir Mandado"}
            </Button>
          </form>
        </ActionCard>
      )}

      {/* INTIMAR CARGO FORM */}
      {activeAction === "intimar_cargo" && (
        <ActionCard title="Intimar Cargo" icon={Megaphone} onCancel={() => setActiveAction("none")}>
          <div className="bg-accent/30 rounded-lg p-3 mb-4 border border-accent/50">
            <p className="text-xs text-muted-foreground">
              <Megaphone className="h-3 w-3 inline mr-1" />
              Todos os servidores com o cargo selecionado receberão uma notificação sobre esta intimação.
            </p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); intimarCargo.mutate(); }} className="space-y-4">
            <Select value={cargoIntForm.cargo} onValueChange={(v) => setCargoIntForm({ ...cargoIntForm, cargo: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
              <SelectContent>
                {CARGOS_INTIMAVEIS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 flex-wrap">
              <AISugerirDespacho tipoAto="intimacao" tituloAto="Intimação de cargo" rascunhoAtual={cargoIntForm.conteudo} processo={processo} movimentacoes={movs} onInsert={(t) => setCargoIntForm(f => ({ ...f, conteudo: appendHtml(f.conteudo, textoToHtml(t)) }))} />
              <ModeloPicker context={modeloCtx} onInsert={(t) => setCargoIntForm(f => ({ ...f, conteudo: appendHtml(f.conteudo, textoToHtml(t)) }))} />
            </div>
            <RichTextEditor
              placeholder="Conteúdo da intimação..."
              value={cargoIntForm.conteudo}
              onChange={(html) => setCargoIntForm({ ...cargoIntForm, conteudo: html })}
              minHeight="160px"
            />
            <Input
              type="number"
              placeholder="Prazo (horas)"
              value={cargoIntForm.prazo}
              onChange={(e) => setCargoIntForm({ ...cargoIntForm, prazo: e.target.value })}
              min="1"
              className="rounded-xl"
              required
            />
            <Button type="submit" disabled={intimarCargo.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              {intimarCargo.isPending ? "Processando..." : "Expedir Intimação ao Cargo"}
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
            <div className="flex gap-2 items-center">
              <Input placeholder="Ementa (gere após concluir a sentença)" value={sentencaForm.ementa} onChange={(e) => setSentencaForm({ ...sentencaForm, ementa: e.target.value })} className="rounded-xl flex-1" />
              <AIGerarEmenta fundamentacao={sentencaForm.fundamentacao} dispositivo={sentencaForm.dispositivo} classe={processo?.classe} assunto={processo?.assunto} onGenerated={(t) => setSentencaForm(f => ({ ...f, ementa: t }))} />
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
              <AISugerirDespacho tipoAto="sentenca_fundamentacao" tituloAto="Fundamentação da sentença" rascunhoAtual={sentencaForm.fundamentacao} processo={processo} movimentacoes={movs} onInsert={(t) => setSentencaForm(f => ({ ...f, fundamentacao: appendHtml(f.fundamentacao, textoToHtml(t)) }))} label="IA: Fundamentação" />
              <AISugerirDespacho tipoAto="sentenca_dispositivo" tituloAto="Dispositivo da sentença" rascunhoAtual={sentencaForm.dispositivo} processo={processo} movimentacoes={movs} onInsert={(t) => setSentencaForm(f => ({ ...f, dispositivo: appendHtml(f.dispositivo, textoToHtml(t)) }))} label="IA: Dispositivo" />
              <ModeloPicker categoria="sentenca" context={modeloCtx} label="Modelo p/ fundamentação" onInsert={(t) => setSentencaForm(f => ({ ...f, fundamentacao: appendHtml(f.fundamentacao, textoToHtml(t)) }))} />
              <ModeloPicker categoria="sentenca" context={modeloCtx} label="Modelo p/ dispositivo" onInsert={(t) => setSentencaForm(f => ({ ...f, dispositivo: appendHtml(f.dispositivo, textoToHtml(t)) }))} />
            </div>
            <RichTextEditor placeholder="Fundamentação jurídica..." value={sentencaForm.fundamentacao} onChange={(html) => setSentencaForm({ ...sentencaForm, fundamentacao: html })} minHeight="200px" />
            <RichTextEditor placeholder="Dispositivo (decisão)..." value={sentencaForm.dispositivo} onChange={(html) => setSentencaForm({ ...sentencaForm, dispositivo: html })} minHeight="140px" />
            <Button type="submit" disabled={proferirSentenca.isPending} className="rounded-xl bg-gold hover:bg-gold/90 text-foreground">
              {proferirSentenca.isPending ? "Processando..." : "Proferir e Publicar Sentença"}
            </Button>
          </form>
        </ActionCard>
      )}

      {/* SUSPEIÇÃO FORM */}
      {activeAction === "suspeicao" && (
        <ActionCard title="Declarar Suspeição" icon={ShieldAlert} onCancel={() => setActiveAction("none")}>
          <div className="bg-destructive/5 rounded-lg p-3 mb-4 border border-destructive/20">
            <p className="text-xs text-destructive font-medium">⚠️ Ao declarar suspeição, o processo será removido da sua lista e redistribuído automaticamente por sorteio a outro magistrado. Esta ação é irreversível.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); declararSuspeicao.mutate(fd.get("justificativa") as string); }} className="space-y-4">
            <Textarea name="justificativa" placeholder="Justificativa da suspeição (art. 145 do CPC)..." rows={4} className="rounded-xl" required />
            <Button type="submit" disabled={declararSuspeicao.isPending} variant="destructive" className="rounded-xl">
              {declararSuspeicao.isPending ? "Processando..." : "Confirmar Suspeição e Redistribuir"}
            </Button>
          </form>
        </ActionCard>
      )}

      {/* ATO DO CARTÓRIO FORM */}
      {activeAction === "ato_cartorio" && (
        <ActionCard title="Ato do Cartório Judicial" icon={FileText} onCancel={() => setActiveAction("none")}>
          <p className="text-xs text-muted-foreground mb-3">Assinatura: <span className="font-semibold">Escrevente Técnico Judiciário Abel Haus</span></p>
          <form onSubmit={(e) => { e.preventDefault(); createAtoCartorio.mutate(); }} className="space-y-4">
            <Select value={cartorioForm.tipo} onValueChange={(v) => setCartorioForm({ ...cartorioForm, tipo: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="juntada">Juntada</SelectItem>
                <SelectItem value="ato_ordinatorio">Ato Ordinatório</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Título do ato" value={cartorioForm.titulo} onChange={(e) => setCartorioForm({ ...cartorioForm, titulo: e.target.value })} className="rounded-xl" required />
            <div className="flex justify-end gap-2 flex-wrap">
              <AISugerirDespacho tipoAto={cartorioForm.tipo} tituloAto={cartorioForm.tipo === "juntada" ? "Juntada" : "Ato Ordinatório"} rascunhoAtual={cartorioForm.conteudo} processo={processo} movimentacoes={movs} onInsert={(t) => setCartorioForm(f => ({ ...f, conteudo: appendHtml(f.conteudo, textoToHtml(t)) }))} />
              <ModeloPicker context={modeloCtx} onInsert={(t) => setCartorioForm(f => ({ ...f, conteudo: appendHtml(f.conteudo, textoToHtml(t)) }))} />
            </div>
            <RichTextEditor placeholder="Conteúdo..." value={cartorioForm.conteudo} onChange={(html) => setCartorioForm({ ...cartorioForm, conteudo: html })} minHeight="160px" />
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Anexos (links opcionais)</label>
              {cartorioForm.anexo_urls.map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="https://drive.google.com/..."
                    value={url}
                    onChange={(e) => updateCartorioLink(idx, e.target.value)}
                    className="rounded-xl flex-1"
                  />
                  {cartorioForm.anexo_urls.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => removeCartorioLink(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs" onClick={addCartorioLink}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar outro link
              </Button>
            </div>
            <Button type="submit" disabled={createAtoCartorio.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              {createAtoCartorio.isPending ? "Registrando..." : "Registrar Ato do Cartório"}
            </Button>
          </form>
        </ActionCard>
      )}

      {/* Advogados Constituídos */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-institutional" /> Advogados Constituídos</h3>
        {(!procuracoes || procuracoes.filter((p: any) => p.status === "ativa").length === 0) ? (
          <p className="text-xs text-muted-foreground">Nenhum advogado constituído neste processo.</p>
        ) : (
          <div className="space-y-2">
            {procuracoes.filter((p: any) => p.status === "ativa").map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 bg-secondary/30 rounded-lg p-2.5">
                <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{p.advogado_nome}</p>
                  <p className="text-[10px] text-muted-foreground">Advogado(a) do(a) {(() => { const [lado, ...rest] = (p.parte || "").split(":"); const nome = rest.join(":"); return nome ? `${lado === "autor" ? "AUTOR" : "RÉU"} ${nome}` : (lado === "autor" ? "AUTOR" : "RÉU"); })()} — desde {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {procuracoes && procuracoes.filter((p: any) => p.status === "renunciada").length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Renúncias</p>
            {procuracoes.filter((p: any) => p.status === "renunciada").map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 bg-destructive/5 rounded-lg p-2 mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground/70">{p.advogado_nome}</span> — renunciou em {p.renunciada_em ? format(new Date(p.renunciada_em), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                  {p.motivo_renuncia && <p className="text-[10px] text-muted-foreground italic">Motivo: {p.motivo_renuncia}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs with all information */}
      <Tabs defaultValue="movimentacoes" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="movimentacoes" className="rounded-lg text-xs">Movimentações ({movs?.length || 0})</TabsTrigger>
          <TabsTrigger value="atos" className="rounded-lg text-xs">Atos Judiciais ({atos?.length || 0})</TabsTrigger>
          <TabsTrigger value="audiencias_proc" className="rounded-lg text-xs">Audiências ({audiencias?.length || 0})</TabsTrigger>
          <TabsTrigger value="prazos" className="rounded-lg text-xs">Prazos ({prazos?.length || 0})</TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-lg text-xs">Documentos ({docs?.length || 0})</TabsTrigger>
          
          <TabsTrigger value="certidoes" className="rounded-lg text-xs">Certidões ({certidoes?.length || 0})</TabsTrigger>
          {sentencasProc && sentencasProc.length > 0 && <TabsTrigger value="sentencas" className="rounded-lg text-xs">Sentenças ({sentencasProc.length})</TabsTrigger>}
          {apelacoesProc && apelacoesProc.length > 0 && <TabsTrigger value="apelacoes" className="rounded-lg text-xs">Apelações ({apelacoesProc.length})</TabsTrigger>}
          {embargosProc && embargosProc.length > 0 && <TabsTrigger value="embargos" className="rounded-lg text-xs">Embargos ({embargosProc.length})</TabsTrigger>}
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
                  {/<\/(p|strong|em|u|s|ul|ol|li|h[1-4]|blockquote|span|div)>/i.test(m.descricao || "") ? (
                    <RichTextView html={m.descricao} className="text-sm text-foreground" />
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {m.descricao.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                        /^https?:\/\//.test(part) ? (
                          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">{part}</a>
                        ) : part
                      )}
                    </p>
                  )}
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
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{a.titulo}</p>
                  {/<\/(p|strong|em|u|s|ul|ol|li|h[1-4]|blockquote|span|div)>/i.test(a.conteudo || "") ? (
                    <RichTextView html={a.conteudo} className="text-xs text-muted-foreground mt-1" />
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.conteudo}</p>
                  )}
                  {a.autor_nome && <p className="text-[10px] text-muted-foreground mt-1 italic">Por: {a.autor_nome}</p>}
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
                    {a.observacoes && <p className="text-xs text-muted-foreground mt-0.5">{a.observacoes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prazos" className="mt-4">
          {!prazos?.length ? <p className="text-sm text-muted-foreground text-center py-8">Nenhum prazo registrado.</p> : (
            <div className="space-y-2">
              {prazos.map((p) => (
                <div key={p.id} className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400">{p.tipo}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${p.status === "cumprido" ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" : p.status === "expirado" ? "bg-destructive/10 text-destructive" : "bg-gold/10 text-gold-dark"}`}>{p.status}</span>
                  </div>
                  <p className="text-sm text-foreground">{p.descricao}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.dias_uteis} horas — De {format(new Date(p.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })} até {format(new Date(p.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
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
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{d.nome}</p>
                    <p className="text-xs text-muted-foreground">{d.tipo} • {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                    {d.descricao && <p className="text-xs text-muted-foreground mt-0.5">{d.descricao}</p>}
                  </div>
                  {d.arquivo_url && (
                    <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Ver
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>


        <TabsContent value="certidoes" className="mt-4">
          {!certidoes?.length ? <p className="text-sm text-muted-foreground text-center py-8">Nenhuma certidão.</p> : (
            <div className="space-y-2">
              {certidoes.map((c: any) => (
                <div key={c.id} className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{c.tipo}</span>
                    {c.assinado && <CheckCircle className="h-3 w-3 text-green-600" />}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.conteudo}</p>
                  {c.emitido_por_nome && <p className="text-[10px] text-muted-foreground mt-1 italic">Emitida por: {c.emitido_por_nome}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {sentencasProc && sentencasProc.length > 0 && (
          <TabsContent value="sentencas" className="mt-4">
            <div className="space-y-2">
              {sentencasProc.map((s: any) => (
                <div key={s.id} className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scroll className="h-4 w-4 text-gold-dark" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{s.tipo?.replace(/_/g, " ")}</span>
                    {s.assinado && <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400">Assinada</span>}
                  </div>
                  {s.ementa && <p className="text-sm font-medium text-foreground mb-2">{s.ementa}</p>}
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Fundamentação</p>
                      <RichTextView html={s.fundamentacao} className="text-xs text-foreground mt-1" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Dispositivo</p>
                      <RichTextView html={s.dispositivo} className="text-xs text-foreground mt-1" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {apelacoesProc && apelacoesProc.length > 0 && (
          <TabsContent value="apelacoes" className="mt-4">
            <div className="space-y-2">
              {apelacoesProc.map((a: any) => (
                <div key={a.id} className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-4 w-4 text-institutional" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{a.apelante_tipo === "defesa" ? "Defesa" : "Acusação"}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${a.status === "julgada" ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" : "bg-gold/10 text-gold-dark"}`}>{a.status}</span>
                    {a.numero_acordao && <span className="text-[10px] font-mono text-muted-foreground">{a.numero_acordao}</span>}
                  </div>
                  <p className="text-sm font-medium text-foreground">Apelante: {a.apelante_nome}</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap mt-1">{a.fundamentacao}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pedido: {a.pedido}</p>
                  {a.decisao_tipo && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Decisão: {a.decisao_tipo}</p>
                      {a.decisao_fundamentacao && <p className="text-xs text-foreground mt-1">{a.decisao_fundamentacao}</p>}
                      {a.decisao_dispositivo && <p className="text-xs text-foreground mt-1">{a.decisao_dispositivo}</p>}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {embargosProc && embargosProc.length > 0 && (
          <TabsContent value="embargos" className="mt-4">
            <div className="space-y-3">
              {embargosProc.map((emb: any) => {
                const tipoLabels: Record<string, string> = { omissao: "Omissão", contradicao: "Contradição", obscuridade: "Obscuridade" };
                const statusCfg: Record<string, { label: string; color: string }> = {
                  opostos: { label: "Pendente", color: "bg-gold/10 text-gold-dark" },
                  acolhidos: { label: "Acolhidos", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
                  rejeitados: { label: "Rejeitados", color: "bg-destructive/10 text-destructive" },
                  parcialmente_acolhidos: { label: "Parc. Acolhidos", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" },
                };
                const cfg = statusCfg[emb.status] || statusCfg.opostos;
                return (
                  <EmbargosCard
                    key={emb.id}
                    emb={emb}
                    tipoLabels={tipoLabels}
                    statusCfg={cfg}
                    canDecide={emb.status === "opostos" && processo?.juiz_id === user?.id}
                    processoId={processoId}
                    userId={user?.id}
                    profileName={profile?.nome_completo}
                  />
                );
              })}
            </div>
          </TabsContent>
        )}
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

function EmbargosCard({ emb, tipoLabels, statusCfg, canDecide, processoId, userId, profileName }: {
  emb: any; tipoLabels: Record<string, string>; statusCfg: { label: string; color: string };
  canDecide: boolean; processoId: string; userId?: string; profileName?: string;
}) {
  const [deciding, setDeciding] = useState(false);
  const [decisao, setDecisao] = useState("");
  const [resultado, setResultado] = useState("acolhidos");
  const queryClient = useQueryClient();

  const decidirEmbargos = useMutation({
    mutationFn: async () => {
      if (!decisao) throw new Error("Preencha a decisão.");
      // Fetch judge name reliably
      let judgeName = profileName;
      if (!judgeName && userId) {
        const { data } = await supabase.from("profiles").select("nome_completo").eq("user_id", userId).maybeSingle();
        judgeName = data?.nome_completo || "Magistrado(a)";
      }
      const { error } = await supabase.from("embargos_declaracao").update({
        status: resultado,
        decisao,
        decidido_por: userId,
        updated_at: new Date().toISOString(),
      } as any).eq("id", emb.id);
      if (error) throw error;
      // Add movimentação
      const resLabel = resultado === "acolhidos" ? "ACOLHIDOS" : resultado === "rejeitados" ? "REJEITADOS" : "PARCIALMENTE ACOLHIDOS";
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        autor_id: userId,
        tipo: "decisao_embargos",
        descricao: `EMBARGOS DE DECLARAÇÃO ${resLabel} por ${judgeName || "Magistrado(a)"}. Decisão: ${decisao}`,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mag-embargos-proc", processoId] });
      setDeciding(false);
      toast.success("Decisão sobre embargos registrada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="bg-secondary/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <FileText className="h-4 w-4 text-institutional" />
        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{tipoLabels[emb.tipo] || emb.tipo}</span>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
      </div>
      <p className="text-sm font-medium text-foreground">Embargante: {emb.embargante_nome}</p>
      <p className="text-xs text-foreground whitespace-pre-wrap mt-1">{emb.fundamentacao}</p>
      <p className="text-xs text-muted-foreground mt-1">Pedido: {emb.pedido}</p>
      {emb.decisao && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Decisão</p>
          <p className="text-xs text-foreground mt-1">{emb.decisao}</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-2">{format(new Date(emb.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>

      {canDecide && !deciding && (
        <Button size="sm" variant="outline" className="mt-3 rounded-lg text-xs gap-1" onClick={() => setDeciding(true)}>
          <Gavel className="h-3 w-3" /> Decidir Embargos
        </Button>
      )}
      {deciding && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="acolhidos">Acolher</SelectItem>
              <SelectItem value="rejeitados">Rejeitar</SelectItem>
              <SelectItem value="parcialmente_acolhidos">Acolher Parcialmente</SelectItem>
            </SelectContent>
          </Select>
          <RichTextEditor placeholder="Fundamentação da decisão..." value={decisao} onChange={setDecisao} minHeight="120px" />
          <div className="flex gap-2">
            <Button size="sm" className="rounded-lg text-xs" onClick={() => decidirEmbargos.mutate()} disabled={decidirEmbargos.isPending}>Confirmar</Button>
            <Button size="sm" variant="ghost" className="rounded-lg text-xs" onClick={() => setDeciding(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  Scale, FileText, Shield, Search, ArrowLeft, Clock, Eye,
  ChevronRight, Send, BookOpen, Gavel, Archive, MessageSquare,
  BarChart3, AlertTriangle, CheckCircle, XCircle, Plus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Status configs ─── */
const IP_STATUS: Record<string, { label: string; color: string }> = {
  instaurado: { label: "Instaurado", color: "bg-institutional/10 text-institutional" },
  em_andamento: { label: "Em Andamento", color: "bg-gold/10 text-gold-dark" },
  diligencias: { label: "Diligências", color: "bg-accent/20 text-accent-foreground" },
  concluso: { label: "Concluso", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
  remetido_mp: { label: "Remetido ao MP", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400" },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
};

const REQ_STATUS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-gold/10 text-gold-dark" },
  cumprida: { label: "Cumprida", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
  parcial: { label: "Parcial", color: "bg-accent/20 text-accent-foreground" },
};

/* ─── Stat card ─── */
function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-4 border border-border shadow-institutional">
      <Icon className="h-4 w-4 text-institutional mb-1" />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════ */
/*  MAIN                                       */
/* ═══════════════════════════════════════════ */
export default function MPSection() {
  const { roles } = useAuth();
  const [view, setView] = useState<"list" | "inquerito-detail" | "ouvidoria-detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isMP = roles.some((r) => ["admin", "ministerio_publico", "procurador_geral"].includes(r));

  if (view === "inquerito-detail" && selectedId) {
    return <InqueritoMPDetail ipId={selectedId} onBack={() => { setView("list"); setSelectedId(null); }} />;
  }

  if (view === "ouvidoria-detail" && selectedId) {
    return <OuvidoriaDetail denunciaId={selectedId} onBack={() => { setView("list"); setSelectedId(null); }} />;
  }

  return (
    <MPDashboard
      isMP={isMP}
      onSelectIP={(id) => { setSelectedId(id); setView("inquerito-detail"); }}
      onSelectOuvidoria={(id) => { setSelectedId(id); setView("ouvidoria-detail"); }}
    />
  );
}

/* ═══════════════════════════════════════════ */
/*  MP DASHBOARD                               */
/* ═══════════════════════════════════════════ */
function MPDashboard({ isMP, onSelectIP, onSelectOuvidoria }: { isMP: boolean; onSelectIP: (id: string) => void; onSelectOuvidoria: (id: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("inqueritos");

  // Inquéritos remetidos ao MP
  const { data: inqueritos } = useQuery({
    queryKey: ["mp-inqueritos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inqueritos")
        .select("*")
        .eq("remetido_mp", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Denúncias
  const { data: denuncias } = useQuery({
    queryKey: ["mp-denuncias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("denuncias_mp")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Arquivamentos
  const { data: arquivamentos } = useQuery({
    queryKey: ["mp-arquivamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arquivamentos_mp")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Pareceres
  const { data: pareceres } = useQuery({
    queryKey: ["mp-pareceres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pareceres_mp")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Requisições de diligência
  const { data: requisicoes } = useQuery({
    queryKey: ["mp-requisicoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requisicoes_diligencia_mp")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Denúncias da Ouvidoria
  const { data: denunciasOuvidoria } = useQuery({
    queryKey: ["mp-denuncias-ouvidoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("denuncias_ouvidoria" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Processos com atuação do MP (criminal)
  const { data: processos } = useQuery({
    queryKey: ["mp-processos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .eq("classe", "criminal")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pendentes = inqueritos?.filter((ip) => ip.status === "remetido_mp") || [];
  const filteredIPs = inqueritos?.filter((ip) =>
    ip.numero?.toLowerCase().includes(search.toLowerCase()) ||
    ip.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    inqueritos: inqueritos?.length || 0,
    pendentes: pendentes.length,
    denuncias: denuncias?.length || 0,
    arquivamentos: arquivamentos?.length || 0,
    processos: processos?.length || 0,
    requisicoes: requisicoes?.length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Portal do Ministério Público</h2>
        <p className="text-sm text-muted-foreground">Recebimento de inquéritos, oferecimento de denúncias e acompanhamento processual</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Inquéritos" value={stats.inqueritos} icon={Shield} />
        <StatCard label="Pendentes" value={stats.pendentes} icon={Clock} />
        <StatCard label="Denúncias" value={stats.denuncias} icon={Gavel} />
        <StatCard label="Arquivamentos" value={stats.arquivamentos} icon={Archive} />
        <StatCard label="Processos" value={stats.processos} icon={FileText} />
        <StatCard label="Requisições" value={stats.requisicoes} icon={Send} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar inquéritos, denúncias, processos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="inqueritos" className="rounded-lg text-xs"><Shield className="h-3 w-3 mr-1" /> Inquéritos ({stats.inqueritos})</TabsTrigger>
          <TabsTrigger value="denuncias" className="rounded-lg text-xs"><Gavel className="h-3 w-3 mr-1" /> Denúncias ({stats.denuncias})</TabsTrigger>
          <TabsTrigger value="arquivamentos" className="rounded-lg text-xs"><Archive className="h-3 w-3 mr-1" /> Arquivamentos ({stats.arquivamentos})</TabsTrigger>
          <TabsTrigger value="pareceres" className="rounded-lg text-xs"><MessageSquare className="h-3 w-3 mr-1" /> Pareceres ({pareceres?.length || 0})</TabsTrigger>
          <TabsTrigger value="requisicoes" className="rounded-lg text-xs"><Send className="h-3 w-3 mr-1" /> Requisições ({stats.requisicoes})</TabsTrigger>
          <TabsTrigger value="processos" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Processos ({stats.processos})</TabsTrigger>
          <TabsTrigger value="estatisticas" className="rounded-lg text-xs"><BarChart3 className="h-3 w-3 mr-1" /> Estatísticas</TabsTrigger>
          <TabsTrigger value="ouvidoria" className="rounded-lg text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Ouvidoria ({denunciasOuvidoria?.length || 0})</TabsTrigger>
          <TabsTrigger value="comunicacoes-externas" className="rounded-lg text-xs"><MessageSquare className="h-3 w-3 mr-1" /> Comunicações Externas</TabsTrigger>
        </TabsList>

        {/* INQUÉRITOS TAB */}
        <TabsContent value="inqueritos" className="mt-4">
          {!filteredIPs?.length ? (
            <EmptyState icon={Shield} text="Nenhum inquérito remetido ao Ministério Público." />
          ) : (
            <div className="space-y-2">
              {filteredIPs.map((ip, i) => {
                const cfg = IP_STATUS[ip.status] || IP_STATUS.remetido_mp;
                return (
                  <motion.div key={ip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => onSelectIP(ip.id)}
                    className="bg-card rounded-xl p-4 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-institutional">{ip.numero}</span>
                          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                          {ip.sigilo && <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Sigiloso</span>}
                        </div>
                        <p className="text-sm text-foreground mt-1 line-clamp-1">{ip.descricao}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(ip.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* DENÚNCIAS TAB */}
        <TabsContent value="denuncias" className="mt-4">
          {!denuncias?.length ? (
            <EmptyState icon={Gavel} text="Nenhuma denúncia oferecida." />
          ) : (
            <div className="space-y-2">
              {denuncias.map((d: any, i: number) => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-sm font-semibold text-institutional">{d.numero_protocolo}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400">{d.status}</span>
                    {d.tipificacao && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{d.tipificacao}</span>}
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{d.resumo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ARQUIVAMENTOS TAB */}
        <TabsContent value="arquivamentos" className="mt-4">
          {!arquivamentos?.length ? (
            <EmptyState icon={Archive} text="Nenhum arquivamento promovido." />
          ) : (
            <div className="space-y-2">
              {arquivamentos.map((a: any, i: number) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-center gap-2 mb-1">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${a.status === 'promovido' ? 'bg-gold/10 text-gold-dark' : 'bg-green-100 text-green-800'}`}>{a.status}</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{a.justificativa}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PARECERES TAB */}
        <TabsContent value="pareceres" className="mt-4">
          <ParecerTab pareceres={pareceres || []} processos={processos || []} />
        </TabsContent>

        {/* REQUISIÇÕES TAB */}
        <TabsContent value="requisicoes" className="mt-4">
          {!requisicoes?.length ? (
            <EmptyState icon={Send} text="Nenhuma requisição de diligência." />
          ) : (
            <div className="space-y-2">
              {requisicoes.map((r: any, i: number) => {
                const cfg = REQ_STATUS[r.status] || REQ_STATUS.pendente;
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                    <div className="flex items-center gap-2 mb-1">
                      <Send className="h-4 w-4 text-institutional" />
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground">Prazo: {r.prazo_dias} horas</span>
                    </div>
                    <p className="text-sm text-foreground">{r.descricao}</p>
                    {r.resposta && <p className="text-xs text-muted-foreground mt-1 bg-secondary/50 rounded p-2">Resposta: {r.resposta}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* PROCESSOS TAB */}
        <TabsContent value="processos" className="mt-4">
          {!processos?.length ? (
            <EmptyState icon={FileText} text="Nenhum processo criminal em acompanhamento." />
          ) : (
            <div className="space-y-2">
              {processos.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-sm font-semibold text-institutional">{p.numero}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{p.status?.replace("_", " ")}</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{p.classe}</span>
                  </div>
                  <p className="text-sm text-foreground">{p.autor_nome} vs {p.reu_nome}</p>
                  <p className="text-xs text-muted-foreground">{p.assunto}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* OUVIDORIA TAB */}
        <TabsContent value="ouvidoria" className="mt-4">
          {!denunciasOuvidoria?.length ? (
            <EmptyState icon={AlertTriangle} text="Nenhuma denúncia recebida pela ouvidoria." />
          ) : (
            <div className="space-y-3">
              {denunciasOuvidoria.map((d: any, i: number) => {
                const envolvidos = Array.isArray(d.envolvidos) ? d.envolvidos : [];
                const dLinks = Array.isArray(d.links) ? d.links : [];
                const STATUS_MAP: Record<string, { label: string; color: string }> = {
                  recebida: { label: "Recebida", color: "bg-gold/10 text-gold-dark" },
                  em_analise: { label: "Em Análise", color: "bg-institutional/10 text-institutional" },
                  encaminhada: { label: "Encaminhada", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
                  arquivada: { label: "Arquivada", color: "bg-muted text-muted-foreground" },
                };
                const st = STATUS_MAP[d.status] || STATUS_MAP.recebida;
                return (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => onSelectOuvidoria(d.id)}
                    className="bg-card rounded-xl p-5 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      <span className="text-xs font-medium text-foreground ml-auto">
                        {d.nome_denunciante || "Anônimo"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{d.descricao}</p>
                    {envolvidos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {envolvidos.map((e: any, j: number) => (
                          <span key={j} className="text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded text-muted-foreground">
                            {e.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* COMUNICAÇÕES EXTERNAS TAB */}
        <TabsContent value="comunicacoes-externas" className="mt-4">
          <ComunicacoesExternasTab isMP={isMP} />
        </TabsContent>

        <TabsContent value="estatisticas" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
              <p className="text-3xl font-bold text-institutional">{stats.inqueritos}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Inquéritos Recebidos</p>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
              <p className="text-3xl font-bold text-foreground">{stats.denuncias}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Denúncias Oferecidas</p>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
              <p className="text-3xl font-bold text-foreground">{stats.arquivamentos}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Arquivamentos</p>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
              <p className="text-3xl font-bold text-foreground">{stats.requisicoes}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Diligências Requisitadas</p>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
              <p className="text-3xl font-bold text-foreground">{pareceres?.length || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Pareceres Emitidos</p>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
              <p className="text-3xl font-bold text-foreground">{stats.processos}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Processos Acompanhados</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  PARECER TAB                                */
/* ═══════════════════════════════════════════ */
function ParecerTab({ pareceres, processos }: { pareceres: any[]; processos: any[] }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openParecer, setOpenParecer] = useState(false);
  const [parecerForm, setParecerForm] = useState({ processo_id: "", tipo: "parecer", conteudo: "" });

  const createParecer = useMutation({
    mutationFn: async () => {
      if (!parecerForm.processo_id || !parecerForm.conteudo) throw new Error("Preencha todos os campos.");
      const { error } = await supabase.from("pareceres_mp").insert({
        processo_id: parecerForm.processo_id,
        promotor_id: user!.id,
        tipo: parecerForm.tipo,
        conteudo: parecerForm.conteudo,
      } as any);
      if (error) throw error;

      // Add movimentação
      await supabase.from("movimentacoes").insert({
        processo_id: parecerForm.processo_id,
        tipo: "parecer_mp",
        descricao: `Parecer do Ministério Público juntado aos autos.`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp-pareceres"] });
      setOpenParecer(false);
      setParecerForm({ processo_id: "", tipo: "parecer", conteudo: "" });
      toast.success("Parecer emitido com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={openParecer} onOpenChange={setOpenParecer}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Plus className="h-4 w-4 mr-1" /> Emitir Parecer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Emitir Parecer Ministerial</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createParecer.mutate(); }} className="space-y-4 mt-4">
              <Select value={parecerForm.processo_id} onValueChange={(v) => setParecerForm({ ...parecerForm, processo_id: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o Processo" /></SelectTrigger>
                <SelectContent>
                  {processos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.numero} — {p.assunto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={parecerForm.tipo} onValueChange={(v) => setParecerForm({ ...parecerForm, tipo: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parecer">Parecer</SelectItem>
                  <SelectItem value="manifestacao">Manifestação</SelectItem>
                  <SelectItem value="alegacoes_finais">Alegações Finais</SelectItem>
                  <SelectItem value="contrarrazoes">Contrarrazões</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Conteúdo do parecer..." value={parecerForm.conteudo} onChange={(e) => setParecerForm({ ...parecerForm, conteudo: e.target.value })} required rows={6} className="rounded-xl" />
              <Button type="submit" disabled={createParecer.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                {createParecer.isPending ? "Emitindo..." : "Emitir Parecer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!pareceres.length ? (
        <EmptyState icon={MessageSquare} text="Nenhum parecer emitido." />
      ) : (
        <div className="space-y-2">
          {pareceres.map((p: any, i: number) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 border border-border shadow-institutional">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-institutional" />
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{p.tipo?.replace("_", " ")}</span>
              </div>
              <p className="text-sm text-foreground line-clamp-3">{p.conteudo}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  INQUÉRITO DETAIL (MP VIEW)                 */
/* ═══════════════════════════════════════════ */
function InqueritoMPDetail({ ipId, onBack }: { ipId: string; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<"none" | "denuncia" | "arquivamento" | "requisicao">("none");

  // Inquiry data
  const { data: ip } = useQuery({
    queryKey: ["mp-ip", ipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("inqueritos").select("*").eq("id", ipId).single();
      if (error) throw error;
      return data;
    },
  });

  // Envolvidos
  const { data: envolvidos } = useQuery({
    queryKey: ["mp-ip-envolvidos", ipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("envolvidos_inquerito").select("*").eq("inquerito_id", ipId);
      if (error) throw error;
      return data;
    },
  });

  // Diligências
  const { data: diligencias } = useQuery({
    queryKey: ["mp-ip-diligencias", ipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("diligencias").select("*").eq("inquerito_id", ipId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Oitivas
  const { data: oitivas } = useQuery({
    queryKey: ["mp-ip-oitivas", ipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("oitivas").select("*").eq("inquerito_id", ipId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Boletim de Ocorrência vinculado
  const { data: bo } = useQuery({
    queryKey: ["mp-ip-bo", ip?.bo_id],
    enabled: !!ip?.bo_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("boletins_ocorrencia").select("*").eq("id", ip!.bo_id!).single();
      if (error) throw error;
      return data;
    },
  });

  // Envolvidos do BO
  const { data: envolvidosBo } = useQuery({
    queryKey: ["mp-ip-bo-envolvidos", ip?.bo_id],
    enabled: !!ip?.bo_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("envolvidos_bo").select("*").eq("bo_id", ip!.bo_id!);
      if (error) throw error;
      return data;
    },
  });

  // ── DENÚNCIA ──
  const [denunciaForm, setDenunciaForm] = useState({ resumo: "", fundamentacao: "", tipificacao: "" });
  const oferecarDenuncia = useMutation({
    mutationFn: async () => {
      if (!denunciaForm.resumo || !denunciaForm.fundamentacao) throw new Error("Preencha resumo e fundamentação.");
      // Create processo
      const investigados = envolvidos?.filter((e) => e.tipo === "investigado") || [];
      const reuNome = investigados.map((e) => e.nome).join(", ") || "Réu desconhecido";
      const { data: juizData } = await supabase.rpc("sortear_magistrado");
      const juizId = juizData || null;
      const { data: processo, error: procErr } = await supabase.from("processos").insert({
        numero: "",
        classe: "criminal" as const,
        assunto: denunciaForm.tipificacao || "Ação Penal",
        autor_nome: "Ministério Público",
        reu_nome: reuNome,
        descricao: denunciaForm.resumo,
        sigilo: "segredo_justica",
        juiz_id: juizId,
      }).select("id, numero").single();
      if (procErr) throw procErr;

      // Create denuncia
      const { error: denErr } = await supabase.from("denuncias_mp").insert({
        inquerito_id: ipId,
        promotor_id: user!.id,
        resumo: denunciaForm.resumo,
        fundamentacao: denunciaForm.fundamentacao,
        tipificacao: denunciaForm.tipificacao,
        status: "oferecida",
        processo_id: processo.id,
      } as any);
      if (denErr) throw denErr;

      // Update inquerito status
      await supabase.from("inqueritos").update({ status: "concluso" }).eq("id", ipId);

      // Movimentação
      await supabase.from("movimentacoes").insert({
        processo_id: processo.id,
        tipo: "denuncia",
        descricao: `Denúncia oferecida pelo Ministério Público. Processo ${processo.numero} distribuído.`,
        autor_id: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp-ip", ipId] });
      queryClient.invalidateQueries({ queryKey: ["mp-denuncias"] });
      queryClient.invalidateQueries({ queryKey: ["mp-inqueritos"] });
      setActiveAction("none");
      setDenunciaForm({ resumo: "", fundamentacao: "", tipificacao: "" });
      toast.success("Denúncia oferecida e processo criminal distribuído!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── ARQUIVAMENTO ──
  const [arquivForm, setArquivForm] = useState({ justificativa: "" });
  const promoverArquivamento = useMutation({
    mutationFn: async () => {
      if (!arquivForm.justificativa) throw new Error("Justificativa obrigatória.");
      const { error } = await supabase.from("arquivamentos_mp").insert({
        inquerito_id: ipId,
        promotor_id: user!.id,
        justificativa: arquivForm.justificativa,
      } as any);
      if (error) throw error;
      await supabase.from("inqueritos").update({ status: "arquivado" }).eq("id", ipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp-ip", ipId] });
      queryClient.invalidateQueries({ queryKey: ["mp-arquivamentos"] });
      queryClient.invalidateQueries({ queryKey: ["mp-inqueritos"] });
      setActiveAction("none");
      setArquivForm({ justificativa: "" });
      toast.success("Arquivamento promovido com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── REQUISIÇÃO DE DILIGÊNCIA ──
  const [reqForm, setReqForm] = useState({ descricao: "", prazo_dias: "10" });
  const requisitarDiligencia = useMutation({
    mutationFn: async () => {
      if (!reqForm.descricao) throw new Error("Descrição obrigatória.");
      const { error } = await supabase.from("requisicoes_diligencia_mp").insert({
        inquerito_id: ipId,
        promotor_id: user!.id,
        descricao: reqForm.descricao,
        prazo_dias: parseInt(reqForm.prazo_dias) || 10,
      } as any);
      if (error) throw error;
      // Update inquerito back to em_andamento
      await supabase.from("inqueritos").update({ status: "em_andamento", remetido_mp: false }).eq("id", ipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp-ip", ipId] });
      queryClient.invalidateQueries({ queryKey: ["mp-requisicoes"] });
      queryClient.invalidateQueries({ queryKey: ["mp-inqueritos"] });
      setActiveAction("none");
      setReqForm({ descricao: "", prazo_dias: "10" });
      toast.success("Diligência requisitada à Polícia!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!ip) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const cfg = IP_STATUS[ip.status] || IP_STATUS.remetido_mp;
  const investigados = envolvidos?.filter((e) => e.tipo === "investigado") || [];
  const vitimas = envolvidos?.filter((e) => e.tipo === "vitima") || [];
  const testemunhas = envolvidos?.filter((e) => e.tipo === "testemunha") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-foreground">{ip.numero}</h2>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
            {ip.sigilo && <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Sigiloso</span>}
          </div>
          <p className="text-sm text-muted-foreground">Inquérito Policial — Análise Ministerial</p>
        </div>
      </div>

      {/* Tabs for full inquiry view */}
      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="resumo" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Resumo</TabsTrigger>
          <TabsTrigger value="envolvidos" className="rounded-lg text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Envolvidos ({envolvidos?.length || 0})</TabsTrigger>
          <TabsTrigger value="diligencias" className="rounded-lg text-xs"><Search className="h-3 w-3 mr-1" /> Diligências ({diligencias?.length || 0})</TabsTrigger>
          <TabsTrigger value="oitivas" className="rounded-lg text-xs"><BookOpen className="h-3 w-3 mr-1" /> Oitivas ({oitivas?.length || 0})</TabsTrigger>
          {bo && <TabsTrigger value="bo" className="rounded-lg text-xs"><Shield className="h-3 w-3 mr-1" /> Boletim de Ocorrência</TabsTrigger>}
        </TabsList>

        {/* RESUMO */}
        <TabsContent value="resumo" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">Descrição dos Fatos</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{ip.descricao}</p>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
              <span>Tipo: <strong className="text-foreground">{ip.tipo}</strong></span>
              <span>Instaurado: {format(new Date(ip.data_instauracao), "dd/MM/yyyy", { locale: ptBR })}</span>
              {ip.data_conclusao && <span>Concluso: {format(new Date(ip.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}</span>}
              <span>Remetido MP: {ip.remetido_mp ? "Sim" : "Não"}</span>
            </div>
          </div>

          {ip.relatorio_final && (
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Relatório Final da Polícia</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{ip.relatorio_final}</p>
            </div>
          )}

          {/* Quick summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-lg font-bold text-foreground">{investigados.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Investigados</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-lg font-bold text-foreground">{vitimas.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Vítimas</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-lg font-bold text-foreground">{diligencias?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Diligências</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border text-center">
              <p className="text-lg font-bold text-foreground">{oitivas?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Oitivas</p>
            </div>
          </div>
        </TabsContent>

        {/* ENVOLVIDOS */}
        <TabsContent value="envolvidos" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <EnvolvidoCard title="Investigados" items={investigados} icon={AlertTriangle} color="text-destructive" />
            <EnvolvidoCard title="Vítimas" items={vitimas} icon={Shield} color="text-gold-dark" />
            <EnvolvidoCard title="Testemunhas" items={testemunhas} icon={Eye} color="text-institutional" />
          </div>
        </TabsContent>

        {/* DILIGÊNCIAS COMPLETAS */}
        <TabsContent value="diligencias" className="mt-4 space-y-3">
          {!diligencias?.length ? (
            <EmptyState icon={Search} text="Nenhuma diligência registrada neste inquérito." />
          ) : (
            diligencias.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{d.tipo}</span>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${d.status === 'concluida' ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' : 'bg-gold/10 text-gold-dark'}`}>{d.status}</span>
                  {d.responsavel_nome && <span className="text-[10px] text-muted-foreground ml-auto">Resp: {d.responsavel_nome}</span>}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{d.descricao}</p>
                {d.resultado && (
                  <div className="mt-2 p-3 rounded-lg bg-secondary/50 border border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resultado</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{d.resultado}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* OITIVAS COMPLETAS */}
        <TabsContent value="oitivas" className="mt-4 space-y-3">
          {!oitivas?.length ? (
            <EmptyState icon={BookOpen} text="Nenhuma oitiva registrada neste inquérito." />
          ) : (
            oitivas.map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <BookOpen className="h-4 w-4 text-institutional" />
                  <span className="text-sm font-semibold text-foreground">{o.nome_depoente}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{o.tipo}</span>
                </div>
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans bg-secondary/30 rounded-lg p-3 max-h-64 overflow-y-auto">{o.conteudo}</pre>
                <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* BOLETIM DE OCORRÊNCIA */}
        {bo && (
          <TabsContent value="bo" className="mt-4 space-y-4">
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="font-mono text-sm font-semibold text-institutional">{bo.numero}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{bo.tipo}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{bo.status}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div><span className="text-xs text-muted-foreground uppercase">Vítima:</span> <span className="text-foreground">{bo.vitima_nome}</span></div>
                {bo.local_fato && <div><span className="text-xs text-muted-foreground uppercase">Local:</span> <span className="text-foreground">{bo.local_fato}</span></div>}
                {bo.data_fato && <div><span className="text-xs text-muted-foreground uppercase">Data do fato:</span> <span className="text-foreground">{format(new Date(bo.data_fato), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span></div>}
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Descrição:</span>
                  <p className="text-foreground whitespace-pre-wrap mt-1">{bo.descricao}</p>
                </div>
              </div>
            </div>

            {/* Envolvidos do BO */}
            {envolvidosBo && envolvidosBo.length > 0 && (
              <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
                <h3 className="font-display text-sm font-semibold text-foreground mb-3">Envolvidos no B.O.</h3>
                <div className="space-y-2">
                  {envolvidosBo.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm py-1 border-b border-border last:border-0">
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{e.tipo}</span>
                      <span className="text-foreground">{e.nome}</span>
                      {e.id_personagem && <span className="text-xs text-muted-foreground">(ID: {e.id_personagem})</span>}
                      {e.observacoes && <span className="text-xs text-muted-foreground ml-auto">{e.observacoes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Actions */}
      {ip.status === "remetido_mp" && activeAction === "none" && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Decisão Ministerial</h3>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setActiveAction("denuncia")} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Gavel className="h-4 w-4 mr-2" /> Oferecer Denúncia
            </Button>
            <Button onClick={() => setActiveAction("requisicao")} variant="outline" className="rounded-xl">
              <Send className="h-4 w-4 mr-2" /> Requisitar Diligência
            </Button>
            <Button onClick={() => setActiveAction("arquivamento")} variant="outline" className="rounded-xl text-muted-foreground">
              <Archive className="h-4 w-4 mr-2" /> Promover Arquivamento
            </Button>
          </div>
        </div>
      )}

      {/* Denúncia form */}
      {activeAction === "denuncia" && (
        <div className="bg-card rounded-xl p-5 border-2 border-institutional/30 shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-institutional" /> Oferecimento de Denúncia
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); oferecarDenuncia.mutate(); }} className="space-y-4">
            <Input placeholder="Tipificação penal (ex: Art. 155, CP — Furto)" value={denunciaForm.tipificacao} onChange={(e) => setDenunciaForm({ ...denunciaForm, tipificacao: e.target.value })} className="rounded-xl" />
            <Textarea placeholder="Resumo da denúncia..." value={denunciaForm.resumo} onChange={(e) => setDenunciaForm({ ...denunciaForm, resumo: e.target.value })} required rows={3} className="rounded-xl" />
            <Textarea placeholder="Fundamentação jurídica..." value={denunciaForm.fundamentacao} onChange={(e) => setDenunciaForm({ ...denunciaForm, fundamentacao: e.target.value })} required rows={5} className="rounded-xl" />
            <div className="flex gap-2">
              <Button type="submit" disabled={oferecarDenuncia.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                {oferecarDenuncia.isPending ? "Processando..." : "Oferecer Denúncia"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveAction("none")} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Arquivamento form */}
      {activeAction === "arquivamento" && (
        <div className="bg-card rounded-xl p-5 border-2 border-gold/30 shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Archive className="h-4 w-4 text-gold-dark" /> Promoção de Arquivamento
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); promoverArquivamento.mutate(); }} className="space-y-4">
            <Textarea placeholder="Justificativa fundamentada para o arquivamento..." value={arquivForm.justificativa} onChange={(e) => setArquivForm({ justificativa: e.target.value })} required rows={5} className="rounded-xl" />
            <div className="flex gap-2">
              <Button type="submit" disabled={promoverArquivamento.isPending} className="rounded-xl bg-gold hover:bg-gold/90 text-foreground">
                {promoverArquivamento.isPending ? "Processando..." : "Promover Arquivamento"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveAction("none")} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Requisição form */}
      {activeAction === "requisicao" && (
        <div className="bg-card rounded-xl p-5 border-2 border-institutional/30 shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-institutional" /> Requisição de Diligência
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); requisitarDiligencia.mutate(); }} className="space-y-4">
            <Textarea placeholder="Descreva a diligência a ser requisitada à Polícia..." value={reqForm.descricao} onChange={(e) => setReqForm({ ...reqForm, descricao: e.target.value })} required rows={4} className="rounded-xl" />
            <Input type="number" placeholder="Prazo em horas" value={reqForm.prazo_dias} onChange={(e) => setReqForm({ ...reqForm, prazo_dias: e.target.value })} className="rounded-xl w-40" />
            <div className="flex gap-2">
              <Button type="submit" disabled={requisitarDiligencia.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                {requisitarDiligencia.isPending ? "Enviando..." : "Requisitar Diligência"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveAction("none")} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  OUVIDORIA DETAIL                           */
/* ═══════════════════════════════════════════ */
function OuvidoriaDetail({ denunciaId, onBack }: { denunciaId: string; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<"none" | "inquerito" | "denuncia" | "arquivamento">("none");

  const { data: denuncia } = useQuery({
    queryKey: ["ouvidoria-detail", denunciaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("denuncias_ouvidoria" as any).select("*").eq("id", denunciaId).single();
      if (error) throw error;
      return data as any;
    },
  });

  // ── INSTAURAR INQUÉRITO ──
  const [inqForm, setInqForm] = useState({ tipo: "criminal", descricao: "" });
  const instaurarInquerito = useMutation({
    mutationFn: async () => {
      const desc = inqForm.descricao || denuncia?.descricao || "";
      if (!desc) throw new Error("Descrição obrigatória.");
      const { error } = await supabase.from("inqueritos").insert({
        numero: "",
        tipo: inqForm.tipo,
        descricao: desc,
        data_instauracao: new Date().toISOString(),
        remetido_mp: true,
      } as any);
      if (error) throw error;
      await supabase.from("denuncias_ouvidoria" as any).update({ status: "encaminhada" }).eq("id", denunciaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ouvidoria-detail", denunciaId] });
      queryClient.invalidateQueries({ queryKey: ["mp-denuncias-ouvidoria"] });
      queryClient.invalidateQueries({ queryKey: ["mp-inqueritos"] });
      setActiveAction("none");
      toast.success("Inquérito instaurado com base na denúncia da ouvidoria!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── OFERECER DENÚNCIA DIRETA ──
  const [denForm, setDenForm] = useState({ resumo: "", fundamentacao: "", tipificacao: "" });
  const oferecerDenuncia = useMutation({
    mutationFn: async () => {
      if (!denForm.resumo || !denForm.fundamentacao) throw new Error("Preencha resumo e fundamentação.");
      const envolvidos = Array.isArray(denuncia?.envolvidos) ? denuncia.envolvidos : [];
      const reuNome = envolvidos.map((e: any) => e.nome).join(", ") || "Réu a identificar";
      const { data: juizData } = await supabase.rpc("sortear_magistrado");
      const juizId = juizData || null;
      const { data: processo, error: procErr } = await supabase.from("processos").insert({
        numero: "",
        classe: "criminal" as const,
        assunto: denForm.tipificacao || "Ação Penal",
        autor_nome: "Ministério Público",
        reu_nome: reuNome,
        descricao: denForm.resumo,
        sigilo: "segredo_justica",
        juiz_id: juizId,
      }).select("id, numero").single();
      if (procErr) throw procErr;
      const { error: denErr } = await supabase.from("denuncias_mp").insert({
        promotor_id: user!.id,
        resumo: denForm.resumo,
        fundamentacao: denForm.fundamentacao,
        tipificacao: denForm.tipificacao,
        status: "oferecida",
        processo_id: processo.id,
      } as any);
      if (denErr) throw denErr;
      await supabase.from("movimentacoes").insert({
        processo_id: processo.id,
        tipo: "denuncia",
        descricao: `Denúncia oferecida pelo MP com base em denúncia da ouvidoria. Processo ${processo.numero} distribuído.`,
        autor_id: user!.id,
      });
      await supabase.from("denuncias_ouvidoria" as any).update({ status: "encaminhada" }).eq("id", denunciaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ouvidoria-detail", denunciaId] });
      queryClient.invalidateQueries({ queryKey: ["mp-denuncias-ouvidoria"] });
      queryClient.invalidateQueries({ queryKey: ["mp-denuncias"] });
      setActiveAction("none");
      toast.success("Denúncia oferecida e processo criminal distribuído!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── ARQUIVAR ──
  const [arquivJust, setArquivJust] = useState("");
  const arquivarDenuncia = useMutation({
    mutationFn: async () => {
      if (!arquivJust) throw new Error("Justificativa obrigatória.");
      await supabase.from("denuncias_ouvidoria" as any).update({ status: "arquivada" }).eq("id", denunciaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ouvidoria-detail", denunciaId] });
      queryClient.invalidateQueries({ queryKey: ["mp-denuncias-ouvidoria"] });
      setActiveAction("none");
      toast.success("Denúncia arquivada.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!denuncia) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const envolvidos = Array.isArray(denuncia.envolvidos) ? denuncia.envolvidos : [];
  const dLinks = Array.isArray(denuncia.links) ? denuncia.links : [];
  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    recebida: { label: "Recebida", color: "bg-gold/10 text-gold-dark" },
    em_analise: { label: "Em Análise", color: "bg-institutional/10 text-institutional" },
    encaminhada: { label: "Encaminhada", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
    arquivada: { label: "Arquivada", color: "bg-muted text-muted-foreground" },
  };
  const st = STATUS_MAP[denuncia.status] || STATUS_MAP.recebida;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-foreground">Denúncia da Ouvidoria</h2>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Recebida em {format(new Date(denuncia.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {denuncia.nome_denunciante && denuncia.nome_denunciante !== "Anônimo" ? ` — Denunciante: ${denuncia.nome_denunciante}` : " — Denúncia Anônima"}
          </p>
        </div>
      </div>

      {/* Dados do Denunciante */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Dados do Denunciante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-xs text-muted-foreground uppercase">Nome:</span> <span className="text-foreground font-medium">{denuncia.nome_denunciante || "Anônimo"}</span></div>
          <div><span className="text-xs text-muted-foreground uppercase">Contato:</span> <span className="text-foreground">{denuncia.contato_denunciante || "Não informado"}</span></div>
        </div>
      </div>

      {/* Relato */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Relato da Denúncia</h3>
        <p className="text-sm text-foreground whitespace-pre-wrap">{denuncia.descricao}</p>
      </div>

      {/* Envolvidos */}
      {envolvidos.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Envolvidos Identificados ({envolvidos.length})</h3>
          <div className="space-y-2">
            {envolvidos.map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <AlertTriangle className="h-4 w-4 text-gold-dark flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{e.nome}</p>
                  {e.funcao && <p className="text-xs text-muted-foreground">Função/Cargo: {e.funcao}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links e Provas */}
      {dLinks.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Links de Provas e Anexos ({dLinks.length})</h3>
          <div className="space-y-2">
            {dLinks.map((l: string, i: number) => (
              <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gold hover:underline py-1">
                <Eye className="h-4 w-4 flex-shrink-0" /> {l}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Ações - sempre visíveis exceto quando arquivada/encaminhada */}
      {denuncia.status !== "arquivada" && denuncia.status !== "encaminhada" && activeAction === "none" && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Decisão Ministerial</h3>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setActiveAction("inquerito")} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Shield className="h-4 w-4 mr-2" /> Instaurar Inquérito
            </Button>
            <Button onClick={() => setActiveAction("denuncia")} variant="outline" className="rounded-xl">
              <Gavel className="h-4 w-4 mr-2" /> Oferecer Denúncia Direta
            </Button>
            <Button onClick={async () => {
              await supabase.from("denuncias_ouvidoria" as any).update({ status: "em_analise" }).eq("id", denunciaId);
              queryClient.invalidateQueries({ queryKey: ["ouvidoria-detail", denunciaId] });
              queryClient.invalidateQueries({ queryKey: ["mp-denuncias-ouvidoria"] });
              toast.success("Status atualizado para Em Análise.");
            }} variant="outline" className="rounded-xl">
              <Clock className="h-4 w-4 mr-2" /> Marcar Em Análise
            </Button>
            <Button onClick={() => setActiveAction("arquivamento")} variant="outline" className="rounded-xl text-muted-foreground">
              <Archive className="h-4 w-4 mr-2" /> Arquivar
            </Button>
          </div>
        </div>
      )}

      {/* Instaurar Inquérito Form */}
      {activeAction === "inquerito" && (
        <div className="bg-card rounded-xl p-5 border-2 border-institutional/30 shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-institutional" /> Instaurar Inquérito Policial
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); instaurarInquerito.mutate(); }} className="space-y-4">
            <Select value={inqForm.tipo} onValueChange={(v) => setInqForm({ ...inqForm, tipo: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="criminal">Criminal</SelectItem>
                <SelectItem value="civil">Civil</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Descrição (pré-preenchida com o relato da denúncia)..." value={inqForm.descricao || denuncia.descricao} onChange={(e) => setInqForm({ ...inqForm, descricao: e.target.value })} required rows={5} className="rounded-xl" />
            <div className="flex gap-2">
              <Button type="submit" disabled={instaurarInquerito.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                {instaurarInquerito.isPending ? "Processando..." : "Instaurar Inquérito"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveAction("none")} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Denúncia Direta Form */}
      {activeAction === "denuncia" && (
        <div className="bg-card rounded-xl p-5 border-2 border-institutional/30 shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Gavel className="h-4 w-4 text-institutional" /> Oferecimento de Denúncia
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); oferecerDenuncia.mutate(); }} className="space-y-4">
            <Input placeholder="Tipificação penal (ex: Art. 155, CP — Furto)" value={denForm.tipificacao} onChange={(e) => setDenForm({ ...denForm, tipificacao: e.target.value })} className="rounded-xl" />
            <Textarea placeholder="Resumo da denúncia..." value={denForm.resumo} onChange={(e) => setDenForm({ ...denForm, resumo: e.target.value })} required rows={3} className="rounded-xl" />
            <Textarea placeholder="Fundamentação jurídica..." value={denForm.fundamentacao} onChange={(e) => setDenForm({ ...denForm, fundamentacao: e.target.value })} required rows={5} className="rounded-xl" />
            <div className="flex gap-2">
              <Button type="submit" disabled={oferecerDenuncia.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                {oferecerDenuncia.isPending ? "Processando..." : "Oferecer Denúncia"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveAction("none")} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Arquivamento Form */}
      {activeAction === "arquivamento" && (
        <div className="bg-card rounded-xl p-5 border-2 border-gold/30 shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Archive className="h-4 w-4 text-gold-dark" /> Arquivamento da Denúncia
          </h3>
          <form onSubmit={(e) => { e.preventDefault(); arquivarDenuncia.mutate(); }} className="space-y-4">
            <Textarea placeholder="Justificativa para o arquivamento..." value={arquivJust} onChange={(e) => setArquivJust(e.target.value)} required rows={5} className="rounded-xl" />
            <div className="flex gap-2">
              <Button type="submit" disabled={arquivarDenuncia.isPending} className="rounded-xl bg-gold hover:bg-gold/90 text-foreground">
                {arquivarDenuncia.isPending ? "Processando..." : "Arquivar Denúncia"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveAction("none")} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function EnvolvidoCard({ title, items, icon: Icon, color }: { title: string; items: any[]; icon: any; color: string }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} /> {title} ({items.length})
      </h4>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((e) => (
            <div key={e.id} className="text-sm text-foreground border-b border-border last:border-0 pb-1.5 last:pb-0">
              <p className="font-medium">{e.nome} {e.id_personagem && <span className="text-xs text-muted-foreground">(ID: {e.id_personagem})</span>}</p>
              {e.qualificacao && <p className="text-xs text-muted-foreground">Qualificação: {e.qualificacao}</p>}
              {e.observacoes && <p className="text-xs text-muted-foreground italic">{e.observacoes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum registro.</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  COMUNICAÇÕES EXTERNAS TAB                  */
/* ═══════════════════════════════════════════ */
function ComunicacoesExternasTab({ isMP, onSelectIP }: { isMP: boolean; onSelectIP?: (id: string) => void }) {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<"inbox" | "api-keys" | "docs">("inbox");
  const [openKey, setOpenKey] = useState(false);
  const [keyForm, setKeyForm] = useState({ orgao: "policia_civil", nome_sistema: "" });
  const [openResponder, setOpenResponder] = useState(false);
  const [respostaForm, setRespostaForm] = useState({ titulo: "", conteudo: "", comunicacao_id: "" });

  const isAdmin = roles.includes("admin");
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-mp`;

  // Comunicações recebidas (entrada)
  const { data: comunicacoes } = useQuery({
    queryKey: ["comunicacoes-externas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comunicacoes_externas" as any)
        .select("*, api_keys_externas!api_key_id(orgao, nome_sistema)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // API Keys
  const { data: apiKeys } = useQuery({
    queryKey: ["api-keys-externas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_keys_externas" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: isAdmin,
  });

  // Fetch linked inqueritos for display
  const inqueritoIds = [...new Set((comunicacoes || []).map((c: any) => c.inquerito_id).filter(Boolean))];
  const { data: linkedInqueritos } = useQuery({
    queryKey: ["linked-inqueritos", inqueritoIds],
    queryFn: async () => {
      if (inqueritoIds.length === 0) return [];
      const { data, error } = await supabase.from("inqueritos").select("id, numero, status").in("id", inqueritoIds);
      if (error) throw error;
      return data;
    },
    enabled: inqueritoIds.length > 0,
  });

  const createKey = useMutation({
    mutationFn: async () => {
      if (!keyForm.nome_sistema) throw new Error("Preencha o nome do sistema.");
      const { error } = await supabase.from("api_keys_externas" as any).insert(keyForm);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("API Key criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["api-keys-externas"] });
      setOpenKey(false);
      setKeyForm({ orgao: "policia_civil", nome_sistema: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleKey = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("api_keys_externas" as any).update({ ativo: !ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["api-keys-externas"] });
    },
  });

  const responderComunicacao = useMutation({
    mutationFn: async () => {
      if (!respostaForm.titulo || !respostaForm.conteudo) throw new Error("Preencha todos os campos.");
      const original = comunicacoes?.find((c: any) => c.id === respostaForm.comunicacao_id);
      if (!original) throw new Error("Comunicação original não encontrada.");
      const { error } = await supabase.from("comunicacoes_externas" as any).insert({
        api_key_id: original.api_key_id,
        orgao_origem: "ministerio_publico",
        tipo: "resposta_mp",
        direcao: "saida",
        titulo: respostaForm.titulo,
        conteudo: respostaForm.conteudo,
        resposta_a: respostaForm.comunicacao_id,
        inquerito_id: original.inquerito_id || null,
        status: "pendente",
      });
      if (error) throw error;
      await supabase.from("comunicacoes_externas" as any).update({ status: "respondido" }).eq("id", respostaForm.comunicacao_id);
    },
    onSuccess: () => {
      toast.success("Resposta enviada!");
      queryClient.invalidateQueries({ queryKey: ["comunicacoes-externas"] });
      setOpenResponder(false);
      setRespostaForm({ titulo: "", conteudo: "", comunicacao_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const marcarLido = async (id: string) => {
    await supabase.from("comunicacoes_externas" as any).update({ status: "lido", lido_em: new Date().toISOString(), lido_por: user?.id }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["comunicacoes-externas"] });
    toast.success("Marcado como lido.");
  };

  const orgaoLabels: Record<string, string> = {
    policia_civil: "Polícia Civil",
    policia_federal: "Polícia Federal",
    receita: "Receita Federal",
    ministerio_publico: "Ministério Público",
  };

  const tipoLabels: Record<string, string> = {
    inquerito: "Inquérito",
    denuncia: "Denúncia",
    comunicacao: "Comunicação",
    resposta_mp: "Resposta MP",
  };

  const statusColors: Record<string, string> = {
    pendente: "bg-gold/10 text-gold-dark",
    recebido: "bg-accent/20 text-accent-foreground",
    lido: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400",
    respondido: "bg-institutional/10 text-institutional",
  };

  const entradas = comunicacoes?.filter((c: any) => c.direcao === "entrada") || [];

  const getLinkedInquerito = (inqueritoId: string | null) => {
    if (!inqueritoId || !linkedInqueritos) return null;
    return linkedInqueritos.find((ip) => ip.id === inqueritoId);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={subTab === "inbox" ? "default" : "outline"} onClick={() => setSubTab("inbox")}>
          <MessageSquare className="h-3 w-3 mr-1" /> Caixa de Entrada ({entradas.length})
        </Button>
        {isAdmin && (
          <Button size="sm" variant={subTab === "api-keys" ? "default" : "outline"} onClick={() => setSubTab("api-keys")}>
            <Shield className="h-3 w-3 mr-1" /> API Keys
          </Button>
        )}
        <Button size="sm" variant={subTab === "docs" ? "default" : "outline"} onClick={() => setSubTab("docs")}>
          <BookOpen className="h-3 w-3 mr-1" /> Documentação da API
        </Button>
      </div>

      {/* INBOX */}
      {subTab === "inbox" && (
        <div className="space-y-2">
          {!entradas.length ? (
            <EmptyState icon={MessageSquare} text="Nenhuma comunicação externa recebida." />
          ) : (
            entradas.map((c: any, i: number) => {
              const linkedIP = getLinkedInquerito(c.inquerito_id);
              const ipCfg = linkedIP ? (IP_STATUS[linkedIP.status] || IP_STATUS.remetido_mp) : null;
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-institutional">{orgaoLabels[c.orgao_origem] || c.orgao_origem}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusColors[c.status] || ""}`}>{c.status}</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{tipoLabels[c.tipo] || c.tipo}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-1">{c.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.conteudo}</p>
                      {c.numero_referencia && <p className="text-xs text-muted-foreground mt-0.5">Ref: {c.numero_referencia}</p>}

                      {/* Linked Inquérito */}
                      {linkedIP && (
                        <div
                          className="mt-2 flex items-center gap-2 bg-institutional/5 border border-institutional/20 rounded-lg px-3 py-2 cursor-pointer hover:bg-institutional/10 transition-colors"
                          onClick={() => onSelectIP?.(linkedIP.id)}
                        >
                          <Shield className="h-4 w-4 text-institutional flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-institutional">{linkedIP.numero}</p>
                            <p className="text-[10px] text-muted-foreground">Inquérito vinculado — clique para ver detalhes e tomar decisões</p>
                          </div>
                          {ipCfg && <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${ipCfg.color}`}>{ipCfg.label}</span>}
                          <ChevronRight className="h-4 w-4 text-institutional flex-shrink-0" />
                        </div>
                      )}

                      {c.envolvidos && Array.isArray(c.envolvidos) && c.envolvidos.length > 0 && (
                        <div className="mt-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Envolvidos:</p>
                          {c.envolvidos.map((e: any, idx: number) => (
                            <p key={idx} className="text-xs text-foreground">{e.nome || e} {e.id_personagem && `(ID: ${e.id_personagem})`}</p>
                          ))}
                        </div>
                      )}
                      {c.links && Array.isArray(c.links) && c.links.length > 0 && (
                        <div className="mt-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Links:</p>
                          {c.links.map((l: any, idx: number) => (
                            <a key={idx} href={typeof l === "string" ? l : l.url} target="_blank" rel="noreferrer" className="text-xs text-institutional underline block">{typeof l === "string" ? l : l.descricao || l.url}</a>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {c.status === "pendente" && (
                        <Button size="sm" variant="outline" onClick={() => marcarLido(c.id)} className="text-xs">
                          <Eye className="h-3 w-3 mr-1" /> Lido
                        </Button>
                      )}
                      {linkedIP && onSelectIP && (
                        <Button size="sm" variant="outline" onClick={() => onSelectIP(linkedIP.id)} className="text-xs bg-institutional/10 text-institutional border-institutional/30 hover:bg-institutional/20">
                          <Shield className="h-3 w-3 mr-1" /> Ver Inquérito
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setRespostaForm({ titulo: `RE: ${c.titulo}`, conteudo: "", comunicacao_id: c.id }); setOpenResponder(true); }} className="text-xs">
                        <Send className="h-3 w-3 mr-1" /> Responder
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* API KEYS */}
      {subTab === "api-keys" && isAdmin && (
        <div className="space-y-3">
          <Dialog open={openKey} onOpenChange={setOpenKey}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3 w-3 mr-1" /> Nova API Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Gerar API Key para Sistema Externo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={keyForm.orgao} onValueChange={(v) => setKeyForm({ ...keyForm, orgao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policia_civil">Polícia Civil</SelectItem>
                    <SelectItem value="policia_federal">Polícia Federal</SelectItem>
                    <SelectItem value="receita">Receita Federal</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Nome do sistema (ex: Delegacia Virtual SP)" value={keyForm.nome_sistema} onChange={(e) => setKeyForm({ ...keyForm, nome_sistema: e.target.value })} />
                <Button onClick={() => createKey.mutate()} disabled={createKey.isPending} className="w-full">
                  {createKey.isPending ? "Criando..." : "Gerar API Key"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {apiKeys?.map((k: any) => (
            <div key={k.id} className="bg-card rounded-xl p-4 border border-border shadow-institutional">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{k.nome_sistema}</p>
                  <p className="text-xs text-muted-foreground">{orgaoLabels[k.orgao] || k.orgao}</p>
                  <code className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded mt-1 inline-block break-all">{k.api_key}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${k.ativo ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                    {k.ativo ? "Ativa" : "Inativa"}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => toggleKey.mutate({ id: k.id, ativo: k.ativo })}>
                    {k.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DOCUMENTAÇÃO */}
      {subTab === "docs" && (
        <div className="bg-card rounded-xl p-6 border border-border shadow-institutional space-y-4">
          <h3 className="text-lg font-bold text-foreground">📡 Documentação da API do MP — v2.0</h3>
          <p className="text-sm text-muted-foreground">
            Esta API permite que sistemas externos (Delegacia Virtual, Polícia Federal, Receita Federal) enviem inquéritos,
            denúncias e comunicações diretamente ao Ministério Público. Inquéritos e denúncias enviados são automaticamente
            registrados no sistema do MP, permitindo ao Promotor oferecer denúncia criminal, arquivar ou requisitar diligências.
          </p>

          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
            <h4 className="text-sm font-bold text-green-800 dark:text-green-400 mb-1">✨ Novidade v2.0 — Inquéritos integrados</h4>
            <p className="text-xs text-green-700 dark:text-green-500">
              Ao enviar um inquérito ou denúncia, o sistema cria automaticamente um registro de inquérito no MP.
              Use os novos endpoints <code className="bg-green-200 dark:bg-green-900 px-1 rounded">GET /meus-inqueritos</code> e <code className="bg-green-200 dark:bg-green-900 px-1 rounded">GET /inquerito/:id</code> para
              acompanhar o andamento completo, incluindo diligências, requisições, denúncias oferecidas e arquivamentos.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">🔑 Autenticação</h4>
              <p className="text-xs text-muted-foreground mb-1">Todas as requisições devem incluir o header <code className="bg-secondary px-1 rounded">X-API-Key</code>.</p>
              <pre className="bg-secondary/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`Headers:
  X-API-Key: sua-api-key-aqui
  Content-Type: application/json`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">🔗 URL Base</h4>
              <pre className="bg-secondary/50 p-3 rounded-lg text-xs font-mono overflow-x-auto break-all">{baseUrl}</pre>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">📨 POST /enviar-inquerito</h4>
              <p className="text-xs text-muted-foreground mb-1">Envia um inquérito policial. Cria automaticamente um inquérito no sistema do MP com envolvidos.</p>
              <pre className="bg-secondary/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`Request:
{
  "titulo": "Inquérito sobre furto qualificado",
  "conteudo": "Descrição detalhada dos fatos...",
  "envolvidos": [
    { "nome": "João Silva", "id_personagem": "12345", "tipo": "investigado" },
    { "nome": "Maria Souza", "tipo": "vitima" }
  ],
  "links": [
    { "url": "https://drive.google.com/...", "descricao": "Relatório de perícia" }
  ],
  "numero_referencia": "IP-000123/2026"
}

Response:
{
  "sucesso": true,
  "mensagem": "Inquérito enviado ao MP com sucesso e registrado no sistema",
  "id": "uuid-comunicacao",
  "inquerito_id": "uuid-inquerito",
  "inquerito_numero": "IP-000001/2026",
  "criado_em": "2026-03-24T..."
}`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">📨 POST /enviar-denuncia</h4>
              <p className="text-xs text-muted-foreground mb-1">Envia uma denúncia. Mesma estrutura do inquérito. Também cria inquérito vinculado.</p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">📨 POST /enviar-comunicacao</h4>
              <p className="text-xs text-muted-foreground mb-1">Comunicação genérica. Aceita <code className="bg-secondary px-1 rounded">resposta_a</code> (UUID) e <code className="bg-secondary px-1 rounded">inquerito_id</code> (UUID) para vincular a um inquérito.</p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">📋 GET /meus-inqueritos <span className="text-green-600 text-[10px] ml-1">NOVO</span></h4>
              <p className="text-xs text-muted-foreground mb-1">Lista todos os inquéritos enviados pelo seu órgão, com status atualizado.</p>
              <pre className="bg-secondary/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`Parâmetros: ?limite=50&pagina=1

Response:
{
  "inqueritos": [
    {
      "id": "uuid",
      "numero": "IP-000001/2026",
      "status": "remetido_mp",
      "descricao": "...",
      "data_instauracao": "2026-03-24T...",
      ...
    }
  ],
  "total": 5,
  "pagina": 1,
  "limite": 50
}`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">🔍 GET /inquerito/:id <span className="text-green-600 text-[10px] ml-1">NOVO</span></h4>
              <p className="text-xs text-muted-foreground mb-1">Acompanha o andamento completo de um inquérito: envolvidos, diligências, requisições do MP, denúncias oferecidas e arquivamentos.</p>
              <pre className="bg-secondary/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`Response:
{
  "inquerito": { "id": "...", "numero": "IP-...", "status": "remetido_mp", ... },
  "envolvidos": [{ "nome": "João", "tipo": "investigado", ... }],
  "diligencias": [{ "tipo": "investigacao", "status": "concluida", ... }],
  "requisicoes_mp": [{ "descricao": "...", "prazo_dias": 10, "status": "pendente" }],
  "comunicacoes": [{ "titulo": "...", "direcao": "entrada", ... }],
  "denuncias": [{ "numero_protocolo": "DN-...", "status": "oferecida", ... }],
  "arquivamentos": []
}`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">📥 GET /comunicacoes</h4>
              <p className="text-xs text-muted-foreground mb-1">Lista comunicações do MP para o seu órgão. Agora inclui <code className="bg-secondary px-1 rounded">inquerito_id</code> em cada comunicação.</p>
              <pre className="bg-secondary/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`Parâmetros: ?status=pendente&desde=2026-01-01&limite=50&pagina=1`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">✅ PUT /marcar-lido/:id</h4>
              <p className="text-xs text-muted-foreground mb-1">Marca uma comunicação do MP como lida.</p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">🟢 GET /status</h4>
              <p className="text-xs text-muted-foreground mb-1">Verifica o status da API e identifica o órgão autenticado.</p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-foreground">💡 Exemplo completo com cURL</h4>
              <pre className="bg-secondary/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`# 1. Enviar inquérito
curl -X POST "${baseUrl}/enviar-inquerito" \\
  -H "X-API-Key: sua-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "titulo": "Inquérito furto qualificado",
    "conteudo": "Descrição dos fatos...",
    "envolvidos": [{"nome": "João", "tipo": "investigado"}]
  }'

# 2. Acompanhar inquérito
curl "${baseUrl}/inquerito/UUID_DO_INQUERITO" \\
  -H "X-API-Key: sua-api-key"

# 3. Listar todos os inquéritos
curl "${baseUrl}/meus-inqueritos" \\
  -H "X-API-Key: sua-api-key"

# 4. Enviar comunicação vinculada ao inquérito
curl -X POST "${baseUrl}/enviar-comunicacao" \\
  -H "X-API-Key: sua-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "titulo": "Complemento de informações",
    "conteudo": "Segue relatório adicional...",
    "inquerito_id": "UUID_DO_INQUERITO"
  }'`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Dialog responder */}
      <Dialog open={openResponder} onOpenChange={setOpenResponder}>
        <DialogContent>
          <DialogHeader><DialogTitle>Responder Comunicação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título da resposta" value={respostaForm.titulo} onChange={(e) => setRespostaForm({ ...respostaForm, titulo: e.target.value })} />
            <Textarea placeholder="Conteúdo da resposta..." value={respostaForm.conteudo} onChange={(e) => setRespostaForm({ ...respostaForm, conteudo: e.target.value })} rows={5} />
            <Button onClick={() => responderComunicacao.mutate()} disabled={responderComunicacao.isPending} className="w-full">
              {responderComunicacao.isPending ? "Enviando..." : "Enviar Resposta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
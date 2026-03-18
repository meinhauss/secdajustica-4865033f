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
  const [view, setView] = useState<"list" | "inquerito-detail" | "processo-detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isMP = roles.some((r) => ["admin", "ministerio_publico", "procurador_geral"].includes(r));

  if (view === "inquerito-detail" && selectedId) {
    return <InqueritoMPDetail ipId={selectedId} onBack={() => { setView("list"); setSelectedId(null); }} />;
  }

  return (
    <MPDashboard
      isMP={isMP}
      onSelectIP={(id) => { setSelectedId(id); setView("inquerito-detail"); }}
    />
  );
}

/* ═══════════════════════════════════════════ */
/*  MP DASHBOARD                               */
/* ═══════════════════════════════════════════ */
function MPDashboard({ isMP, onSelectIP }: { isMP: boolean; onSelectIP: (id: string) => void }) {
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

        {/* ESTATÍSTICAS TAB */}
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
      const { data: processo, error: procErr } = await supabase.from("processos").insert({
        numero: "",
        classe: "criminal" as const,
        assunto: denunciaForm.tipificacao || "Ação Penal",
        autor_nome: "Ministério Público",
        reu_nome: reuNome,
        descricao: denunciaForm.resumo,
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
      toast.success("Diligência requisitada ao Delegado!");
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Relatório Final do Delegado</p>
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
            <Textarea placeholder="Descreva a diligência a ser requisitada ao Delegado..." value={reqForm.descricao} onChange={(e) => setReqForm({ ...reqForm, descricao: e.target.value })} required rows={4} className="rounded-xl" />
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

/* ─── Helper Components ─── */
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

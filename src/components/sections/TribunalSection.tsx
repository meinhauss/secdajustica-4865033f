import { useState } from "react";
import { formatPartesShort } from "@/lib/formatPartes";
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
  Scale, FileText, Search, ArrowLeft, ChevronRight,
  Gavel, CheckCircle, Clock, XCircle, BarChart3, Eye,
  BookOpen, AlertTriangle, Scroll
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  interposta: { label: "Interposta", color: "bg-gold/10 text-gold-dark" },
  admitida: { label: "Admitida", color: "bg-institutional/10 text-institutional" },
  em_julgamento: { label: "Em Julgamento", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400" },
  julgada: { label: "Julgada", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
  inadmitida: { label: "Inadmitida", color: "bg-destructive/10 text-destructive" },
};

const DECISAO_LABELS: Record<string, string> = {
  mantida: "Sentença Mantida",
  reformada_parcial: "Reformada Parcialmente",
  reformada_total: "Reformada Totalmente",
  anulada: "Sentença Anulada",
};

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

export default function TribunalSection() {
  const [view, setView] = useState<"dashboard" | "detail">("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (view === "detail" && selectedId) {
    return <ApelacaoDetail apelacaoId={selectedId} onBack={() => { setView("dashboard"); setSelectedId(null); }} />;
  }

  return <TribunalDashboard onSelect={(id) => { setSelectedId(id); setView("detail"); }} />;
}

/* ═══════════════════════════════════════ */
/*  DASHBOARD                              */
/* ═══════════════════════════════════════ */
function TribunalDashboard({ onSelect }: { onSelect: (id: string) => void }) {
  const { user, roles } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const isDesembargador = roles.some(r => ["desembargador", "presidente_tribunal", "admin"].includes(r));

  const { data: apelacoes } = useQuery({
    queryKey: ["tribunal-apelacoes", user?.id, isDesembargador],
    queryFn: async () => {
      let q = supabase.from("apelacoes").select("*, processos(numero, autor_nome, reu_nome, classe, assunto), sentencas(tipo, ementa, dispositivo)").order("created_at", { ascending: false });
      // Desembargadores see appeals assigned to them or unassigned
      if (isDesembargador && !roles.includes("admin")) {
        q = q.or(`desembargador_id.eq.${user!.id},desembargador_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const filtered = apelacoes?.filter((a: any) => {
    const matchSearch = !search ||
      a.numero_acordao?.toLowerCase().includes(search.toLowerCase()) ||
      a.apelante_nome?.toLowerCase().includes(search.toLowerCase()) ||
      a.processos?.numero?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchStatus;
  }) || [];

  const stats = {
    total: apelacoes?.length || 0,
    interpostas: apelacoes?.filter((a: any) => a.status === "interposta").length || 0,
    admitidas: apelacoes?.filter((a: any) => a.status === "admitida").length || 0,
    em_julgamento: apelacoes?.filter((a: any) => a.status === "em_julgamento").length || 0,
    julgadas: apelacoes?.filter((a: any) => a.status === "julgada").length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Tribunal de Justiça — Apelações</h2>
        <p className="text-sm text-muted-foreground">Gestão de recursos e acórdãos da segunda instância</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} icon={Scale} delay={0} />
        <StatCard label="Interpostas" value={stats.interpostas} icon={Clock} delay={0.05} />
        <StatCard label="Admitidas" value={stats.admitidas} icon={CheckCircle} delay={0.1} />
        <StatCard label="Em Julgamento" value={stats.em_julgamento} icon={Gavel} delay={0.15} />
        <StatCard label="Julgadas" value={stats.julgadas} icon={Scroll} delay={0.2} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por acórdão, apelante ou processo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="rounded-xl w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="interposta">Interpostas</SelectItem>
            <SelectItem value="admitida">Admitidas</SelectItem>
            <SelectItem value="em_julgamento">Em Julgamento</SelectItem>
            <SelectItem value="julgada">Julgadas</SelectItem>
            <SelectItem value="inadmitida">Inadmitidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filtered.length ? (
        <div className="text-center py-16">
          <Scale className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma apelação encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a: any, i: number) => {
            const cfg = STATUS_CFG[a.status] || STATUS_CFG.interposta;
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => onSelect(a.id)}
                className="bg-card rounded-xl p-4 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-institutional">{a.numero_acordao}</span>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{a.apelante_tipo === "reu" ? "Réu" : a.apelante_tipo === "autor" ? "Autor" : a.apelante_tipo === "defesa" ? "Defesa" : a.apelante_tipo === "acusacao" ? "Acusação" : "Ambas as partes"}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">
                      Processo: {a.processos?.numero} — {formatPartesShort(a.processos?.autor_nome || "")} vs {formatPartesShort(a.processos?.reu_nome || "")}
                    </p>
                    <p className="text-xs text-muted-foreground">Apelante: {a.apelante_nome}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*  DETAIL                                 */
/* ═══════════════════════════════════════ */
function ApelacaoDetail({ apelacaoId, onBack }: { apelacaoId: string; onBack: () => void }) {
  const { user, profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const isDesembargador = roles.some(r => ["desembargador", "presidente_tribunal", "admin"].includes(r));

  const { data: apelacao } = useQuery({
    queryKey: ["tribunal-apelacao", apelacaoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("apelacoes").select("*, processos(numero, autor_nome, reu_nome, classe, assunto, status, vara, sigilo), sentencas(tipo, ementa, fundamentacao, dispositivo, assinado, data_publicacao, magistrado_id)").eq("id", apelacaoId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: magistradoProfile } = useQuery({
    queryKey: ["magistrado-profile", apelacao?.sentencas?.magistrado_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("nome_completo").eq("user_id", apelacao.sentencas.magistrado_id).single();
      return data;
    },
    enabled: !!apelacao?.sentencas?.magistrado_id,
  });

  // Admitir apelação
  const admitirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("apelacoes").update({
        status: "admitida",
        desembargador_id: user!.id,
        data_distribuicao: new Date().toISOString(),
      }).eq("id", apelacaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Apelação admitida e distribuída!");
      queryClient.invalidateQueries({ queryKey: ["tribunal"] });
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
    },
  });

  const inadmitirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("apelacoes").update({ status: "inadmitida" }).eq("id", apelacaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Apelação inadmitida.");
      queryClient.invalidateQueries({ queryKey: ["tribunal"] });
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
    },
  });

  // Julgar
  const [showJulgar, setShowJulgar] = useState(false);
  const [decisaoTipo, setDecisaoTipo] = useState("mantida");
  const [decisaoFund, setDecisaoFund] = useState("");
  const [decisaoDisp, setDecisaoDisp] = useState("");

  const julgarMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("apelacoes").update({
        status: "julgada",
        decisao_tipo: decisaoTipo,
        decisao_fundamentacao: decisaoFund,
        decisao_dispositivo: decisaoDisp,
        data_julgamento: now,
      }).eq("id", apelacaoId);
      if (error) throw error;

      // Add movimentação to the process
      await supabase.from("movimentacoes").insert({
        processo_id: apelacao.processo_id,
        autor_id: user!.id,
        tipo: "acordao",
        descricao: `Acórdão proferido pelo TJ (${apelacao.numero_acordao}): ${DECISAO_LABELS[decisaoTipo] || decisaoTipo}`,
      });

      // Generate jurisprudência from the acórdão
      const ementa = `${DECISAO_LABELS[decisaoTipo] || decisaoTipo}. ${apelacao.processos?.classe ? apelacao.processos.classe.toUpperCase() + ". " : ""}${apelacao.processos?.assunto || ""}. Processo nº ${apelacao.processos?.numero || ""}.`;
      await supabase.from("jurisprudencias").insert({
        apelacao_id: apelacaoId,
        processo_id: apelacao.processo_id,
        numero_acordao: apelacao.numero_acordao,
        classe: apelacao.processos?.classe || null,
        assunto: apelacao.processos?.assunto || null,
        ementa,
        decisao_tipo: decisaoTipo,
        decisao_fundamentacao: decisaoFund,
        decisao_dispositivo: decisaoDisp,
        desembargador_id: user!.id,
        desembargador_nome: profile?.nome_completo || null,
        data_julgamento: now,
      });
    },
    onSuccess: () => {
      toast.success("Acórdão registrado e jurisprudência gerada!");
      setShowJulgar(false);
      queryClient.invalidateQueries({ queryKey: ["tribunal"] });
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
    },
  });

  if (!apelacao) return <div className="text-center py-16"><p className="text-sm text-muted-foreground">Carregando...</p></div>;

  const cfg = STATUS_CFG[apelacao.status] || STATUS_CFG.interposta;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>

      {/* Header */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <Scale className="h-6 w-6 text-institutional" />
          <h2 className="font-display text-xl font-bold text-foreground">{apelacao.numero_acordao}</h2>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Processo Originário</p>
            <p className="font-mono text-foreground">{apelacao.processos?.numero}</p>
            <p className="text-muted-foreground text-xs">{formatPartesShort(apelacao.processos?.autor_nome || "")} vs {formatPartesShort(apelacao.processos?.reu_nome || "")}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Apelante</p>
            <p className="text-foreground">{apelacao.apelante_nome}</p>
            <p className="text-muted-foreground text-xs capitalize">{apelacao.apelante_tipo === "reu" ? "Réu" : apelacao.apelante_tipo === "autor" ? "Autor" : apelacao.apelante_tipo === "defesa" ? "Defesa" : apelacao.apelante_tipo === "acusacao" ? "Acusação" : "Ambas as partes"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Magistrado de 1ª Instância</p>
            <p className="text-foreground">{magistradoProfile?.nome_completo || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Interposta em</p>
            <p className="text-foreground">{format(new Date(apelacao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recurso" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="recurso" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Recurso</TabsTrigger>
          <TabsTrigger value="sentenca" className="rounded-lg text-xs"><Scroll className="h-3 w-3 mr-1" /> Sentença Recorrida</TabsTrigger>
          {apelacao.status === "julgada" && <TabsTrigger value="acordao" className="rounded-lg text-xs"><Gavel className="h-3 w-3 mr-1" /> Acórdão</TabsTrigger>}
        </TabsList>

        <TabsContent value="recurso" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Fundamentação do Recurso</h3>
            <RichTextView html={apelacao.fundamentacao} className="text-sm" />
          </div>
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Pedido</h3>
            <RichTextView html={apelacao.pedido} className="text-sm" />
          </div>
        </TabsContent>

        <TabsContent value="sentenca" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl p-5 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Scroll className="h-4 w-4 text-gold-dark" />
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{apelacao.sentencas?.tipo?.replace("_", " ")}</span>
            </div>
            {apelacao.sentencas?.ementa && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ementa</h4>
                <p className="text-sm text-foreground mt-1">{apelacao.sentencas.ementa}</p>
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fundamentação</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{apelacao.sentencas?.fundamentacao}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispositivo</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{apelacao.sentencas?.dispositivo}</p>
            </div>
          </div>
        </TabsContent>

        {apelacao.status === "julgada" && (
          <TabsContent value="acordao" className="mt-4 space-y-4">
            <div className="bg-card rounded-xl p-5 border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-institutional" />
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${apelacao.decisao_tipo === "mantida" ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" : apelacao.decisao_tipo === "anulada" ? "bg-destructive/10 text-destructive" : "bg-gold/10 text-gold-dark"}`}>
                  {DECISAO_LABELS[apelacao.decisao_tipo] || apelacao.decisao_tipo}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fundamentação</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{apelacao.decisao_fundamentacao}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispositivo</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{apelacao.decisao_dispositivo}</p>
              </div>
              {apelacao.data_julgamento && (
                <p className="text-xs text-muted-foreground">Julgado em: {format(new Date(apelacao.data_julgamento), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Actions */}
      {isDesembargador && (
        <div className="bg-card rounded-xl p-5 border border-border space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Ações do Desembargador</h3>

          {apelacao.status === "interposta" && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => admitirMutation.mutate()} disabled={admitirMutation.isPending} className="gap-2">
                <CheckCircle className="h-4 w-4" /> Admitir Apelação
              </Button>
              <Button variant="destructive" onClick={() => inadmitirMutation.mutate()} disabled={inadmitirMutation.isPending} className="gap-2">
                <XCircle className="h-4 w-4" /> Inadmitir
              </Button>
            </div>
          )}

          {apelacao.status === "admitida" && (
            <Button onClick={async () => {
              const { error } = await supabase.from("apelacoes").update({ status: "em_julgamento" }).eq("id", apelacaoId);
              if (!error) {
                toast.success("Apelação em julgamento.");
                queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
              }
            }} className="gap-2">
              <Gavel className="h-4 w-4" /> Iniciar Julgamento
            </Button>
          )}

          {apelacao.status === "em_julgamento" && (
            <>
              <Button onClick={() => setShowJulgar(true)} className="gap-2">
                <Scroll className="h-4 w-4" /> Proferir Acórdão
              </Button>

              <Dialog open={showJulgar} onOpenChange={setShowJulgar}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Proferir Acórdão — {apelacao.numero_acordao}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Decisão</label>
                      <Select value={decisaoTipo} onValueChange={setDecisaoTipo}>
                        <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mantida">Sentença Mantida</SelectItem>
                          <SelectItem value="reformada_parcial">Reformada Parcialmente</SelectItem>
                          <SelectItem value="reformada_total">Reformada Totalmente</SelectItem>
                          <SelectItem value="anulada">Sentença Anulada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Fundamentação</label>
                      <Textarea value={decisaoFund} onChange={(e) => setDecisaoFund(e.target.value)} placeholder="Fundamentação jurídica do acórdão..." rows={6} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Dispositivo</label>
                      <Textarea value={decisaoDisp} onChange={(e) => setDecisaoDisp(e.target.value)} placeholder="Parte dispositiva da decisão..." rows={4} className="mt-1" />
                    </div>
                    <Button onClick={() => julgarMutation.mutate()} disabled={julgarMutation.isPending || !decisaoFund || !decisaoDisp} className="w-full gap-2">
                      <Gavel className="h-4 w-4" /> Registrar Acórdão
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {apelacao.status === "julgada" && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Apelação julgada.</p>
          )}

          {apelacao.status === "inadmitida" && (
            <p className="text-sm text-destructive flex items-center gap-2"><XCircle className="h-4 w-4" /> Apelação inadmitida.</p>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { RichTextView, RichTextEditor } from "@/components/ui/rich-text-editor";
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
  BookOpen, AlertTriangle, Scroll, Megaphone, Star, History as HistoryIcon,
  ExternalLink
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

export default function TribunalSection({ onOpenProcesso }: { onOpenProcesso?: (id: string) => void } = {}) {
  const [view, setView] = useState<"dashboard" | "detail" | "originario">("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (view === "detail" && selectedId) {
    return <ApelacaoDetail apelacaoId={selectedId} onBack={() => { setView("dashboard"); setSelectedId(null); }} />;
  }

  if (view === "originario" && selectedId) {
    return <OriginarioTribunalDetail processoId={selectedId} onBack={() => { setView("dashboard"); setSelectedId(null); }} />;
  }

  return <TribunalDashboard 
    onSelect={(id) => { setSelectedId(id); setView("detail"); }} 
    onSelectOriginario={(id) => { setSelectedId(id); setView("originario"); }}
    onOpenProcesso={onOpenProcesso} 
  />;
}

/* ═══════════════════════════════════════ */
/*  DASHBOARD                              */
/* ═══════════════════════════════════════ */
function TribunalDashboard({ onSelect, onSelectOriginario, onOpenProcesso }: { onSelect: (id: string) => void; onSelectOriginario: (id: string) => void; onOpenProcesso?: (id: string) => void }) {
  const { user, roles } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const isDesembargador = roles.some(r => ["desembargador", "presidente_tribunal", "admin", "magistrado"].includes(r));

  const { data: apelacoes } = useQuery({
    queryKey: ["tribunal-apelacoes", user?.id, isDesembargador],
    queryFn: async () => {
      // All desembargadores can see all appeals (to qualify, vote, accompany)
      const q = supabase.from("apelacoes").select("*, processos:processo_id(numero, autor_nome, reu_nome, autor_label, reu_label, classe, assunto), sentencas:sentenca_id(tipo, ementa, dispositivo)").order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: originarios } = useQuery({
    queryKey: ["tribunal-originarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("id, numero, autor_nome, reu_nome, autor_label, reu_label, classe, classe_originaria, orgao_julgador, assunto, status, created_at, sigilo, prioridade, relator_id")
        .eq("instancia", 2)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = apelacoes?.filter((a: any) => {
    const matchSearch = !search ||
      a.numero_acordao?.toLowerCase().includes(search.toLowerCase()) ||
      a.apelante_nome?.toLowerCase().includes(search.toLowerCase()) ||
      (a.processos?.numero || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.sentencas?.dispositivo || "").toLowerCase().includes(search.toLowerCase());
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
                      Processo: {a.processos?.numero} — {formatPartesShort(a.processos?.autor_nome || "")} ({a.processos?.autor_label || "Autor"}) vs {formatPartesShort(a.processos?.reu_nome || "")} ({a.processos?.reu_label || "Réu"})
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

      {originarios && originarios.length > 0 && (
        <div className="space-y-2 pt-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-foreground">Processos Originários (2ª Instância)</h3>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{originarios.length}</span>
          </div>
          {originarios.map((p: any, i: number) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => onSelectOriginario(p.id)}
              className="bg-card rounded-xl p-4 border-2 border-institutional/40 shadow-institutional hover:border-institutional transition-all cursor-pointer group">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-institutional">{p.numero}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-institutional text-gold-light">2ª Instância</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{p.classe_originaria?.replace(/_/g, " ").toUpperCase()}</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.orgao_julgador}</span>
                  </div>
                  <p className="text-sm text-foreground mt-1 truncate">{p.assunto}</p>
                  <p className="text-xs text-muted-foreground">{formatPartesShort(p.autor_nome || "")} ({p.autor_label || "Autor"}) vs {formatPartesShort(p.reu_nome || "")} ({p.reu_label || "Réu"})</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
              </div>
            </motion.div>
          ))}
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
  const isDesembargador = roles.some(r => ["desembargador", "presidente_tribunal", "admin", "magistrado"].includes(r));

  const { data: apelacao } = useQuery({
    queryKey: ["tribunal-apelacao", apelacaoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("apelacoes").select("*, processos:processo_id(numero, autor_nome, reu_nome, autor_label, reu_label, classe, assunto, status, vara, sigilo, advogado_autor_id, advogado_reu_id), sentencas:sentenca_id(tipo, ementa, fundamentacao, dispositivo, assinado, data_publicacao, magistrado_id)").eq("id", apelacaoId).single();
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

  // Votos
  const { data: votos } = useQuery({
    queryKey: ["tribunal-votos", apelacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votos_apelacao")
        .select("*")
        .eq("apelacao_id", apelacaoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const meuVoto = votos?.find((v) => v.desembargador_id === user?.id);
  const votoRelator = votos?.find((v) => v.tipo === "relator");

  const notifyDesembargadores = async (titulo: string, mensagem: string) => {
    const { data: desembs } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["desembargador", "presidente_tribunal"]);
    const ids = Array.from(new Set((desembs || []).map((d: any) => d.user_id)));
    if (!ids.length) return;
    await supabase.from("notificacoes").insert(
      ids.map((uid) => ({ user_id: uid, titulo, mensagem, tipo: "processo", link_secao: "tribunal" }))
    );
  };

  // Relator profile (for header display)
  const { data: relatorProfile } = useQuery({
    queryKey: ["relator-profile", apelacao?.desembargador_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("nome_completo").eq("user_id", apelacao!.desembargador_id).single();
      return data;
    },
    enabled: !!apelacao?.desembargador_id,
  });

  // Qualificar como relator (antes de admitir)
  const qualificarRelatorMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("apelacoes")
        .update({ desembargador_id: user!.id })
        .eq("id", apelacaoId);
      if (error) throw error;
      if (apelacao?.processo_id) {
        await supabase.from("movimentacoes").insert({
          processo_id: apelacao.processo_id,
          tipo: "relator_designado",
          descricao: `${profile?.nome_completo || "Desembargador(a)"} assumiu como Relator(a) da apelação ${apelacao.numero_acordao}.`,
          autor_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Você se qualificou como Relator desta apelação.");
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
      queryClient.invalidateQueries({ queryKey: ["tribunal"] });
    },
  });

  // Admitir / Inadmitir com razões
  const [showAdmitir, setShowAdmitir] = useState(false);
  const [showInadmitir, setShowInadmitir] = useState(false);
  const [razoesAdm, setRazoesAdm] = useState("");
  const [razoesInadm, setRazoesInadm] = useState("");

  const admitirMutation = useMutation({
    mutationFn: async () => {
      if (!razoesAdm || razoesAdm === "<p></p>") throw new Error("Informe as razões da admissão.");
      const { error } = await supabase.from("apelacoes").update({
        status: "admitida",
        desembargador_id: user!.id,
        data_distribuicao: new Date().toISOString(),
        razoes_admissao: razoesAdm,
      }).eq("id", apelacaoId);
      if (error) throw error;
      if (apelacao?.processo_id) {
        await supabase.from("movimentacoes").insert({
          processo_id: apelacao.processo_id,
          tipo: "apelacao_admitida",
          descricao: `Apelação admitida pelo Relator ${profile?.nome_completo || ""}.\n\nRazões da admissão:\n${razoesAdm}`,
          autor_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Apelação admitida!");
      setShowAdmitir(false);
      setRazoesAdm("");
      queryClient.invalidateQueries({ queryKey: ["tribunal"] });
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const inadmitirMutation = useMutation({
    mutationFn: async () => {
      if (!razoesInadm || razoesInadm === "<p></p>") throw new Error("Informe as razões da inadmissão.");
      const { error } = await supabase.from("apelacoes").update({
        status: "inadmitida",
        razoes_inadmissao: razoesInadm,
      }).eq("id", apelacaoId);
      if (error) throw error;
      if (apelacao?.processo_id) {
        await supabase.from("movimentacoes").insert({
          processo_id: apelacao.processo_id,
          tipo: "apelacao_inadmitida",
          descricao: `Apelação inadmitida pelo Relator ${profile?.nome_completo || ""}.\n\nRazões da inadmissão:\n${razoesInadm}`,
          autor_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Apelação inadmitida.");
      setShowInadmitir(false);
      setRazoesInadm("");
      queryClient.invalidateQueries({ queryKey: ["tribunal"] });
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Iniciar julgamento — notifica desembargadores
  const iniciarJulgamentoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("apelacoes").update({ status: "em_julgamento" }).eq("id", apelacaoId);
      if (error) throw error;
      await notifyDesembargadores(
        "Julgamento iniciado",
        `Apelação ${apelacao.numero_acordao} entrou em julgamento.`
      );
      if (apelacao?.processo_id) {
        await supabase.from("movimentacoes").insert({
          processo_id: apelacao.processo_id,
          tipo: "julgamento_iniciado",
          descricao: `Julgamento da apelação ${apelacao.numero_acordao} iniciado pelo Relator ${profile?.nome_completo || ""}.`,
          autor_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Julgamento iniciado e desembargadores notificados.");
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
    },
  });

  // Pedido de destaque (qualquer parte)
  const [showDestaque, setShowDestaque] = useState(false);
  const [destaqueJust, setDestaqueJust] = useState("");

  const isAdvAutor = (apelacao as any)?.processos?.advogado_autor_id === user?.id;
  const isAdvReu = (apelacao as any)?.processos?.advogado_reu_id === user?.id;
  const isMP = roles.includes("ministerio_publico") || roles.includes("procurador_geral");
  const podePedirDestaque = (isAdvAutor || isAdvReu || isMP || isDesembargador) && !apelacao?.destaque_solicitado && apelacao?.status !== "julgada" && apelacao?.status !== "inadmitida";

  const minhaQualificacao = isAdvAutor
    ? "Advogado(a) do Autor"
    : isAdvReu
    ? "Advogado(a) do Réu"
    : isMP
    ? "Ministério Público"
    : isDesembargador
    ? "Desembargador(a)"
    : "Parte interessada";

  const solicitarDestaqueMutation = useMutation({
    mutationFn: async () => {
      if (!destaqueJust || destaqueJust === "<p></p>") throw new Error("Informe a justificativa do pedido de destaque.");
      const { error } = await supabase.from("apelacoes").update({
        destaque_solicitado: true,
        destaque_justificativa: destaqueJust,
        destaque_solicitante_id: user!.id,
        destaque_solicitante_nome: profile?.nome_completo || "",
        destaque_solicitante_qualificacao: minhaQualificacao,
        destaque_solicitado_em: new Date().toISOString(),
      } as any).eq("id", apelacaoId);
      if (error) throw error;
      if (apelacao?.processo_id) {
        await supabase.from("movimentacoes").insert({
          processo_id: apelacao.processo_id,
          tipo: "pedido_destaque",
          descricao: `Pedido de destaque (retirada do julgamento virtual e remessa à sessão presencial) formulado por ${profile?.nome_completo || ""} (${minhaQualificacao}).\n\nJustificativa:\n${destaqueJust}`,
          autor_id: user!.id,
        });
        await notifyDesembargadores(
          "Pedido de destaque",
          `${profile?.nome_completo || "Uma parte"} solicitou destaque na apelação ${apelacao.numero_acordao}.`
        );
      }
    },
    onSuccess: () => {
      toast.success("Pedido de destaque registrado.");
      setShowDestaque(false);
      setDestaqueJust("");
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
      queryClient.invalidateQueries({ queryKey: ["tribunal"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Voto do relator
  const [showVotoRelator, setShowVotoRelator] = useState(false);
  const [decisaoTipo, setDecisaoTipo] = useState("mantida");
  const [decisaoFund, setDecisaoFund] = useState("");
  const [decisaoDisp, setDecisaoDisp] = useState("");

  const registrarVotoRelatorMutation = useMutation({
    mutationFn: async () => {
      if (!decisaoFund || decisaoFund === "<p></p>") throw new Error("Informe a fundamentação.");
      if (!decisaoDisp || decisaoDisp === "<p></p>") throw new Error("Informe o dispositivo.");
      const { error } = await supabase.from("votos_apelacao").insert({
        apelacao_id: apelacaoId,
        desembargador_id: user!.id,
        desembargador_nome: profile?.nome_completo || "Relator",
        tipo: "relator",
        decisao_tipo: decisaoTipo,
        fundamentacao: decisaoFund,
        dispositivo: decisaoDisp,
      });
      if (error) throw error;
      if (apelacao?.processo_id) {
        await supabase.from("movimentacoes").insert({
          processo_id: apelacao.processo_id,
          tipo: "voto_relator",
          descricao: `Voto do Relator ${profile?.nome_completo || ""} na apelação ${apelacao.numero_acordao}: ${DECISAO_LABELS[decisaoTipo] || decisaoTipo}.\n\nFundamentação:\n${decisaoFund}\n\nDispositivo:\n${decisaoDisp}`,
          autor_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Voto do relator registrado!");
      setShowVotoRelator(false);
      queryClient.invalidateQueries({ queryKey: ["tribunal-votos", apelacaoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Voto dos demais (acompanha ou próprio)
  const [showVoto, setShowVoto] = useState(false);
  const [tipoVoto, setTipoVoto] = useState<"acompanha" | "proprio">("acompanha");
  const [vDecisao, setVDecisao] = useState("mantida");
  const [vFund, setVFund] = useState("");
  const [vDisp, setVDisp] = useState("");
  const [vRessalvas, setVRessalvas] = useState("");

  const registrarVotoMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        apelacao_id: apelacaoId,
        desembargador_id: user!.id,
        desembargador_nome: profile?.nome_completo || "Desembargador(a)",
        tipo: tipoVoto,
      };
      if (tipoVoto === "acompanha") {
        if (!votoRelator) throw new Error("Voto do relator ainda não foi proferido.");
        payload.acompanha_voto_id = votoRelator.id;
        payload.decisao_tipo = votoRelator.decisao_tipo;
        if (vRessalvas && vRessalvas !== "<p></p>") payload.ressalvas = vRessalvas;
      } else {
        if (!vFund || vFund === "<p></p>") throw new Error("Informe a fundamentação.");
        if (!vDisp || vDisp === "<p></p>") throw new Error("Informe o dispositivo.");
        payload.decisao_tipo = vDecisao;
        payload.fundamentacao = vFund;
        payload.dispositivo = vDisp;
      }
      const { error } = await supabase.from("votos_apelacao").insert(payload);
      if (error) throw error;
      if (apelacao?.processo_id) {
        let desc = "";
        if (tipoVoto === "acompanha") {
          desc = `${profile?.nome_completo || "Desembargador(a)"} acompanhou o voto do Relator na apelação ${apelacao.numero_acordao}.`;
          if (vRessalvas && vRessalvas !== "<p></p>") desc += `\n\nRessalvas:\n${vRessalvas}`;
        } else {
          desc = `Voto divergente proferido por ${profile?.nome_completo || "Desembargador(a)"} na apelação ${apelacao.numero_acordao}: ${DECISAO_LABELS[vDecisao] || vDecisao}.\n\nFundamentação:\n${vFund}\n\nDispositivo:\n${vDisp}`;
        }
        await supabase.from("movimentacoes").insert({
          processo_id: apelacao.processo_id,
          tipo: tipoVoto === "acompanha" ? "voto_acompanha" : "voto_divergente",
          descricao: desc,
          autor_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Voto registrado!");
      setShowVoto(false);
      setVRessalvas("");
      queryClient.invalidateQueries({ queryKey: ["tribunal-votos", apelacaoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Proclamar acórdão (consolida votos)
  const proclamarMutation = useMutation({
    mutationFn: async () => {
      if (!votoRelator) throw new Error("Sem voto do relator.");
      const now = new Date().toISOString();
      // Decisão majoritária por contagem
      const counts: Record<string, number> = {};
      (votos || []).forEach((v) => {
        const t = v.decisao_tipo || votoRelator.decisao_tipo;
        if (t) counts[t] = (counts[t] || 0) + 1;
      });
      const decisaoFinal = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || votoRelator.decisao_tipo;

      const { error } = await supabase.from("apelacoes").update({
        status: "julgada",
        decisao_tipo: decisaoFinal,
        decisao_fundamentacao: votoRelator.fundamentacao,
        decisao_dispositivo: votoRelator.dispositivo,
        data_julgamento: now,
      }).eq("id", apelacaoId);
      if (error) throw error;

      await supabase.from("movimentacoes").insert({
        processo_id: apelacao.processo_id,
        autor_id: user!.id,
        tipo: "acordao",
        descricao: `Acórdão proferido pelo TJ (${apelacao.numero_acordao}): ${DECISAO_LABELS[decisaoFinal] || decisaoFinal}`,
      });

      // Se sentença foi ANULADA: revogar sentença e reabrir o processo
      if (decisaoFinal === "anulada" && apelacao.sentenca_id) {
        await supabase.from("sentencas").update({
          anulada: true,
          anulada_em: now,
          anulada_por_apelacao_id: apelacaoId,
        }).eq("id", apelacao.sentenca_id);

        await supabase.from("processos").update({
          status: "em_andamento",
        }).eq("id", apelacao.processo_id);

        await supabase.from("movimentacoes").insert({
          processo_id: apelacao.processo_id,
          autor_id: user!.id,
          tipo: "sentenca_anulada",
          descricao: `<h2>SENTENÇA ANULADA PELO TRIBUNAL DE JUSTIÇA</h2><p>Em julgamento da apelação <strong>${apelacao.numero_acordao}</strong>, o Tribunal de Justiça <strong>ANULOU</strong> a sentença anteriormente proferida, que perde todos os seus efeitos.</p><p>O processo retorna ao seu curso regular perante a vara de origem para nova instrução e julgamento.</p>`,
        });
      }

      const ementa = `EMENTA: ${apelacao.processos?.classe ? apelacao.processos.classe.toUpperCase() : "APELAÇÃO"}. ${apelacao.processos?.assunto ? apelacao.processos.assunto.toUpperCase() : "ASSUNTO NÃO INFORMADO"}. ${DECISAO_LABELS[decisaoFinal]?.toUpperCase() || decisaoFinal.toUpperCase()}.\n\n1. ACÓRDÃO PROFERIDO EM 2ª INSTÂNCIA PELO TRIBUNAL DE JUSTIÇA.\n2. PROCESSO Nº ${apelacao.processos?.numero || ""}.\n3. RELATOR: ${votoRelator.desembargador_nome.toUpperCase()}.`;
      await supabase.from("jurisprudencias").insert({
        apelacao_id: apelacaoId,
        processo_id: apelacao.processo_id,
        numero_acordao: apelacao.numero_acordao,
        classe: apelacao.processos?.classe || null,
        assunto: apelacao.processos?.assunto || null,
        ementa,
        decisao_tipo: decisaoFinal,
        decisao_fundamentacao: votoRelator.fundamentacao,
        decisao_dispositivo: votoRelator.dispositivo,
        desembargador_id: votoRelator.desembargador_id,
        desembargador_nome: votoRelator.desembargador_nome,
        data_julgamento: now,
      });
    },
    onSuccess: () => {
      toast.success("Acórdão proclamado!");
      queryClient.invalidateQueries({ queryKey: ["tribunal"] });
      queryClient.invalidateQueries({ queryKey: ["tribunal-apelacao"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!apelacao) return <div className="text-center py-16"><p className="text-sm text-muted-foreground">Carregando...</p></div>;

  const cfg = STATUS_CFG[apelacao.status] || STATUS_CFG.interposta;
  const isRelator = apelacao.desembargador_id === user?.id;
  const semRelator = !apelacao.desembargador_id;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>

      {/* Header */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <Scale className="h-6 w-6 text-institutional" />
          <h2 className="font-display text-xl font-bold text-foreground">{apelacao.numero_acordao}</h2>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          {apelacao.desembargador_id && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">
              Relator: {relatorProfile?.nome_completo || "—"}
            </span>
          )}
        </div>
        {apelacao.desembargador_id && (
          <p className="text-xs text-muted-foreground -mt-1 mb-2">
            <span className="font-semibold text-foreground">Relator(a):</span> {relatorProfile?.nome_completo || "—"}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Processo Originário</p>
            <p className="font-mono text-foreground">{apelacao.processos?.numero}</p>
            <p className="text-muted-foreground text-xs">{formatPartesShort(apelacao.processos?.autor_nome || "")} ({apelacao.processos?.autor_label || "Autor"}) vs {formatPartesShort(apelacao.processos?.reu_nome || "")} ({apelacao.processos?.reu_label || "Réu"})</p>
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

      {apelacao.destaque_solicitado && (
        <div className="bg-gold/10 border border-gold/40 rounded-xl p-4 flex items-start gap-3">
          <Star className="h-5 w-5 text-gold-dark mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Pedido de destaque registrado</p>
            <p className="text-xs text-muted-foreground">
              Solicitado por {apelacao.destaque_solicitante_nome} ({apelacao.destaque_solicitante_qualificacao})
              {apelacao.destaque_solicitado_em && ` em ${format(new Date(apelacao.destaque_solicitado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
            </p>
            <div className="mt-2 text-sm">
              <RichTextView html={apelacao.destaque_justificativa} />
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="recurso" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="recurso" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Recurso</TabsTrigger>
          <TabsTrigger value="sentenca" className="rounded-lg text-xs"><Scroll className="h-3 w-3 mr-1" /> Sentença Recorrida</TabsTrigger>
          {(apelacao.razoes_admissao || apelacao.razoes_inadmissao) && (
            <TabsTrigger value="admissao" className="rounded-lg text-xs"><BookOpen className="h-3 w-3 mr-1" /> Admissibilidade</TabsTrigger>
          )}
          {(apelacao.status === "em_julgamento" || apelacao.status === "julgada") && (
            <TabsTrigger value="votos" className="rounded-lg text-xs"><Gavel className="h-3 w-3 mr-1" /> Votos</TabsTrigger>
          )}
          {apelacao.status === "julgada" && <TabsTrigger value="acordao" className="rounded-lg text-xs"><Scroll className="h-3 w-3 mr-1" /> Acórdão</TabsTrigger>}
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
              <RichTextView html={apelacao.sentencas?.fundamentacao} className="text-sm mt-1" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispositivo</h4>
              <RichTextView html={apelacao.sentencas?.dispositivo} className="text-sm mt-1" />
            </div>
          </div>
        </TabsContent>

        {(apelacao.razoes_admissao || apelacao.razoes_inadmissao) && (
          <TabsContent value="admissao" className="mt-4 space-y-4">
            {apelacao.razoes_admissao && (
              <div className="bg-card rounded-xl p-5 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2">Razões da Admissão</h3>
                <RichTextView html={apelacao.razoes_admissao} className="text-sm" />
              </div>
            )}
            {apelacao.razoes_inadmissao && (
              <div className="bg-card rounded-xl p-5 border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2">Razões da Inadmissão</h3>
                <RichTextView html={apelacao.razoes_inadmissao} className="text-sm" />
              </div>
            )}
          </TabsContent>
        )}

        {(apelacao.status === "em_julgamento" || apelacao.status === "julgada") && (
          <TabsContent value="votos" className="mt-4 space-y-3">
            {!votos?.length && <p className="text-sm text-muted-foreground">Nenhum voto registrado ainda.</p>}
            {votos?.map((v) => (
              <div key={v.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">
                    {v.tipo === "relator" ? "Relator" : v.tipo === "acompanha" ? "Acompanha o Relator" : "Voto Próprio"}
                  </span>
                  <span className="text-sm font-medium text-foreground">{v.desembargador_nome}</span>
                  {v.decisao_tipo && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {DECISAO_LABELS[v.decisao_tipo] || v.decisao_tipo}
                    </span>
                  )}
                </div>
                {v.tipo !== "acompanha" && (
                  <>
                    <div className="mt-2">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fundamentação</h5>
                      <RichTextView html={v.fundamentacao} className="text-sm" />
                    </div>
                    <div className="mt-2">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispositivo</h5>
                      <RichTextView html={v.dispositivo} className="text-sm" />
                    </div>
                  </>
                )}
                {v.tipo === "acompanha" && v.ressalvas && (
                  <div className="mt-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ressalvas / Razões</h5>
                    <RichTextView html={v.ressalvas} className="text-sm" />
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
        )}

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
                <RichTextView html={apelacao.decisao_fundamentacao} className="text-sm mt-1" />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispositivo</h4>
                <RichTextView html={apelacao.decisao_dispositivo} className="text-sm mt-1" />
              </div>
              {apelacao.data_julgamento && (
                <p className="text-xs text-muted-foreground">Julgado em: {format(new Date(apelacao.data_julgamento), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Pedido de destaque (qualquer parte) */}
      {podePedirDestaque && (
        <div className="bg-card rounded-xl p-5 border border-border space-y-3">
          <div className="flex items-start gap-2">
            <Megaphone className="h-4 w-4 text-gold-dark mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Pedido de Destaque</h3>
              <p className="text-xs text-muted-foreground">Retire este recurso do julgamento virtual e leve à sessão presencial mediante justificativa.</p>
            </div>
          </div>
          <Button onClick={() => setShowDestaque(true)} variant="outline" className="gap-2">
            <Star className="h-4 w-4" /> Solicitar destaque
          </Button>
        </div>
      )}

      {/* Actions */}
      {isDesembargador && (
        <div className="bg-card rounded-xl p-5 border border-border space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Ações do Desembargador</h3>

          {/* Qualificar como Relator */}
          {semRelator && apelacao.status === "interposta" && (
            <Button onClick={() => qualificarRelatorMutation.mutate()} disabled={qualificarRelatorMutation.isPending} variant="outline" className="gap-2">
              <Eye className="h-4 w-4" /> Qualificar-me como Relator
            </Button>
          )}

          {apelacao.status === "interposta" && (isRelator || roles.includes("admin")) && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setShowAdmitir(true)} className="gap-2">
                <CheckCircle className="h-4 w-4" /> Admitir
              </Button>
              <Button variant="destructive" onClick={() => setShowInadmitir(true)} className="gap-2">
                <XCircle className="h-4 w-4" /> Inadmitir
              </Button>
            </div>
          )}

          {apelacao.status === "interposta" && !isRelator && !semRelator && !roles.includes("admin") && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" /> Apenas o Relator pode admitir/inadmitir esta apelação.
            </p>
          )}

          {apelacao.status === "admitida" && (isRelator || roles.includes("admin")) && (
            <Button onClick={() => iniciarJulgamentoMutation.mutate()} disabled={iniciarJulgamentoMutation.isPending} className="gap-2">
              <Gavel className="h-4 w-4" /> Iniciar Julgamento
            </Button>
          )}

          {apelacao.status === "em_julgamento" && (
            <div className="space-y-2">
              {isRelator && !votoRelator && (
                <Button onClick={() => setShowVotoRelator(true)} className="gap-2">
                  <Scroll className="h-4 w-4" /> Proferir Voto do Relator
                </Button>
              )}

              {!isRelator && votoRelator && !meuVoto && (
                <Button onClick={() => setShowVoto(true)} className="gap-2">
                  <Gavel className="h-4 w-4" /> Proferir meu Voto
                </Button>
              )}

              {!votoRelator && !isRelator && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Aguardando voto do Relator.
                </p>
              )}

              {meuVoto && <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2"><CheckCircle className="h-3 w-3" /> Você já votou.</p>}

              {votoRelator && (votos?.length || 0) >= 3 && (isRelator || roles.includes("admin") || roles.includes("presidente_tribunal")) && (
                <Button onClick={() => proclamarMutation.mutate()} disabled={proclamarMutation.isPending} variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" /> Proclamar Acórdão
                </Button>
              )}
            </div>
          )}

          {apelacao.status === "julgada" && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Apelação julgada.</p>
          )}

          {apelacao.status === "inadmitida" && (
            <p className="text-sm text-destructive flex items-center gap-2"><XCircle className="h-4 w-4" /> Apelação inadmitida.</p>
          )}
        </div>
      )}

      {/* Dialog: Admitir */}
      <Dialog open={showAdmitir} onOpenChange={setShowAdmitir}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Admitir Apelação — Razões</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Razões da Admissão</label>
              <RichTextEditor value={razoesAdm} onChange={setRazoesAdm} placeholder="Fundamente a admissão da apelação..." minHeight="160px" className="mt-1" />
            </div>
            <Button onClick={() => admitirMutation.mutate()} disabled={admitirMutation.isPending} className="w-full gap-2">
              <CheckCircle className="h-4 w-4" /> Admitir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Inadmitir */}
      <Dialog open={showInadmitir} onOpenChange={setShowInadmitir}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Inadmitir Apelação — Razões</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Razões da Inadmissão</label>
              <RichTextEditor value={razoesInadm} onChange={setRazoesInadm} placeholder="Fundamente a inadmissão da apelação..." minHeight="160px" className="mt-1" />
            </div>
            <Button variant="destructive" onClick={() => inadmitirMutation.mutate()} disabled={inadmitirMutation.isPending} className="w-full gap-2">
              <XCircle className="h-4 w-4" /> Inadmitir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Voto do Relator */}
      <Dialog open={showVotoRelator} onOpenChange={setShowVotoRelator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Voto do Relator — {apelacao.numero_acordao}</DialogTitle></DialogHeader>
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
              <RichTextEditor value={decisaoFund} onChange={setDecisaoFund} placeholder="Fundamentação jurídica do voto..." minHeight="180px" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Dispositivo</label>
              <RichTextEditor value={decisaoDisp} onChange={setDecisaoDisp} placeholder="Parte dispositiva do voto..." minHeight="120px" className="mt-1" />
            </div>
            <Button onClick={() => registrarVotoRelatorMutation.mutate()} disabled={registrarVotoRelatorMutation.isPending} className="w-full gap-2">
              <Gavel className="h-4 w-4" /> Registrar Voto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Voto dos demais */}
      <Dialog open={showVoto} onOpenChange={setShowVoto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Meu Voto — {apelacao.numero_acordao}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Como deseja votar?</label>
              <Select value={tipoVoto} onValueChange={(v: any) => setTipoVoto(v)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acompanha">Acompanhar o voto do Relator</SelectItem>
                  <SelectItem value="proprio">Proferir voto próprio (divergir)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoVoto === "proprio" && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground">Decisão</label>
                  <Select value={vDecisao} onValueChange={setVDecisao}>
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
                  <RichTextEditor value={vFund} onChange={setVFund} placeholder="Fundamentação do seu voto..." minHeight="160px" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Dispositivo</label>
                  <RichTextEditor value={vDisp} onChange={setVDisp} placeholder="Parte dispositiva..." minHeight="100px" className="mt-1" />
                </div>
              </>
            )}

            {tipoVoto === "acompanha" && (
              <div>
                <label className="text-sm font-medium text-foreground">Ressalvas / Razões (opcional)</label>
                <RichTextEditor value={vRessalvas} onChange={setVRessalvas} placeholder="Acrescente razões próprias ou ressalvas ao acompanhar o voto do Relator..." minHeight="140px" className="mt-1" />
              </div>
            )}

            <Button onClick={() => registrarVotoMutation.mutate()} disabled={registrarVotoMutation.isPending} className="w-full gap-2">
              <Gavel className="h-4 w-4" /> Registrar Voto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pedido de Destaque */}
      <Dialog open={showDestaque} onOpenChange={setShowDestaque}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pedido de Destaque — {apelacao.numero_acordao}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Ao solicitar destaque, o recurso será retirado do julgamento virtual e remetido à sessão presencial. Os desembargadores serão notificados.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground">Justificativa</label>
              <RichTextEditor value={destaqueJust} onChange={setDestaqueJust} placeholder="Explique o motivo do pedido de destaque..." minHeight="160px" className="mt-1" />
            </div>
            <Button onClick={() => solicitarDestaqueMutation.mutate()} disabled={solicitarDestaqueMutation.isPending} className="w-full gap-2">
              <Star className="h-4 w-4" /> Confirmar pedido de destaque
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OriginarioTribunalDetail({ processoId, onBack }: { processoId: string; onBack: () => void }) {
  const { user, profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const isDesembargador = roles.some(r => ["desembargador", "presidente_tribunal", "admin", "magistrado"].includes(r));

  const { data: processo } = useQuery({
    queryKey: ["tribunal-originario", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("id", processoId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: relatorProfile } = useQuery({
    queryKey: ["relator-profile", processo?.relator_id],
    queryFn: async () => {
      if (!processo?.relator_id) return null;
      const { data } = await supabase.from("profiles").select("nome_completo").eq("user_id", processo.relator_id).maybeSingle();
      return data;
    },
    enabled: !!processo?.relator_id,
  });

  const [showDecisao, setShowDecisao] = useState(false);
  const [decisaoForm, setDecisaoForm] = useState({ tipo: "monocratica", titulo: "", conteudo: "" });

  const proferirDecisao = useMutation({
    mutationFn: async () => {
      if (!decisaoForm.titulo || !decisaoForm.conteudo) throw new Error("Preencha o título e o conteúdo.");
      
      const { error: atoError } = await supabase.from("atos_judiciais").insert({
        processo_id: processoId,
        tipo: decisaoForm.tipo === "monocratica" ? "decisao" : "acordao",
        titulo: decisaoForm.titulo,
        conteudo: decisaoForm.conteudo,
        autor_id: user!.id,
        autor_nome: profile?.nome_completo || "Desembargador(a)",
        assinado: true,
        data_assinatura: new Date().toISOString()
      });
      if (atoError) throw atoError;

      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "decisao_tribunal",
        descricao: `<h2>${decisaoForm.tipo === "monocratica" ? "DECISÃO MONOCRÁTICA" : "ACÓRDÃO"}</h2><p><strong>${decisaoForm.titulo}</strong></p>${decisaoForm.conteudo}`,
        autor_id: user!.id,
      });

      // Gerar Jurisprudência se for Acórdão ou decisão relevante
      const ementa = `EMENTA: ${processo.classe_originaria?.replace(/_/g, " ").toUpperCase() || "PROCESSO ORIGINÁRIO"}. ${processo.assunto?.toUpperCase()}. ${decisaoForm.titulo.toUpperCase()}.\n\n1. DECISÃO PROFERIDA PELO TRIBUNAL DE JUSTIÇA.\n2. PROCESSO Nº ${processo.numero}.\n3. RELATOR: ${(profile?.nome_completo || "Desembargador").toUpperCase()}.`;
      
      await supabase.from("jurisprudencias").insert({
        processo_id: processoId,
        numero_acordao: processo.numero, // Usa o número do processo como referência se não for apelação
        classe: processo.classe,
        assunto: processo.assunto,
        ementa,
        decisao_tipo: "originaria",
        decisao_fundamentacao: decisaoForm.conteudo,
        decisao_dispositivo: "Decisão proferida em processo originário.",
        desembargador_id: user!.id,
        desembargador_nome: profile?.nome_completo || "Relator",
        data_julgamento: new Date().toISOString(),
      } as any);
    },
    onSuccess: () => {
      toast.success("Decisão proferida e jurisprudência gerada!");
      setShowDecisao(false);
      queryClient.invalidateQueries({ queryKey: ["tribunal-originario"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes", processoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!processo) return <div className="text-center py-16"><p className="text-sm text-muted-foreground">Carregando...</p></div>;

  const isRelator = processo.relator_id === user?.id;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>

      <div className="bg-card rounded-xl p-6 border-2 border-institutional/40 shadow-institutional">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <Scale className="h-6 w-6 text-institutional" />
          <h2 className="font-display text-xl font-bold text-foreground">{processo.numero}</h2>
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-institutional text-gold-light">Processo Originário</span>
          {processo.classe_originaria && (
            <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {processo.classe_originaria.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Partes</p>
              <p className="text-foreground mt-1">
                <span className="font-semibold">{processo.autor_label || "Autor"}:</span> {formatPartesShort(processo.autor_nome || "")}
              </p>
              <p className="text-foreground">
                <span className="font-semibold">{processo.reu_label || "Réu"}:</span> {formatPartesShort(processo.reu_nome || "")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Assunto</p>
              <p className="text-foreground">{processo.assunto}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Relator(a)</p>
              <p className="text-foreground font-medium">{relatorProfile?.nome_completo || "Aguardando distribuição"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Órgão Julgador</p>
              <p className="text-foreground">{processo.orgao_julgador || processo.vara}</p>
            </div>
          </div>
        </div>

        {processo.descricao && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-1">Petição Inicial / Síntese</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{processo.descricao}</p>
          </div>
        )}
      </div>

      <Tabs defaultValue="movimentacoes" className="w-full">
        <TabsList className="bg-secondary/50 rounded-xl p-1">
          <TabsTrigger value="movimentacoes" className="rounded-lg text-xs">
            <HistoryIcon className="h-3 w-3 mr-1" /> Movimentações
          </TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-lg text-xs">
            <FileText className="h-3 w-3 mr-1" /> Documentos
          </TabsTrigger>
          {isDesembargador && (
            <TabsTrigger value="acoes" className="rounded-lg text-xs">
              <Gavel className="h-3 w-3 mr-1" /> Ações do Tribunal
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="movimentacoes" className="mt-4">
          <ProcessoTimeline processoId={processoId} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <ProcessoDocumentos processoId={processoId} />
        </TabsContent>

        {isDesembargador && (
          <TabsContent value="acoes" className="mt-4">
            <div className="bg-card rounded-xl p-5 border border-border space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Ações da Desembargadoria</h3>
              <div className="flex gap-2 flex-wrap">
                {isRelator && (
                  <Button onClick={() => setShowDecisao(true)} className="gap-2 bg-institutional hover:bg-institutional-light text-gold-light">
                    <Gavel className="h-4 w-4" /> Proferir Decisão / Acórdão
                  </Button>
                )}
                {!processo.relator_id && (
                  <p className="text-xs text-muted-foreground italic">Aguardando sorteio de Relator para permitir movimentações judiciais.</p>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showDecisao} onOpenChange={setShowDecisao}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Proferir Decisão no Tribunal</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo de Decisão</label>
                <Select value={decisaoForm.tipo} onValueChange={(v) => setDecisaoForm({ ...decisaoForm, tipo: v })}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monocratica">Decisão Monocrática</SelectItem>
                    <SelectItem value="acordao">Acórdão (Colegiado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Título / Ementa Curta</label>
                <Input 
                  placeholder="Ex: Concedo a Segurança" 
                  value={decisaoForm.titulo} 
                  onChange={(e) => setDecisaoForm({ ...decisaoForm, titulo: e.target.value })}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Conteúdo da Decisão</label>
              <RichTextEditor 
                value={decisaoForm.conteudo} 
                onChange={(v) => setDecisaoForm({ ...decisaoForm, conteudo: v })} 
                minHeight="300px" 
                className="mt-1"
              />
            </div>
            <Button 
              onClick={() => proferirDecisao.mutate()} 
              disabled={proferirDecisao.isPending}
              className="w-full bg-institutional hover:bg-institutional-light text-gold-light rounded-xl"
            >
              {proferirDecisao.isPending ? "Processando..." : "Publicar e Gerar Jurisprudência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProcessoTimeline({ processoId }: { processoId: string }) {
  const { data: movimentacoes, isLoading } = useQuery({
    queryKey: ["movimentacoes", processoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*, profiles:autor_id(nome_completo)")
        .eq("processo_id", processoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-center py-12"><p className="text-sm text-muted-foreground">Carregando movimentações...</p></div>;

  if (!movimentacoes?.length) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <HistoryIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {movimentacoes.map((m: any, idx: number) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="relative pl-6 pb-4 border-l border-border last:pb-0"
        >
          <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-institutional" />
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-institutional">
                {m.tipo.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
              <RichTextView html={m.descricao} />
            </div>
            {m.profiles?.nome_completo && (
              <p className="mt-2 text-[10px] text-muted-foreground italic">
                Por: {m.profiles.nome_completo}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ProcessoDocumentos({ processoId }: { processoId: string }) {
  const { data: documentos, isLoading } = useQuery({
    queryKey: ["documentos", processoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_processo")
        .select("*")
        .eq("processo_id", processoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-center py-12"><p className="text-sm text-muted-foreground">Carregando documentos...</p></div>;

  if (!documentos?.length) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {documentos.map((doc: any) => (
        <div key={doc.id} className="bg-card rounded-xl p-4 border border-border shadow-sm flex items-start gap-3">
          <div className="p-2 bg-institutional/10 rounded-lg">
            <FileText className="h-5 w-5 text-institutional" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{doc.nome}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{doc.tipo}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>
          {doc.arquivo_url && (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}


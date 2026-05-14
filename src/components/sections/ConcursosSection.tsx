import { useState, useEffect, useCallback } from "react";
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
  BookOpen, FileText, Users, Clock, Search, Plus, CheckCircle,
  ChevronRight, Award, BarChart3, Megaphone, ArrowLeft, Eye,
  ClipboardList, GraduationCap, Trophy, AlertTriangle, PenTool,
  UserCheck, Timer, Star, Trash2, History, Lock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CONCURSO_STATUS: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  publicado: { label: "Publicado", color: "bg-institutional/10 text-institutional" },
  inscricoes_abertas: { label: "Inscrições Abertas", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
  inscricoes_encerradas: { label: "Inscrições Encerradas", color: "bg-gold/10 text-gold-dark" },
  em_andamento: { label: "Em Andamento", color: "bg-accent/20 text-accent-foreground" },
  resultado_publicado: { label: "Resultado Publicado", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400" },
  encerrado: { label: "Encerrado", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
  cancelado: { label: "Cancelado", color: "bg-destructive/10 text-destructive" },
};

const CARGOS_JURIDICOS = [
  "Juiz de Direito", "Promotor de Justiça", "Delegado", "GAECO", "Chefe GAECO", "Polícia Civil", "Polícia Militar", "Polícia Federal",
  "Defensor Público", "Oficial de Justiça", "Analista Judiciário", "Técnico Judiciário",
  "Escrivão", "Perito Criminal", "Assessor Jurídico", "Bacharel em Direito"
];

const CARGOS_MP = ["Promotor de Justiça"];
const CARGOS_TJ = ["Juiz de Direito", "Polícia Civil", "Polícia Militar", "Polícia Federal", "Defensor Público", "Oficial de Justiça", "Analista Judiciário", "Técnico Judiciário", "Escrivão", "Perito Criminal", "Assessor Jurídico", "Bacharel em Direito"];

const TIPO_QUESTAO_LABELS: Record<string, string> = {
  objetiva: "Múltipla Escolha (A-D)",
  certo_errado: "Certo ou Errado",
  discursiva: "Discursiva",
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

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  AUTO STATUS HOOK                           */
/* ═══════════════════════════════════════════ */
function useAutoStatusUpdate() {
  const queryClient = useQueryClient();

  const checkAndUpdate = useCallback(async () => {
    const { data: concursos } = await supabase.from("concursos").select("*").not("status", "in", '("encerrado","cancelado")');
    if (!concursos) return;
    const now = new Date();

    for (const c of concursos) {
      let newStatus: string | null = null;

      if (c.status === "rascunho" && c.data_abertura && new Date(c.data_abertura) <= now) {
        newStatus = "publicado";
      }
      if (["rascunho", "publicado"].includes(c.status) && c.data_encerramento_inscricoes && c.data_abertura && new Date(c.data_abertura) <= now && new Date(c.data_encerramento_inscricoes) > now) {
        newStatus = "inscricoes_abertas";
      }
      if (["publicado", "inscricoes_abertas"].includes(c.status) && c.data_encerramento_inscricoes && new Date(c.data_encerramento_inscricoes) <= now) {
        newStatus = "inscricoes_encerradas";
      }
      if (["inscricoes_encerradas"].includes(c.status) && c.data_prova && new Date(c.data_prova) <= now) {
        newStatus = "em_andamento";
      }
      if (c.status === "em_andamento" && c.data_prova && (c as any).tempo_prova_minutos) {
        const provaEnd = new Date(new Date(c.data_prova).getTime() + ((c as any).tempo_prova_minutos * 60000));
        if (now >= provaEnd) {
          newStatus = "resultado_publicado";
        }
      }

      if (newStatus && newStatus !== c.status) {
        await supabase.from("concursos").update({ status: newStatus } as any).eq("id", c.id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["concursos"] });
  }, [queryClient]);

  useEffect(() => {
    checkAndUpdate();
    const interval = setInterval(checkAndUpdate, 30000); // check every 30s
    return () => clearInterval(interval);
  }, [checkAndUpdate]);
}

/* ═══════════════════════════════════════════ */
/*  MAIN                                       */
/* ═══════════════════════════════════════════ */
export default function ConcursosSection() {
  const { roles } = useAuth();
  const [view, setView] = useState<"list" | "detail" | "prova" | "historico">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useAutoStatusUpdate();

  const isAdmin = roles.some((r) => ["admin", "presidente_tribunal", "ministerio_publico", "procurador_geral", "chefe_gaeco"].includes(r));
  const isPresidenteTribunal = roles.includes("presidente_tribunal");
  const isMP = roles.some((r) => ["ministerio_publico", "procurador_geral"].includes(r));
  const isChefeGaeco = roles.includes("chefe_gaeco");
  const isFullAdmin = roles.includes("admin");

  if (view === "detail" && selectedId) {
    return <ConcursoDetail concursoId={selectedId} onBack={() => { setView("list"); setSelectedId(null); }} isAdmin={isAdmin} isPresidenteTribunal={isPresidenteTribunal} isMP={isMP} isFullAdmin={isFullAdmin} isChefeGaeco={isChefeGaeco} onStartProva={() => setView("prova")} />;
  }
  if (view === "prova" && selectedId) {
    return <RealizarProva concursoId={selectedId} onBack={() => { setView("detail"); }} />;
  }
  if (view === "historico" && selectedId) {
    return <ProvaAnterior concursoId={selectedId} onBack={() => { setView("list"); setSelectedId(null); }} />;
  }

  return <ConcursosDashboard isAdmin={isAdmin} isPresidenteTribunal={isPresidenteTribunal} isMP={isMP} isFullAdmin={isFullAdmin} isChefeGaeco={isChefeGaeco} onSelect={(id) => { setSelectedId(id); setView("detail"); }} onViewHistorico={(id) => { setSelectedId(id); setView("historico"); }} />;
}

/* ═══════════════════════════════════════════ */
/*  DASHBOARD                                  */
/* ═══════════════════════════════════════════ */
function ConcursosDashboard({ isAdmin, isPresidenteTribunal, isMP, isFullAdmin, isChefeGaeco, onSelect, onViewHistorico }: { isAdmin: boolean; isPresidenteTribunal: boolean; isMP: boolean; isFullAdmin: boolean; isChefeGaeco: boolean; onSelect: (id: string) => void; onViewHistorico: (id: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [openConcurso, setOpenConcurso] = useState(false);
  const [showTab, setShowTab] = useState<"ativos" | "anteriores">("ativos");

  const { data: concursos } = useQuery({
    queryKey: ["concursos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("concursos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: inscricoes } = useQuery({
    queryKey: ["concursos-inscricoes-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inscricoes_concurso").select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const availableCargos = isFullAdmin ? CARGOS_JURIDICOS : isMP ? CARGOS_MP : isPresidenteTribunal ? CARGOS_TJ : isChefeGaeco ? CARGOS_TJ : CARGOS_JURIDICOS;

  const [form, setForm] = useState({
    titulo: "", cargo: availableCargos[0] || "Juiz de Direito", vagas: "1", requisitos: "", conteudo_programatico: "",
    regras_classificacao: "", data_abertura: "", data_encerramento_inscricoes: "", data_prova: "", data_resultado: "",
    tempo_prova_minutos: "60",
  });

  const criarConcurso = useMutation({
    mutationFn: async () => {
      if (!form.titulo || !form.cargo) throw new Error("Título e cargo obrigatórios.");
      const { error } = await supabase.from("concursos").insert({
        titulo: form.titulo,
        cargo: form.cargo,
        vagas: parseInt(form.vagas) || 1,
        requisitos: form.requisitos || null,
        conteudo_programatico: form.conteudo_programatico || null,
        regras_classificacao: form.regras_classificacao || null,
        data_abertura: form.data_abertura ? new Date(form.data_abertura).toISOString() : null,
        data_encerramento_inscricoes: form.data_encerramento_inscricoes ? new Date(form.data_encerramento_inscricoes).toISOString() : null,
        data_prova: form.data_prova ? new Date(form.data_prova).toISOString() : null,
        data_resultado: form.data_resultado ? new Date(form.data_resultado).toISOString() : null,
        criado_por: user!.id,
        status: "rascunho",
        tempo_prova_minutos: parseInt(form.tempo_prova_minutos) || 60,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concursos"] });
      setOpenConcurso(false);
      setForm({ titulo: "", cargo: availableCargos[0] || "Juiz de Direito", vagas: "1", requisitos: "", conteudo_programatico: "", regras_classificacao: "", data_abertura: "", data_encerramento_inscricoes: "", data_prova: "", data_resultado: "", tempo_prova_minutos: "60" });
      toast.success("Concurso criado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const encerrados = concursos?.filter((c: any) => ["encerrado", "resultado_publicado"].includes(c.status)) || [];
  const ativos = concursos?.filter((c: any) => !["encerrado", "resultado_publicado", "cancelado"].includes(c.status)) || [];

  const displayList = showTab === "ativos" ? ativos : encerrados;
  const filtered = displayList.filter((c: any) =>
    c.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    c.cargo?.toLowerCase().includes(search.toLowerCase())
  );

  const abertos = concursos?.filter((c: any) => ["publicado", "inscricoes_abertas"].includes(c.status)) || [];
  const stats = {
    total: concursos?.length || 0,
    abertos: abertos.length,
    inscritos: inscricoes?.length || 0,
    encerrados: encerrados.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Portal de Concursos</h2>
          <p className="text-sm text-muted-foreground">Concursos públicos institucionais — Editais, inscrições e resultados</p>
        </div>
        {isAdmin && (
          <Dialog open={openConcurso} onOpenChange={setOpenConcurso}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo Concurso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Criar Concurso Público</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); criarConcurso.mutate(); }} className="space-y-4 mt-4">
                <Input placeholder="Título do Concurso" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="rounded-xl" required />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Cargo" /></SelectTrigger>
                    <SelectContent>{availableCargos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Vagas" value={form.vagas} onChange={(e) => setForm({ ...form, vagas: e.target.value })} className="rounded-xl" min="1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tempo para realização da prova (minutos)</label>
                  <Input type="number" placeholder="60" value={form.tempo_prova_minutos} onChange={(e) => setForm({ ...form, tempo_prova_minutos: e.target.value })} className="rounded-xl" min="1" />
                </div>
                <Textarea placeholder="Requisitos obrigatórios" value={form.requisitos} onChange={(e) => setForm({ ...form, requisitos: e.target.value })} rows={2} className="rounded-xl" />
                <Textarea placeholder="Conteúdo programático" value={form.conteudo_programatico} onChange={(e) => setForm({ ...form, conteudo_programatico: e.target.value })} rows={3} className="rounded-xl" />
                <Textarea placeholder="Regras de classificação e critérios de aprovação" value={form.regras_classificacao} onChange={(e) => setForm({ ...form, regras_classificacao: e.target.value })} rows={2} className="rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Abertura</label><Input type="datetime-local" value={form.data_abertura} onChange={(e) => setForm({ ...form, data_abertura: e.target.value })} className="rounded-xl" /></div>
                  <div><label className="text-xs text-muted-foreground">Encerramento Inscrições</label><Input type="datetime-local" value={form.data_encerramento_inscricoes} onChange={(e) => setForm({ ...form, data_encerramento_inscricoes: e.target.value })} className="rounded-xl" /></div>
                  <div><label className="text-xs text-muted-foreground">Data da Prova</label><Input type="datetime-local" value={form.data_prova} onChange={(e) => setForm({ ...form, data_prova: e.target.value })} className="rounded-xl" /></div>
                  <div><label className="text-xs text-muted-foreground">Data do Resultado</label><Input type="datetime-local" value={form.data_resultado} onChange={(e) => setForm({ ...form, data_resultado: e.target.value })} className="rounded-xl" /></div>
                </div>
                <Button type="submit" disabled={criarConcurso.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                  {criarConcurso.isPending ? "Criando..." : "Criar Concurso"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Concursos" value={stats.total} icon={GraduationCap} />
        <StatCard label="Abertos" value={stats.abertos} icon={BookOpen} delay={0.05} />
        <StatCard label="Inscritos Total" value={stats.inscritos} icon={Users} delay={0.1} />
        <StatCard label="Encerrados" value={stats.encerrados} icon={Trophy} delay={0.15} />
      </div>

      {/* Tabs: Ativos / Anteriores */}
      <div className="flex gap-2">
        <Button variant={showTab === "ativos" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setShowTab("ativos")}>
          <BookOpen className="h-3 w-3 mr-1" /> Ativos
        </Button>
        <Button variant={showTab === "anteriores" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setShowTab("anteriores")}>
          <History className="h-3 w-3 mr-1" /> Anteriores (Provas e Gabaritos)
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar concursos por título ou cargo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      {!filtered.length ? <EmptyState icon={GraduationCap} text={showTab === "ativos" ? "Nenhum concurso ativo." : "Nenhum concurso anterior."} /> : (
        <div className="space-y-3">
          {filtered.map((c: any, i: number) => {
            const cfg = CONCURSO_STATUS[c.status] || CONCURSO_STATUS.rascunho;
            const inscritos = inscricoes?.filter((ins: any) => ins.concurso_id === c.id).length || 0;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => showTab === "anteriores" ? onViewHistorico(c.id) : onSelect(c.id)}
                className="bg-card rounded-xl p-5 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{c.cargo}</span>
                      <span className="text-[10px] text-muted-foreground">{c.vagas} vaga(s)</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{c.titulo}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {c.data_prova && <span>Prova: {format(new Date(c.data_prova), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>}
                      <span>{inscritos} inscritos</span>
                      {showTab === "anteriores" && <span className="text-institutional font-semibold">📋 Ver prova e gabarito</span>}
                    </div>
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

/* ═══════════════════════════════════════════ */
/*  CONCURSO DETAIL                            */
/* ═══════════════════════════════════════════ */
function ConcursoDetail({ concursoId, onBack, isAdmin, isPresidenteTribunal, isMP, isFullAdmin, isChefeGaeco, onStartProva }: { concursoId: string; onBack: () => void; isAdmin: boolean; isPresidenteTribunal: boolean; isMP: boolean; isFullAdmin: boolean; isChefeGaeco: boolean; onStartProva: () => void }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("edital");
  const [openQuestao, setOpenQuestao] = useState(false);
  const [openComunicado, setOpenComunicado] = useState(false);
  const [selectedInscricaoId, setSelectedInscricaoId] = useState<string | null>(null);

  const { data: concurso } = useQuery({
    queryKey: ["concurso", concursoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("concursos").select("*").eq("id", concursoId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: inscricoes } = useQuery({
    queryKey: ["concurso-inscricoes", concursoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("inscricoes_concurso").select("*").eq("concurso_id", concursoId).order("classificacao", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: questoes } = useQuery({
    queryKey: ["concurso-questoes", concursoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("questoes_concurso").select("*").eq("concurso_id", concursoId).order("numero");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: comunicados } = useQuery({
    queryKey: ["concurso-comunicados", concursoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("comunicados_concurso").select("*").eq("concurso_id", concursoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Check if user already submitted answers
  const { data: existingRespostas } = useQuery({
    queryKey: ["prova-respostas-check", concursoId, user?.id],
    queryFn: async () => {
      const myInsc = inscricoes?.find((i: any) => i.user_id === user?.id);
      if (!myInsc) return [];
      const { data } = await supabase.from("respostas_concurso").select("id").eq("inscricao_id", myInsc.id).limit(1);
      return data || [];
    },
    enabled: !!inscricoes,
  });

  const myInscricao = inscricoes?.find((i: any) => i.user_id === user?.id);
  const alreadySubmitted = (existingRespostas?.length || 0) > 0;

  const canManage = (() => {
    if (isFullAdmin) return true;
    if (!concurso) return false;
    const cargoMP = CARGOS_MP.includes(concurso.cargo);
    const cargoTJ = CARGOS_TJ.includes(concurso.cargo);
    if (isMP && cargoMP) return true;
    if (isPresidenteTribunal && cargoTJ) return true;
    if (isChefeGaeco && cargoTJ) return true;
    return false;
  })();

  // Inscrever-se
  const inscrever = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil não encontrado.");
      const { error } = await supabase.from("inscricoes_concurso").insert({
        concurso_id: concursoId,
        user_id: user!.id,
        nome_completo: profile.nome_completo,
        id_personagem: profile.id_personagem || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso-inscricoes", concursoId] });
      toast.success("Inscrição confirmada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("concursos").update({ status } as any).eq("id", concursoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso", concursoId] });
      queryClient.invalidateQueries({ queryKey: ["concursos"] });
      toast.success("Status atualizado!");
    },
  });

  // Add questão
  const [qForm, setQForm] = useState({
    tipo: "objetiva" as string,
    enunciado: "",
    alternativa_a: "", alternativa_b: "", alternativa_c: "", alternativa_d: "",
    gabarito: "a",
    peso: "1",
  });

  const addQuestao = useMutation({
    mutationFn: async () => {
      if (!qForm.enunciado) throw new Error("Enunciado obrigatório.");
      const num = (questoes?.length || 0) + 1;
      let gabarito = qForm.gabarito;
      let altA = qForm.alternativa_a || null;
      let altB = qForm.alternativa_b || null;
      let altC = qForm.alternativa_c || null;
      let altD = qForm.alternativa_d || null;

      if (qForm.tipo === "certo_errado") {
        altA = "Certo"; altB = "Errado"; altC = null; altD = null;
      } else if (qForm.tipo === "discursiva") {
        altA = null; altB = null; altC = null; altD = null;
        gabarito = null as any;
      }

      const { error } = await supabase.from("questoes_concurso").insert({
        concurso_id: concursoId, numero: num, tipo: qForm.tipo,
        enunciado: qForm.enunciado, alternativa_a: altA, alternativa_b: altB,
        alternativa_c: altC, alternativa_d: altD, gabarito, peso: parseFloat(qForm.peso) || 1,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso-questoes", concursoId] });
      setOpenQuestao(false);
      setQForm({ tipo: "objetiva", enunciado: "", alternativa_a: "", alternativa_b: "", alternativa_c: "", alternativa_d: "", gabarito: "a", peso: "1" });
      toast.success("Questão adicionada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteQuestao = useMutation({
    mutationFn: async (questaoId: string) => {
      const { error } = await supabase.from("questoes_concurso").delete().eq("id", questaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso-questoes", concursoId] });
      toast.success("Questão removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Corrigir prova INDIVIDUAL
  const corrigirProvaIndividual = useMutation({
    mutationFn: async (inscricaoId: string) => {
      if (!questoes?.length) throw new Error("Sem questões.");
      const autoCorrectQuestions = questoes.filter((q: any) => q.tipo !== "discursiva");
      const totalPeso = autoCorrectQuestions.reduce((sum: number, q: any) => sum + (q.peso || 1), 0);

      const { data: respostas } = await supabase.from("respostas_concurso").select("*").eq("inscricao_id", inscricaoId);
      let nota = 0;
      for (const q of autoCorrectQuestions) {
        const resp = respostas?.find((r: any) => r.questao_id === q.id);
        if (resp && resp.resposta === q.gabarito) {
          nota += q.peso || 1;
          await supabase.from("respostas_concurso").update({ correta: true, nota: q.peso || 1 } as any).eq("id", resp.id);
        } else if (resp) {
          await supabase.from("respostas_concurso").update({ correta: false, nota: 0 } as any).eq("id", resp.id);
        }
      }
      const notaFinal = totalPeso > 0 ? (nota / totalPeso) * 100 : 0;
      await supabase.from("inscricoes_concurso").update({ nota_objetiva: nota, nota_final: notaFinal, presente: true } as any).eq("id", inscricaoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso-inscricoes", concursoId] });
      toast.success("Prova corrigida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Corrigir TODAS e gerar classificação
  const corrigirTodas = useMutation({
    mutationFn: async () => {
      if (!inscricoes?.length || !questoes?.length) throw new Error("Sem inscritos ou questões.");
      const autoCorrectQuestions = questoes.filter((q: any) => q.tipo !== "discursiva");
      const totalPeso = autoCorrectQuestions.reduce((sum: number, q: any) => sum + (q.peso || 1), 0);

      for (const insc of inscricoes) {
        const { data: respostas } = await supabase.from("respostas_concurso").select("*").eq("inscricao_id", insc.id);
        if (!respostas?.length) continue;
        let nota = 0;
        for (const q of autoCorrectQuestions) {
          const resp = respostas?.find((r: any) => r.questao_id === q.id);
          if (resp && resp.resposta === q.gabarito) {
            nota += q.peso || 1;
            await supabase.from("respostas_concurso").update({ correta: true, nota: q.peso || 1 } as any).eq("id", resp.id);
          } else if (resp) {
            await supabase.from("respostas_concurso").update({ correta: false, nota: 0 } as any).eq("id", resp.id);
          }
        }
        const notaFinal = totalPeso > 0 ? (nota / totalPeso) * 100 : 0;
        await supabase.from("inscricoes_concurso").update({ nota_objetiva: nota, nota_final: notaFinal, presente: true } as any).eq("id", insc.id);
      }
      // Classificação
      const { data: updated } = await supabase.from("inscricoes_concurso").select("*").eq("concurso_id", concursoId).order("nota_final", { ascending: false });
      if (updated) {
        for (let i = 0; i < updated.length; i++) {
          await supabase.from("inscricoes_concurso").update({ classificacao: i + 1 } as any).eq("id", updated[i].id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso-inscricoes", concursoId] });
      toast.success("Todas as provas corrigidas e classificação gerada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Nomear aprovado
  const nomearAprovado = useMutation({
    mutationFn: async (inscricaoId: string) => {
      const insc = inscricoes?.find((i: any) => i.id === inscricaoId);
      if (!insc) throw new Error("Inscrição não encontrada.");
      const cargoRoleMap: Record<string, string> = {
        "Juiz de Direito": "magistrado", "Promotor de Justiça": "ministerio_publico",
        "Procurador-Geral de Justiça": "procurador_geral",
        "Procurador Geral do Estado": "procurador_estado",
        "Polícia Civil": "policia_civil", "Polícia Militar": "policia_militar",
        "Polícia Federal": "policia_federal", "Oficial de Justiça": "oficial_justica",
      };
      const role = cargoRoleMap[concurso?.cargo] || null;
      if (role) {
        await supabase.from("user_roles").insert({ user_id: insc.user_id, role: role as any }).select();
        await supabase.from("cargo_historico").insert({
          user_id: insc.user_id, role: role as any, tipo: "nomeacao",
          data_inicio: new Date().toISOString(), nomeado_por: user!.id,
          observacoes: `Nomeado via concurso: ${concurso?.titulo}`,
        });
      }
      await supabase.from("inscricoes_concurso").update({ status: "nomeado" } as any).eq("id", inscricaoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso-inscricoes", concursoId] });
      toast.success("Candidato nomeado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Comunicado
  const [comForm, setComForm] = useState({ titulo: "", conteudo: "", tipo: "aviso" });
  const criarComunicado = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("comunicados_concurso").insert({
        concurso_id: concursoId, titulo: comForm.titulo, conteudo: comForm.conteudo,
        tipo: comForm.tipo, autor_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso-comunicados", concursoId] });
      setOpenComunicado(false);
      setComForm({ titulo: "", conteudo: "", tipo: "aviso" });
      toast.success("Comunicado publicado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update tempo_prova
  const [editTempo, setEditTempo] = useState("");
  const updateTempo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("concursos").update({ tempo_prova_minutos: parseInt(editTempo) || 60 } as any).eq("id", concursoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurso", concursoId] });
      toast.success("Tempo de prova atualizado!");
    },
  });

  if (!concurso) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const cfg = CONCURSO_STATUS[concurso.status] || CONCURSO_STATUS.rascunho;
  const canInscribe = ["publicado", "inscricoes_abertas"].includes(concurso.status) && !myInscricao;
  const canTakeExam = myInscricao && !alreadySubmitted && concurso.status === "em_andamento";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-foreground">{concurso.titulo}</h2>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">{concurso.cargo} — {concurso.vagas} vaga(s) — Tempo de prova: {(concurso as any).tempo_prova_minutos || 60} min</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {canInscribe && (
          <Button onClick={() => inscrever.mutate()} disabled={inscrever.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
            <UserCheck className="h-4 w-4 mr-1" /> {inscrever.isPending ? "Inscrevendo..." : "Inscrever-se"}
          </Button>
        )}
        {canTakeExam && (
          <Button onClick={onStartProva} variant="outline" className="rounded-xl">
            <PenTool className="h-4 w-4 mr-1" /> Realizar Prova
          </Button>
        )}
        {myInscricao && alreadySubmitted && (
          <span className="text-xs text-green-700 dark:text-green-400 self-center flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Prova já enviada
          </span>
        )}
        {myInscricao && <span className="text-xs text-muted-foreground self-center">Inscrição: {myInscricao.numero_inscricao}</span>}
        {canManage && (
          <Select value={concurso.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="rounded-xl w-52 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CONCURSO_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="edital" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Edital</TabsTrigger>
          <TabsTrigger value="inscritos" className="rounded-lg text-xs"><Users className="h-3 w-3 mr-1" /> Inscritos ({inscricoes?.length || 0})</TabsTrigger>
          {canManage && <TabsTrigger value="questoes" className="rounded-lg text-xs"><ClipboardList className="h-3 w-3 mr-1" /> Questões ({questoes?.length || 0})</TabsTrigger>}
          <TabsTrigger value="resultado" className="rounded-lg text-xs"><Trophy className="h-3 w-3 mr-1" /> Resultado</TabsTrigger>
          <TabsTrigger value="comunicados" className="rounded-lg text-xs"><Megaphone className="h-3 w-3 mr-1" /> Comunicados</TabsTrigger>
        </TabsList>

        {/* EDITAL */}
        <TabsContent value="edital" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoCard label="Cargo" value={concurso.cargo} />
            <InfoCard label="Vagas" value={String(concurso.vagas)} />
            <InfoCard label="Abertura" value={concurso.data_abertura ? format(new Date(concurso.data_abertura), "dd/MM/yyyy", { locale: ptBR }) : "—"} />
            <InfoCard label="Prova" value={concurso.data_prova ? format(new Date(concurso.data_prova), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Tempo de Prova" value={`${(concurso as any).tempo_prova_minutos || 60} minutos`} />
            <InfoCard label="Questões" value={String(questoes?.length || 0)} />
          </div>
          {canManage && (
            <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
              <h3 className="font-display text-sm font-semibold text-foreground mb-2">Alterar Tempo de Prova</h3>
              <div className="flex gap-2">
                <Input type="number" placeholder={String((concurso as any).tempo_prova_minutos || 60)} value={editTempo} onChange={(e) => setEditTempo(e.target.value)} className="rounded-xl w-32" min="1" />
                <Button size="sm" className="rounded-xl" onClick={() => updateTempo.mutate()} disabled={updateTempo.isPending}>
                  <Timer className="h-3 w-3 mr-1" /> Salvar
                </Button>
              </div>
            </div>
          )}
          {concurso.requisitos && (
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
              <h3 className="font-display text-sm font-semibold text-foreground mb-2">Requisitos</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{concurso.requisitos}</p>
            </div>
          )}
          {concurso.conteudo_programatico && (
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
              <h3 className="font-display text-sm font-semibold text-foreground mb-2">Conteúdo Programático</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{concurso.conteudo_programatico}</p>
            </div>
          )}
          {concurso.regras_classificacao && (
            <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
              <h3 className="font-display text-sm font-semibold text-foreground mb-2">Regras de Classificação</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{concurso.regras_classificacao}</p>
            </div>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground">
            {concurso.data_encerramento_inscricoes && <span>Encerramento inscrições: {format(new Date(concurso.data_encerramento_inscricoes), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>}
            {concurso.data_resultado && <span>Resultado previsto: {format(new Date(concurso.data_resultado), "dd/MM/yyyy", { locale: ptBR })}</span>}
          </div>
        </TabsContent>

        {/* INSCRITOS */}
        <TabsContent value="inscritos" className="mt-4">
          {!inscricoes?.length ? <EmptyState icon={Users} text="Nenhum inscrito." /> : (
            <div className="space-y-2">
              {inscricoes.map((insc: any, i: number) => (
                <motion.div key={insc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-institutional">{insc.numero_inscricao}</span>
                        <span className="text-sm font-medium text-foreground">{insc.nome_completo}</span>
                        {insc.id_personagem && <span className="text-xs text-muted-foreground">(ID: {insc.id_personagem})</span>}
                        {insc.status === "nomeado" && <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400">Nomeado</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {insc.classificacao && <span className="font-semibold">#{insc.classificacao}º</span>}
                        {insc.nota_final != null && <span>Nota: {Number(insc.nota_final).toFixed(1)}</span>}
                        <span>{format(new Date(insc.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {canManage && (
                        <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs"
                          onClick={() => setSelectedInscricaoId(selectedInscricaoId === insc.id ? null : insc.id)}>
                          <Eye className="h-3 w-3 mr-1" /> Prova
                        </Button>
                      )}
                      {canManage && (
                        <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs"
                          onClick={() => corrigirProvaIndividual.mutate(insc.id)}
                          disabled={corrigirProvaIndividual.isPending}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Corrigir
                        </Button>
                      )}
                      {canManage && insc.classificacao && insc.classificacao <= concurso.vagas && insc.status !== "nomeado" && (
                        <Button size="sm" className="rounded-lg h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => nomearAprovado.mutate(insc.id)}>
                          <Award className="h-3 w-3 mr-1" /> Nomear
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Individual answers view */}
                  {selectedInscricaoId === insc.id && (
                    <InscricaoRespostas inscricaoId={insc.id} questoes={questoes || []} />
                  )}
                </motion.div>
              ))}
            </div>
          )}
          {canManage && (inscricoes?.length || 0) > 0 && (
            <div className="mt-4">
              <Button size="sm" className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light" onClick={() => corrigirTodas.mutate()} disabled={corrigirTodas.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> {corrigirTodas.isPending ? "Corrigindo todas..." : "Corrigir Todas e Gerar Classificação"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* QUESTÕES (Admin/Manager) */}
        {canManage && (
          <TabsContent value="questoes" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{questoes?.length || 0} questões cadastradas</p>
              <Dialog open={openQuestao} onOpenChange={setOpenQuestao}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Questão
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Adicionar Questão</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addQuestao.mutate(); }} className="space-y-4 mt-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tipo de Questão</label>
                      <Select value={qForm.tipo} onValueChange={(v) => setQForm({ ...qForm, tipo: v, gabarito: v === "certo_errado" ? "a" : v === "discursiva" ? "" : "a", alternativa_a: "", alternativa_b: "", alternativa_c: "", alternativa_d: "" })}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="objetiva">Múltipla Escolha (A-D)</SelectItem>
                          <SelectItem value="certo_errado">Certo ou Errado</SelectItem>
                          <SelectItem value="discursiva">Discursiva</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea placeholder="Enunciado da questão" value={qForm.enunciado} onChange={(e) => setQForm({ ...qForm, enunciado: e.target.value })} rows={3} className="rounded-xl" required />
                    {qForm.tipo === "objetiva" && (
                      <>
                        <Input placeholder="A) Alternativa A" value={qForm.alternativa_a} onChange={(e) => setQForm({ ...qForm, alternativa_a: e.target.value })} className="rounded-xl" />
                        <Input placeholder="B) Alternativa B" value={qForm.alternativa_b} onChange={(e) => setQForm({ ...qForm, alternativa_b: e.target.value })} className="rounded-xl" />
                        <Input placeholder="C) Alternativa C" value={qForm.alternativa_c} onChange={(e) => setQForm({ ...qForm, alternativa_c: e.target.value })} className="rounded-xl" />
                        <Input placeholder="D) Alternativa D" value={qForm.alternativa_d} onChange={(e) => setQForm({ ...qForm, alternativa_d: e.target.value })} className="rounded-xl" />
                        <div className="grid grid-cols-2 gap-3">
                          <Select value={qForm.gabarito} onValueChange={(v) => setQForm({ ...qForm, gabarito: v })}>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Gabarito" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="a">A</SelectItem><SelectItem value="b">B</SelectItem>
                              <SelectItem value="c">C</SelectItem><SelectItem value="d">D</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" step="0.1" placeholder="Peso" value={qForm.peso} onChange={(e) => setQForm({ ...qForm, peso: e.target.value })} className="rounded-xl" />
                        </div>
                      </>
                    )}
                    {qForm.tipo === "certo_errado" && (
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={qForm.gabarito} onValueChange={(v) => setQForm({ ...qForm, gabarito: v })}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Gabarito" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="a">Certo</SelectItem>
                            <SelectItem value="b">Errado</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" step="0.1" placeholder="Peso" value={qForm.peso} onChange={(e) => setQForm({ ...qForm, peso: e.target.value })} className="rounded-xl" />
                      </div>
                    )}
                    {qForm.tipo === "discursiva" && (
                      <div>
                        <Input type="number" step="0.1" placeholder="Peso da questão" value={qForm.peso} onChange={(e) => setQForm({ ...qForm, peso: e.target.value })} className="rounded-xl" />
                        <p className="text-xs text-muted-foreground mt-2">Questões discursivas são corrigidas manualmente pelo organizador.</p>
                      </div>
                    )}
                    <Button type="submit" disabled={addQuestao.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                      {addQuestao.isPending ? "Adicionando..." : "Adicionar Questão"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {questoes?.map((q: any) => (
              <div key={q.id} className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-institutional">Questão {q.numero}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {TIPO_QUESTAO_LABELS[q.tipo] || q.tipo}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Peso: {q.peso}</span>
                  {q.tipo !== "discursiva" && q.gabarito && (
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400">
                      Gabarito: {q.tipo === "certo_errado" ? (q.gabarito === "a" ? "Certo" : "Errado") : q.gabarito?.toUpperCase()}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteQuestao.mutate(q.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-foreground mb-2">{q.enunciado}</p>
                {q.tipo === "objetiva" && (
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    {q.alternativa_a && <span className={q.gabarito === "a" ? "font-semibold text-green-700" : ""}>A) {q.alternativa_a}</span>}
                    {q.alternativa_b && <span className={q.gabarito === "b" ? "font-semibold text-green-700" : ""}>B) {q.alternativa_b}</span>}
                    {q.alternativa_c && <span className={q.gabarito === "c" ? "font-semibold text-green-700" : ""}>C) {q.alternativa_c}</span>}
                    {q.alternativa_d && <span className={q.gabarito === "d" ? "font-semibold text-green-700" : ""}>D) {q.alternativa_d}</span>}
                  </div>
                )}
                {q.tipo === "certo_errado" && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className={q.gabarito === "a" ? "font-semibold text-green-700" : ""}>○ Certo</span>
                    <span className={q.gabarito === "b" ? "font-semibold text-green-700" : ""}>○ Errado</span>
                  </div>
                )}
                {q.tipo === "discursiva" && (
                  <p className="text-xs text-muted-foreground italic">Resposta dissertativa — correção manual</p>
                )}
              </div>
            ))}
          </TabsContent>
        )}

        {/* RESULTADO */}
        <TabsContent value="resultado" className="mt-4">
          {(() => {
            const classificados = inscricoes?.filter((i: any) => i.classificacao != null).sort((a: any, b: any) => a.classificacao - b.classificacao) || [];
            if (!classificados.length) return <EmptyState icon={Trophy} text="Resultado ainda não publicado." />;
            return (
              <div className="space-y-2">
                {classificados.map((insc: any, i: number) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  const approved = insc.classificacao <= concurso.vagas;
                  return (
                    <motion.div key={insc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={`bg-card rounded-xl p-4 border shadow-institutional ${approved ? 'border-green-200 dark:border-green-900' : 'border-border'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${approved ? 'bg-green-100 dark:bg-green-950/30' : 'bg-secondary'}`}>
                          {medal || <span className="text-sm text-muted-foreground">{insc.classificacao}º</span>}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{insc.nome_completo}</p>
                          <p className="text-xs text-muted-foreground">{insc.numero_inscricao} {insc.id_personagem && `• ID: ${insc.id_personagem}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{insc.nota_final != null ? Number(insc.nota_final).toFixed(1) : "—"}</p>
                          <p className="text-[10px] uppercase tracking-wider font-semibold">
                            {insc.status === "nomeado" ? (
                              <span className="text-green-700">Nomeado</span>
                            ) : approved ? (
                              <span className="text-green-700">Aprovado</span>
                            ) : (
                              <span className="text-muted-foreground">Cadastro Reserva</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        {/* COMUNICADOS */}
        <TabsContent value="comunicados" className="mt-4 space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Dialog open={openComunicado} onOpenChange={setOpenComunicado}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Novo Comunicado
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="font-display">Publicar Comunicado</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); criarComunicado.mutate(); }} className="space-y-4 mt-4">
                    <Select value={comForm.tipo} onValueChange={(v) => setComForm({ ...comForm, tipo: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aviso">Aviso</SelectItem>
                        <SelectItem value="retificacao">Retificação</SelectItem>
                        <SelectItem value="resultado">Resultado</SelectItem>
                        <SelectItem value="convocacao">Convocação</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Título" value={comForm.titulo} onChange={(e) => setComForm({ ...comForm, titulo: e.target.value })} className="rounded-xl" required />
                    <Textarea placeholder="Conteúdo..." value={comForm.conteudo} onChange={(e) => setComForm({ ...comForm, conteudo: e.target.value })} rows={4} className="rounded-xl" required />
                    <Button type="submit" disabled={criarComunicado.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                      {criarComunicado.isPending ? "Publicando..." : "Publicar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {!comunicados?.length ? <EmptyState icon={Megaphone} text="Nenhum comunicado." /> : (
            <div className="space-y-3">
              {comunicados.map((c: any, i: number) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl p-5 border border-border shadow-institutional">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="h-4 w-4 text-gold-dark" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">{c.tipo}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{c.titulo}</h4>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{c.conteudo}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  INSCRICAO RESPOSTAS (inline view)          */
/* ═══════════════════════════════════════════ */
function InscricaoRespostas({ inscricaoId, questoes }: { inscricaoId: string; questoes: any[] }) {
  const { data: respostas } = useQuery({
    queryKey: ["inscricao-respostas", inscricaoId],
    queryFn: async () => {
      const { data } = await supabase.from("respostas_concurso").select("*").eq("inscricao_id", inscricaoId);
      return data || [];
    },
  });

  if (!respostas?.length) return <p className="text-xs text-muted-foreground mt-3 italic">Nenhuma resposta enviada.</p>;

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {questoes.map((q: any) => {
        const resp = respostas.find((r: any) => r.questao_id === q.id);
        return (
          <div key={q.id} className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-institutional w-16">Q{q.numero}</span>
            <span className="text-foreground flex-1">
              {resp ? (
                q.tipo === "discursiva" ? (
                  <span className="italic">{resp.resposta?.substring(0, 80)}...</span>
                ) : (
                  <span>
                    Resp: <strong>{q.tipo === "certo_errado" ? (resp.resposta === "a" ? "Certo" : "Errado") : resp.resposta?.toUpperCase()}</strong>
                    {" "}(Gab: {q.tipo === "certo_errado" ? (q.gabarito === "a" ? "Certo" : "Errado") : q.gabarito?.toUpperCase()})
                  </span>
                )
              ) : <span className="text-muted-foreground">Sem resposta</span>}
            </span>
            {resp && q.tipo !== "discursiva" && (
              <span className={resp.correta ? "text-green-700 font-semibold" : resp.correta === false ? "text-destructive font-semibold" : "text-muted-foreground"}>
                {resp.correta ? "✓" : resp.correta === false ? "✗" : "—"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  REALIZAR PROVA (with timer)                */
/* ═══════════════════════════════════════════ */
function RealizarProva({ concursoId, onBack }: { concursoId: string; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: concurso } = useQuery({
    queryKey: ["concurso", concursoId],
    queryFn: async () => {
      const { data } = await supabase.from("concursos").select("*").eq("id", concursoId).single();
      return data as any;
    },
  });

  const { data: questoes } = useQuery({
    queryKey: ["prova-questoes", concursoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("questoes_concurso").select("id, numero, tipo, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, peso").eq("concurso_id", concursoId).order("numero");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: inscricao } = useQuery({
    queryKey: ["prova-inscricao", concursoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("inscricoes_concurso").select("*").eq("concurso_id", concursoId).eq("user_id", user!.id).single();
      if (error) throw error;
      return data as any;
    },
  });

  // Check if already submitted
  const { data: existingRespostas } = useQuery({
    queryKey: ["prova-already-submitted", concursoId, user?.id],
    queryFn: async () => {
      if (!inscricao) return [];
      const { data } = await supabase.from("respostas_concurso").select("id").eq("inscricao_id", inscricao.id).limit(1);
      return data || [];
    },
    enabled: !!inscricao,
  });

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [provaStarted] = useState(() => Date.now());

  // Timer
  useEffect(() => {
    if (!concurso) return;
    const tempoMinutos = (concurso as any).tempo_prova_minutos || 60;
    const endTime = provaStarted + tempoMinutos * 60000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(Math.floor(remaining / 1000));
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [concurso, provaStarted]);

  const enviarProva = useMutation({
    mutationFn: async () => {
      if (!inscricao || !questoes) throw new Error("Dados não encontrados.");
      // Double-check no duplicate
      const { data: existing } = await supabase.from("respostas_concurso").select("id").eq("inscricao_id", inscricao.id).limit(1);
      if (existing && existing.length > 0) throw new Error("Você já enviou sua prova!");

      const inserts = questoes.map((q: any) => ({
        inscricao_id: inscricao.id,
        questao_id: q.id,
        resposta: respostas[q.id] || null,
      }));
      const { error } = await supabase.from("respostas_concurso").insert(inserts as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prova-inscricao", concursoId] });
      queryClient.invalidateQueries({ queryKey: ["prova-already-submitted", concursoId] });
      toast.success("Prova enviada com sucesso!");
      onBack();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !enviarProva.isPending) {
      toast.warning("Tempo esgotado! Prova enviada automaticamente.");
      enviarProva.mutate();
    }
  }, [timeLeft]);

  if (!questoes || !inscricao) return <div className="text-center py-12 text-muted-foreground">Carregando prova...</div>;

  if ((existingRespostas?.length || 0) > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
          <h2 className="font-display text-xl font-bold text-foreground">Prova já enviada</h2>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border shadow-institutional text-center">
          <Lock className="h-12 w-12 mx-auto mb-3 text-institutional opacity-50" />
          <p className="text-sm text-muted-foreground">Você já realizou esta prova. Não é possível refazer.</p>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(respostas).filter(k => respostas[k]).length;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isLowTime = timeLeft !== null && timeLeft < 300;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <h2 className="font-display text-xl font-bold text-foreground">Prova — {inscricao.numero_inscricao}</h2>
      </div>

      <div className={`bg-card rounded-xl p-4 border shadow-institutional flex items-center justify-between ${isLowTime ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
        <div className="flex items-center gap-3">
          <Timer className={`h-5 w-5 ${isLowTime ? 'text-destructive' : 'text-gold-dark'}`} />
          <p className="text-sm text-foreground">{questoes.length} questões • {answeredCount}/{questoes.length} respondidas</p>
        </div>
        {timeLeft !== null && (
          <span className={`font-mono text-lg font-bold ${isLowTime ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
            ⏱ {formatTime(timeLeft)}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {questoes.map((q: any) => (
          <div key={q.id} className="bg-card rounded-xl p-5 border border-border shadow-institutional">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-institutional">Questão {q.numero} (peso {q.peso})</p>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {TIPO_QUESTAO_LABELS[q.tipo] || q.tipo}
              </span>
            </div>
            <p className="text-sm text-foreground mb-3">{q.enunciado}</p>

            {q.tipo === "objetiva" && (
              <div className="space-y-2">
                {["a", "b", "c", "d"].map((opt) => {
                  const text = q[`alternativa_${opt}`];
                  if (!text) return null;
                  return (
                    <label key={opt}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${respostas[q.id] === opt ? 'border-institutional bg-institutional/5' : 'border-border hover:border-institutional/30'}`}>
                      <input type="radio" name={q.id} value={opt} checked={respostas[q.id] === opt}
                        onChange={() => setRespostas((r) => ({ ...r, [q.id]: opt }))}
                        className="accent-institutional" />
                      <span className="text-sm text-foreground"><strong>{opt.toUpperCase()})</strong> {text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.tipo === "certo_errado" && (
              <div className="flex gap-3">
                {[{ value: "a", label: "Certo" }, { value: "b", label: "Errado" }].map((opt) => (
                  <label key={opt.value}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer border transition-all text-center ${respostas[q.id] === opt.value ? 'border-institutional bg-institutional/5 font-semibold' : 'border-border hover:border-institutional/30'}`}>
                    <input type="radio" name={q.id} value={opt.value} checked={respostas[q.id] === opt.value}
                      onChange={() => setRespostas((r) => ({ ...r, [q.id]: opt.value }))}
                      className="accent-institutional" />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {q.tipo === "discursiva" && (
              <Textarea
                placeholder="Escreva sua resposta..."
                value={respostas[q.id] || ""}
                onChange={(e) => setRespostas((r) => ({ ...r, [q.id]: e.target.value }))}
                rows={6}
                className="rounded-xl"
              />
            )}
          </div>
        ))}
      </div>

      <Button onClick={() => enviarProva.mutate()} disabled={enviarProva.isPending}
        className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light py-3">
        {enviarProva.isPending ? "Enviando..." : `Enviar Prova (${answeredCount}/${questoes.length} respondidas)`}
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  PROVA ANTERIOR (read-only with gabarito)   */
/* ═══════════════════════════════════════════ */
function ProvaAnterior({ concursoId, onBack }: { concursoId: string; onBack: () => void }) {
  const { data: concurso } = useQuery({
    queryKey: ["concurso", concursoId],
    queryFn: async () => {
      const { data } = await supabase.from("concursos").select("*").eq("id", concursoId).single();
      return data as any;
    },
  });

  const { data: questoes } = useQuery({
    queryKey: ["concurso-questoes", concursoId],
    queryFn: async () => {
      const { data } = await supabase.from("questoes_concurso").select("*").eq("concurso_id", concursoId).order("numero");
      return data as any[];
    },
  });

  if (!concurso) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">{concurso.titulo}</h2>
          <p className="text-sm text-muted-foreground">{concurso.cargo} — Edital, Prova e Gabarito</p>
        </div>
      </div>

      {/* Informações do Edital */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard label="Cargo" value={concurso.cargo} />
        <InfoCard label="Vagas" value={String(concurso.vagas)} />
        <InfoCard label="Abertura" value={concurso.data_abertura ? format(new Date(concurso.data_abertura), "dd/MM/yyyy", { locale: ptBR }) : "—"} />
        <InfoCard label="Data Prova" value={concurso.data_prova ? format(new Date(concurso.data_prova), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard label="Tempo de Prova" value={`${concurso.tempo_prova_minutos || 60} minutos`} />
        <InfoCard label="Questões" value={String(questoes?.length || 0)} />
        {concurso.data_encerramento_inscricoes && <InfoCard label="Enc. Inscrições" value={format(new Date(concurso.data_encerramento_inscricoes), "dd/MM/yyyy HH:mm", { locale: ptBR })} />}
        {concurso.data_resultado && <InfoCard label="Resultado" value={format(new Date(concurso.data_resultado), "dd/MM/yyyy", { locale: ptBR })} />}
      </div>

      {concurso.requisitos && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-2">Requisitos</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{concurso.requisitos}</p>
        </div>
      )}
      {concurso.conteudo_programatico && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-2">Conteúdo Programático</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{concurso.conteudo_programatico}</p>
        </div>
      )}
      {concurso.regras_classificacao && (
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <h3 className="font-display text-sm font-semibold text-foreground mb-2">Regras de Classificação</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{concurso.regras_classificacao}</p>
        </div>
      )}
      {concurso.edital_url && (
        <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
          <a href={concurso.edital_url} target="_blank" rel="noopener noreferrer" className="text-sm text-institutional hover:underline flex items-center gap-2">
            <FileText className="h-4 w-4" /> Baixar Edital Completo
          </a>
        </div>
      )}

      {!questoes?.length ? <EmptyState icon={ClipboardList} text="Nenhuma questão cadastrada neste concurso." /> : (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-institutional" /> Prova com Gabarito
          </h3>
          {questoes.map((q: any) => (
            <div key={q.id} className="bg-card rounded-xl p-5 border border-border shadow-institutional">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-institutional">Questão {q.numero}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {TIPO_QUESTAO_LABELS[q.tipo] || q.tipo}
                </span>
                <span className="text-[10px] text-muted-foreground">Peso: {q.peso}</span>
              </div>
              <p className="text-sm text-foreground mb-3">{q.enunciado}</p>

              {q.tipo === "objetiva" && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {["a", "b", "c", "d"].map((opt) => {
                    const text = q[`alternativa_${opt}`];
                    if (!text) return null;
                    const isCorrect = q.gabarito === opt;
                    return (
                      <span key={opt} className={`p-2 rounded-lg border ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/20 font-semibold text-green-800 dark:text-green-400' : 'border-border text-muted-foreground'}`}>
                        <strong>{opt.toUpperCase()})</strong> {text}
                        {isCorrect && " ✓"}
                      </span>
                    );
                  })}
                </div>
              )}

              {q.tipo === "certo_errado" && (
                <div className="flex gap-3">
                  {[{ value: "a", label: "Certo" }, { value: "b", label: "Errado" }].map((opt) => (
                    <span key={opt.value}
                      className={`flex-1 text-center p-2 rounded-lg border ${q.gabarito === opt.value ? 'border-green-500 bg-green-50 dark:bg-green-950/20 font-semibold text-green-800 dark:text-green-400' : 'border-border text-muted-foreground'}`}>
                      {opt.label} {q.gabarito === opt.value && "✓"}
                    </span>
                  ))}
                </div>
              )}

              {q.tipo === "discursiva" && (
                <p className="text-xs text-muted-foreground italic">Questão discursiva — sem gabarito automático</p>
              )}
            </div>
          ))}
        </div>
      )}
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

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
  Briefcase, Award, Users, Search, Plus, CheckCircle, XCircle,
  Clock, Scale, FileText, AlertTriangle,
  Eye, BarChart3, Megaphone,
  UserCheck, UserX, Trash2, Edit
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Status configs ─── */
const INSCRICAO_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "bg-gold/10 text-gold-dark", icon: Clock },
  aprovada: { label: "Aprovada", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400", icon: CheckCircle },
  complementacao: { label: "Complementação", color: "bg-accent/20 text-accent-foreground", icon: AlertTriangle },
  indeferida: { label: "Indeferida", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const DISC_STATUS: Record<string, { label: string; color: string }> = {
  aberto: { label: "Aberto", color: "bg-gold/10 text-gold-dark" },
  em_analise: { label: "Em Análise", color: "bg-institutional/10 text-institutional" },
  advertencia: { label: "Advertência", color: "bg-accent/20 text-accent-foreground" },
  suspensao: { label: "Suspensão", color: "bg-destructive/10 text-destructive" },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
};

const ESPECIALIDADES = [
  "Criminal", "Civil", "Trabalhista", "Tributário", "Empresarial",
  "Família", "Previdenciário", "Ambiental", "Constitucional", "Geral"
];

const CARTEIRA_STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "suspenso", label: "Suspenso" },
  { value: "cancelado", label: "Cancelado" },
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

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  MAIN                                       */
/* ═══════════════════════════════════════════ */
export default function OABSection() {
  const { roles } = useAuth();
  const isAdmin = roles.some((r) => ["admin", "presidente_oab"].includes(r));
  const isBacharel = roles.includes("bacharel_direito");

  return <OABDashboard isAdmin={isAdmin} isBacharel={isBacharel} />;
}

/* ═══════════════════════════════════════════ */
/*  DASHBOARD                                  */
/* ═══════════════════════════════════════════ */
function OABDashboard({ isAdmin, isBacharel }: { isAdmin: boolean; isBacharel: boolean }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [openInscricao, setOpenInscricao] = useState(false);
  const [openComunicado, setOpenComunicado] = useState(false);
  const [selectedCarteira, setSelectedCarteira] = useState<any>(null);
  const [selectedInscricao, setSelectedInscricao] = useState<any>(null);
  const [motivoDialog, setMotivoDialog] = useState<{ open: boolean; inscricaoId: string; action: "complementacao" | "indeferida" }>({ open: false, inscricaoId: "", action: "complementacao" });
  const [motivoTexto, setMotivoTexto] = useState("");
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; carteira: any }>({ open: false, carteira: null });
  const [newStatus, setNewStatus] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; carteira: any }>({ open: false, carteira: null });
  const [complementacaoTexto, setComplementacaoTexto] = useState("");
  const [openPAD, setOpenPAD] = useState(false);
  const [padForm, setPadForm] = useState({ advogado_user_id: "", tipo: "denuncia", descricao: "" });
  const [selectedDisciplinar, setSelectedDisciplinar] = useState<any>(null);
  const [padAction, setPadAction] = useState<{ open: boolean; disc: any; action: string }>({ open: false, disc: null, action: "" });
  const [padActionTexto, setPadActionTexto] = useState("");

  // Data
  const { data: inscricoes } = useQuery({
    queryKey: ["oab-inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inscricoes_oab").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: carteiras } = useQuery({
    queryKey: ["oab-carteiras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("carteiras_oab").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: disciplinares } = useQuery({
    queryKey: ["oab-disciplinares"],
    queryFn: async () => {
      const { data, error } = await supabase.from("procedimentos_disciplinares").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: comunicados } = useQuery({
    queryKey: ["oab-comunicados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("comunicados_oab").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: rankingData } = useQuery({
    queryKey: ["oab-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_advogado_ranking");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // ── INSCRIÇÃO ──
  const [inscForm, setInscForm] = useState({ especialidade: "Geral", justificativa: "" });

  // Check if user already has an active inscription
  const minhaInscricao = inscricoes?.find((i: any) => i.user_id === user?.id && ["pendente", "complementacao"].includes(i.status));
  const jaAprovada = inscricoes?.some((i: any) => i.user_id === user?.id && i.status === "aprovada");
  const podeInscrever = !minhaInscricao && !jaAprovada;

  const solicitarInscricao = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil não encontrado.");
      // Double-check no duplicate
      const { data: existing } = await supabase.from("inscricoes_oab").select("id, status").eq("user_id", user!.id).in("status", ["pendente", "complementacao", "aprovada"]);
      if (existing && existing.length > 0) throw new Error("Você já possui uma inscrição em andamento ou aprovada.");
      const { error } = await supabase.from("inscricoes_oab").insert({
        user_id: user!.id,
        nome_completo: profile.nome_completo,
        id_personagem: profile.id_personagem || null,
        email: user!.email || null,
        especialidade: inscForm.especialidade,
        justificativa: inscForm.justificativa || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oab-inscricoes"] });
      setOpenInscricao(false);
      setInscForm({ especialidade: "Geral", justificativa: "" });
      toast.success("Inscrição solicitada com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── RESPONDER COMPLEMENTAÇÃO ──
  const responderComplementacao = useMutation({
    mutationFn: async ({ inscricaoId, resposta }: { inscricaoId: string; resposta: string }) => {
      if (!resposta.trim()) throw new Error("Preencha a resposta da complementação.");
      const insc = inscricoes?.find((i: any) => i.id === inscricaoId);
      const { error } = await supabase.from("inscricoes_oab").update({
        justificativa: resposta,
        status: "pendente",
      } as any).eq("id", inscricaoId);
      if (error) throw error;

      // Notify all presidente_oab users
      const { data: presidenteRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "presidente_oab" as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oab-inscricoes"] });
      setComplementacaoTexto("");
      toast.success("Complementação enviada! Aguarde nova análise.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── APROVAR/INDEFERIR/COMPLEMENTAR INSCRIÇÃO ──
  const processarInscricao = useMutation({
    mutationFn: async ({ inscricaoId, action, motivo }: { inscricaoId: string; action: "aprovada" | "indeferida" | "complementacao"; motivo?: string }) => {
      const insc = inscricoes?.find((i: any) => i.id === inscricaoId);
      if (!insc) throw new Error("Inscrição não encontrada.");

      await supabase.from("inscricoes_oab").update({
        status: action,
        aprovado_por: user!.id,
        motivo_indeferimento: motivo || null,
      } as any).eq("id", inscricaoId);

      if (action === "aprovada") {

        await supabase.from("carteiras_oab").insert({
          user_id: insc.user_id,
          inscricao_id: inscricaoId,
          nome_completo: insc.nome_completo,
          id_personagem: insc.id_personagem || null,
          especialidade: insc.especialidade || null,
        } as any);

        await supabase.from("profiles").update({ cargo: "Advogado(a)" }).eq("user_id", insc.user_id);
        await supabase.from("user_roles").insert({ user_id: insc.user_id, role: "advogado" as any }).select();
        // Remove bacharel_direito role
        await supabase.from("user_roles").delete().eq("user_id", insc.user_id).eq("role", "bacharel_direito" as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oab-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["oab-carteiras"] });
      setSelectedInscricao(null);
      toast.success("Inscrição processada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── ALTERAR STATUS ADVOGADO ──
  const alterarStatusAdvogado = useMutation({
    mutationFn: async ({ carteiraId, status }: { carteiraId: string; status: string }) => {
      const { error } = await supabase.from("carteiras_oab").update({ status } as any).eq("id", carteiraId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oab-carteiras"] });
      setStatusDialog({ open: false, carteira: null });
      toast.success("Status do advogado alterado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── EXCLUIR ADVOGADO (revogar cargo) ──
  const excluirAdvogado = useMutation({
    mutationFn: async (carteira: any) => {
      // Delete carteira
      const { error: delErr } = await supabase.from("carteiras_oab").delete().eq("id", carteira.id);
      if (delErr) throw delErr;

      // Remove advogado role
      const { error: roleErr } = await supabase.from("user_roles").delete().eq("user_id", carteira.user_id).eq("role", "advogado" as any);
      if (roleErr) throw roleErr;

      // Update profile
      await supabase.from("profiles").update({ cargo: null } as any).eq("user_id", carteira.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oab-carteiras"] });
      setDeleteDialog({ open: false, carteira: null });
      setSelectedCarteira(null);
      toast.success("Cadastro de advogado excluído e cargo revogado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── INSTAURAR PAD ──
  const instaurarPAD = useMutation({
    mutationFn: async () => {
      if (!padForm.advogado_user_id || !padForm.descricao.trim()) throw new Error("Selecione o advogado e descreva os fatos.");
      const { error } = await supabase.from("procedimentos_disciplinares").insert({
        advogado_user_id: padForm.advogado_user_id,
        denunciante_id: user!.id,
        tipo: padForm.tipo,
        descricao: padForm.descricao,
        status: "aberto",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oab-disciplinares"] });
      setOpenPAD(false);
      setPadForm({ advogado_user_id: "", tipo: "denuncia", descricao: "" });
      toast.success("Processo Administrativo Disciplinar instaurado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── ATUALIZAR PAD (parecer, sanção, status) ──
  const atualizarPAD = useMutation({
    mutationFn: async ({ id, status, parecer, sancao }: { id: string; status: string; parecer?: string; sancao?: string }) => {
      const updates: any = { status };
      if (parecer) updates.parecer = parecer;
      if (sancao) updates.sancao = sancao;
      const { error } = await supabase.from("procedimentos_disciplinares").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oab-disciplinares"] });
      setPadAction({ open: false, disc: null, action: "" });
      setPadActionTexto("");
      setSelectedDisciplinar(null);
      toast.success("Procedimento disciplinar atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── COMUNICADO ──
  const [comForm, setComForm] = useState({ titulo: "", conteudo: "", tipo: "aviso" });
  const criarComunicado = useMutation({
    mutationFn: async () => {
      if (!comForm.titulo || !comForm.conteudo) throw new Error("Preencha título e conteúdo.");
      const { error } = await supabase.from("comunicados_oab").insert({
        titulo: comForm.titulo,
        conteudo: comForm.conteudo,
        tipo: comForm.tipo,
        autor_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oab-comunicados"] });
      setOpenComunicado(false);
      setComForm({ titulo: "", conteudo: "", tipo: "aviso" });
      toast.success("Comunicado publicado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Ranking from RPC (SECURITY DEFINER, bypasses RLS)
  const ranking = rankingData || [];

  const pendentes = inscricoes?.filter((i: any) => i.status === "pendente") || [];
  const filteredCarteiras = carteiras?.filter((c: any) =>
    c.nome_completo?.toLowerCase().includes(search.toLowerCase()) ||
    c.numero_oab?.toLowerCase().includes(search.toLowerCase()) ||
    c.id_personagem?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = {
    advogados: carteiras?.filter((c: any) => c.status === "ativo").length || 0,
    inscricoesPendentes: pendentes.length,
    disciplinares: disciplinares?.filter((d: any) => d.status !== "arquivado").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Portal da OAB</h2>
          <p className="text-sm text-muted-foreground">Ordem dos Advogados — Inscrição, carteira digital e serviços institucionais</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {podeInscrever && !isAdmin && (
            <Dialog open={openInscricao} onOpenChange={setOpenInscricao}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Solicitar Inscrição
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle className="font-display">Solicitar Inscrição na OAB</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); solicitarInscricao.mutate(); }} className="space-y-4 mt-4">
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground">{profile?.nome_completo}</p>
                    {profile?.id_personagem && <p className="text-xs text-muted-foreground">ID: {profile.id_personagem}</p>}
                  </div>
                  <Select value={inscForm.especialidade} onValueChange={(v) => setInscForm({ ...inscForm, especialidade: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Especialidade" /></SelectTrigger>
                    <SelectContent>
                      {ESPECIALIDADES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Justificativa / experiência profissional (opcional)" value={inscForm.justificativa} onChange={(e) => setInscForm({ ...inscForm, justificativa: e.target.value })} rows={3} className="rounded-xl" />
                  <Button type="submit" disabled={solicitarInscricao.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                    {solicitarInscricao.isPending ? "Enviando..." : "Solicitar Inscrição"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* User's own inscription status card */}
      {minhaInscricao && !isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <div className="flex items-center gap-3 mb-3">
            <div className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${INSCRICAO_STATUS[minhaInscricao.status]?.color || "bg-muted text-muted-foreground"}`}>
              {INSCRICAO_STATUS[minhaInscricao.status]?.label || minhaInscricao.status}
            </div>
            <span className="text-sm font-semibold text-foreground">Minha Inscrição na OAB</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Especialidade</p>
              <p className="text-foreground">{minhaInscricao.especialidade || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Data da Solicitação</p>
              <p className="text-foreground">{format(new Date(minhaInscricao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
          </div>

          {/* Show complementação request and response form */}
          {minhaInscricao.status === "complementacao" && (
            <div className="mt-4 space-y-3">
              {minhaInscricao.motivo_indeferimento && (
                <div className="bg-accent/10 rounded-lg p-3 border border-accent/30">
                  <p className="text-[10px] text-accent-foreground uppercase tracking-wider font-semibold mb-1">⚠️ Complementação Solicitada pela OAB</p>
                  <p className="text-sm text-foreground">{minhaInscricao.motivo_indeferimento}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Sua resposta / complementação</label>
                <Textarea
                  placeholder="Informe os dados solicitados pela OAB..."
                  value={complementacaoTexto}
                  onChange={(e) => setComplementacaoTexto(e.target.value)}
                  rows={4}
                  className="rounded-xl mt-1"
                />
              </div>
              <Button
                onClick={() => responderComplementacao.mutate({ inscricaoId: minhaInscricao.id, resposta: complementacaoTexto })}
                disabled={responderComplementacao.isPending || !complementacaoTexto.trim()}
                className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light"
              >
                {responderComplementacao.isPending ? "Enviando..." : "Enviar Complementação"}
              </Button>
            </div>
          )}

          {minhaInscricao.status === "pendente" && (
            <p className="text-xs text-muted-foreground mt-3">Sua inscrição está em análise. Você será notificado quando houver atualização.</p>
          )}
        </motion.div>
      )}

      {/* Stats */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-1'} gap-3`}>
        <StatCard label="Advogados Ativos" value={stats.advogados} icon={Users} delay={0} />
        {isAdmin && <StatCard label="Inscrições Pendentes" value={stats.inscricoesPendentes} icon={Clock} delay={0.05} />}
        {isAdmin && <StatCard label="Proc. Disciplinares" value={stats.disciplinares} icon={AlertTriangle} delay={0.15} />}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar advogado por nome, OAB ou ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="advogados" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="advogados" className="rounded-lg text-xs"><Users className="h-3 w-3 mr-1" /> Advogados ({stats.advogados})</TabsTrigger>
          {isAdmin && <TabsTrigger value="inscricoes" className="rounded-lg text-xs"><Clock className="h-3 w-3 mr-1" /> Inscrições ({inscricoes?.length || 0})</TabsTrigger>}
          <TabsTrigger value="ranking" className="rounded-lg text-xs"><Award className="h-3 w-3 mr-1" /> Ranking</TabsTrigger>
          {isAdmin && <TabsTrigger value="disciplinar" className="rounded-lg text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Disciplinar ({stats.disciplinares})</TabsTrigger>}
          <TabsTrigger value="comunicados" className="rounded-lg text-xs"><Megaphone className="h-3 w-3 mr-1" /> Comunicados</TabsTrigger>
          <TabsTrigger value="estatisticas" className="rounded-lg text-xs"><BarChart3 className="h-3 w-3 mr-1" /> Estatísticas</TabsTrigger>
        </TabsList>

        {/* ADVOGADOS / CARTEIRAS */}
        <TabsContent value="advogados" className="mt-4">
          {!filteredCarteiras.length ? <EmptyState icon={Users} text="Nenhum advogado inscrito." /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCarteiras.map((c: any, i: number) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedCarteira(selectedCarteira?.id === c.id ? null : c)}
                  className={`bg-card rounded-xl p-4 border shadow-institutional cursor-pointer transition-all ${selectedCarteira?.id === c.id ? 'border-institutional ring-2 ring-institutional/20' : 'border-border hover:border-institutional/30'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-institutional/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-institutional" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.nome_completo}</p>
                      <p className="font-mono text-xs text-institutional font-semibold">{c.numero_oab}</p>
                      {c.id_personagem && <p className="text-[10px] text-muted-foreground">ID: {c.id_personagem}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${c.status === 'ativo' ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' : c.status === 'suspenso' ? 'bg-accent/20 text-accent-foreground' : 'bg-destructive/10 text-destructive'}`}>{c.status}</span>
                        {c.especialidade && <span className="text-[10px] text-muted-foreground">{c.especialidade}</span>}
                      </div>
                    </div>
                  </div>
                  {/* Expanded carteira */}
                  {selectedCarteira?.id === c.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-border">
                      <div className="bg-gradient-to-br from-institutional to-institutional-dark rounded-xl p-4 text-gold-light relative overflow-hidden">
                        <div className="absolute top-2 right-2 opacity-10"><Scale className="h-16 w-16" /></div>
                        <p className="text-[10px] uppercase tracking-widest opacity-70">Ordem dos Advogados do Brasil — Seção SP</p>
                        <p className="text-lg font-display font-bold mt-2">{c.nome_completo}</p>
                        <p className="font-mono text-sm font-semibold mt-1">{c.numero_oab}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs opacity-80">
                          <span>Inscrito em {format(new Date(c.data_inscricao), "dd/MM/yyyy", { locale: ptBR })}</span>
                          {c.especialidade && <span>• {c.especialidade}</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span className="text-[10px] uppercase tracking-wider font-semibold">Carteira Digital Válida</span>
                        </div>
                      </div>
                      {/* Admin actions */}
                      {isAdmin && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs flex-1"
                            onClick={(e) => { e.stopPropagation(); setNewStatus(c.status); setStatusDialog({ open: true, carteira: c }); }}>
                            <Edit className="h-3 w-3 mr-1" /> Alterar Status
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs text-destructive border-destructive/30"
                            onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, carteira: c }); }}>
                            <Trash2 className="h-3 w-3 mr-1" /> Excluir
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* INSCRIÇÕES (Admin) */}
        {isAdmin && (
          <TabsContent value="inscricoes" className="mt-4">
            {!inscricoes?.length ? <EmptyState icon={Clock} text="Nenhuma inscrição solicitada." /> : (
              <div className="space-y-2">
                {inscricoes.map((insc: any, i: number) => {
                  const cfg = INSCRICAO_STATUS[insc.status] || INSCRICAO_STATUS.pendente;
                  return (
                    <motion.div key={insc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{insc.nome_completo}</span>
                            {insc.id_personagem && <span className="text-xs text-muted-foreground">(ID: {insc.id_personagem})</span>}
                            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {insc.especialidade} • {format(new Date(insc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            {insc.email && ` • ${insc.email}`}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs"
                            onClick={() => setSelectedInscricao(selectedInscricao?.id === insc.id ? null : insc)}>
                            <Eye className="h-3 w-3 mr-1" /> {selectedInscricao?.id === insc.id ? "Fechar" : "Ficha"}
                          </Button>
                          {(insc.status === "pendente" || insc.status === "complementacao") && (
                            <Button size="sm" className="rounded-lg bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                              onClick={() => processarInscricao.mutate({ inscricaoId: insc.id, action: "aprovada" })}>
                              <UserCheck className="h-3 w-3 mr-1" /> Aprovar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded inscription card */}
                      {selectedInscricao?.id === insc.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-border space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Nome Completo</p>
                              <p className="text-sm font-medium text-foreground">{insc.nome_completo}</p>
                            </div>
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">ID do Personagem</p>
                              <p className="text-sm font-medium text-foreground">{insc.id_personagem || "—"}</p>
                            </div>
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Especialidade</p>
                              <p className="text-sm font-medium text-foreground">{insc.especialidade || "—"}</p>
                            </div>
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">E-mail</p>
                              <p className="text-sm font-medium text-foreground">{insc.email || "—"}</p>
                            </div>
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Telefone</p>
                              <p className="text-sm font-medium text-foreground">{insc.telefone || "—"}</p>
                            </div>
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Data Solicitação</p>
                              <p className="text-sm font-medium text-foreground">{format(new Date(insc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                            </div>
                          </div>
                          {insc.motivo_indeferimento && (
                            <div className="bg-accent/10 rounded-lg p-3 border border-accent/30">
                              <p className="text-[10px] text-accent-foreground uppercase tracking-wider font-semibold mb-1">⚠️ Complementação Solicitada</p>
                              <p className="text-sm text-foreground">{insc.motivo_indeferimento}</p>
                            </div>
                          )}
                          {insc.justificativa && (
                            <div className={`rounded-lg p-3 border ${insc.motivo_indeferimento ? "bg-institutional/5 border-institutional/30" : "bg-secondary/30 border-transparent"}`}>
                              <p className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${insc.motivo_indeferimento ? "text-institutional" : "text-muted-foreground"}`}>
                                {insc.motivo_indeferimento ? "📩 Resposta do Solicitante" : "Justificativa / Experiência"}
                              </p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{insc.justificativa}</p>
                            </div>
                          )}

                          {/* Action buttons */}
                          {(insc.status === "pendente" || insc.status === "complementacao") && (
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" className="rounded-lg bg-green-600 hover:bg-green-700 text-white h-9 text-xs flex-1"
                                onClick={() => processarInscricao.mutate({ inscricaoId: insc.id, action: "aprovada" })}
                                disabled={processarInscricao.isPending}>
                                <UserCheck className="h-3 w-3 mr-1" /> Aprovar Inscrição
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-lg h-9 text-xs flex-1"
                                onClick={() => { setMotivoTexto(""); setMotivoDialog({ open: true, inscricaoId: insc.id, action: "complementacao" }); }}>
                                <AlertTriangle className="h-3 w-3 mr-1" /> Solicitar Complementação
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-lg h-9 text-xs text-destructive border-destructive/30 flex-1"
                                onClick={() => { setMotivoTexto(""); setMotivoDialog({ open: true, inscricaoId: insc.id, action: "indeferida" }); }}>
                                <UserX className="h-3 w-3 mr-1" /> Indeferir
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* RANKING */}
        <TabsContent value="ranking" className="mt-4">
          {/* Tabela de pontuação */}
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Award className="h-4 w-4 text-institutional" /> Sistema de Pontuação</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-secondary/50 rounded-lg p-2 text-center"><p className="font-bold text-foreground">10 pts</p><p className="text-muted-foreground">Processo vinculado</p></div>
              <div className="bg-secondary/50 rounded-lg p-2 text-center"><p className="font-bold text-foreground">25 pts</p><p className="text-muted-foreground">Sentença / Arquivamento</p></div>
              <div className="bg-secondary/50 rounded-lg p-2 text-center"><p className="font-bold text-foreground">50 pts</p><p className="text-muted-foreground">Apelação Deferida - TJ</p></div>
              <div className="bg-secondary/50 rounded-lg p-2 text-center"><p className="font-bold text-foreground">20 pts</p><p className="text-muted-foreground">Atuação rápida (&lt;24h)</p></div>
            </div>
          </div>
          {!ranking.length ? <EmptyState icon={Award} text="Nenhum advogado no ranking." /> : (
            <div className="space-y-2">
              {ranking.map((adv: any, i: number) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <motion.div key={adv.user_id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className={`bg-card rounded-xl p-4 border shadow-institutional ${i < 3 ? 'border-gold/30' : 'border-border'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${i < 3 ? 'bg-gold/10' : 'bg-secondary'}`}>
                        {medal || <span className="text-sm text-muted-foreground">{i + 1}º</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{adv.nome_completo}</p>
                        <p className="font-mono text-xs text-institutional">{adv.numero_oab}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-foreground">{adv.score} <span className="text-[10px] font-normal text-muted-foreground">pts</span></p>
                        <div className="flex flex-wrap justify-end gap-x-2 text-[10px] text-muted-foreground">
                          <span>{adv.processos_count} {adv.processos_count === 1 ? 'processo' : 'processos'}</span>
                          <span>• {adv.sentencas} {adv.sentencas === 1 ? 'sentença' : 'sentenças'}</span>
                          <span>• {adv.pareceres_favoraveis || 0} apel. deferida(s)</span>
                          <span>• {adv.atuacoes_rapidas || 0} rápida(s)</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* DISCIPLINAR */}
        {isAdmin && (
          <TabsContent value="disciplinar" className="mt-4">
            <div className="space-y-4">
              {/* Button to create new PAD */}
              <div className="flex justify-end">
                <Dialog open={openPAD} onOpenChange={setOpenPAD}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                      <Plus className="h-4 w-4 mr-1" /> Instaurar PAD
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="font-display">Instaurar Processo Administrativo Disciplinar</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); instaurarPAD.mutate(); }} className="space-y-4 mt-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Advogado Investigado</label>
                        <Select value={padForm.advogado_user_id} onValueChange={(v) => setPadForm({ ...padForm, advogado_user_id: v })}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o advogado" /></SelectTrigger>
                          <SelectContent>
                            {carteiras?.filter((c: any) => c.status === "ativo").map((c: any) => (
                              <SelectItem key={c.user_id} value={c.user_id}>{c.nome_completo} — {c.numero_oab}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Tipo</label>
                        <Select value={padForm.tipo} onValueChange={(v) => setPadForm({ ...padForm, tipo: v })}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="denuncia">Denúncia</SelectItem>
                            <SelectItem value="representacao">Representação</SelectItem>
                            <SelectItem value="ex_officio">Ex Officio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Descrição dos Fatos</label>
                        <Textarea placeholder="Descreva detalhadamente os fatos que motivam a instauração do PAD..." value={padForm.descricao} onChange={(e) => setPadForm({ ...padForm, descricao: e.target.value })} rows={5} className="rounded-xl" required />
                      </div>
                      <Button type="submit" disabled={instaurarPAD.isPending} className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                        {instaurarPAD.isPending ? "Instaurando..." : "Instaurar PAD"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* PAD List */}
              {!disciplinares?.length ? <EmptyState icon={AlertTriangle} text="Nenhum procedimento disciplinar." /> : (
                <div className="space-y-2">
                  {disciplinares.map((d: any, i: number) => {
                    const cfg = DISC_STATUS[d.status] || DISC_STATUS.aberto;
                    const advogado = carteiras?.find((c: any) => c.user_id === d.advogado_user_id);
                    const isExpanded = selectedDisciplinar?.id === d.id;
                    return (
                      <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        onClick={() => setSelectedDisciplinar(isExpanded ? null : d)}
                        className={`bg-card rounded-xl p-4 border shadow-institutional cursor-pointer transition-all ${isExpanded ? 'border-destructive/40 ring-2 ring-destructive/10' : 'border-border hover:border-destructive/20'}`}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{d.tipo}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        {advogado && (
                          <p className="text-sm font-semibold text-foreground">{advogado.nome_completo} <span className="text-xs font-mono text-institutional">{advogado.numero_oab}</span></p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{d.descricao}</p>
                        {d.sancao && <p className="text-xs text-destructive mt-1">Sanção: {d.sancao}</p>}

                        {/* Expanded detail */}
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Descrição Completa</p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{d.descricao}</p>
                            </div>
                            {d.parecer && (
                              <div className="bg-institutional/5 rounded-lg p-3 border border-institutional/20">
                                <p className="text-[10px] text-institutional uppercase tracking-wider font-semibold mb-1">Parecer</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap">{d.parecer}</p>
                              </div>
                            )}
                            {d.sancao && (
                              <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                                <p className="text-[10px] text-destructive uppercase tracking-wider font-semibold mb-1">Sanção Aplicada</p>
                                <p className="text-sm text-foreground">{d.sancao}</p>
                              </div>
                            )}

                            {/* Action buttons */}
                            {d.status !== "arquivado" && (
                              <div className="flex gap-2 flex-wrap pt-2">
                                <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs"
                                  onClick={() => { setPadActionTexto(""); setPadAction({ open: true, disc: d, action: "parecer" }); }}>
                                  <FileText className="h-3 w-3 mr-1" /> Emitir Parecer
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs"
                                  onClick={() => { setPadActionTexto(""); setPadAction({ open: true, disc: d, action: "em_analise" }); }}>
                                  <Scale className="h-3 w-3 mr-1" /> Em Análise
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs text-accent-foreground border-accent/30"
                                  onClick={() => { setPadActionTexto(""); setPadAction({ open: true, disc: d, action: "advertencia" }); }}>
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Advertência
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs text-destructive border-destructive/30"
                                  onClick={() => { setPadActionTexto(""); setPadAction({ open: true, disc: d, action: "suspensao" }); }}>
                                  <XCircle className="h-3 w-3 mr-1" /> Suspensão
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs"
                                  onClick={() => atualizarPAD.mutate({ id: d.id, status: "arquivado" })}>
                                  Arquivar
                                </Button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* COMUNICADOS */}
        <TabsContent value="comunicados" className="mt-4">
          <div className="space-y-4">
            {isAdmin && (
              <div className="flex justify-end">
                <Dialog open={openComunicado} onOpenChange={setOpenComunicado}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                      <Plus className="h-4 w-4 mr-1" /> Novo Comunicado
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="font-display">Publicar Comunicado</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); criarComunicado.mutate(); }} className="space-y-4 mt-4">
                      <Select value={comForm.tipo} onValueChange={(v) => setComForm({ ...comForm, tipo: v })}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aviso">Aviso</SelectItem>
                          <SelectItem value="evento">Evento</SelectItem>
                          <SelectItem value="normativo">Normativo</SelectItem>
                          <SelectItem value="concurso">Concurso</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Título" value={comForm.titulo} onChange={(e) => setComForm({ ...comForm, titulo: e.target.value })} className="rounded-xl" required />
                      <Textarea placeholder="Conteúdo do comunicado..." value={comForm.conteudo} onChange={(e) => setComForm({ ...comForm, conteudo: e.target.value })} rows={4} className="rounded-xl" required />
                      <Button type="submit" disabled={criarComunicado.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                        {criarComunicado.isPending ? "Publicando..." : "Publicar Comunicado"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            {!comunicados?.length ? <EmptyState icon={Megaphone} text="Nenhum comunicado publicado." /> : (
              <div className="space-y-3">
                {comunicados.map((c: any, i: number) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl p-5 border border-border shadow-institutional">
                    <div className="flex items-center gap-2 mb-2">
                      <Megaphone className="h-4 w-4 text-gold-dark" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">{c.tipo}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{c.titulo}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{c.conteudo}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ESTATÍSTICAS */}
        <TabsContent value="estatisticas" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Advogados Ativos", value: stats.advogados },
              { label: "Inscrições Pendentes", value: stats.inscricoesPendentes },
              { label: "Inscrições Aprovadas", value: inscricoes?.filter((i: any) => i.status === "aprovada").length || 0 },
              { label: "Inscrições Indeferidas", value: inscricoes?.filter((i: any) => i.status === "indeferida").length || 0 },
              { label: "Proc. Disciplinares", value: stats.disciplinares },
              { label: "Comunicados", value: comunicados?.length || 0 },
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

      {/* ── DIALOG: Motivo para complementação/indeferimento ── */}
      <Dialog open={motivoDialog.open} onOpenChange={(open) => setMotivoDialog({ ...motivoDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {motivoDialog.action === "complementacao" ? "Solicitar Complementação" : "Indeferir Inscrição"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {motivoDialog.action === "complementacao"
                ? "Informe o motivo e quais documentos ou informações o inscrito deve corrigir/complementar. O inscrito receberá esta mensagem."
                : "Informe o motivo do indeferimento. O inscrito será notificado."}
            </p>
            <Textarea
              placeholder={motivoDialog.action === "complementacao" ? "Ex: Necessário informar número de ID válido e justificativa profissional..." : "Ex: Documentação não atende aos requisitos mínimos..."}
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              rows={4}
              className="rounded-xl"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => setMotivoDialog({ ...motivoDialog, open: false })}>
                Cancelar
              </Button>
              <Button
                className={`rounded-xl flex-1 ${motivoDialog.action === "indeferida" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-institutional hover:bg-institutional-light text-gold-light"}`}
                disabled={!motivoTexto.trim() || processarInscricao.isPending}
                onClick={() => {
                  processarInscricao.mutate({
                    inscricaoId: motivoDialog.inscricaoId,
                    action: motivoDialog.action,
                    motivo: motivoTexto.trim(),
                  });
                  setMotivoDialog({ ...motivoDialog, open: false });
                }}
              >
                {motivoDialog.action === "complementacao" ? "Solicitar Complementação" : "Confirmar Indeferimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Alterar status do advogado ── */}
      <Dialog open={statusDialog.open} onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Alterar Status do Advogado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">{statusDialog.carteira?.nome_completo}</p>
              <p className="font-mono text-xs text-institutional">{statusDialog.carteira?.numero_oab}</p>
            </div>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Novo status" /></SelectTrigger>
              <SelectContent>
                {CARTEIRA_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => setStatusDialog({ open: false, carteira: null })}>
                Cancelar
              </Button>
              <Button className="rounded-xl flex-1 bg-institutional hover:bg-institutional-light text-gold-light"
                disabled={!newStatus || alterarStatusAdvogado.isPending}
                onClick={() => statusDialog.carteira && alterarStatusAdvogado.mutate({ carteiraId: statusDialog.carteira.id, status: newStatus })}>
                {alterarStatusAdvogado.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Confirmar exclusão do advogado ── */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Excluir Cadastro de Advogado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-foreground">
                Tem certeza que deseja excluir o cadastro de <span className="font-semibold">{deleteDialog.carteira?.nome_completo}</span>?
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Esta ação irá:<br />
                • Remover a carteira digital da OAB<br />
                • Revogar o cargo de Advogado(a)<br />
                • Remover a permissão de advogado do sistema
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => setDeleteDialog({ open: false, carteira: null })}>
                Cancelar
              </Button>
              <Button className="rounded-xl flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={excluirAdvogado.isPending}
                onClick={() => deleteDialog.carteira && excluirAdvogado.mutate(deleteDialog.carteira)}>
                {excluirAdvogado.isPending ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Ação no PAD (parecer, advertência, suspensão) ── */}
      <Dialog open={padAction.open} onOpenChange={(open) => setPadAction({ ...padAction, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {padAction.action === "parecer" ? "Emitir Parecer" :
               padAction.action === "advertencia" ? "Aplicar Advertência" :
               padAction.action === "suspensao" ? "Aplicar Suspensão" :
               "Atualizar Procedimento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Textarea
              placeholder={
                padAction.action === "parecer" ? "Escreva o parecer sobre o procedimento disciplinar..." :
                padAction.action === "advertencia" ? "Descreva a advertência e seus fundamentos..." :
                padAction.action === "suspensao" ? "Descreva a suspensão, prazo e fundamentos..." :
                "Observações..."
              }
              value={padActionTexto}
              onChange={(e) => setPadActionTexto(e.target.value)}
              rows={5}
              className="rounded-xl"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => setPadAction({ open: false, disc: null, action: "" })}>
                Cancelar
              </Button>
              <Button
                className={`rounded-xl flex-1 ${["advertencia", "suspensao"].includes(padAction.action) ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-institutional hover:bg-institutional-light text-gold-light"}`}
                disabled={!padActionTexto.trim() || atualizarPAD.isPending}
                onClick={() => {
                  if (!padAction.disc) return;
                  const isSancao = ["advertencia", "suspensao"].includes(padAction.action);
                  atualizarPAD.mutate({
                    id: padAction.disc.id,
                    status: padAction.action === "parecer" ? "em_analise" : padAction.action,
                    parecer: padAction.action === "parecer" ? padActionTexto.trim() : undefined,
                    sancao: isSancao ? padActionTexto.trim() : undefined,
                  });
                }}
              >
                {atualizarPAD.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

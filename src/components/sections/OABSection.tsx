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

  const { data: processos } = useQuery({
    queryKey: ["oab-processos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("advogado_autor_id, advogado_reu_id, status").limit(500);
      if (error) throw error;
      return data;
    },
  });

  // ── INSCRIÇÃO ──
  const [inscForm, setInscForm] = useState({ especialidade: "Geral", justificativa: "" });
  const solicitarInscricao = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil não encontrado.");
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

      // Send notification to the applicant
      if (action === "complementacao") {
        await supabase.from("notificacoes").insert({
          user_id: insc.user_id,
          titulo: "Complementação solicitada — Inscrição OAB",
          mensagem: motivo
            ? `A OAB solicitou complementação na sua inscrição: ${motivo}`
            : "A OAB solicitou complementação na sua inscrição. Acesse o Portal OAB para mais detalhes.",
          tipo: "alerta",
          link_secao: "oab",
        });
      } else if (action === "indeferida") {
        await supabase.from("notificacoes").insert({
          user_id: insc.user_id,
          titulo: "Inscrição OAB indeferida",
          mensagem: motivo
            ? `Sua inscrição na OAB foi indeferida. Motivo: ${motivo}`
            : "Sua inscrição na OAB foi indeferida. Acesse o Portal OAB para mais detalhes.",
          tipo: "erro",
          link_secao: "oab",
        });
      } else if (action === "aprovada") {
        await supabase.from("notificacoes").insert({
          user_id: insc.user_id,
          titulo: "Inscrição OAB aprovada!",
          mensagem: "Parabéns! Sua inscrição na OAB foi aprovada. Sua carteira digital já está disponível.",
          tipo: "sucesso",
          link_secao: "oab",
        });

        await supabase.from("carteiras_oab").insert({
          user_id: insc.user_id,
          inscricao_id: inscricaoId,
          nome_completo: insc.nome_completo,
          id_personagem: insc.id_personagem || null,
          especialidade: insc.especialidade || null,
        } as any);

        await supabase.from("profiles").update({ cargo: "Advogado(a)" }).eq("user_id", insc.user_id);
        await supabase.from("user_roles").insert({ user_id: insc.user_id, role: "advogado" as any }).select();
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

  // Ranking computation
  const ranking = carteiras?.map((c: any) => {
    const count = processos?.filter((p) => p.advogado_autor_id === c.user_id || p.advogado_reu_id === c.user_id).length || 0;
    const vitorias = processos?.filter((p) => (p.advogado_autor_id === c.user_id || p.advogado_reu_id === c.user_id) && p.status === "sentenciado").length || 0;
    return { ...c, processos_count: count, vitorias, score: count * 10 + vitorias * 25 };
  })?.sort((a: any, b: any) => b.score - a.score) || [];

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
        </div>
      </div>

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
                          {insc.justificativa && (
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Justificativa / Experiência</p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{insc.justificativa}</p>
                            </div>
                          )}
                          {insc.motivo_indeferimento && (
                            <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                              <p className="text-[10px] text-destructive uppercase tracking-wider mb-1">Motivo da Decisão Anterior</p>
                              <p className="text-sm text-foreground">{insc.motivo_indeferimento}</p>
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
          {!ranking.length ? <EmptyState icon={Award} text="Nenhum advogado no ranking." /> : (
            <div className="space-y-2">
              {ranking.map((adv: any, i: number) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <motion.div key={adv.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
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
                        <p className="text-lg font-bold text-foreground">{adv.score}</p>
                        <p className="text-[10px] text-muted-foreground">{adv.processos_count} proc. • {adv.vitorias} concl.</p>
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
            {!disciplinares?.length ? <EmptyState icon={AlertTriangle} text="Nenhum procedimento disciplinar." /> : (
              <div className="space-y-2">
                {disciplinares.map((d: any, i: number) => {
                  const cfg = DISC_STATUS[d.status] || DISC_STATUS.aberto;
                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{d.tipo}</span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{d.descricao}</p>
                      {d.sancao && <p className="text-xs text-destructive mt-1">Sanção: {d.sancao}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
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
    </div>
  );
}

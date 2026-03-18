import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Plus, FileText, Search, Eye, User, ArrowLeft, Clock, Gavel,
  Upload, Calendar, AlertTriangle, CheckCircle, PenTool, History,
  File, Scale, Timer, ChevronRight, X, ExternalLink, ScrollText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Currency helpers ─── */
const formatCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const number = parseInt(digits || "0", 10) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const parseCurrencyToNumber = (value: string): number | null => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return parseInt(digits, 10) / 100;
};

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

/* ─── Status Config ─── */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  novo: { label: "Novo", color: "bg-institutional/10 text-institutional", icon: FileText },
  em_andamento: { label: "Em Andamento", color: "bg-gold/10 text-gold-dark", icon: Clock },
  concluso: { label: "Concluso", color: "bg-accent/20 text-accent-foreground", icon: Gavel },
  sentenciado: { label: "Sentenciado", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400", icon: CheckCircle },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground", icon: File },
  suspenso: { label: "Suspenso", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

const ATO_TIPOS = [
  { value: "despacho", label: "Despacho" },
  { value: "decisao", label: "Decisão Interlocutória" },
  { value: "sentenca", label: "Sentença" },
  { value: "mandado", label: "Mandado" },
  { value: "intimacao", label: "Intimação" },
  { value: "alvara", label: "Alvará" },
  { value: "certidao", label: "Certidão" },
  { value: "acordao", label: "Acórdão" },
];

const ATO_TEMPLATES: Record<string, string> = {
  despacho: `DESPACHO\n\nVistos.\n\nCite-se o(a) réu(é) para que, no prazo legal, apresente contestação, sob pena de revelia.\n\nIntimem-se.\n\n[Comarca], [data].\n\n[Magistrado]\nJuiz(a) de Direito`,
  sentenca: `SENTENÇA\n\nVistos, relatados e discutidos estes autos.\n\n[RELATÓRIO]\n\n[FUNDAMENTAÇÃO]\n\n[DISPOSITIVO]\n\nAnte o exposto, JULGO [PROCEDENTE/IMPROCEDENTE] o pedido formulado na inicial.\n\nCustas na forma da lei. Sem condenação em honorários.\n\nP.R.I.\n\n[Comarca], [data].\n\n[Magistrado]\nJuiz(a) de Direito`,
  mandado: `MANDADO DE [CITAÇÃO/INTIMAÇÃO/BUSCA E APREENSÃO]\n\nO(A) Dr(a). [Magistrado], Juiz(a) de Direito da [Vara], da Comarca de [Comarca],\n\nMANDA ao(à) Sr(a). Oficial de Justiça que, em cumprimento ao presente, proceda à [diligência] em face de [parte].\n\nCumpra-se.\n\n[Comarca], [data].`,
  intimacao: `INTIMAÇÃO\n\nFica V.Sa. INTIMADO(A) para [finalidade], no prazo de [X] horas, sob pena de [consequência].\n\nProcesso nº [número]\n\n[Comarca], [data].`,
  alvara: `ALVARÁ DE [LEVANTAMENTO/SOLTURA]\n\nO(A) Dr(a). [Magistrado], Juiz(a) de Direito,\n\nAUTORIZA [beneficiário] a [finalidade], conforme decisão proferida nos autos do processo nº [número].\n\nValidade: [prazo].\n\n[Comarca], [data].`,
  certidao: `CERTIDÃO\n\nCertifico e dou fé que [conteúdo da certidão].\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Servidor]\nEscrivão(ã) Judicial`,
  decisao: `DECISÃO INTERLOCUTÓRIA\n\nVistos.\n\n[Fundamentação]\n\nAnte o exposto, [DEFIRO/INDEFIRO] o pedido de [objeto].\n\nIntimem-se.\n\n[Comarca], [data].\n\n[Magistrado]\nJuiz(a) de Direito`,
  acordao: `ACÓRDÃO\n\nVistos, relatados e discutidos estes autos.\n\nACORDAM os Desembargadores da [Câmara], por [unanimidade/maioria], em [dar/negar] provimento ao recurso.\n\n[Ementa]\n\n[Voto do Relator]\n\n[Comarca], [data].`,
};

/* ═══════════════════════════════════════════ */
/*  MAIN COMPONENT                             */
/* ═══════════════════════════════════════════ */
export default function ProcessosSection() {
  const [selectedProcessoId, setSelectedProcessoId] = useState<string | null>(null);

  if (selectedProcessoId) {
    return <ProcessoDetail processoId={selectedProcessoId} onBack={() => setSelectedProcessoId(null)} />;
  }

  return <ProcessosList onSelect={setSelectedProcessoId} />;
}

/* ═══════════════════════════════════════════ */
/*  PROCESSOS LIST                             */
/* ═══════════════════════════════════════════ */
function ProcessosList({ onSelect }: { onSelect: (id: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const autorLookup = useProfileLookup();
  const reuLookup = useProfileLookup();

  const [form, setForm] = useState({
    classe: "civil", assunto: "", descricao: "", autor_nome: "", autor_id: "",
    reu_nome: "", reu_id: "", vara: "1ª Vara Cível", valor_causa: "",
  });

  const { data: processos, isLoading } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleAutorIdChange = async (id: string) => {
    setForm((f) => ({ ...f, autor_id: id }));
    const data = await autorLookup.lookup(id);
    if (data) setForm((f) => ({ ...f, autor_nome: data.nome_completo }));
  };

  const handleReuIdChange = async (id: string) => {
    setForm((f) => ({ ...f, reu_id: id }));
    const data = await reuLookup.lookup(id);
    if (data) setForm((f) => ({ ...f, reu_nome: data.nome_completo }));
  };

  const createProcesso = useMutation({
    mutationFn: async () => {
      // 1. Sortear magistrado via função do banco (prioriza quem tem menos processos ativos)
      const { data: sorteioData } = await supabase.rpc("sortear_magistrado");
      const juizId = sorteioData || null;

      // 2. Get judge name for display
      let juizNome = "";
      if (juizId) {
        const { data: juizProfile } = await supabase.from("profiles").select("nome_completo").eq("user_id", juizId).maybeSingle();
        juizNome = juizProfile?.nome_completo || "";
      }

      const autorDisplay = form.autor_id ? `${form.autor_nome} (ID: ${form.autor_id})` : form.autor_nome;
      const reuDisplay = form.reu_id ? `${form.reu_nome} (ID: ${form.reu_id})` : form.reu_nome;
      const { data: processo, error } = await supabase.from("processos").insert({
        numero: "", classe: form.classe as any, assunto: form.assunto, descricao: form.descricao,
        autor_nome: autorDisplay, reu_nome: reuDisplay, vara: form.vara,
        valor_causa: parseCurrencyToNumber(form.valor_causa),
        juiz_id: juizId,
      }).select().single();
      if (error) throw error;

      // 3. Register lottery movement
      if (juizId && processo) {
        await supabase.from("movimentacoes").insert({
          processo_id: processo.id,
          tipo: "distribuicao",
          descricao: `Processo distribuído por sorteio ao(à) magistrado(a) ${juizNome || "designado(a)"}`,
          autor_id: user?.id,
        });

        // 4. Notify the assigned judge
        await supabase.from("notificacoes").insert({
          user_id: juizId,
          titulo: "Novo processo distribuído",
          mensagem: `O processo ${processo.numero} (${form.assunto}) foi distribuído a você por sorteio.`,
          tipo: "info",
          link_secao: "processos",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setOpen(false);
      setForm({ classe: "civil", assunto: "", descricao: "", autor_nome: "", autor_id: "", reu_nome: "", reu_id: "", vara: "1ª Vara Cível", valor_causa: "" });
      autorLookup.clear(); reuLookup.clear();
      toast.success("Processo cadastrado e distribuído por sorteio!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = processos?.filter((p) => {
    const matchSearch = !search || p.numero?.toLowerCase().includes(search.toLowerCase()) ||
      p.assunto?.toLowerCase().includes(search.toLowerCase()) ||
      p.autor_nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.reu_nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });




  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Processos Eletrônicos</h2>
          <p className="text-sm text-muted-foreground">Sistema Processual da Comarca</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Plus className="h-4 w-4 mr-2" /> Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Cadastrar Novo Processo</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createProcesso.mutate(); }} className="space-y-4 mt-4">
              <Select value={form.classe} onValueChange={(v) => setForm({ ...form, classe: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Classe Processual" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="criminal">Criminal</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="constitucional">Constitucional</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Assunto" value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} required className="rounded-xl" />
              <div className="space-y-1.5">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="ID do Personagem (Autor)" value={form.autor_id} onChange={(e) => handleAutorIdChange(e.target.value)} className="rounded-xl pl-10" />
                </div>
                {autorLookup.result && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-xs">
                    <User className="h-3 w-3 text-green-600" />
                    <span className="text-green-800 dark:text-green-300 font-medium">{autorLookup.result.nome_completo}</span>
                  </div>
                )}
                <Input placeholder="Nome do Autor" value={form.autor_nome} onChange={(e) => setForm({ ...form, autor_nome: e.target.value })} required className="rounded-xl" readOnly={!!autorLookup.result} />
              </div>
              <div className="space-y-1.5">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="ID do Personagem (Réu)" value={form.reu_id} onChange={(e) => handleReuIdChange(e.target.value)} className="rounded-xl pl-10" />
                </div>
                {reuLookup.result && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-xs">
                    <User className="h-3 w-3 text-green-600" />
                    <span className="text-green-800 dark:text-green-300 font-medium">{reuLookup.result.nome_completo}</span>
                  </div>
                )}
                <Input placeholder="Nome do Réu" value={form.reu_nome} onChange={(e) => setForm({ ...form, reu_nome: e.target.value })} required className="rounded-xl" readOnly={!!reuLookup.result} />
              </div>
              <Input placeholder="Vara" value={form.vara} onChange={(e) => setForm({ ...form, vara: e.target.value })} className="rounded-xl" />
              <Input placeholder="Valor da Causa (R$)" value={form.valor_causa} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ""); setForm({ ...form, valor_causa: raw ? formatCurrency(raw) : "" }); }} className="rounded-xl" />
              <Textarea placeholder="Síntese (resumo) dos fatos" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="rounded-xl" />

              <Button type="submit" disabled={createProcesso.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                {createProcesso.isPending ? "Cadastrando..." : "Cadastrar Processo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número, assunto, autor, réu ou ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="rounded-xl w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = processos?.filter((p) => p.status === key).length || 0;
          return (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              className={`p-3 rounded-xl border text-center transition-all ${statusFilter === key ? "border-institutional bg-institutional/5" : "border-border bg-card"}`}>
              <span className="text-lg font-bold text-foreground">{count}</span>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando processos...</div>
      ) : !filtered?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          Nenhum processo encontrado.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.novo;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => onSelect(p.id)}
                className="bg-card rounded-xl p-4 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-institutional">{p.numero}</span>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{p.classe}</span>
                      {p.prioridade && <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Prioritário</span>}
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1 truncate">{p.assunto}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.autor_nome} × {p.reu_nome} — {p.vara}
                      {p.valor_causa ? ` • ${Number(p.valor_causa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                    </p>
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
/*  PROCESSO DETAIL                            */
/* ═══════════════════════════════════════════ */
function ProcessoDetail({ processoId, onBack }: { processoId: string; onBack: () => void }) {
  const { user, profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const isJudicial = roles.some((r) => ["admin", "magistrado", "presidente_tribunal", "desembargador"].includes(r));
  const isMP = roles.includes("ministerio_publico");
  const isAdvogado = roles.includes("advogado");
  const isOficialJustica = roles.includes("oficial_justica");
  const isDelegado = roles.includes("delegado");
  const isCartorario = roles.some((r) => ["admin", "magistrado", "presidente_tribunal", "desembargador"].includes(r));
  const canAddMovimentacao = isJudicial || isMP || isAdvogado || isOficialJustica || isDelegado;

  const { data: processo } = useQuery({
    queryKey: ["processo", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("id", processoId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: movimentacoes } = useQuery({
    queryKey: ["movimentacoes", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("movimentacoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch author names for all movimentacoes
      const autorIds = [...new Set((data || []).map(m => m.autor_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (autorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, nome_completo").in("user_id", autorIds);
        if (profiles) {
          profiles.forEach(p => { profilesMap[p.user_id] = p.nome_completo; });
        }
      }
      return (data || []).map(m => ({ ...m, autor_nome: m.autor_id ? profilesMap[m.autor_id] || "Usuário do sistema" : "Sistema" }));
    },
  });

  const { data: atos } = useQuery({
    queryKey: ["atos", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("atos_judiciais").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: prazos } = useQuery({
    queryKey: ["prazos", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("prazos_processuais").select("*").eq("processo_id", processoId).order("data_fim", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: audiencias } = useQuery({
    queryKey: ["audiencias-processo", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("audiencias").select("*").eq("processo_id", processoId).order("data_hora", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: documentos } = useQuery({
    queryKey: ["documentos", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentos_processo").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  /* ─── Mutations ─── */
  const addMovimentacao = useMutation({
    mutationFn: async ({ tipo, descricao }: { tipo: string; descricao: string }) => {
      const { error } = await supabase.from("movimentacoes").insert({
        processo_id: processoId, tipo, descricao, autor_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["movimentacoes", processoId] }),
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from("processos").update({ status: newStatus as any }).eq("id", processoId);
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "status", descricao: `Status alterado para: ${STATUS_CONFIG[newStatus]?.label || newStatus}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processo", processoId] });
      toast.success("Status atualizado!");
    },
  });

  const createAto = useMutation({
    mutationFn: async (ato: { tipo: string; titulo: string; conteudo: string }) => {
      const { error } = await supabase.from("atos_judiciais").insert({
        processo_id: processoId, ...ato, autor_id: user?.id, autor_nome: profile?.nome_completo || "Sistema",
      });
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "ato_judicial", descricao: `${ato.tipo.toUpperCase()} — ${ato.titulo}\n\n${ato.conteudo}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atos", processoId] });
      toast.success("Ato judicial registrado!");
    },
  });

  const signAto = useMutation({
    mutationFn: async (atoId: string) => {
      const { error } = await supabase.from("atos_judiciais").update({ assinado: true, data_assinatura: new Date().toISOString() }).eq("id", atoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atos", processoId] });
      toast.success("Ato assinado digitalmente!");
    },
  });

  const createPrazo = useMutation({
    mutationFn: async (prazo: { descricao: string; tipo: string; dias_uteis: number }) => {
      const dataFim = new Date();
      dataFim.setHours(dataFim.getHours() + prazo.dias_uteis);
      const { error } = await supabase.from("prazos_processuais").insert({
        processo_id: processoId, descricao: prazo.descricao, tipo: prazo.tipo,
        dias_uteis: prazo.dias_uteis, data_fim: dataFim.toISOString(), responsavel_id: user?.id,
      });
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "prazo", descricao: `Prazo definido: ${prazo.descricao} (${prazo.dias_uteis} horas)` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prazos", processoId] });
      toast.success("Prazo registrado!");
    },
  });

  const scheduleAudiencia = useMutation({
    mutationFn: async (aud: { tipo: string; data_hora: string; local: string }) => {
      const { error } = await supabase.from("audiencias").insert({ processo_id: processoId, ...aud });
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "audiencia", descricao: `Audiência de ${aud.tipo} designada para ${format(new Date(aud.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audiencias-processo", processoId] });
      toast.success("Audiência agendada!");
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async ({ link, nome, tipo }: { link: string; nome: string; tipo: string }) => {
      const { error } = await supabase.from("documentos_processo").insert({
        processo_id: processoId, nome, tipo, arquivo_url: link, autor_id: user?.id,
      });
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "juntada", descricao: `Documento juntado: ${nome}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos", processoId] });
      toast.success("Documento anexado!");
    },
  });

  const { data: certidoes } = useQuery({
    queryKey: ["certidoes", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificacoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Sentenças do processo
  const { data: sentencasProc } = useQuery({
    queryKey: ["sentencas-proc", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sentencas").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Apelações existentes
  const { data: apelacoesProc } = useQuery({
    queryKey: ["apelacoes-proc", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("apelacoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Interpor apelação
  const [showApelacao, setShowApelacao] = useState(false);
  const [apelacaoForm, setApelacaoForm] = useState({ sentenca_id: "", apelante_tipo: "defesa", fundamentacao: "", pedido: "" });
  const interporApelacao = useMutation({
    mutationFn: async () => {
      if (!apelacaoForm.sentenca_id || !apelacaoForm.fundamentacao || !apelacaoForm.pedido) throw new Error("Preencha todos os campos.");
      const { error } = await supabase.from("apelacoes").insert({
        processo_id: processoId,
        sentenca_id: apelacaoForm.sentenca_id,
        apelante_tipo: apelacaoForm.apelante_tipo,
        apelante_nome: profile?.nome_completo || "Apelante",
        apelante_id: user?.id,
        fundamentacao: apelacaoForm.fundamentacao,
        pedido: apelacaoForm.pedido,
      } as any);
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "apelacao", descricao: `RECURSO DE APELAÇÃO interposto por ${profile?.nome_completo || "Apelante"} (${apelacaoForm.apelante_tipo === "defesa" ? "Defesa" : "Acusação"}).` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apelacoes-proc", processoId] });
      setShowApelacao(false);
      setApelacaoForm({ sentenca_id: "", apelante_tipo: "defesa", fundamentacao: "", pedido: "" });
      toast.success("Apelação interposta com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createCertidao = useMutation({
    mutationFn: async (cert: { tipo: string; conteudo: string }) => {
      const { error } = await supabase.from("certificacoes").insert({
        processo_id: processoId, tipo: cert.tipo, conteudo: cert.conteudo,
        emitido_por: user?.id, emitido_por_nome: profile?.nome_completo || "Oficial de Justiça",
      });
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "certidao_oficial", descricao: `Certidão de ${cert.tipo} juntada pelo Oficial de Justiça.\n\n${cert.conteudo}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certidoes", processoId] });
      toast.success("Certidão juntada com sucesso!");
    },
  });

  const signCertidao = useMutation({
    mutationFn: async (certId: string) => {
      const { error } = await supabase.from("certificacoes").update({ assinado: true, data_assinatura: new Date().toISOString() }).eq("id", certId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certidoes", processoId] });
      toast.success("Certidão assinada digitalmente!");
    },
  });

  if (!processo) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const cfg = STATUS_CONFIG[processo.status] || STATUS_CONFIG.novo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-foreground">{processo.numero}</h2>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">{processo.assunto} — {processo.classe}</p>
        </div>
        {isJudicial && (
          <Select value={processo.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="rounded-xl w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoCard label="Autor" value={processo.autor_nome} />
        <InfoCard label="Réu" value={processo.reu_nome} />
        <InfoCard label="Vara" value={processo.vara || "—"} />
        <InfoCard label="Valor" value={processo.valor_causa ? Number(processo.valor_causa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="timeline" className="rounded-lg text-xs"><History className="h-3 w-3 mr-1" /> Timeline</TabsTrigger>
          <TabsTrigger value="atos" className="rounded-lg text-xs"><Gavel className="h-3 w-3 mr-1" /> Atos Judiciais</TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-lg text-xs"><File className="h-3 w-3 mr-1" /> Documentos</TabsTrigger>
          <TabsTrigger value="prazos" className="rounded-lg text-xs"><Timer className="h-3 w-3 mr-1" /> Prazos</TabsTrigger>
          <TabsTrigger value="audiencias" className="rounded-lg text-xs"><Calendar className="h-3 w-3 mr-1" /> Audiências</TabsTrigger>
          {(isOficialJustica || isJudicial) && <TabsTrigger value="certidoes" className="rounded-lg text-xs"><ScrollText className="h-3 w-3 mr-1" /> Certidões</TabsTrigger>}
        </TabsList>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="mt-4 space-y-4">
          {canAddMovimentacao && <AddMovimentacao roles={roles} onAdd={(tipo, desc) => addMovimentacao.mutate({ tipo, descricao: desc })} />}
          {!movimentacoes?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="relative pl-6 border-l-2 border-border space-y-4">
              {movimentacoes.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative">
                  <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-institutional border-2 border-background" />
                  <div className="bg-card rounded-xl p-3 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{m.tipo.replace(/_/g, " ")}</span>
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
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ATOS JUDICIAIS */}
        <TabsContent value="atos" className="mt-4 space-y-4">
          {isJudicial && <AddAto onAdd={(ato) => createAto.mutate(ato)} />}
          {!atos?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum ato judicial registrado.</p>
          ) : (
            <div className="space-y-3">
              {atos.map((a: any) => (
                <div key={a.id} className="bg-card rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{a.tipo}</span>
                    <span className="text-sm font-semibold text-foreground">{a.titulo}</span>
                    {a.assinado ? (
                      <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Assinado
                      </span>
                    ) : isJudicial ? (
                      <Button size="sm" variant="outline" className="ml-auto rounded-lg text-xs" onClick={() => signAto.mutate(a.id)}>
                        <PenTool className="h-3 w-3 mr-1" /> Assinar
                      </Button>
                    ) : (
                      <span className="ml-auto text-[10px] text-muted-foreground">Pendente de assinatura</span>
                    )}
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-secondary/30 rounded-lg p-3 max-h-48 overflow-y-auto">{a.conteudo}</pre>
                  <p className="text-[10px] text-muted-foreground mt-2">{a.autor_nome} — {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DOCUMENTOS */}
        <TabsContent value="documentos" className="mt-4 space-y-4">
          <UploadDoc onUpload={(link, nome, tipo) => uploadDoc.mutate({ link, nome, tipo })} isPending={uploadDoc.isPending} />
          {!documentos?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum documento anexado.</p>
          ) : (
            <div className="space-y-2">
              {documentos.map((d: any) => (
                <div key={d.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                  <File className="h-5 w-5 text-institutional flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{d.tipo} — {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  {d.arquivo_url && (
                    <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="rounded-lg"><Eye className="h-4 w-4" /></Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PRAZOS */}
        <TabsContent value="prazos" className="mt-4 space-y-4">
          {isJudicial && <AddPrazo onAdd={(p) => createPrazo.mutate(p)} />}
          {!prazos?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum prazo registrado.</p>
          ) : (
            <div className="space-y-2">
              {prazos.map((p: any) => {
                const isExpired = new Date(p.data_fim) < new Date() && p.status === "em_andamento";
                return (
                  <div key={p.id} className={`bg-card rounded-xl p-3 border ${isExpired ? "border-destructive/50" : "border-border"}`}>
                    <div className="flex items-center gap-2">
                      <Timer className={`h-4 w-4 ${isExpired ? "text-destructive" : "text-institutional"}`} />
                      <span className="text-sm font-medium text-foreground flex-1">{p.descricao}</span>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${isExpired ? "bg-destructive/10 text-destructive" : "bg-gold/10 text-gold-dark"}`}>
                        {isExpired ? "Vencido" : `${p.dias_uteis}h`}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(p.data_inicio), "dd/MM/yyyy", { locale: ptBR })} → {format(new Date(p.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* AUDIÊNCIAS */}
        <TabsContent value="audiencias" className="mt-4 space-y-4">
          {isJudicial && <AddAudiencia onAdd={(a) => scheduleAudiencia.mutate(a)} />}
          {!audiencias?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma audiência agendada.</p>
          ) : (
            <div className="space-y-2">
              {audiencias.map((a: any) => (
                <div key={a.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-institutional flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(a.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{a.tipo} — {a.local}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CERTIDÕES */}
        {(isOficialJustica || isJudicial) && (
          <TabsContent value="certidoes" className="mt-4 space-y-4">
            {isOficialJustica && <AddCertidao onAdd={(cert) => createCertidao.mutate(cert)} isPending={createCertidao.isPending} />}
            {!certidoes?.length ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma certidão juntada neste processo.</p>
            ) : (
              <div className="space-y-3">
                {certidoes.map((c: any) => (
                  <div key={c.id} className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-institutional/10 text-institutional">{c.tipo}</span>
                      {c.assinado ? (
                        <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Assinado
                        </span>
                      ) : (isOficialJustica && c.emitido_por === user?.id) ? (
                        <Button size="sm" variant="outline" className="ml-auto rounded-lg text-xs" onClick={() => signCertidao.mutate(c.id)}>
                          <PenTool className="h-3 w-3 mr-1" /> Assinar
                        </Button>
                      ) : (
                        <span className="ml-auto text-[10px] text-muted-foreground">Pendente de assinatura</span>
                      )}
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-secondary/30 rounded-lg p-3 max-h-48 overflow-y-auto">{c.conteudo}</pre>
                    <p className="text-[10px] text-muted-foreground mt-2">{c.emitido_por_nome} — {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  SUB-COMPONENTS                             */
/* ═══════════════════════════════════════════ */

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function AddMovimentacao({ roles, onAdd }: { roles: string[]; onAdd: (tipo: string, desc: string) => void }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [anexos, setAnexos] = useState<{ nome: string; url: string }[]>([]);
  const [novoAnexoNome, setNovoAnexoNome] = useState("");
  const [novoAnexoUrl, setNovoAnexoUrl] = useState("");
  const [showInstrucoes, setShowInstrucoes] = useState(false);

  const isJudicial = roles.some((r) => ["admin", "magistrado", "presidente_tribunal", "desembargador"].includes(r));
  const isMP = roles.includes("ministerio_publico");
  const isAdvogado = roles.includes("advogado");
  const isOficialJustica = roles.includes("oficial_justica");
  const isDelegado = roles.includes("delegado");

  const tiposPermitidos: { value: string; label: string }[] = [];

  if (isJudicial) {
    tiposPermitidos.push(
      { value: "despacho", label: "Despacho" },
      { value: "decisao_judicial", label: "Decisão Judicial" },
      { value: "sentenca", label: "Sentença" },
      { value: "conclusao", label: "Conclusão" },
      { value: "distribuicao", label: "Distribuição" },
      { value: "citacao", label: "Citação" },
      { value: "intimacao", label: "Intimação" },
      { value: "juntada", label: "Juntada de Documento" },
      { value: "alvara", label: "Alvará" },
      { value: "mandado", label: "Expedição de Mandado" },
    );
  }
  if (isMP) {
    tiposPermitidos.push(
      { value: "parecer_mp", label: "Parecer do MP" },
      { value: "denuncia", label: "Denúncia" },
      { value: "manifestacao_mp", label: "Manifestação do MP" },
      { value: "alegacoes_finais_mp", label: "Alegações Finais (MP)" },
      { value: "recurso_mp", label: "Recurso (MP)" },
    );
  }
  if (isAdvogado) {
    tiposPermitidos.push(
      { value: "peticao", label: "Petição" },
      { value: "contestacao", label: "Contestação" },
      { value: "recurso", label: "Recurso" },
      { value: "alegacoes_finais", label: "Alegações Finais" },
      { value: "juntada_doc", label: "Juntada de Documento" },
      { value: "substabelecimento", label: "Substabelecimento" },
      { value: "manifestacao", label: "Manifestação" },
    );
  }
  if (isOficialJustica) {
    tiposPermitidos.push(
      { value: "cumprimento_mandado", label: "Cumprimento de Mandado" },
      { value: "certidao_oficial", label: "Certidão do Oficial" },
      { value: "diligencia", label: "Diligência" },
    );
  }
  if (isDelegado) {
    tiposPermitidos.push(
      { value: "relatorio_policial", label: "Relatório Policial" },
      { value: "remessa_inquerito", label: "Remessa de Inquérito" },
    );
  }
  if (!tiposPermitidos.length) {
    tiposPermitidos.push(
      { value: "peticao", label: "Petição" },
      { value: "manifestacao", label: "Manifestação" },
    );
  }

  const [tipo, setTipo] = useState(tiposPermitidos[0]?.value || "peticao");

  const addAnexo = () => {
    if (!novoAnexoNome.trim() || !novoAnexoUrl.trim()) {
      toast.error("Preencha o nome e o link do anexo.");
      return;
    }
    try {
      new URL(novoAnexoUrl.trim());
    } catch {
      toast.error("Insira um link válido (ex: https://...)");
      return;
    }
    setAnexos([...anexos, { nome: novoAnexoNome.trim(), url: novoAnexoUrl.trim() }]);
    setNovoAnexoNome("");
    setNovoAnexoUrl("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let descFinal = desc;
    if (anexos.length > 0) {
      descFinal += "\n\n📎 DOCUMENTOS ANEXOS:\n" + anexos.map((a, i) => `${i + 1}. ${a.nome}: ${a.url}`).join("\n");
    }
    onAdd(tipo, descFinal);
    setDesc("");
    setAnexos([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><Plus className="h-4 w-4 mr-2" /> Nova Movimentação</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tiposPermitidos.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Descrição da movimentação..." value={desc} onChange={(e) => setDesc(e.target.value)} required className="rounded-xl min-h-[120px]" />

          {/* Seção de Anexos */}
          <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4" /> Documentos e Anexos (via link)</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setShowInstrucoes(!showInstrucoes)}
              >
                {showInstrucoes ? "Ocultar instruções" : "Como anexar?"}
              </Button>
            </div>

            <AnimatePresence>
              {showInstrucoes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="text-xs space-y-2 bg-background border border-border rounded-lg p-3 text-muted-foreground">
                    <p className="font-semibold text-foreground">📄 Para arquivos PDF:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Acesse o <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-institutional underline">Google Drive</a></li>
                      <li>Clique em <strong>"+ Novo"</strong> → <strong>"Upload de arquivo"</strong></li>
                      <li>Selecione o PDF do seu computador</li>
                      <li>Após o upload, clique com o <strong>botão direito</strong> no arquivo</li>
                      <li>Vá em <strong>"Compartilhar"</strong> → <strong>"Alterar para qualquer pessoa com o link"</strong></li>
                      <li>Copie o link e cole no campo abaixo</li>
                    </ol>

                    <p className="font-semibold text-foreground mt-3">📝 Para documentos do Google Docs:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Abra o documento no Google Docs</li>
                      <li>Clique em <strong>"Compartilhar"</strong> (canto superior direito)</li>
                      <li>Em "Acesso geral", selecione <strong>"Qualquer pessoa com o link"</strong></li>
                      <li>Defina como <strong>"Leitor"</strong> (para apenas visualização)</li>
                      <li>Clique em <strong>"Copiar link"</strong> e cole abaixo</li>
                    </ol>

                    <div className="mt-3 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                      <p className="text-destructive font-semibold text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        IMPORTANTE: Certifique-se de que o acesso está liberado ANTES de inserir o link!
                      </p>
                      <p className="text-destructive/80 text-[11px] mt-1">
                        Se o acesso não estiver liberado, os demais envolvidos no processo não conseguirão visualizar o documento.
                      </p>
                    </div>

                    <div className="mt-3 flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 rounded-lg"
                        onClick={() => window.open("https://www.youtube.com/watch?v=KGCdxnkyjoc&pp=ygUhY29tbyBmYXplciB1cGxvYWQgbm8gZ29vZ2xlIGRyaXZl", "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                        📹 Tutorial em vídeo: Como fazer upload no Google Drive
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lista de anexos já adicionados */}
            {anexos.length > 0 && (
              <div className="space-y-1.5">
                {anexos.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-xs">
                    <FileText className="h-3 w-3 text-institutional shrink-0" />
                    <span className="font-medium truncate">{a.nome}</span>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-institutional underline truncate max-w-[180px]">{a.url}</a>
                    <button type="button" onClick={() => setAnexos(anexos.filter((_, idx) => idx !== i))} className="ml-auto text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Campos para novo anexo */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do documento"
                value={novoAnexoNome}
                onChange={(e) => setNovoAnexoNome(e.target.value)}
                className="rounded-lg text-xs h-8 flex-1"
              />
              <Input
                placeholder="Cole o link aqui (https://...)"
                value={novoAnexoUrl}
                onChange={(e) => setNovoAnexoUrl(e.target.value)}
                className="rounded-lg text-xs h-8 flex-[2]"
              />
              <Button type="button" variant="secondary" size="sm" className="rounded-lg h-8 text-xs px-3" onClick={addAnexo}>
                <Plus className="h-3 w-3 mr-1" /> Anexar
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">Registrar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddAto({ onAdd }: { onAdd: (ato: { tipo: string; titulo: string; conteudo: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("despacho");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const loadTemplate = (t: string) => {
    setTipo(t);
    setConteudo(ATO_TEMPLATES[t] || "");
    setTitulo(ATO_TIPOS.find((a) => a.value === t)?.label || t);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><Gavel className="h-4 w-4 mr-2" /> Novo Ato Judicial</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Ato Judicial</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ tipo, titulo, conteudo }); setOpen(false); setTitulo(""); setConteudo(""); }} className="space-y-3 mt-3">
          <Select value={tipo} onValueChange={loadTemplate}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ATO_TIPOS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Título do ato" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="rounded-xl" />
          <Textarea placeholder="Conteúdo do ato judicial..." value={conteudo} onChange={(e) => setConteudo(e.target.value)} required rows={12} className="rounded-xl font-mono text-xs" />
          <Button type="submit" className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">Registrar Ato</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadDoc({ onUpload, isPending }: { onUpload: (link: string, nome: string, tipo: string) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("peticao");
  const [showInstrucoes, setShowInstrucoes] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><Upload className="h-4 w-4 mr-2" /> Juntar Documento</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Juntar Documento por Link</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (link.trim()) { onUpload(link.trim(), nome, tipo); setOpen(false); setLink(""); setNome(""); } }} className="space-y-3 mt-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="peticao">Petição</SelectItem>
              <SelectItem value="contestacao">Contestação</SelectItem>
              <SelectItem value="laudo">Laudo</SelectItem>
              <SelectItem value="prova">Prova</SelectItem>
              <SelectItem value="procuracao">Procuração</SelectItem>
              <SelectItem value="certidao">Certidão</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Nome do documento" value={nome} onChange={(e) => setNome(e.target.value)} required className="rounded-xl" />
          <Input placeholder="Cole o link do Google Drive ou Google Docs" value={link} onChange={(e) => setLink(e.target.value)} required className="rounded-xl" />
          
          <button type="button" onClick={() => setShowInstrucoes(!showInstrucoes)} className="text-xs text-primary hover:underline flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {showInstrucoes ? "Ocultar instruções" : "Como compartilhar arquivos?"}
          </button>

          {showInstrucoes && (
            <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-3 border border-border">
              <p className="font-semibold text-foreground text-sm">📋 Como enviar documentos por link</p>
              
              <div className="space-y-1">
                <p className="font-medium text-foreground">Google Drive (arquivos/pastas):</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1">
                  <li>Acesse <span className="font-medium">drive.google.com</span></li>
                  <li>Faça upload do arquivo ou crie uma pasta</li>
                  <li>Clique com botão direito no arquivo → <strong>"Compartilhar"</strong></li>
                  <li>Em "Acesso geral", selecione <strong>"Qualquer pessoa com o link"</strong></li>
                  <li>Clique em <strong>"Copiar link"</strong> e cole no campo acima</li>
                </ol>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-foreground">Google Docs (documentos de texto):</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1">
                  <li>Abra o documento no Google Docs</li>
                  <li>Clique em <strong>"Compartilhar"</strong> (canto superior direito)</li>
                  <li>Em "Acesso geral", selecione <strong>"Qualquer pessoa com o link"</strong></li>
                  <li>Defina como <strong>"Leitor"</strong> (recomendado)</li>
                  <li>Clique em <strong>"Copiar link"</strong> e cole no campo acima</li>
                </ol>
              </div>

              <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                <p className="text-destructive font-medium">⚠️ Importante: Libere o acesso ANTES de colar o link!</p>
                <p className="mt-0.5">Se o link não estiver acessível, o documento não poderá ser visualizado.</p>
              </div>

              <a href="https://www.youtube.com/watch?v=KGCdxnkyjoc" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                🎬 Tutorial em vídeo: Como fazer upload no Google Drive
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <Button type="submit" disabled={isPending || !link.trim()} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
            {isPending ? "Salvando..." : "Juntar Documento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddPrazo({ onAdd }: { onAdd: (p: { descricao: string; tipo: string; dias_uteis: number }) => void }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [tipo, setTipo] = useState("intimacao");
  const [dias, setDias] = useState("24");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><Timer className="h-4 w-4 mr-2" /> Definir Prazo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Definir Prazo Processual</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ descricao: desc, tipo, dias_uteis: parseInt(dias) }); setOpen(false); setDesc(""); }} className="space-y-3 mt-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="intimacao">Intimação</SelectItem>
              <SelectItem value="contestacao">Contestação</SelectItem>
              <SelectItem value="recurso">Recurso</SelectItem>
              <SelectItem value="manifestacao">Manifestação</SelectItem>
              <SelectItem value="cumprimento">Cumprimento</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Descrição do prazo" value={desc} onChange={(e) => setDesc(e.target.value)} required className="rounded-xl" />
          <Input type="number" placeholder="Horas" value={dias} onChange={(e) => setDias(e.target.value)} min="1" required className="rounded-xl" />
          <Button type="submit" className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">Registrar Prazo</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddAudiencia({ onAdd }: { onAdd: (a: { tipo: string; data_hora: string; local: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("instrução");
  const [dataHora, setDataHora] = useState("");
  const [local, setLocal] = useState("Sala de Audiências 1");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><Calendar className="h-4 w-4 mr-2" /> Agendar Audiência</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Agendar Audiência</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ tipo, data_hora: new Date(dataHora).toISOString(), local }); setOpen(false); }} className="space-y-3 mt-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="instrução">Instrução e Julgamento</SelectItem>
              <SelectItem value="conciliação">Conciliação</SelectItem>
              <SelectItem value="custódia">Custódia</SelectItem>
              <SelectItem value="justificação">Justificação</SelectItem>
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} required className="rounded-xl" />
          <Input placeholder="Local / Sala" value={local} onChange={(e) => setLocal(e.target.value)} className="rounded-xl" />
          <Button type="submit" className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">Agendar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const CERTIDAO_TIPOS = [
  { value: "cumprimento_mandado", label: "Certidão de Cumprimento de Mandado" },
  { value: "citacao", label: "Certidão de Citação" },
  { value: "intimacao", label: "Certidão de Intimação" },
  { value: "diligencia_negativa", label: "Certidão Negativa de Diligência" },
  { value: "penhora", label: "Certidão de Penhora" },
  { value: "busca_apreensao", label: "Certidão de Busca e Apreensão" },
  { value: "avaliacao", label: "Certidão de Avaliação" },
  { value: "outra", label: "Outra Certidão" },
];

const CERTIDAO_TEMPLATES: Record<string, string> = {
  cumprimento_mandado: `CERTIDÃO DE CUMPRIMENTO DE MANDADO\n\nCertifico e dou fé que, em cumprimento ao mandado expedido nos presentes autos, dirigi-me ao endereço indicado, onde procedi à [citação/intimação/penhora/busca e apreensão] de [nome da parte].\n\n[Descrever detalhadamente as circunstâncias do cumprimento]\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Nome do Oficial de Justiça]\nOficial de Justiça`,
  citacao: `CERTIDÃO DE CITAÇÃO\n\nCertifico e dou fé que, no dia [data], às [horário], citei pessoalmente [nome do citando], no endereço [endereço], entregando-lhe a contrafé do mandado.\n\n[O citando declarou / recusou-se a assinar]\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Nome do Oficial de Justiça]\nOficial de Justiça`,
  intimacao: `CERTIDÃO DE INTIMAÇÃO\n\nCertifico e dou fé que, no dia [data], intimei pessoalmente [nome do intimando] do teor da decisão/despacho proferido nos presentes autos.\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Nome do Oficial de Justiça]\nOficial de Justiça`,
  diligencia_negativa: `CERTIDÃO NEGATIVA DE DILIGÊNCIA\n\nCertifico e dou fé que, em cumprimento ao mandado expedido nos presentes autos, dirigi-me ao endereço [endereço], porém não logrei êxito em encontrar [nome da parte], pelo motivo: [descrever o motivo].\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Nome do Oficial de Justiça]\nOficial de Justiça`,
  penhora: `CERTIDÃO DE PENHORA\n\nCertifico e dou fé que, em cumprimento ao mandado de penhora, procedi à constrição dos seguintes bens: [descrever bens penhorados].\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Nome do Oficial de Justiça]\nOficial de Justiça`,
  busca_apreensao: `CERTIDÃO DE BUSCA E APREENSÃO\n\nCertifico e dou fé que, em cumprimento ao mandado de busca e apreensão, dirigi-me ao endereço [endereço] e procedi à [descrever o resultado].\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Nome do Oficial de Justiça]\nOficial de Justiça`,
  avaliacao: `CERTIDÃO DE AVALIAÇÃO\n\nCertifico e dou fé que, em cumprimento, procedi à avaliação dos bens penhorados, atribuindo-lhes o valor de [valor].\n\n[Descrição dos bens e critérios de avaliação]\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Nome do Oficial de Justiça]\nOficial de Justiça`,
  outra: `CERTIDÃO\n\nCertifico e dou fé que [conteúdo da certidão].\n\nO referido é verdade. Dou fé.\n\n[Comarca], [data].\n\n[Nome do Oficial de Justiça]\nOficial de Justiça`,
};

function AddCertidao({ onAdd, isPending }: { onAdd: (cert: { tipo: string; conteudo: string }) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("cumprimento_mandado");
  const [conteudo, setConteudo] = useState(CERTIDAO_TEMPLATES["cumprimento_mandado"]);

  const handleTipoChange = (newTipo: string) => {
    setTipo(newTipo);
    setConteudo(CERTIDAO_TEMPLATES[newTipo] || "");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><ScrollText className="h-4 w-4 mr-2" /> Juntar Certidão de Cumprimento</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Certidão de Cumprimento</DialogTitle></DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          onAdd({ tipo, conteudo });
          setOpen(false);
          setTipo("cumprimento_mandado");
          setConteudo(CERTIDAO_TEMPLATES["cumprimento_mandado"]);
        }} className="space-y-3 mt-3">
          <Select value={tipo} onValueChange={handleTipoChange}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CERTIDAO_TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Conteúdo da certidão..." value={conteudo} onChange={(e) => setConteudo(e.target.value)} required className="rounded-xl min-h-[200px] font-mono text-xs" />
          <Button type="submit" disabled={isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
            {isPending ? "Juntando..." : "Juntar Certidão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

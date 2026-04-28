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
  File, Scale, Timer, ChevronRight, X, ExternalLink, ScrollText,
  ShieldCheck, ShieldOff, UserCheck, Lock, Trash2, Download, Edit
} from "lucide-react";
import { generateProcessoPDF, generateMovimentacaoPDF, imageToBase64 } from "@/lib/pdfGenerator";
import logoTjsp from "@/assets/tjsp-logo.png";
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

/* ─── Parse autor/réu display helpers ─── */
type ParteEntry = { nome: string; id_personagem?: string };

function parsePartesFromString(value: string): ParteEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return [{ nome: value }];
}

function formatPartesDisplay(partes: ParteEntry[]): string {
  return partes.map(p => p.id_personagem ? `${p.nome} (ID: ${p.id_personagem})` : p.nome).join(", ");
}

function formatPartesShort(value: string): string {
  const partes = parsePartesFromString(value);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].nome;
  return `${partes[0].nome} e outros (${partes.length})`;
}

/* ─── Multi-party input component ─── */
function MultiPartyInput({ label, entries, onChange }: { label: string; entries: ParteEntry[]; onChange: (e: ParteEntry[]) => void }) {
  const [currentId, setCurrentId] = useState("");
  const [currentNome, setCurrentNome] = useState("");
  const [lookupResult, setLookupResult] = useState<{ nome_completo: string; id_personagem: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupNotFound, setLookupNotFound] = useState(false);

  const handleIdLookup = async () => {
    const id = currentId.trim();
    if (!id) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupNotFound(false);
    const { data } = await supabase.from("profiles").select("nome_completo, id_personagem").eq("id_personagem", id).maybeSingle();
    if (data) {
      setLookupResult({ nome_completo: data.nome_completo, id_personagem: data.id_personagem || "" });
      setCurrentNome(data.nome_completo);
      setLookupNotFound(false);
    } else {
      setLookupNotFound(true);
      setCurrentNome("");
    }
    setLookupLoading(false);
  };

  const handleNameLookup = async () => {
    const nome = currentNome.trim();
    if (!nome) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupNotFound(false);
    const { data } = await supabase.from("profiles").select("nome_completo, id_personagem").ilike("nome_completo", `%${nome}%`).limit(1).maybeSingle();
    if (data) {
      setLookupResult({ nome_completo: data.nome_completo, id_personagem: data.id_personagem || "" });
      setCurrentNome(data.nome_completo);
      if (data.id_personagem) setCurrentId(data.id_personagem);
      setLookupNotFound(false);
    } else {
      setLookupNotFound(true);
    }
    setLookupLoading(false);
  };

  const addEntry = () => {
    const nome = currentNome.trim();
    if (!nome) return;
    const entry: ParteEntry = { nome };
    if (currentId.trim()) entry.id_personagem = currentId.trim();
    onChange([...entries, entry]);
    setCurrentId("");
    setCurrentNome("");
    setLookupResult(null);
    setLookupNotFound(false);
  };

  const removeEntry = (idx: number) => {
    onChange(entries.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 border border-border rounded-xl p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 text-xs">
              <User className="h-3 w-3 text-institutional" />
              <span className="font-medium flex-1">{entry.nome}{entry.id_personagem ? ` (ID: ${entry.id_personagem})` : ""}</span>
              <button type="button" onClick={() => removeEntry(idx)} className="text-destructive hover:text-destructive/80"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`ID do Personagem (${label})`}
                value={currentId}
                onChange={(e) => { setCurrentId(e.target.value); setLookupResult(null); setLookupNotFound(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleIdLookup(); } }}
                className="rounded-xl pl-10"
              />
            </div>
            <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleIdLookup} disabled={lookupLoading || !currentId.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {lookupResult && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-xs">
              <User className="h-3 w-3 text-green-600" />
              <span className="text-green-800 dark:text-green-300 font-medium">{lookupResult.nome_completo}</span>
            </div>
          )}
          {lookupNotFound && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-destructive font-medium">Nenhum cidadão encontrado</span>
            </div>
          )}
          <div className="flex gap-1.5">
            <Input
              placeholder={`Nome do ${label}`}
              value={currentNome}
              onChange={(e) => { setCurrentNome(e.target.value); if (lookupResult) { setLookupResult(null); } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNameLookup(); } }}
              className="rounded-xl flex-1"
            />
            <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleNameLookup} disabled={lookupLoading || !currentNome.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button type="button" variant="outline" size="icon" className="rounded-xl self-end" onClick={addEntry} disabled={!currentNome.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
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

const CLASSE_VARA_MAP: Record<string, string> = {
  criminal: "Vara Criminal",
  civil: "Vara Cível",
  administrativo: "Vara da Fazenda Pública",
  constitucional: "Vara da Fazenda Pública",
};

/* ═══════════════════════════════════════════ */
/*  MAIN COMPONENT                             */
/* ═══════════════════════════════════════════ */
interface ProcessosSectionProps {
  initialProcessoId?: string | null;
}

export default function ProcessosSection({ initialProcessoId }: ProcessosSectionProps) {
  const [selectedProcessoId, setSelectedProcessoId] = useState<string | null>(initialProcessoId || null);

  if (selectedProcessoId) {
    return <ProcessoDetail processoId={selectedProcessoId} onBack={() => setSelectedProcessoId(null)} />;
  }

  return <ProcessosList onSelect={setSelectedProcessoId} />;
}

/* ═══════════════════════════════════════════ */
/*  PROCESSOS LIST                             */
/* ═══════════════════════════════════════════ */
function ProcessosList({ onSelect }: { onSelect: (id: string) => void }) {
  const { user, roles, profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const isCidadao = roles.length === 0 || (roles.length === 1 && roles[0] === "cidadao");

  const [autores, setAutores] = useState<ParteEntry[]>([]);
  const [reus, setReus] = useState<ParteEntry[]>([]);

  const [form, setForm] = useState({
    classe: "civil", assunto: "", descricao: "", vara: "1ª Vara Cível", valor_causa: "", sigilo: "publico",
  });

  const { data: processos, isLoading } = useQuery({
    queryKey: ["processos", isCidadao, profile?.id_personagem, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (!isCidadao) return data;

      // Cidadãos só veem processos onde estão envolvidos
      const idPersonagem = profile?.id_personagem;
      const userId = user?.id;
      if (!idPersonagem && !userId) return [];

      // Buscar processos onde cidadão é interessado
      const { data: interessados } = await supabase
        .from("interessados_processo")
        .select("processo_id")
        .eq("user_id", userId || "");
      const interessadoIds = new Set((interessados || []).map(i => i.processo_id));

      // Buscar processos com procuração ativa
      const { data: procuracoes } = await supabase
        .from("procuracoes")
        .select("processo_id")
        .eq("advogado_id", userId || "")
        .eq("status", "ativa");
      const procuracaoIds = new Set((procuracoes || []).map(p => p.processo_id));

      return (data || []).filter(p => {
        // Verificar se é parte (autor ou réu) pelo id_personagem
        if (idPersonagem) {
          const isAutor = p.autor_nome?.includes(idPersonagem);
          const isReu = p.reu_nome?.includes(idPersonagem);
          if (isAutor || isReu) return true;
        }
        // Verificar se é interessado ou tem procuração
        if (interessadoIds.has(p.id) || procuracaoIds.has(p.id)) return true;
        return false;
      });
    },
  });

  const createProcesso = useMutation({
    mutationFn: async () => {
      if (autores.length === 0) throw new Error("Adicione pelo menos um autor");
      if (reus.length === 0) throw new Error("Adicione pelo menos um réu");

      const { data: sorteioData } = await supabase.rpc("sortear_magistrado");
      const juizId = sorteioData || null;

      let juizNome = "";
      if (juizId) {
        const { data: juizProfile } = await supabase.from("profiles").select("nome_completo").eq("user_id", juizId).maybeSingle();
        juizNome = juizProfile?.nome_completo || "";
      }

      const autorDisplay = JSON.stringify(autores);
      const reuDisplay = JSON.stringify(reus);
      const processoId = crypto.randomUUID();
      const { error } = await supabase.from("processos").insert({
        id: processoId,
        numero: "", classe: form.classe as any, assunto: form.assunto, descricao: form.descricao,
        autor_nome: autorDisplay, reu_nome: reuDisplay, vara: form.vara,
        valor_causa: parseCurrencyToNumber(form.valor_causa),
        juiz_id: juizId,
        sigilo: form.sigilo,
      });
      if (error) throw error;

      if (user?.id) {
        const openerOrgao = isCidadao ? "Parte Interessada" : (roles.includes("advogado") ? "Advocacia" : "Parte Interessada");
        const { error: interessadoError } = await supabase.from("interessados_processo").insert({
          processo_id: processoId,
          user_id: user.id,
          orgao: openerOrgao,
          qualificacao: "interessado",
        } as any);
        if (interessadoError) throw interessadoError;
      }

      if (juizId) {
        await supabase.from("movimentacoes").insert({
          processo_id: processoId,
          tipo: "distribuicao",
          descricao: `Processo distribuído por sorteio ao(à) Juiz(a) de Direito ${juizNome || "designado(a)"}`,
          autor_id: user?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setOpen(false);
      setForm({ classe: "civil", assunto: "", descricao: "", vara: "1ª Vara Cível", valor_causa: "", sigilo: "publico" });
      setAutores([]); setReus([]);
      toast.success("Processo cadastrado e distribuído por sorteio!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = processos?.filter((p) => {
    const term = search.trim().toLowerCase();
    const autorPartes = parsePartesFromString(p.autor_nome);
    const reuPartes = parsePartesFromString(p.reu_nome);
    const partesText = [...autorPartes, ...reuPartes]
      .map(x => `${x.nome || ""} ${x.id_personagem || ""}`)
      .join(" ")
      .toLowerCase();
    const matchSearch = !term ||
      p.numero?.toLowerCase().includes(term) ||
      p.assunto?.toLowerCase().includes(term) ||
      partesText.includes(term);
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
              <Select value={form.classe} onValueChange={(v) => setForm({ ...form, classe: v, vara: CLASSE_VARA_MAP[v] || "" })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Classe Processual" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="criminal">Criminal</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="constitucional">Constitucional</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Assunto" value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} required className="rounded-xl" />
              <MultiPartyInput label="Autor" entries={autores} onChange={setAutores} />
              <MultiPartyInput label="Réu" entries={reus} onChange={setReus} />
              <Input placeholder="Vara" value={form.vara} onChange={(e) => setForm({ ...form, vara: e.target.value })} className="rounded-xl" />
              <Input placeholder="Valor da Causa (R$)" value={form.valor_causa} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ""); setForm({ ...form, valor_causa: raw ? formatCurrency(raw) : "" }); }} className="rounded-xl" />
               <Textarea placeholder="Síntese (resumo) dos fatos" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="rounded-xl" />

              <Select value={form.sigilo} onValueChange={(v) => setForm({ ...form, sigilo: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Nível de Sigilo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="publico">Público</SelectItem>
                  <SelectItem value="segredo_justica">Segredo de Justiça</SelectItem>
                  <SelectItem value="sigilo_absoluto">Sigilo Absoluto</SelectItem>
                </SelectContent>
              </Select>

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
                      {(p as any).sigilo && (p as any).sigilo !== "publico" && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                          <Lock className="h-3 w-3" /> {(p as any).sigilo === "segredo_justica" ? "Segredo de Justiça" : "Sigilo Absoluto"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1 truncate">{p.assunto}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatPartesShort(p.autor_nome)} × {formatPartesShort(p.reu_nome)} — {p.vara}
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
/*  EDITABLE PARTES SECTION                    */
/* ═══════════════════════════════════════════ */
function EditablePartesSection({ processo, processoId, advAutor, advReu, canEdit, userId, profileName }: {
  processo: any; processoId: string; advAutor: any[]; advReu: any[]; canEdit: boolean; userId?: string; profileName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editAutores, setEditAutores] = useState<ParteEntry[]>([]);
  const [editReus, setEditReus] = useState<ParteEntry[]>([]);
  const queryClient = useQueryClient();

  const startEditing = () => {
    setEditAutores(parsePartesFromString(processo.autor_nome));
    setEditReus(parsePartesFromString(processo.reu_nome));
    setEditing(true);
  };

  const savePartes = useMutation({
    mutationFn: async () => {
      const oldAutores = formatPartesDisplay(parsePartesFromString(processo.autor_nome));
      const oldReus = formatPartesDisplay(parsePartesFromString(processo.reu_nome));
      const newAutores = formatPartesDisplay(editAutores);
      const newReus = formatPartesDisplay(editReus);

      const changes: string[] = [];
      if (oldAutores !== newAutores) changes.push(`Autor(es): de "${oldAutores}" para "${newAutores}"`);
      if (oldReus !== newReus) changes.push(`Réu(s): de "${oldReus}" para "${newReus}"`);
      if (changes.length === 0) { setEditing(false); throw new Error("__no_changes__"); }

      if (editAutores.length === 0 || editReus.length === 0) {
        throw new Error("É necessário pelo menos um autor e um réu.");
      }

      const { error } = await supabase.from("processos").update({
        autor_nome: JSON.stringify(editAutores),
        reu_nome: JSON.stringify(editReus),
      }).eq("id", processoId);
      if (error) throw error;

      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "retificacao_partes",
        descricao: `Retificação de partes pelo(a) magistrado(a) ${profileName || ""}:\n${changes.join("\n")}`,
        autor_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processo", processoId] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes", processoId] });
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setEditing(false);
      toast.success("Partes retificadas com sucesso!");
    },
    onError: (err: any) => {
      if (err?.message === "__no_changes__") return;
      toast.error(err?.message || "Erro ao retificar partes");
    },
  });

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Partes e Representantes</h3>
        {canEdit && !editing && (
          <Button variant="ghost" size="sm" onClick={startEditing} className="h-7 text-xs gap-1">
            <Edit className="h-3 w-3" /> Retificar Partes
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <MultiPartyInput label="Autor" entries={editAutores} onChange={setEditAutores} />
          <MultiPartyInput label="Réu" entries={editReus} onChange={setEditReus} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => savePartes.mutate()} disabled={savePartes.isPending} className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              {savePartes.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="rounded-xl">Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Autor(es)</p>
            {parsePartesFromString(processo.autor_nome).map((p, idx) => (
              <p key={idx} className="text-sm font-medium text-foreground">
                {p.nome}{p.id_personagem ? <span className="text-xs text-muted-foreground ml-1">(ID: {p.id_personagem})</span> : ""}
              </p>
            ))}
            {advAutor.length > 0 && (
              <div className="mt-2 space-y-1">
                {advAutor.map((a: any) => (
                  <p key={a.id} className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-institutional" /> Adv. {a.advogado_nome}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Réu(s)</p>
            {parsePartesFromString(processo.reu_nome).map((p, idx) => (
              <p key={idx} className="text-sm font-medium text-foreground">
                {p.nome}{p.id_personagem ? <span className="text-xs text-muted-foreground ml-1">(ID: {p.id_personagem})</span> : ""}
              </p>
            ))}
            {advReu.length > 0 && (
              <div className="mt-2 space-y-1">
                {advReu.map((a: any) => (
                  <p key={a.id} className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-institutional" /> Adv. {a.advogado_nome}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function ProcessoDetail({ processoId, onBack }: { processoId: string; onBack: () => void }) {
  const { user, profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes("admin");
  const isMagistradoOrDesembargador = roles.some((r) => ["magistrado", "desembargador"].includes(r));
  const isPresidenteTribunal = roles.includes("presidente_tribunal");
  const isMP = roles.includes("ministerio_publico");
  const isAdvogado = roles.includes("advogado");
  const isOficialJustica = roles.includes("oficial_justica");
  const isPolicia = roles.some(r => ["policia_civil", "policia_militar", "policia_federal"].includes(r));
  const isHospital = roles.includes("hospital");
  const isProcuradorGeral = roles.includes("procurador_geral");
  const isProcuradorEstado = roles.includes("procurador_estado");
  const isInstitucional = isMP || isProcuradorGeral || isProcuradorEstado || isPolicia || isHospital;
  // Move processo query up so we can compute permissions based on juiz_id
  const { data: processo } = useQuery({
    queryKey: ["processo", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("id", processoId).single();
      if (error) throw error;
      return data;
    },
  });

  // Judge profile lookup
  const { data: juizProfile } = useQuery({
    queryKey: ["juiz-profile", processo?.juiz_id],
    queryFn: async () => {
      if (!processo?.juiz_id) return null;
      const { data } = await supabase.from("profiles").select("nome_completo").eq("user_id", processo.juiz_id).maybeSingle();
      return data;
    },
    enabled: !!processo?.juiz_id,
  });

  // Magistrado/desembargador can only act on their assigned processes
  const isAssignedJudge = (isMagistradoOrDesembargador) && processo?.juiz_id === user?.id;
  // Juízes/desembargadores NÃO podem agir na aba Processos — só via Portal do Juiz
  const isJudicial = isAdmin || isPresidenteTribunal;
  const isJudicialReadOnly = isAdmin || isPresidenteTribunal || isAssignedJudge;

  // Procuracoes
  const { data: procuracoes } = useQuery({
    queryKey: ["procuracoes", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("procuracoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[] || [];
    },
  });

  const advogadoTemProcuracao = isAdvogado && procuracoes?.some(
    (p: any) => p.advogado_id === user?.id && p.status === "ativa"
  );

  // Parse individual parties from processo for procuração selection
  const partesAutor = processo ? parsePartesFromString(processo.autor_nome) : [];
  const partesReu = processo ? parsePartesFromString(processo.reu_nome) : [];

  // canAddMovimentacao is computed after jaInteressado below

  const [showProcuracao, setShowProcuracao] = useState(false);
  const [procForm, setProcForm] = useState<{ selectedPartes: string[]; documento_url: string }>({ selectedPartes: [], documento_url: "" });

  const toggleParteSelection = (parteKey: string) => {
    setProcForm(prev => ({
      ...prev,
      selectedPartes: prev.selectedPartes.includes(parteKey)
        ? prev.selectedPartes.filter(k => k !== parteKey)
        : [...prev.selectedPartes, parteKey],
    }));
  };

  // Get parties this lawyer already represents actively
  const minhasProcuracoes = procuracoes?.filter((p: any) => p.advogado_id === user?.id && p.status === "ativa") || [];
  const partesJaRepresentadas = minhasProcuracoes.map((p: any) => p.parte);

  const juntarProcuracao = useMutation({
    mutationFn: async () => {
      if (!procForm.documento_url) throw new Error("Informe o link da procuração.");
      if (procForm.selectedPartes.length === 0) throw new Error("Selecione ao menos uma parte para representar.");

      // Insert one procuracao per selected party
      const inserts = procForm.selectedPartes.map(parteKey => ({
        processo_id: processoId,
        advogado_id: user?.id,
        advogado_nome: profile?.nome_completo || "Advogado",
        parte: parteKey,
        documento_url: procForm.documento_url,
        status: "ativa",
      }));
      const { error } = await supabase.from("procuracoes").insert(inserts);
      if (error) throw error;

      const partesDesc = procForm.selectedPartes.map(k => {
        const [lado, ...rest] = k.split(":");
        const nome = rest.join(":");
        return `${lado === "autor" ? "AUTOR" : "RÉU"} ${nome}`;
      }).join(", ");

      await addMovimentacao.mutateAsync({
        tipo: "procuracao",
        descricao: `PROCURAÇÃO juntada por ${profile?.nome_completo || "Advogado"} — qualificando-se como advogado(a) de: ${partesDesc}.\nDocumento: ${procForm.documento_url}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procuracoes", processoId] });
      setShowProcuracao(false);
      setProcForm({ selectedPartes: [], documento_url: "" });
      toast.success("Procuração juntada com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [showRenuncia, setShowRenuncia] = useState(false);
  const [motivoRenuncia, setMotivoRenuncia] = useState("");
  const [renunciaSelectedId, setRenunciaSelectedId] = useState<string | null>(null);

  const renunciarProcuracao = useMutation({
    mutationFn: async () => {
      // If specific procuracao selected, renounce that; otherwise renounce all
      const targetProcuracoes = renunciaSelectedId
        ? minhasProcuracoes.filter((p: any) => p.id === renunciaSelectedId)
        : minhasProcuracoes;
      if (targetProcuracoes.length === 0) throw new Error("Nenhuma procuração ativa encontrada.");
      
      for (const proc of targetProcuracoes) {
        const { error } = await supabase.from("procuracoes").update({
          status: "renunciada",
          renunciada_em: new Date().toISOString(),
          motivo_renuncia: motivoRenuncia || null,
        }).eq("id", proc.id);
        if (error) throw error;
      }

      const partesDesc = targetProcuracoes.map((p: any) => {
        const [lado, ...rest] = (p.parte || "").split(":");
        const nome = rest.join(":") || (lado === "autor" ? "AUTOR" : "RÉU");
        return `${lado === "autor" ? "AUTOR" : "RÉU"} ${nome}`;
      }).join(", ");
      
      await addMovimentacao.mutateAsync({
        tipo: "renuncia",
        descricao: `RENÚNCIA DE MANDATO por ${profile?.nome_completo || "Advogado"} — partes: ${partesDesc}.${motivoRenuncia ? `\nMotivo: ${motivoRenuncia}` : ""}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procuracoes", processoId] });
      setShowRenuncia(false);
      setMotivoRenuncia("");
      toast.success("Renúncia registrada com sucesso.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createAtoCartorio = useMutation({
    mutationFn: async (ato: { tipo: string; titulo: string; conteudo: string; anexo_urls?: string[] }) => {
      const autorNome = "Escrevente Técnico Judiciário Abel Haus";
      const { error } = await supabase.from("atos_judiciais").insert({
        processo_id: processoId, tipo: ato.tipo, titulo: ato.titulo, conteudo: ato.conteudo,
        autor_id: null, autor_nome: autorNome, assinado: true, data_assinatura: new Date().toISOString(),
      });
      if (error) throw error;
      const validUrls = (ato.anexo_urls || []).filter(u => u.trim());
      if (validUrls.length > 0) {
        const docsToInsert = validUrls.map((url, idx) => ({
          processo_id: processoId, nome: validUrls.length === 1 ? ato.titulo : `${ato.titulo} (${idx + 1})`,
          tipo: ato.tipo === "juntada" ? "certidao" : "outros" as string,
          arquivo_url: url.trim(), autor_id: user?.id,
        }));
        await supabase.from("documentos_processo").insert(docsToInsert);
      }
      await addMovimentacao.mutateAsync({ tipo: ato.tipo, descricao: `${ato.tipo === "juntada" ? "JUNTADA" : "ATO ORDINATÓRIO"} — ${ato.titulo}\n\n${ato.conteudo}\n\nAssinado por: ${autorNome}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atos", processoId] });
      queryClient.invalidateQueries({ queryKey: ["documentos", processoId] });
      toast.success("Ato do Cartório registrado!");
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

  const deleteProcesso = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("processos").delete().eq("id", processoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      toast.success("Processo excluído com sucesso!");
      onBack();
    },
    onError: (err: any) => toast.error("Erro ao excluir: " + err.message),
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

  const { data: intimacoesProc } = useQuery({
    queryKey: ["intimacoes-processo", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("intimacoes").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Interessados no processo (opt-in)
  const { data: interessadosData } = useQuery({
    queryKey: ["interessados", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("interessados_processo").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch profiles for names
      const userIds = [...new Set((data || []).map(i => i.user_id))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, nome_completo").in("user_id", userIds);
        if (profiles) profiles.forEach(p => { profilesMap[p.user_id] = p.nome_completo; });
      }
      return (data || []).map(i => ({ ...i, nome: profilesMap[i.user_id] || "Usuário" }));
    },
  });

  const ORGAOS_INTERESSADOS = [
    { role: "admin", label: "Administração" },
    { role: "magistrado", label: "Magistratura" },
    { role: "ministerio_publico", label: "Ministério Público" },
    { role: "procurador_geral", label: "Procuradoria-Geral" },
    { role: "procurador_estado", label: "Procuradoria Geral do Estado" },
    { role: "oficial_justica", label: "Oficial de Justiça" },
    { role: "advogado", label: "Advocacia" },
    { role: "presidente_tribunal", label: "Presidência do Tribunal" },
    { role: "desembargador", label: "Desembargadoria" },
    { role: "presidente_oab", label: "Presidência da OAB" },
    { role: "investigador", label: "Investigação" },
    { role: "delegado", label: "Delegacia" },
    { role: "policia_civil", label: "Polícia Civil" },
    { role: "policia_militar", label: "Polícia Militar" },
    { role: "policia_federal", label: "Polícia Federal" },
    { role: "hospital", label: "Hospital" },
  ];

  const ROLES_NAO_MANIFESTAM = ["cidadao", "bacharel_direito"];
  const canManifestInteresse = roles.some(r => !ROLES_NAO_MANIFESTAM.includes(r));
  const userOrgaoEntry = ORGAOS_INTERESSADOS.find(o => roles.includes(o.role));
  const userOrgao = userOrgaoEntry?.label ?? null;
  const jaInteressado = interessadosData?.some(i => i.user_id === user?.id);

  // Institutional roles (MP/PC/PM/PF/Hospital) can only move after qualifying as interested
  const institucionalInteressado = isInstitucional && jaInteressado;
  // After sentencing, no new movimentações — only appeals are allowed (except oficial de justiça)
  const isSentenciado = processo?.status === "sentenciado";
  const isArquivado = processo?.status === "arquivado";
  const canAddMovimentacao = isOficialJustica || (!isSentenciado && !isArquivado && (isJudicial || (isAdvogado && advogadoTemProcuracao) || institucionalInteressado));

  const manifestarInteresse = useMutation({
    mutationFn: async () => {
      if (!userOrgao) throw new Error("Seu cargo não permite manifestar-se como interessado.");
      const qualificacao = (roles.includes("ministerio_publico") || roles.includes("procurador_geral") || roles.includes("procurador_estado")) && processo?.classe !== "criminal" ? "custos legis" : "interessado";
      const { error } = await supabase.from("interessados_processo").insert({
        processo_id: processoId, user_id: user?.id, orgao: userOrgao, qualificacao,
      } as any);
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "interessado", descricao: `${userOrgao} manifestou-se como interessado no processo (${qualificacao}).` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interessados", processoId] });
      toast.success("Manifestação de interesse registrada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const retirarInteresse = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("interessados_processo").delete().eq("processo_id", processoId).eq("user_id", user?.id);
      if (error) throw error;
      await addMovimentacao.mutateAsync({ tipo: "interessado", descricao: `${userOrgao} retirou sua manifestação de interesse no processo.` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interessados", processoId] });
      toast.success("Manifestação de interesse retirada.");
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

  // Embargos de declaração
  const { data: embargosProc } = useQuery({
    queryKey: ["embargos-proc", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("embargos_declaracao").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Check if appeal deadline (3 days after latest sentença) has passed
  const latestSentenca = sentencasProc?.length
    ? sentencasProc.reduce((a: any, b: any) => new Date(a.created_at) > new Date(b.created_at) ? a : b)
    : null;
  const prazoApelacaoExpirado = (() => {
    if (!isSentenciado || !latestSentenca) return false;
    const deadline = new Date(new Date(latestSentenca.created_at).getTime() + 3 * 24 * 60 * 60 * 1000);
    return new Date() > deadline;
  })();

  // Renúncias de prazo recursal sobre a última sentença
  const { data: renunciasProc } = useQuery({
    queryKey: ["renuncias-prazo", latestSentenca?.id],
    queryFn: async () => {
      if (!latestSentenca?.id) return [] as any[];
      const { data, error } = await supabase.from("renuncias_prazo" as any).select("*").eq("sentenca_id", latestSentenca.id);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!latestSentenca?.id,
  });

  const isCriminal = processo?.classe === "criminal";
  // Determinar tipo de parte do usuário atual
  const minhaParteTipo: "autor" | "reu" | "mp" | null = (() => {
    if (isMP && isCriminal) return "mp";
    if (isAdvogado && advogadoTemProcuracao) {
      const procs = procuracoes?.filter((p: any) => p.advogado_id === user?.id && p.status === "ativa") || [];
      const procAutor = procs.some((p: any) => (p.parte || "").startsWith("autor"));
      const procReu = procs.some((p: any) => (p.parte || "").startsWith("reu"));
      if (procAutor) return "autor";
      if (procReu) return "reu";
    }
    return null;
  })();

  const partesNecessarias: Array<"autor" | "reu" | "mp"> = isCriminal ? ["autor", "reu", "mp"] : ["autor", "reu"];
  const renunciaPorParte = (tipo: string) => renunciasProc?.find((r: any) => r.parte_tipo === tipo);
  const minhaRenuncia = minhaParteTipo ? renunciaPorParte(minhaParteTipo) : null;
  const podeRenunciar = !!minhaParteTipo && isSentenciado && !prazoApelacaoExpirado && !minhaRenuncia && (apelacoesProc?.length ?? 0) === 0;

  const renunciarPrazo = useMutation({
    mutationFn: async () => {
      if (!minhaParteTipo || !latestSentenca?.id) throw new Error("Não é possível renunciar.");
      const labelParte = minhaParteTipo === "mp" ? "Ministério Público" : minhaParteTipo === "autor" ? "Autor" : "Réu";
      const { error } = await supabase.from("renuncias_prazo" as any).insert({
        processo_id: processoId,
        sentenca_id: latestSentenca.id,
        parte_tipo: minhaParteTipo,
        user_id: user?.id,
        user_nome: profile?.nome_completo || labelParte,
      } as any);
      if (error) throw error;
      await addMovimentacao.mutateAsync({
        tipo: "renuncia_prazo",
        descricao: `${labelParte} (${profile?.nome_completo || "—"}) renunciou ao prazo recursal manifestando desinteresse em recorrer da sentença.`,
      });

      // Verificar se todas as partes renunciaram → trânsito em julgado + arquivamento
      const { data: todas } = await supabase.from("renuncias_prazo" as any).select("parte_tipo").eq("sentenca_id", latestSentenca.id);
      const tipos = new Set((todas || []).map((r: any) => r.parte_tipo));
      tipos.add(minhaParteTipo);
      const todasRenunciaram = partesNecessarias.every(p => tipos.has(p));
      if (todasRenunciaram) {
        await addMovimentacao.mutateAsync({
          tipo: "transito_julgado",
          descricao: "Trânsito em julgado certificado — todas as partes renunciaram ao prazo recursal. Autos arquivados.",
        });
        const { error: upErr } = await supabase.from("processos").update({ status: "arquivado" as any }).eq("id", processoId);
        if (upErr) throw upErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renuncias-prazo", latestSentenca?.id] });
      queryClient.invalidateQueries({ queryKey: ["processo", processoId] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes", processoId] });
      toast.success("Renúncia ao prazo registrada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Interpor apelação
  const [showApelacao, setShowApelacao] = useState(false);
  const [apelacaoForm, setApelacaoForm] = useState({ sentenca_id: "", apelante_tipo: "reu", fundamentacao: "", pedido: "" });
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
      await addMovimentacao.mutateAsync({ tipo: "apelacao", descricao: `RECURSO DE APELAÇÃO interposto por ${profile?.nome_completo || "Apelante"} (${apelacaoForm.apelante_tipo === "reu" ? "Réu" : apelacaoForm.apelante_tipo === "autor" ? "Autor" : "Ambas as partes"}).` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apelacoes-proc", processoId] });
      setShowApelacao(false);
      setApelacaoForm({ sentenca_id: "", apelante_tipo: "reu", fundamentacao: "", pedido: "" });
      toast.success("Apelação interposta com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Embargos de declaração
  const [showEmbargos, setShowEmbargos] = useState(false);
  const [embargosForm, setEmbargosForm] = useState({ sentenca_id: "", tipo: "omissao", fundamentacao: "", pedido: "" });
  const oporEmbargos = useMutation({
    mutationFn: async () => {
      if (!embargosForm.sentenca_id || !embargosForm.fundamentacao || !embargosForm.pedido) throw new Error("Preencha todos os campos.");
      const { error } = await supabase.from("embargos_declaracao").insert({
        processo_id: processoId,
        sentenca_id: embargosForm.sentenca_id,
        embargante_id: user?.id,
        embargante_nome: profile?.nome_completo || "Embargante",
        tipo: embargosForm.tipo,
        fundamentacao: embargosForm.fundamentacao,
        pedido: embargosForm.pedido,
      } as any);
      if (error) throw error;
      const tipoLabel = embargosForm.tipo === "omissao" ? "omissão" : embargosForm.tipo === "contradicao" ? "contradição" : "obscuridade";
      await addMovimentacao.mutateAsync({ tipo: "embargos_declaracao", descricao: `EMBARGOS DE DECLARAÇÃO opostos por ${profile?.nome_completo || "Embargante"} — Tipo: ${tipoLabel}.` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["embargos-proc", processoId] });
      setShowEmbargos(false);
      setEmbargosForm({ sentenca_id: "", tipo: "omissao", fundamentacao: "", pedido: "" });
      toast.success("Embargos de declaração opostos com sucesso!");
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

  // Advogados from procuracoes (parte can be "autor", "reu", "autor:Nome", "reu:Nome")
  const advAutor = procuracoes?.filter((p: any) => p.status === "ativa" && (p.parte === "autor" || p.parte?.startsWith("autor:"))) || [];
  const advReu = procuracoes?.filter((p: any) => p.status === "ativa" && (p.parte === "reu" || p.parte?.startsWith("reu:"))) || [];

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
            {(processo as any).sigilo && (processo as any).sigilo !== "publico" && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                <Lock className="h-3 w-3" /> {(processo as any).sigilo === "segredo_justica" ? "Segredo de Justiça" : "Sigilo Absoluto"}
              </span>
            )}
            {isJudicial && (
              <Select value={processo.status} onValueChange={(v) => updateStatus.mutate(v)}>
                <SelectTrigger className="rounded-xl w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {isAdmin && (
              <Button variant="destructive" size="sm" className="rounded-xl text-xs"
                onClick={() => { if (window.confirm("Tem certeza que deseja excluir este processo? Esta ação é irreversível.")) deleteProcesso.mutate(); }}
                disabled={deleteProcesso.isPending}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> {deleteProcesso.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            )}
            <Button variant="outline" size="sm" className="rounded-xl text-xs"
              onClick={async () => {
                const logo64 = await imageToBase64(logoTjsp);
                generateProcessoPDF({
                  processo,
                  juizNome: juizProfile?.nome_completo || "Não atribuído",
                  movimentacoes: movimentacoes || [],
                  atos: atos || [],
                  audiencias: audiencias || [],
                  sentencas: sentencasProc || [],
                  procuracoes: procuracoes || [],
                  interessados: interessadosData || [],
                  apelacoes: apelacoesProc || [],
                  embargos: embargosProc || [],
                  logoBase64: logo64,
                  baixadoPor: profile?.nome_completo || "Usuario nao identificado",
                });
              }}>
              <Download className="h-3.5 w-3.5 mr-1" /> Baixar Íntegra
            </Button>
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
          <EditablePartesSection
            processo={processo}
            processoId={processoId}
            advAutor={advAutor}
            advReu={advReu}
            canEdit={isJudicial || isAssignedJudge || isMagistradoOrDesembargador}
            userId={user?.id}
            profileName={profile?.nome_completo}
          />

          {/* Interessados */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Interessados</h3>
              {canManifestInteresse && !jaInteressado && (
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => manifestarInteresse.mutate()}>
                  <Scale className="h-3.5 w-3.5 mr-1" /> Manifestar-se como Interessado
                </Button>
              )}
              {canManifestInteresse && jaInteressado && (
                <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-destructive" onClick={() => retirarInteresse.mutate()}>
                  <X className="h-3.5 w-3.5 mr-1" /> Retirar Interesse
                </Button>
              )}
            </div>
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
          {processo.valor_causa && (
            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Informações Adicionais</h3>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Valor da Causa</p>
                <p className="text-sm font-bold text-foreground">{Number(processo.valor_causa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              </div>
              {processo.descricao && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Síntese dos Fatos</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{processo.descricao}</p>
                </div>
              )}
            </div>
          )}
          {!processo.valor_causa && processo.descricao && (
            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Informações Adicionais</h3>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Síntese dos Fatos</p>
                <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{processo.descricao}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notice for magistrado viewing process not assigned to them */}
      {isMagistradoOrDesembargador && !isAssignedJudge && !isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Processo não atribuído a você</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Este processo está atribuído a outro Juiz de Direito. Você pode visualizar, mas não pode realizar movimentações judiciais.
            </p>
          </div>
        </div>
      )}

      {/* Advogados / Procurações */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><UserCheck className="h-4 w-4 text-institutional" /> Advogados Constituídos</h3>
          <div className="flex gap-2">
            {isAdvogado && (
              <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => setShowProcuracao(true)}>
                <ShieldCheck className="h-3 w-3 mr-1" /> Juntar Procuração
              </Button>
            )}
            {isAdvogado && advogadoTemProcuracao && (
              <Button size="sm" variant="destructive" className="rounded-lg text-xs" onClick={() => setShowRenuncia(true)}>
                <ShieldOff className="h-3 w-3 mr-1" /> Renunciar Mandato
              </Button>
            )}
          </div>
        </div>

        {/* Active procuracoes list */}
        {(!procuracoes || procuracoes.filter((p: any) => p.status === "ativa").length === 0) ? (
          <p className="text-xs text-muted-foreground">Nenhum advogado constituído neste processo.</p>
        ) : (
          <div className="space-y-2">
            {procuracoes.filter((p: any) => p.status === "ativa").map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 bg-secondary/30 rounded-lg p-2.5">
                <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{p.advogado_nome}</p>
                  <p className="text-[10px] text-muted-foreground">Advogado(a) do(a) {(() => { const [lado, ...rest] = (p.parte || "").split(":"); const nome = rest.join(":"); return nome ? `${lado === "autor" ? "AUTOR" : "RÉU"} ${nome}` : (lado === "autor" ? "AUTOR" : "RÉU"); })()} — desde {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                {p.documento_url && (
                  <a href={p.documento_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Procuração
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Renunciados */}
        {procuracoes && procuracoes.filter((p: any) => p.status === "renunciada").length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Renúncias</p>
            {procuracoes.filter((p: any) => p.status === "renunciada").map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 bg-destructive/5 rounded-lg p-2 mb-1">
                <ShieldOff className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground/70">{p.advogado_nome}</span> — renunciou em {p.renunciada_em ? format(new Date(p.renunciada_em), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                  {p.motivo_renuncia && <p className="text-[10px] text-muted-foreground italic">Motivo: {p.motivo_renuncia}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aviso para advogado sem procuração */}
        {isAdvogado && !advogadoTemProcuracao && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Você precisa juntar uma <strong>procuração</strong> para se qualificar como advogado(a) de uma das partes antes de realizar qualquer movimentação neste processo.
            </p>
          </div>
        )}
      </div>

      {/* Modal Juntar Procuração */}
      <Dialog open={showProcuracao} onOpenChange={setShowProcuracao}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Juntar Procuração</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-2 block">Selecione a(s) parte(s) que irá representar</label>
              {partesAutor.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Autores</p>
                  <div className="space-y-1">
                    {partesAutor.map((p, i) => {
                      const key = `autor:${p.nome}`;
                      const jaRepresentada = partesJaRepresentadas.includes(key);
                      return (
                        <label key={i} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${procForm.selectedPartes.includes(key) ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20'} ${jaRepresentada ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={procForm.selectedPartes.includes(key)}
                            disabled={jaRepresentada}
                            onChange={() => !jaRepresentada && toggleParteSelection(key)}
                          />
                          <span className="text-xs text-foreground">{p.nome}{p.id_personagem ? ` (ID: ${p.id_personagem})` : ''}</span>
                          {jaRepresentada && <span className="text-[10px] text-muted-foreground ml-auto">Já representado(a)</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {partesReu.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Réus</p>
                  <div className="space-y-1">
                    {partesReu.map((p, i) => {
                      const key = `reu:${p.nome}`;
                      const jaRepresentada = partesJaRepresentadas.includes(key);
                      return (
                        <label key={i} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${procForm.selectedPartes.includes(key) ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20'} ${jaRepresentada ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={procForm.selectedPartes.includes(key)}
                            disabled={jaRepresentada}
                            onChange={() => !jaRepresentada && toggleParteSelection(key)}
                          />
                          <span className="text-xs text-foreground">{p.nome}{p.id_personagem ? ` (ID: ${p.id_personagem})` : ''}</span>
                          {jaRepresentada && <span className="text-[10px] text-muted-foreground ml-auto">Já representado(a)</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {partesAutor.length === 0 && partesReu.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma parte identificada no processo.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Link da procuração (documento)</label>
              <Input
                className="rounded-xl mt-1"
                placeholder="https://..."
                value={procForm.documento_url}
                onChange={(e) => setProcForm({ ...procForm, documento_url: e.target.value })}
              />
            </div>
            <Button className="w-full rounded-xl" onClick={() => juntarProcuracao.mutate()} disabled={juntarProcuracao.isPending || procForm.selectedPartes.length === 0}>
              {juntarProcuracao.isPending ? "Juntando..." : `Juntar Procuração${procForm.selectedPartes.length > 1 ? ` (${procForm.selectedPartes.length} partes)` : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Renúncia */}
      <Dialog open={showRenuncia} onOpenChange={setShowRenuncia}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Renunciar ao Mandato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione a procuração que deseja renunciar, ou renuncie a todas.</p>
            {minhasProcuracoes.length > 1 && (
              <div className="space-y-1">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-destructive/30 bg-destructive/5 cursor-pointer">
                  <input type="radio" name="renuncia" checked={renunciaSelectedId === null} onChange={() => setRenunciaSelectedId(null)} />
                  <span className="text-xs text-foreground font-medium">Renunciar a todas as procurações</span>
                </label>
                {minhasProcuracoes.map((p: any) => {
                  const [lado, ...rest] = (p.parte || "").split(":");
                  const nome = rest.join(":") || (lado === "autor" ? "Autor" : "Réu");
                  return (
                    <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                      <input type="radio" name="renuncia" checked={renunciaSelectedId === p.id} onChange={() => setRenunciaSelectedId(p.id)} />
                      <span className="text-xs text-foreground">{lado === "autor" ? "AUTOR" : "RÉU"} — {nome}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-foreground">Motivo (opcional)</label>
              <Textarea
                className="rounded-xl mt-1"
                placeholder="Informe o motivo da renúncia..."
                value={motivoRenuncia}
                onChange={(e) => setMotivoRenuncia(e.target.value)}
              />
            </div>
            <Button variant="destructive" className="w-full rounded-xl" onClick={() => renunciarProcuracao.mutate()} disabled={renunciarProcuracao.isPending}>
              {renunciarProcuracao.isPending ? "Processando..." : "Confirmar Renúncia"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="timeline" className="rounded-lg text-xs"><History className="h-3 w-3 mr-1" /> Timeline</TabsTrigger>
          <TabsTrigger value="atos" className="rounded-lg text-xs"><Gavel className="h-3 w-3 mr-1" /> Atos Judiciais</TabsTrigger>
          
          <TabsTrigger value="prazos" className="rounded-lg text-xs"><Timer className="h-3 w-3 mr-1" /> Prazos</TabsTrigger>
          <TabsTrigger value="audiencias" className="rounded-lg text-xs"><Calendar className="h-3 w-3 mr-1" /> Audiências</TabsTrigger>
          {(isOficialJustica || isJudicialReadOnly) && <TabsTrigger value="certidoes" className="rounded-lg text-xs"><ScrollText className="h-3 w-3 mr-1" /> Certidões</TabsTrigger>}
          {(isSentenciado || isArquivado) && <TabsTrigger value="apelacoes" className="rounded-lg text-xs"><Scale className="h-3 w-3 mr-1" /> Apelações</TabsTrigger>}
          {(isSentenciado || isArquivado) && <TabsTrigger value="embargos" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Embargos</TabsTrigger>}
        </TabsList>

        {/* TIMELINE — unified view */}
        <TabsContent value="timeline" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {canAddMovimentacao && <AddMovimentacao roles={roles} onAdd={(tipo, desc) => addMovimentacao.mutate({ tipo, descricao: desc })} />}
            {isJudicialReadOnly && <AddAtoCartorio onAdd={(ato) => createAtoCartorio.mutate(ato)} isPending={createAtoCartorio.isPending} />}
          </div>
          {isSentenciado && !prazoApelacaoExpirado && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-4 text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Processo sentenciado. Novas movimentações não são permitidas — recursos de apelação e embargos de declaração podem ser interpostos em até 72 horas.
            </div>
          )}
          {isSentenciado && prazoApelacaoExpirado && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Prazo para recurso expirado (72 horas). O processo será arquivado automaticamente.
            </div>
          )}
          {isArquivado && (
            <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Processo arquivado. Não é possível realizar novas movimentações.
            </div>
          )}
          {!isSentenciado && isInstitucional && !jaInteressado && (
            <div className="bg-muted/50 border border-border rounded-xl p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-institutional" />
              Para movimentar neste processo, é necessário primeiro manifestar-se como interessado na seção acima.
            </div>
          )}
          {(() => {
            // Build unified timeline from all sources
            type TimelineItem = { id: string; date: string; tipo: string; titulo: string; descricao: string; autor?: string; link?: string; badge_color?: string; attachments?: { nome: string; url: string }[] };
            const items: TimelineItem[] = [];

            // Match documents to movimentações by close timestamp & same author
            const usedDocIds = new Set<string>();

            // Types that already have dedicated timeline entries (atos, sentenças, audiências, etc.)
            const duplicatedMovTypes = new Set(["despacho", "sentenca", "audiencia_designada", "mandado_expedido", "intimacao", "certidao_oficial", "procuracao", "juntada", "ato_ordinatorio"]);

            // Movimentações — attach related documents, skip types rendered by dedicated sections
            movimentacoes?.forEach(m => {
              if (duplicatedMovTypes.has(m.tipo)) return;

              const mTime = new Date(m.created_at).getTime();
              const relatedDocs = (documentos || []).filter((d: any) => {
                if (usedDocIds.has(d.id)) return false;
                const dTime = new Date(d.created_at).getTime();
                const sameAuthor = d.autor_id && m.autor_id && d.autor_id === m.autor_id;
                return sameAuthor && Math.abs(dTime - mTime) < 60000; // within 1 minute
              });
              relatedDocs.forEach((d: any) => usedDocIds.add(d.id));

              items.push({
                id: `mov-${m.id}`, date: m.created_at, tipo: m.tipo.replace(/_/g, " "),
                titulo: "", descricao: m.descricao, autor: (m as any).autor_nome || "Sistema",
                badge_color: "bg-secondary text-secondary-foreground",
                attachments: relatedDocs.map((d: any) => ({ nome: d.nome, url: d.arquivo_url })).filter((a: any) => a.url),
              });
            });

            // Atos Judiciais — attach related documents by close timestamp
            atos?.forEach((a: any) => {
              const aTime = new Date(a.created_at).getTime();
              const relatedDocs = (documentos || []).filter((d: any) => {
                if (usedDocIds.has(d.id)) return false;
                const dTime = new Date(d.created_at).getTime();
                return Math.abs(dTime - aTime) < 120000; // within 2 minutes
              });
              relatedDocs.forEach((d: any) => usedDocIds.add(d.id));

              items.push({
                id: `ato-${a.id}`, date: a.created_at, tipo: `ato judicial — ${a.tipo}`,
                titulo: a.titulo, descricao: a.conteudo,
                autor: a.autor_nome || "Juiz de Direito",
                badge_color: "bg-institutional/10 text-institutional",
                attachments: relatedDocs.map((d: any) => ({ nome: d.nome, url: d.arquivo_url })).filter((att: any) => att.url),
              });
            });

            // Documentos (com links) — skip docs already attached to movimentações
            documentos?.forEach((d: any) => {
              if (usedDocIds.has(d.id)) return;
              items.push({
                id: `doc-${d.id}`, date: d.created_at, tipo: `documento — ${d.tipo}`,
                titulo: d.nome, descricao: d.descricao || "",
                link: d.arquivo_url || undefined,
                badge_color: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
              });
            });

            // Audiências
            audiencias?.forEach((a: any) => items.push({
              id: `aud-${a.id}`, date: a.created_at, tipo: `audiência — ${a.tipo}`,
              titulo: `Audiência de ${a.tipo}`,
              descricao: `Data: ${format(new Date(a.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — Local: ${a.local || "Não definido"} — Status: ${a.status}${a.observacoes ? `\nObs: ${a.observacoes}` : ""}`,
              badge_color: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
            }));

            // Prazos
            prazos?.forEach((p: any) => items.push({
              id: `prazo-${p.id}`, date: p.created_at, tipo: `prazo — ${p.tipo}`,
              titulo: p.descricao,
              descricao: `${p.dias_uteis} horas — De ${format(new Date(p.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })} até ${format(new Date(p.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR })} — Status: ${p.status}`,
              badge_color: "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400",
            }));

            // Sentenças
            sentencasProc?.forEach((s: any) => items.push({
              id: `sent-${s.id}`, date: s.created_at, tipo: `sentença — ${s.tipo}`,
              titulo: s.ementa || "Sentença",
              descricao: `Fundamentação: ${s.fundamentacao}\n\nDispositivo: ${s.dispositivo}`,
              autor: "Juiz de Direito",
              badge_color: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400",
            }));

            // Apelações — full detail with all phases
            apelacoesProc?.forEach((ap: any) => {
              const statusLabels: Record<string, string> = {
                interposta: "Interposta", admitida: "Admitida", em_julgamento: "Em Julgamento",
                julgada: "Julgada", inadmitida: "Inadmitida",
              };
              const decisaoLabels: Record<string, string> = {
                mantida: "Sentença Mantida", reformada_parcial: "Reformada Parcialmente",
                reformada_total: "Reformada Totalmente", anulada: "Sentença Anulada",
              };
              // 1. Interposição
              items.push({
                id: `apel-${ap.id}`, date: ap.created_at, tipo: "apelação — interposição",
                titulo: `Recurso de Apelação ${ap.numero_acordao || ""} interposto por ${ap.apelante_nome}`,
                descricao: `Polo: ${ap.apelante_tipo === "reu" ? "Réu" : ap.apelante_tipo === "autor" ? "Autor" : ap.apelante_tipo === "defesa" ? "Defesa" : ap.apelante_tipo === "acusacao" ? "Acusação" : "Ambas as partes"}\n\nFundamentação:\n${ap.fundamentacao}\n\nPedido:\n${ap.pedido}`,
                badge_color: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400",
              });
              // 2. Admissão / Inadmissão
              if (ap.status !== "interposta" && ap.data_distribuicao) {
                items.push({
                  id: `apel-adm-${ap.id}`, date: ap.data_distribuicao, tipo: ap.status === "inadmitida" ? "apelação — inadmitida" : "apelação — admitida",
                  titulo: `Apelação ${ap.numero_acordao || ""} ${ap.status === "inadmitida" ? "inadmitida" : "admitida e distribuída"}`,
                  descricao: ap.status === "inadmitida" ? "Recurso não admitido pelo Tribunal." : "Recurso admitido e distribuído a desembargador relator.",
                  badge_color: ap.status === "inadmitida" ? "bg-destructive/10 text-destructive" : "bg-institutional/10 text-institutional",
                });
              }
              // 3. Julgamento (acórdão)
              if (ap.status === "julgada" && ap.data_julgamento) {
                items.push({
                  id: `apel-julg-${ap.id}`, date: ap.data_julgamento, tipo: "apelação — acórdão",
                  titulo: `Acórdão ${ap.numero_acordao || ""}: ${decisaoLabels[ap.decisao_tipo] || ap.decisao_tipo}`,
                  descricao: `Decisão: ${decisaoLabels[ap.decisao_tipo] || ap.decisao_tipo}\n\nFundamentação do Acórdão:\n${ap.decisao_fundamentacao || "—"}\n\nDispositivo:\n${ap.decisao_dispositivo || "—"}`,
                  badge_color: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400",
                });
              }
            });

            // Embargos de declaração
            embargosProc?.forEach((emb: any) => {
              const tipoLabels: Record<string, string> = { omissao: "Omissão", contradicao: "Contradição", obscuridade: "Obscuridade" };
              const statusLabels: Record<string, string> = { opostos: "Opostos", acolhidos: "Acolhidos", rejeitados: "Rejeitados", parcialmente_acolhidos: "Parcialmente Acolhidos" };
              items.push({
                id: `emb-${emb.id}`, date: emb.created_at, tipo: `embargos de declaração — ${tipoLabels[emb.tipo] || emb.tipo}`,
                titulo: `Embargos de Declaração opostos por ${emb.embargante_nome}`,
                descricao: `Tipo: ${tipoLabels[emb.tipo] || emb.tipo} — Status: ${statusLabels[emb.status] || emb.status}\n\nFundamentação:\n${emb.fundamentacao}\n\nPedido:\n${emb.pedido}${emb.decisao ? `\n\nDecisão:\n${emb.decisao}` : ""}`,
                badge_color: "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400",
              });
            });

            certidoes?.forEach((c: any) => items.push({
              id: `cert-${c.id}`, date: c.created_at, tipo: `certidão — ${c.tipo}`,
              titulo: `Certidão de ${c.tipo}`,
              descricao: c.conteudo,
              autor: c.emitido_por_nome || "Oficial de Justiça",
              badge_color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400",
            }));

            // Intimações
            intimacoesProc?.forEach((intim: any) => {
              const statusLabel: Record<string, string> = { pendente: "Pendente", lida: "Lida", cumprida: "Cumprida", expirada: "Expirada" };
              items.push({
                id: `intim-${intim.id}`, date: intim.created_at, tipo: `intimação — ${intim.tipo}`,
                titulo: `Intimação para ${intim.destinatario_nome}${intim.cargo_intimado ? ` (${intim.cargo_intimado})` : ""}`,
                descricao: `${intim.conteudo}\n\nPrazo: ${intim.prazo_dias} hora(s) — Status: ${statusLabel[intim.status] || intim.status}${intim.data_leitura ? `\nLida em: ${format(new Date(intim.data_leitura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` : ""}`,
                badge_color: "bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400",
              });
            });


            procuracoes?.forEach((p: any) => items.push({
              id: `proc-${p.id}`, date: p.status === "renunciada" && p.renunciada_em ? p.renunciada_em : p.created_at,
              tipo: p.status === "renunciada" ? "renúncia de mandato" : "procuração",
              titulo: p.status === "renunciada" ? `Renúncia — ${p.advogado_nome}` : `Procuração — ${p.advogado_nome}`,
              descricao: p.status === "renunciada"
                ? `${p.advogado_nome} renunciou ao mandato de advogado(a) do(a) ${(p.parte || "").startsWith("autor") ? "AUTOR" : "RÉU"}.${p.motivo_renuncia ? `\nMotivo: ${p.motivo_renuncia}` : ""}`
                : `${p.advogado_nome} juntou procuração qualificando-se como advogado(a) do(a) ${(p.parte || "").startsWith("autor") ? "AUTOR" : "RÉU"}.`,
              link: p.documento_url || undefined,
              badge_color: p.status === "renunciada"
                ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
            }));

            items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            if (!items.length) return <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>;

            return (
              <div className="relative pl-6 border-l-2 border-border space-y-4">
                {items.map((item, idx) => {
                  const numero = items.length - idx; // #1 = mais antiga, #N = mais recente
                  return (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative">
                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-institutional border-2 border-background" />
                    <div className="bg-card rounded-xl p-3 border border-border">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-institutional bg-institutional/10 px-2 py-0.5 rounded-full">#{numero}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${item.badge_color}`}>{item.tipo.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 rounded-lg text-[10px]"
                          title="Baixar movimentação em PDF timbrado"
                          onClick={async () => {
                            const logo64 = await imageToBase64(logoTjsp);
                            generateMovimentacaoPDF({
                              processo: {
                                numero: processo.numero,
                                classe: processo.classe,
                                assunto: processo.assunto,
                                vara: processo.vara,
                                autor_nome: processo.autor_nome,
                                reu_nome: processo.reu_nome,
                              },
                              movimentacao: {
                                tipo: item.tipo,
                                titulo: item.titulo,
                                descricao: item.descricao,
                                autor: item.autor,
                                data: item.date,
                                attachments: item.attachments,
                                link: item.link,
                                numero: numero,
                                total: items.length,
                              },
                              logoBase64: logo64,
                              baixadoPor: profile?.nome_completo || "Usuario nao identificado",
                            });
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" /> PDF
                        </Button>
                      </div>
                      {item.titulo && <p className="text-sm font-semibold text-foreground mb-1">{item.titulo}</p>}
                      <p className="text-sm text-foreground whitespace-pre-wrap">{item.descricao.split(/(https?:\/\/[^\s<>]+)/gi).map((part, i) =>
                        /^https?:\/\//i.test(part) ? (
                          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 inline flex-shrink-0" />{part}
                          </a>
                        ) : part
                      )}</p>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Abrir documento
                        </a>
                      )}
                      {item.attachments && item.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Anexos:</p>
                          {item.attachments.map((att, idx) => (
                            <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mr-3">
                              <ExternalLink className="h-3 w-3" /> {att.nome}
                            </a>
                          ))}
                        </div>
                      )}
                      {item.autor && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                            <PenTool className="h-3 w-3" />
                            Assinado digitalmente por: <span className="font-semibold text-foreground/80">{item.autor}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                  );
                })}
              </div>
            );
          })()}
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
        {(isOficialJustica || isJudicialReadOnly) && (
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

        {/* APELAÇÕES */}
        {(isSentenciado || isArquivado) && (
          <TabsContent value="apelacoes" className="mt-4 space-y-4">
            {/* Botão para interpor apelação */}
            {prazoApelacaoExpirado || isArquivado ? (
              <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Scale className="h-4 w-4" />
                O prazo de 72 horas para interposição de recurso expirou. Não é mais possível apelar.
              </div>
            ) : (isAdvogado || isMP) && sentencasProc?.length && !apelacoesProc?.length ? (
              <Dialog open={showApelacao} onOpenChange={setShowApelacao}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Scale className="h-4 w-4" /> Interpor Apelação</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Interpor Recurso de Apelação</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); interporApelacao.mutate(); }} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Sentença Recorrida</label>
                      <Select value={apelacaoForm.sentenca_id} onValueChange={(v) => setApelacaoForm({ ...apelacaoForm, sentenca_id: v })}>
                        <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Selecione a sentença" /></SelectTrigger>
                        <SelectContent>
                          {sentencasProc?.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.tipo} — {s.ementa || s.dispositivo?.substring(0, 60) || "Sentença"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Polo Apelante</label>
                      <Select value={apelacaoForm.apelante_tipo} onValueChange={(v) => setApelacaoForm({ ...apelacaoForm, apelante_tipo: v })}>
                        <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reu">Réu</SelectItem>
                          <SelectItem value="autor">Autor</SelectItem>
                          <SelectItem value="ambos">Ambas as partes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Fundamentação do Recurso</label>
                      <Textarea value={apelacaoForm.fundamentacao} onChange={(e) => setApelacaoForm({ ...apelacaoForm, fundamentacao: e.target.value })} placeholder="Razões da apelação e fundamentos jurídicos..." rows={6} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Pedido</label>
                      <Textarea value={apelacaoForm.pedido} onChange={(e) => setApelacaoForm({ ...apelacaoForm, pedido: e.target.value })} placeholder="O que se requer ao Tribunal..." rows={4} className="mt-1" />
                    </div>
                    <Button type="submit" disabled={interporApelacao.isPending} className="w-full gap-2">
                      <Scale className="h-4 w-4" /> Interpor Apelação
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}

            {/* Lista de apelações existentes */}
            {!apelacoesProc?.length ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma apelação interposta neste processo.</p>
            ) : (
              <div className="space-y-3">
                {apelacoesProc.map((ap: any) => {
                  const statusCfg: Record<string, { label: string; color: string }> = {
                    interposta: { label: "Interposta", color: "bg-gold/10 text-gold-dark" },
                    admitida: { label: "Admitida", color: "bg-institutional/10 text-institutional" },
                    em_julgamento: { label: "Em Julgamento", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400" },
                    julgada: { label: "Julgada", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
                    inadmitida: { label: "Inadmitida", color: "bg-destructive/10 text-destructive" },
                  };
                  const apCfg = statusCfg[ap.status] || statusCfg.interposta;
                  return (
                    <div key={ap.id} className="bg-card rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Scale className="h-4 w-4 text-institutional" />
                        <span className="font-mono text-sm font-semibold text-institutional">{ap.numero_acordao}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${apCfg.color}`}>{apCfg.label}</span>
                      </div>
                      <p className="text-sm text-foreground">Apelante: {ap.apelante_nome} ({ap.apelante_tipo === "reu" ? "Réu" : ap.apelante_tipo === "autor" ? "Autor" : ap.apelante_tipo === "defesa" ? "Defesa" : ap.apelante_tipo === "acusacao" ? "Acusação" : "Ambas as partes"})</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ap.fundamentacao}</p>
                      {ap.decisao_tipo && (
                        <p className="text-xs font-medium text-foreground mt-2">
                          Decisão: {ap.decisao_tipo === "mantida" ? "Sentença Mantida" : ap.decisao_tipo === "reformada_parcial" ? "Reformada Parcialmente" : ap.decisao_tipo === "reformada_total" ? "Reformada Totalmente" : "Sentença Anulada"}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(ap.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* EMBARGOS DE DECLARAÇÃO */}
        {(isSentenciado || isArquivado) && (
          <TabsContent value="embargos" className="mt-4 space-y-4">
            {/* Botão para opor embargos */}
            {prazoApelacaoExpirado || isArquivado ? (
              <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                O prazo de 72 horas para oposição de embargos expirou.
              </div>
            ) : (isAdvogado || isMP) && sentencasProc?.length ? (
              <Dialog open={showEmbargos} onOpenChange={setShowEmbargos}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><FileText className="h-4 w-4" /> Opor Embargos de Declaração</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Opor Embargos de Declaração</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); oporEmbargos.mutate(); }} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Sentença Embargada</label>
                      <Select value={embargosForm.sentenca_id} onValueChange={(v) => setEmbargosForm({ ...embargosForm, sentenca_id: v })}>
                        <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Selecione a sentença" /></SelectTrigger>
                        <SelectContent>
                          {sentencasProc?.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.tipo} — {s.ementa || s.dispositivo?.substring(0, 60) || "Sentença"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Tipo de Vício</label>
                      <Select value={embargosForm.tipo} onValueChange={(v) => setEmbargosForm({ ...embargosForm, tipo: v })}>
                        <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="omissao">Omissão</SelectItem>
                          <SelectItem value="contradicao">Contradição</SelectItem>
                          <SelectItem value="obscuridade">Obscuridade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Fundamentação</label>
                      <Textarea value={embargosForm.fundamentacao} onChange={(e) => setEmbargosForm({ ...embargosForm, fundamentacao: e.target.value })} placeholder="Indique o ponto omisso, contraditório ou obscuro da sentença..." rows={6} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Pedido</label>
                      <Textarea value={embargosForm.pedido} onChange={(e) => setEmbargosForm({ ...embargosForm, pedido: e.target.value })} placeholder="O que se requer ao Juízo..." rows={4} className="mt-1" />
                    </div>
                    <Button type="submit" disabled={oporEmbargos.isPending} className="w-full gap-2">
                      <FileText className="h-4 w-4" /> Opor Embargos
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}

            {/* Lista de embargos existentes */}
            {!embargosProc?.length ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Nenhum embargo de declaração oposto neste processo.</p>
            ) : (
              <div className="space-y-3">
                {embargosProc.map((emb: any) => {
                  const statusCfg: Record<string, { label: string; color: string }> = {
                    opostos: { label: "Opostos", color: "bg-gold/10 text-gold-dark" },
                    acolhidos: { label: "Acolhidos", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
                    rejeitados: { label: "Rejeitados", color: "bg-destructive/10 text-destructive" },
                    parcialmente_acolhidos: { label: "Parcialmente Acolhidos", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" },
                  };
                  const tipoLabels: Record<string, string> = { omissao: "Omissão", contradicao: "Contradição", obscuridade: "Obscuridade" };
                  const embCfg = statusCfg[emb.status] || statusCfg.opostos;
                  return (
                    <div key={emb.id} className="bg-card rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <FileText className="h-4 w-4 text-institutional" />
                        <span className="text-sm font-semibold text-foreground">Embargos de Declaração</span>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${embCfg.color}`}>{embCfg.label}</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{tipoLabels[emb.tipo] || emb.tipo}</span>
                      </div>
                      <p className="text-sm text-foreground">Embargante: {emb.embargante_nome}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{emb.fundamentacao}</p>
                      {emb.decisao && (
                        <div className="mt-2 bg-secondary/30 rounded-lg p-2">
                          <p className="text-xs font-medium text-foreground">Decisão:</p>
                          <p className="text-xs text-muted-foreground">{emb.decisao}</p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(emb.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                  );
                })}
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

  const isJudicial = roles.some((r) => ["admin", "presidente_tribunal"].includes(r));
  const isMP = roles.includes("ministerio_publico");
  const isAdvogado = roles.includes("advogado");
  const isOficialJustica = roles.includes("oficial_justica");
  const isPolicia = roles.some(r => ["policia_civil", "policia_militar", "policia_federal"].includes(r));
  const isHospital = roles.includes("hospital");

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
  if (isPolicia) {
    tiposPermitidos.push(
      { value: "relatorio_policial", label: "Relatório Policial" },
      { value: "remessa_inquerito", label: "Remessa de Inquérito" },
      { value: "informacao_policial", label: "Informação Policial" },
    );
  }
  if (isHospital) {
    tiposPermitidos.push(
      { value: "laudo_medico", label: "Laudo Médico" },
      { value: "relatorio_hospitalar", label: "Relatório Hospitalar" },
      { value: "atestado_medico", label: "Atestado Médico" },
      { value: "informacao_hospitalar", label: "Informação Hospitalar" },
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
    // Warn if attachment fields have content but weren't added
    if ((novoAnexoNome.trim() || novoAnexoUrl.trim()) && anexos.every(a => a.nome !== novoAnexoNome.trim() || a.url !== novoAnexoUrl.trim())) {
      toast.error("Você preencheu os campos de anexo mas não clicou em adicionar. Clique no botão '+' para anexar ou limpe os campos antes de enviar.");
      return;
    }
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

function AddAtoCartorio({ onAdd, isPending }: { onAdd: (ato: { tipo: string; titulo: string; conteudo: string; anexo_urls?: string[] }) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("juntada");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [anexoUrls, setAnexoUrls] = useState<string[]>([""]);

  const handleAddLink = () => setAnexoUrls(prev => [...prev, ""]);
  const handleRemoveLink = (idx: number) => setAnexoUrls(prev => prev.filter((_, i) => i !== idx));
  const handleChangeLink = (idx: number, value: string) => setAnexoUrls(prev => prev.map((v, i) => i === idx ? value : v));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><FileText className="h-4 w-4 mr-2" /> Atos do Cartório</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ato do Cartório Judicial</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Assinatura: <span className="font-semibold">Escrevente Técnico Judiciário Abel Haus</span></p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const validUrls = anexoUrls.filter(u => u.trim());
          onAdd({ tipo, titulo, conteudo, anexo_urls: validUrls.length > 0 ? validUrls : undefined });
          setOpen(false);
          setTitulo("");
          setConteudo("");
          setAnexoUrls([""]);
        }} className="space-y-3 mt-2">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="juntada">Juntada</SelectItem>
              <SelectItem value="ato_ordinatorio">Ato Ordinatório</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Título (ex: Juntada de petição inicial)" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="rounded-xl" />
          <Textarea placeholder="Conteúdo do ato..." value={conteudo} onChange={(e) => setConteudo(e.target.value)} required rows={6} className="rounded-xl font-mono text-xs" />
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Anexos (links opcionais)</label>
            {anexoUrls.map((url, idx) => (
              <div key={idx} className="flex gap-2">
                <Input placeholder="https://drive.google.com/..." value={url} onChange={(e) => handleChangeLink(idx, e.target.value)} className="rounded-xl flex-1" />
                {anexoUrls.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => handleRemoveLink(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs" onClick={handleAddLink}>
              + Adicionar outro link
            </Button>
          </div>
          <Button type="submit" disabled={isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
            {isPending ? "Registrando..." : "Registrar Ato do Cartório"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

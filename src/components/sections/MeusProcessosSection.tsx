import { useState, useMemo } from "react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { FileText, Search, Eye, Clock, Scale, AlertTriangle, Zap, CheckSquare, Square, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { agendarPrazoAutomatico } from "@/lib/prazosAutomaticos";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-blue-100 text-blue-800" },
  em_andamento: { label: "Em Andamento", color: "bg-yellow-100 text-yellow-800" },
  concluso: { label: "Concluso", color: "bg-purple-100 text-purple-800" },
  sentenciado: { label: "Sentenciado", color: "bg-green-100 text-green-800" },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
  suspenso: { label: "Suspenso", color: "bg-orange-100 text-orange-800" },
};

type ParteEntry = { nome: string; id_personagem?: string };

function parsePartesFromString(value: string): ParteEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [{ nome: value }];
}

function formatPartesShort(value: string): string {
  const partes = parsePartesFromString(value);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].nome;
  return `${partes[0].nome} e outros (${partes.length})`;
}

interface MeusProcessosSectionProps {
  onOpenProcesso?: (id: string) => void;
}

export default function MeusProcessosSection({ onOpenProcesso }: MeusProcessosSectionProps) {
  const { user, profile, roles } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"urgencia" | "recentes">("urgencia");
  const [onlyVencendo, setOnlyVencendo] = useState(false);
  const [onlyPrioritarios, setOnlyPrioritarios] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchTipo, setBatchTipo] = useState("despacho");
  const [batchDesc, setBatchDesc] = useState("");
  const [batchSaving, setBatchSaving] = useState(false);

  const podeLote = roles.some((r) => ["admin", "presidente_tribunal", "ministerio_publico", "advogado"].includes(r));

  const { data: meusProcessos, isLoading } = useQuery({
    queryKey: ["meus-processos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const [directRes, procuracoesRes, interessadosRes] = await Promise.all([
        supabase.from("processos").select("*")
          .or(`advogado_autor_id.eq.${user.id},advogado_reu_id.eq.${user.id},juiz_id.eq.${user.id}`)
          .order("created_at", { ascending: false }),
        supabase.from("procuracoes").select("processo_id").eq("advogado_id", user.id).eq("status", "ativa"),
        supabase.from("interessados_processo").select("processo_id").eq("user_id", user.id),
      ]);
      const directProcessos = directRes.data || [];
      const procProcessoIds = (procuracoesRes.data || []).map(p => p.processo_id);
      const interessadosIds = (interessadosRes.data || []).map(p => p.processo_id);
      const allExtraIds = [...new Set([...procProcessoIds, ...interessadosIds])];
      let allProcessos = directProcessos;
      if (allExtraIds.length > 0) {
        const missingIds = allExtraIds.filter(id => !directProcessos.some(p => p.id === id));
        if (missingIds.length > 0) {
          const { data: extraProcessos } = await supabase.from("processos").select("*").in("id", missingIds);
          if (extraProcessos) allProcessos = [...allProcessos, ...extraProcessos];
        }
      }
      if (profile?.id_personagem) {
        const { data: allProcs } = await supabase.from("processos").select("*").order("created_at", { ascending: false });
        if (allProcs) {
          const idPers = profile.id_personagem;
          const matched = allProcs.filter(p => {
            if (allProcessos.some(ep => ep.id === p.id)) return false;
            const checkField = (field: string) => {
              try {
                const arr = JSON.parse(field);
                if (Array.isArray(arr)) return arr.some((e: any) => e.id_personagem === idPers);
              } catch {}
              return false;
            };
            return checkField(p.autor_nome) || checkField(p.reu_nome);
          });
          allProcessos = [...allProcessos, ...matched];
        }
      }
      const seen = new Set<string>();
      return allProcessos.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    },
    enabled: !!user?.id,
  });

  // Fetch active deadlines for these processes
  const { data: prazosMap } = useQuery({
    queryKey: ["meus-processos-prazos", meusProcessos?.map(p => p.id).join(",")],
    queryFn: async () => {
      const ids = (meusProcessos || []).map(p => p.id);
      if (!ids.length) return {} as Record<string, string>;
      const { data } = await supabase
        .from("prazos_processuais")
        .select("processo_id, data_fim, status")
        .in("processo_id", ids)
        .eq("status", "pendente");
      const map: Record<string, string> = {};
      (data || []).forEach((p) => {
        if (!map[p.processo_id] || new Date(p.data_fim) < new Date(map[p.processo_id])) {
          map[p.processo_id] = p.data_fim;
        }
      });
      return map;
    },
    enabled: !!meusProcessos?.length,
  });

  const processados = useMemo(() => {
    return (meusProcessos || []).map((p) => {
      const prazoFim = prazosMap?.[p.id];
      const horasAte = prazoFim ? differenceInHours(new Date(prazoFim), new Date()) : null;
      // Score menor = mais urgente
      let score = 999999;
      if (p.prioridade) score = -1000;
      if (horasAte !== null) score = Math.min(score, horasAte);
      return { ...p, prazoFim, horasAte, urgenciaScore: score };
    });
  }, [meusProcessos, prazosMap]);

  const filtered = processados.filter((p) => {
    const autorDisplay = formatPartesShort(p.autor_nome);
    const reuDisplay = formatPartesShort(p.reu_nome);
    const matchSearch = !search || p.numero?.toLowerCase().includes(search.toLowerCase()) ||
      p.assunto?.toLowerCase().includes(search.toLowerCase()) ||
      autorDisplay.toLowerCase().includes(search.toLowerCase()) ||
      reuDisplay.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const ordered = [...filtered].sort((a, b) => {
    if (sortBy === "urgencia") return a.urgenciaScore - b.urgenciaScore;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const batchApply = async () => {
    if (!batchDesc.trim() || batchDesc === "<p></p>") {
      toast.error("Digite o texto da movimentação.");
      return;
    }
    setBatchSaving(true);
    const ids = Array.from(selecionados);
    let ok = 0, fail = 0;
    for (const pid of ids) {
      const { error } = await supabase.from("movimentacoes").insert({
        processo_id: pid,
        tipo: batchTipo,
        descricao: batchDesc,
        autor_id: user?.id,
      });
      if (error) fail++;
      else {
        ok++;
        await agendarPrazoAutomatico(pid, batchTipo);
      }
    }
    setBatchSaving(false);
    if (ok) toast.success(`${ok} processo(s) despachado(s) em lote.`);
    if (fail) toast.error(`${fail} falharam (verifique permissões).`);
    setSelecionados(new Set());
    setBatchOpen(false);
    setBatchDesc("");
    qc.invalidateQueries({ queryKey: ["meus-processos"] });
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Meus Processos</h2>
        <p className="text-sm text-muted-foreground">Processos em que você está envolvido como parte, advogado ou representante</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número, assunto, autor ou réu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="rounded-xl w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="rounded-xl w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="urgencia">Urgência (prazo/prioridade)</SelectItem>
            <SelectItem value="recentes">Mais recentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = meusProcessos?.filter((p) => p.status === key).length || 0;
          return (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              className={`p-3 rounded-xl border text-center transition-all ${statusFilter === key ? "border-institutional bg-institutional/5" : "border-border bg-card"}`}>
              <span className="text-lg font-bold text-foreground">{count}</span>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !ordered.length ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Scale className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum processo encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Você não está envolvido em nenhum processo no momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordered.map((p, i) => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.novo;
            const autorShort = formatPartesShort(p.autor_nome);
            const reuShort = formatPartesShort(p.reu_nome);
            const selected = selecionados.has(p.id);
            const urgente = p.horasAte !== null && p.horasAte <= 24;
            const vencido = p.horasAte !== null && p.horasAte < 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onOpenProcesso?.(p.id)}
                className={cn(
                  "bg-card rounded-xl border p-4 hover:border-accent transition-all cursor-pointer",
                  selected ? "border-accent ring-2 ring-accent/30" : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  {podeLote && (
                    <button
                      type="button"
                      onClick={(e) => toggleSelect(p.id, e)}
                      className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-accent"
                      aria-label="Selecionar"
                    >
                      {selected ? <CheckSquare className="h-5 w-5 text-accent" /> : <Square className="h-5 w-5" />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-accent flex-shrink-0" />
                      <span className="font-mono text-sm font-semibold text-foreground">{p.numero}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      {p.prioridade && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium inline-flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" /> Prioritário
                        </span>
                      )}
                      {vencido && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium inline-flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> Prazo vencido
                        </span>
                      )}
                      {!vencido && urgente && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> Vence em {p.horasAte}h
                        </span>
                      )}
                      {p.sigilo === "segredo_justica" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Segredo de Justiça</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-1 font-medium truncate">{p.assunto}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {autorShort} <span className="text-accent">vs</span> {reuShort}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <Eye className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Barra de ações em lote */}
      {selecionados.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-full shadow-lg px-4 py-2 flex items-center gap-3">
          <span className="text-sm font-medium">{selecionados.size} selecionado(s)</span>
          <Button size="sm" onClick={() => setBatchOpen(true)}>Despachar em lote</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Despacho em lote ({selecionados.size} processos)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-3">
            <Select value={batchTipo} onValueChange={setBatchTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="despacho">Despacho</SelectItem>
                <SelectItem value="intimacao">Intimação</SelectItem>
                <SelectItem value="conclusao">Conclusão</SelectItem>
                <SelectItem value="juntada">Juntada</SelectItem>
                <SelectItem value="manifestacao">Manifestação</SelectItem>
              </SelectContent>
            </Select>
            <RichTextEditor
              placeholder="Texto que será aplicado a todos os processos selecionados..."
              value={batchDesc}
              onChange={setBatchDesc}
              minHeight="200px"
              smart
            />
            <p className="text-xs text-muted-foreground">
              O mesmo texto será registrado em cada processo. Prazos automáticos do tipo serão agendados.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBatchOpen(false)} disabled={batchSaving}>Cancelar</Button>
              <Button onClick={batchApply} disabled={batchSaving}>
                {batchSaving ? "Enviando..." : `Aplicar a ${selecionados.size} processo(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

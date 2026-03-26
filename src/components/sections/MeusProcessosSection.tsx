import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { FileText, Search, Eye, ArrowLeft, Clock, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Get processes where user is involved: advogado_autor, advogado_reu, juiz, or via procuracoes
  const { data: meusProcessos, isLoading } = useQuery({
    queryKey: ["meus-processos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch processes where user is directly involved
      const [directRes, procuracoesRes] = await Promise.all([
        supabase.from("processos").select("*")
          .or(`advogado_autor_id.eq.${user.id},advogado_reu_id.eq.${user.id},juiz_id.eq.${user.id}`)
          .order("created_at", { ascending: false }),
        supabase.from("procuracoes").select("processo_id")
          .eq("advogado_id", user.id)
          .eq("status", "ativa"),
      ]);

      const directProcessos = directRes.data || [];
      const procProcessoIds = (procuracoesRes.data || []).map(p => p.processo_id);

      // Also check if user's id_personagem appears in autor_nome or reu_nome
      let allProcessos = directProcessos;

      if (procProcessoIds.length > 0) {
        const missingIds = procProcessoIds.filter(id => !directProcessos.some(p => p.id === id));
        if (missingIds.length > 0) {
          const { data: extraProcessos } = await supabase.from("processos").select("*")
            .in("id", missingIds);
          if (extraProcessos) allProcessos = [...allProcessos, ...extraProcessos];
        }
      }

      // Check by id_personagem in autor_nome/reu_nome JSON
      if (profile?.id_personagem) {
        const { data: allProcs } = await supabase.from("processos").select("*")
          .order("created_at", { ascending: false });
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

      // Sort by created_at desc
      allProcessos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Remove duplicates
      const seen = new Set<string>();
      return allProcessos.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    },
    enabled: !!user?.id,
  });

  const filtered = meusProcessos?.filter((p) => {
    const autorDisplay = formatPartesShort(p.autor_nome);
    const reuDisplay = formatPartesShort(p.reu_nome);
    const matchSearch = !search || p.numero?.toLowerCase().includes(search.toLowerCase()) ||
      p.assunto?.toLowerCase().includes(search.toLowerCase()) ||
      autorDisplay.toLowerCase().includes(search.toLowerCase()) ||
      reuDisplay.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Meus Processos</h2>
        <p className="text-sm text-muted-foreground">Processos em que você está envolvido como parte, advogado ou representante</p>
      </div>

      {/* Filters */}
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
      </div>

      {/* Stats */}
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

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando seus processos...</p>
        </div>
      ) : !filtered?.length ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Scale className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum processo encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Você não está envolvido em nenhum processo no momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p, i) => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.novo;
            const autorShort = formatPartesShort(p.autor_nome);
            const reuShort = formatPartesShort(p.reu_nome);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onOpenProcesso?.(p.id)}
                className="bg-card rounded-xl border border-border p-4 hover:border-accent transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-accent flex-shrink-0" />
                      <span className="font-mono text-sm font-semibold text-foreground">{p.numero}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
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
    </div>
  );
}

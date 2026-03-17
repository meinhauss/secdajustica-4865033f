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
  Plus, Shield, Search, User, ArrowLeft, Clock, Eye, FileText, X,
  AlertTriangle, CheckCircle, Upload, ChevronRight, UserPlus,
  ClipboardList, Send, BookOpen, Mic, Scale
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Status configs ─── */
const BO_STATUS: Record<string, { label: string; color: string }> = {
  registrado: { label: "Registrado", color: "bg-institutional/10 text-institutional" },
  em_analise: { label: "Em Análise", color: "bg-gold/10 text-gold-dark" },
  em_investigacao: { label: "Em Investigação", color: "bg-accent/20 text-accent-foreground" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
};

const IP_STATUS: Record<string, { label: string; color: string }> = {
  instaurado: { label: "Instaurado", color: "bg-institutional/10 text-institutional" },
  em_andamento: { label: "Em Andamento", color: "bg-gold/10 text-gold-dark" },
  diligencias: { label: "Diligências", color: "bg-accent/20 text-accent-foreground" },
  concluso: { label: "Concluso", color: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" },
  remetido_mp: { label: "Remetido ao MP", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400" },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
};

const BO_TIPOS = [
  "furto", "roubo", "agressao", "ameaca", "estelionato",
  "vandalismo", "homicidio", "trafico", "lesao_corporal",
  "invasao_domicilio", "dano", "calúnia", "outros"
];

/* ═══════════════════════════════════════════ */
/*  MAIN                                       */
/* ═══════════════════════════════════════════ */
export default function DelegaciaSection() {
  const { roles } = useAuth();
  const [view, setView] = useState<"list" | "bo-detail" | "ip-detail">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isDelegado = roles.some((r) => ["admin", "delegado"].includes(r));
  const isInvestigador = roles.some((r) => ["admin", "delegado", "investigador"].includes(r));

  if (view === "bo-detail" && selectedId) {
    return <BODetail boId={selectedId} onBack={() => { setView("list"); setSelectedId(null); }} isDelegado={isDelegado} />;
  }
  if (view === "ip-detail" && selectedId) {
    return <InqueritoDetail ipId={selectedId} onBack={() => { setView("list"); setSelectedId(null); }} isDelegado={isDelegado} isInvestigador={isInvestigador} />;
  }

  return (
    <DelegaciaList
      isDelegado={isDelegado}
      isInvestigador={isInvestigador}
      onSelectBO={(id) => { setSelectedId(id); setView("bo-detail"); }}
      onSelectIP={(id) => { setSelectedId(id); setView("ip-detail"); }}
    />
  );
}

/* ═══════════════════════════════════════════ */
/*  LIST VIEW                                  */
/* ═══════════════════════════════════════════ */
function DelegaciaList({ isDelegado, isInvestigador, onSelectBO, onSelectIP }: {
  isDelegado: boolean; isInvestigador: boolean;
  onSelectBO: (id: string) => void; onSelectIP: (id: string) => void;
}) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [openBO, setOpenBO] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ tipo: "furto", descricao: "", local_fato: "", data_fato: "" });

  // Multiple victims & suspects
  const [vitimas, setVitimas] = useState<{ nome: string; id_personagem: string }[]>([]);
  const [suspeitos, setSuspeitos] = useState<{ nome: string; id_personagem: string; observacoes: string }[]>([]);
  const [newVitima, setNewVitima] = useState({ id_personagem: "", nome: "" });
  const [newVitimaLookup, setNewVitimaLookup] = useState<any>(null);
  const [newSuspeito, setNewSuspeito] = useState({ id_personagem: "", nome: "", observacoes: "" });
  const [newSuspeitoLookup, setNewSuspeitoLookup] = useState<any>(null);

  const lookupProfile = async (idP: string) => {
    if (!idP) return null;
    const { data } = await supabase.from("profiles").select("nome_completo, id_personagem").eq("id_personagem", idP).maybeSingle();
    return data;
  };

  const handleVitimaIdChange = async (idP: string) => {
    setNewVitima((v) => ({ ...v, id_personagem: idP }));
    setNewVitimaLookup(null);
    const data = await lookupProfile(idP);
    if (data) {
      setNewVitimaLookup(data);
      setNewVitima((v) => ({ ...v, nome: data.nome_completo }));
    }
  };

  const handleSuspeitoIdChange = async (idP: string) => {
    setNewSuspeito((s) => ({ ...s, id_personagem: idP }));
    setNewSuspeitoLookup(null);
    const data = await lookupProfile(idP);
    if (data) {
      setNewSuspeitoLookup(data);
      setNewSuspeito((s) => ({ ...s, nome: data.nome_completo }));
    }
  };

  const addVitima = () => {
    if (!newVitima.nome) { toast.error("Informe o nome da vítima."); return; }
    setVitimas((v) => [...v, { ...newVitima }]);
    setNewVitima({ id_personagem: "", nome: "" });
    setNewVitimaLookup(null);
  };

  const fillSelfVitima = () => {
    if (profile) {
      setVitimas((v) => [...v, { nome: profile.nome_completo, id_personagem: profile.id_personagem || "" }]);
    }
  };

  const addSuspeito = () => {
    if (!newSuspeito.nome) { toast.error("Informe o nome do suspeito."); return; }
    setSuspeitos((s) => [...s, { ...newSuspeito }]);
    setNewSuspeito({ id_personagem: "", nome: "", observacoes: "" });
    setNewSuspeitoLookup(null);
  };

  const { data: bos } = useQuery({
    queryKey: ["boletins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("boletins_ocorrencia").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inqueritos } = useQuery({
    queryKey: ["inqueritos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inqueritos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isInvestigador,
  });

  const createBO = useMutation({
    mutationFn: async () => {
      if (vitimas.length === 0) throw new Error("Adicione pelo menos uma vítima.");
      const vitimaDisplay = vitimas.map((v) => v.id_personagem ? `${v.nome} (ID: ${v.id_personagem})` : v.nome).join(", ");
      const { data: boData, error } = await supabase.from("boletins_ocorrencia").insert({
        numero: "",
        tipo: form.tipo,
        descricao: form.descricao,
        local_fato: form.local_fato,
        vitima_nome: vitimaDisplay,
        vitima_id: user?.id,
        data_fato: form.data_fato ? new Date(form.data_fato).toISOString() : new Date().toISOString(),
      }).select("id").single();
      if (error) throw error;

      // Insert envolvidos
      const envolvidos = [
        ...vitimas.map((v) => ({ bo_id: boData.id, nome: v.nome, id_personagem: v.id_personagem || null, tipo: "vitima" as const })),
        ...suspeitos.map((s) => ({ bo_id: boData.id, nome: s.nome, id_personagem: s.id_personagem || null, tipo: "suspeito" as const, observacoes: s.observacoes || null })),
      ];
      if (envolvidos.length > 0) {
        const { error: envErr } = await supabase.from("envolvidos_bo").insert(envolvidos);
        if (envErr) throw envErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletins"] });
      setOpenBO(false);
      setForm({ tipo: "furto", descricao: "", local_fato: "", data_fato: "" });
      setVitimas([]); setSuspeitos([]);
      toast.success("Boletim de Ocorrência registrado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredBOs = bos?.filter((b) =>
    b.numero?.toLowerCase().includes(search.toLowerCase()) ||
    b.vitima_nome?.toLowerCase().includes(search.toLowerCase()) ||
    b.tipo?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredIPs = inqueritos?.filter((ip: any) =>
    ip.numero?.toLowerCase().includes(search.toLowerCase()) ||
    ip.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const boStats = {
    total: bos?.length || 0,
    pendentes: bos?.filter((b) => b.status === "registrado").length || 0,
    investigando: bos?.filter((b) => b.status === "em_investigacao").length || 0,
  };
  const ipStats = {
    total: inqueritos?.length || 0,
    andamento: inqueritos?.filter((ip: any) => ip.status === "em_andamento").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Delegacia Virtual</h2>
          <p className="text-sm text-muted-foreground">Sistema Policial Integrado — Polícia Civil</p>
        </div>
        <Dialog open={openBO} onOpenChange={setOpenBO}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Plus className="h-4 w-4 mr-2" /> Registrar B.O.
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Registrar Boletim de Ocorrência</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createBO.mutate(); }} className="space-y-4 mt-4">
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Tipo de Ocorrência" /></SelectTrigger>
                <SelectContent>
                  {BO_TIPOS.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* VÍTIMAS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Vítimas</label>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={fillSelfVitima}>Eu sou a vítima</Button>
                </div>
                {vitimas.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/5 border border-gold/20 text-xs">
                    <User className="h-3 w-3 text-gold-dark flex-shrink-0" />
                    <span className="text-foreground font-medium flex-1">{v.nome} {v.id_personagem && <span className="text-muted-foreground">(ID: {v.id_personagem})</span>}</span>
                    <button type="button" onClick={() => setVitimas((vs) => vs.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="ID do Personagem" value={newVitima.id_personagem} onChange={(e) => handleVitimaIdChange(e.target.value)} className="rounded-xl pl-10 h-9 text-xs" />
                  </div>
                  <Input placeholder="Nome" value={newVitima.nome} onChange={(e) => setNewVitima((v) => ({ ...v, nome: e.target.value }))} className="rounded-xl h-9 text-xs flex-1" readOnly={!!newVitimaLookup} />
                  <Button type="button" variant="outline" size="sm" className="rounded-xl h-9" onClick={addVitima}><Plus className="h-3 w-3" /></Button>
                </div>
                {newVitimaLookup && (
                  <p className="text-[10px] text-green-600 px-1">✓ {newVitimaLookup.nome_completo}</p>
                )}
              </div>

              {/* SUSPEITOS */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Suspeitos (opcional)</label>
                {suspeitos.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs">
                    <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                    <span className="text-foreground font-medium flex-1">{s.nome} {s.id_personagem && <span className="text-muted-foreground">(ID: {s.id_personagem})</span>}</span>
                    {s.observacoes && <span className="text-muted-foreground">— {s.observacoes}</span>}
                    <button type="button" onClick={() => setSuspeitos((ss) => ss.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="ID do Personagem" value={newSuspeito.id_personagem} onChange={(e) => handleSuspeitoIdChange(e.target.value)} className="rounded-xl pl-10 h-9 text-xs" />
                  </div>
                  <Input placeholder="Nome" value={newSuspeito.nome} onChange={(e) => setNewSuspeito((s) => ({ ...s, nome: e.target.value }))} className="rounded-xl h-9 text-xs flex-1" readOnly={!!newSuspeitoLookup} />
                  <Button type="button" variant="outline" size="sm" className="rounded-xl h-9" onClick={addSuspeito}><Plus className="h-3 w-3" /></Button>
                </div>
                <Input placeholder="Observações do suspeito (ex: descrição física)" value={newSuspeito.observacoes} onChange={(e) => setNewSuspeito((s) => ({ ...s, observacoes: e.target.value }))} className="rounded-xl h-9 text-xs" />
                {newSuspeitoLookup && (
                  <p className="text-[10px] text-green-600 px-1">✓ {newSuspeitoLookup.nome_completo}</p>
                )}
              </div>

              <Input type="datetime-local" value={form.data_fato} onChange={(e) => setForm({ ...form, data_fato: e.target.value })} className="rounded-xl" />
              <Input placeholder="Local do Fato" value={form.local_fato} onChange={(e) => setForm({ ...form, local_fato: e.target.value })} className="rounded-xl" />
              <Textarea placeholder="Descreva detalhadamente os fatos ocorridos..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required rows={5} className="rounded-xl" />
              <Button type="submit" disabled={createBO.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                {createBO.isPending ? "Registrando..." : "Registrar Ocorrência"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="B.O.s Registrados" value={boStats.total} icon={Shield} />
        <StatCard label="Pendentes" value={boStats.pendentes} icon={Clock} />
        <StatCard label="Em Investigação" value={boStats.investigando} icon={Search} />
        {isInvestigador && <StatCard label="Inquéritos" value={ipStats.total} icon={FileText} />}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por número, vítima, tipo ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      <Tabs defaultValue="boletins" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 h-auto gap-1">
          <TabsTrigger value="boletins" className="rounded-lg text-xs"><Shield className="h-3 w-3 mr-1" /> Boletins ({boStats.total})</TabsTrigger>
          {isInvestigador && <TabsTrigger value="inqueritos" className="rounded-lg text-xs"><FileText className="h-3 w-3 mr-1" /> Inquéritos ({ipStats.total})</TabsTrigger>}
        </TabsList>

        {/* B.O. LIST */}
        <TabsContent value="boletins" className="mt-4">
          {!filteredBOs?.length ? (
            <div className="text-center py-12 text-muted-foreground"><Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />Nenhum boletim registrado.</div>
          ) : (
            <div className="space-y-2">
              {filteredBOs.map((bo, i) => {
                const cfg = BO_STATUS[bo.status] || BO_STATUS.registrado;
                return (
                  <motion.div key={bo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => onSelectBO(bo.id)}
                    className="bg-card rounded-xl p-4 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-institutional">{bo.numero}</span>
                          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {bo.tipo?.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">Vítima: {bo.vitima_nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{bo.descricao}</p>
                        {bo.local_fato && <p className="text-xs text-muted-foreground">📍 {bo.local_fato}</p>}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* INQUÉRITOS LIST */}
        {isInvestigador && (
          <TabsContent value="inqueritos" className="mt-4">
            {!filteredIPs?.length ? (
              <div className="text-center py-12 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />Nenhum inquérito registrado.</div>
            ) : (
              <div className="space-y-2">
                {filteredIPs.map((ip: any, i: number) => {
                  const cfg = IP_STATUS[ip.status] || IP_STATUS.instaurado;
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
                            {ip.remetido_mp && <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400">MP</span>}
                          </div>
                          <p className="text-sm text-foreground mt-1 line-clamp-1">{ip.descricao}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
                      </div>
                    </motion.div>
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
/*  B.O. DETAIL                                */
/* ═══════════════════════════════════════════ */
function BODetail({ boId, onBack, isDelegado }: { boId: string; onBack: () => void; isDelegado: boolean }) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: bo } = useQuery({
    queryKey: ["bo", boId],
    queryFn: async () => {
      const { data, error } = await supabase.from("boletins_ocorrencia").select("*").eq("id", boId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: envolvidos } = useQuery({
    queryKey: ["envolvidos-bo", boId],
    queryFn: async () => {
      const { data, error } = await supabase.from("envolvidos_bo").select("*").eq("bo_id", boId).order("tipo").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("boletins_ocorrencia").update({ status }).eq("id", boId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bo", boId] });
      queryClient.invalidateQueries({ queryKey: ["boletins"] });
      toast.success("Status atualizado!");
    },
  });

  const instaurarInquerito = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inqueritos").insert({
        numero: "",
        bo_id: boId,
        delegado_id: user?.id,
        descricao: `Inquérito instaurado a partir do B.O. ${bo?.numero}. ${bo?.descricao || ""}`,
      });
      if (error) throw error;
      await supabase.from("boletins_ocorrencia").update({ status: "em_investigacao", delegado_id: user?.id }).eq("id", boId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bo", boId] });
      queryClient.invalidateQueries({ queryKey: ["boletins"] });
      queryClient.invalidateQueries({ queryKey: ["inqueritos"] });
      toast.success("Inquérito policial instaurado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!bo) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const cfg = BO_STATUS[bo.status] || BO_STATUS.registrado;
  const vitimasBO = envolvidos?.filter((e: any) => e.tipo === "vitima") || [];
  const suspeitosBO = envolvidos?.filter((e: any) => e.tipo === "suspeito") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-foreground">{bo.numero}</h2>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">Boletim de Ocorrência — {bo.tipo?.replace("_", " ")}</p>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <InfoCard label="Tipo" value={bo.tipo?.replace("_", " ") || "—"} />
        <InfoCard label="Local" value={bo.local_fato || "Não informado"} />
        <InfoCard label="Data do Fato" value={bo.data_fato ? format(new Date(bo.data_fato), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"} />
      </div>

      {/* Vítimas */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-gold-dark" /> Vítimas ({vitimasBO.length})
        </h3>
        {vitimasBO.length > 0 ? (
          <div className="space-y-2">
            {vitimasBO.map((v: any) => (
              <div key={v.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/5 border border-gold/20 text-sm">
                <User className="h-4 w-4 text-gold-dark flex-shrink-0" />
                <span className="font-medium text-foreground">{v.nome}</span>
                {v.id_personagem && <span className="text-xs text-muted-foreground">(ID: {v.id_personagem})</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{bo.vitima_nome}</p>
        )}
      </div>

      {/* Suspeitos */}
      {suspeitosBO.length > 0 && (
        <div className="bg-card rounded-xl p-5 border border-border">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Suspeitos ({suspeitosBO.length})
          </h3>
          <div className="space-y-2">
            {suspeitosBO.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <span className="font-medium text-foreground">{s.nome}</span>
                {s.id_personagem && <span className="text-xs text-muted-foreground">(ID: {s.id_personagem})</span>}
                {s.observacoes && <span className="text-xs text-muted-foreground ml-auto">— {s.observacoes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Descrição */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="font-display text-sm font-semibold text-foreground mb-2">Descrição dos Fatos</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bo.descricao}</p>
      </div>

      {/* Delegado Actions */}
      {isDelegado && (
        <div className="bg-card rounded-xl p-5 border border-border space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Ações do Delegado</h3>
          <div className="flex flex-wrap gap-2">
            <Select value={bo.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="rounded-xl w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BO_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {bo.status !== "em_investigacao" && bo.status !== "concluido" && bo.status !== "arquivado" && (
              <Button onClick={() => instaurarInquerito.mutate()} disabled={instaurarInquerito.isPending}
                className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
                <FileText className="h-4 w-4 mr-2" /> Instaurar Inquérito
              </Button>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">Registrado em {format(new Date(bo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  INQUÉRITO DETAIL                           */
/* ═══════════════════════════════════════════ */
function InqueritoDetail({ ipId, onBack, isDelegado, isInvestigador }: {
  ipId: string; onBack: () => void; isDelegado: boolean; isInvestigador: boolean;
}) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: ip } = useQuery({
    queryKey: ["inquerito", ipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("inqueritos").select("*").eq("id", ipId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: envolvidos } = useQuery({
    queryKey: ["envolvidos", ipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("envolvidos_inquerito").select("*").eq("inquerito_id", ipId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: diligencias } = useQuery({
    queryKey: ["diligencias", ipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("diligencias").select("*").eq("inquerito_id", ipId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: oitivas } = useQuery({
    queryKey: ["oitivas", ipId],
    queryFn: async () => {
      const { data, error } = await supabase.from("oitivas").select("*").eq("inquerito_id", ipId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  /* Mutations */
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("inqueritos").update({ status }).eq("id", ipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquerito", ipId] });
      toast.success("Status atualizado!");
    },
  });

  const addEnvolvido = useMutation({
    mutationFn: async (env: { nome: string; id_personagem: string; tipo: string; qualificacao: string }) => {
      const { error } = await supabase.from("envolvidos_inquerito").insert({ inquerito_id: ipId, ...env });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envolvidos", ipId] });
      toast.success("Envolvido cadastrado!");
    },
  });

  const addDiligencia = useMutation({
    mutationFn: async (d: { tipo: string; descricao: string }) => {
      const { error } = await supabase.from("diligencias").insert({
        inquerito_id: ipId, ...d, responsavel_id: user?.id, responsavel_nome: profile?.nome_completo || "Sistema",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diligencias", ipId] });
      toast.success("Diligência registrada!");
    },
  });

  const updateDiligencia = useMutation({
    mutationFn: async ({ id, status, resultado }: { id: string; status: string; resultado: string }) => {
      const { error } = await supabase.from("diligencias").update({ status, resultado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diligencias", ipId] });
      toast.success("Diligência atualizada!");
    },
  });

  const addOitiva = useMutation({
    mutationFn: async (o: { nome_depoente: string; tipo: string; conteudo: string }) => {
      const { error } = await supabase.from("oitivas").insert({
        inquerito_id: ipId, ...o, registrado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oitivas", ipId] });
      toast.success("Oitiva registrada!");
    },
  });

  const remeterMP = useMutation({
    mutationFn: async (relatorio: string) => {
      const { error } = await supabase.from("inqueritos").update({
        status: "remetido_mp", remetido_mp: true, relatorio_final: relatorio, data_conclusao: new Date().toISOString(),
      }).eq("id", ipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquerito", ipId] });
      queryClient.invalidateQueries({ queryKey: ["inqueritos"] });
      toast.success("Inquérito remetido ao Ministério Público!");
    },
  });

  if (!ip) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const cfg = IP_STATUS[ip.status] || IP_STATUS.instaurado;

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
          <p className="text-sm text-muted-foreground">Inquérito Policial</p>
        </div>
        {isDelegado && !ip.remetido_mp && (
          <Select value={ip.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="rounded-xl w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(IP_STATUS).filter(([k]) => k !== "remetido_mp").map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Descrição */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ip.descricao}</p>
        <p className="text-[10px] text-muted-foreground mt-2">Instaurado em {format(new Date(ip.data_instauracao), "dd/MM/yyyy", { locale: ptBR })}</p>
      </div>

      <Tabs defaultValue="envolvidos" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary/50 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="envolvidos" className="rounded-lg text-xs"><UserPlus className="h-3 w-3 mr-1" /> Envolvidos ({envolvidos?.length || 0})</TabsTrigger>
          <TabsTrigger value="diligencias" className="rounded-lg text-xs"><ClipboardList className="h-3 w-3 mr-1" /> Diligências ({diligencias?.length || 0})</TabsTrigger>
          <TabsTrigger value="oitivas" className="rounded-lg text-xs"><Mic className="h-3 w-3 mr-1" /> Oitivas ({oitivas?.length || 0})</TabsTrigger>
          {isDelegado && <TabsTrigger value="remessa" className="rounded-lg text-xs"><Send className="h-3 w-3 mr-1" /> Remessa ao MP</TabsTrigger>}
        </TabsList>

        {/* ENVOLVIDOS */}
        <TabsContent value="envolvidos" className="mt-4 space-y-4">
          {isInvestigador && <AddEnvolvido onAdd={(e) => addEnvolvido.mutate(e)} />}
          {!envolvidos?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum envolvido cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {envolvidos.map((e: any) => (
                <div key={e.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                  <User className="h-5 w-5 text-institutional flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{e.nome} {e.id_personagem && <span className="text-muted-foreground">(ID: {e.id_personagem})</span>}</p>
                    <p className="text-[10px] text-muted-foreground">{e.tipo} {e.qualificacao && `— ${e.qualificacao}`}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                    e.tipo === "investigado" ? "bg-destructive/10 text-destructive" :
                    e.tipo === "vitima" ? "bg-gold/10 text-gold-dark" :
                    "bg-secondary text-secondary-foreground"
                  }`}>{e.tipo}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DILIGÊNCIAS */}
        <TabsContent value="diligencias" className="mt-4 space-y-4">
          {isInvestigador && <AddDiligencia onAdd={(d) => addDiligencia.mutate(d)} />}
          {!diligencias?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma diligência registrada.</p>
          ) : (
            <div className="space-y-2">
              {diligencias.map((d: any) => (
                <DiligenciaCard key={d.id} diligencia={d} isInvestigador={isInvestigador} onUpdate={(s, r) => updateDiligencia.mutate({ id: d.id, status: s, resultado: r })} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* OITIVAS */}
        <TabsContent value="oitivas" className="mt-4 space-y-4">
          {isInvestigador && <AddOitiva onAdd={(o) => addOitiva.mutate(o)} />}
          {!oitivas?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma oitiva registrada.</p>
          ) : (
            <div className="space-y-3">
              {oitivas.map((o: any) => (
                <div key={o.id} className="bg-card rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="h-4 w-4 text-institutional" />
                    <span className="text-sm font-semibold text-foreground">{o.nome_depoente}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{o.tipo}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-secondary/30 rounded-lg p-3 max-h-48 overflow-y-auto">{o.conteudo}</pre>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REMESSA AO MP */}
        {isDelegado && (
          <TabsContent value="remessa" className="mt-4">
            <RemessaMP ip={ip} onRemeter={(r) => remeterMP.mutate(r)} isPending={remeterMP.isPending} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  SUB-COMPONENTS                             */
/* ═══════════════════════════════════════════ */

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-institutional">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-institutional" />
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function AddEnvolvido({ onAdd }: { onAdd: (e: any) => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [idP, setIdP] = useState("");
  const [tipo, setTipo] = useState("investigado");
  const [qual, setQual] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" className="rounded-xl"><UserPlus className="h-4 w-4 mr-2" /> Cadastrar Envolvido</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar Envolvido</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ nome, id_personagem: idP, tipo, qualificacao: qual }); setOpen(false); setNome(""); setIdP(""); setQual(""); }} className="space-y-3 mt-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="investigado">Investigado</SelectItem>
              <SelectItem value="vitima">Vítima</SelectItem>
              <SelectItem value="testemunha">Testemunha</SelectItem>
              <SelectItem value="informante">Informante</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="ID do Personagem" value={idP} onChange={(e) => setIdP(e.target.value)} className="rounded-xl" />
          <Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required className="rounded-xl" />
          <Input placeholder="Qualificação (ex: suspeito principal)" value={qual} onChange={(e) => setQual(e.target.value)} className="rounded-xl" />
          <Button type="submit" className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">Cadastrar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddDiligencia({ onAdd }: { onAdd: (d: any) => void }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("investigacao");
  const [desc, setDesc] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" className="rounded-xl"><ClipboardList className="h-4 w-4 mr-2" /> Nova Diligência</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Diligência</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ tipo, descricao: desc }); setOpen(false); setDesc(""); }} className="space-y-3 mt-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="investigacao">Investigação de Campo</SelectItem>
              <SelectItem value="pericia">Perícia</SelectItem>
              <SelectItem value="busca_apreensao">Busca e Apreensão</SelectItem>
              <SelectItem value="interceptacao">Interceptação</SelectItem>
              <SelectItem value="analise_documental">Análise Documental</SelectItem>
              <SelectItem value="reconhecimento">Reconhecimento</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Descrição da diligência..." value={desc} onChange={(e) => setDesc(e.target.value)} required className="rounded-xl" />
          <Button type="submit" className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">Registrar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DiligenciaCard({ diligencia: d, isInvestigador, onUpdate }: { diligencia: any; isInvestigador: boolean; onUpdate: (s: string, r: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [resultado, setResultado] = useState(d.resultado || "");
  const [status, setStatus] = useState(d.status);

  const statusColor = d.status === "concluida" ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" :
    d.status === "em_andamento" ? "bg-gold/10 text-gold-dark" : "bg-secondary text-secondary-foreground";

  return (
    <div className="bg-card rounded-xl p-3 border border-border">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="h-4 w-4 text-institutional" />
        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{d.tipo?.replace("_", " ")}</span>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{d.status?.replace("_", " ")}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{d.responsavel_nome}</span>
      </div>
      <p className="text-sm text-foreground">{d.descricao}</p>
      {d.resultado && <p className="text-xs text-muted-foreground mt-1 bg-secondary/30 rounded-lg p-2">{d.resultado}</p>}
      {isInvestigador && d.status !== "concluida" && (
        editing ? (
          <div className="mt-2 space-y-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Resultado..." value={resultado} onChange={(e) => setResultado(e.target.value)} rows={2} className="rounded-xl text-xs" />
            <div className="flex gap-2">
              <Button size="sm" className="rounded-lg text-xs bg-institutional text-gold-light" onClick={() => { onUpdate(status, resultado); setEditing(false); }}>Salvar</Button>
              <Button size="sm" variant="ghost" className="rounded-lg text-xs" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="mt-1 rounded-lg text-xs" onClick={() => setEditing(true)}>Atualizar</Button>
        )
      )}
    </div>
  );
}

function AddOitiva({ onAdd }: { onAdd: (o: any) => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("testemunha");
  const [conteudo, setConteudo] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" className="rounded-xl"><Mic className="h-4 w-4 mr-2" /> Registrar Oitiva</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Registrar Oitiva</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onAdd({ nome_depoente: nome, tipo, conteudo }); setOpen(false); setNome(""); setConteudo(""); }} className="space-y-3 mt-3">
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="investigado">Interrogatório (Investigado)</SelectItem>
              <SelectItem value="vitima">Depoimento (Vítima)</SelectItem>
              <SelectItem value="testemunha">Testemunho</SelectItem>
              <SelectItem value="informante">Informante</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Nome do depoente" value={nome} onChange={(e) => setNome(e.target.value)} required className="rounded-xl" />
          <Textarea placeholder="Conteúdo do depoimento..." value={conteudo} onChange={(e) => setConteudo(e.target.value)} required rows={8} className="rounded-xl font-mono text-xs" />
          <Button type="submit" className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">Registrar Oitiva</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemessaMP({ ip, onRemeter, isPending }: { ip: any; onRemeter: (r: string) => void; isPending: boolean }) {
  const [relatorio, setRelatorio] = useState(ip.relatorio_final || "");

  if (ip.remetido_mp) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border text-center space-y-3">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
        <h3 className="font-display text-lg font-semibold text-foreground">Inquérito Remetido ao MP</h3>
        <p className="text-sm text-muted-foreground">Data: {ip.data_conclusao ? format(new Date(ip.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
        {ip.relatorio_final && (
          <div className="text-left mt-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Relatório Final</h4>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-secondary/30 rounded-lg p-4">{ip.relatorio_final}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-5 border border-border space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-institutional" />
        <h3 className="font-display text-sm font-semibold text-foreground">Remessa ao Ministério Público</h3>
      </div>
      <p className="text-xs text-muted-foreground">Elabore o relatório conclusivo e remeta o inquérito ao Ministério Público para análise e eventual oferecimento de denúncia.</p>
      <Textarea placeholder="Relatório conclusivo do inquérito policial..." value={relatorio} onChange={(e) => setRelatorio(e.target.value)} rows={10} className="rounded-xl font-mono text-xs" />
      <Button onClick={() => onRemeter(relatorio)} disabled={isPending || !relatorio.trim()}
        className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
        <Send className="h-4 w-4 mr-2" /> {isPending ? "Remetendo..." : "Remeter ao Ministério Público"}
      </Button>
    </div>
  );
}

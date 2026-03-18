import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Shield, Gavel, Scale, Search as SearchIcon, Briefcase,
  UserCheck, ChevronDown, ChevronRight, Clock, Plus, Trash2, History, Star, BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Role hierarchy definition
const ROLE_HIERARCHY = [
  {
    level: 1,
    role: "admin",
    label: "Administrador Geral",
    icon: Crown,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    description: "Acesso total ao sistema. Gerenciamento de usuários, cargos, permissões, logs, estatísticas e configurações.",
    permissions: ["all"],
  },
  {
    level: 2,
    role: "presidente_tribunal",
    label: "Presidente do Tribunal",
    icon: Crown,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    description: "Gestão administrativa do Poder Judiciário, diretrizes institucionais, produtividade e recursos especiais.",
    permissions: ["ver_processos", "gerir_magistrados", "estatisticas", "recursos_especiais", "diretrizes"],
  },
  {
    level: 3,
    role: "desembargador",
    label: "Desembargador",
    icon: Gavel,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Processos em grau recursal, decisões colegiadas e supervisão funcional.",
    permissions: ["ver_processos", "julgar_recursos", "decisoes_colegiadas", "supervisao"],
  },
  {
    level: 4,
    role: "magistrado",
    label: "Juiz de Direito",
    icon: Gavel,
    color: "text-institutional",
    bgColor: "bg-institutional/10",
    description: "Despachar, designar audiências, expedir mandados, proferir sentenças e determinar diligências.",
    permissions: ["ver_processos", "despachar", "audiencias", "mandados", "sentencas", "diligencias"],
  },
  {
    level: 5,
    role: "procurador_geral",
    label: "Procurador-Geral de Justiça",
    icon: Scale,
    color: "text-violet-600",
    bgColor: "bg-violet-600/10",
    description: "Chefe do Ministério Público. Responsável por concursos, nomeações e supervisão dos promotores.",
    permissions: ["ver_inqueritos", "denuncias", "arquivamentos", "pareceres", "concursos_mp", "supervisao_mp", "nomeacoes_mp"],
  },
  {
    level: 6,
    role: "ministerio_publico",
    label: "Promotor de Justiça",
    icon: Scale,
    color: "text-emerald-600",
    bgColor: "bg-emerald-600/10",
    description: "Inquéritos policiais, denúncias, diligências, arquivamentos, pareceres e atuação em audiências.",
    permissions: ["ver_inqueritos", "denuncias", "diligencias", "arquivamentos", "pareceres", "audiencias"],
  },
  {
    level: 7,
    role: "delegado",
    label: "Delegado de Polícia",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    description: "Instauração de inquéritos, gestão de provas, relatórios e remessa ao MP.",
    permissions: ["inqueritos", "provas", "relatorios", "remessa_mp", "mandados_judiciais"],
  },
  {
    level: 7,
    role: "investigador",
    label: "Investigador",
    icon: SearchIcon,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    description: "Módulo policial limitado: relatórios, provas, antecedentes e acompanhamento sob supervisão.",
    permissions: ["relatorios", "provas", "antecedentes", "acompanhamento_investigacoes"],
  },
  {
    level: 8,
    role: "oficial_justica",
    label: "Oficial de Justiça",
    icon: BadgeCheck,
    color: "text-sky-500",
    bgColor: "bg-sky-500/10",
    description: "Mandados, ordens judiciais, cumprimento, certificações digitais e histórico de diligências.",
    permissions: ["mandados", "ordens_judiciais", "cumprimento", "certificacoes", "diligencias"],
  },
  {
    level: 9,
    role: "presidente_oab",
    label: "Presidente da OAB",
    icon: Star,
    color: "text-gold",
    bgColor: "bg-gold/10",
    description: "Gestão da advocacia, aprovação de cadastros, fiscalização ética e sanções administrativas.",
    permissions: ["gerir_advogados", "aprovacao_cadastros", "fiscalizacao", "sancoes", "concursos"],
  },
  {
    level: 10,
    role: "advogado",
    label: "Advogado",
    icon: Briefcase,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    description: "Portal da advocacia, processos habilitados, petições, consulta pública e honorários.",
    permissions: ["ver_processos_habilitados", "peticoes", "consulta_publica", "honorarios"],
  },
  {
    level: 11,
    role: "cidadao",
    label: "Cidadão",
    icon: UserCheck,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    description: "Consulta pública de processos, acompanhamento e notificações.",
    permissions: ["consulta_publica", "acompanhamento", "notificacoes"],
  },
];

const PERMISSION_LABELS: Record<string, string> = {
  all: "Acesso Total",
  ver_processos: "Visualizar Processos",
  gerir_magistrados: "Gerir Magistrados",
  estatisticas: "Estatísticas Institucionais",
  recursos_especiais: "Recursos Especiais",
  diretrizes: "Diretrizes Institucionais",
  julgar_recursos: "Julgar Recursos",
  decisoes_colegiadas: "Decisões Colegiadas",
  supervisao: "Supervisão Funcional",
  despachar: "Despachar",
  audiencias: "Audiências",
  mandados: "Mandados",
  sentencas: "Sentenças",
  diligencias: "Diligências",
  ver_inqueritos: "Visualizar Inquéritos",
  denuncias: "Denúncias",
  arquivamentos: "Arquivamentos",
  pareceres: "Pareceres",
  
  inqueritos: "Instaurar Inquéritos",
  provas: "Gestão de Provas",
  relatorios: "Relatórios",
  remessa_mp: "Remessa ao MP",
  mandados_judiciais: "Solicitar Mandados",
  antecedentes: "Consulta Antecedentes",
  acompanhamento_investigacoes: "Acompanhar Investigações",
  ordens_judiciais: "Ordens Judiciais",
  cumprimento: "Cumprimento",
  certificacoes: "Certificações Digitais",
  gerir_advogados: "Gerir Advogados",
  aprovacao_cadastros: "Aprovar Cadastros",
  fiscalizacao: "Fiscalização Ética",
  sancoes: "Sanções Administrativas",
  concursos: "Concursos",
  ver_processos_habilitados: "Processos Habilitados",
  peticoes: "Petições",
  consulta_publica: "Consulta Pública",
  honorarios: "Honorários",
  
  acompanhamento: "Acompanhamento",
  notificacoes: "Notificações",
};

export default function CargosSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [assignObs, setAssignObs] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("nome_completo");
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: cargoHistory } = useQuery({
    queryKey: ["cargo-historico"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cargo_historico").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role, obs }: { userId: string; role: string; obs: string }) => {
      // Check if user already has this role
      const existing = allRoles?.find((r) => r.user_id === userId && r.role === role);
      if (existing) throw new Error("Usuário já possui este cargo.");

      // Insert role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: role as any,
      });
      if (roleError) throw roleError;

      // Record in history
      const { error: histError } = await supabase.from("cargo_historico").insert({
        user_id: userId,
        role: role as any,
        tipo: "nomeacao",
        nomeado_por: user?.id,
        observacoes: obs || null,
      });
      if (histError) throw histError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      queryClient.invalidateQueries({ queryKey: ["cargo-historico"] });
      toast.success("Cargo atribuído com sucesso!");
      setAssignDialogOpen(false);
      setAssignUserId("");
      setAssignRole("");
      setAssignObs("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atribuir cargo"),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ roleId, userId, role }: { roleId: string; userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;

      // Record exoneration in history
      await supabase.from("cargo_historico").insert({
        user_id: userId,
        role: role as any,
        tipo: "exoneracao",
        nomeado_por: user?.id,
        observacoes: "Exoneração do cargo",
      });

      // Close previous history entry
      const { data: openEntries } = await supabase
        .from("cargo_historico")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role as any)
        .eq("tipo", "nomeacao")
        .is("data_fim", null);

      if (openEntries?.length) {
        await supabase
          .from("cargo_historico")
          .update({ data_fim: new Date().toISOString() })
          .eq("id", openEntries[0].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      queryClient.invalidateQueries({ queryKey: ["cargo-historico"] });
      toast.success("Cargo removido com sucesso!");
    },
    onError: () => toast.error("Erro ao remover cargo"),
  });

  const toggleLevel = (level: number) => {
    setExpandedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const getRoleInfo = (role: string) => ROLE_HIERARCHY.find((r) => r.role === role);

  const getUsersByRole = (role: string) => {
    const userIds = allRoles?.filter((r) => r.role === role).map((r) => r.user_id) || [];
    return profiles?.filter((p) => userIds.includes(p.user_id)) || [];
  };

  const filteredProfiles = profiles?.filter((p) =>
    p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRoleInfo = selectedRole ? getRoleInfo(selectedRole) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Gestão de Cargos e Hierarquia</h2>
        <p className="text-sm text-muted-foreground">Organograma institucional, permissões e progressão funcional</p>
      </div>

      <Tabs defaultValue="hierarquia" className="w-full">
        <TabsList className="bg-card border border-border w-full justify-start">
          <TabsTrigger value="hierarquia">Hierarquia</TabsTrigger>
          <TabsTrigger value="atribuir">Atribuir Cargos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ===== HIERARCHY TAB ===== */}
        <TabsContent value="hierarquia" className="mt-4 space-y-3">
          {ROLE_HIERARCHY.map((rh) => {
            const users = getUsersByRole(rh.role);
            const isExpanded = expandedLevels.includes(rh.level);
            const Icon = rh.icon;

            return (
              <motion.div
                key={rh.role}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rh.level * 0.03 }}
                className="bg-card rounded-xl border border-border overflow-hidden shadow-institutional"
              >
                <button
                  onClick={() => {
                    toggleLevel(rh.level);
                    setSelectedRole(rh.role);
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-left"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${rh.bgColor}`}>
                    <Icon className={`h-4 w-4 ${rh.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Nível {rh.level}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{rh.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{rh.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{users.length} membro{users.length !== 1 ? "s" : ""}</span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                        {/* Permissions */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Permissões</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rh.permissions.map((perm) => (
                              <span key={perm} className="text-[10px] px-2 py-0.5 rounded-full bg-institutional/10 text-institutional font-medium">
                                {PERMISSION_LABELS[perm] || perm}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Members */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Membros Ativos</p>
                          {users.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Nenhum membro neste cargo.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {users.map((u) => {
                                const userRole = allRoles?.find((r) => r.user_id === u.user_id && r.role === rh.role);
                                return (
                                  <div key={u.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground">{u.nome_completo}</p>
                                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                                        {u.discord && <span>🎮 {u.discord}</span>}
                                        {u.id_personagem && <span>🆔 {u.id_personagem}</span>}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                                      onClick={() => {
                                        if (userRole) {
                                          removeRoleMutation.mutate({
                                            roleId: userRole.id,
                                            userId: u.user_id,
                                            role: rh.role,
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* ===== ASSIGN TAB ===== */}
        <TabsContent value="atribuir" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-institutional space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-institutional" />
              Nomear / Promover Servidor
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">Buscar Usuário</label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome do personagem..."
                  className="h-10"
                />
              </div>

              {searchTerm && filteredProfiles && filteredProfiles.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                  {filteredProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setAssignUserId(p.user_id);
                        setSearchTerm(p.nome_completo);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        assignUserId === p.user_id ? "bg-institutional/10 text-institutional" : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="font-medium">{p.nome_completo}</span>
                      {p.id_personagem && <span className="text-xs text-muted-foreground ml-2">ID: {p.id_personagem}</span>}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">Cargo</label>
                <Select value={assignRole} onValueChange={setAssignRole}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_HIERARCHY.map((rh) => (
                      <SelectItem key={rh.role} value={rh.role}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">N{rh.level}</span>
                          {rh.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">Observações (opcional)</label>
                <Textarea
                  value={assignObs}
                  onChange={(e) => setAssignObs(e.target.value)}
                  placeholder="Motivo da nomeação, portaria, etc..."
                  rows={2}
                />
              </div>

              <Button
                onClick={() => {
                  if (!assignUserId || !assignRole) {
                    toast.error("Selecione um usuário e um cargo.");
                    return;
                  }
                  assignRoleMutation.mutate({ userId: assignUserId, role: assignRole, obs: assignObs });
                }}
                disabled={assignRoleMutation.isPending}
                className="w-full bg-institutional hover:bg-institutional/90 text-white"
              >
                {assignRoleMutation.isPending ? "Nomeando..." : "Nomear Servidor"}
              </Button>
            </div>
          </div>

          {/* Current assignments overview */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-institutional">
            <h3 className="text-sm font-semibold text-foreground mb-3">Servidores Ativos por Cargo</h3>
            <div className="space-y-2">
              {ROLE_HIERARCHY.map((rh) => {
                const count = getUsersByRole(rh.role).length;
                const Icon = rh.icon;
                return (
                  <div key={rh.role} className="flex items-center gap-3 py-1.5">
                    <Icon className={`h-4 w-4 ${rh.color}`} />
                    <span className="text-sm text-foreground flex-1">{rh.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rh.bgColor} ${rh.color}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="historico" className="mt-4 space-y-3">
          <div className="bg-card rounded-xl border border-border p-5 shadow-institutional">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-institutional" />
              Histórico de Nomeações e Movimentações
            </h3>

            {!cargoHistory?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro de movimentação funcional.</p>
            ) : (
              <div className="space-y-2">
                {cargoHistory.map((entry) => {
                  const roleInfo = getRoleInfo(entry.role);
                  const profile = profiles?.find((p) => p.user_id === entry.user_id);
                  const nomeador = profiles?.find((p) => p.user_id === entry.nomeado_por);
                  const tipoLabels: Record<string, string> = {
                    nomeacao: "Nomeação",
                    promocao: "Promoção",
                    exoneracao: "Exoneração",
                    substituicao: "Substituição",
                  };
                  const tipoColors: Record<string, string> = {
                    nomeacao: "text-emerald-600 bg-emerald-600/10",
                    promocao: "text-institutional bg-institutional/10",
                    exoneracao: "text-destructive bg-destructive/10",
                    substituicao: "text-amber-600 bg-amber-600/10",
                  };

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 border-l-2 border-border pl-4 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tipoColors[entry.tipo] || "text-muted-foreground bg-muted"}`}>
                            {tipoLabels[entry.tipo] || entry.tipo}
                          </span>
                          <span className="text-sm font-medium text-foreground">{profile?.nome_completo || "Usuário"}</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs font-medium text-institutional">{roleInfo?.label || entry.role}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(entry.created_at).toLocaleString("pt-BR")}
                          </span>
                          {nomeador && <span>por {nomeador.nome_completo}</span>}
                        </div>
                        {entry.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{entry.observacoes}"</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

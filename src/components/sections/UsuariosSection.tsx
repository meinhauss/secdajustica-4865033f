import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Pencil, Save, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatTelefoneIngame } from "@/lib/formatPhone";
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  magistrado: "Juiz de Direito",
  ministerio_publico: "Promotor de Justiça",
  delegado: "Delegado(a)",
  gaeco: "GAECO",
  chefe_gaeco: "Chefe GAECO",
  policia_civil: "Polícia Civil",
  policia_militar: "Polícia Militar",
  policia_federal: "Polícia Federal",
  oficial_justica: "Oficial de Justiça",
  advogado: "Advogado",
  cidadao: "Cidadão",
  presidente_tribunal: "Presidente do Tribunal",
  desembargador: "Desembargador",
  presidente_oab: "Presidente da OAB",
  procurador_geral: "Procurador-Geral",
  bacharel_direito: "Bacharel em Direito",
  hospital: "Hospital",
  detran: "DETRAN",
  procurador_estado: "Procurador Geral do Estado",
  corregedor: "Corregedor(a)",
  analista: "Analista",
  defensor_publico_geral: "Defensor(a) Público(a)-Geral",
  defensor_publico: "Defensor(a) Público(a)",
  investigador: "Investigador(a)",
};

const POLICE_ROLES = ["policia_civil", "policia_militar", "policia_federal", "gaeco"] as const;
const DELEGADO_ASSIGNABLE = ["delegado", "policia_civil", "policia_federal"] as const;

export default function UsuariosSection() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes("admin");
  const isDelegado = roles.includes("delegado") || roles.includes("chefe_gaeco");
  const callerPoliceRoles = roles.filter((r) => (POLICE_ROLES as readonly string[]).includes(r));
  const [search, setSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome_completo: "", discord: "", id_personagem: "", telefone_ingame: "" });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
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

  const { data: regras } = useQuery({
    queryKey: ["outorga-regras"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("outorga_regras").select("outorgante,cargo");
      if (error) throw error;
      return data as { outorgante: string; cargo: string }[];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ profileId, data }: { profileId: string; data: any }) => {
      const { error } = await supabase.from("profiles").update(data).eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      setEditingUserId(null);
      toast.success("Perfil atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });


  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      setDeleteUserId(null);
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.rpc("delegado_remove_police_role", { p_role_id: roleId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      toast.success("Cargo removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (profile: any) => {
    setEditingUserId(profile.id);
    setEditForm({
      nome_completo: profile.nome_completo || "",
      discord: profile.discord || "",
      id_personagem: profile.id_personagem || "",
      telefone_ingame: profile.telefone_ingame || "",
    });
  };

  const filteredBase = profiles?.filter((p) =>
    p.nome_completo?.toLowerCase().includes(search.toLowerCase()) ||
    p.id_personagem?.toLowerCase().includes(search.toLowerCase()) ||
    p.discord?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const corregedorInst = roles.includes("corregedor")
    ? roles.filter((r) => ["policia_civil", "policia_militar", "policia_federal"].includes(r))
    : [];
  const isCorregedor = corregedorInst.length > 0;
  const userHasInst = (uid: string) =>
    (allRoles || []).some((r) => r.user_id === uid && corregedorInst.includes(r.role));
  const isLider = (regras || []).some((r: any) => roles.includes(r.outorgante));
  // Líderes e corregedores veem todos (para nomear); chefe GAECO só vê quem tem cargos que ele detém
  const filtered = isAdmin || isLider || isCorregedor
    ? filteredBase
    : isDelegado
      ? filteredBase.filter((p) => {
          const userRolesList = allRoles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [];
          return userRolesList.some((r) => callerPoliceRoles.includes(r));
        })
      : [];

  const canDeleteProfile = (_p: any) => isAdmin;

  const regraCargos = new Set(
    (regras || []).filter((r: any) => roles.includes(r.outorgante)).map((r: any) => r.cargo as string)
  );

  const assignableFor = (uid: string): string[] => {
    const set = new Set<string>(regraCargos);
    if (isAdmin) { Object.keys(ROLE_LABELS).forEach((r) => set.add(r)); }
    corregedorInst.forEach((r) => set.add(r));
    if (isAdmin || (isCorregedor && userHasInst(uid))) set.add("corregedor");
    return [...set];
  };

  const canRemoveRole = (role: string, targetUserId: string) => {
    if (targetUserId === user?.id) return false;
    if (isAdmin) return true;
    if (regraCargos.has(role)) return true;
    if (corregedorInst.includes(role)) return true;
    if (role === "corregedor" && isCorregedor && userHasInst(targetUserId)) return true;
    if (!roles.includes("chefe_gaeco")) return false;
    if (!["policia_civil","policia_militar","policia_federal","delegado", "gaeco", "chefe_gaeco"].includes(role)) return false;
    return roles.includes(role);
  };

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.rpc("delegado_assign_police_role" as any, { p_user_id: userId, p_role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      toast.success("Cargo atribuído!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Gestão de Usuários</h2>
        <p className="text-sm text-muted-foreground">Administração de perfis, cargos e permissões</p>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border shadow-institutional mb-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-institutional" />
          <span className="text-2xl font-bold text-foreground">{profiles?.length ?? 0}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Usuários Registrados</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, ID ou Discord..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      {!filtered.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const userRoles = allRoles?.filter((r) => r.user_id === p.user_id) || [];
            return (
              <div key={p.id} className="bg-card rounded-xl p-4 border border-border shadow-institutional">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{p.nome_completo}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {p.discord && <p className="text-xs text-muted-foreground">🎮 {p.discord}</p>}
                      {p.id_personagem && <p className="text-xs text-muted-foreground">🆔 ID: {p.id_personagem}</p>}
                      {p.telefone_ingame && <p className="text-xs text-muted-foreground">📱 {p.telefone_ingame}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs" onClick={() => openEdit(p)}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                    )}
                    {canDeleteProfile(p) && (
                      <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => { setDeleteUserId(p.user_id); setDeleteUserName(p.nome_completo); }}>
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    )}
                  </div>
                </div>
                {/* Roles */}
                <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border">
                  {userRoles.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                      {ROLE_LABELS[r.role] || r.role}
                      {canRemoveRole(r.role, p.user_id) && (
                        <button
                          type="button"
                          aria-label="Remover cargo"
                          className="ml-1 hover:text-destructive disabled:opacity-50"
                          disabled={removeRole.isPending}
                          onClick={() => {
                            if (confirm(`Remover o cargo ${ROLE_LABELS[r.role] || r.role} de ${p.nome_completo}?`)) {
                              removeRole.mutate(r.id);
                            }
                          }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {userRoles.length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">Sem cargos atribuídos</span>
                  )}
                  {p.user_id !== user?.id && (() => {
                    const faltando = assignableFor(p.user_id).filter((r) => !userRoles.some((ur) => ur.role === r));
                    if (!faltando.length) return null;
                    return (
                      <select
                        aria-label="Dar cargo"
                        className="ml-auto h-7 text-xs rounded-lg border border-border bg-background px-2"
                        value=""
                        disabled={assignRole.isPending}
                        onChange={(e) => {
                          const role = e.target.value;
                          if (role && confirm(`Dar o cargo ${ROLE_LABELS[role]} a ${p.nome_completo}?`)) {
                            assignRole.mutate({ userId: p.user_id, role });
                          }
                        }}
                      >
                        <option value="">+ Dar cargo</option>
                        {faltando.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingUserId} onOpenChange={(open) => !open && setEditingUserId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Editar Perfil</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!editingUserId) return;
            updateProfile.mutate({ profileId: editingUserId, data: editForm });
          }} className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground">Nome Completo</label>
              <Input value={editForm.nome_completo} onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })} className="rounded-xl" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Discord</label>
              <Input value={editForm.discord} onChange={(e) => setEditForm({ ...editForm, discord: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">ID do Personagem</label>
              <Input value={editForm.id_personagem} onChange={(e) => setEditForm({ ...editForm, id_personagem: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Telefone In-Game</label>
              <Input value={editForm.telefone_ingame} onChange={(e) => setEditForm({ ...editForm, telefone_ingame: formatTelefoneIngame(e.target.value) })} placeholder="(14) 9 0000-0000" maxLength={16} className="rounded-xl" />
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Save className="h-4 w-4 mr-1" /> {updateProfile.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>


      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteUserName}</strong>? Esta ação é irreversível e removerá todos os dados, cargos e acesso do usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
              onClick={() => deleteUserId && deleteUser.mutate(deleteUserId)}
            >
              {deleteUser.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

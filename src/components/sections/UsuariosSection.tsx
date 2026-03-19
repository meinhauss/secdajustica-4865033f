import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Pencil, Save, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

const ALL_ROLES = Constants.public.Enums.user_role;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  magistrado: "Magistrado",
  ministerio_publico: "Promotor de Justiça",
  delegado: "Delegado",
  oficial_justica: "Oficial de Justiça",
  advogado: "Advogado",
  cidadao: "Cidadão",
  presidente_tribunal: "Presidente do Tribunal",
  desembargador: "Desembargador",
  investigador: "Investigador",
  presidente_oab: "Presidente da OAB",
  procurador_geral: "Procurador-Geral",
  bacharel_direito: "Bacharel em Direito",
};

export default function UsuariosSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

  const openEdit = (profile: any) => {
    setEditingUserId(profile.id);
    setEditForm({
      nome_completo: profile.nome_completo || "",
      discord: profile.discord || "",
      id_personagem: profile.id_personagem || "",
      telefone_ingame: profile.telefone_ingame || "",
    });
  };

  const filtered = profiles?.filter((p) =>
    p.nome_completo?.toLowerCase().includes(search.toLowerCase()) ||
    p.id_personagem?.toLowerCase().includes(search.toLowerCase()) ||
    p.discord?.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
                    <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs text-destructive hover:bg-destructive/10" onClick={() => { setDeleteUserId(p.user_id); setDeleteUserName(p.nome_completo); }}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
                {/* Roles (read-only) */}
                <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border">
                  {userRoles.map((r) => (
                    <span key={r.id} className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                      {ROLE_LABELS[r.role] || r.role}
                    </span>
                  ))}
                  {userRoles.length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">Sem cargos atribuídos</span>
                  )}
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
              <Input value={editForm.telefone_ingame} onChange={(e) => setEditForm({ ...editForm, telefone_ingame: e.target.value })} className="rounded-xl" />
            </div>
            <Button type="submit" disabled={updateProfile.isPending} className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Save className="h-4 w-4 mr-1" /> {updateProfile.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={!!addRoleUserId} onOpenChange={(open) => !open && setAddRoleUserId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Adicionar Cargo</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione um cargo" /></SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!newRole || addRole.isPending}
              onClick={() => addRoleUserId && addRole.mutate({ userId: addRoleUserId, role: newRole })}
              className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Plus className="h-4 w-4 mr-1" /> {addRole.isPending ? "Adicionando..." : "Adicionar Cargo"}
            </Button>
          </div>
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

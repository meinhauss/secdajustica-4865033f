import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function UsuariosSection() {
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Gestão de Usuários</h2>
        <p className="text-sm text-muted-foreground">Administração de cargos e permissões</p>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border shadow-institutional mb-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-institutional" />
          <span className="text-2xl font-bold text-foreground">{profiles?.length ?? 0}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Usuários Registrados</span>
        </div>
      </div>

      {!profiles?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário registrado.</p>
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => {
            const userRoles = allRoles?.filter((r) => r.user_id === p.user_id) || [];
            return (
              <div key={p.id} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.nome_completo}</p>
                  <p className="text-xs text-muted-foreground">{p.cpf || "CPF não informado"}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {userRoles.map((r) => (
                    <span key={r.id} className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                      {r.role}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

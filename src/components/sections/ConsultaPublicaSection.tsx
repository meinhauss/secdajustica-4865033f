import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, IdCard } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  magistrado: "Magistrado(a)",
  ministerio_publico: "Ministério Público",
  delegado: "Delegado(a)",
  oficial_justica: "Oficial de Justiça",
  advogado: "Advogado(a)",
  cidadao: "Cidadão",
  presidente_tribunal: "Presidente do Tribunal",
  desembargador: "Desembargador(a)",
  investigador: "Investigador(a)",
  presidente_oab: "Presidente da OAB",
  procurador_geral: "Procurador(a)-Geral",
  bacharel_direito: "Bacharel em Direito",
};

export default function ConsultaPublicaSection() {
  const [search, setSearch] = useState("");

  const { data: resultados } = useQuery({
    queryKey: ["consulta-credenciais", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const term = search.trim();

      // Search profiles by exact id_personagem
      const { data: profilesById, error: e1 } = await supabase
        .from("profiles")
        .select("user_id, nome_completo, id_personagem, cargo, oab_numero, avatar_url")
        .eq("id_personagem", term)
        .limit(50);
      if (e1) throw e1;

      // Also search carteiras_oab by numero_oab (ilike for partial match)
      const { data: carteiras, error: e2 } = await supabase
        .from("carteiras_oab")
        .select("user_id, numero_oab, nome_completo, id_personagem, especialidade, status")
        .ilike("numero_oab", `%${term}%`)
        .limit(50);
      if (e2) throw e2;

      // Merge user_ids from both sources
      const userMap: Record<string, any> = {};

      profilesById?.forEach((p) => {
        userMap[p.user_id] = { ...p, oab_info: null };
      });

      carteiras?.forEach((c) => {
        if (!userMap[c.user_id]) {
          userMap[c.user_id] = {
            user_id: c.user_id,
            nome_completo: c.nome_completo,
            id_personagem: c.id_personagem,
            cargo: null,
            oab_numero: c.numero_oab,
            avatar_url: null,
          };
        } else {
          userMap[c.user_id].oab_numero = c.numero_oab;
        }
      });

      const userIds = Object.keys(userMap);
      if (!userIds.length) return [];

      // Fetch full profiles for carteira-only matches
      const missingProfiles = userIds.filter((uid) => !profilesById?.some((p) => p.user_id === uid));
      if (missingProfiles.length) {
        const { data: extraProfiles } = await supabase
          .from("profiles")
          .select("user_id, nome_completo, id_personagem, cargo, avatar_url")
          .in("user_id", missingProfiles);
        extraProfiles?.forEach((p) => {
          userMap[p.user_id] = { ...userMap[p.user_id], ...p };
        });
      }

      // Fetch roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const rolesMap: Record<string, string[]> = {};
      roles?.forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      return Object.values(userMap).map((p: any) => ({
        ...p,
        roles: rolesMap[p.user_id] || [],
      }));
    },
    enabled: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Consulta de Credenciais</h2>
        <p className="text-sm text-muted-foreground">
          Pesquise pela numeração da OAB ou ID do servidor
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Número OAB ou ID do servidor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl h-12 text-base"
        />
      </div>

      {!resultados?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <IdCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p>{search ? "Nenhum servidor ou profissional encontrado." : "Digite o número da OAB ou ID do servidor para pesquisar."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resultados.map((p, i) => (
            <motion.div
              key={p.user_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 border border-border flex gap-4 items-start"
            >
              <Avatar className="h-16 w-16 border border-border shrink-0">
                {p.avatar_url ? (
                  <AvatarImage src={p.avatar_url} alt={p.nome_completo} className="object-cover" />
                ) : null}
                <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                  {p.nome_completo?.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {p.id_personagem && (
                    <span className="font-mono text-sm font-semibold text-institutional">ID: {p.id_personagem}</span>
                  )}
                  {p.oab_numero && (
                    <span className="font-mono text-sm font-semibold text-institutional">{p.oab_numero}</span>
                  )}
                  {p.roles
                    .filter((r: string) => r !== "cidadao")
                    .map((r: string) => (
                      <span
                        key={r}
                        className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                      >
                        {ROLE_LABELS[r] || r}
                      </span>
                    ))}
                </div>
                <p className="text-sm font-medium text-foreground">{p.nome_completo}</p>
                {p.cargo && <p className="text-xs text-muted-foreground">{p.cargo}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, IdCard } from "lucide-react";
import { motion } from "framer-motion";

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

      // Search profiles by id_personagem or oab_numero
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, nome_completo, id_personagem, cargo, oab_numero, avatar_url")
        .or(`id_personagem.ilike.%${term}%,oab_numero.ilike.%${term}%`)
        .limit(50);
      if (error) throw error;
      if (!profiles?.length) return [];

      // Fetch roles for found users
      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const rolesMap: Record<string, string[]> = {};
      roles?.forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      return profiles.map((p) => ({
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
              className="bg-card rounded-xl p-4 border border-border"
            >
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

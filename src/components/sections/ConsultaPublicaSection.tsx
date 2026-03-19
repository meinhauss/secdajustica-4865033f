import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, IdCard, Shield } from "lucide-react";
import { motion } from "framer-motion";

import logoTjsp from "@/assets/logo-tjsp.png";
import logoMpsp from "@/assets/logo-mpsp.png";
import logoOabsp from "@/assets/logo-oabsp.png";
import govLogo from "@/assets/gov-logo.png";

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

interface InstitutionInfo {
  name: string;
  logo: string;
}

function getInstitutionForRole(role: string): InstitutionInfo {
  switch (role) {
    case "magistrado":
    case "desembargador":
    case "presidente_tribunal":
      return { name: "Tribunal de Justiça de São Paulo", logo: logoTjsp };
    case "ministerio_publico":
    case "procurador_geral":
      return { name: "Ministério Público de São Paulo", logo: logoMpsp };
    case "advogado":
    case "presidente_oab":
    case "bacharel_direito":
      return { name: "OAB — Seção São Paulo", logo: logoOabsp };
    case "delegado":
    case "investigador":
      return { name: "Polícia Civil — Estado de São Paulo", logo: govLogo };
    case "oficial_justica":
      return { name: "Tribunal de Justiça de São Paulo", logo: logoTjsp };
    default:
      return { name: "Secretaria da Justiça e Cidadania", logo: govLogo };
  }
}

function getPrimaryRole(roles: string[]): string {
  const priority = [
    "presidente_tribunal", "desembargador", "magistrado",
    "procurador_geral", "ministerio_publico",
    "presidente_oab", "advogado",
    "delegado", "investigador",
    "oficial_justica", "bacharel_direito",
    "admin", "cidadao",
  ];
  for (const p of priority) {
    if (roles.includes(p)) return p;
  }
  return roles[0] || "cidadao";
}

export default function ConsultaPublicaSection() {
  const [search, setSearch] = useState("");

  const { data: resultados } = useQuery({
    queryKey: ["consulta-credenciais", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const term = search.trim();

      const { data: profilesById, error: e1 } = await supabase
        .from("profiles")
        .select("user_id, nome_completo, id_personagem, cargo, oab_numero, avatar_url")
        .eq("id_personagem", term)
        .limit(50);
      if (e1) throw e1;

      const { data: carteiras, error: e2 } = await supabase
        .from("carteiras_oab")
        .select("user_id, numero_oab, nome_completo, id_personagem, especialidade, status")
        .ilike("numero_oab", `%${term}%`)
        .limit(50);
      if (e2) throw e2;

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resultados.map((p, i) => {
            const primaryRole = getPrimaryRole(p.roles);
            const institution = getInstitutionForRole(primaryRole);

            return (
              <motion.div
                key={p.user_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative rounded-2xl overflow-hidden border border-border shadow-institutional"
              >
                {/* Card Header - institution bar with logo */}
                <div className="gradient-institutional px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={institution.logo}
                      alt={institution.name}
                      className="h-7 w-auto object-contain rounded"
                    />
                    <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-sidebar-foreground/80 leading-tight">
                      {institution.name}
                    </span>
                  </div>
                  <span className="text-[9px] text-sidebar-foreground/40 font-mono">SP</span>
                </div>

                {/* Card Body */}
                <div className="bg-card p-5 flex gap-5">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-24 rounded-lg border-2 border-border overflow-hidden bg-secondary flex items-center justify-center">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.nome_completo} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">
                          {p.nome_completo?.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Nome</p>
                      <p className="text-sm font-semibold text-foreground truncate">{p.nome_completo}</p>
                    </div>

                    <div className="flex gap-4">
                      {p.id_personagem && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">ID</p>
                          <p className="text-sm font-mono font-bold text-foreground">{p.id_personagem}</p>
                        </div>
                      )}
                      {p.oab_numero && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">OAB</p>
                          <p className="text-sm font-mono font-bold text-foreground">{p.oab_numero}</p>
                        </div>
                      )}
                    </div>

                    {p.cargo && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cargo</p>
                        <p className="text-xs text-foreground">{p.cargo}</p>
                      </div>
                    )}

                    {/* Role badges */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.roles
                        .filter((r: string) => r !== "cidadao")
                        .map((r: string) => (
                          <span
                            key={r}
                            className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark border border-gold/20"
                          >
                            {ROLE_LABELS[r] || r}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-secondary/50 px-5 py-2 flex items-center justify-between border-t border-border">
                  <span className="text-[9px] text-muted-foreground font-mono">CREDENCIAL DIGITAL</span>
                  <span className="text-[9px] text-muted-foreground">✓ Verificada</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

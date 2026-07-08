import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, IdCard, Phone, MessageCircle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import logoTjsp from "@/assets/logo-tjsp.png";
import logoMpsp from "@/assets/logo-mpsp.png";
import logoOabsp from "@/assets/logo-oabsp.png";
import logoSjc from "@/assets/logo-sjc.jpg";
import logoDefensoriaAsset from "@/assets/logo-defensoria-sp.jpg.asset.json";
const logoDefensoria = logoDefensoriaAsset.url;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  magistrado: "Juiz(a) de Direito",
  ministerio_publico: "Promotor(a) de Justiça",
  oficial_justica: "Oficial de Justiça",
  advogado: "Advogado(a)",
  cidadao: "Cidadão",
  presidente_tribunal: "Presidente do Tribunal",
  desembargador: "Desembargador(a)",
  presidente_oab: "Presidente da OAB",
  procurador_geral: "Procurador(a)-Geral",
  bacharel_direito: "Bacharel em Direito",
  procurador_estado: "Procurador(a) Geral do Estado",
  defensor_publico: "Defensor(a) Público(a)",
  defensor_publico_geral: "Defensor(a) Público(a)-Geral",
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
    case "oficial_justica":
      return { name: "Tribunal de Justiça de São Paulo", logo: logoTjsp };
    case "ministerio_publico":
    case "procurador_geral":
      return { name: "Ministério Público de São Paulo", logo: logoMpsp };
    case "defensor_publico":
    case "defensor_publico_geral":
      return { name: "Defensoria Pública do Estado de São Paulo", logo: logoDefensoria };
    case "procurador_estado":
      return { name: "Procuradoria Geral do Estado", logo: logoSjc };
    case "advogado":
    case "presidente_oab":
    case "bacharel_direito":
      return { name: "OAB — Seção São Paulo", logo: logoOabsp };
    default:
      return { name: "Secretaria da Justiça e Cidadania", logo: logoSjc };
  }
}

function getPrimaryRole(roles: string[]): string {
  const priority = [
    "presidente_tribunal", "desembargador", "magistrado",
    "procurador_geral", "procurador_estado", "ministerio_publico",
    "defensor_publico_geral", "defensor_publico",
    "presidente_oab", "advogado",
    "oficial_justica", "bacharel_direito",
    "admin", "cidadao",
  ];
  for (const p of priority) {
    if (roles.includes(p)) return p;
  }
  return roles[0] || "cidadao";
}

/** Returns a display cargo, avoiding duplication with role badges */
function getDisplayCargo(cargo: string | null, roles: string[]): string | null {
  if (!cargo) return null;
  const cargoLower = cargo.toLowerCase().trim();
  // If the cargo text is essentially the same as a role label, skip it
  const roleLabelsLower = roles.map((r) => (ROLE_LABELS[r] || r).toLowerCase());
  if (roleLabelsLower.some((label) => cargoLower === label || cargoLower.includes(label) || label.includes(cargoLower))) {
    return null;
  }
  return cargo;
}

/** Roles com porte de arma de fogo institucional (oficial de justiça e acima, exceto quem é apenas advogado/bacharel/cidadão) */
const ROLES_COM_PORTE_ARMA = new Set([
  "oficial_justica",
  "magistrado",
  "desembargador",
  "presidente_tribunal",
  "ministerio_publico",
  "procurador_geral",
  "procurador_estado",
  "defensor_publico",
  "defensor_publico_geral",
]);

function temPorteArma(roles: string[]): boolean {
  return roles.some((r) => ROLES_COM_PORTE_ARMA.has(r));
}

export default function ConsultaPublicaSection() {
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [photoDialog, setPhotoDialog] = useState<{ url: string; name: string } | null>(null);

  const handleSearch = () => {
    setSearchTerm(search.trim());
  };

  const { data: resultados } = useQuery({
    queryKey: ["consulta-credenciais", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const term = searchTerm;

      const [profilesByIdRes, profilesByNameRes, carteirasRes] = await Promise.all([
        supabase.from("profiles")
          .select("user_id, nome_completo, id_personagem, cargo, oab_numero, avatar_url, telefone_ingame, discord")
          .eq("id_personagem", term)
          .limit(50),
        supabase.from("profiles")
          .select("user_id, nome_completo, id_personagem, cargo, oab_numero, avatar_url, telefone_ingame, discord")
          .ilike("nome_completo", `%${term}%`)
          .limit(50),
        supabase.from("carteiras_oab")
          .select("user_id, numero_oab, nome_completo, id_personagem, especialidade, status")
          .ilike("numero_oab", `%${term}%`)
          .limit(50),
      ]);

      const profilesById = [...(profilesByIdRes.data || []), ...(profilesByNameRes.data || [])];
      const carteiras = carteirasRes.data || [];

      const userMap: Record<string, any> = {};

      profilesById.forEach((p) => {
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
            telefone_ingame: null,
          };
        } else {
          userMap[c.user_id].oab_numero = c.numero_oab;
        }
      });

      const userIds = Object.keys(userMap);
      if (!userIds.length) return [];

      const missingProfiles = userIds.filter((uid) => !profilesById.some((p) => p.user_id === uid));
      if (missingProfiles.length) {
        const { data: extraProfiles } = await supabase
          .from("profiles")
          .select("user_id, nome_completo, id_personagem, cargo, avatar_url, telefone_ingame, discord")
          .in("user_id", missingProfiles);
        extraProfiles?.forEach((p) => {
          userMap[p.user_id] = { ...userMap[p.user_id], ...p };
        });
      }

      // Fetch OAB cards for users missing oab_numero
      const missingOab = userIds.filter((uid) => !userMap[uid].oab_numero);
      if (missingOab.length) {
        const { data: oabCards } = await supabase
          .from("carteiras_oab")
          .select("user_id, numero_oab")
          .in("user_id", missingOab);
        oabCards?.forEach((c) => {
          if (c.numero_oab) {
            userMap[c.user_id].oab_numero = c.numero_oab;
          }
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

      <div className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome, Número OAB ou ID do servidor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 rounded-xl h-12 text-base"
          />
        </div>
        <Button onClick={handleSearch} className="h-12 px-6 rounded-xl" disabled={!search.trim()}>
          <Search className="h-4 w-4 mr-2" />
          Buscar
        </Button>
      </div>

      {!resultados?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <IdCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p>{searchTerm ? "Nenhum servidor ou profissional encontrado." : "Digite o nome, número da OAB ou ID do servidor e clique em Buscar."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resultados.map((p, i) => {
            const primaryRole = getPrimaryRole(p.roles);
            const institution = getInstitutionForRole(primaryRole);
            const displayCargo = getDisplayCargo(p.cargo, p.roles);

            return (
              <motion.div
                key={p.user_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative rounded-2xl overflow-hidden border border-border shadow-institutional group"
              >
                {/* Card Header */}
                <div className="gradient-institutional px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={institution.logo}
                      alt={institution.name}
                      className="h-8 w-auto object-contain rounded bg-white/90 p-0.5"
                    />
                    <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-sidebar-foreground/80 leading-tight">
                      {institution.name}
                    </span>
                  </div>
                  <span className="text-[9px] text-sidebar-foreground/40 font-mono">SP</span>
                </div>

                {/* Card Body with watermark */}
                <div className="bg-white p-5 flex gap-5 relative min-h-[140px] text-neutral-900 [&_.text-foreground]:text-neutral-900 [&_.text-muted-foreground]:text-neutral-500">
                  {/* Watermark — full logo, no cropping */}
                  <img
                    src={institution.logo}
                    alt=""
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[80%] max-h-[90%] object-contain opacity-[0.08] pointer-events-none select-none"
                  />

                  {/* Photo — clickable */}
                  <div className="flex-shrink-0 relative z-10">
                    <button
                      type="button"
                      onClick={() => {
                        if (p.avatar_url) {
                          setPhotoDialog({ url: p.avatar_url, name: p.nome_completo });
                        }
                      }}
                      className={`w-20 h-24 rounded-lg border-2 border-border overflow-hidden bg-secondary flex items-center justify-center shadow-sm transition-transform ${p.avatar_url ? "cursor-pointer hover:scale-105 hover:border-primary/50" : "cursor-default"}`}
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.nome_completo} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">
                          {p.nome_completo?.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() || "?"}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-2 relative z-10">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Nome</p>
                      <p className="text-sm font-semibold text-foreground truncate">{p.nome_completo}</p>
                    </div>

                    <div className="flex gap-4 flex-wrap">
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

                    {displayCargo && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cargo</p>
                        <p className="text-xs text-foreground">{displayCargo}</p>
                      </div>
                    )}

                    {p.telefone_ingame && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-mono text-foreground">{p.telefone_ingame}</p>
                      </div>
                    )}

                    {p.discord && (
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="h-3 w-3 text-muted-foreground" />
                        <a
                          href={`https://discord.com/users/${p.discord}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-primary hover:underline"
                          title={`Abrir perfil no Discord`}
                        >
                          Perfil no Discord
                        </a>
                      </div>
                    )}

                    {/* Single highest role badge */}
                    {primaryRole !== "cidadao" && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark border border-gold/20">
                          {ROLE_LABELS[primaryRole] || primaryRole}
                        </span>
                      </div>
                    )}

                    {/* Porte de arma institucional */}
                    {temPorteArma(p.roles) && (() => {
                      const base = getBaseLegalPorte(primaryRole);
                      return (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 pt-1 cursor-help">
                                <ShieldAlert className="h-3.5 w-3.5 text-red-700 flex-shrink-0" />
                                <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                                  Porte de Arma Institucional
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">
                                Possui porte de arma de fogo institucional por prerrogativas da profissão.
                              </p>
                              {base && (
                                <p className="text-[10px] mt-1 opacity-90">
                                  Base legal:{" "}
                                  <a
                                    href={base.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline font-semibold"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {base.label}
                                  </a>
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-secondary/50 px-5 py-2 flex items-center justify-between border-t border-border">
                  <span className="text-[9px] text-muted-foreground font-mono tracking-widest">CREDENCIAL DIGITAL</span>
                  <span className="text-[9px] text-accent font-semibold">✓ Verificada</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Photo enlargement dialog */}
      <Dialog open={!!photoDialog} onOpenChange={() => setPhotoDialog(null)}>
        <DialogContent className="max-w-md p-2 bg-card">
          <DialogTitle className="sr-only">{photoDialog?.name || "Foto"}</DialogTitle>
          {photoDialog?.url && (
            <img
              src={photoDialog.url}
              alt={photoDialog.name}
              className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

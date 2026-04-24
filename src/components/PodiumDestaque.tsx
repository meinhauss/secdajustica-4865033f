import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PodiumDestaqueProps {
  tipoRanking: "magistrado" | "promotor" | "advogado";
  fallbackIcon?: React.ReactNode;
}

const POSICAO_STYLES = [
  { medal: "🥇", border: "border-gold", bg: "from-gold/25 via-gold/10 to-transparent", text: "text-gold-dark", size: "w-14 h-14" },
  { medal: "🥈", border: "border-muted-foreground/40", bg: "from-muted/40 via-muted/15 to-transparent", text: "text-muted-foreground", size: "w-12 h-12" },
  { medal: "🥉", border: "border-amber-700/50", bg: "from-amber-700/20 via-amber-700/10 to-transparent", text: "text-amber-700", size: "w-12 h-12" },
];

export function PodiumDestaque({ tipoRanking, fallbackIcon }: PodiumDestaqueProps) {
  const { data: destaques } = useQuery({
    queryKey: ["ranking-destaque-podium", tipoRanking],
    queryFn: async () => {
      // Get the latest semana_inicio for this ranking type
      const { data: latest } = await supabase
        .from("ranking_destaques")
        .select("semana_inicio")
        .eq("tipo_ranking", tipoRanking)
        .order("semana_inicio", { ascending: false })
        .limit(1);

      if (!latest?.[0]) return [];

      const { data, error } = await supabase
        .from("ranking_destaques")
        .select("*")
        .eq("tipo_ranking", tipoRanking)
        .eq("semana_inicio", latest[0].semana_inicio)
        .order("posicao", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  if (!destaques || destaques.length === 0) return null;

  const semanaFim = destaques[0].semana_fim
    ? new Date(destaques[0].semana_fim).toLocaleDateString("pt-BR")
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-4 border-2 border-gold/40 shadow-institutional"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-gold-dark" />
        <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
          Pódio da Semana Passada
        </h3>
        {semanaFim && (
          <span className="text-[10px] text-muted-foreground ml-auto">até {semanaFim}</span>
        )}
      </div>
      <div className="space-y-2">
        {destaques.map((d: any) => {
          const style = POSICAO_STYLES[(d.posicao || 1) - 1] || POSICAO_STYLES[0];
          return (
            <div
              key={d.id}
              className={`bg-gradient-to-r ${style.bg} rounded-lg p-3 border ${style.border} flex items-center gap-3`}
            >
              <div className="text-2xl">{style.medal}</div>
              {d.avatar_url ? (
                <img
                  src={d.avatar_url}
                  alt=""
                  className={`${style.size} rounded-full object-cover border-2 ${style.border}`}
                />
              ) : (
                <div className={`${style.size} rounded-full bg-muted flex items-center justify-center`}>
                  {fallbackIcon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] uppercase tracking-wider font-bold ${style.text}`}>
                  {d.posicao}º Lugar
                </p>
                <p className="text-sm font-bold text-foreground truncate">{d.nome_completo}</p>
                {d.id_personagem && (
                  <p className="text-[10px] text-muted-foreground">ID: {d.id_personagem}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`text-lg font-bold ${style.text}`}>{d.score}</span>
                <p className="text-[9px] text-muted-foreground uppercase">pts</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

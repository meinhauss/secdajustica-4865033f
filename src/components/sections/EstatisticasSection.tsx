import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export default function EstatisticasSection() {
  const { data: processos } = useQuery({
    queryKey: ["stats-processos"],
    queryFn: async () => {
      const { data } = await supabase.from("processos").select("classe, status");
      return data || [];
    },
  });

  const { data: bos } = useQuery({
    queryKey: ["stats-bos"],
    queryFn: async () => {
      const { data } = await supabase.from("boletins_ocorrencia").select("tipo, status");
      return data || [];
    },
  });

  const classeCount: Record<string, number> = processos?.reduce((acc: Record<string, number>, p) => {
    acc[p.classe] = (acc[p.classe] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const tipoBoCount: Record<string, number> = bos?.reduce((acc: Record<string, number>, b) => {
    acc[b.tipo] = (acc[b.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Estatísticas</h2>
        <p className="text-sm text-muted-foreground">Dados institucionais da Comarca</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-lg font-semibold mb-4">Processos por Classe</h3>
          {Object.keys(classeCount).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(classeCount).map(([classe, count]) => (
                <div key={classe} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{classe}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-gold"
                      style={{ width: `${Math.min((count / (processos?.length || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-lg font-semibold mb-4">Ocorrências por Tipo</h3>
          {Object.keys(tipoBoCount).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(tipoBoCount).map(([tipo, count]) => (
                <div key={tipo} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{tipo}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-institutional"
                      style={{ width: `${Math.min((count / (bos?.length || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

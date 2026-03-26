import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export default function EstatisticasSection() {
  const { data: stats } = useQuery({
    queryKey: ["stats-processos"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_processo_stats");
      return data as { por_classe: Record<string, number>; por_status: Record<string, number>; total: number } | null;
    },
  });

  const classeCount = stats?.por_classe ?? {};
  const statusCount = stats?.por_status ?? {};
  const total = stats?.total ?? Object.values(classeCount).reduce((a, b) => a + b, 0);

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
style={{ width: `${Math.min(((count as number) / (total || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-lg font-semibold mb-4">Processos por Status</h3>
          {Object.keys(statusCount).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCount).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{status.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-institutional"
                      style={{ width: `${Math.min(((count as number) / (total || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

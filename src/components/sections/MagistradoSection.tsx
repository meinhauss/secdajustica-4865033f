import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gavel, FileText, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function MagistradoSection() {
  const { data: conclusos } = useQuery({
    queryKey: ["processos-conclusos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .eq("status", "concluso")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: todos } = useQuery({
    queryKey: ["processos-magistrado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Portal do Magistrado</h2>
        <p className="text-sm text-muted-foreground">Processos conclusos para decisão e despacho</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Conclusos para Decisão", value: conclusos?.length ?? 0, icon: Gavel, color: "text-gold" },
          { label: "Total de Processos", value: todos?.length ?? 0, icon: FileText, color: "text-institutional" },
          { label: "Sentenças Pendentes", value: conclusos?.length ?? 0, icon: Clock, color: "text-destructive" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-5 border border-border shadow-institutional"
          >
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
        <h3 className="font-display text-lg font-semibold mb-4">Processos Recentes</h3>
        {!todos?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum processo atribuído.</p>
        ) : (
          <div className="space-y-2">
            {todos.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <span className="font-mono text-sm font-semibold text-institutional">{p.numero}</span>
                  <p className="text-xs text-muted-foreground">{p.assunto}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                  {p.status?.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

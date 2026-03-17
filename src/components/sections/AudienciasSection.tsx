import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AudienciasSection() {
  const { data: audiencias } = useQuery({
    queryKey: ["audiencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audiencias")
        .select("*, processos(numero, assunto)")
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Audiências</h2>
        <p className="text-sm text-muted-foreground">Pauta de audiências da Comarca</p>
      </div>

      {!audiencias?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p>Nenhuma audiência agendada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audiencias.map((a: any, i: number) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border shadow-institutional"
            >
              <div className="flex items-center gap-3">
                <div className="bg-institutional/10 rounded-lg p-2">
                  <Calendar className="h-5 w-5 text-institutional" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(a.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.tipo} — {a.local} — Processo: {a.processos?.numero}
                  </p>
                </div>
                <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                  {a.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Scale, FileText, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function MPSection() {
  const { data: bos } = useQuery({
    queryKey: ["mp-bos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boletins_ocorrencia")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: processosCriminais } = useQuery({
    queryKey: ["mp-processos-criminais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .eq("classe", "criminal")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Ministério Público</h2>
        <p className="text-sm text-muted-foreground">Recebimento de inquéritos e acompanhamento de denúncias</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <Shield className="h-5 w-5 text-institutional mb-2" />
          <p className="text-2xl font-bold text-foreground">{bos?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Inquéritos Recebidos</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <Scale className="h-5 w-5 text-gold mb-2" />
          <p className="text-2xl font-bold text-foreground">{processosCriminais?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Ações Criminais</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          <FileText className="h-5 w-5 text-gold-dark mb-2" />
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Denúncias Oferecidas</p>
        </motion.div>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
        <h3 className="font-display text-lg font-semibold mb-4">Inquéritos Policiais</h3>
        {!bos?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum inquérito recebido.</p>
        ) : (
          <div className="space-y-2">
            {bos.map((bo) => (
              <div key={bo.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <span className="font-mono text-sm font-semibold text-institutional">{bo.numero}</span>
                  <p className="text-xs text-muted-foreground">{bo.tipo} — {bo.vitima_nome}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                  {bo.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

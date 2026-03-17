import { motion } from "framer-motion";
import { FileText, Scale, Shield, Users, Clock, AlertTriangle, CheckCircle, Gavel } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardHome() {
  const { profile, roles } = useAuth();

  const { data: processosCount } = useQuery({
    queryKey: ["processos-count"],
    queryFn: async () => {
      const { count } = await supabase.from("processos").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: bosCount } = useQuery({
    queryKey: ["bos-count"],
    queryFn: async () => {
      const { count } = await supabase.from("boletins_ocorrencia").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: audienciasCount } = useQuery({
    queryKey: ["audiencias-count"],
    queryFn: async () => {
      const { count } = await supabase.from("audiencias").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const stats = [
    { label: "Processos Ativos", value: processosCount ?? 0, icon: FileText, color: "text-institutional" },
    { label: "Boletins de Ocorrência", value: bosCount ?? 0, icon: Shield, color: "text-gold" },
    { label: "Audiências Agendadas", value: audienciasCount ?? 0, icon: Clock, color: "text-institutional-light" },
    { label: "Sentenças Proferidas", value: 0, icon: Gavel, color: "text-gold-dark" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Bem-vindo, {profile?.nome_completo?.split(" ")[0] || "Usuário"}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Painel de controle do Sistema Judiciário — Comarca de São Paulo
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-5 shadow-institutional border border-border"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-card rounded-xl p-6 shadow-institutional border border-border">
        <h3 className="font-display text-lg font-semibold mb-4 text-foreground">Ações Rápidas</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Novo Processo", icon: FileText },
            { label: "Registrar B.O.", icon: Shield },
            { label: "Consultar Processo", icon: Scale },
            { label: "Agendar Audiência", icon: Clock },
          ].map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-accent/20 transition-colors border border-border"
            >
              <action.icon className="h-6 w-6 text-institutional" />
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="bg-card rounded-xl p-6 shadow-institutional border border-border">
        <h3 className="font-display text-lg font-semibold mb-4 text-foreground">
          Últimas Movimentações
        </h3>
        <div className="text-sm text-muted-foreground text-center py-8">
          Nenhuma movimentação recente registrada.
        </div>
      </div>
    </div>
  );
}

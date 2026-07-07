import { motion } from "framer-motion";
import {
  FileText, Scale, Clock, Gavel,
  Briefcase, GraduationCap, Stamp, Bell, ArrowRight, BookOpen, Calculator
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import forumSuzano from "@/assets/forum-suzano.png.asset.json";

const JUDICIAL_ROLES = ["admin", "magistrado", "presidente_tribunal", "desembargador", "ministerio_publico", "advogado", "procurador_estado", "delegado"];

interface DashboardHomeProps {
  onNavigate?: (section: string) => void;
}

export default function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { profile, roles } = useAuth();

  const isJudicial = roles.some((r) => JUDICIAL_ROLES.includes(r));
  const isAdmin = roles.includes("admin");
  const isAdvogado = roles.includes("advogado");
  const isMagistrado = roles.includes("magistrado") || roles.includes("desembargador") || roles.includes("presidente_tribunal");
  const isMP = roles.includes("ministerio_publico");

  const { data: processosCount } = useQuery({
    queryKey: ["dash-processos"], queryFn: async () => {
      const { count } = await supabase.from("processos").select("*", { count: "exact", head: true });
      return count || 0;
    }, enabled: isJudicial || isAdmin,
  });

  const { data: processosConclusos } = useQuery({
    queryKey: ["dash-conclusos"], queryFn: async () => {
      const { count } = await supabase.from("processos").select("*", { count: "exact", head: true }).eq("status", "concluso");
      return count || 0;
    }, enabled: isMagistrado || isAdmin,
  });

  const { data: audienciasCount } = useQuery({
    queryKey: ["dash-audiencias"], queryFn: async () => {
      const { count } = await supabase.from("audiencias").select("*", { count: "exact", head: true }).eq("status", "agendada");
      return count || 0;
    }, enabled: isJudicial || isAdmin,
  });

  const { data: intimacoesPendentes } = useQuery({
    queryKey: ["dash-intimacoes"], queryFn: async () => {
      const { count } = await supabase.from("intimacoes").select("*", { count: "exact", head: true }).eq("status", "pendente");
      return count || 0;
    }, enabled: isJudicial || isAdmin,
  });


  const nav = (s: string) => onNavigate?.(s);

  const stats: { label: string; value: number; icon: any; onClick?: string }[] = [];
  if (isJudicial || isAdmin) stats.push({ label: "Processos", value: processosCount ?? 0, icon: FileText, onClick: "processos" });
  if (isMagistrado || isAdmin) stats.push({ label: "Conclusos p/ Decisão", value: processosConclusos ?? 0, icon: Gavel, onClick: "magistrado" });
  if (isJudicial || isAdmin) stats.push({ label: "Audiências Agendadas", value: audienciasCount ?? 0, icon: Clock, onClick: "audiencias" });
  if (isJudicial || isAdmin) stats.push({ label: "Intimações Pendentes", value: intimacoesPendentes ?? 0, icon: Bell, onClick: "cartorio" });
  

  const quickActions: { label: string; icon: any; section: string; desc: string }[] = [];
  if (isJudicial) quickActions.push({ label: "Processos", icon: FileText, section: "processos", desc: "Gerenciar processos judiciais" });
  if (isMagistrado || isAdmin) quickActions.push({ label: "Portal Magistrado", icon: Gavel, section: "magistrado", desc: "Despachos, sentenças e mandados" });
  if (isMP || isAdmin) quickActions.push({ label: "Ministério Público", icon: Scale, section: "mp", desc: "Denúncias e pareceres" });
  if (isAdvogado || isAdmin) quickActions.push({ label: "Portal OAB", icon: Briefcase, section: "oab", desc: "Inscrição e carteira digital" });
  if (isJudicial || isAdmin) quickActions.push({ label: "Cartório", icon: Stamp, section: "cartorio", desc: "Protocolos e intimações" });
  if (isJudicial || isAdmin) quickActions.push({ label: "Audiências", icon: Clock, section: "audiencias", desc: "Agenda de audiências" });
  quickActions.push({ label: "Concursos", icon: GraduationCap, section: "concursos", desc: "Editais e inscrições" });
  quickActions.push({ label: "Consultar Credencial", icon: Scale, section: "consulta", desc: "Verificar credenciais de servidores" });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Bem-vindo, {profile?.nome_completo?.split(" ")[0] || "Usuário"}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Painel de controle — Secretaria da Justiça e Cidadania — SP
        </p>
      </div>

      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => nav("consulta")}
        className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-xl px-6 py-4 shadow-lg hover:bg-primary/90 transition-colors font-bold text-lg tracking-wide"
      >
        <Scale className="h-6 w-6" />
        CONSULTAR CREDENCIAL
        <ArrowRight className="h-5 w-5" />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Link
          to="/codigo-penal"
          className="w-full flex items-center justify-center gap-3 bg-card border border-border text-foreground rounded-xl px-6 py-3 shadow-institutional hover:border-accent hover:text-accent transition-colors font-semibold tracking-wide"
        >
          <BookOpen className="h-5 w-5" />
          CÓDIGO PENAL
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Link
          to="/calculadora"
          className="w-full flex items-center justify-center gap-3 bg-card border border-border text-foreground rounded-xl px-6 py-3 shadow-institutional hover:border-accent hover:text-accent transition-colors font-semibold tracking-wide"
        >
          <Calculator className="h-5 w-5" />
          CALCULADORA DE CUSTAS
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => stat.onClick && nav(stat.onClick)}
              className="bg-card rounded-xl p-4 shadow-institutional border border-border cursor-pointer hover:border-accent transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-accent" />
                <span className="text-xl font-bold text-foreground">{stat.value}</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-tight">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

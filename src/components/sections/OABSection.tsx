import { Briefcase, Award, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function OABSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Portal da OAB</h2>
        <p className="text-sm text-muted-foreground">Cadastro de advogados e serviços da Ordem</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Advogados Cadastrados", value: 0, icon: Users, color: "text-institutional" },
          { label: "Carteiras Emitidas", value: 0, icon: Briefcase, color: "text-gold" },
          { label: "Ranking Ativo", value: 0, icon: Award, color: "text-gold-dark" },
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
        <h3 className="font-display text-lg font-semibold mb-4">Funcionalidades em Desenvolvimento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {["Cadastro de Advogados", "Carteira Digital OAB", "Tabela de Honorários", "Ranking Profissional"].map((item) => (
            <div key={item} className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gold/50" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

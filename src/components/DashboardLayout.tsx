import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  Scale, Gavel, BookOpen, FileText, Users, BarChart3,
  LogOut, Menu, X, Home, Briefcase, Calendar, Crown, GraduationCap, Stamp
 } from "lucide-react";
import logoSjc from "@/assets/logo-sjc.jpg";
import logoMpsp from "@/assets/logo-mpsp.png";
import logoOabsp from "@/assets/logo-oabsp.png";
import NotificacoesBell from "@/components/NotificacoesBell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Painel Geral", icon: Home, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "delegado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "investigador", "presidente_oab", "bacharel_direito"] },
  { id: "meu-perfil", label: "Meu Perfil", icon: Users, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "delegado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "investigador", "presidente_oab", "bacharel_direito"] },
  { id: "processos", label: "Processos", icon: FileText, roles: ["admin", "ministerio_publico", "procurador_geral", "advogado", "oficial_justica"] },
  { id: "magistrado", label: "Portal Magistrado", icon: Gavel, roles: ["admin", "magistrado", "presidente_tribunal", "desembargador"] },
  { id: "tribunal", label: "Tribunal de Justiça", icon: Scale, roles: ["admin", "desembargador", "presidente_tribunal"] },
  { id: "mp", label: "Ministério Público", icon: Scale, roles: ["admin", "ministerio_publico", "procurador_geral"] },
  
  { id: "oab", label: "Portal OAB", icon: Briefcase, roles: ["admin", "advogado", "presidente_oab", "bacharel_direito"] },
  { id: "audiencias", label: "Audiências", icon: Calendar, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "advogado", "presidente_tribunal", "desembargador"] },
  { id: "consulta", label: "Consulta Pública", icon: BookOpen, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "delegado", "oficial_justica", "advogado", "presidente_tribunal", "desembargador", "presidente_oab"] },
  { id: "concursos", label: "Concursos", icon: GraduationCap, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "delegado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "investigador", "presidente_oab", "bacharel_direito"] },
  { id: "cartorio", label: "Cartório Civil", icon: Stamp, roles: ["admin", "oficial_justica", "magistrado", "ministerio_publico", "procurador_geral", "advogado", "presidente_tribunal", "desembargador", "cidadao", "presidente_oab", "bacharel_direito"] },
  { id: "cargos", label: "Cargos e Hierarquia", icon: Crown, roles: ["admin"] },
  { id: "usuarios", label: "Usuários", icon: Users, roles: ["admin"] },
  { id: "estatisticas", label: "Estatísticas", icon: BarChart3, roles: ["admin", "magistrado", "presidente_tribunal"] },
];

export default function DashboardLayout({ children, activeSection, onSectionChange }: DashboardLayoutProps) {
  const { signOut, profile, roles } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredItems = menuItems.filter((item) =>
    roles.length === 0 || item.roles.some((r) => roles.includes(r))
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      presidente_tribunal: "Presidente do Tribunal",
      desembargador: "Desembargador(a)",
      magistrado: "Magistrado(a)",
      ministerio_publico: "Promotor(a)",
      procurador_geral: "Procurador(a)-Geral",
      delegado: "Delegado(a)",
      investigador: "Investigador(a)",
      oficial_justica: "Oficial de Justiça",
      presidente_oab: "Presidente da OAB",
      advogado: "Advogado(a)",
      bacharel_direito: "Bacharel em Direito",
      cidadao: "Cidadão",
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 gradient-institutional flex flex-col transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-sidebar-border">
          <img src={logoSjc} alt="SJC-SP" className="w-10 h-10 rounded-lg object-contain" />
          <div>
            <h2 className="font-display text-sm font-bold text-sidebar-foreground leading-tight">
              Secretaria da Justiça
            </h2>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">
              e Cidadania — SP
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-sidebar-foreground/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-sidebar-border">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {profile?.nome_completo || "Usuário"}
          </p>
          <p className="text-xs text-gold/70 mt-0.5">
            {roles.map(getRoleLabel).join(", ") || "Cidadão"}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeSection === item.id
                  ? "bg-sidebar-accent text-gold font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent/50 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 shadow-institutional">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold text-foreground">
            {filteredItems.find((i) => i.id === activeSection)?.label || "Painel"}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <NotificacoesBell onNavigate={onSectionChange} />
            <span className="text-xs text-muted-foreground hidden sm:block">
              Sistema Judiciário v1.0
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  Scale, Gavel, BookOpen, FileText, Users, BarChart3,
  LogOut, Menu, X, Home, Briefcase, Calendar, Crown, GraduationCap, Stamp, ClipboardList, UsersRound,
    Sun, Moon, FileStack, IdCard, Brain
 } from "lucide-react";
import logoSjc from "@/assets/logo-sjc.jpg";
import logoMpsp from "@/assets/logo-mpsp.png";
import logoOabsp from "@/assets/logo-oabsp.png";
import NotificationBell from "@/components/NotificationBell";
import CommandPalette, { type PaletteItem } from "@/components/CommandPalette";
import AIChatbotInstitucional from "@/components/AIChatbotInstitucional";
import { CURRENT_VERSION } from "@/lib/version";


interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onNavigateToProcesso?: (processoId: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Painel Geral", icon: Home, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran", "analista"] },
  { id: "meu-perfil", label: "Meu Perfil", icon: Users, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran", "analista"] },
  { id: "processos", label: "Consulta de Processos", icon: FileText, roles: ["admin", "magistrado", "desembargador", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "oficial_justica", "delegado", "corregedor", "chefe_gaeco", "analista"] },
  { id: "meus-processos", label: "Meus Processos", icon: FileText, roles: ["advogado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "cidadao", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran", "admin", "magistrado", "desembargador", "presidente_tribunal"] },
  { id: "magistrado", label: "Portal do Juiz", icon: Gavel, roles: ["admin", "magistrado", "presidente_tribunal", "desembargador", "analista"] },
  { id: "tribunal", label: "Tribunal de Justiça", icon: Scale, roles: ["admin", "desembargador", "presidente_tribunal", "magistrado"] },
  { id: "mp", label: "Ministério Público", icon: Scale, roles: ["admin", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto"] },
  
  { id: "oab", label: "Portal OAB", icon: Briefcase, roles: ["admin", "advogado", "presidente_oab", "bacharel_direito"] },
  { id: "audiencias", label: "Audiências", icon: Calendar, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "presidente_tribunal", "desembargador", "delegado", "corregedor", "chefe_gaeco"] },
  { id: "jurisprudencia", label: "Jurisprudência", icon: BookOpen, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "presidente_tribunal", "desembargador", "presidente_oab", "chefe_gaeco"] },
  { id: "consulta", label: "Consulta de Credenciais", icon: IdCard, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "advogado", "presidente_tribunal", "desembargador", "presidente_oab", "delegado", "corregedor", "chefe_gaeco"] },
  { id: "concursos", label: "Concursos", icon: GraduationCap, roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran"] },
  { id: "cartorio", label: "Cartório Civil", icon: Stamp, roles: ["admin", "oficial_justica", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "presidente_tribunal", "desembargador", "cidadao", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran"] },
  { id: "tco", label: "TCO", icon: ClipboardList, roles: ["admin", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco"] },
  { id: "jurados", label: "Tribunal do Júri", icon: UsersRound, roles: ["admin", "presidente_tribunal", "magistrado", "desembargador", "cidadao", "advogado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran"] },
  { id: "modelos", label: "Modelos", icon: FileStack, roles: ["admin", "magistrado", "desembargador", "presidente_tribunal", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "bacharel_direito", "presidente_oab", "oficial_justica", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco"] },
  { id: "aprovacoes", label: "Aprovações", icon: ClipboardList, roles: ["admin", "analista", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "desembargador", "presidente_tribunal", "defensor_publico", "defensor_publico_geral", "delegado", "corregedor", "chefe_gaeco", "oficial_justica", "presidente_oab", "advogado", "gaeco", "policia_civil", "policia_militar", "policia_federal", "hospital", "detran"] },
  { id: "cargos", label: "Cargos e Hierarquia", icon: Crown, roles: ["admin"] },
  { id: "usuarios", label: "Usuários", icon: Users, roles: ["admin", "delegado", "corregedor", "chefe_gaeco", "presidente_tribunal", "desembargador", "magistrado", "procurador_geral", "procurador_geral_adjunto", "ministerio_publico", "defensor_publico_geral", "defensor_publico", "procurador_estado", "presidente_oab"] },
  { id: "estatisticas", label: "Estatísticas", icon: BarChart3, roles: ["admin", "magistrado", "presidente_tribunal"] },
];

export default function DashboardLayout({ children, activeSection, onSectionChange, onNavigateToProcesso }: DashboardLayoutProps) {
  const { signOut, profile, roles } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredItems = roles.length === 0
    ? []
    : menuItems.filter((item) => item.roles.some((r) => roles.includes(r)));

  const shortcuts: Record<string, string> = {
    dashboard: "g d",
    processos: "g p",
    "meus-processos": "g m",
    audiencias: "g a",
    "meu-perfil": "g u",
    tribunal: "g t",
    oab: "g o",
    cartorio: "g c",
    tco: "g x",
    concursos: "g n",
  };
  const paletteItems: PaletteItem[] = filteredItems.map((i) => ({
    id: i.id,
    label: i.label,
    icon: i.icon,
    shortcut: shortcuts[i.id],
  }));

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      presidente_tribunal: "Presidente do Tribunal",
      desembargador: "Desembargador(a)",
      magistrado: "Juiz(a) de Direito",
      gaeco: "GAECO",
      chefe_gaeco: "Chefe GAECO",
      corregedor: "Corregedor(a)",
      ministerio_publico: "Promotor(a)",
      procurador_geral: "Procurador(a)-Geral",
      procurador_geral_adjunto: "Procurador(a)-Geral Adjunto(a)",
      oficial_justica: "Oficial de Justiça",
      presidente_oab: "Presidente da OAB",
      advogado: "Advogado(a)",
      bacharel_direito: "Bacharel em Direito",
      cidadao: "Cidadão",
      delegado: "Delegado(a)",
      policia_civil: "Polícia Civil",
      policia_militar: "Polícia Militar",
      policia_federal: "Polícia Federal",
      hospital: "Hospital",
      detran: "DETRAN",
      procurador_estado: "Procurador(a) Geral do Estado",
      defensor_publico_geral: "Defensor(a) Público(a)-Geral",
      defensor_publico: "Defensor(a) Público(a)",
      analista: "Analista",
      investigador: "Investigador(a)",
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-dvh flex bg-background">
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar flex flex-col transform transition-transform lg:translate-x-0 ${
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
      <div className="flex-1 flex flex-col min-h-dvh min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center px-3 sm:px-4 gap-2 sm:gap-4 shadow-institutional sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground flex-shrink-0" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg sm:text-xl font-semibold text-foreground truncate min-w-0 tracking-tight">
            {filteredItems.find((i) => i.id === activeSection)?.label || "Painel"}
          </h1>
          <div className="ml-auto flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationBell onNavigate={(section, processoId) => {
              if (processoId && section === "processos") {
                onNavigateToProcesso?.(processoId);
              }
              onSectionChange(section);
            }} />
            <span className="text-[10px] uppercase tracking-widest text-gold/70 hidden md:block font-medium">
              SJC · v{CURRENT_VERSION}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0 pb-44 lg:pb-8">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="min-w-0 max-w-full"
          >
            {children}
          </motion.div>
        </main>
        <footer className="py-3 px-4 border-t border-border bg-card text-center hidden lg:block">
          <p className="text-xs text-muted-foreground">
            Sistema produzido por:{" "}
            <a href="https://discord.com/users/meinhaus" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-medium">
              Mein Haus
            </a>{" "}
            — Todos os direitos reservados
          </p>
        </footer>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav
        items={filteredItems}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onOpenMenu={() => setSidebarOpen(true)}
      />

      {/* Command palette global — ⌘K / Ctrl+K + sequências "g <letra>" */}
      <CommandPalette items={paletteItems} onSelect={onSectionChange} />

      {/* Vade MeCum — assistente flutuante global */}
      <AIChatbotInstitucional
        destinos={filteredItems.map((i) => ({ id: i.id, label: i.label }))}
        onNavigate={(id) => onSectionChange(id)}
        activeSection={activeSection}
      />


    </div>
  );
}

// ============ Mobile Bottom Nav ============
function MobileBottomNav({
  items,
  activeSection,
  onSectionChange,
  onOpenMenu,
}: {
  items: { id: string; label: string; icon: any }[];
  activeSection: string;
  onSectionChange: (s: string) => void;
  onOpenMenu: () => void;
}) {
  // Prioritize the 4 most useful shortcuts if present, fallback to first items
  const priority = ["dashboard", "meus-processos", "processos", "cartorio", "audiencias", "meu-perfil"];
  const primary = priority
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean)
    .slice(0, 4) as typeof items;
  const fill = items.filter((i) => !primary.some((p) => p.id === i.id)).slice(0, 4 - primary.length);
  const tabs = [...primary, ...fill].slice(0, 4);

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5 h-16">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active ? "text-gold" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
              <span className="truncate max-w-[64px] leading-tight">{item.label}</span>
              {active && <span className="absolute top-0 w-8 h-0.5 bg-gold rounded-full" />}
            </button>
          );
        })}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-sidebar-foreground/60 hover:text-gold transition-colors"
          aria-label="Abrir mais opções"
        >
          <Menu className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}

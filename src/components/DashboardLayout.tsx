import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  Scale, Gavel, BookOpen, FileText, Users, BarChart3,
  LogOut, Menu, X, Home, Briefcase, Calendar, Crown, GraduationCap, Stamp, ClipboardList, UsersRound,
  Sun, Moon, FileStack, IdCard, ChevronDown
} from "lucide-react";
import AlgemaIcon from "@/components/icons/AlgemaIcon";
import logoSjc from "@/assets/logo-sjc.jpg";
import NotificationBell from "@/components/NotificationBell";
import CommandPalette, { type PaletteItem } from "@/components/CommandPalette";
import AIChatbotInstitucional from "@/components/AIChatbotInstitucional";
import { CURRENT_VERSION } from "@/lib/version";
import { getPrimaryRoleLabel, hasAnyRole } from "@/lib/roles";
import { getShortcutForSection } from "@/hooks/useKeyboardNavigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onNavigateToProcesso?: (processoId: string) => void;
}

type MenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  category: string;
};

const menuItems: MenuItem[] = [
  // Geral
  { id: "dashboard", label: "Painel Geral", icon: Home, category: "Geral", roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran", "analista"] },
  { id: "meu-perfil", label: "Meu Perfil", icon: Users, category: "Geral", roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran", "analista"] },

  // Judicial
  { id: "processos", label: "Consulta de Processos", icon: FileText, category: "Judicial", roles: ["admin", "magistrado", "desembargador", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "oficial_justica", "delegado", "corregedor", "chefe_gaeco", "analista"] },
  { id: "meus-processos", label: "Meus Processos", icon: FileText, category: "Judicial", roles: ["advogado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "cidadao", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran", "admin", "magistrado", "desembargador", "presidente_tribunal"] },
  { id: "audiencias", label: "Audiências", icon: Calendar, category: "Judicial", roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "presidente_tribunal", "desembargador", "delegado", "corregedor", "chefe_gaeco"] },
  { id: "jurisprudencia", label: "Jurisprudência", icon: BookOpen, category: "Judicial", roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "presidente_tribunal", "desembargador", "presidente_oab", "chefe_gaeco"] },
  { id: "modelos", label: "Modelos", icon: FileStack, category: "Judicial", roles: ["admin", "magistrado", "desembargador", "presidente_tribunal", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "bacharel_direito", "presidente_oab", "oficial_justica", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco"] },
  { id: "aprovacoes", label: "Aprovações", icon: ClipboardList, category: "Judicial", roles: ["admin", "analista", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "desembargador", "presidente_tribunal", "defensor_publico", "defensor_publico_geral", "delegado", "corregedor", "chefe_gaeco", "oficial_justica", "presidente_oab", "advogado", "gaeco", "policia_civil", "policia_militar", "policia_federal", "hospital", "detran"] },

  // Instituições
  { id: "magistrado", label: "Portal do Juiz", icon: Gavel, category: "Instituições", roles: ["admin", "magistrado", "presidente_tribunal", "desembargador", "analista"] },
  { id: "tribunal", label: "Tribunal de Justiça", icon: Scale, category: "Instituições", roles: ["admin", "desembargador", "presidente_tribunal", "magistrado"] },
  { id: "mp", label: "Ministério Público", icon: Scale, category: "Instituições", roles: ["admin", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto"] },
  { id: "oab", label: "Portal OAB", icon: Briefcase, category: "Instituições", roles: ["admin", "advogado", "presidente_oab", "bacharel_direito"] },
  { id: "cartorio", label: "Cartório Civil", icon: Stamp, category: "Instituições", roles: ["admin", "oficial_justica", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "advogado", "presidente_tribunal", "desembargador", "cidadao", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran"] },
  { id: "jurados", label: "Tribunal do Júri", icon: UsersRound, category: "Instituições", roles: ["admin", "presidente_tribunal", "magistrado", "desembargador", "cidadao", "advogado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran"] },

  // Segurança
  { id: "tco", label: "TCO", icon: ClipboardList, category: "Segurança", roles: ["admin", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco"] },
  { id: "triagem-bo", label: "Triagem Penal", icon: AlgemaIcon, category: "Segurança", roles: ["admin", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco"] },

  // Cidadão
  { id: "consulta", label: "Consulta de Credenciais", icon: IdCard, category: "Cidadão", roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "advogado", "presidente_tribunal", "desembargador", "presidente_oab", "delegado", "corregedor", "chefe_gaeco"] },
  { id: "concursos", label: "Concursos", icon: GraduationCap, category: "Cidadão", roles: ["admin", "magistrado", "ministerio_publico", "procurador_geral", "procurador_geral_adjunto", "procurador_estado", "oficial_justica", "advogado", "cidadao", "presidente_tribunal", "desembargador", "presidente_oab", "bacharel_direito", "policia_civil", "policia_militar", "policia_federal", "delegado", "corregedor", "gaeco", "chefe_gaeco", "hospital", "detran"] },

  // Admin
  { id: "estatisticas", label: "Estatísticas", icon: BarChart3, category: "Admin", roles: ["admin", "magistrado", "presidente_tribunal"] },
  { id: "usuarios", label: "Usuários", icon: Users, category: "Admin", roles: ["admin", "delegado", "corregedor", "chefe_gaeco", "presidente_tribunal", "desembargador", "magistrado", "procurador_geral", "procurador_geral_adjunto", "ministerio_publico", "defensor_publico_geral", "defensor_publico", "procurador_estado", "presidente_oab"] },
  { id: "cargos", label: "Cargos e Hierarquia", icon: Crown, category: "Admin", roles: ["admin"] },
];

/** Ordem fixa das categorias na sidebar */
const CATEGORY_ORDER = ["Geral", "Judicial", "Instituições", "Segurança", "Cidadão", "Admin"];

export default function DashboardLayout({ children, activeSection, onSectionChange, onNavigateToProcesso }: DashboardLayoutProps) {
  const { signOut, profile, roles } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const filteredItems = roles.length === 0
    ? []
    : menuItems.filter((item) => item.roles.some((r) => roles.includes(r)));

  // Agrupa itens filtrados por categoria, respeitando a ordem definida
  const groupedItems = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      items: filteredItems.filter((i) => i.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const paletteItems: PaletteItem[] = filteredItems.map((i) => ({
    id: i.id,
    label: i.label,
    icon: i.icon,
    shortcut: getShortcutForSection(i.id),
  }));

  return (
    <div className="min-h-dvh flex bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
            {getPrimaryRoleLabel(roles)}
          </p>
        </div>

        {/* Nav agrupado por categorias colapsáveis */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {groupedItems.map((group) => {
            const isCollapsed = collapsedCategories.has(group.category);
            return (
              <div key={group.category}>
                <button
                  onClick={() => toggleCategory(group.category)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
                >
                  {group.category}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-0.5"
                    >
                      {group.items.map((item) => (
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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

        {/* Content — transição leve apenas na troca de seção */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0 pb-44 lg:pb-8">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
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
        roles={roles}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        onOpenMenu={() => setSidebarOpen(true)}
      />

      {/* Command palette global */}
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
/** Prioridades de tabs mobile por grupo de roles */
const MOBILE_PRIORITIES_BY_ROLE: Record<string, string[]> = {
  policial: ["triagem-bo", "tco", "dashboard", "meus-processos"],
  judicial: ["dashboard", "processos", "meus-processos", "audiencias"],
  advogado: ["dashboard", "meus-processos", "oab", "audiencias"],
  mp: ["dashboard", "mp", "processos", "audiencias"],
  cidadao: ["dashboard", "consulta", "concursos", "meus-processos"],
  admin: ["dashboard", "processos", "usuarios", "estatisticas"],
};

const DEFAULT_MOBILE_PRIORITY = ["dashboard", "meus-processos", "processos", "audiencias"];

function getMobilePriority(roles: string[]): string[] {
  if (hasAnyRole(roles, "policia_civil", "policia_militar", "policia_federal", "delegado")) return MOBILE_PRIORITIES_BY_ROLE.policial;
  if (hasAnyRole(roles, "magistrado", "desembargador", "presidente_tribunal")) return MOBILE_PRIORITIES_BY_ROLE.judicial;
  if (hasAnyRole(roles, "advogado", "bacharel_direito", "presidente_oab")) return MOBILE_PRIORITIES_BY_ROLE.advogado;
  if (hasAnyRole(roles, "ministerio_publico", "procurador_geral", "procurador_geral_adjunto")) return MOBILE_PRIORITIES_BY_ROLE.mp;
  if (hasAnyRole(roles, "admin")) return MOBILE_PRIORITIES_BY_ROLE.admin;
  if (hasAnyRole(roles, "cidadao")) return MOBILE_PRIORITIES_BY_ROLE.cidadao;
  return DEFAULT_MOBILE_PRIORITY;
}

function MobileBottomNav({
  items,
  roles,
  activeSection,
  onSectionChange,
  onOpenMenu,
}: {
  items: { id: string; label: string; icon: any }[];
  roles: string[];
  activeSection: string;
  onSectionChange: (s: string) => void;
  onOpenMenu: () => void;
}) {
  const priority = getMobilePriority(roles);
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
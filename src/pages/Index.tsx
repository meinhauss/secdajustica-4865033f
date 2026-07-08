import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/components/LoginPage";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardHome from "@/components/sections/DashboardHome";
import ProcessosSection from "@/components/sections/ProcessosSection";
import MeusProcessosSection from "@/components/sections/MeusProcessosSection";
import ConsultaPublicaSection from "@/components/sections/ConsultaPublicaSection";
import MagistradoSection from "@/components/sections/MagistradoSection";
import JurisprudenciaSection from "@/components/sections/JurisprudenciaSection";
import MPSection from "@/components/sections/MPSection";
import AudienciasSection from "@/components/sections/AudienciasSection";
import OABSection from "@/components/sections/OABSection";
import UsuariosSection from "@/components/sections/UsuariosSection";
import CargosSection from "@/components/sections/CargosSection";
import ConcursosSection from "@/components/sections/ConcursosSection";
import MeuPerfilSection from "@/components/sections/MeuPerfilSection";
import TCOSection from "@/components/sections/TCOSection";
import JuradosSection from "@/components/sections/JuradosSection";
import ModelosSection from "@/components/sections/ModelosSection";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useGlobalShortcuts, SHORTCUTS_LIST } from "@/hooks/useGlobalShortcuts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Seções pesadas — carregadas sob demanda
const TribunalSection = lazy(() => import("@/components/sections/TribunalSection"));
const CartorarioSection = lazy(() => import("@/components/sections/CartorarioSection"));
const EstatisticasSection = lazy(() => import("@/components/sections/EstatisticasSection"));

const LazyFallback = () => (
  <div className="py-6">
    <ListSkeleton rows={6} />
  </div>
);

const Index = () => {
  const { user, loading, profile, roles } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [openProcessoId, setOpenProcessoId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useGlobalShortcuts((section) => {
    if (section !== "processos") setOpenProcessoId(null);
    setActiveSection(section);
  });

  useEffect(() => {
    const h = () => setHelpOpen(true);
    window.addEventListener("shortcut:show-help", h);
    const openProc = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (!id) return;
      setOpenProcessoId(id);
      setActiveSection("processos");
    };
    window.addEventListener("nav:processo", openProc);
    return () => {
      window.removeEventListener("shortcut:show-help", h);
      window.removeEventListener("nav:processo", openProc);
    };
  }, []);

  // Aviso de foto de perfil para advogados+
  useEffect(() => {
    if (!user || !profile || profile.avatar_url) return;
    const advogadoPlus = new Set([
      "advogado", "magistrado", "desembargador", "presidente_tribunal",
      "ministerio_publico", "procurador_geral", "procurador_estado",
      "delegado", "presidente_oab", "bacharel_direito", "admin",
    ]);
    if (!roles.some((r) => advogadoPlus.has(r))) return;
    const key = `avatar-reminder-${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    toast.warning("Adicione uma foto de perfil", {
      description: "Como membro togado, é obrigatório manter sua foto de perfil atualizada.",
      action: { label: "Adicionar agora", onClick: () => setActiveSection("meu-perfil") },
      duration: 10000,
    });
  }, [user, profile, roles]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // Obrigatório atualizar cadastro antes de acessar o sistema
  if (profile?.precisa_atualizar_cadastro) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 text-sm text-foreground">
            <p className="font-semibold text-gold-dark mb-1">Atualização de cadastro obrigatória</p>
            <p className="text-muted-foreground">
              Para continuar utilizando o sistema, revise e confirme suas informações pessoais.
              Preencha corretamente todos os campos e clique em <strong>Salvar Alterações</strong>.
            </p>
          </div>
          <MeuPerfilSection />
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard": return <DashboardHome onNavigate={setActiveSection} />;
      case "meu-perfil": return <MeuPerfilSection />;
      case "processos": return <ProcessosSection initialProcessoId={openProcessoId} />;
      case "meus-processos": return <MeusProcessosSection onOpenProcesso={(id) => { setOpenProcessoId(id); setActiveSection("processos"); }} />;
      case "consulta": return <ConsultaPublicaSection />;
      case "magistrado": return <MagistradoSection />;
      case "tribunal": return <Suspense fallback={<LazyFallback />}><TribunalSection onOpenProcesso={(id) => { setOpenProcessoId(id); setActiveSection("processos"); }} /></Suspense>;
      case "jurisprudencia": return <JurisprudenciaSection />;
      case "mp": return <MPSection />;
      case "audiencias": return <AudienciasSection />;
      case "oab": return <OABSection />;
      case "cargos": return <CargosSection />;
      case "usuarios": return <UsuariosSection />;
      case "estatisticas": return <Suspense fallback={<LazyFallback />}><EstatisticasSection /></Suspense>;
      case "concursos": return <ConcursosSection />;
      case "cartorio": return <Suspense fallback={<LazyFallback />}><CartorarioSection /></Suspense>;
      case "tco": return <TCOSection />;
      case "jurados": return <JuradosSection onOpenProcesso={(id) => { setOpenProcessoId(id); setActiveSection("processos"); }} />;
      case "modelos": return <ModelosSection />;
      default: return <DashboardHome />;
    }
  };

  return (
    <>
      <DashboardLayout activeSection={activeSection} onSectionChange={(s) => { if (s !== "processos") setOpenProcessoId(null); setActiveSection(s); }} onNavigateToProcesso={(id) => { setOpenProcessoId(id); setActiveSection("processos"); }}>
        {renderSection()}
      </DashboardLayout>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atalhos de teclado</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 mt-2 text-sm">
            {SHORTCUTS_LIST.map((s) => (
              <li key={s.keys} className="flex items-center justify-between">
                <span className="text-muted-foreground">{s.desc}</span>
                <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">{s.keys}</kbd>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Digite as teclas em sequência (ex.: pressione <kbd>g</kbd> e depois <kbd>p</kbd>). Atalhos são ignorados em campos de texto.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Index;

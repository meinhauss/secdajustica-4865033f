import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/components/LoginPage";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardHome from "@/components/sections/DashboardHome";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useKeyboardNavigation, SHORTCUTS_LIST } from "@/hooks/useKeyboardNavigation";
import { AVATAR_REQUIRED_ROLES, hasAnyRole } from "@/lib/roles";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Seções carregadas sob demanda — apenas DashboardHome é eager
const ProcessosSection = lazy(() => import("@/components/sections/ProcessosSection"));
const MeusProcessosSection = lazy(() => import("@/components/sections/MeusProcessosSection"));
const ConsultaPublicaSection = lazy(() => import("@/components/sections/ConsultaPublicaSection"));
const MagistradoSection = lazy(() => import("@/components/sections/MagistradoSection"));
const TribunalSection = lazy(() => import("@/components/sections/TribunalSection"));
const EstatisticasSection = lazy(() => import("@/components/sections/EstatisticasSection"));
const CartorarioSection = lazy(() => import("@/components/sections/CartorarioSection"));
const JurisprudenciaSection = lazy(() => import("@/components/sections/JurisprudenciaSection"));
const MPSection = lazy(() => import("@/components/sections/MPSection"));
const AudienciasSection = lazy(() => import("@/components/sections/AudienciasSection"));
const OABSection = lazy(() => import("@/components/sections/OABSection"));
const UsuariosSection = lazy(() => import("@/components/sections/UsuariosSection"));
const AprovacoesSection = lazy(() => import("@/components/sections/AprovacoesSection"));
const CargosSection = lazy(() => import("@/components/sections/CargosSection"));
const ConcursosSection = lazy(() => import("@/components/sections/ConcursosSection"));
const MeuPerfilSection = lazy(() => import("@/components/sections/MeuPerfilSection"));
const TCOSection = lazy(() => import("@/components/sections/TCOSection"));
const TriagemBOSection = lazy(() => import("@/components/sections/TriagemBOSection"));
const JuradosSection = lazy(() => import("@/components/sections/JuradosSection"));
const ModelosSection = lazy(() => import("@/components/sections/ModelosSection"));

const LazyFallback = () => (
  <div className="py-6">
    <ListSkeleton rows={6} />
  </div>
);

// Seções válidas para validação de rotas
const VALID_SECTIONS = new Set([
  "dashboard", "meu-perfil", "processos", "meus-processos", "consulta",
  "magistrado", "tribunal", "jurisprudencia", "mp", "audiencias", "oab",
  "cargos", "usuarios", "aprovacoes", "estatisticas", "concursos",
  "cartorio", "tco", "triagem-bo", "jurados", "modelos",
]);

const Index = () => {
  const { user, loading, profile, roles } = useAuth();
  const { section: urlSection, subId } = useParams<{ section?: string; subId?: string }>();
  const navigate = useNavigate();

  // Deriva a seção ativa da URL; fallback para dashboard se inválida ou ausente
  const activeSection = urlSection && VALID_SECTIONS.has(urlSection) ? urlSection : "dashboard";

  // Navegação centralizada: atualiza URL e limpa processo aberto se necessário
  const setActiveSection = (section: string) => {
    if (section === activeSection) return;
    navigate(section === "dashboard" ? "/" : `/${section}`, { replace: false });
  };

  const [openProcessoId, setOpenProcessoId] = useState<string | null>(subId || null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [avatarReminderOpen, setAvatarReminderOpen] = useState(false);

  // Sincroniza openProcessoId quando a URL muda (ex: back/forward do navegador)
  useEffect(() => {
    if (activeSection === "processos" && subId) {
      setOpenProcessoId(subId);
    } else if (activeSection !== "processos") {
      setOpenProcessoId(null);
    }
  }, [activeSection, subId]);

  useKeyboardNavigation((section) => {
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

    // Deep link vindo do bot Discord / notificações externas: ?section=xxx&processo=uuid
    try {
      const sp = new URLSearchParams(window.location.search);
      const section = sp.get("section");
      const processo = sp.get("processo");
      if (section) {
        setActiveSection(section);
        if (processo) setOpenProcessoId(processo);
        sp.delete("section");
        sp.delete("processo");
        const rest = sp.toString();
        window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
      }
    } catch {}

    return () => {
      window.removeEventListener("shortcut:show-help", h);
      window.removeEventListener("nav:processo", openProc);
    };
  }, []);

  // Aviso de foto de perfil para roles que exigem
  useEffect(() => {
    if (!user || !profile || profile.avatar_url) return;
    if (!hasAnyRole(roles, ...AVATAR_REQUIRED_ROLES)) return;
    const key = `avatar-reminder-${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setAvatarReminderOpen(true);
  }, [user, profile, roles]);


  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // Aguarda o perfil carregar antes de avaliar a obrigatoriedade
  if (!profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Obrigatório atualizar cadastro antes de acessar o sistema
  const discordRaw = (profile as any)?.discord_user_id || profile?.discord || "";
  const discordValido = /^\d{17,20}$/.test(String(discordRaw).replace(/\D/g, ""));
  if (profile?.precisa_atualizar_cadastro || !discordValido) {
    return (
      <div className="min-h-dvh bg-background p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 text-sm text-foreground">
            <p className="font-semibold text-gold-dark mb-1">Atualização de cadastro obrigatória</p>
            <p className="text-muted-foreground">
              {!discordValido
                ? <>Seu <strong>ID do Discord</strong> está ausente ou fora do padrão. Informe apenas o <strong>ID numérico</strong> (17 a 20 dígitos), <strong>não</strong> o nome de usuário, e clique em <strong>Salvar Alterações</strong> para continuar.</>
                : <>Para continuar utilizando o sistema, revise e confirme suas informações pessoais. Preencha corretamente todos os campos e clique em <strong>Salvar Alterações</strong>.</>}
            </p>
          </div>
          <MeuPerfilSection />
        </div>
      </div>
    );
  }


  const renderSection = () => {
    const content = (() => {
      switch (activeSection) {
        case "dashboard": return <DashboardHome onNavigate={setActiveSection} />;
        case "meu-perfil": return <MeuPerfilSection />;
        case "processos": return <ProcessosSection initialProcessoId={openProcessoId} />;
        case "meus-processos": return <MeusProcessosSection onOpenProcesso={(id) => { setOpenProcessoId(id); setActiveSection("processos"); }} />;
        case "consulta": return <ConsultaPublicaSection />;
        case "magistrado": return <MagistradoSection />;
        case "tribunal": return <TribunalSection onOpenProcesso={(id) => { setOpenProcessoId(id); setActiveSection("processos"); }} />;
        case "jurisprudencia": return <JurisprudenciaSection />;
        case "mp": return <MPSection />;
        case "audiencias": return <AudienciasSection />;
        case "oab": return <OABSection />;
        case "cargos": return <CargosSection />;
        case "usuarios": return <UsuariosSection />;
        case "aprovacoes": return <AprovacoesSection />;
        case "estatisticas": return <EstatisticasSection />;
        case "concursos": return <ConcursosSection />;
        case "cartorio": return <CartorarioSection />;
        case "tco": return <TCOSection />;
        case "triagem-bo": return <TriagemBOSection onNavigate={setActiveSection} />;
        case "jurados": return <JuradosSection onOpenProcesso={(id) => { setOpenProcessoId(id); setActiveSection("processos"); }} />;
        case "modelos": return <ModelosSection />;
        default: return <DashboardHome />;
      }
    })();

    // DashboardHome é eager — não precisa de Suspense
    if (activeSection === "dashboard") {
      return <ErrorBoundary>{content}</ErrorBoundary>;
    }

    return (
      <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          {content}
        </Suspense>
      </ErrorBoundary>
    );
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
      <Dialog open={avatarReminderOpen} onOpenChange={setAvatarReminderOpen}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-gold" />
              Foto de perfil obrigatória
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Como membro togado, é obrigatório manter sua foto de perfil atualizada no sistema.
            Adicione ou atualize sua foto agora para continuar utilizando as funcionalidades da plataforma.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setAvatarReminderOpen(false)}>
              Depois
            </Button>
            <Button
              onClick={() => {
                setAvatarReminderOpen(false);
                setActiveSection("meu-perfil");
              }}
            >
              Adicionar agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Index;

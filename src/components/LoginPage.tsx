import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import ConsultaPublicaSection from "@/components/sections/ConsultaPublicaSection";
import AIChatbotInstitucional from "@/components/AIChatbotInstitucional";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import PublicHighlightsCarousel from "@/components/PublicHighlightsCarousel";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Scale, Shield, Gavel, BookOpen, Building2, Users, FileText, Briefcase,
  Phone, MapPin, Clock, ChevronRight, ChevronDown, ExternalLink, GraduationCap, Stamp, Heart, Home, ScrollText, FileSignature, Baby, AlertTriangle, Menu, Landmark, Calculator } from
"lucide-react";
import logoTjsp from "@/assets/logo-tjsp.png";
import logoMpsp from "@/assets/logo-mpsp.png";
import logoOabsp from "@/assets/logo-oabsp.png";
import logoSjc from "@/assets/logo-sjc.jpg";
import govLogo from "@/assets/gov-logo.png";
import logoCartorio from "@/assets/logo-cartorio-sp.png";
import logoDefensoriaAsset from "@/assets/logo-defensoria-sp.jpg.asset.json";
const logoDefensoria = logoDefensoriaAsset.url;
import { toast } from "sonner";
import { formatTelefoneIngame } from "@/lib/formatPhone";
import { uploadArquivoAnexo } from "@/lib/r2Files";
import FileUploadZone from "@/components/sections/FileUploadZone";

type Tab = "inicio" | "institucional" | "transparencia" | "concursos" | "login" | "credencial" | "ouvidoria" | "unisp";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [discord, setDiscord] = useState("");
  const [idPersonagem, setIdPersonagem] = useState("");
  const [telefoneIngame, setTelefoneIngame] = useState("");
  const [loading, setLoading] = useState(false);
  const [unispOptIn, setUnispOptIn] = useState(false);
  const [unispAreaInteresse, setUnispAreaInteresse] = useState("juridico_publico");
  const [unispMotivacao, setUnispMotivacao] = useState("");
  const [juradoOptIn, setJuradoOptIn] = useState(false);
  const [juradoTermoOpen, setJuradoTermoOpen] = useState(false);
  const [juradoTermoAceito, setJuradoTermoAceito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const discordLimpo = discord.replace(/\D/g, "");
        if (!discordLimpo) {
          toast.error("Informe o ID do Discord.");
          setLoading(false);
          return;
        }
        if (discordLimpo.length < 17 || discordLimpo.length > 20) {
          toast.error("ID do Discord inválido. Deve conter entre 17 e 20 dígitos numéricos.");
          setLoading(false);
          return;
        }
        if (unispOptIn && !unispMotivacao.trim()) {
          toast.error("Preencha a motivação para inscrição na UNISP.");
          setLoading(false);
          return;
        }
        if (juradoOptIn && !juradoTermoAceito) {
          toast.error("Você marcou inscrição como jurado mas não confirmou o Termo de Ciência.");
          setLoading(false);
          return;
        }
        const { data, error } = await signUp(email, password, nome, {
          discord: discordLimpo,
          id_personagem: idPersonagem,
          telefone_ingame: telefoneIngame
        });
        if (error) throw error;
        if (data?.user && unispOptIn) {
          await supabase.from("inscricoes_unisp").insert({
            user_id: data.user.id,
            nome_completo: nome.trim(),
            email: email.trim() || null,
            telefone: telefoneIngame.trim() || null,
            id_personagem: idPersonagem.trim() || null,
            motivacao: unispMotivacao.trim(),
            area_interesse: unispAreaInteresse,
          });
        }
        if (data?.user && juradoOptIn && juradoTermoAceito) {
          await supabase.from("jurados").insert({
            user_id: data.user.id,
            nome_completo: nome.trim(),
            id_personagem: idPersonagem.trim() || null,
            disponibilidade: "integral",
            status: "ativo",
          });
        }
        const msgs: string[] = ["Conta criada com sucesso!"];
        if (unispOptIn) msgs.push("Inscrição UNISP enviada.");
        if (juradoOptIn) msgs.push("Cadastro como jurado realizado.");
        toast.success(msgs.join(" "));
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const tabs: {id: Tab;label: string;}[] = [
  { id: "inicio", label: "Início" },
  { id: "ouvidoria", label: "Ouvidoria MP" },
  { id: "concursos", label: "Concursos" },
  { id: "unisp", label: "UNISP" }];

  type MenuItem =
    | { kind: "tab"; tab: Tab; label: string; icon: any; desc: string }
    | { kind: "link"; href: string; label: string; icon: any; desc: string };

  const institucionalItems: MenuItem[] = [
    { kind: "tab", tab: "institucional", label: "Institucional", icon: Building2, desc: "Sobre a Secretaria e a Comarca" },
    { kind: "tab", tab: "transparencia", label: "Transparência", icon: FileText, desc: "Dados abertos e prestação de contas" },
  ];
  const consultaPublica: MenuItem[] = [
    { kind: "tab", tab: "credencial", label: "Consultar Credencial", icon: Scale, desc: "Verificar carteira de servidor, advogado, juiz ou promotor" },
    { kind: "link", href: "/codigo-penal", label: "Código Penal", icon: BookOpen, desc: "Íntegra dos artigos penais" },
    { kind: "link", href: "/ordenamento", label: "Ordenamento Jurídico", icon: Landmark, desc: "Constituição, Decretos-Lei e Códigos" },
    { kind: "link", href: "/calculadora", label: "Calculadora de Custas", icon: Calculator, desc: "Custas processuais conforme o Decreto-Lei 001/2024" },
  ];
  const [publicMenuOpenMobile, setPublicMenuOpenMobile] = useState(true);
  const [institucionalOpenMobile, setInstitucionalOpenMobile] = useState(true);

  const handleMenuItem = (item: MenuItem) => {
    if (item.kind === "tab") {
      setActiveTab(item.tab);
      setMobileMenuOpen(false);
    }
  };


  return (
    <div className="min-h-dvh flex flex-col bg-background">

      {/* Header */}
      <header className="bg-institutional border-b border-sidebar-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={logoSjc} alt="SJC-SP" className="h-10 sm:h-14 rounded-lg drop-shadow flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-sm sm:text-xl lg:text-2xl font-bold text-sidebar-foreground leading-tight truncate">
                Secretaria da Justiça e Cidadania
              </h1>
              <p className="text-[9px] sm:text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
                Estado de São Paulo — Jaguaré RP
              </p>
            </div>

            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground hover:bg-sidebar-foreground/10 flex-shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:max-w-sm bg-institutional border-sidebar-border p-0 flex flex-col">
                <SheetHeader className="p-5 border-b border-sidebar-border">
                  <SheetTitle className="text-sidebar-foreground font-display text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
                  {tabs.map((tab) => {
                    const ativo = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                        className={`text-left px-4 py-3 rounded-lg text-sm transition-colors ${ativo ? "bg-gold/15 text-gold font-semibold border-l-2 border-gold" : "text-sidebar-foreground/80 hover:bg-sidebar-foreground/10"}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                  <div className="my-2 border-t border-sidebar-border" />
                  <button
                    onClick={() => { setActiveTab("login"); setMobileMenuOpen(false); }}
                    className="text-left px-4 py-3 rounded-lg text-sm font-semibold bg-gold text-institutional-dark hover:bg-gold-light flex items-center gap-2"
                  >
                    <img src={govLogo} alt="" className="h-4" />
                    Acesso ao Sistema
                  </button>
                  <div className="my-2 border-t border-sidebar-border" />
                  <Collapsible open={institucionalOpenMobile} onOpenChange={setInstitucionalOpenMobile}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors">
                      <span>Institucional</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${institucionalOpenMobile ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex flex-col gap-1 mt-1">
                      {institucionalItems.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleMenuItem(item)}
                          className="pl-6 pr-4 py-3 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 flex items-center gap-2 border-l-2 border-gold/30 ml-2 text-left"
                        >
                          <item.icon className="h-4 w-4 text-gold" />
                          <span className="flex-1">{item.label}</span>
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                  <div className="my-2 border-t border-sidebar-border" />
                  <Collapsible open={publicMenuOpenMobile} onOpenChange={setPublicMenuOpenMobile}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors">
                      <span>Consulta pública</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${publicMenuOpenMobile ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex flex-col gap-1 mt-1">
                      {consultaPublica.map((item, idx) => (
                        item.kind === "link" ? (
                          <a key={idx} href={item.href} target="_blank" rel="noopener noreferrer" className="pl-6 pr-4 py-3 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 flex items-center gap-2 border-l-2 border-gold/30 ml-2">
                            <item.icon className="h-4 w-4 text-gold" />
                            <span className="flex-1">{item.label}</span>
                            <ExternalLink className="h-3 w-3 text-sidebar-foreground/40" />
                          </a>
                        ) : (
                          <button
                            key={idx}
                            onClick={() => handleMenuItem(item)}
                            className="pl-6 pr-4 py-3 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-foreground/10 flex items-center gap-2 border-l-2 border-gold/30 ml-2 text-left"
                          >
                            <item.icon className="h-4 w-4 text-gold" />
                            <span className="flex-1">{item.label}</span>
                          </button>
                        )
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Navigation Tabs — desktop only */}
        <div className="max-w-7xl mx-auto px-4 hidden lg:block">
          <nav className="flex gap-0 overflow-x-auto">
            {tabs.map((tab) =>
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id ?
              "border-gold text-gold" :
              "border-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground/80 hover:border-sidebar-foreground/30"}`
              }>
                {tab.label}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 flex items-center gap-1 outline-none data-[state=open]:text-gold data-[state=open]:border-gold ${
                institucionalItems.some((i) => i.kind === "tab" && i.tab === activeTab)
                  ? "border-gold text-gold"
                  : "border-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground/80 hover:border-sidebar-foreground/30"
              }`}>
                Institucional
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-institutional border-sidebar-border w-72">
                <DropdownMenuLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest">
                  Sobre a Secretaria
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-sidebar-border" />
                {institucionalItems.map((item, idx) => (
                  <DropdownMenuItem key={idx} onClick={() => handleMenuItem(item)} className="focus:bg-gold/10 focus:text-gold cursor-pointer flex items-start gap-3 py-2.5">
                    <item.icon className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-sidebar-foreground">{item.label}</div>
                      <div className="text-[11px] text-sidebar-foreground/50">{item.desc}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 flex items-center gap-1 outline-none data-[state=open]:text-gold data-[state=open]:border-gold ${
                consultaPublica.some((i) => i.kind === "tab" && i.tab === activeTab)
                  ? "border-gold text-gold"
                  : "border-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground/80 hover:border-sidebar-foreground/30"
              }`}>
                Consulta Pública
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-institutional border-sidebar-border w-72">
                <DropdownMenuLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest">
                  Acervo Público — sem login
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-sidebar-border" />
                {consultaPublica.map((item, idx) => (
                  item.kind === "link" ? (
                    <DropdownMenuItem key={idx} asChild className="focus:bg-gold/10 focus:text-gold cursor-pointer">
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 py-2.5">
                        <item.icon className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-sidebar-foreground">{item.label}</div>
                          <div className="text-[11px] text-sidebar-foreground/50">{item.desc}</div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-sidebar-foreground/40 mt-1" />
                      </a>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem key={idx} onClick={() => handleMenuItem(item)} className="focus:bg-gold/10 focus:text-gold cursor-pointer flex items-start gap-3 py-2.5">
                      <item.icon className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-sidebar-foreground">{item.label}</div>
                        <div className="text-[11px] text-sidebar-foreground/50">{item.desc}</div>
                      </div>
                    </DropdownMenuItem>
                  )
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => setActiveTab("login")}
              className={`ml-auto px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "login" ?
              "border-gold text-gold" :
              "border-transparent text-gold/70 hover:text-gold"}`
              }>
              <img src={govLogo} alt="" className="h-4" />
              Acesso ao Sistema
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}>
            
            {activeTab === "inicio" && <TabInicio onNavigate={setActiveTab} />}
            {activeTab === "concursos" && <TabConcursos onNavigate={setActiveTab} />}
            {activeTab === "institucional" && <TabInstitucional />}
            
            {activeTab === "credencial" && <TabCredencial />}
            {activeTab === "ouvidoria" && <TabOuvidoria />}
            {activeTab === "unisp" && <TabUnisp onNavigate={setActiveTab} />}
            {activeTab === "transparencia" && <TabTransparencia />}
            
            {activeTab === "login" &&
            <TabLogin
              isSignUp={isSignUp}
              setIsSignUp={setIsSignUp}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              nome={nome}
              setNome={setNome}
              discord={discord}
              setDiscord={setDiscord}
              idPersonagem={idPersonagem}
              setIdPersonagem={setIdPersonagem}
              telefoneIngame={telefoneIngame}
              setTelefoneIngame={setTelefoneIngame}
              loading={loading}
              handleSubmit={handleSubmit}
              unispOptIn={unispOptIn}
              setUnispOptIn={setUnispOptIn}
              unispAreaInteresse={unispAreaInteresse}
              setUnispAreaInteresse={setUnispAreaInteresse}
              unispMotivacao={unispMotivacao}
              setUnispMotivacao={setUnispMotivacao}
              juradoOptIn={juradoOptIn}
              setJuradoOptIn={setJuradoOptIn}
              juradoTermoOpen={juradoTermoOpen}
              setJuradoTermoOpen={setJuradoTermoOpen}
              juradoTermoAceito={juradoTermoAceito}
              setJuradoTermoAceito={setJuradoTermoAceito} />

            }
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-institutional-dark text-sidebar-foreground/50 text-[11px] py-6">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>Este sistema é destinado exclusivamente para uso em Roleplay (RP).</p>
          <p className="mt-3 text-accent/50 text-xs">
            Sistema produzido por:{" "}
            <a href="https://discord.com/users/meinhaus" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-medium">
              Mein Haus
            </a>{" "}
            — Todos os direitos reservados
          </p>
        </div>
      </footer>

      <AIChatbotInstitucional
        destinos={[
          { id: "inicio", label: "Página Inicial" },
          { id: "institucional", label: "Institucional", desc: "sobre a Secretaria e a Comarca" },
          { id: "ouvidoria", label: "Ouvidoria do MP", desc: "denúncias ao Ministério Público, sem login" },
          { id: "credencial", label: "Consulta de Credenciais", desc: "verificar carteira/credencial de servidor, advogado, promotor, juiz (NÃO consulta processos)" },
          { id: "transparencia", label: "Transparência" },
          { id: "concursos", label: "Concursos Públicos" },
          { id: "unisp", label: "UNISP", desc: "inscrição na universidade da segurança pública" },
          { id: "login", label: "Acesso ao Sistema", desc: "login e cadastro" },
        ]}
        onNavigate={(id) => setActiveTab(id as Tab)}
        activeSection={activeTab}

      />
    </div>);

}

/* ─── Tab Components ─── */

function TabInicio({ onNavigate }: {onNavigate: (tab: Tab) => void;}) {
  const cards = [
  { icon: FileText, title: "Consulta de Processos", desc: "Acompanhe processos judiciais em andamento na Comarca (requer login).", action: "Consultar", tab: "login" as Tab },
  { icon: Stamp, title: "Cartório Civil", desc: "Certidões de nascimento, casamento, óbito, escrituras e mais.", action: "Saiba Mais", tab: "login" as Tab },
  { icon: Scale, title: "Ministério Público", desc: "Portal do Ministério Público para denúncias e pareceres.", action: "Acessar", tab: "login" as Tab },
  { icon: GraduationCap, title: "Concursos Públicos", desc: "Editais abertos, inscrições e resultados de concursos.", action: "Ver Editais", tab: "concursos" as Tab },
  { icon: Users, title: "Portal da OAB", desc: "Cadastro de advogados, carteira digital e honorários.", action: "Acessar", tab: "login" as Tab },
  { icon: Shield, title: "Ouvidoria MP", desc: "Envie denúncias ao Ministério Público sem precisar de login.", action: "Denunciar", tab: "ouvidoria" as Tab }];


  return (
    <div>
      {/* Hero */}
      <div className="gradient-institutional py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl lg:text-5xl font-bold text-sidebar-foreground mb-4">
            
            Justiça e Cidadania para todos
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sidebar-foreground/60 max-w-2xl mx-auto mb-8">
            
            O Portal da Secretaria da Justiça e Cidadania de São Paulo oferece serviços digitais 
            integrados para cidadãos, advogados e servidores da justiça.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3">
            
            <Button
              onClick={() => onNavigate("login")}
              className="rounded-xl h-12 px-8 bg-gold hover:bg-gold-light text-institutional-dark font-semibold">
              
              Acessar o Sistema
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              onClick={() => onNavigate("credencial")}
              variant="outline"
              className="rounded-xl h-12 px-8 border-gold text-gold hover:bg-gold/10 font-semibold text-base">
              
              <Scale className="mr-2 h-5 w-5" />
              Consultar Credencial
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Destaques públicos — Carrossel */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 sm:-mt-8 relative z-10">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-gold rounded-full" />
            <h2 className="font-display text-sm sm:text-base font-bold text-sidebar-foreground uppercase tracking-[0.2em]">
              Destaques Públicos
            </h2>
          </div>
          <span className="text-[10px] sm:text-xs text-sidebar-foreground/60 flex items-center gap-1.5">
            <span className="hidden sm:inline">Deslize para ver mais</span>
            <span className="sm:hidden">Arraste →</span>
          </span>
        </div>
        <PublicHighlightsCarousel />
      </div>


      {/* Service Cards */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h3 className="font-display text-xl font-semibold text-foreground mb-6">
          Serviços em Destaque
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) =>
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => onNavigate(card.tab)}
            className="bg-card rounded-xl p-6 border border-border shadow-institutional hover:shadow-gold/10 transition-all group cursor-pointer">
            
              <card.icon className="h-8 w-8 text-institutional mb-3" />
              <h4 className="font-display text-base font-semibold text-foreground mb-1">{card.title}</h4>
              <p className="text-sm text-muted-foreground mb-4">{card.desc}</p>
              <span className="text-xs font-semibold text-gold group-hover:text-gold-dark flex items-center gap-1 transition-colors">
                {card.action} <ChevronRight className="h-3 w-3" />
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Jurados CTA Banner */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => onNavigate("login")}
          className="relative overflow-hidden rounded-2xl border-2 border-gold/30 bg-gradient-to-r from-institutional via-institutional-dark to-institutional p-8 cursor-pointer hover:border-gold/60 transition-all group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-gold/20 rounded-2xl p-4">
              <Users className="h-12 w-12 text-gold" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">Inscrições Abertas</span>
              <h3 className="font-display text-2xl font-bold text-sidebar-foreground mt-1">
                Tribunal do Júri — Cadastro de Jurados
              </h3>
              <p className="text-sidebar-foreground/60 text-sm mt-2 max-w-2xl">
                Cidadãos maiores de 18 anos podem se cadastrar para compor o <strong className="text-gold">Conselho de Sentença</strong>. 
                Faça parte da justiça e ajude a decidir casos importantes da Comarca.
              </p>
            </div>
            <Button className="rounded-xl h-12 px-8 bg-gold hover:bg-gold-light text-institutional-dark font-semibold whitespace-nowrap group-hover:scale-105 transition-transform">
              Cadastrar-se como Jurado
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* UNISP CTA Banner - Redirecionamento */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => window.open("https://unisp.lovable.app/", "_blank")}
          className="relative overflow-hidden rounded-2xl border-2 border-accent/30 bg-gradient-to-r from-secondary via-background to-secondary p-8 cursor-pointer hover:border-accent/60 transition-all group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-accent/20 rounded-2xl p-4">
              <GraduationCap className="h-12 w-12 text-accent" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold">Novo Endereço</span>
              <h3 className="font-display text-2xl font-bold text-foreground mt-1">
                UNISP — Universidade de Direito do Estado de São Paulo
              </h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
                <strong className="text-accent">Atenção:</strong> O portal da UNISP mudou! Acesse agora em <strong className="text-accent">unisp.lovable.app</strong> para inscrições, cursos e informações acadêmicas.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl h-12 px-8 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold whitespace-nowrap group-hover:scale-105 transition-transform">
              Acessar Novo Portal
              <ExternalLink className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* News / Updates */}
      <div className="bg-secondary/50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="font-display text-xl font-semibold text-foreground mb-6">Últimas Notícias</h3>
          <div className="space-y-3">
            {[
            { date: "19/03/2026", title: "Sistema Judiciário Eletrônico entra em operação na Comarca" },
            { date: "15/03/2026", title: "Novas varas judiciais são criadas para atender demanda crescente" },
            { date: "12/03/2026", title: "Portal de Consulta Pública amplia acesso à informação processual" }].
            map((news) =>
            <div key={news.title} className="bg-card rounded-lg p-4 border border-border flex items-center gap-4">
                <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{news.date}</span>
                <p className="text-sm text-foreground font-medium">{news.title}</p>
                <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>);

}

function TabInstitucional() {
  const categorias: {
    id: string;
    titulo: string;
    subtitulo: string;
    icon: any;
    orgaos: {
      logo: string;
      name: string;
      sigla: string;
      desc: string;
      competencias: string[];
    }[];
  }[] = [
    {
      id: "judiciario",
      titulo: "Poder Judiciário",
      subtitulo: "Órgão de cúpula da administração da justiça no Estado",
      icon: Gavel,
      orgaos: [
        {
          logo: logoTjsp,
          name: "Tribunal de Justiça",
          sigla: "TJSP",
          desc: "Órgão máximo do Poder Judiciário estadual, responsável pela administração da justiça e julgamento de recursos em segunda instância.",
          competencias: ["Julgar recursos cíveis e criminais", "Administrar a justiça estadual", "Nomear magistrados", "Supervisionar comarcas"],
        },
      ],
    },
    {
      id: "essenciais",
      titulo: "Funções Essenciais à Justiça",
      subtitulo: "Instituições permanentes essenciais à função jurisdicional (CF, arts. 127 a 135)",
      icon: Scale,
      orgaos: [
        {
          logo: logoMpsp,
          name: "Ministério Público",
          sigla: "MPSP",
          desc: "Instituição essencial à função jurisdicional do Estado, responsável pela defesa da ordem jurídica e dos interesses sociais.",
          competencias: ["Oferecer denúncias criminais", "Fiscalizar o cumprimento da lei", "Defender interesses coletivos", "Expedir recomendações"],
        },
        {
          logo: logoDefensoria,
          name: "Defensoria Pública",
          sigla: "DPESP",
          desc: "Instituição permanente essencial à função jurisdicional do Estado, incumbida da orientação jurídica, promoção dos direitos humanos e defesa integral, judicial e extrajudicial, dos necessitados.",
          competencias: ["Assistência jurídica gratuita", "Defesa criminal de hipossuficientes", "Tutela coletiva de vulneráveis", "Mediação e conciliação"],
        },
        {
          logo: logoOabsp,
          name: "Ordem dos Advogados",
          sigla: "OAB-SP",
          desc: "Entidade responsável pela regulamentação da advocacia, defesa das prerrogativas profissionais e fiscalização ética.",
          competencias: ["Cadastrar advogados", "Emitir carteiras profissionais", "Fiscalizar a advocacia", "Definir tabela de honorários"],
        },
      ],
    },
    {
      id: "extrajudicial",
      titulo: "Serviços Extrajudiciais",
      subtitulo: "Serviços delegados de registro público e notas",
      icon: Stamp,
      orgaos: [
        {
          logo: logoCartorio,
          name: "Cartório de Registro Civil",
          sigla: "CRC",
          desc: "Serviço extrajudicial responsável pelo registro de atos da vida civil, emissão de certidões, escrituras públicas, procurações e autenticação de documentos.",
          competencias: ["Certidões de Nascimento, Casamento e Óbito", "Escrituras Públicas e Contratos", "Procurações e Reconhecimento de Firma", "Registro de Adoção e Divórcio"],
        },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Cabeçalho */}
      <div className="mb-10 border-l-4 border-gold pl-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold mb-1">Estrutura Institucional</p>
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground">Sistema de Justiça</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Conheça os órgãos e instituições que compõem o sistema de justiça no Estado de São Paulo, suas
          competências constitucionais e o papel de cada um na garantia dos direitos da cidadania.
        </p>
      </div>

      {/* Categorias */}
      <div className="space-y-12">
        {categorias.map((cat, ci) => (
          <motion.section
            key={cat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.08 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-lg bg-gold/10 border border-gold/30">
                <cat.icon className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground leading-tight">{cat.titulo}</h3>
                <p className="text-xs text-muted-foreground">{cat.subtitulo}</p>
              </div>
              <div className="flex-1 h-px bg-border ml-2" />
            </div>

            <div className={`grid gap-4 ${cat.orgaos.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-1"}`}>
              {cat.orgaos.map((org, i) => (
                <motion.div
                  key={org.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.08 + i * 0.05 }}
                  className="group bg-card rounded-xl border border-border hover:border-gold/50 shadow-institutional hover:shadow-lg transition-all overflow-hidden flex flex-col"
                >
                  <div className="p-5 pb-4 border-b border-border bg-secondary/30 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background border border-border flex-shrink-0">
                      <img src={org.logo} alt={org.name} className="h-10 w-10 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display text-base font-bold text-foreground leading-tight truncate">{org.name}</h4>
                      <span className="text-[10px] uppercase tracking-widest text-gold font-mono">{org.sigla}</span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{org.desc}</p>
                    <div className="mt-auto space-y-1.5">
                      <p className="text-[10px] uppercase tracking-widest text-foreground/60 font-semibold mb-2">Competências</p>
                      {org.competencias.map((c) => (
                        <div key={c} className="flex items-start gap-2 text-xs text-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0 mt-1.5" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}

function TabCredencial() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="max-w-4xl">
        <ConsultaPublicaSection />
      </div>
    </div>
  );
}

function TabOuvidoria() {
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [descricao, setDescricao] = useState("");
  const [envolvidos, setEnvolvidos] = useState<{ nome: string; funcao: string }[]>([]);
    const [links, setLinks] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; name: string }[]>([]);
  const [novoEnvolvidoNome, setNovoEnvolvidoNome] = useState("");
  const [novoEnvolvidoFuncao, setNovoEnvolvidoFuncao] = useState("");
    const [novoLink, setNovoLink] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [statusEnvio, setStatusEnvio] = useState("");
  const [enviado, setEnviado] = useState(false);

  const addEnvolvido = () => {
    if (!novoEnvolvidoNome.trim()) return;
    setEnvolvidos([...envolvidos, { nome: novoEnvolvidoNome.trim(), funcao: novoEnvolvidoFuncao.trim() }]);
    setNovoEnvolvidoNome("");
    setNovoEnvolvidoFuncao("");
  };

  const removeEnvolvido = (i: number) => setEnvolvidos(envolvidos.filter((_, idx) => idx !== i));

    const addLink = () => {
    const url = novoLink.trim();
    if (!url) return;
    if (!/^https:\/\//i.test(url)) {
      toast.error("Informe um link externo iniciado por https://.");
      return;
    }
    setLinks([...links, url]);
    setNovoLink("");
  };

  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));

    const handleEnviar = async () => {
    if (!descricao.trim()) {
      toast.error("Descreva os fatos da denúncia.");
      return;
    }
    setEnviando(true);
    try {
      const urlsR2: string[] = [];
      for (let index = 0; index < arquivosPendentes.length; index += 1) {
        setStatusEnvio(`Enviando arquivo ${index + 1} de ${arquivosPendentes.length}...`);
        urlsR2.push(await uploadArquivoAnexo(arquivosPendentes[index], "ouvidoria"));
      }

      setStatusEnvio("Gravando denúncia...");
      const { error } = await supabase.from("denuncias_ouvidoria" as any).insert({
        nome_denunciante: nome.trim() || "Anônimo",
        contato_denunciante: contato.trim() || null,
        descricao: descricao.trim(),
        envolvidos: envolvidos.length > 0 ? envolvidos : [],
        links: [...links, ...urlsR2],
      } as any);
      if (error) throw error;
      setArquivosPendentes([]);
      toast.success("Denúncia enviada com sucesso! O Ministério Público irá analisar.");
      setEnviado(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar denúncia. Seus arquivos continuam na fila para nova tentativa.");
    } finally {
      setEnviando(false);
      setStatusEnvio("");
    }
  };

  if (enviado) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Denúncia Recebida</h2>
          <p className="text-muted-foreground mb-6">
            Sua denúncia foi registrada com sucesso e será analisada pelo Ministério Público. 
            O sigilo da sua identidade será preservado conforme a legislação vigente.
          </p>
                    <Button onClick={() => { setEnviado(false); setDescricao(""); setEnvolvidos([]); setLinks([]); setArquivosPendentes([]); setNome(""); setContato(""); }}
            variant="outline" className="rounded-xl">
            Enviar Nova Denúncia
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-start gap-4 mb-8">
        <div className="p-3 rounded-xl bg-secondary flex-shrink-0">
          <img src={logoMpsp} alt="MP-SP" className="h-10 w-auto object-contain" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-1">Ouvidoria do Ministério Público</h2>
          <p className="text-muted-foreground text-sm">
            Canal de denúncias para a cidadania. Envie sua denúncia de forma anônima ou identificada. 
            Não é necessário login.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-foreground">Dados do Denunciante (opcional)</h3>
            <p className="text-xs text-muted-foreground">Você pode enviar anonimamente. Se desejar retorno, informe seus dados.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
                <Input placeholder="Anônimo" value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Contato (e-mail ou telefone)</label>
                <Input placeholder="Opcional" value={contato} onChange={e => setContato(e.target.value)} />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-foreground">Relato da Denúncia *</h3>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva detalhadamente os fatos, incluindo datas, locais e circunstâncias..."
              rows={6}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-foreground">Envolvidos</h3>
            <p className="text-xs text-muted-foreground">Identifique as pessoas envolvidas nos fatos (nome e função/cargo se souber).</p>
            <div className="flex gap-2">
              <Input placeholder="Nome" value={novoEnvolvidoNome} onChange={e => setNovoEnvolvidoNome(e.target.value)} className="flex-1" />
              <Input placeholder="Função/Cargo (opcional)" value={novoEnvolvidoFuncao} onChange={e => setNovoEnvolvidoFuncao(e.target.value)} className="flex-1" />
              <Button onClick={addEnvolvido} size="sm" variant="outline" className="rounded-lg">Adicionar</Button>
            </div>
            {envolvidos.length > 0 && (
              <div className="space-y-2">
                {envolvidos.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground">{e.nome}</span>
                    {e.funcao && <span className="text-muted-foreground">— {e.funcao}</span>}
                    <button onClick={() => removeEnvolvido(i)} className="ml-auto text-destructive hover:text-destructive/80 text-xs font-medium">Remover</button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-foreground">Links de Provas e Anexos</h3>
            <p className="text-xs text-muted-foreground">Adicione links para documentos, fotos, vídeos ou outros materiais que comprovem a denúncia.</p>
                        <div className="flex gap-2">
              <Input placeholder="https://drive.google.com/..." value={novoLink} onChange={e => setNovoLink(e.target.value)} className="flex-1" />
              <Button onClick={addLink} size="sm" variant="outline" className="rounded-lg">Adicionar</Button>
            </div>
                        <FileUploadZone
              files={arquivosPendentes}
              disabled={enviando}
              onFilesSelected={(newFiles) => setArquivosPendentes((current) => [...current, ...newFiles])}
              onRemoveFile={(index) => setArquivosPendentes((current) => current.filter((_, fileIndex) => fileIndex !== index))}
            />
            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <a href={l} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline truncate flex-1">{l}</a>
                    <button onClick={() => removeLink(i)} className="text-destructive hover:text-destructive/80 text-xs font-medium">Remover</button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Button onClick={handleEnviar} disabled={enviando || !descricao.trim()} className="w-full h-12 rounded-xl bg-gold hover:bg-gold-light text-institutional-dark font-semibold text-base">
                            {enviando ? statusEnvio || "Enviando..." : "Enviar Denúncia"}
            </Button>
          </motion.div>
        </div>

        {/* Sidebar - Tutorial */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gold" />
              Como anexar provas
            </h3>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">1. Faça upload no Google Drive</p>
                <p>Acesse <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">drive.google.com</a> e envie seus arquivos (fotos, vídeos, documentos).</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">2. Gere o link de compartilhamento</p>
                <p>Clique com o botão direito no arquivo → "Compartilhar" → "Qualquer pessoa com o link pode ver" → Copie o link.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">3. Cole o link no formulário</p>
                <p>No campo "Links de Provas e Anexos", cole o link copiado e clique em "Adicionar".</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold" />
              Sobre o Sigilo
            </h3>
            <p className="text-xs text-muted-foreground">
              A denúncia pode ser feita de forma anônima. Caso se identifique, seus dados serão 
              tratados com sigilo absoluto, conforme previsto em lei. Somente membros do Ministério 
              Público terão acesso às informações.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-gold" />
              O que pode ser denunciado
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-gold mt-1.5 flex-shrink-0" /> Crimes contra a administração pública</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-gold mt-1.5 flex-shrink-0" /> Abuso de autoridade</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-gold mt-1.5 flex-shrink-0" /> Irregularidades em serviços públicos</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-gold mt-1.5 flex-shrink-0" /> Crimes ambientais</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-gold mt-1.5 flex-shrink-0" /> Violações de direitos humanos</li>
              <li className="flex items-start gap-2"><div className="w-1 h-1 rounded-full bg-gold mt-1.5 flex-shrink-0" /> Atos de improbidade administrativa</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TabTransparencia() {
  const [stats, setStats] = useState<any>(null);
  const [servidores, setServidores] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const ROLE_LABELS_T: Record<string, string> = {
    admin: "Administrador",
    magistrado: "Magistrado(a)",
    ministerio_publico: "Promotor(a) de Justiça",
    oficial_justica: "Oficial de Justiça",
    advogado: "Advogado(a)",
    presidente_tribunal: "Presidente do Tribunal",
    desembargador: "Desembargador(a)",
    presidente_oab: "Presidente da OAB",
    procurador_geral: "Procurador(a)-Geral",
    procurador_geral_adjunto: "Procurador(a)-Geral Adjunto(a)",
    bacharel_direito: "Bacharel em Direito",
    delegado: "Delegado(a)",
    policia_civil: "Polícia Civil",
    policia_militar: "Polícia Militar",
    policia_federal: "Polícia Federal",
    hospital: "Hospital",
    detran: "DETRAN",
    investigador: "Investigador(a)",
    procurador_estado: "Procurador(a) Geral do Estado",
    defensor_publico: "Defensor(a) Público(a)",
    defensor_publico_geral: "Defensor(a) Público(a)-Geral",
  };

  useState(() => {
    const load = async () => {
      // Somente cargos institucionais (MP / TJ / DPE / OAB / Cartório)
      const INSTITUCIONAIS = [
        "admin",
        "magistrado",
        "desembargador",
        "presidente_tribunal",
        "oficial_justica",
        "ministerio_publico",
        "procurador_geral",
        "procurador_geral_adjunto",
        "procurador_estado",
        "defensor_publico",
        "defensor_publico_geral",
        "advogado",
        "presidente_oab",
        "bacharel_direito",
      ];

      const [rpcRes, rolesRes] = await Promise.all([
        supabase.rpc("get_processo_stats"),
        supabase.from("user_roles").select("user_id, role").in("role", INSTITUCIONAIS as any),
      ]);

      const rpcData = rpcRes.data as any;
      setStats(rpcData);

      const rolesData = rolesRes.data || [];
      const userRolesMap: Record<string, string[]> = {};
      rolesData.forEach((r: any) => {
        if (!userRolesMap[r.user_id]) userRolesMap[r.user_id] = [];
        userRolesMap[r.user_id].push(r.role);
      });

      const userIds = Object.keys(userRolesMap);
      let profilesList: any[] = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nome_completo, cargo")
          .in("user_id", userIds);
        profilesList = (profiles || []).map((p: any) => ({
          ...p,
          displayRole: (userRolesMap[p.user_id] || [])
            .map((r: string) => ROLE_LABELS_T[r] || r)
            .join(", "),
        }));
      }

      setServidores(profilesList.slice(0, 50));
      setLoadingStats(false);
    };
    load();
  });

  if (loadingStats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-3">Carregando dados...</p>
      </div>
    );
  }

  const porClasse = stats?.por_classe ?? {};
  const porStatus = stats?.por_status ?? {};
  const total = stats?.total ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Portal da Transparência</h2>
      <p className="text-muted-foreground mb-8">Dados públicos e prestação de contas do Poder Judiciário.</p>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processos por Classe */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Processos por Classe</h3>
          {Object.keys(porClasse).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(porClasse).map(([classe, count]) => (
                <div key={classe} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{classe}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full gradient-gold" style={{ width: `${Math.min(((count as number) / (total || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>
          )}
        </div>

        {/* Processos por Status */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Processos por Status</h3>
          {Object.keys(porStatus).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(porStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{(status as string).replace(/_/g, " ")}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-institutional" style={{ width: `${Math.min(((count as number) / (total || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>
          )}
        </div>

        {/* Servidores */}
        {servidores.length > 0 && (
          <div className="bg-card rounded-xl p-6 border border-border shadow-institutional lg:col-span-2">
            <h3 className="font-display text-base font-semibold text-foreground mb-4">Servidores da Comarca</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {servidores.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{m.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{m.displayRole || m.cargo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── Login Tab ─── */

interface LoginProps {
  isSignUp: boolean;
  setIsSignUp: (v: boolean) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  nome: string;
  setNome: (v: string) => void;
  discord: string;
  setDiscord: (v: string) => void;
  idPersonagem: string;
  setIdPersonagem: (v: string) => void;
  telefoneIngame: string;
  setTelefoneIngame: (v: string) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  unispOptIn: boolean;
  setUnispOptIn: (v: boolean) => void;
  unispAreaInteresse: string;
  setUnispAreaInteresse: (v: string) => void;
  unispMotivacao: string;
  setUnispMotivacao: (v: string) => void;
  juradoOptIn: boolean;
  setJuradoOptIn: (v: boolean) => void;
  juradoTermoOpen: boolean;
  setJuradoTermoOpen: (v: boolean) => void;
  juradoTermoAceito: boolean;
  setJuradoTermoAceito: (v: boolean) => void;
}

function TabLogin(props: LoginProps) {
  const {
    isSignUp, setIsSignUp, email, setEmail, password, setPassword,
    nome, setNome, discord, setDiscord, idPersonagem, setIdPersonagem,
    telefoneIngame, setTelefoneIngame, loading, handleSubmit,
    unispOptIn, setUnispOptIn, unispAreaInteresse, setUnispAreaInteresse, unispMotivacao, setUnispMotivacao,
    juradoOptIn, setJuradoOptIn, juradoTermoOpen, setJuradoTermoOpen, juradoTermoAceito, setJuradoTermoAceito
  } = props;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className={`mx-auto ${isSignUp ? 'max-w-lg' : 'max-w-md'}`}>
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground">
            {isSignUp ? "Criar Conta GOV" : "Acesso GOV.BR"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ?
            "Registre-se no sistema jurídico" :
            "Faça login com sua conta do sistema judiciário."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp &&
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                  Nome Completo (IN GAME)
                </label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo do seu personagem" required className="rounded-lg h-11" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                  ID do Discord <span className="text-destructive">*</span>
                </label>
                <Input
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value.replace(/\D/g, "").slice(0, 20))}
                  inputMode="numeric"
                  pattern="[0-9]{17,20}"
                  minLength={17}
                  maxLength={20}
                  title="O ID do Discord deve conter entre 17 e 20 dígitos numéricos."
                  placeholder="Apenas números (ex.: 123456789012345678)"
                  required
                  className="rounded-lg h-11"
                />
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  Informe apenas o <b>ID numérico</b> (17 a 20 dígitos), <b>não</b> o nome de usuário. No Discord, ative <b>Configurações → Avançado → Modo de Desenvolvedor</b>, clique com o botão direito no seu nome e escolha <b>"Copiar ID de usuário"</b>.
                </p>

              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                    ID Personagem
                  </label>
                  <Input value={idPersonagem} onChange={(e) => setIdPersonagem(e.target.value)} placeholder="ID RP" required className="rounded-lg h-11" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
                    Tel. In-Game
                  </label>
                  <Input value={telefoneIngame} onChange={(e) => setTelefoneIngame(formatTelefoneIngame(e.target.value))} placeholder="(14) 9 0000-0000" maxLength={16} required className="rounded-lg h-11" />
                </div>
              </div>

              {/* Opção de cadastro como Jurado Voluntário */}
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={juradoOptIn}
                    onCheckedChange={(v) => {
                      const checked = v === true;
                      if (checked) {
                        setJuradoTermoOpen(true);
                      } else {
                        setJuradoOptIn(false);
                        setJuradoTermoAceito(false);
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-accent" />
                      Desejo me cadastrar também como Jurado Voluntário
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Você poderá ser sorteado para compor o Conselho de Sentença em sessões do Tribunal do Júri.
                      {juradoOptIn && juradoTermoAceito && (
                        <span className="block text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                          ✓ Termo de Ciência aceito
                        </span>
                      )}
                    </p>
                  </div>
                </label>
              </div>

            </motion.div>
          }

          {/* Dialog do Termo de Ciência do Jurado */}
          <Dialog open={juradoTermoOpen} onOpenChange={(open) => {
            setJuradoTermoOpen(open);
            if (!open && !juradoTermoAceito) {
              setJuradoOptIn(false);
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Termo de Ciência e Compromisso — Jurado Voluntário
                </DialogTitle>
                <DialogDescription>
                  Leia atentamente antes de aceitar. Este termo possui validade legal.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Ao se inscrever como jurado voluntário, declaro estar ciente de que:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Servir como jurado é um <strong className="text-foreground">dever cívico obrigatório</strong> nos termos da legislação processual penal.</li>
                  <li>Posso ser <strong className="text-foreground">sorteado a qualquer momento</strong> pelo Presidente do Tribunal de Justiça para compor o Conselho de Sentença em sessões do Tribunal do Júri.</li>
                  <li>A convocação será feita por <strong className="text-foreground">intimação oficial</strong> através deste sistema, devendo eu acompanhar minhas notificações.</li>
                  <li>Devo comparecer à sessão na <strong className="text-foreground">data, hora e local indicados</strong> na intimação, sob pena das sanções abaixo.</li>
                  <li>
                    O <strong className="text-foreground">não comparecimento injustificado</strong> à sessão para a qual for convocado poderá ensejar:
                    <ul className="list-[circle] pl-5 mt-1 space-y-1">
                      <li>Responsabilização pelo <strong className="text-destructive">crime de desobediência</strong> (art. 330 do Código Penal);</li>
                      <li>Aplicação de <strong className="text-destructive">multa de R$ 50.000,00 a R$ 500.000,00</strong>, conforme decisão do juízo competente.</li>
                    </ul>
                  </li>
                  <li>Posso desativar minha inscrição a qualquer momento, desde que não haja convocação pendente.</li>
                </ul>

                <label className="flex items-start gap-2 pt-3 mt-3 border-t border-border cursor-pointer">
                  <Checkbox
                    checked={juradoTermoAceito}
                    onCheckedChange={(v) => setJuradoTermoAceito(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium text-foreground">
                    Li e aceito integralmente o Termo de Ciência e Compromisso, estando ciente das sanções aplicáveis em caso de não comparecimento.
                  </span>
                </label>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setJuradoTermoOpen(false);
                    setJuradoOptIn(false);
                    setJuradoTermoAceito(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!juradoTermoAceito}
                  onClick={() => {
                    setJuradoOptIn(true);
                    setJuradoTermoOpen(false);
                  }}
                >
                  Confirmar Inscrição
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div>
            <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
              E-mail (real)        
            </label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="rounded-lg h-11" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-1 block">
              Senha para acesso do sistema    
            </label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="rounded-lg h-11" />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-institutional hover:bg-institutional-light text-gold-light font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2">
            
            <img src={govLogo} alt="" className="h-5" />
            {loading ? "Processando..." : isSignUp ? "Registrar com GOV.BR" : "Entrar com GOV.BR"}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {!isSignUp && (
            <button
              onClick={async () => {
                if (!email) {
                  toast.error("Digite seu e-mail primeiro");
                  return;
                }
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) throw error;
                  toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
                } catch (err: any) {
                  toast.error(err.message || "Erro ao enviar e-mail de recuperação");
                }
              }}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              Esqueci minha senha
            </button>
          )}
          <div>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {isSignUp ? "Já possui conta? Faça login" : "Não possui conta? Registre-se"}
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 rounded-lg bg-secondary/50 border border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            Este é um sistema de Roleplay (RP). O uso do logotipo GOV.BR é meramente ilustrativo 
            para fins de imersão no jogo.
          </p>
        </div>
      </div>
    </div>);

}

function TabConcursos({ onNavigate }: {onNavigate: (tab: Tab) => void;}) {
  const [concursos, setConcursos] = useState<any[]>([]);
  const [loadingConcursos, setLoadingConcursos] = useState(true);

  useEffect(() => {
    supabase
      .from("concursos")
      .select("id, titulo, cargo, vagas, status, data_abertura, data_encerramento_inscricoes, data_prova")
      .in("status", ["inscricoes_abertas", "em_andamento"])
      .order("data_abertura", { ascending: false })
      .then(({ data }) => {
        setConcursos(data || []);
        setLoadingConcursos(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Concursos Públicos</h2>
      <p className="text-muted-foreground mb-8">Editais, inscrições e resultados de concursos do Poder Judiciário.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
        { icon: GraduationCap, title: "Editais Abertos", desc: "Consulte os concursos com inscrições abertas para cargos jurídicos e administrativos." },
        { icon: FileText, title: "Provas e Gabaritos", desc: "Acesse provas anteriores, gabaritos oficiais e resultados publicados." },
        { icon: Users, title: "Classificação", desc: "Confira a lista de aprovados, cadastro de reserva e convocações." }].
        map((item, i) =>
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onNavigate("login")}
          className="bg-card rounded-xl p-5 border border-border shadow-institutional cursor-pointer hover:border-accent transition-colors">
          
            <item.icon className="h-6 w-6 text-gold mb-3" />
            <h4 className="font-display text-sm font-semibold text-foreground mb-1">{item.title}</h4>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </motion.div>
        )}
      </div>

      {/* Lista de concursos abertos */}
      <div className="mb-8">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-gold" />
          Concursos em Destaque
        </h3>
        {loadingConcursos ? (
          <div className="text-sm text-muted-foreground text-center py-8">Carregando concursos...</div>
        ) : concursos.length === 0 ? (
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <p className="text-sm text-muted-foreground">Nenhum concurso aberto ou em andamento no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {concursos.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onNavigate("login")}
                className="bg-card rounded-xl p-5 border border-border shadow-institutional cursor-pointer hover:border-gold/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-gold transition-colors">
                      {c.titulo}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">Cargo: {c.cargo}</p>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span>Vagas: <strong className="text-foreground">{c.vagas}</strong></span>
                      {c.data_abertura && (
                        <span>Abertura: <strong className="text-foreground">{new Date(c.data_abertura).toLocaleDateString("pt-BR")}</strong></span>
                      )}
                      {c.data_encerramento_inscricoes && (
                        <span>Encerramento: <strong className="text-foreground">{new Date(c.data_encerramento_inscricoes).toLocaleDateString("pt-BR")}</strong></span>
                      )}
                      {c.data_prova && (
                        <span>Prova: <strong className="text-foreground">{new Date(c.data_prova).toLocaleDateString("pt-BR")}</strong></span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      c.status === 'em_andamento' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {c.status === 'em_andamento' ? 'Em Andamento' : 'Inscrições Abertas'}
                    </span>
                    <span className="text-[10px] text-gold font-semibold flex items-center gap-1 group-hover:underline">
                      {c.status === 'em_andamento' ? 'Ver Detalhes' : 'Inscrever-se'} <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Informações Importantes</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>• Para se inscrever em concursos, é necessário possuir cadastro no sistema e estar autenticado.</p>
          <p>• Os editais completos, requisitos e conteúdo programático ficam disponíveis após o login.</p>
          <p>• As provas são realizadas de forma digital dentro do sistema, com correção automática para questões objetivas.</p>
          <p>• Resultados e nomeações são publicados diretamente no portal.</p>
        </div>
      </div>
    </div>);

}

function TabUnisp({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Alerta de Redirecionamento */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-accent/10 border-2 border-accent rounded-2xl p-8 mb-8 text-center"
      >
        <div className="bg-accent/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <ExternalLink className="h-8 w-8 text-accent" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Portal da UNISP Mudou de Endereço
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          A UNISP — Universidade de Direito do Estado de São Paulo agora possui 
          um portal exclusivo. Acesse todas as informações sobre cursos, inscrições 
          e atividades acadêmicas no novo endereço:
        </p>
        <Button
          onClick={() => window.open("https://unisp.lovable.app/", "_blank")}
          className="h-14 px-10 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg"
        >
          Acessar unisp.lovable.app
          <ExternalLink className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          O redirecionamento será automático em breve. Atualize seus favoritos.
        </p>
      </motion.div>

      {/* Informações Legado */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Sobre a UNISP</h3>
        <p className="text-sm text-muted-foreground mb-4">
          A UNISP oferece curso prático de Direito <strong className="text-foreground">100% gratuito</strong>, 
          preparando alunos para atuar no sistema jurídico público ou conquistar a inscrição na OAB.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Scale className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
            <span>Carreira Pública: magistratura, promotoria, delegacia</span>
          </div>
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
            <span>Advocacia Privada: exame da OAB e atuação autônoma</span>
          </div>
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
            <span>100% Gratuito: custeado pelo Estado de São Paulo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
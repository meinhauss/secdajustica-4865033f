import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConsultaPublicaSection from "@/components/sections/ConsultaPublicaSection";
import {
  Scale, Shield, Gavel, BookOpen, Building2, Users, FileText,
  Phone, MapPin, Clock, ChevronRight, ExternalLink, GraduationCap } from
"lucide-react";
import logoTjsp from "@/assets/logo-tjsp.png";
import govLogo from "@/assets/gov-logo.png";
import { toast } from "sonner";

type Tab = "inicio" | "institucional" | "servicos" | "transparencia" | "concursos" | "contato" | "login" | "credencial";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [discord, setDiscord] = useState("");
  const [idPersonagem, setIdPersonagem] = useState("");
  const [telefoneIngame, setTelefoneIngame] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, nome, {
          discord,
          id_personagem: idPersonagem,
          telefone_ingame: telefoneIngame
        });
        if (error) throw error;
        toast.success("Conta criada com sucesso! Bem-vindo ao sistema.");
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
  { id: "institucional", label: "Institucional" },
  { id: "servicos", label: "Serviços" },
  { id: "credencial", label: "Consultar Credencial" },
  { id: "transparencia", label: "Transparência" },
  { id: "concursos", label: "Concursos" },
  { id: "contato", label: "Contato" }];


  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Gov Bar */}
      <div className="bg-institutional-dark">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={govLogo} alt="gov.br" className="h-6" />
            <span className="text-[11px] text-sidebar-foreground/60 hidden sm:block">
              Governo da Cidade RP — Estado de São Paulo
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("login")}
              className="flex items-center gap-2 text-[11px] text-gold font-semibold hover:text-gold-light transition-colors">
              
              <img src={govLogo} alt="" className="h-4" />
              Entrar com GOV.BR
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-institutional border-b border-sidebar-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <img src={logoTjsp} alt="SJC-SP" className="h-14 rounded-lg drop-shadow" />
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-bold text-sidebar-foreground leading-tight">
                Secretaria da Justiça e Cidadania
              </h1>
              <p className="text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.2em]">
                Estado de São Paulo — Cidade RP
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4">
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
            {activeTab === "servicos" && <TabServicos />}
            {activeTab === "credencial" && <TabCredencial />}
            {activeTab === "transparencia" && <TabTransparencia />}
            {activeTab === "contato" && <TabContato />}
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
              handleSubmit={handleSubmit} />

            }
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-institutional-dark text-sidebar-foreground/50 text-[11px] py-6">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-accent/60 font-medium">Secretaria da Justiça e Cidadania — Estado de São Paulo — Cidade RP</p>
          <p>Sistema Integrado de Gestão Jurídica • Todos os direitos reservados</p>
          <p>Este sistema é destinado exclusivamente para uso em Roleplay (RP).</p>
        </div>
      </footer>
    </div>);

}

/* ─── Tab Components ─── */

function TabInicio({ onNavigate }: {onNavigate: (tab: Tab) => void;}) {
  const cards = [
  { icon: FileText, title: "Consulta Processual", desc: "Acompanhe processos judiciais em andamento na Comarca.", action: "Consultar", tab: "login" as Tab },
  
  { icon: Scale, title: "Ministério Público", desc: "Portal do Ministério Público para denúncias e pareceres.", action: "Acessar", tab: "login" as Tab },
  { icon: GraduationCap, title: "Concursos Públicos", desc: "Editais abertos, inscrições e resultados de concursos.", action: "Ver Editais", tab: "concursos" as Tab },
  { icon: Users, title: "Portal da OAB", desc: "Cadastro de advogados, carteira digital e honorários.", action: "Acessar", tab: "login" as Tab },
  { icon: BookOpen, title: "Jurisprudência", desc: "Banco de decisões judiciais da Comarca de São Paulo.", action: "Pesquisar", tab: "login" as Tab }];


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
              onClick={() => onNavigate("servicos")}
              variant="outline"
              className="rounded-xl h-12 px-8 border-accent text-accent hover:bg-accent/10">
              
              Ver Serviços
            </Button>
          </motion.div>
        </div>
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

      {/* News / Updates */}
      <div className="bg-secondary/50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="font-display text-xl font-semibold text-foreground mb-6">Últimas Notícias</h3>
          <div className="space-y-3">
            {[
            { date: "17/03/2026", title: "Sistema Judiciário Eletrônico entra em operação na Comarca" },
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
  const organs = [
  {
    icon: Gavel,
    name: "Tribunal de Justiça",
    desc: "Órgão máximo do Poder Judiciário estadual, responsável pela administração da justiça e julgamento de recursos em segunda instância.",
    competencias: ["Julgar recursos cíveis e criminais", "Administrar a justiça estadual", "Nomear magistrados", "Supervisionar comarcas"]
  },
  {
    icon: Scale,
    name: "Ministério Público",
    desc: "Instituição essencial à função jurisdicional do Estado, responsável pela defesa da ordem jurídica e dos interesses sociais.",
    competencias: ["Oferecer denúncias criminais", "Fiscalizar o cumprimento da lei", "Defender interesses coletivos", "Expedir recomendações"]
  },
  {
    icon: Shield,
    name: "Polícia Civil",
    desc: "Órgão responsável pela investigação criminal, apuração de infrações penais e manutenção da ordem pública.",
    competencias: ["Investigar crimes", "Registrar Boletins de Ocorrência", "Conduzir inquéritos policiais", "Remeter inquéritos ao MP"]
  },
  {
    icon: Building2,
    name: "Ordem dos Advogados (OAB)",
    desc: "Entidade responsável pela regulamentação da advocacia, defesa das prerrogativas profissionais e fiscalização ética.",
    competencias: ["Cadastrar advogados", "Emitir carteiras profissionais", "Fiscalizar a advocacia", "Definir tabela de honorários"]
  }];


  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Institucional</h2>
      <p className="text-muted-foreground mb-8">Conheça os órgãos que compõem o sistema de justiça da Comarca.</p>

      <div className="space-y-6">
        {organs.map((org, i) =>
        <motion.div
          key={org.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-institutional/10 flex-shrink-0">
                <org.icon className="h-6 w-6 text-institutional" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-foreground mb-1">{org.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{org.desc}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {org.competencias.map((c) =>
                <div key={c} className="flex items-center gap-2 text-xs text-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                      {c}
                    </div>
                )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>);

}

function TabServicos() {
  const servicos = [
  { title: "Consulta Processual", desc: "Pesquise processos por número, nome das partes ou assunto.", icon: FileText },
  
  { title: "Peticionamento Eletrônico", desc: "Protocole petições e documentos diretamente no sistema.", icon: BookOpen },
  { title: "Agendamento de Audiências", desc: "Consulte e agende audiências junto às varas competentes.", icon: Clock },
  { title: "Emissão de Certidões", desc: "Solicite certidões negativas e de antecedentes criminais.", icon: FileText },
  { title: "Cadastro OAB", desc: "Advogados podem se cadastrar e obter carteira digital.", icon: Users }];


  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Serviços Disponíveis</h2>
      <p className="text-muted-foreground mb-8">Acesse os serviços digitais do Poder Judiciário.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicos.map((s, i) =>
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card rounded-xl p-5 border border-border shadow-institutional">
          
            <s.icon className="h-6 w-6 text-gold mb-3" />
            <h4 className="font-display text-sm font-semibold text-foreground mb-1">{s.title}</h4>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </motion.div>
        )}
      </div>
    </div>);

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

function TabTransparencia() {
  const [stats, setStats] = useState<any>(null);
  const [magistrados, setMagistrados] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useState(() => {
    const load = async () => {
      const [processosRes, audienciasRes, magistradosRes] = await Promise.all([
        supabase.from("processos").select("status, classe", { count: "exact" }),
        supabase.from("audiencias").select("status", { count: "exact" }),
        supabase.from("profiles").select("nome_completo, cargo").not("cargo", "is", null),
      ]);

      const processos = processosRes.data || [];
      const statusCounts: Record<string, number> = {};
      const classeCounts: Record<string, number> = {};
      processos.forEach((p: any) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
        classeCounts[p.classe] = (classeCounts[p.classe] || 0) + 1;
      });

      setStats({
        totalProcessos: processos.length,
        totalAudiencias: audienciasRes.data?.length || 0,
        statusCounts,
        classeCounts,
      });

      setMagistrados((magistradosRes.data || []).slice(0, 20));
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Portal da Transparência</h2>
      <p className="text-muted-foreground mb-8">Dados públicos e prestação de contas do Poder Judiciário.</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
          <p className="text-2xl font-bold text-foreground">{stats?.totalProcessos || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Total de Processos</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
          <p className="text-2xl font-bold text-foreground">{stats?.totalAudiencias || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Audiências Registradas</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
          <p className="text-2xl font-bold text-foreground">{stats?.statusCounts?.["sentenciado"] || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Processos Sentenciados</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border shadow-institutional text-center">
          <p className="text-2xl font-bold text-foreground">{magistrados.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Servidores Cadastrados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processos por Status */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Processos por Status</h3>
          {stats?.statusCounts && Object.keys(stats.statusCounts).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{(status as string).replace(/_/g, " ")}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-institutional" style={{ width: `${Math.min(((count as number) / (stats.totalProcessos || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>
          )}
        </div>

        {/* Processos por Classe */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Processos por Classe</h3>
          {stats?.classeCounts && Object.keys(stats.classeCounts).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.classeCounts).map(([classe, count]) => (
                <div key={classe} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground w-28">{classe}</span>
                  <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full gradient-gold" style={{ width: `${Math.min(((count as number) / (stats.totalProcessos || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>
          )}
        </div>

        {/* Composição */}
        {magistrados.length > 0 && (
          <div className="bg-card rounded-xl p-6 border border-border shadow-institutional lg:col-span-2">
            <h3 className="font-display text-base font-semibold text-foreground mb-4">Servidores da Comarca</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {magistrados.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{m.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{m.cargo}</p>
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

function TabContato() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Contato</h2>
      <p className="text-muted-foreground mb-8">Entre em contato com o Poder Judiciário da Comarca.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
        { icon: MapPin, title: "Endereço", info: "Fórum Central — Praça da Justiça, s/n — Centro, São Paulo - RP" },
        { icon: Phone, title: "Telefone", info: "(11) 0000-0000 — Atendimento de 8h às 18h" },
        { icon: Clock, title: "Horário", info: "Segunda a Sexta — 08:00 às 18:00\nPlantão Judiciário 24h" }].
        map((c) =>
        <div key={c.title} className="bg-card rounded-xl p-6 border border-border shadow-institutional">
            <c.icon className="h-6 w-6 text-gold mb-3" />
            <h4 className="font-display text-sm font-semibold text-foreground mb-2">{c.title}</h4>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{c.info}</p>
          </div>
        )}
      </div>
    </div>);

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
}

function TabLogin(props: LoginProps) {
  const {
    isSignUp, setIsSignUp, email, setEmail, password, setPassword,
    nome, setNome, discord, setDiscord, idPersonagem, setIdPersonagem,
    telefoneIngame, setTelefoneIngame, loading, handleSubmit
  } = props;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        {/* GOV Header */}
        <div className="text-center mb-8">
          





          
          <h2 className="font-display text-2xl font-bold text-foreground">
            {isSignUp ? "Criar Conta GOV" : "Acesso GOV.BR"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ?
            "Registre-se no sistema do Poder Judiciário." :
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
                  Discord (ID ou Usuário)
                </label>
                <Input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="usuario#1234 ou ID" required className="rounded-lg h-11" />
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
                  <Input value={telefoneIngame} onChange={(e) => setTelefoneIngame(e.target.value)} placeholder="Telefone RP" required className="rounded-lg h-11" />
                </div>
              </div>
            </motion.div>
          }

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

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            
            {isSignUp ? "Já possui conta? Faça login" : "Não possui conta? Registre-se"}
          </button>
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
      .eq("status", "inscricoes_abertas")
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
          Concursos com Inscrições Abertas
        </h3>
        {loadingConcursos ? (
          <div className="text-sm text-muted-foreground text-center py-8">Carregando concursos...</div>
        ) : concursos.length === 0 ? (
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <p className="text-sm text-muted-foreground">Nenhum concurso com inscrições abertas no momento.</p>
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
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Inscrições Abertas
                    </span>
                    <span className="text-[10px] text-gold font-semibold flex items-center gap-1 group-hover:underline">
                      Inscrever-se <ChevronRight className="h-3 w-3" />
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
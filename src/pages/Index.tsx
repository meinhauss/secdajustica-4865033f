import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/components/LoginPage";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardHome from "@/components/sections/DashboardHome";
import ProcessosSection from "@/components/sections/ProcessosSection";

import ConsultaPublicaSection from "@/components/sections/ConsultaPublicaSection";
import MagistradoSection from "@/components/sections/MagistradoSection";
import MPSection from "@/components/sections/MPSection";
import AudienciasSection from "@/components/sections/AudienciasSection";
import OABSection from "@/components/sections/OABSection";
import UsuariosSection from "@/components/sections/UsuariosSection";
import CargosSection from "@/components/sections/CargosSection";
import EstatisticasSection from "@/components/sections/EstatisticasSection";
import ConcursosSection from "@/components/sections/ConcursosSection";
import CartorarioSection from "@/components/sections/CartorarioSection";
import MeuPerfilSection from "@/components/sections/MeuPerfilSection";

const Index = () => {
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");

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

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard": return <DashboardHome onNavigate={setActiveSection} />;
      case "meu-perfil": return <MeuPerfilSection />;
      case "processos": return <ProcessosSection />;
      
      case "consulta": return <ConsultaPublicaSection />;
      case "magistrado": return <MagistradoSection />;
      case "mp": return <MPSection />;
      case "audiencias": return <AudienciasSection />;
      case "oab": return <OABSection />;
      case "cargos": return <CargosSection />;
      case "usuarios": return <UsuariosSection />;
      case "estatisticas": return <EstatisticasSection />;
      case "concursos": return <ConcursosSection />;
      case "cartorio": return <CartorarioSection />;
      default: return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSection()}
    </DashboardLayout>
  );
};

export default Index;

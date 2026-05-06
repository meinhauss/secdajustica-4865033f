import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import CalculadoraCustas from "@/components/CalculadoraCustas";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { useState } from "react";

export default function CalculadoraPage() {
  const [activeSection, setActiveSection] = useState("calculadora");

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display">Calculadora de Custas</h1>
            <p className="text-sm text-muted-foreground">Cálculo de custas judiciais e honorários advocatícios</p>
          </div>
        </div>
        
        <CalculadoraCustas />
      </div>
    </DashboardLayout>
  );
}

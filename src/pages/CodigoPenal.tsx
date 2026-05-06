import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Search, Scale, Home, ExternalLink, Gavel, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CODIGO_PENAL,
  CATEGORIAS_PENAL,
  formatBRL,
  formatFianca,
  formatPena,
  type ArtigoPenal,
} from "@/data/codigoPenal";
import logoSjc from "@/assets/logo-sjc.jpg";
import CalculadoraPenal from "@/components/CalculadoraPenal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CodigoPenalPage() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [aba, setAba] = useState<string>("codigo");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return CODIGO_PENAL.filter((a) => {
      const matchCat = categoria === "Todas" || a.categoria === categoria;
      if (!matchCat) return false;
      if (!termo) return true;
      return (
        a.artigo.toLowerCase().includes(termo) ||
        a.crime.toLowerCase().includes(termo) ||
        a.descricao.toLowerCase().includes(termo) ||
        a.categoria.toLowerCase().includes(termo)
      );
    });
  }, [busca, categoria]);

  const agrupados = useMemo(() => {
    const grupos: Record<string, ArtigoPenal[]> = {};
    filtrados.forEach((a) => {
      if (!grupos[a.categoria]) grupos[a.categoria] = [];
      grupos[a.categoria].push(a);
    });
    return grupos;
  }, [filtrados]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-institutional border-b border-sidebar-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <img src={logoSjc} alt="SJC-SP" className="h-9 sm:h-12 rounded-lg drop-shadow flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base sm:text-xl lg:text-2xl font-bold text-sidebar-foreground leading-tight truncate">
              Código Penal Integrado
            </h1>
            <p className="text-[9px] sm:text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
              Secretaria da Justiça e Cidadania — SP
            </p>
          </div>
          <Link to="/" className="flex-shrink-0">
            <Button variant="outline" size="sm" className="border-gold text-gold hover:bg-gold/10 sm:h-10">
              <Home className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Página Inicial</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-institutional py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4"
          >
            <BookOpen className="h-7 w-7 sm:h-10 sm:w-10 text-gold flex-shrink-0" />
            <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold text-sidebar-foreground">
              Código Penal — Jaguaré RP
            </h2>
          </motion.div>
          <p className="text-sidebar-foreground/70 max-w-3xl mx-auto text-xs sm:text-sm lg:text-base px-2">
            Consulta pública dos artigos penais vigentes na Comarca, com tipificação, pena privativa de
            liberdade (em meses), valor de multa e fiança.
          </p>
        </div>
      </section>

      {/* Tabs: Código Penal / Calculadora */}
      <Tabs value={aba} onValueChange={setAba} className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <TabsList className="h-11 sm:h-12 bg-transparent gap-1 w-full sm:w-auto justify-start">
              <TabsTrigger value="codigo" className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none">
                <BookOpen className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">Código Penal</span>
                <span className="xs:hidden sm:hidden">Código</span>
              </TabsTrigger>
              <TabsTrigger value="calculadora" className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none">
                <Calculator className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">Calculadora Penal</span>
                <span className="xs:hidden sm:hidden">Calculadora</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="codigo" className="flex-1 mt-0">
          {/* Filtros */}
          <section className="border-b border-border bg-card/50">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar artigo, crime ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 h-11 rounded-xl"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Button
                  variant={categoria === "Todas" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoria("Todas")}
                  className="rounded-full whitespace-nowrap"
                >
                  Todas ({CODIGO_PENAL.length})
                </Button>
                {CATEGORIAS_PENAL.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoria === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoria(cat)}
                    className="rounded-full whitespace-nowrap"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </section>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 w-full">
            {filtrados.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Scale className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Nenhum artigo encontrado para esta busca.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(agrupados).map(([cat, artigos]) => (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-3">
                      <Gavel className="h-4 w-4 text-gold" />
                      <h3 className="font-display text-lg font-semibold text-foreground">{cat}</h3>
                      <span className="text-xs text-muted-foreground">({artigos.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {artigos.map((a, i) => (
                        <motion.div
                          key={`${a.artigo}-${a.crime}-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                          className="bg-card border border-border rounded-xl p-4 hover:border-gold/40 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-gold-dark font-mono">
                                {a.artigo}
                              </span>
                              <h4 className="font-display text-base font-semibold text-foreground leading-tight">
                                {a.crime}
                              </h4>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{a.descricao}</p>
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              Pena: {formatPena(a.penaMeses)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              Multa: {a.multa > 0 ? formatBRL(a.multa) : "—"}
                            </Badge>
                            <Badge
                              variant={a.fianca === "sem_fianca" ? "destructive" : "outline"}
                              className="text-[10px] font-mono"
                            >
                              Fiança: {formatFianca(a.fianca)}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calculadora" className="flex-1 mt-0">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 w-full">
            <CalculadoraPenal />
          </div>
        </TabsContent>
      </Tabs>
      {/* Footer */}
      <footer className="bg-institutional-dark text-sidebar-foreground/50 text-[11px] py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>
            Documento de referência oficial. Os valores de multa e fiança são definidos pela legislação
            vigente da Comarca de Jaguaré RP.
          </p>
          <p>
            <Link to="/" className="text-gold hover:underline inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Voltar ao portal da Secretaria da Justiça e Cidadania
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

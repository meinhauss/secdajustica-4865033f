import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator, Plus, Trash2, Search, Scale, Gavel, Coins, Receipt,
  TrendingUp, TrendingDown, Copy, AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CODIGO_PENAL, CATEGORIAS_PENAL, formatBRL, formatFianca, type ArtigoPenal,
} from "@/data/codigoPenal";

interface ItemSelecionado {
  uid: string;
  artigo: ArtigoPenal;
  quantidade: number;
}

export default function CalculadoraPenal() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [itens, setItens] = useState<ItemSelecionado[]>([]);
  const [majoracaoPct, setMajoracaoPct] = useState<number>(0);
  const [atenuacaoPct, setAtenuacaoPct] = useState<number>(0);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return CODIGO_PENAL.filter((a) => {
      if (categoria !== "Todas" && a.categoria !== categoria) return false;
      if (!t) return true;
      return (
        a.artigo.toLowerCase().includes(t) ||
        a.crime.toLowerCase().includes(t) ||
        a.descricao.toLowerCase().includes(t)
      );
    }).slice(0, 30);
  }, [busca, categoria]);

  const adicionar = (a: ArtigoPenal) => {
    setItens((prev) => {
      const existing = prev.find((i) => i.artigo.artigo === a.artigo && i.artigo.crime === a.crime);
      if (existing) {
        return prev.map((i) => i === existing ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...prev, { uid: `${Date.now()}-${Math.random()}`, artigo: a, quantidade: 1 }];
    });
  };

  const remover = (uid: string) => setItens((p) => p.filter((i) => i.uid !== uid));
  const setQtd = (uid: string, q: number) => {
    if (q < 1) return remover(uid);
    setItens((p) => p.map((i) => i.uid === uid ? { ...i, quantidade: q } : i));
  };

  const totais = useMemo(() => {
    let penaBase = 0;
    let multa = 0;
    let fiancaTotal = 0;
    let temSemFianca = false;
    let temFianca = false;

    itens.forEach(({ artigo, quantidade }) => {
      penaBase += artigo.penaMeses * quantidade;
      multa += artigo.multa * quantidade;
      if (artigo.fianca === "sem_fianca") {
        temSemFianca = true;
      } else if (typeof artigo.fianca === "number" && artigo.fianca > 0) {
        fiancaTotal += artigo.fianca * quantidade;
        temFianca = true;
      }
    });

    const ajuste = (majoracaoPct - atenuacaoPct) / 100;
    const penaFinal = Math.max(0, Math.round(penaBase * (1 + ajuste)));

    return {
      penaBase, penaFinal, multa, fiancaTotal,
      temSemFianca, temFianca,
      totalCrimes: itens.reduce((s, i) => s + i.quantidade, 0),
    };
  }, [itens, majoracaoPct, atenuacaoPct]);

  const formatPenaCompleta = (meses: number) => {
    if (meses === 0) return "Sem pena privativa de liberdade";
    return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  };

  const copiarResumo = () => {
    if (itens.length === 0) {
      toast.error("Adicione ao menos um crime para gerar o resumo.");
      return;
    }
    const linhas = [
      "═══ CÁLCULO PENAL ═══",
      "",
      "CRIMES IMPUTADOS:",
      ...itens.map((i) =>
        `• ${i.artigo.artigo} — ${i.artigo.crime}${i.quantidade > 1 ? ` (x${i.quantidade})` : ""}`
      ),
      "",
      `Pena base: ${formatPenaCompleta(totais.penaBase)}`,
      majoracaoPct > 0 ? `Majoração: +${majoracaoPct}%` : null,
      atenuacaoPct > 0 ? `Atenuação: -${atenuacaoPct}%` : null,
      `PENA FINAL: ${formatPenaCompleta(totais.penaFinal)}`,
      `MULTA TOTAL: ${formatBRL(totais.multa)}`,
      `FIANÇA: ${totais.temSemFianca ? "INAFIANÇÁVEL" : (totais.temFianca ? formatBRL(totais.fiancaTotal) : "N/A")}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(linhas);
    toast.success("Resumo copiado para a área de transferência.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna esquerda: catálogo de crimes */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-gold" />
            <h3 className="font-display text-base font-semibold">Catálogo de Crimes</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigo, crime..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as categorias</SelectItem>
                {CATEGORIAS_PENAL.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {filtrados.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum artigo encontrado.
              </p>
            ) : (
              filtrados.map((a, i) => (
                <button
                  key={`${a.artigo}-${a.crime}-${i}`}
                  onClick={() => adicionar(a)}
                  className="w-full text-left bg-secondary/50 hover:bg-secondary border border-border hover:border-gold/40 rounded-lg p-2.5 transition-all group flex items-center gap-3"
                >
                  <Plus className="h-4 w-4 text-gold opacity-50 group-hover:opacity-100 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-mono font-bold text-gold-dark">{a.artigo}</span>
                      <span className="text-sm font-medium text-foreground truncate">{a.crime}</span>
                    </div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {a.penaMeses > 0 ? `${a.penaMeses}m` : "—"} · {formatBRL(a.multa)}
                      </span>
                      {a.fianca === "sem_fianca" && (
                        <span className="text-[10px] text-destructive font-semibold">INAFIANÇÁVEL</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Coluna direita: itens selecionados + resultado */}
      <div className="space-y-4">
        {/* Itens selecionados */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-gold" />
              <h3 className="font-display text-base font-semibold">Crimes Selecionados</h3>
            </div>
            {itens.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setItens([])} className="h-7 text-xs">
                Limpar
              </Button>
            )}
          </div>

          {itens.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              Clique em um crime ao lado para adicioná-lo.
            </p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {itens.map((i) => (
                <motion.div
                  key={i.uid}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-secondary/40 border border-border rounded-lg p-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[9px] font-mono font-bold text-gold-dark">{i.artigo.artigo}</span>
                        <span className="text-xs font-medium truncate">{i.artigo.crime}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {i.artigo.penaMeses > 0 ? `${i.artigo.penaMeses * i.quantidade}m` : "sem pena"}
                        {" · "}{formatBRL(i.artigo.multa * i.quantidade)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setQtd(i.uid, i.quantidade - 1)}
                        className="w-5 h-5 rounded bg-background border border-border text-xs font-bold hover:border-gold"
                      >−</button>
                      <span className="w-6 text-center text-xs font-mono font-bold">{i.quantidade}</span>
                      <button
                        onClick={() => setQtd(i.uid, i.quantidade + 1)}
                        className="w-5 h-5 rounded bg-background border border-border text-xs font-bold hover:border-gold"
                      >+</button>
                      <button
                        onClick={() => remover(i.uid)}
                        className="ml-1 text-destructive hover:bg-destructive/10 rounded p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Ajustes */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <Gavel className="h-4 w-4 text-gold" />
            Ajustes da Pena
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-destructive" />
                Majoração %
              </Label>
              <Input
                type="number" min={0} max={300}
                value={majoracaoPct}
                onChange={(e) => setMajoracaoPct(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-accent" />
                Atenuação %
              </Label>
              <Input
                type="number" min={0} max={100}
                value={atenuacaoPct}
                onChange={(e) => setAtenuacaoPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="h-9 mt-1"
              />
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="bg-gradient-to-br from-institutional via-institutional-dark to-institutional border-2 border-gold/40 rounded-xl p-5 text-sidebar-foreground">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-gold" />
            <h3 className="font-display text-lg font-bold">Resultado</h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 flex items-center gap-1">
                <Gavel className="h-3 w-3" /> Pena privativa
              </p>
              {totais.penaBase !== totais.penaFinal && (
                <p className="text-xs text-sidebar-foreground/40 line-through">
                  {formatPenaCompleta(totais.penaBase)}
                </p>
              )}
              <p className="text-xl font-bold text-gold font-display">
                {formatPenaCompleta(totais.penaFinal)}
              </p>
            </div>

            <div className="border-t border-sidebar-foreground/10 pt-3">
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 flex items-center gap-1">
                <Receipt className="h-3 w-3" /> Multa total
              </p>
              <p className="text-xl font-bold text-gold font-display">{formatBRL(totais.multa)}</p>
            </div>

            <div className="border-t border-sidebar-foreground/10 pt-3">
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 flex items-center gap-1">
                <Coins className="h-3 w-3" /> Fiança
              </p>
              {totais.temSemFianca ? (
                <p className="text-xl font-bold text-destructive font-display flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  INAFIANÇÁVEL
                </p>
              ) : (
                <p className="text-xl font-bold text-gold font-display">
                  {totais.temFianca ? formatBRL(totais.fiancaTotal) : "N/A"}
                </p>
              )}
            </div>

            <div className="border-t border-sidebar-foreground/10 pt-3 flex items-center justify-between">
              <Badge variant="outline" className="border-gold/30 text-gold/80">
                {totais.totalCrimes} {totais.totalCrimes === 1 ? "crime" : "crimes"}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={copiarResumo}
                className="border-gold/40 text-gold hover:bg-gold/10 h-8"
                disabled={itens.length === 0}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar resumo
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-sidebar-foreground/40 mt-4 italic">
            Cálculo aproximado para fins consultivos. A dosimetria definitiva é fixada pelo magistrado.
          </p>
        </div>
      </div>
    </div>
  );
}

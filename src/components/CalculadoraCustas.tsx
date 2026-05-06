import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Calculator, Receipt, Scale, Briefcase, Gavel, 
  Trash2, Plus, Info, Copy, CheckCircle2,
  CheckSquare, Square, FileText, Download
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface ProcessType {
  id: string;
  name: string;
  custas: number | "base_plus" | "special" | "vide_decreto" | "custom";
  honorarios: number | "percentage" | "special" | "none" | "custom";
  description?: string;
  obs?: string;
  baseCustas?: number;
  baseHonorarios?: number;
}

const PROCESS_TYPES: ProcessType[] = [
  { 
    id: "peticao_inicial", 
    name: "Petição Inicial (Geral)", 
    custas: 25000, 
    honorarios: "none", 
    obs: "Valor fixo somado à respectiva ação." 
  },
  { 
    id: "recursos", 
    name: "Recursos (Apelação e/ou Recurso)", 
    custas: 50000, 
    honorarios: 75000 
  },
  { 
    id: "mandados", 
    name: "MS, Habeas Corpus e Habeas Data", 
    custas: 50000, 
    honorarios: "none" 
  },
  { 
    id: "defesa_detido", 
    name: "Defesa de Acusado Detido/Preso", 
    custas: 0, 
    honorarios: "special",
    obs: "R$ 30.000,00 (até 10 min) ou R$ 35.000,00 (> 10 min)" 
  },
  { 
    id: "acoes_civeis", 
    name: "Ações Cíveis (Danos Morais/Materiais)", 
    custas: 25000, 
    honorarios: "percentage",
    obs: "20% sobre o valor total. Danos morais: R$ 40k a R$ 2M."
  },
  { 
    id: "porte_arma", 
    name: "Porte de Arma de Fogo (Uso Permitido)", 
    custas: 475000, 
    honorarios: 110000,
    obs: "Inclui Inicial, Psicológico, Armamento, Munições e Verbas (Promotor/Juiz)."
  },
  { 
    id: "limpeza_ficha", 
    name: "Exclusão de Antecedentes (Limpeza)", 
    custas: "base_plus", 
    honorarios: 110000,
    baseCustas: 50000,
    obs: "Base de R$ 50.000,00 + valor por gravidade do crime + Verbas."
  },
  { 
    id: "divorcio", 
    name: "Divórcio", 
    custas: "vide_decreto", 
    honorarios: 115000 
  },
  { 
    id: "alvara", 
    name: "Alvará de Funcionamento", 
    custas: 150000, 
    honorarios: 35000,
    obs: "Inclui Inicial. Obrigatório Taxa AVCB à parte."
  },
  { 
    id: "casamento", 
    name: "Casamento (Certidão e Ação)", 
    custas: 875000, 
    honorarios: 80000,
    obs: "Inclui Inicial, Certidão e Ação."
  },
  { 
    id: "adocao", 
    name: "Adoção", 
    custas: 1225000, 
    honorarios: "none",
    obs: "Inclui Inicial, Certidão atualizada e Ação."
  },
  {
    id: "outros",
    name: "Outros (Personalizado)",
    custas: "custom",
    honorarios: "custom",
    obs: "Defina valores personalizados para custas e honorários."
  }
];

const GRAVIDADE_CRIMES = [
  { label: "0 a 10 meses", value: 25000 },
  { label: "11 a 19 meses", value: 40000 },
  { label: "20 a 30 meses", value: 60000 },
  { label: "31 a 100 meses", value: 80000 },
  { label: "Superior a 100 meses", value: 100000 },
];

export default function CalculadoraCustas() {
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [diligencias, setDiligencias] = useState<number>(0);
  const [hasJuiz, setHasJuiz] = useState(true);
  const [hasPromotor, setHasPromotor] = useState(false);
  const [hasDesembargador, setHasDesembargador] = useState(false);
  
  // Specific inputs
  const [detidoMais10Min, setDetidoMais10Min] = useState(false);
  const [valorCivel, setValorCivel] = useState<number>(0);
  const [crimesLimpeza, setCrimesLimpeza] = useState<{id: string, typeIndex: number}[]>([]);
  const [hasAlteracaoNome, setHasAlteracaoNome] = useState(false);

  // Custom values
  const [customCustas, setCustomCustas] = useState<number>(0);
  const [customHonorarios, setCustomHonorarios] = useState<number>(0);
  const [honorarioType, setHonorarioType] = useState<"fixed" | "percentage">("fixed");
  const [customPercentage, setCustomPercentage] = useState<number>(20);

  // Toggle for specific costs
  const [includeCustas, setIncludeCustas] = useState(true);
  const [includeHonorarios, setIncludeHonorarios] = useState(true);
  const [includeExtras, setIncludeExtras] = useState(true);

  // Other costs
  const [outrasCustas, setOutrasCustas] = useState<{ id: string; description: string; value: number }[]>([]);

  const selectedProcess = useMemo(() => 
    PROCESS_TYPES.find(p => p.id === selectedProcessId), 
    [selectedProcessId]
  );

  const addCrimeLimpeza = () => {
    setCrimesLimpeza([...crimesLimpeza, { id: Math.random().toString(), typeIndex: 0 }]);
  };

  const removeCrimeLimpeza = (id: string) => {
    setCrimesLimpeza(crimesLimpeza.filter(c => c.id !== id));
  };

  const updateCrimeLimpeza = (id: string, typeIndex: number) => {
    setCrimesLimpeza(crimesLimpeza.map(c => c.id === id ? { ...c, typeIndex } : c));
  };

  const addOutraCusta = () => {
    setOutrasCustas([...outrasCustas, { id: Math.random().toString(), description: "", value: 0 }]);
  };

  const removeOutraCusta = (id: string) => {
    setOutrasCustas(outrasCustas.filter(c => c.id !== id));
  };

  const updateOutraCusta = (id: string, field: "description" | "value", val: string | number) => {
    setOutrasCustas(outrasCustas.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const calculations = useMemo(() => {
    let custas = 0;
    let honorarios = 0;
    let extras = 0;

    if (selectedProcess) {
      // Base Custas
      if (typeof selectedProcess.custas === 'number') {
        custas = selectedProcess.custas;
      } else if (selectedProcess.custas === 'base_plus' && selectedProcess.baseCustas) {
        custas = selectedProcess.baseCustas;
        crimesLimpeza.forEach(c => {
          custas += GRAVIDADE_CRIMES[c.typeIndex].value;
        });
      } else if (selectedProcess.custas === 'custom') {
        custas = customCustas;
      }

      // Base Honorarios
      if (typeof selectedProcess.honorarios === 'number') {
        honorarios = selectedProcess.honorarios;
      } else if (selectedProcess.honorarios === 'percentage') {
        honorarios = valorCivel * 0.20;
      } else if (selectedProcess.honorarios === 'special') {
        if (selectedProcess.id === 'defesa_detido') {
          honorarios = detidoMais10Min ? 35000 : 30000;
        }
      } else if (selectedProcess.honorarios === 'custom') {
        if (honorarioType === "fixed") {
          honorarios = customHonorarios;
        } else {
          honorarios = (valorCivel || 0) * (customPercentage / 100);
        }
      }

      // Adicionais de nome (Adoção ou Casamento)
      if (hasAlteracaoNome && (selectedProcess.id === 'adocao' || selectedProcess.id === 'casamento')) {
        custas += 2000000;
        if (selectedProcess.id === 'casamento') {
          honorarios += 80000;
        }
      }
    }

    // Diligências
    extras += diligencias * 20000;

    // Verbas Indenizatórias
    if (hasJuiz) extras += 60000;
    if (hasPromotor) extras += 80000;
    if (hasDesembargador) extras += 120000;

    // Outras Custas
    outrasCustas.forEach(c => {
      extras += c.value;
    });

    const finalCustas = includeCustas ? custas : 0;
    const finalHonorarios = includeHonorarios ? honorarios : 0;
    const finalExtras = includeExtras ? extras : 0;

    return {
      custas: finalCustas,
      honorarios: finalHonorarios,
      extras: finalExtras,
      total: finalCustas + finalHonorarios + finalExtras
    };
  }, [selectedProcess, diligencias, hasJuiz, hasPromotor, hasDesembargador, detidoMais10Min, valorCivel, crimesLimpeza, hasAlteracaoNome, includeCustas, includeHonorarios, includeExtras, customCustas, customHonorarios, honorarioType, customPercentage, outrasCustas]);

  const copySummary = () => {
    if (!selectedProcess) return;

    const summary = [
      "═══ ORÇAMENTO PROCESSUAL ═══",
      `Processo: ${selectedProcess.name}`,
      `Custas Processuais: ${formatBRL(calculations.custas)}`,
      `Honorários: ${formatBRL(calculations.honorarios)}`,
      `Taxas/Diligências/Verbas: ${formatBRL(calculations.extras)}`,
      "────────────────────────",
      `TOTAL: ${formatBRL(calculations.total)}`,
      "",
      selectedProcess.obs ? `Obs: ${selectedProcess.obs}` : null,
      diligencias > 0 ? `• ${diligencias} diligência(s) inclusa(s)` : null,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(summary);
    toast.success("Resumo copiado!");
  };

  const generatePDF = () => {
    if (!selectedProcess) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("Simulado de Custas Processuais e Honorários", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, 28, { align: "center" });

    // Informações do Processo
    doc.setFontSize(14);
    doc.text("Informações do Processo", 14, 45);
    autoTable(doc, {
      startY: 48,
      body: [
        ["Tipo de Processo", selectedProcess.name],
        ["Status", "Estimativa de Custas"],
      ],
      theme: "striped",
      styles: { fontSize: 10 },
    });

    // Itens Discriminados
    doc.setFontSize(14);
    doc.text("Discriminação de Valores", 14, (doc as any).lastAutoTable.finalY + 15);
    
    const tableData = [];
    if (includeCustas) {
      tableData.push(["Custas Judiciais (Base)", formatBRL(calculations.custas)]);
    }
    if (includeHonorarios) {
      tableData.push(["Honorários Advocatícios", formatBRL(calculations.honorarios)]);
    }
    if (includeExtras) {
      if (diligencias > 0) {
        tableData.push([`Diligências (${diligencias}x)`, formatBRL(diligencias * 20000)]);
      }
      if (hasJuiz) tableData.push(["Verba: Juiz de Direito", formatBRL(60000)]);
      if (hasPromotor) tableData.push(["Verba: Promotor de Justiça", formatBRL(80000)]);
      if (hasDesembargador) tableData.push(["Verba: Desembargador", formatBRL(120000)]);
      
      outrasCustas.forEach(c => {
        tableData.push([`Outra: ${c.description || "Sem descrição"}`, formatBRL(c.value)]);
      });
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [["Descrição", "Valor"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [241, 196, 15] as any, textColor: 0 },
      styles: { fontSize: 10 },
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL ESTIMADO: ${formatBRL(calculations.total)}`, 14, finalY);

    // Notas de rodapé
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const footerText = [
      "* Este documento é um simulado financeiro baseado nas tabelas oficiais de 2026.",
      "* Os valores podem sofrer alterações conforme a complexidade e tempo do processo.",
      "* Honorários calculados respeitam o piso ético estabelecido pela seccional."
    ];
    doc.text(footerText, 14, finalY + 15);

    doc.save(`Orcamento_${selectedProcess.name.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
            <Calculator className="h-8 w-8 text-gold" />
            Calculadora de Custas e Honorários
          </h1>
          <p className="text-muted-foreground mt-1">
            Baseado na tabela oficial do Tribunal de Justiça e OAB-SP.
          </p>
        </div>
        <Button onClick={copySummary} disabled={!selectedProcess} className="bg-gold hover:bg-gold-dark text-black font-bold">
          <Copy className="mr-2 h-4 w-4" />
          Copiar Orçamento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configurações */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-gold" />
                Tipo de Ação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o Processo</Label>
                <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma opção..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESS_TYPES.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProcess?.obs && (
                  <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {selectedProcess.obs}
                  </p>
                )}
              </div>

              {/* Personalização para "Outros" */}
              {selectedProcessId === 'outros' && (
                <div className="space-y-4 p-4 border rounded-lg bg-secondary/10">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Custas Processuais (R$)</Label>
                      <Input 
                        type="number" 
                        value={customCustas} 
                        onChange={e => setCustomCustas(Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Tipo de Honorário</Label>
                      <RadioGroup 
                        value={honorarioType} 
                        onValueChange={(v: "fixed" | "percentage") => setHonorarioType(v)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="fixed" />
                          <Label htmlFor="fixed">Valor Fixo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="percentage" />
                          <Label htmlFor="percentage">Percentual</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {honorarioType === "fixed" ? (
                      <div className="space-y-2">
                        <Label>Honorários (R$)</Label>
                        <Input 
                          type="number" 
                          value={customHonorarios} 
                          onChange={e => setCustomHonorarios(Number(e.target.value))}
                          placeholder="0.00"
                        />
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Valor mínimo recomendado pela OAB: R$ 30.000,00
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Valor Base para Cálculo (R$)</Label>
                          <Input 
                            type="number" 
                            value={valorCivel || ""} 
                            onChange={e => setValorCivel(Number(e.target.value))}
                            placeholder="Ex: Valor da causa"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Percentual (%)</Label>
                          <Input 
                            type="number" 
                            value={customPercentage} 
                            onChange={e => setCustomPercentage(Number(e.target.value))}
                            placeholder="20"
                          />
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Percentual padrão: 20%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Campos Dinâmicos conforme a seleção */}
              {selectedProcessId === 'defesa_detido' && (
                <div className="flex items-center space-x-2 p-3 bg-secondary/30 rounded-lg">
                  <Checkbox 
                    id="tempo" 
                    checked={detidoMais10Min} 
                    onCheckedChange={(v) => setDetidoMais10Min(!!v)} 
                  />
                  <Label htmlFor="tempo" className="cursor-pointer">Atendimento superior a 10 minutos?</Label>
                </div>
              )}

              {selectedProcessId === 'acoes_civeis' && (
                <div className="space-y-2">
                  <Label>Valor da Causa / Indenização (R$)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 50000" 
                    value={valorCivel || ""} 
                    onChange={e => setValorCivel(Number(e.target.value))}
                  />
                  <p className="text-[10px] text-muted-foreground">Honorários de 20% serão calculados sobre este valor.</p>
                </div>
              )}

              {selectedProcessId === 'limpeza_ficha' && (
                <div className="space-y-3">
                  <Label className="flex justify-between items-center">
                    Antecedentes a Limpar
                    <Button size="sm" variant="outline" onClick={addCrimeLimpeza} className="h-7 text-[10px]">
                      <Plus className="h-3 w-3 mr-1" /> Add Antecedente
                    </Button>
                  </Label>
                  <div className="space-y-2">
                    {crimesLimpeza.map((c, idx) => (
                      <div key={c.id} className="flex gap-2 items-center">
                        <Select 
                          value={c.typeIndex.toString()} 
                          onValueChange={(v) => updateCrimeLimpeza(c.id, Number(v))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRAVIDADE_CRIMES.map((g, i) => (
                              <SelectItem key={i} value={i.toString()}>{g.label} (+{formatBRL(g.value)})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => removeCrimeLimpeza(c.id)} className="text-destructive h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {crimesLimpeza.length === 0 && <p className="text-xs text-center text-muted-foreground py-2">Nenhum antecedente adicionado.</p>}
                  </div>
                </div>
              )}

              {(selectedProcessId === 'casamento' || selectedProcessId === 'adocao') && (
                <div className="flex items-center space-x-2 p-3 bg-secondary/30 rounded-lg">
                  <Checkbox 
                    id="nome" 
                    checked={hasAlteracaoNome} 
                    onCheckedChange={(v) => setHasAlteracaoNome(!!v)} 
                  />
                  <Label htmlFor="nome" className="cursor-pointer">Incluir Alteração de Nome? (+ R$ 2.000.000,00)</Label>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-gold" />
                Diligências e Verbas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex justify-between">
                  Diligências (Oficial de Justiça)
                  <span className="text-gold font-mono">{formatBRL(diligencias * 20000)}</span>
                </Label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="number" 
                    min="0" 
                    value={diligencias} 
                    onChange={e => setDiligencias(Math.max(0, Number(e.target.value)))}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">R$ 20.000,00 por diligência</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Verbas Indenizatórias (Obrigatórias por lei)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-secondary/20 transition-colors">
                    <Checkbox id="juiz" checked={hasJuiz} onCheckedChange={(v) => setHasJuiz(!!v)} />
                    <Label htmlFor="juiz" className="flex flex-col cursor-pointer">
                      <span>Juiz de Direito</span>
                      <span className="text-[10px] text-muted-foreground">{formatBRL(60000)}</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-secondary/20 transition-colors">
                    <Checkbox id="promotor" checked={hasPromotor} onCheckedChange={(v) => setHasPromotor(!!v)} />
                    <Label htmlFor="promotor" className="flex flex-col cursor-pointer">
                      <span>Promotor de Justiça</span>
                      <span className="text-[10px] text-muted-foreground">{formatBRL(80000)}</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-secondary/20 transition-colors">
                    <Checkbox id="desemb" checked={hasDesembargador} onCheckedChange={(v) => setHasDesembargador(!!v)} />
                    <Label htmlFor="desemb" className="flex flex-col cursor-pointer">
                      <span>Desembargador (Recurso)</span>
                      <span className="text-[10px] text-muted-foreground">{formatBRL(120000)}</span>
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="flex justify-between items-center">
                  Outras Custas (Personalizadas)
                  <Button size="sm" variant="outline" onClick={addOutraCusta} className="h-7 text-[10px]">
                    <Plus className="h-3 w-3 mr-1" /> Add Custa
                  </Button>
                </Label>
                <div className="space-y-3">
                  {outrasCustas.map((c) => (
                    <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 bg-secondary/20 rounded-lg border">
                      <div className="md:col-span-7">
                        <Input 
                          placeholder="Descrição da custa" 
                          value={c.description} 
                          onChange={e => updateOutraCusta(c.id, "description", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Input 
                          type="number" 
                          placeholder="Valor (R$)" 
                          value={c.value || ""} 
                          onChange={e => updateOutraCusta(c.id, "value", Number(e.target.value))}
                          className="h-9"
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => removeOutraCusta(c.id)} className="text-destructive h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {outrasCustas.length === 0 && <p className="text-xs text-center text-muted-foreground py-2">Nenhuma custa extra adicionada.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo */}
        <div className="space-y-4">
          <Card className="border-2 border-gold/20 bg-institutional text-institutional-foreground overflow-hidden">
            <div className="bg-gold/10 p-4 border-b border-gold/20">
              <h3 className="font-display font-bold text-xl flex items-center gap-2 text-gold">
                <Receipt className="h-5 w-5" />
                Resumo do Cálculo
              </h3>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start group">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="inc-custas" 
                        checked={includeCustas} 
                        onCheckedChange={(v) => setIncludeCustas(!!v)}
                        className="h-3 w-3"
                      />
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer" onClick={() => setIncludeCustas(!includeCustas)}>Custas Judiciais</p>
                    </div>
                    <p className={`font-medium transition-opacity ${!includeCustas ? 'opacity-30' : ''}`}>
                      {selectedProcess ? formatBRL(calculations.custas) : "—"}
                    </p>
                  </div>
                  <Scale className={`h-4 w-4 transition-colors ${includeCustas ? 'text-gold/50' : 'text-muted-foreground/30'}`} />
                </div>

                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="inc-honorarios" 
                        checked={includeHonorarios} 
                        onCheckedChange={(v) => setIncludeHonorarios(!!v)}
                        className="h-3 w-3"
                      />
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer" onClick={() => setIncludeHonorarios(!includeHonorarios)}>Honorários OAB (Piso)</p>
                    </div>
                    <p className={`font-medium transition-opacity ${!includeHonorarios ? 'opacity-30' : ''}`}>
                      {selectedProcess ? formatBRL(calculations.honorarios) : "—"}
                    </p>
                  </div>
                  <Briefcase className={`h-4 w-4 transition-colors ${includeHonorarios ? 'text-gold/50' : 'text-muted-foreground/30'}`} />
                </div>

                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="inc-extras" 
                        checked={includeExtras} 
                        onCheckedChange={(v) => setIncludeExtras(!!v)}
                        className="h-3 w-3"
                      />
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer" onClick={() => setIncludeExtras(!includeExtras)}>Taxas e Verbas</p>
                    </div>
                    <p className={`font-medium transition-opacity ${!includeExtras ? 'opacity-30' : ''}`}>
                      {formatBRL(calculations.extras)}
                    </p>
                  </div>
                  <Gavel className={`h-4 w-4 transition-colors ${includeExtras ? 'text-gold/50' : 'text-muted-foreground/30'}`} />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[9px] text-gold hover:text-gold hover:bg-gold/10"
                    onClick={() => {
                      const allSelected = includeCustas && includeHonorarios && includeExtras;
                      setIncludeCustas(!allSelected);
                      setIncludeHonorarios(!allSelected);
                      setIncludeExtras(!allSelected);
                    }}
                  >
                    {includeCustas && includeHonorarios && includeExtras ? (
                      <><Square className="h-3 w-3 mr-1" /> Desmarcar Tudo</>
                    ) : (
                      <><CheckSquare className="h-3 w-3 mr-1" /> Marcar Tudo</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-gold mb-1">Total Estimado</p>
                <p className="text-4xl font-bold font-display text-white">
                  {formatBRL(calculations.total)}
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Valores atualizados conforme Provimento 2026.
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Incidência de Verbas Indenizatórias inclusa.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border text-[10px] text-muted-foreground italic leading-relaxed">
            * Este simulador fornece uma estimativa baseada nos valores mínimos da tabela processual. 
            O valor final pode variar de acordo com a complexidade da causa e decisões judiciais.
            Os honorários aqui calculados representam o piso ético estabelecido pela seccional.
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
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

interface ProcessItem {
  label: string;
  value: number;
  type: 'custa' | 'honorario' | 'despesa';
  required?: boolean;
}

interface ProcessType {
  id: string;
  name: string;
  items: ProcessItem[];
  obs?: string;
}

const PROCESS_TYPES: ProcessType[] = [
  { 
    id: "peticao_inicial", 
    name: "Petição Inicial (Geral)", 
    items: [
      { label: "Taxa Judiciária (Inicial)", value: 25000, type: 'custa', required: true }
    ],
    obs: "Valor fixo somado à respectiva ação." 
  },
  { 
    id: "recursos", 
    name: "Recursos (Apelação e/ou Recurso)", 
    items: [
      { label: "Taxa de Preparo Recursal", value: 50000, type: 'custa', required: true },
      { label: "Honorários de Sucumbência Recursal", value: 75000, type: 'honorario' }
    ]
  },
  { 
    id: "mandados", 
    name: "MS, Habeas Corpus e Habeas Data", 
    items: [
      { label: "Custas de Impetração", value: 50000, type: 'custa', required: true }
    ]
  },
  { 
    id: "defesa_detido", 
    name: "Defesa de Acusado Detido/Preso", 
    items: [
      { label: "Honorários Atendimento (até 10 min)", value: 30000, type: 'honorario' },
      { label: "Honorários Atendimento (> 10 min)", value: 35000, type: 'honorario' }
    ],
    obs: "Escolha o valor baseado no tempo de atendimento." 
  },
  { 
    id: "acoes_civeis", 
    name: "Ações Cíveis (Danos Morais/Materiais)", 
    items: [
      { label: "Taxa Judiciária", value: 25000, type: 'custa', required: true },
      { label: "Honorários Ad Exitum (20%)", value: 0, type: 'honorario' }
    ],
    obs: "Danos morais: R$ 40k a R$ 2M."
  },
  { 
    id: "porte_arma", 
    name: "Porte de Arma de Fogo (Uso Permitido)", 
    items: [
      { label: "Taxa de Protocolo (Inicial)", value: 25000, type: 'custa', required: true },
      { label: "Laudo Psicológico Profissional", value: 150000, type: 'despesa' },
      { label: "Curso de Armamento e Tiro", value: 200000, type: 'despesa' },
      { label: "Munições de Treinamento", value: 100000, type: 'despesa' },
      { label: "Honorários Administrativos", value: 110000, type: 'honorario' }
    ],
    obs: "Discriminação completa para o cliente."
  },
  { 
    id: "limpeza_ficha", 
    name: "Exclusão de Antecedentes (Limpeza)", 
    items: [
      { label: "Taxa de Processamento Base", value: 50000, type: 'custa', required: true },
      { label: "Honorários Advocatícios", value: 110000, type: 'honorario' }
    ],
    obs: "Base de R$ 50.000,00 + valor por gravidade do crime."
  },
  { 
    id: "divorcio", 
    name: "Divórcio", 
    items: [
      { label: "Taxa de Averbação", value: 35000, type: 'custa', required: true },
      { label: "Honorários Advocatícios", value: 115000, type: 'honorario' }
    ]
  },
  { 
    id: "alvara", 
    name: "Alvará de Funcionamento", 
    items: [
      { label: "Taxa de Vistoria Inicial", value: 150000, type: 'custa', required: true },
      { label: "Taxa AVCB (Bombeiros)", value: 50000, type: 'custa' },
      { label: "Honorários Advocatícios", value: 35000, type: 'honorario' }
    ]
  },
  { 
    id: "casamento", 
    name: "Casamento (Certidão e Ação)", 
    items: [
      { label: "Taxa Cartorária", value: 875000, type: 'custa', required: true },
      { label: "Alteração de Sobrenome", value: 2000000, type: 'custa' },
      { label: "Honorários Processuais", value: 80000, type: 'honorario' }
    ]
  },
  { 
    id: "adocao", 
    name: "Adoção", 
    items: [
      { label: "Taxa Processual de Adoção", value: 1225000, type: 'custa', required: true },
      { label: "Estudo Psicossocial Judiciário", value: 0, type: 'custa' },
      { label: "Honorários Advocatícios", value: 0, type: 'honorario' }
    ]
  },
  {
    id: "outros",
    name: "Outros (Personalizado)",
    items: [
      { label: "Custa Personalizada", value: 0, type: 'custa' },
      { label: "Honorário Personalizado", value: 0, type: 'honorario' }
    ]
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

  // Seleção de itens específicos do processo
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedProcess) {
      const initial: Record<string, boolean> = {};
      selectedProcess.items.forEach(item => {
        initial[item.label] = true;
      });
      setSelectedItems(initial);

      // Valores iniciais para personalização se for processo conhecido
      const firstHonorario = selectedProcess.items.find(i => i.type === 'honorario');
      if (firstHonorario) {
        setCustomHonorarios(firstHonorario.value);
        setHonorarioType("fixed");
      }
      
      const firstCusta = selectedProcess.items.find(i => i.type === 'custa');
      if (firstCusta) {
        setCustomCustas(firstCusta.value);
      }
    }
  }, [selectedProcessId]);

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
    const itemizedDetails: { label: string; value: number; type: 'custa' | 'honorario' | 'despesa' }[] = [];
    let extras = 0;

    if (selectedProcess) {
      if (selectedProcess.id === 'outros') {
        itemizedDetails.push({ label: "Custas (Personalizado)", value: customCustas, type: 'custa' });
        if (honorarioType === "fixed") {
          itemizedDetails.push({ label: "Honorários (Personalizado)", value: customHonorarios, type: 'honorario' });
        } else {
          itemizedDetails.push({ label: `Honorários (${customPercentage}%)`, value: (valorCivel || 0) * (customPercentage / 100), type: 'honorario' });
        }
      } else {
        selectedProcess.items.forEach(item => {
          if (selectedItems[item.label]) {
            let val = item.value;
            // Se for honorário e estiver em modo percentual, recalcula
            if (item.type === 'honorario' && honorarioType === 'percentage') {
              val = (valorCivel || 0) * (customPercentage / 100);
            } else if (item.type === 'honorario' && customHonorarios !== item.value && customHonorarios !== 0) {
              val = customHonorarios;
            }
            
            // Lógica especial para Limpeza de Ficha
            if (selectedProcess.id === 'limpeza_ficha' && item.label === 'Taxa de Processamento Base') {
              crimesLimpeza.forEach(c => {
                val += GRAVIDADE_CRIMES[c.typeIndex].value;
              });
            }

            itemizedDetails.push({ ...item, value: val });
          }
        });
      }

      // Adicionais de nome
      if (hasAlteracaoNome && (selectedProcess.id === 'adocao' || selectedProcess.id === 'casamento')) {
        if (!itemizedDetails.find(i => i.label === "Alteração de Sobrenome")) {
          itemizedDetails.push({ label: "Alteração de Sobrenome", value: 2000000, type: 'custa' });
          if (selectedProcess.id === 'casamento') {
             itemizedDetails.push({ label: "Honorários p/ Alteração de Nome", value: 80000, type: 'honorario' });
          }
        }
      }
    }

    if (diligencias > 0) extras += diligencias * 20000;
    if (hasJuiz) extras += 60000;
    if (hasPromotor) extras += 80000;
    if (hasDesembargador) extras += 120000;
    outrasCustas.forEach(c => { extras += c.value; });

    const custasTotal = itemizedDetails.filter(i => (i.type === 'custa' || i.type === 'despesa') && includeCustas).reduce((acc, curr) => acc + curr.value, 0);
    const honorariosTotal = itemizedDetails.filter(i => i.type === 'honorario' && includeHonorarios).reduce((acc, curr) => acc + curr.value, 0);
    const finalExtras = includeExtras ? extras : 0;

    return {
      custas: custasTotal,
      honorarios: honorariosTotal,
      extras: finalExtras,
      total: custasTotal + honorariosTotal + finalExtras,
      itemizedDetails: itemizedDetails.filter(i => {
        if (i.type === 'honorario') return includeHonorarios;
        return includeCustas;
      })
    };
  }, [selectedProcess, diligencias, hasJuiz, hasPromotor, hasDesembargador, valorCivel, hasAlteracaoNome, includeCustas, includeHonorarios, includeExtras, customCustas, customHonorarios, honorarioType, customPercentage, outrasCustas, selectedItems, crimesLimpeza]);

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
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={generatePDF} 
            disabled={!selectedProcess} 
            variant="outline"
            className="border-gold text-gold hover:bg-gold hover:text-black font-bold"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button 
            onClick={copySummary} 
            disabled={!selectedProcess} 
            className="bg-gold hover:bg-gold-dark text-black font-bold"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar Resumo
          </Button>
        </div>
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

              {/* Personalização de Custas e Honorários */}
              {selectedProcessId && (
                <div className="space-y-4 p-4 border rounded-lg bg-secondary/10">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4 text-gold" />
                    Valores Principais
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Custas Processuais (R$)</Label>
                      <Input 
                        type="number" 
                        value={selectedProcessId === 'outros' ? customCustas : (selectedProcess?.custas && typeof selectedProcess.custas === 'number' ? selectedProcess.custas : customCustas)} 
                        onChange={e => setCustomCustas(Number(e.target.value))}
                        disabled={selectedProcessId !== 'outros'}
                        className="bg-background h-8 text-sm"
                      />
                      {selectedProcessId !== 'outros' && (
                        <p className="text-[10px] text-muted-foreground italic">Valor padrão da tabela.</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Honorários</Label>
                        <RadioGroup 
                          value={honorarioType} 
                          onValueChange={(v: "fixed" | "percentage") => setHonorarioType(v)}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fixed" id="fixed" />
                            <Label htmlFor="fixed" className="text-[10px]">Fixo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="percentage" id="percentage" />
                            <Label htmlFor="percentage" className="text-[10px]">Percentual</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {honorarioType === "fixed" ? (
                        <div className="space-y-1">
                          <Label className="text-[10px]">Valor (R$)</Label>
                          <Input 
                            type="number" 
                            value={customHonorarios} 
                            onChange={e => setCustomHonorarios(Number(e.target.value))}
                            className="bg-background h-8 text-sm"
                          />
                          <p className="text-[9px] text-amber-500 font-medium flex items-center gap-1">
                            <Info className="h-2 w-2" />
                            Piso OAB-SP: R$ 30.000,00
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Base (R$)</Label>
                            <Input 
                              type="number" 
                              value={valorCivel || ""} 
                              onChange={e => setValorCivel(Number(e.target.value))}
                              className="bg-background h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Percentual (%)</Label>
                            <Input 
                              type="number" 
                              value={customPercentage} 
                              onChange={e => setCustomPercentage(Number(e.target.value))}
                              className="bg-background h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
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
                Custas Adicionais e Verbas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seção unificada de Verbas e Diligências */}
              <div className="space-y-4 p-4 border rounded-lg bg-secondary/10">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-gold" />
                  Verbas e Diligências
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex justify-between text-xs">
                      Diligências (Oficial de Justiça)
                      <span className="text-gold font-mono">{formatBRL(diligencias * 20000)}</span>
                    </Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="number" 
                        min="0" 
                        value={diligencias} 
                        onChange={e => setDiligencias(Math.max(0, Number(e.target.value)))}
                        className="w-24 bg-background"
                      />
                      <span className="text-[10px] text-muted-foreground">R$ 20.000,00 cada</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Verbas Indenizatórias</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="flex items-center space-x-2 border p-2 rounded bg-background">
                        <Checkbox id="juiz" checked={hasJuiz} onCheckedChange={(v) => setHasJuiz(!!v)} />
                        <Label htmlFor="juiz" className="text-[10px] cursor-pointer">Juiz (60k)</Label>
                      </div>
                      <div className="flex items-center space-x-2 border p-2 rounded bg-background">
                        <Checkbox id="promotor" checked={hasPromotor} onCheckedChange={(v) => setHasPromotor(!!v)} />
                        <Label htmlFor="promotor" className="text-[10px] cursor-pointer">Promotor (80k)</Label>
                      </div>
                      <div className="flex items-center space-x-2 border p-2 rounded bg-background">
                        <Checkbox id="desemb" checked={hasDesembargador} onCheckedChange={(v) => setHasDesembargador(!!v)} />
                        <Label htmlFor="desemb" className="text-[10px] cursor-pointer">Desemb. (120k)</Label>
                      </div>
                    </div>
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
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer" onClick={() => setIncludeCustas(!includeCustas)}>Custas Judiciais (Base)</p>
                      </div>
                      <p className={`font-medium transition-opacity ${!includeCustas ? 'opacity-30' : ''}`}>
                        {selectedProcess ? formatBRL(calculations.custas) : "—"}
                      </p>
                    </div>
                    <Scale className={`h-4 w-4 transition-colors ${includeCustas ? 'text-gold/50' : 'text-muted-foreground/30'}`} />
                  </div>

                  {includeExtras && diligencias > 0 && (
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5 pl-5 border-l border-gold/20">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Diligências ({diligencias}x)</p>
                        <p className="text-xs font-medium">{formatBRL(diligencias * 20000)}</p>
                      </div>
                    </div>
                  )}

                  {includeExtras && (hasJuiz || hasPromotor || hasDesembargador) && (
                    <div className="space-y-1 pl-5 border-l border-gold/20">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Verbas Indenizatórias</p>
                      <div className="space-y-0.5">
                        {hasJuiz && <div className="flex justify-between text-[10px]"><span className="opacity-70">Juiz:</span> <span>{formatBRL(60000)}</span></div>}
                        {hasPromotor && <div className="flex justify-between text-[10px]"><span className="opacity-70">Promotor:</span> <span>{formatBRL(80000)}</span></div>}
                        {hasDesembargador && <div className="flex justify-between text-[10px]"><span className="opacity-70">Desemb.:</span> <span>{formatBRL(120000)}</span></div>}
                      </div>
                    </div>
                  )}

                  {includeExtras && outrasCustas.length > 0 && (
                    <div className="space-y-1 pl-5 border-l border-gold/20">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Custas Personalizadas</p>
                      <div className="space-y-0.5">
                        {outrasCustas.map((c) => (
                          <div key={c.id} className="flex justify-between text-[10px]">
                            <span className="opacity-70 truncate max-w-[120px]">{c.description || "Outra"}:</span>
                            <span>{formatBRL(c.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

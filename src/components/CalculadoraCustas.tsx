import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, Receipt, Scale, Briefcase, Gavel, 
  Trash2, Plus, Info, Copy, CheckCircle2,
  CheckSquare, Square, FileText, Download,
  Coins, AlertTriangle, ChevronRight, FileDown,
  Printer, ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
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
import html2canvas from "html2canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const CurrencyInput = ({ value, onChange, disabled, className, label, error }: { 
  value: number; 
  onChange: (val: number) => void; 
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));

  useEffect(() => {
    setDisplayValue(value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = Number(rawValue) / 100;
    setDisplayValue(numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    onChange(numericValue);
  };

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</Label>}
      <div className="relative group">
        <div className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-gold opacity-50 group-focus-within:opacity-100 transition-opacity",
          error && "text-destructive opacity-100"
        )}>
          <Coins className="h-3.5 w-3.5" />
        </div>
        <Input
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "pl-9 bg-background/50 border-border hover:border-gold/30 focus:border-gold transition-all font-mono text-sm h-10 shadow-sm",
            error && "border-destructive focus:border-destructive",
            className
          )}
        />
      </div>
    </div>
  );
};

const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  pisoHonorario?: number;
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
    name: "Recursos Criminais e Cíveis", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true },
      { label: "Taxa de Preparo Recursal", value: 50000, type: 'custa', required: true }
    ],
    pisoHonorario: 75000
  },
  { 
    id: "mandados", 
    name: "Ação Mandamental (MS, HC, HD)", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true },
      { label: "Custas de Impetração", value: 50000, type: 'custa', required: true }
    ],
    obs: "Mandado de Segurança, Habeas Corpus e Habeas Data."
  },
  { 
    id: "defesa_detido", 
    name: "Defesa de Acusado", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true }
    ],
    obs: "Honorários: R$ 30.000,00 (até 10 min) ou R$ 35.000,00 (> 10 min).",
    pisoHonorario: 30000 
  },
  { 
    id: "acoes_civeis", 
    name: "Ações Cíveis (Danos Morais/Materiais)", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true },
      { label: "Taxa Judiciária", value: 25000, type: 'custa', required: true }
    ],
    obs: "Danos morais: R$ 40k a R$ 2M. Honorários sugeridos: 20%."
  },
  { 
    id: "porte_arma", 
    name: "Porte de Arma de Fogo", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true },
      { label: "Exame Psicológico", value: 90000, type: 'despesa' },
      { label: "Armamento", value: 100000, type: 'despesa' },
      { label: "Munições", value: 70000, type: 'despesa' }
    ],
    obs: "Valores incluem custos obrigatórios com exame, arma e munições.",
    pisoHonorario: 110000
  },
  { 
    id: "limpeza_ficha", 
    name: "Exclusão de Antecedentes Criminais", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true },
      { label: "Ação Judicial", value: 25000, type: 'custa', required: true }
    ],
    obs: "Soma de Petição Inicial (R$ 25.000) e Ação Judicial (R$ 25.000).",
    pisoHonorario: 110000
  },
  { 
    id: "divorcio", 
    name: "Ação de Divórcio", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true },
      { label: "Taxas Judiciais", value: 0, type: 'custa', required: true }
    ],
    obs: "Custas conforme decreto judicial vigente.",
    pisoHonorario: 115000
  },
  { 
    id: "alvara", 
    name: "Alvará de Funcionamento", 
    items: [
      { label: "Custas TJ-SP (Inclui Inicial)", value: 150000, type: 'custa', required: true },
      { label: "Taxa AVCB (Bombeiros)", value: 50000, type: 'custa' }
    ],
    obs: "Obrigatório o pagamento da Taxa AVCB à parte.",
    pisoHonorario: 35000
  },
  { 
    id: "casamento", 
    name: "Certidão de Casamento", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true },
      { label: "Certidão de Casamento", value: 100000, type: 'custa' },
      { label: "Valor da Ação", value: 750000, type: 'custa', required: true }
    ],
    obs: "Total das taxas soma R$ 875.000,00.",
    pisoHonorario: 90000
  },
  { 
    id: "adocao", 
    name: "Ação de Adoção", 
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true },
      { label: "Certidão de Nascimento (Atualização)", value: 250000, type: 'custa' },
      { label: "Valor da Ação", value: 950000, type: 'custa', required: true }
    ],
    obs: "Total das taxas soma R$ 1.225.000,00."
  },
  {
    id: "outros",
    name: "Outros (Personalizado)",
    items: [
      { label: "Petição Inicial", value: 25000, type: 'custa', required: true }
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  
  const sortedProcessTypes = useMemo(() => {
    const regular = PROCESS_TYPES.filter(p => p.id !== 'outros')
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const outros = PROCESS_TYPES.find(p => p.id === 'outros');
    
    const result = [...regular];
    if (outros) result.push(outros);
    return result;
  }, []);

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

      // Reset specific inputs
      setDiligencias(0);
      setCrimesLimpeza([]);
      setHasAlteracaoNome(false);

      // Valores iniciais para personalização conforme o documento enviado
      if (selectedProcess.id === 'recursos') {
        setCustomHonorarios(75000);
        setHonorarioType("fixed");
      } else if (selectedProcess.id === 'defesa_detido') {
        setCustomHonorarios(30000); // Piso até 10 min
        setHonorarioType("fixed");
      } else if (selectedProcess.id === 'acoes_civeis') {
        setHonorarioType("percentage");
        setCustomPercentage(20);
      } else if (selectedProcess.id === 'porte_arma') {
        setCustomHonorarios(110000);
        setHonorarioType("fixed");
      } else if (selectedProcess.id === 'limpeza_ficha') {
        setCustomHonorarios(110000);
        setHonorarioType("fixed");
      } else if (selectedProcess.id === 'divorcio') {
        setCustomHonorarios(115000);
        setHonorarioType("fixed");
      } else if (selectedProcess.id === 'alvara') {
        setCustomHonorarios(35000);
        setHonorarioType("fixed");
      } else if (selectedProcess.id === 'casamento') {
        setCustomHonorarios(90000);
        setHonorarioType("fixed");
      } else {
        setCustomHonorarios(0);
        setHonorarioType("fixed");
      }
      
      const custaItem = selectedProcess.items.find(i => i.type === 'custa');
      if (custaItem) {
        setCustomCustas(custaItem.value);
      } else {
        setCustomCustas(0);
      }
    }
  }, [selectedProcessId, selectedProcess]);

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
      // Itens discriminados do processo (taxas e despesas operacionais)
      selectedProcess.items.forEach(item => {
        if (item.required || selectedItems[item.label]) {
          let val = item.value;
          
          if (selectedProcess.id === 'limpeza_ficha' && item.label === 'Ação Judicial') {
            crimesLimpeza.forEach(c => {
              val += GRAVIDADE_CRIMES[c.typeIndex].value;
            });
          }

          itemizedDetails.push({ ...item, value: val });
        }
      });

      // Honorários - Controlados exclusivamente pela personalização
      if (includeHonorarios) {
        let hValue = 0;
        let hLabel = "Honorários Advocatícios";
        
        if (honorarioType === "fixed") {
          hValue = customHonorarios;
        } else {
          hValue = (valorCivel || 0) * (customPercentage / 100);
          hLabel = `Honorários Advocatícios (${customPercentage}%)`;
        }
        
        itemizedDetails.push({ label: hLabel, value: hValue, type: 'honorario' });
      }

      // Adicionais de nome
      if (hasAlteracaoNome && (selectedProcess.id === 'adocao' || selectedProcess.id === 'casamento')) {
        if (!itemizedDetails.find(i => i.label === "Alteração de Sobrenome")) {
          itemizedDetails.push({ label: "Alteração de Sobrenome", value: 2000000, type: 'custa' });
        }
      }

      // Outros Processos Customizados
      if (selectedProcess.id === 'outros' && customCustas > 0) {
        itemizedDetails.push({ label: "Outras Custas Judiciais", value: customCustas, type: 'custa' });
      }
    }

    if (diligencias > 0) extras += diligencias * 20000;
    if (hasJuiz) extras += 60000;
    if (hasPromotor) extras += 80000;
    if (hasDesembargador) extras += 120000;
    outrasCustas.forEach(c => { extras += c.value; });

    const custasTotal = includeCustas ? itemizedDetails.filter(i => (i.type === 'custa' || i.type === 'despesa')).reduce((acc, curr) => acc + curr.value, 0) : 0;
    const honorariosTotal = includeHonorarios ? itemizedDetails.filter(i => i.type === 'honorario').reduce((acc, curr) => acc + curr.value, 0) : 0;
    const finalExtras = includeExtras ? extras : 0;

    let pisoCalculado = selectedProcess?.pisoHonorario || 0;
    if (selectedProcess?.id === 'defesa_detido') {
      pisoCalculado = detidoMais10Min ? 35000 : 30000;
    }

    return {
      custas: custasTotal,
      honorarios: honorariosTotal,
      extras: finalExtras,
      total: custasTotal + honorariosTotal + finalExtras,
      itemizedDetails: itemizedDetails.filter(i => {
        if (i.type === 'honorario') return includeHonorarios;
        return includeCustas;
      }).map(i => ({ ...i, required: (selectedProcess?.items?.find(orig => orig.label === i.label)?.required) })),
      piso: pisoCalculado
    };
  }, [selectedProcess, diligencias, hasJuiz, hasPromotor, hasDesembargador, valorCivel, hasAlteracaoNome, includeCustas, includeHonorarios, includeExtras, customCustas, customHonorarios, honorarioType, customPercentage, outrasCustas, selectedItems, crimesLimpeza, detidoMais10Min]);

  const isBelowPiso = useMemo(() => {
    if (!selectedProcess) return false;
    
    // Caso especial para Ações Cíveis (Danos Morais/Materiais): 20% sobre o total
    if (selectedProcess.id === 'acoes_civeis') {
      const valorReferencia = valorCivel || 0;
      const honorariosMinimos = valorReferencia * 0.20;
      return calculations.honorarios < honorariosMinimos;
    }

    if (!calculations.piso) return false;
    return calculations.honorarios < calculations.piso;
  }, [calculations.honorarios, calculations.piso, selectedProcess, valorCivel]);

  const copySummary = () => {
    if (!selectedProcess) return;

    const summary = [
      "═══ ORÇAMENTO PROCESSUAL ═══",
      `Processo: ${selectedProcess.name}`,
      `Emissão: ${new Date().toLocaleDateString("pt-BR")}`,
      "",
      "DETALHAMENTO:",
      ...calculations.itemizedDetails.map(item => `• ${item.label}: ${formatBRL(item.value)}`),
      includeExtras && calculations.extras > 0 ? `• Taxas/Diligências Extras: ${formatBRL(calculations.extras)}` : null,
      "",
      "────────────────────────",
      `TOTAL ESTIMADO: ${formatBRL(calculations.total)}`,
      "────────────────────────",
      "",
      selectedProcess.obs ? `Obs: ${selectedProcess.obs}` : null,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(summary);
    toast.success("Orçamento copiado para a área de transferência!");
  };

  const openPreview = () => {
    if (!selectedProcess) return;
    setPreviewOpen(true);
  };

  const captureCanvas = async () => {
    if (!previewRef.current) return null;
    return await html2canvas(previewRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
  };

  const exportJPG = async () => {
    const canvas = await captureCanvas();
    if (!canvas || !selectedProcess) return;
    const link = document.createElement("a");
    link.download = `Orcamento_${selectedProcess.name.replace(/\s+/g, "_")}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
    toast.success("JPG baixado!");
  };

  const exportPDF = async () => {
    const canvas = await captureCanvas();
    if (!canvas || !selectedProcess) return;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Orcamento_${selectedProcess.name.replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const printPreview = async () => {
    const canvas = await captureCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Imprimir Orçamento</title></head><body style="margin:0"><img src="${dataUrl}" style="width:100%" onload="window.print();window.close()"/></body></html>`);
    w.document.close();
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Calculator className="h-6 w-6 text-gold" />
            </div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
              Calculadora de Custas
            </h1>
          </div>
          <p className="text-muted-foreground">
            Cálculo estratégico de custas, despesas e honorários profissionais.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={openPreview} 
            disabled={!selectedProcess} 
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold hover:text-black transition-all"
          >
            <FileText className="mr-2 h-4 w-4" />
            Visualizar Orçamento
          </Button>
          <Button 
            onClick={copySummary} 
            disabled={!selectedProcess} 
            className="bg-gold hover:bg-gold-dark text-black font-bold shadow-gold/20 shadow-lg"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar Orçamento
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
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gold" />
                  Natureza da Ação
                </Label>
                <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                  <SelectTrigger className="h-12 border-gold/20 bg-background/50 hover:border-gold focus:ring-gold transition-all">
                    <SelectValue placeholder="Selecione o tipo de processo judicial..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {sortedProcessTypes.map(p => (
                      <SelectItem key={p.id} value={p.id} className="py-3">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AnimatePresence>
                  {selectedProcess?.obs && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-secondary/40 border border-gold/10 flex items-start gap-3 mt-2"
                    >
                      <Info className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {selectedProcess.obs}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedProcess && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6 pt-2"
                >
                  {/* Discriminação de Despesas e Taxas do Processo */}
                  {selectedProcess.id !== 'outros' && selectedProcess.items.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <CheckSquare className="h-3 w-3 text-gold" />
                        Composição de Custas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedProcess.items.map((item) => (
                          <div 
                            key={item.label} 
                            className={cn(
                              "flex items-center space-x-3 p-3 border rounded-xl bg-background/30 transition-all duration-300",
                              item.required 
                                ? "border-gold/30 bg-gold/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] opacity-100" 
                                : "hover:border-gold/40 hover:bg-secondary/20 border-transparent cursor-pointer"
                            )}
                            onClick={() => !item.required && setSelectedItems({ ...selectedItems, [item.label]: !selectedItems[item.label] })}
                          >
                            <Checkbox 
                              id={`item-${item.label}`} 
                              checked={item.required ? true : (selectedItems[item.label] || false)}
                              disabled={item.required}
                              className={cn(
                                "h-4 w-4 transition-colors",
                                item.required ? "border-gold data-[state=checked]:bg-gold data-[state=checked]:text-black" : "border-border"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs truncate font-medium", item.required ? "text-foreground" : "text-muted-foreground")}>{item.label}</p>
                              <p className="text-[10px] font-mono text-gold/80">{formatBRL(item.value)}</p>
                            </div>
                            {item.required && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-3 w-3 text-gold/40" />
                                  </TooltipTrigger>
                                  <TooltipContent>Item obrigatório por lei</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-secondary/20 border border-gold/10 shadow-inner space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-gold" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">Ajustes Estratégicos</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <CurrencyInput 
                        label="Custas Processuais Base"
                        value={selectedProcessId === 'outros' ? customCustas : (selectedProcess?.items?.find(i => i.type === 'custa')?.value ?? customCustas)} 
                        onChange={setCustomCustas}
                        disabled={selectedProcessId !== 'outros'}
                      />

                      {selectedProcessId === 'defesa_detido' && (
                        <div className="flex items-center space-x-3 p-3 bg-background/40 rounded-xl border border-gold/10">
                          <Checkbox 
                            id="tempo-toggle" 
                            checked={detidoMais10Min} 
                            onCheckedChange={(v) => setDetidoMais10Min(!!v)}
                            className="h-5 w-5 border-gold/30"
                          />
                          <Label htmlFor="tempo-toggle" className="text-xs cursor-pointer leading-tight">
                            Atendimento superior a 10 minutos?<br/>
                            <span className="text-[10px] text-gold/60 italic">(Ajusta o piso legal para R$ 35k)</span>
                          </Label>
                        </div>
                      )}
                    </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Regime de Honorários</Label>
                          <RadioGroup 
                            value={honorarioType} 
                            onValueChange={(v: "fixed" | "percentage") => setHonorarioType(v)}
                            className="flex gap-4 p-1.5 bg-background/50 rounded-lg border border-border w-fit"
                          >
                            <div className="flex items-center space-x-2 px-2">
                              <RadioGroupItem value="fixed" id="fixed" className="text-gold" />
                              <Label htmlFor="fixed" className="text-xs cursor-pointer">Valor Fixo</Label>
                            </div>
                            <div className="flex items-center space-x-2 px-2">
                              <RadioGroupItem value="percentage" id="percentage" className="text-gold" />
                              <Label htmlFor="percentage" className="text-xs cursor-pointer">Percentual</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {honorarioType === "fixed" ? (
                          <div className="space-y-1">
                            <CurrencyInput 
                              label="Valor Pretendido"
                              value={customHonorarios} 
                              onChange={setCustomHonorarios}
                              error={isBelowPiso && includeHonorarios}
                            />
                            <p className={cn(
                              "text-[9px] font-medium flex items-center gap-1 mt-1 transition-colors",
                              isBelowPiso && includeHonorarios ? "text-destructive" : "text-gold"
                            )}>
                              <Info className="h-2 w-2" />
                              {selectedProcess?.id === 'acoes_civeis'
                                ? `Piso Jaguaré: 20% do total (${formatBRL((valorCivel || 0) * 0.20)})`
                                : calculations.piso > 0 
                                  ? `Piso Jaguaré (Decreto-Lei 001/2024): ${formatBRL(calculations.piso)}` 
                                  : "Piso conforme decreto vigente."}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <CurrencyInput 
                              label="Base de Cálculo (Causa)"
                              value={valorCivel} 
                              onChange={setValorCivel}
                            />
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Alíquota (%)</Label>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  value={customPercentage} 
                                  onChange={e => setCustomPercentage(Number(e.target.value))}
                                  className="bg-background/50 border-border h-10 text-sm font-mono focus:border-gold transition-all"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          <AnimatePresence>
            {selectedProcess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="border-gold/10 bg-background/40 backdrop-blur-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="h-5 w-5 text-gold" />
                      Variáveis Processuais
                    </CardTitle>
                    <CardDescription className="text-[11px] uppercase tracking-wider">
                      Taxas de diligência e verbas indenizatórias
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-secondary/10 border border-gold/5">
                      <div className="space-y-3">
                        <Label className="flex justify-between text-xs font-bold uppercase tracking-wider">
                          Diligências Judiciais
                          <span className="text-gold font-mono">{formatBRL(diligencias * 20000)}</span>
                        </Label>
                        <div className="flex items-center gap-4">
                          <Input 
                            type="number" 
                            min="0" 
                            value={diligencias} 
                            onChange={e => setDiligencias(Math.max(0, Number(e.target.value)))}
                            className="w-24 bg-background/50 border-gold/20 h-10 font-mono"
                          />
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            Oficial de Justiça<br/>R$ 20.000,00 cada
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider">Verbas Indenizatórias</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'juiz', checked: hasJuiz, onChange: setHasJuiz, label: 'Juiz de Direito', val: '60k' },
                            { id: 'promotor', checked: hasPromotor, onChange: setHasPromotor, label: 'Promotor de Justiça', val: '80k' },
                            { id: 'desemb', checked: hasDesembargador, onChange: setHasDesembargador, label: 'Desembargador', val: '120k' },
                          ].map((v) => (
                            <div key={v.id} 
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer",
                                v.checked ? "border-gold/30 bg-gold/5" : "border-transparent bg-background/20 hover:bg-secondary/30"
                              )}
                              onClick={() => v.onChange(!v.checked)}
                            >
                              <div className="flex items-center space-x-2">
                                <Checkbox id={v.id} checked={v.checked} onCheckedChange={(val) => v.onChange(!!val)} className="border-gold/30" />
                                <Label htmlFor={v.id} className="text-[11px] cursor-pointer font-medium">{v.label}</Label>
                              </div>
                              <span className="text-[10px] font-mono text-gold/70">R$ {v.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gold/10">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                          <Plus className="h-3 w-3 text-gold" />
                          Outras Custas
                        </Label>
                        <Button size="sm" variant="ghost" onClick={addOutraCusta} className="h-7 text-[10px] text-gold hover:bg-gold/10">
                          Adicionar Item
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {outrasCustas.map((c) => (
                          <motion.div 
                            key={c.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-secondary/10 rounded-xl border border-gold/10 shadow-sm relative group"
                          >
                            <div className="md:col-span-6">
                              <Input 
                                placeholder="Descrição da despesa..." 
                                value={c.description} 
                                onChange={e => updateOutraCusta(c.id, "description", e.target.value)}
                                className="h-9 bg-background/50 border-border text-sm"
                              />
                            </div>
                            <div className="md:col-span-5">
                              <CurrencyInput 
                                value={c.value} 
                                onChange={val => updateOutraCusta(c.id, "value", val)}
                                className="h-9"
                              />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeOutraCusta(c.id)} 
                                className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 h-9 w-9 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                        {outrasCustas.length === 0 && (
                          <div className="text-center py-6 border-2 border-dashed border-border rounded-xl opacity-40">
                            <p className="text-[10px] uppercase tracking-widest">Nenhum item extra adicionado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
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
                          className="h-4 w-4 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-black rounded-sm"
                        />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gold/80 cursor-pointer" onClick={() => setIncludeCustas(!includeCustas)}>Custas e Despesas</p>
                      </div>
                      <p className={cn("text-lg font-display tracking-tight transition-opacity", !includeCustas && "opacity-30")}>
                        {selectedProcess ? formatBRL(calculations.custas) : "—"}
                      </p>
                    </div>
                    <Scale className={cn("h-5 w-5 transition-colors", includeCustas ? "text-gold/60" : "text-muted-foreground/30")} />
                  </div>

                  <AnimatePresence>
                    {includeCustas && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1.5 pl-6 border-l-2 border-gold/10 ml-2"
                      >
                        {calculations.itemizedDetails.filter(i => i.type !== 'honorario').map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] py-0.5 group">
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                            <span className="font-mono text-gold/90">{formatBRL(item.value)}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="h-px bg-gold/10 my-2" />

                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="inc-extras" 
                          checked={includeExtras} 
                          onCheckedChange={(v) => setIncludeExtras(!!v)}
                          className="h-4 w-4 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-black rounded-sm"
                        />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gold/80 cursor-pointer" onClick={() => setIncludeExtras(!includeExtras)}>Diligências e Verbas</p>
                      </div>
                      <p className={cn("text-lg font-display tracking-tight transition-opacity", !includeExtras && "opacity-30")}>
                        {formatBRL(calculations.extras)}
                      </p>
                    </div>
                    <Gavel className={cn("h-5 w-5 transition-colors", includeExtras ? "text-gold/60" : "text-muted-foreground/30")} />
                  </div>

                  <AnimatePresence>
                    {includeExtras && (diligencias > 0 || hasJuiz || hasPromotor || hasDesembargador || outrasCustas.length > 0) && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1.5 pl-6 border-l-2 border-gold/10 ml-2"
                      >
                        {diligencias > 0 && (
                          <div className="flex justify-between text-[11px] py-0.5">
                            <span className="text-muted-foreground">Diligências ({diligencias}x)</span>
                            <span className="font-mono text-gold/90">{formatBRL(diligencias * 20000)}</span>
                          </div>
                        )}
                        {(hasJuiz || hasPromotor || hasDesembargador) && (
                          <div className="space-y-1">
                            {hasJuiz && <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Juiz:</span> <span className="font-mono">{formatBRL(60000)}</span></div>}
                            {hasPromotor && <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Promotor:</span> <span className="font-mono">{formatBRL(80000)}</span></div>}
                            {hasDesembargador && <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Desemb.:</span> <span className="font-mono">{formatBRL(120000)}</span></div>}
                          </div>
                        )}
                        {outrasCustas.map((c) => (
                          <div key={c.id} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-muted-foreground truncate max-w-[140px]">{c.description || "Outra"}</span>
                            <span className="font-mono text-gold/90">{formatBRL(c.value)}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="h-px bg-gold/10 my-2" />

                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="inc-honorarios" 
                          checked={includeHonorarios} 
                          onCheckedChange={(v) => setIncludeHonorarios(!!v)}
                          className={cn(
                            "h-4 w-4 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-black rounded-sm",
                            isBelowPiso && includeHonorarios && "border-destructive ring-destructive/20 ring-4"
                          )}
                        />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gold/80 cursor-pointer" onClick={() => setIncludeHonorarios(!includeHonorarios)}>Honorários Profissionais</p>
                      </div>
                      <p className={cn(
                        "text-lg font-display tracking-tight transition-opacity",
                        !includeHonorarios && "opacity-30",
                        isBelowPiso && includeHonorarios && "text-destructive font-bold"
                      )}>
                        {formatBRL(calculations.honorarios)}
                      </p>
                      {isBelowPiso && includeHonorarios && (
                        <motion.p 
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[10px] text-destructive flex items-center gap-1.5 font-bold mt-1.5 bg-destructive/10 px-2 py-1 rounded shadow-sm border border-destructive/20"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 fill-destructive text-white" />
                          ABAIXO DO PISO ({formatBRL(selectedProcess?.id === 'acoes_civeis' ? (valorCivel || 0) * 0.20 : calculations.piso)})
                        </motion.p>
                      )}
                    </div>
                    <Briefcase className={cn(
                      "h-5 w-5 transition-colors",
                      includeHonorarios ? (isBelowPiso ? "text-destructive animate-pulse" : "text-gold/60") : "text-muted-foreground/30"
                    )} />
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
            * Este simulador fornece uma estimativa baseada nos valores mínimos do Decreto-Lei N° 001 de 2024 (Art. 7°). 
            O profissional advogado não pode praticar valores abaixo dos estipulados no decreto.
            Os honorários sugeridos respeitam o piso legal obrigatório do Jaguaré RP.
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10 flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-gold" />
              Pré-visualização do Orçamento
            </DialogTitle>
            <div className="flex gap-2 mr-8">
              <Button size="sm" variant="outline" onClick={printPreview} className="h-8 text-xs">
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimir
              </Button>
              <Button size="sm" variant="outline" onClick={exportJPG} className="h-8 text-xs">
                <Download className="mr-1.5 h-3.5 w-3.5" /> JPG
              </Button>
              <Button size="sm" onClick={exportPDF} className="h-8 text-xs bg-gold hover:bg-gold-dark text-black">
                <FileDown className="mr-1.5 h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </DialogHeader>

          {selectedProcess && (
            <div className="p-4 bg-muted/30">
              <div ref={previewRef} className="bg-white text-black mx-auto" style={{ width: "210mm", minHeight: "297mm", padding: "20mm", fontFamily: "Inter, sans-serif" }}>
                {/* Cabeçalho */}
                <div className="border-b-4 pb-6 mb-6" style={{ borderColor: "hsl(0 72% 51%)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-semibold" style={{ color: "hsl(0 72% 51%)" }}>
                        Secretaria da Justiça · Jaguaré RP
                      </p>
                      <h1 className="text-3xl font-bold mt-2 font-display" style={{ fontFamily: "Playfair Display, serif" }}>
                        Orçamento Processual
                      </h1>
                      <p className="text-xs text-gray-600 mt-1">
                        Simulação financeira de custas e honorários — Decreto-Lei N° 001/2024
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full" style={{ backgroundColor: "hsl(0 72% 51%)" }}>
                        <Scale className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">{new Date().toLocaleDateString("pt-BR")}</p>
                      <p className="text-[10px] text-gray-500">{new Date().toLocaleTimeString("pt-BR")}</p>
                    </div>
                  </div>
                </div>

                {/* Info do Processo */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Natureza da Ação</p>
                    <p className="text-sm font-semibold mt-1">{selectedProcess.name}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Modalidade de Honorários</p>
                    <p className="text-sm font-semibold mt-1">
                      {honorarioType === "fixed" ? "Valor Fixo" : `Percentual (${customPercentage}%)`}
                    </p>
                  </div>
                </div>

                {selectedProcess.obs && (
                  <div className="p-3 rounded-lg mb-6 border-l-4 bg-amber-50 border-amber-400">
                    <p className="text-[11px] text-amber-900 leading-relaxed">{selectedProcess.obs}</p>
                  </div>
                )}

                {/* Custas e Despesas */}
                {includeCustas && calculations.itemizedDetails.filter(i => i.type !== 'honorario').length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b-2" style={{ borderColor: "hsl(0 72% 51%)" }}>
                      <h2 className="text-sm font-bold uppercase tracking-wider">Custas e Despesas Processuais</h2>
                      <span className="text-sm font-mono font-bold">{formatBRL(calculations.custas)}</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {calculations.itemizedDetails.filter(i => i.type !== 'honorario').map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">{item.label}</td>
                            <td className="py-2 text-right font-mono">{formatBRL(item.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Diligências e Verbas */}
                {includeExtras && calculations.extras > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b-2" style={{ borderColor: "hsl(0 72% 51%)" }}>
                      <h2 className="text-sm font-bold uppercase tracking-wider">Diligências e Verbas Indenizatórias</h2>
                      <span className="text-sm font-mono font-bold">{formatBRL(calculations.extras)}</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {diligencias > 0 && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">Diligências de Oficial de Justiça ({diligencias}x)</td>
                            <td className="py-2 text-right font-mono">{formatBRL(diligencias * 20000)}</td>
                          </tr>
                        )}
                        {hasJuiz && <tr className="border-b border-gray-100"><td className="py-2 text-gray-700">Verba — Juiz(a) de Direito</td><td className="py-2 text-right font-mono">{formatBRL(60000)}</td></tr>}
                        {hasPromotor && <tr className="border-b border-gray-100"><td className="py-2 text-gray-700">Verba — Promotor(a) de Justiça</td><td className="py-2 text-right font-mono">{formatBRL(80000)}</td></tr>}
                        {hasDesembargador && <tr className="border-b border-gray-100"><td className="py-2 text-gray-700">Verba — Desembargador(a)</td><td className="py-2 text-right font-mono">{formatBRL(120000)}</td></tr>}
                        {outrasCustas.map(c => (
                          <tr key={c.id} className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">{c.description || "Outra despesa"}</td>
                            <td className="py-2 text-right font-mono">{formatBRL(c.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Honorários */}
                {includeHonorarios && calculations.honorarios > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b-2" style={{ borderColor: "hsl(0 72% 51%)" }}>
                      <h2 className="text-sm font-bold uppercase tracking-wider">Honorários Advocatícios</h2>
                      <span className="text-sm font-mono font-bold">{formatBRL(calculations.honorarios)}</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {calculations.itemizedDetails.filter(i => i.type === 'honorario').map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">{item.label}</td>
                            <td className="py-2 text-right font-mono">{formatBRL(item.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {isBelowPiso && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-300 rounded text-[10px] text-red-800 font-semibold">
                        ⚠ ATENÇÃO: O valor está ABAIXO DO PISO legal de {formatBRL(selectedProcess?.id === 'acoes_civeis' ? (valorCivel || 0) * 0.20 : calculations.piso)} (Decreto-Lei 001/2024).
                      </div>
                    )}
                  </div>
                )}

                {/* Total */}
                <div className="mt-8 p-6 rounded-xl text-white" style={{ background: "linear-gradient(135deg, hsl(0 0% 12%), hsl(0 0% 6%))" }}>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "hsl(0 72% 65%)" }}>
                        Valor Total Estimado
                      </p>
                      <p className="text-4xl font-bold mt-2" style={{ fontFamily: "Playfair Display, serif" }}>
                        {formatBRL(calculations.total)}
                      </p>
                    </div>
                    <Receipt className="h-12 w-12 opacity-30" />
                  </div>
                </div>

                {/* Rodapé */}
                <div className="mt-8 pt-4 border-t border-gray-200 text-[9px] text-gray-500 leading-relaxed">
                  <p className="font-semibold mb-1">Observações Legais:</p>
                  <p>• Este orçamento é uma estimativa baseada nos valores mínimos do Decreto-Lei N° 001 de 2024 (Art. 7°) do Ordenamento Jurídico Jaguaré RP.</p>
                  <p>• O profissional advogado não pode praticar valores abaixo dos estipulados no decreto.</p>
                  <p>• Os valores podem sofrer alterações conforme a complexidade e o tempo de tramitação.</p>
                  <p className="mt-2 text-center text-gray-400">Documento gerado em {new Date().toLocaleString("pt-BR")} · Secretaria da Justiça · Jaguaré RP</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

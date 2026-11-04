import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { askAI } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileBarChart, Loader2, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import jsPDF from "jspdf";

interface Props {
  /** Cargos que podem gerar o relatório nesta aba. */
  allowedRoles: string[];
  instituicao: string;
}

const strip = (s: string) => (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export default function RelatorioAtividadeIA({ allowedRoles, instituicao }: Props) {
  const { user, roles, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [inicio, setInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [fim, setFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState("");

  if (!user || !roles.some((r) => allowedRoles.includes(r))) return null;

  const gerar = async () => {
    setLoading(true);
    setTexto("");
    try {
      const { data: movs, error } = await supabase
        .from("movimentacoes")
        .select("tipo, descricao, created_at, processos(numero)")
        .eq("autor_id", user.id)
        .gte("created_at", `${inicio}T00:00:00`)
        .lte("created_at", `${fim}T23:59:59`)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      const lista = (movs || []) as any[];
      const porTipo: Record<string, number> = {};
      lista.forEach((m) => (porTipo[m.tipo] = (porTipo[m.tipo] || 0) + 1));
      const linhas = lista
        .map((m) => `- ${format(new Date(m.created_at), "dd/MM/yyyy")} | ${m.processos?.numero || "s/ nº"} | ${m.tipo}: ${strip(m.descricao).slice(0, 220)}`)
        .join("\n");

      const prompt = `Redija um RELATÓRIO DE ATIVIDADES formal, em português, de ${profile?.nome_completo || "agente"} (${instituicao}), referente ao período de ${format(new Date(inicio + "T12:00"), "dd/MM/yyyy")} a ${format(new Date(fim + "T12:00"), "dd/MM/yyyy")}.
Use APENAS os dados abaixo; não invente atos, números ou processos. Se não houver registros, declare isso.
Estrutura: 1. Identificação; 2. Resumo quantitativo; 3. Principais atuações (por processo); 4. Análise e observações; 5. Conclusão.
Texto corrido, sem HTML, sem markdown com asteriscos.

Total de atos: ${lista.length}
Por tipo: ${JSON.stringify(porTipo)}
Registros:
${linhas || "(nenhum)"}`;

      const res = await askAI("gerar_oficio", prompt, { maxOutputTokens: 6000 });
      if (!res.ok) throw new Error(res.error?.message || "Falha na IA");
      setTexto(strip(String(res.data).replace(/\n/g, "§§")).replace(/§§/g, "\n").replace(/\*\*/g, ""));
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const baixar = () => {
    const doc = new jsPDF();
    doc.setFontSize(13);
    doc.text(`Relatório de Atividades — ${instituicao}`, 15, 18);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(texto, 180);
    let y = 28;
    lines.forEach((l: string) => {
      if (y > 280) { doc.addPage(); y = 18; }
      doc.text(l, 15, y);
      y += 5;
    });
    y += 8;
    if (y > 280) { doc.addPage(); y = 18; }
    doc.text(`${profile?.nome_completo || ""} — gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 15, y);
    doc.save(`relatorio-atividades-${inicio}-${fim}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2">
          <FileBarChart className="h-4 w-4" /> Relatório de Atividade (IA)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Relatório de Atividade — {instituicao}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted-foreground">Início<Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
          <label className="text-xs text-muted-foreground">Fim<Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></label>
        </div>
        <Button onClick={gerar} disabled={loading} className="rounded-xl">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</> : "Gerar relatório"}
        </Button>
        {texto && (
          <>
            <div className="whitespace-pre-wrap text-sm bg-secondary/40 rounded-xl p-4 leading-relaxed">{texto}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(texto); toast.success("Copiado"); }}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
              <Button variant="outline" size="sm" onClick={baixar}><Download className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

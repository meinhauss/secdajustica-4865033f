import { useState } from "react";
import { motion } from "framer-motion";
import { RichTextView, RichTextEditor } from "@/components/ui/rich-text-editor";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Scale, Gavel, BookOpen, ChevronRight, ArrowLeft, FileText, Download, Loader2, Plus, Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

const DECISAO_LABELS: Record<string, string> = {
  mantida: "Sentença Mantida",
  reformada_parcial: "Reformada Parcialmente",
  reformada_total: "Reformada Totalmente",
  anulada: "Sentença Anulada",
  originaria: "Decisão Originária",
  sessao_plenaria: "Sessão Plenária",
};

export default function JurisprudenciaSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <JurisprudenciaDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <JurisprudenciaList onSelect={setSelectedId} />;
}

function JurisprudenciaList({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filterDecisao, setFilterDecisao] = useState("all");
  const [filterClasse, setFilterClasse] = useState("all");
  const { roles } = useAuth();
  const podeCriar = roles.some(r => ["desembargador", "presidente_tribunal", "admin"].includes(r));

  const { data: items } = useQuery({
    queryKey: ["jurisprudencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jurisprudencias")
        .select("*")
        .order("data_julgamento", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = items?.filter((j: any) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      j.ementa?.toLowerCase().includes(q) ||
      j.numero_acordao?.toLowerCase().includes(q) ||
      j.assunto?.toLowerCase().includes(q) ||
      j.desembargador_nome?.toLowerCase().includes(q);
    const matchDecisao = filterDecisao === "all" || j.decisao_tipo === filterDecisao;
    const matchClasse = filterClasse === "all" || j.classe === filterClasse;
    return matchSearch && matchDecisao && matchClasse;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Jurisprudência</h2>
          <p className="text-sm text-muted-foreground">Consulta de ementas e acórdãos do Tribunal de Justiça</p>
        </div>
        {podeCriar && <NovaJurisprudenciaPlenariaDialog />}
      </div>


      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-4 border border-border shadow-institutional">
          <Scale className="h-4 w-4 text-institutional mb-1" />
          <p className="text-2xl font-bold text-foreground">{items?.length || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total de Ementas</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-xl p-4 border border-border shadow-institutional">
          <Gavel className="h-4 w-4 text-institutional mb-1" />
          <p className="text-2xl font-bold text-foreground">{items?.filter((j: any) => j.decisao_tipo === "mantida").length || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mantidas</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-4 border border-border shadow-institutional">
          <BookOpen className="h-4 w-4 text-institutional mb-1" />
          <p className="text-2xl font-bold text-foreground">{items?.filter((j: any) => j.decisao_tipo !== "mantida").length || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reformadas/Anuladas</p>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por ementa, acórdão, assunto ou relator..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={filterDecisao} onValueChange={setFilterDecisao}>
          <SelectTrigger className="rounded-xl w-full sm:w-44"><SelectValue placeholder="Decisão" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Decisões</SelectItem>
            <SelectItem value="mantida">Mantida</SelectItem>
            <SelectItem value="reformada_parcial">Reformada Parcial</SelectItem>
            <SelectItem value="reformada_total">Reformada Total</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
            <SelectItem value="originaria">Decisão Originária</SelectItem>
            <SelectItem value="sessao_plenaria">Sessão Plenária</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClasse} onValueChange={setFilterClasse}>
          <SelectTrigger className="rounded-xl w-full sm:w-40"><SelectValue placeholder="Classe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Classes</SelectItem>
            <SelectItem value="criminal">Criminal</SelectItem>
            <SelectItem value="civil">Civil</SelectItem>
            <SelectItem value="administrativo">Administrativo</SelectItem>
            <SelectItem value="constitucional">Constitucional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filtered.length ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma jurisprudência encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((j: any, i: number) => (
            <motion.div key={j.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => onSelect(j.id)}
              className="bg-card rounded-xl p-4 border border-border shadow-institutional hover:border-institutional/30 transition-all cursor-pointer group">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-institutional">{j.numero_acordao}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                      j.decisao_tipo === "mantida" ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" :
                      j.decisao_tipo === "anulada" ? "bg-destructive/10 text-destructive" :
                      "bg-gold/10 text-gold-dark"
                    }`}>{DECISAO_LABELS[j.decisao_tipo] || j.decisao_tipo}</span>
                    {j.classe && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{j.classe}</span>}
                  </div>
                  <p className="text-sm text-foreground mt-1 line-clamp-2">{j.ementa}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {j.desembargador_nome && <span>Rel.: {j.desembargador_nome}</span>}
                    {j.data_julgamento && <span>{format(new Date(j.data_julgamento), "dd/MM/yyyy", { locale: ptBR })}</span>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-institutional transition-colors flex-shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function JurisprudenciaDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const { data: j } = useQuery({
    queryKey: ["jurisprudencia", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jurisprudencias").select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

  const exportToPDF = async () => {
    if (!j) return;
    setIsExporting(true);
    const element = document.getElementById("jurisprudencia-content");
    if (!element) {
      toast.error("Não foi possível encontrar o conteúdo para exportar.");
      setIsExporting(false);
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 22;
      const headerH = 22;
      const footerH = 14;
      const contentTop = margin + headerH;
      const contentBottom = pageH - margin - footerH;
      const maxW = pageW - margin * 2;
      let y = contentTop;

      // TJSP palette
      const brandR = 20, brandG = 40, brandB = 80; // deep navy

      const stripHtml = (html: string) =>
        (html || "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
          .replace(/<li[^>]*>/gi, "• ")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

      const drawHeader = () => {
        // Faixa institucional
        pdf.setFillColor(brandR, brandG, brandB);
        pdf.rect(0, 0, pageW, 14, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.text("TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO", margin, 9);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text("Jurisprudência", pageW - margin, 9, { align: "right" });

        // Subtítulo com identificação do acórdão
        pdf.setTextColor(brandR, brandG, brandB);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`Acórdão ${String(j.numero_acordao)}`, margin, 20);
        pdf.setDrawColor(brandR, brandG, brandB);
        pdf.setLineWidth(0.3);
        pdf.line(margin, 22, pageW - margin, 22);
      };

      const drawFooter = (pageNum: number, totalPages: number) => {
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(margin, pageH - margin - footerH + 4, pageW - margin, pageH - margin - footerH + 4);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(110, 110, 110);
        pdf.text(
          `Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
          margin,
          pageH - margin - 2
        );
        pdf.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, pageH - margin - 2, { align: "right" });
      };

      const newPage = () => {
        pdf.addPage();
        drawHeader();
        y = contentTop;
      };

      const ensureSpace = (h: number) => {
        if (y + h > contentBottom) newPage();
      };

      const writeHeading = (text: string) => {
        ensureSpace(12);
        y += 2;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(brandR, brandG, brandB);
        pdf.text(text.toUpperCase(), margin, y);
        pdf.setDrawColor(brandR, brandG, brandB);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y + 1.2, margin + 40, y + 1.2);
        y += 6;
      };

      const writeParagraph = (text: string, size = 10.5) => {
        if (!text) return;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(30, 30, 30);
        const paragraphs = text.split(/\n\n+/);
        const lineH = size * 0.5;
        for (const para of paragraphs) {
          const lines = pdf.splitTextToSize(para.replace(/\n/g, " "), maxW);
          for (const line of lines) {
            ensureSpace(lineH);
            pdf.text(line, margin, y, { align: "justify", maxWidth: maxW });
            y += lineH;
          }
          y += 2;
        }
        y += 2;
      };

      const writeMeta = (label: string, value: string) => {
        ensureSpace(6);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(90, 90, 90);
        pdf.text(label.toUpperCase(), margin, y);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10.5);
        pdf.setTextColor(20, 20, 20);
        const lines = pdf.splitTextToSize(value || "—", maxW);
        y += 4.5;
        for (const line of lines) {
          ensureSpace(5);
          pdf.text(line, margin, y);
          y += 5;
        }
        y += 2;
      };

      // Página 1 — cabeçalho + identificação
      drawHeader();

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(110, 110, 110);
      pdf.text(DECISAO_LABELS[j.decisao_tipo] || j.decisao_tipo || "", margin, y);
      y += 8;

      writeMeta("Classe processual", j.classe || "—");
      writeMeta("Assunto", j.assunto || "—");
      writeMeta("Relator(a)", j.desembargador_nome || "—");
      writeMeta(
        "Data do julgamento",
        j.data_julgamento ? format(new Date(j.data_julgamento), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"
      );

      writeHeading("Ementa");
      writeParagraph(j.ementa || "—");

      if (j.decisao_fundamentacao) {
        writeHeading("Fundamentação");
        writeParagraph(stripHtml(j.decisao_fundamentacao));
      }
      if (j.decisao_dispositivo) {
        writeHeading("Dispositivo");
        writeParagraph(stripHtml(j.decisao_dispositivo));
      }

      // Rodapé com numeração final
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        drawFooter(p, totalPages);
      }

      pdf.save(`jurisprudencia-${String(j.numero_acordao).replace(/\//g, "-")}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!j) return <div className="text-center py-16"><p className="text-sm text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isExporting} className="gap-2 rounded-xl border-institutional text-institutional hover:bg-institutional hover:text-white">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar PDF
        </Button>
      </div>

      <div id="jurisprudencia-content" className="space-y-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-institutional">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <BookOpen className="h-6 w-6 text-institutional" />
            <h2 className="font-display text-xl font-bold text-foreground">{j.numero_acordao}</h2>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
              j.decisao_tipo === "mantida" ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400" :
              j.decisao_tipo === "anulada" ? "bg-destructive/10 text-destructive" :
              "bg-gold/10 text-gold-dark"
            }`}>{DECISAO_LABELS[j.decisao_tipo] || j.decisao_tipo}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Classe Processual</p>
              <p className="text-foreground capitalize">{j.classe || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Assunto</p>
              <p className="text-foreground">{j.assunto || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Relator(a)</p>
              <p className="text-foreground">{j.desembargador_nome || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Data do Julgamento</p>
              <p className="text-foreground">{j.data_julgamento ? format(new Date(j.data_julgamento), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> Ementa
            </h3>
            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap leading-relaxed">{j.ementa}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fundamentação</h3>
            <RichTextView html={j.decisao_fundamentacao} className="text-sm mt-2" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispositivo</h3>
            <RichTextView html={j.decisao_dispositivo} className="text-sm mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NovaJurisprudenciaPlenariaDialog() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    numero_acordao: "",
    classe: "criminal",
    assunto: "",
    ementa: "",
    sessao_descricao: "",
    decisao_fundamentacao: "",
    decisao_dispositivo: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.numero_acordao.trim()) throw new Error("Informe o número do acórdão/enunciado.");
      if (!form.ementa.trim()) throw new Error("Informe a ementa.");
      if (!form.sessao_descricao.trim()) throw new Error("Descreva a discussão da sessão plenária.");

      const { error } = await supabase.from("jurisprudencias").insert({
        numero_acordao: form.numero_acordao,
        classe: form.classe,
        assunto: form.assunto || null,
        ementa: form.ementa,
        decisao_tipo: "sessao_plenaria",
        decisao_fundamentacao: form.decisao_fundamentacao || null,
        decisao_dispositivo: form.decisao_dispositivo || null,
        desembargador_id: user!.id,
        desembargador_nome: profile?.nome_completo || "Desembargador(a)",
        data_julgamento: new Date().toISOString(),
        origem: "sessao_plenaria",
        sessao_descricao: form.sessao_descricao,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jurisprudência registrada a partir da sessão plenária.");
      queryClient.invalidateQueries({ queryKey: ["jurisprudencias"] });
      setOpen(false);
      setForm({ numero_acordao: "", classe: "criminal", assunto: "", ementa: "", sessao_descricao: "", decisao_fundamentacao: "", decisao_dispositivo: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl">
          <Users className="h-4 w-4" /> Nova jurisprudência (Sessão Plenária)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-institutional" />
            Registrar jurisprudência de sessão plenária
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Número do Acórdão / Enunciado</Label>
              <Input value={form.numero_acordao} onChange={(e) => setForm({ ...form, numero_acordao: e.target.value })} placeholder="Ex: SP-2026/001" />
            </div>
            <div>
              <Label>Classe</Label>
              <Select value={form.classe} onValueChange={(v) => setForm({ ...form, classe: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="criminal">Criminal</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="constitucional">Constitucional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Assunto</Label>
            <Input value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} placeholder="Tema discutido na sessão" />
          </div>
          <div>
            <Label>Resumo da discussão em sessão plenária</Label>
            <Textarea value={form.sessao_descricao} onChange={(e) => setForm({ ...form, sessao_descricao: e.target.value })} placeholder="Descreva o debate, divergências e consenso firmado..." rows={4} />
          </div>
          <div>
            <Label>Ementa</Label>
            <Textarea value={form.ementa} onChange={(e) => setForm({ ...form, ementa: e.target.value })} placeholder="EMENTA: ..." rows={5} />
          </div>
          <div>
            <Label>Fundamentação</Label>
            <RichTextEditor value={form.decisao_fundamentacao} onChange={(v) => setForm({ ...form, decisao_fundamentacao: v })} minHeight="140px" />
          </div>
          <div>
            <Label>Dispositivo / Tese firmada</Label>
            <RichTextEditor value={form.decisao_dispositivo} onChange={(v) => setForm({ ...form, decisao_dispositivo: v })} minHeight="100px" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publicar jurisprudência
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

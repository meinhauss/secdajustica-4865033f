import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Landmark, Search, Home, ExternalLink, Gavel, Plus, Pencil, Trash2, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logoSjc from "@/assets/logo-sjc.jpg";

interface Lei {
  id: string;
  numero: string;
  titulo: string;
  categoria: string;
  ementa: string | null;
  conteudo: string;
  data_vigencia: string | null;
  revogada: boolean;
  created_at: string;
}

const CATEGORIAS_PADRAO = [
  "Institucional e Disposições Gerais",
  "Constituição da República de Jaguaré",
  "Poder Judiciário — Organização e Estrutura",
  "Tribunal de Justiça (TJ)",
  "Ministério Público (MP)",
  "Advocacia e OAB",
  "Conselho de Ética Profissional (CEP)",
  "Normas do Fórum",
  "Código de Ética e Conduta",
  "UNISP — Universidade de Direito",
  "Decretos-Lei",
  "Processo Penal",
  "Processo Civil",
  "Direito Penal Especial",
  "Defensoria Pública",
  "Direito de Família",
];

export default function OrdenamentoJuridicoPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lei | null>(null);
  const [form, setForm] = useState({
    numero: "",
    titulo: "",
    categoria: "Geral",
    ementa: "",
    conteudo: "",
    data_vigencia: "",
    revogada: false,
  });

  const { data: leis = [], isLoading } = useQuery({
    queryKey: ["leis-municipais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leis_municipais" as any)
        .select("*")
        .order("data_vigencia", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Lei[];
    },
  });

  const categorias = useMemo(() => {
    const s = new Set<string>(CATEGORIAS_PADRAO);
    leis.forEach((l) => s.add(l.categoria));
    return Array.from(s);
  }, [leis]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return leis.filter((l) => {
      if (categoria !== "Todas" && l.categoria !== categoria) return false;
      if (!termo) return true;
      return (
        l.numero.toLowerCase().includes(termo) ||
        l.titulo.toLowerCase().includes(termo) ||
        (l.ementa ?? "").toLowerCase().includes(termo) ||
        l.conteudo.toLowerCase().includes(termo)
      );
    });
  }, [leis, busca, categoria]);

  const openNew = () => {
    setEditing(null);
    setForm({ numero: "", titulo: "", categoria: "Geral", ementa: "", conteudo: "", data_vigencia: "", revogada: false });
    setDialogOpen(true);
  };

  const openEdit = (l: Lei) => {
    setEditing(l);
    setForm({
      numero: l.numero,
      titulo: l.titulo,
      categoria: l.categoria,
      ementa: l.ementa ?? "",
      conteudo: l.conteudo,
      data_vigencia: l.data_vigencia ?? "",
      revogada: l.revogada,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.numero.trim() || !form.titulo.trim() || !form.conteudo.trim()) {
      toast.error("Preencha número, título e conteúdo.");
      return;
    }
    const payload = {
      numero: form.numero.trim(),
      titulo: form.titulo.trim(),
      categoria: form.categoria || "Geral",
      ementa: form.ementa.trim() || null,
      conteudo: form.conteudo.trim(),
      data_vigencia: form.data_vigencia || null,
      revogada: form.revogada,
    };
    const q = editing
      ? supabase.from("leis_municipais" as any).update(payload).eq("id", editing.id)
      : supabase.from("leis_municipais" as any).insert(payload);
    const { error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Lei atualizada." : "Lei cadastrada.");
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["leis-municipais"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta lei?")) return;
    const { error } = await supabase.from("leis_municipais" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lei removida.");
    queryClient.invalidateQueries({ queryKey: ["leis-municipais"] });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-institutional border-b border-sidebar-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <img src={logoSjc} alt="SJC-SP" className="h-9 sm:h-12 rounded-lg drop-shadow flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base sm:text-xl lg:text-2xl font-bold text-sidebar-foreground leading-tight truncate">
              Ordenamento Jurídico Municipal
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

      <section className="gradient-institutional py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Landmark className="h-7 w-7 sm:h-10 sm:w-10 text-gold flex-shrink-0" />
            <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold text-sidebar-foreground">
              Leis Municipais Vigentes
            </h2>
          </motion.div>
          <p className="text-sidebar-foreground/70 max-w-3xl mx-auto text-xs sm:text-sm lg:text-base px-2">
            Consulta pública ao ordenamento jurídico municipal — leis, decretos e normas em vigor na Comarca.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lei, número, ementa ou conteúdo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            {isAdmin && (
              <Button onClick={openNew} className="h-11 rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Nova Lei
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant={categoria === "Todas" ? "default" : "outline"} size="sm" onClick={() => setCategoria("Todas")} className="rounded-full">
              Todas ({leis.length})
            </Button>
            {categorias.map((cat) => (
              <Button key={cat} variant={categoria === cat ? "default" : "outline"} size="sm" onClick={() => setCategoria(cat)} className="rounded-full whitespace-nowrap">
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 w-full flex-1">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Carregando leis...</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Scale className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>Nenhuma lei cadastrada{busca || categoria !== "Todas" ? " para este filtro" : ""}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map((l, i) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-gold/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Gavel className="h-4 w-4 text-gold flex-shrink-0" />
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gold-dark font-mono">
                        {l.numero}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">{l.categoria}</Badge>
                      {l.revogada && <Badge variant="destructive" className="text-[10px]">REVOGADA</Badge>}
                      {l.data_vigencia && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Vigência: {new Date(l.data_vigencia).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-semibold text-foreground leading-tight">
                      {l.titulo}
                    </h3>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </div>
                {l.ementa && (
                  <p className="text-xs sm:text-sm text-muted-foreground italic mb-2">{l.ementa}</p>
                )}
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed border-t border-border pt-3 mt-2">
                  {l.conteudo}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <footer className="bg-institutional-dark text-sidebar-foreground/50 text-[11px] py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>Documento de referência oficial do ordenamento jurídico municipal.</p>
          <p>
            <Link to="/" className="text-gold hover:underline inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Voltar ao portal da Secretaria da Justiça e Cidadania
            </Link>
          </p>
        </div>
      </footer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Lei" : "Nova Lei Municipal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número *</Label>
                <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Lei nº 001/2026" />
              </div>
              <div>
                <Label>Data de Vigência</Label>
                <Input type="date" value={form.data_vigencia} onChange={(e) => setForm({ ...form, data_vigencia: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIAS_PADRAO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Ementa</Label>
              <Textarea rows={2} value={form.ementa} onChange={(e) => setForm({ ...form, ementa: e.target.value })} />
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea rows={10} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} className="font-mono text-xs" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.revogada} onChange={(e) => setForm({ ...form, revogada: e.target.checked })} />
              Lei revogada
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

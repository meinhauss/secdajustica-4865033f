import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Landmark, Search, Home, ExternalLink, Gavel, Plus, Pencil, Trash2, Scale, SlidersHorizontal, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import brasaoJaguare from "@/assets/brasao-jaguare.png.asset.json";

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
  "Defensoria Pública",
  "Direito de Família",
];

// Retorna todas as categorias às quais uma lei pertence, inferindo pelo tipo
// declarado no número/título (ex.: "Decreto-Lei nº ..." também entra no filtro "Decretos-Lei").
function categoriasDaLei(l: { numero: string; titulo: string; categoria: string }): string[] {
  const set = new Set<string>();
  if (l.categoria) set.add(l.categoria);
  const alvo = `${l.numero} ${l.titulo}`.toLowerCase();
  if (/decreto[-\s]?lei/.test(alvo)) set.add("Decretos-Lei");
  if (/constitui[cç][aã]o/.test(alvo)) set.add("Constituição da República de Jaguaré");
  if (/c[oó]digo\s+de\s+[ée]tica|c[oó]digo\s+de\s+conduta/.test(alvo)) set.add("Código de Ética e Conduta");
  if (/processo\s+penal/.test(alvo)) set.add("Processo Penal");
  if (/processo\s+civil/.test(alvo)) set.add("Processo Civil");
  if (/fam[ií]lia/.test(alvo)) set.add("Direito de Família");
  if (/defensoria/.test(alvo)) set.add("Defensoria Pública");
  if (/unisp/.test(alvo)) set.add("UNISP — Universidade de Direito");
  if (/\boab\b|advocacia/.test(alvo)) set.add("Advocacia e OAB");
  if (/minist[eé]rio\s+p[uú]blico|\bmp\b/.test(alvo)) set.add("Ministério Público (MP)");
  if (/tribunal\s+de\s+justi[cç]a|\btj\b/.test(alvo)) set.add("Tribunal de Justiça (TJ)");
  return Array.from(set);
}

// Realça padrões jurídicos: Art. Nº, §, incisos romanos, títulos/capítulos/seções,
// rótulos "Palavra:" no início da linha e "Lei/Decreto nº ...".
const INLINE_PATTERNS: RegExp[] = [
  /\bArt\.\s*\d+[ºoª°]?(?:\s*-?[A-Z])?/g,
  /§\s*\d+[ºoª°]?/gi,
  /\bParágrafo\s+único/gi,
  /\b(?:Título|Capítulo|Seção|Subseção|Livro|Anexo)\s+[IVXLCDM]+/gi,
  /\b(?:Lei|Decreto[-\s]?Lei|Portaria|Resolução|Provimento|Súmula)\s+n[º°]?\s*\d+[\/\-\d]*/gi,
  /\b[IVXLCDM]{1,4}\s*[-–—]\s/g,
  /\b[a-z]\)\s/g,
];

function formatLeiConteudo(texto: string) {
  if (!texto) return null;
  const paragrafos = texto.split(/\n{2,}/);
  return paragrafos.map((par, pi) => {
    const linhas = par.split(/\n/);
    return (
      <p key={pi} className="whitespace-pre-wrap">
        {linhas.map((linha, li) => {
          // rótulo tipo "Aviso Legal:" no início
          const rotuloMatch = linha.match(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^:\n]{2,60}):(\s|$)/);
          let nodes: (string | JSX.Element)[] = [linha];
          if (rotuloMatch) {
            nodes = [
              <strong key="r" className="text-foreground">{rotuloMatch[1]}:</strong>,
              linha.slice(rotuloMatch[0].length - (rotuloMatch[2] === " " ? 1 : 0)),
            ];
          }
          // aplica destaques inline nas strings restantes
          nodes = nodes.flatMap((n, idx) => {
            if (typeof n !== "string") return [n];
            let parts: (string | JSX.Element)[] = [n];
            INLINE_PATTERNS.forEach((rx, ri) => {
              parts = parts.flatMap((p) => {
                if (typeof p !== "string") return [p];
                const out: (string | JSX.Element)[] = [];
                let last = 0;
                for (const m of p.matchAll(rx)) {
                  const start = m.index ?? 0;
                  if (start > last) out.push(p.slice(last, start));
                  out.push(
                    <strong key={`${pi}-${li}-${idx}-${ri}-${start}`} className="text-foreground">
                      {m[0]}
                    </strong>
                  );
                  last = start + m[0].length;
                }
                if (last < p.length) out.push(p.slice(last));
                return out;
              });
            });
            return parts;
          });
          return (
            <span key={li}>
              {nodes}
              {li < linhas.length - 1 && <br />}
            </span>
          );
        })}
      </p>
    );
  });
}

export default function OrdenamentoJuridicoPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
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
    const catIndex = (c: string) => {
      const i = CATEGORIAS_PADRAO.indexOf(c);
      return i === -1 ? 999 : i;
    };
    const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });
    return leis
      .filter((l) => {
        if (categoria !== "Todas" && l.categoria !== categoria) return false;
        if (!termo) return true;
        return (
          l.numero.toLowerCase().includes(termo) ||
          l.titulo.toLowerCase().includes(termo) ||
          (l.ementa ?? "").toLowerCase().includes(termo) ||
          l.conteudo.toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        const ci = catIndex(a.categoria) - catIndex(b.categoria);
        if (ci !== 0) return ci;
        if (a.categoria !== b.categoria) return collator.compare(a.categoria, b.categoria);
        return collator.compare(a.numero, b.numero);
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
          <img src={brasaoJaguare.url} alt="Brasão da República Federativa de Jaguaré" className="h-10 sm:h-14 drop-shadow flex-shrink-0 object-contain" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base sm:text-xl lg:text-2xl font-bold text-sidebar-foreground leading-tight truncate">
              Ordenamento Jurídico Federal
            </h1>
            <p className="text-[9px] sm:text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
              República Federativa de Jaguaré
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
              Legislação Federal Vigente
            </h2>
          </motion.div>
          <p className="text-sidebar-foreground/70 max-w-3xl mx-auto text-xs sm:text-sm lg:text-base px-2">
            Constituição, Decretos-Lei, Códigos e normas institucionais da República Federativa de Jaguaré — consulta pública.
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
            {/* Botão filtros (apenas mobile) */}
            <Sheet open={filtrosOpen} onOpenChange={setFiltrosOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 rounded-xl gap-2 sm:hidden relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  {categoria !== "Todas" && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-display">Filtrar por categoria</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-1">
                  {[{ nome: "Todas", count: leis.length }, ...categorias.map((c) => ({ nome: c, count: leis.filter((l) => l.categoria === c).length }))].map(({ nome, count }) => {
                    const ativo = categoria === nome;
                    return (
                      <button
                        key={nome}
                        onClick={() => { setCategoria(nome); setFiltrosOpen(false); }}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${ativo ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {ativo && <Check className="h-4 w-4 flex-shrink-0" />}
                          <span className="truncate">{nome}</span>
                        </span>
                        <span className={`text-[11px] font-mono flex-shrink-0 ${ativo ? "opacity-80" : "text-muted-foreground"}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
            {isAdmin && (
              <Button onClick={openNew} className="h-11 rounded-xl gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Lei</span>
              </Button>
            )}
          </div>
          {/* Chips visíveis apenas em desktop/tablet */}
          <div className="hidden sm:flex gap-2 flex-wrap">
            <Button variant={categoria === "Todas" ? "default" : "outline"} size="sm" onClick={() => setCategoria("Todas")} className="rounded-full whitespace-nowrap">
              Todas ({leis.length})
            </Button>
            {categorias.map((cat) => (
              <Button key={cat} variant={categoria === cat ? "default" : "outline"} size="sm" onClick={() => setCategoria(cat)} className="rounded-full whitespace-nowrap">
                {cat}
              </Button>
            ))}
          </div>
          {/* Indicador do filtro ativo no mobile */}
          {categoria !== "Todas" && (
            <div className="sm:hidden flex items-center gap-2 text-xs text-muted-foreground">
              <span>Filtrando por:</span>
              <Badge variant="secondary" className="gap-1">
                {categoria}
                <button onClick={() => setCategoria("Todas")} className="ml-1 opacity-70 hover:opacity-100">×</button>
              </Badge>
            </div>
          )}
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
                <div className="text-[13px] sm:text-sm text-foreground leading-[1.75] border-t border-border pt-3 mt-2 space-y-2 [&_strong]:text-foreground [&_strong]:font-semibold">
                  {formatLeiConteudo(l.conteudo)}
                </div>

              </motion.div>
            ))}
          </div>
        )}
      </div>

      <footer className="bg-institutional-dark text-sidebar-foreground/50 text-[11px] py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>Documento de referência oficial do ordenamento jurídico federal da República de Jaguaré.</p>
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
            <DialogTitle>{editing ? "Editar Norma" : "Nova Norma / Decreto-Lei"}</DialogTitle>
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

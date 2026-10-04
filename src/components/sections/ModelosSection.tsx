import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText, Plus, Search, Star, Copy, Pencil, Trash2, Loader2, Info,
} from "lucide-react";
import { toast } from "sonner";
import AIQAModelos from "@/components/AIQAModelos";
import { VARIAVEIS_DISPONIVEIS, aplicarVariaveis } from "@/lib/modelosVars";

type Modelo = {
  id: string;
  titulo: string;
  categoria: string;
  descricao: string | null;
  conteudo: string;
  cargos: string[];
  created_at: string;
};

type Favorito = {
  id: string;
  titulo: string;
  categoria: string | null;
  descricao: string | null;
  conteudo: string;
  created_at: string;
};

const CATEGORIAS = [
  { value: "peticao", label: "Petição" },
  { value: "contestacao", label: "Contestação" },
  { value: "movimentacao", label: "Movimentação" },
  { value: "denuncia", label: "Denúncia" },
  { value: "promocao", label: "Promoção" },
  { value: "parecer", label: "Parecer" },
  { value: "sentenca", label: "Sentença" },
  { value: "despacho", label: "Despacho" },
  { value: "policial", label: "Policial" },
  { value: "outro", label: "Outro" },
];

const CARGOS = [
  { value: "advogado", label: "Advogado(a)" },
  { value: "bacharel_direito", label: "Bacharel em Direito" },
  { value: "presidente_oab", label: "Presidente OAB" },
  { value: "magistrado", label: "Juiz(a)" },
  { value: "desembargador", label: "Desembargador(a)" },
  { value: "presidente_tribunal", label: "Presidente Tribunal" },
  { value: "ministerio_publico", label: "Promotor(a)" },
  { value: "procurador_geral", label: "Procurador(a)-Geral" },
  { value: "procurador_geral_adjunto", label: "Procurador(a)-Geral Adjunto(a)" },
  { value: "procurador_estado", label: "Procurador(a) do Estado" },
  { value: "oficial_justica", label: "Oficial de Justiça" },
  { value: "policia_civil", label: "Polícia Civil" },
  { value: "policia_militar", label: "Polícia Militar" },
  { value: "policia_federal", label: "Polícia Federal" },
  { value: "delegado", label: "Delegado(a)" },
  { value: "gaeco", label: "GAECO" },
  { value: "chefe_gaeco", label: "Chefe GAECO" },
];

const categoriaLabel = (v: string) => CATEGORIAS.find((c) => c.value === v)?.label || v;

export default function ModelosSection() {
  const { user, roles, profile } = useAuth();
  const isAdmin = roles.includes("admin");
  const [tab, setTab] = useState<"oficiais" | "favoritos">("oficiais");
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("todos");
  const [editModelo, setEditModelo] = useState<Modelo | null>(null);
  const [editFav, setEditFav] = useState<Favorito | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [openNewFav, setOpenNewFav] = useState(false);
  const [preview, setPreview] = useState<{ titulo: string; texto: string } | null>(null);

  const fetch = async () => {
    setLoading(true);
    const [m, f] = await Promise.all([
      supabase.from("modelos_documentos").select("*").order("categoria").order("titulo"),
      supabase.from("modelos_favoritos").select("*").order("titulo"),
    ]);
    if (m.data) setModelos(m.data as any);
    if (f.data) setFavoritos(f.data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const oficiaisVisiveis = modelos.filter((m) => {
    if (!isAdmin && m.cargos.length > 0 && !m.cargos.some((c) => roles.includes(c))) return false;
    if (filtroCat !== "todos" && m.categoria !== filtroCat) return false;
    if (busca && !`${m.titulo} ${m.descricao || ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const favsFiltrados = favoritos.filter((f) => {
    if (filtroCat !== "todos" && f.categoria !== filtroCat) return false;
    if (busca && !`${f.titulo} ${f.descricao || ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const copiar = (texto: string) => {
    const aplicado = aplicarVariaveis(texto, { nome_usuario: profile?.nome_completo || "" });
    navigator.clipboard.writeText(aplicado);
    toast.success("Modelo copiado para a área de transferência");
  };

  const excluirModelo = async (id: string) => {
    if (!confirm("Excluir este modelo oficial?")) return;
    const { error } = await supabase.from("modelos_documentos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Modelo removido");
    fetch();
  };

  const excluirFav = async (id: string) => {
    if (!confirm("Remover este favorito?")) return;
    const { error } = await supabase.from("modelos_favoritos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Favorito removido");
    fetch();
  };

  const salvarComoFavorito = async (m: Modelo) => {
    if (!user) return;
    const { error } = await supabase.from("modelos_favoritos").insert({
      user_id: user.id,
      titulo: m.titulo,
      categoria: m.categoria,
      descricao: m.descricao,
      conteudo: m.conteudo,
    });
    if (error) return toast.error(error.message);
    toast.success("Modelo salvo em seus favoritos");
    fetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent" />
          <h2 className="text-2xl font-display font-bold">Modelos de Documentos</h2>
        </div>
        <div className="flex gap-2">
          <AIQAModelos
            modelos={modelos.map(m => ({ id: m.id, titulo: m.titulo, categoria: m.categoria, descricao: m.descricao }))}
            onSelect={(id) => {
              const m = modelos.find(x => x.id === id);
              if (m) setPreview({ titulo: m.titulo, texto: m.conteudo });
            }}
          />
          <Button variant="outline" size="sm" onClick={() => setOpenNewFav(true)}>
            <Star className="h-4 w-4 mr-1" /> Novo favorito
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo modelo oficial
            </Button>
          )}
        </div>
      </div>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-3 flex gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            Modelos suportam variáveis substituíveis: {" "}
            {VARIAVEIS_DISPONIVEIS.map((v) => (
              <code key={v.key} className="mx-0.5 px-1 rounded bg-muted">{`{{${v.key}}}`}</code>
            ))}
            . Quando inseridos em um processo, os dados são preenchidos automaticamente.
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
        </div>
        <Select value={filtroCat} onValueChange={setFiltroCat}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="oficiais">Oficiais ({oficiaisVisiveis.length})</TabsTrigger>
          <TabsTrigger value="favoritos">Meus favoritos ({favsFiltrados.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="oficiais" className="space-y-2 mt-3">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : oficiaisVisiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum modelo disponível.</p>
          ) : oficiaisVisiveis.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{m.titulo}</h3>
                    <Badge variant="secondary" className="text-[10px]">{categoriaLabel(m.categoria)}</Badge>
                    {m.cargos.slice(0, 3).map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {CARGOS.find((x) => x.value === c)?.label || c}
                      </Badge>
                    ))}
                  </div>
                  {m.descricao && <p className="text-xs text-muted-foreground mt-1">{m.descricao}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setPreview({ titulo: m.titulo, texto: m.conteudo })}>Ver</Button>
                  <Button size="sm" variant="ghost" onClick={() => copiar(m.conteudo)}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => salvarComoFavorito(m)}><Star className="h-4 w-4" /></Button>
                  {isAdmin && <>
                    <Button size="sm" variant="ghost" onClick={() => setEditModelo(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => excluirModelo(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="favoritos" className="space-y-2 mt-3">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : favsFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Você ainda não salvou nenhum favorito. Use o botão ⭐ nos modelos oficiais ou crie um novo.
            </p>
          ) : favsFiltrados.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <h3 className="font-semibold">{f.titulo}</h3>
                    {f.categoria && <Badge variant="secondary" className="text-[10px]">{categoriaLabel(f.categoria)}</Badge>}
                  </div>
                  {f.descricao && <p className="text-xs text-muted-foreground mt-1">{f.descricao}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setPreview({ titulo: f.titulo, texto: f.conteudo })}>Ver</Button>
                  <Button size="sm" variant="ghost" onClick={() => copiar(f.conteudo)}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditFav(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => excluirFav(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader><DialogTitle>{preview?.titulo}</DialogTitle></DialogHeader>
          <pre className="whitespace-pre-wrap text-sm p-4 bg-muted rounded-md max-h-[60vh] overflow-auto font-sans">
            {preview?.texto}
          </pre>
          <DialogFooter>
            <Button onClick={() => preview && copiar(preview.texto)}>
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modais editor */}
      <ModeloEditor
        open={openNew || !!editModelo}
        onClose={() => { setOpenNew(false); setEditModelo(null); }}
        modelo={editModelo}
        onSaved={fetch}
      />
      <FavoritoEditor
        open={openNewFav || !!editFav}
        onClose={() => { setOpenNewFav(false); setEditFav(null); }}
        favorito={editFav}
        userId={user?.id || ""}
        onSaved={fetch}
      />
    </div>
  );
}

/* ─────────── Editor de modelo oficial (admin) ─────────── */
function ModeloEditor({
  open, onClose, modelo, onSaved,
}: { open: boolean; onClose: () => void; modelo: Modelo | null; onSaved: () => void }) {
  const [form, setForm] = useState({ titulo: "", categoria: "peticao", descricao: "", conteudo: "", cargos: [] as string[] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modelo) {
      setForm({
        titulo: modelo.titulo,
        categoria: modelo.categoria,
        descricao: modelo.descricao || "",
        conteudo: modelo.conteudo,
        cargos: modelo.cargos,
      });
    } else {
      setForm({ titulo: "", categoria: "peticao", descricao: "", conteudo: "", cargos: [] });
    }
  }, [modelo, open]);

  const salvar = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) return toast.error("Título e conteúdo são obrigatórios");
    setSaving(true);
    const payload = {
      titulo: form.titulo.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim() || null,
      conteudo: form.conteudo,
      cargos: form.cargos,
    };
    const { error } = modelo
      ? await supabase.from("modelos_documentos").update(payload).eq("id", modelo.id)
      : await supabase.from("modelos_documentos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(modelo ? "Modelo atualizado" : "Modelo criado");
    onSaved(); onClose();
  };

  const toggleCargo = (c: string) => {
    setForm((f) => ({
      ...f,
      cargos: f.cargos.includes(c) ? f.cargos.filter((x) => x !== c) : [...f.cargos, c],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{modelo ? "Editar modelo" : "Novo modelo oficial"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria *</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição breve</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Cargos com acesso (vazio = todos autenticados)</Label>
            <div className="flex gap-1 flex-wrap mt-1">
              {CARGOS.map((c) => (
                <Badge
                  key={c.value}
                  variant={form.cargos.includes(c.value) ? "default" : "outline"}
                  className="cursor-pointer text-[11px]"
                  onClick={() => toggleCargo(c.value)}
                >
                  {c.label}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Conteúdo * (use {`{{variavel}}`} para campos dinâmicos)</Label>
            <Textarea
              value={form.conteudo}
              onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              rows={14}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── Editor de favorito pessoal ─────────── */
function FavoritoEditor({
  open, onClose, favorito, userId, onSaved,
}: { open: boolean; onClose: () => void; favorito: Favorito | null; userId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ titulo: "", categoria: "peticao", descricao: "", conteudo: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (favorito) {
      setForm({
        titulo: favorito.titulo,
        categoria: favorito.categoria || "peticao",
        descricao: favorito.descricao || "",
        conteudo: favorito.conteudo,
      });
    } else {
      setForm({ titulo: "", categoria: "peticao", descricao: "", conteudo: "" });
    }
  }, [favorito, open]);

  const salvar = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) return toast.error("Título e conteúdo são obrigatórios");
    setSaving(true);
    const payload = {
      user_id: userId,
      titulo: form.titulo.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim() || null,
      conteudo: form.conteudo,
    };
    const { error } = favorito
      ? await supabase.from("modelos_favoritos").update(payload).eq("id", favorito.id)
      : await supabase.from("modelos_favoritos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(favorito ? "Favorito atualizado" : "Favorito criado");
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{favorito ? "Editar favorito" : "Novo favorito pessoal"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição breve</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Conteúdo * (use {`{{variavel}}`} para campos dinâmicos)</Label>
            <Textarea
              value={form.conteudo}
              onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              rows={14}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

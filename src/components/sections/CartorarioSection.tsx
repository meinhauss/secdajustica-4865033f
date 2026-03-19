import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  FileText, Plus, Search, CheckCircle, Clock, Eye, Stamp,
  Heart, Home, Users, ScrollText, FileSignature, Baby, BarChart3, User, Link
} from "lucide-react";

/* ─── Profile Lookup Hook ─── */
function useProfileLookup() {
  const [result, setResult] = useState<{ nome_completo: string; id_personagem: string } | null>(null);
  const lookup = async (idPersonagem: string) => {
    setResult(null);
    if (!idPersonagem) return null;
    const { data } = await supabase.from("profiles").select("nome_completo, id_personagem").eq("id_personagem", idPersonagem).maybeSingle();
    if (data) setResult({ nome_completo: data.nome_completo, id_personagem: data.id_personagem || "" });
    return data;
  };
  return { result, lookup, clear: () => setResult(null) };
}

const TIPOS_REGISTRO = [
  { value: "certidao_nascimento", label: "Certidão de Nascimento", icon: Baby },
  { value: "certidao_casamento", label: "Certidão de Casamento", icon: Heart },
  { value: "certidao_obito", label: "Certidão de Óbito", icon: ScrollText },
  { value: "divorcio", label: "Divórcio", icon: FileSignature },
  { value: "adocao", label: "Adoção", icon: Users },
  { value: "antecedentes", label: "Certidão de Antecedentes", icon: FileText },
  { value: "contrato", label: "Registro de Contrato", icon: FileSignature },
  { value: "escritura", label: "Escritura Pública", icon: Home },
  { value: "procuracao", label: "Procuração", icon: ScrollText },
  { value: "reconhecimento_firma", label: "Reconhecimento de Firma", icon: Stamp },
  { value: "autenticacao", label: "Autenticação de Documento", icon: CheckCircle },
];

interface Registro {
  id: string;
  tipo: string;
  subtipo: string | null;
  requerente_id: string | null;
  requerente_nome: string;
  id_personagem: string | null;
  partes_envolvidas: string | null;
  descricao: string;
  status: string;
  observacoes: string | null;
  documento_url: string | null;
  emitido_por: string | null;
  emitido_por_nome: string | null;
  numero_registro: string;
  created_at: string;
  updated_at: string;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    solicitado: "bg-amber-100 text-amber-800",
    em_analise: "bg-blue-100 text-blue-800",
    aprovado: "bg-emerald-100 text-emerald-800",
    emitido: "bg-primary/10 text-primary",
    recusado: "bg-destructive/10 text-destructive",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    solicitado: "Solicitado", em_analise: "Em Análise",
    aprovado: "Aprovado", emitido: "Emitido", recusado: "Recusado",
  };
  return map[s] || s;
};

export default function CartorarioSection() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isCartorario = isAdmin || roles.includes("oficial_justica");
  const canSolicitar = isAdmin || isCartorario || roles.includes("advogado");
  const requerenteLookup = useProfileLookup();

  const [tab, setTab] = useState("painel");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [showNovoRegistro, setShowNovoRegistro] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState<Registro | null>(null);

  const [form, setForm] = useState({
    tipo: "certidao_nascimento",
    requerente_nome: "",
    id_personagem: "",
    partes_envolvidas: "",
    descricao: "",
    observacoes: "",
    documento_url: "",
  });
  const [emitirUrl, setEmitirUrl] = useState("");

  useEffect(() => { fetchRegistros(); }, []);

  const fetchRegistros = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("registros_cartorio")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data) setRegistros(data as any);
    setLoading(false);
  };

  const handleSolicitar = async () => {
    if (!form.requerente_nome || !form.descricao) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("registros_cartorio").insert({
      tipo: form.tipo,
      requerente_id: user?.id,
      requerente_nome: form.requerente_nome,
      id_personagem: form.id_personagem || null,
      partes_envolvidas: form.partes_envolvidas || null,
      descricao: form.descricao,
      observacoes: form.observacoes || null,
      documento_url: form.documento_url || null,
    } as any);
    if (error) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Solicitação registrada com sucesso" });
    setShowNovoRegistro(false);
    setForm({ tipo: "certidao_nascimento", requerente_nome: "", id_personagem: "", partes_envolvidas: "", descricao: "", observacoes: "", documento_url: "" });
    requerenteLookup.clear();
    fetchRegistros();
  };

  const handleUpdateStatus = async (id: string, status: string, docUrl?: string) => {
    const updateData: any = { status };
    if (status === "emitido") {
      updateData.emitido_por = user?.id;
      updateData.emitido_por_nome = profile?.nome_completo || "Servidor";
      if (docUrl) updateData.documento_url = docUrl;
    }
    await supabase.from("registros_cartorio").update(updateData).eq("id", id);
    toast({ title: `Status atualizado para: ${statusLabel(status)}` });
    setEmitirUrl("");
    fetchRegistros();
    setShowDetalhes(null);
  };

  // Stats
  const solicitados = registros.filter((r) => r.status === "solicitado").length;
  const emAnalise = registros.filter((r) => r.status === "em_analise").length;
  const emitidos = registros.filter((r) => r.status === "emitido").length;

  const filteredRegistros = registros.filter((r) => {
    const matchSearch =
      r.numero_registro.toLowerCase().includes(search.toLowerCase()) ||
      r.requerente_nome.toLowerCase().includes(search.toLowerCase()) ||
      r.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (r.id_personagem || "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || r.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const getTipoLabel = (tipo: string) =>
    TIPOS_REGISTRO.find((t) => t.value === tipo)?.label || tipo.replace(/_/g, " ");

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Solicitações Pendentes", value: solicitados, icon: Clock, color: "text-amber-600" },
          { label: "Em Análise", value: emAnalise, icon: Eye, color: "text-blue-600" },
          { label: "Documentos Emitidos", value: emitidos, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Total de Registros", value: registros.length, icon: BarChart3, color: "text-primary" },
        ].map((s, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="registros">Todos os Registros</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
        </TabsList>

        {/* PAINEL */}
        <TabsContent value="painel" className="space-y-4">
          {canSolicitar && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowNovoRegistro(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Solicitação
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pending */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" /> Solicitações Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {registros.filter((r) => r.status === "solicitado" || r.status === "em_analise").length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
                )}
                {registros
                  .filter((r) => r.status === "solicitado" || r.status === "em_analise")
                  .slice(0, 10)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm cursor-pointer hover:bg-muted"
                      onClick={() => setShowDetalhes(r)}
                    >
                      <div>
                        <p className="font-medium text-foreground">{getTipoLabel(r.tipo)}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.requerente_nome} • {r.numero_registro}
                        </p>
                      </div>
                      <Badge className={statusBadge(r.status)}>{statusLabel(r.status)}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Recent emitted */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" /> Últimos Emitidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {registros.filter((r) => r.status === "emitido").length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum documento emitido.</p>
                )}
                {registros
                  .filter((r) => r.status === "emitido")
                  .slice(0, 10)
                  .map((r) => (
                    <div key={r.id} className="p-2 rounded-lg bg-muted/50 text-sm cursor-pointer hover:bg-muted" onClick={() => setShowDetalhes(r)}>
                      <p className="font-medium text-foreground">{getTipoLabel(r.tipo)}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.requerente_nome} • {r.numero_registro} • {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* REGISTROS */}
        <TabsContent value="registros" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar registro..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS_REGISTRO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canSolicitar && (
              <Button onClick={() => setShowNovoRegistro(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Solicitação
              </Button>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Registro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Requerente</TableHead>
                  <TableHead>ID Personagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistros.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {filteredRegistros.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setShowDetalhes(r)}>
                    <TableCell className="font-mono text-xs font-medium">{r.numero_registro}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{getTipoLabel(r.tipo)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.requerente_nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.id_personagem || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusBadge(r.status)}>{statusLabel(r.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setShowDetalhes(r); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* SERVIÇOS */}
        <TabsContent value="servicos" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TIPOS_REGISTRO.map((t) => (
              <Card key={t.value} className={`transition-colors ${canSolicitar ? "hover:border-accent cursor-pointer" : "opacity-60"}`} onClick={() => {
                if (!canSolicitar) {
                  toast({ title: "Apenas advogados podem fazer solicitações", variant: "destructive" });
                  return;
                }
                setForm((f) => ({ ...f, tipo: t.value }));
                setShowNovoRegistro(true);
              }}>
                <CardContent className="p-5 flex items-start gap-3">
                  <t.icon className="h-8 w-8 text-accent flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Solicite a emissão deste documento no cartório.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG - Nova Solicitação */}
      <Dialog open={showNovoRegistro} onOpenChange={setShowNovoRegistro}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Cartório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Documento *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_REGISTRO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ID do Personagem</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.id_personagem}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setForm((f) => ({ ...f, id_personagem: val }));
                    const data = await requerenteLookup.lookup(val);
                    if (data) setForm((f) => ({ ...f, requerente_nome: data.nome_completo }));
                  }}
                  placeholder="Ex: 12345"
                  className="pl-10"
                />
              </div>
              {requerenteLookup.result && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-xs">
                  <User className="h-3 w-3 text-green-600" />
                  <span className="text-green-800 dark:text-green-300 font-medium">{requerenteLookup.result.nome_completo}</span>
                </div>
              )}
            </div>
            <div>
              <Label>Nome do Requerente *</Label>
              <Input value={form.requerente_nome} onChange={(e) => setForm((f) => ({ ...f, requerente_nome: e.target.value }))} placeholder="Nome completo" readOnly={!!requerenteLookup.result} />
            </div>
            <div>
              <Label>Partes Envolvidas</Label>
              <Input value={form.partes_envolvidas} onChange={(e) => setForm((f) => ({ ...f, partes_envolvidas: e.target.value }))} placeholder="Ex: João Silva e Maria Souza" />
            </div>
            <div>
              <Label>Descrição / Detalhes *</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o pedido..." rows={3} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Informações adicionais..." rows={2} />
            </div>
            <Button className="w-full" onClick={handleSolicitar}>
              <Stamp className="h-4 w-4 mr-1" /> Solicitar Documento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG - Detalhes */}
      <Dialog open={!!showDetalhes} onOpenChange={() => setShowDetalhes(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
          </DialogHeader>
          {showDetalhes && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nº Registro</p>
                  <p className="font-mono font-medium">{showDetalhes.numero_registro}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={statusBadge(showDetalhes.status)}>{statusLabel(showDetalhes.status)}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{getTipoLabel(showDetalhes.tipo)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID Personagem</p>
                  <p>{showDetalhes.id_personagem || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Requerente</p>
                  <p className="font-medium">{showDetalhes.requerente_nome}</p>
                </div>
                {showDetalhes.partes_envolvidas && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Partes Envolvidas</p>
                    <p>{showDetalhes.partes_envolvidas}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="text-sm">{showDetalhes.descricao}</p>
                </div>
                {showDetalhes.observacoes && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm">{showDetalhes.observacoes}</p>
                  </div>
                )}
                {showDetalhes.emitido_por_nome && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Emitido por</p>
                    <p>{showDetalhes.emitido_por_nome}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="text-xs">{new Date(showDetalhes.created_at).toLocaleString("pt-BR")}</p>
                </div>
              </div>

              {isCartorario && showDetalhes.status !== "emitido" && showDetalhes.status !== "recusado" && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  {showDetalhes.status === "solicitado" && (
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(showDetalhes.id, "em_analise")}>
                      <Eye className="h-3 w-3 mr-1" /> Analisar
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleUpdateStatus(showDetalhes.id, "emitido")}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Emitir Documento
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(showDetalhes.id, "recusado")}>
                    Recusar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

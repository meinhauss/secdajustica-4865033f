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
  Heart, Home, Users, ScrollText, FileSignature, Baby, BarChart3, User, Link, X, Trash2, ExternalLink, Download
} from "lucide-react";
import { generateCartorioPDF, imageToBase64 } from "@/lib/pdfGenerator";
import logoCartorio from "@/assets/logo-cartorio-sp.png";

/* ─── Types ─── */
interface PersonEntry {
  id_personagem: string;
  nome: string;
}

interface ProfileData {
  nome_completo: string;
  id_personagem: string | null;
  cargo: string | null;
  cpf: string | null;
  discord: string | null;
  telefone_ingame: string | null;
  oab_numero: string | null;
  avatar_url: string | null;
}

/* ─── Profile Lookup ─── */
async function lookupProfile(idPersonagem: string): Promise<ProfileData | null> {
  if (!idPersonagem.trim()) return null;
  const { data } = await supabase
    .from("profiles")
    .select("nome_completo, id_personagem, cargo, cpf, discord, telefone_ingame, oab_numero, avatar_url")
    .eq("id_personagem", idPersonagem.trim())
    .maybeSingle();
  return data as ProfileData | null;
}

/* ─── Helpers ─── */
function parseJsonArray<T>(val: string | null): T[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseLinks(val: string | null): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // legacy single URL
    if (val.startsWith("http")) return [val];
  }
  return [];
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

const getTipoLabel = (tipo: string) =>
  TIPOS_REGISTRO.find((t) => t.value === tipo)?.label || tipo.replace(/_/g, " ");

/* ─── Person Input Component ─── */
function PersonInput({ label, entries, onChange }: {
  label: string;
  entries: PersonEntry[];
  onChange: (entries: PersonEntry[]) => void;
}) {
  const [idInput, setIdInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const addPerson = async () => {
    if (!idInput.trim()) return;
    if (entries.some((e) => e.id_personagem === idInput.trim())) {
      toast({ title: "ID já adicionado", variant: "destructive" });
      return;
    }
    setLookingUp(true);
    const profile = await lookupProfile(idInput);
    setLookingUp(false);
    if (profile) {
      onChange([...entries, { id_personagem: profile.id_personagem || idInput.trim(), nome: profile.nome_completo }]);
      setIdInput("");
    } else {
      toast({ title: "Personagem não encontrado", description: `ID "${idInput}" não existe no sistema.`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPerson(); } }}
            placeholder="Digite o ID do Personagem"
            className="pl-10"
          />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addPerson} disabled={lookingUp || !idInput.trim()}>
          {lookingUp ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs">
              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-foreground">{e.nome}</span>
              <span className="text-muted-foreground">ID: {e.id_personagem}</span>
              <button type="button" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => onChange(entries.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Links Input Component ─── */
function LinksInput({ label, links, onChange }: {
  label: string;
  links: string[];
  onChange: (links: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addLink = () => {
    const url = input.trim();
    if (!url) return;
    onChange([...links, url]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
            placeholder="https://..."
            className="pl-10"
          />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addLink} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {links.length > 0 && (
        <div className="space-y-1">
          {links.map((url, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs">
              <Link className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">{url}</a>
              <button type="button" className="ml-auto text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => onChange(links.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Profile Card ─── */
function ProfileCard({ profile, onClose }: { profile: ProfileData; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Ficha do Cidadão</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Nome Completo</p>
              <p className="font-medium">{profile.nome_completo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ID Personagem</p>
              <p className="font-medium">{profile.id_personagem || "—"}</p>
            </div>
            {profile.cpf && (
              <div>
                <p className="text-xs text-muted-foreground">CPF</p>
                <p>{profile.cpf}</p>
              </div>
            )}
            {profile.cargo && (
              <div>
                <p className="text-xs text-muted-foreground">Cargo</p>
                <p>{profile.cargo}</p>
              </div>
            )}
            {profile.oab_numero && (
              <div>
                <p className="text-xs text-muted-foreground">OAB</p>
                <p>{profile.oab_numero}</p>
              </div>
            )}
            {profile.discord && (
              <div>
                <p className="text-xs text-muted-foreground">Discord</p>
                <p>{profile.discord}</p>
              </div>
            )}
            {profile.telefone_ingame && (
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p>{profile.telefone_ingame}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ─── */
export default function CartorarioSection() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isCartorario = isAdmin || roles.includes("oficial_justica");
  const canSolicitar = isAdmin || isCartorario || roles.includes("advogado");

  const [tab, setTab] = useState("painel");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [showNovoRegistro, setShowNovoRegistro] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState<Registro | null>(null);
  const [viewingProfile, setViewingProfile] = useState<ProfileData | null>(null);

  // Form state
  const [formTipo, setFormTipo] = useState("certidao_nascimento");
  const [formRequerentes, setFormRequerentes] = useState<PersonEntry[]>([]);
  const [formEnvolvidos, setFormEnvolvidos] = useState<PersonEntry[]>([]);
  const [formDescricao, setFormDescricao] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");
  const [formLinks, setFormLinks] = useState<string[]>([]);

  // Emit state
  const [emitirLinks, setEmitirLinks] = useState<string[]>([]);

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

  const resetForm = () => {
    setFormTipo("certidao_nascimento");
    setFormRequerentes([]);
    setFormEnvolvidos([]);
    setFormDescricao("");
    setFormObservacoes("");
    setFormLinks([]);
  };

  const handleSolicitar = async () => {
    if (formRequerentes.length === 0) {
      toast({ title: "Adicione pelo menos um requerente", variant: "destructive" });
      return;
    }
    if (!formDescricao) {
      toast({ title: "Preencha a descrição", variant: "destructive" });
      return;
    }

    const requerenteNome = JSON.stringify(formRequerentes);
    const partesEnvolvidas = formEnvolvidos.length > 0 ? JSON.stringify(formEnvolvidos) : null;
    const documentoUrl = formLinks.length > 0 ? JSON.stringify(formLinks) : null;
    const primaryId = formRequerentes[0]?.id_personagem || null;

    const { error } = await supabase.from("registros_cartorio").insert({
      tipo: formTipo,
      requerente_id: user?.id,
      requerente_nome: requerenteNome,
      id_personagem: primaryId,
      partes_envolvidas: partesEnvolvidas,
      descricao: formDescricao,
      observacoes: formObservacoes || null,
      documento_url: documentoUrl,
    } as any);

    if (error) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Solicitação registrada com sucesso" });
    setShowNovoRegistro(false);
    resetForm();
    fetchRegistros();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const updateData: any = { status };
    if (status === "emitido") {
      updateData.emitido_por = user?.id;
      updateData.emitido_por_nome = profile?.nome_completo || "Servidor";
      if (emitirLinks.length > 0) {
        // Merge with existing links
        const existing = parseLinks(showDetalhes?.documento_url || null);
        updateData.documento_url = JSON.stringify([...existing, ...emitirLinks]);
      }
    }
    await supabase.from("registros_cartorio").update(updateData).eq("id", id);
    toast({ title: `Status atualizado para: ${statusLabel(status)}` });
    setEmitirLinks([]);
    fetchRegistros();
    setShowDetalhes(null);
  };

  const handleViewProfile = async (idPersonagem: string) => {
    const prof = await lookupProfile(idPersonagem);
    if (prof) setViewingProfile(prof);
    else toast({ title: "Perfil não encontrado", variant: "destructive" });
  };

  // Stats
  const solicitados = registros.filter((r) => r.status === "solicitado").length;
  const emAnalise = registros.filter((r) => r.status === "em_analise").length;
  const emitidos = registros.filter((r) => r.status === "emitido").length;

  // Parse display names for table
  const getDisplayRequerentes = (r: Registro): string => {
    const arr = parseJsonArray<PersonEntry>(r.requerente_nome);
    if (arr.length > 0) return arr.map((p) => p.nome).join(", ");
    return r.requerente_nome; // legacy plain text
  };

  const filteredRegistros = registros.filter((r) => {
    const displayName = getDisplayRequerentes(r);
    const matchSearch =
      r.numero_registro.toLowerCase().includes(search.toLowerCase()) ||
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      r.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (r.id_personagem || "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || r.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                          {getDisplayRequerentes(r)} • {r.numero_registro}
                        </p>
                      </div>
                      <Badge className={statusBadge(r.status)}>{statusLabel(r.status)}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>

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
                        {getDisplayRequerentes(r)} • {r.numero_registro} • {new Date(r.created_at).toLocaleDateString("pt-BR")}
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
                  <TableHead>Requerente(s)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistros.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                    <TableCell className="text-sm max-w-[200px] truncate">{getDisplayRequerentes(r)}</TableCell>
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
                setFormTipo(t.value);
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
      <Dialog open={showNovoRegistro} onOpenChange={(open) => { if (!open) resetForm(); setShowNovoRegistro(open); }}>
        <DialogContent className="max-w-lg !max-h-[85vh] !overflow-hidden !flex !flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Nova Solicitação de Cartório</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4 pb-4">
              <div>
                <Label>Tipo de Documento *</Label>
                <Select value={formTipo} onValueChange={setFormTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_REGISTRO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <PersonInput
                label="Requerente(s) * — buscar por ID"
                entries={formRequerentes}
                onChange={setFormRequerentes}
              />

              <PersonInput
                label="Partes Envolvidas — buscar por ID"
                entries={formEnvolvidos}
                onChange={setFormEnvolvidos}
              />

              <div>
                <Label>Descrição / Detalhes *</Label>
                <Textarea value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} placeholder="Descreva o pedido..." rows={3} />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} placeholder="Informações adicionais..." rows={2} />
              </div>

              <LinksInput
                label="Links / Documentos Anexos"
                links={formLinks}
                onChange={setFormLinks}
              />

              <Button className="w-full" onClick={handleSolicitar}>
                <Stamp className="h-4 w-4 mr-1" /> Solicitar Documento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG - Detalhes */}
      <Dialog open={!!showDetalhes} onOpenChange={() => { setShowDetalhes(null); setEmitirLinks([]); }}>
        <DialogContent className="max-w-lg !max-h-[85vh] !overflow-hidden !flex !flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Detalhes do Registro</DialogTitle>
          </DialogHeader>
          {showDetalhes && (
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-3 pb-4">
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
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-xs">{new Date(showDetalhes.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>

                {/* Requerentes */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Requerente(s)</p>
                  {(() => {
                    const arr = parseJsonArray<PersonEntry>(showDetalhes.requerente_nome);
                    if (arr.length > 0) {
                      return (
                        <div className="space-y-1">
                          {arr.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{p.nome}</span>
                              <span className="text-muted-foreground">ID: {p.id_personagem}</span>
                              {isCartorario && (
                                <button className="ml-auto text-primary hover:underline text-[10px]" onClick={() => handleViewProfile(p.id_personagem)}>
                                  Ver ficha
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return <p className="text-sm font-medium">{showDetalhes.requerente_nome}</p>;
                  })()}
                </div>

                {/* Envolvidos */}
                {showDetalhes.partes_envolvidas && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Partes Envolvidas</p>
                    {(() => {
                      const arr = parseJsonArray<PersonEntry>(showDetalhes.partes_envolvidas);
                      if (arr.length > 0) {
                        return (
                          <div className="space-y-1">
                            {arr.map((p, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{p.nome}</span>
                                <span className="text-muted-foreground">ID: {p.id_personagem}</span>
                                {isCartorario && (
                                  <button className="ml-auto text-primary hover:underline text-[10px]" onClick={() => handleViewProfile(p.id_personagem)}>
                                    Ver ficha
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return <p className="text-sm">{showDetalhes.partes_envolvidas}</p>;
                    })()}
                  </div>
                )}

                {/* Descrição */}
                <div>
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="text-sm">{showDetalhes.descricao}</p>
                </div>

                {showDetalhes.observacoes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm">{showDetalhes.observacoes}</p>
                  </div>
                )}

                {showDetalhes.emitido_por_nome && (
                  <div>
                    <p className="text-xs text-muted-foreground">Emitido por</p>
                    <p className="text-sm">{showDetalhes.emitido_por_nome}</p>
                  </div>
                )}

                {/* Links */}
                {(() => {
                  const links = parseLinks(showDetalhes.documento_url);
                  if (links.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Documentos Anexos</p>
                      <div className="space-y-1">
                        {links.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Download PDF button */}
                {showDetalhes.status === "emitido" && (
                  <div className="pt-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={async () => {
                      const logo64 = await imageToBase64(logoCartorio);
                      const requerentes = parseJsonArray<PersonEntry>(showDetalhes.requerente_nome);
                      const envolvidos = parseJsonArray<PersonEntry>(showDetalhes.partes_envolvidas);
                      const lnks = parseLinks(showDetalhes.documento_url);
                      generateCartorioPDF({
                        registro: showDetalhes,
                        requerentes: requerentes.length ? requerentes : [{ nome: showDetalhes.requerente_nome, id_personagem: showDetalhes.id_personagem || "—" }],
                        envolvidos,
                        links: lnks,
                        logoBase64: logo64,
                      });
                    }}>
                      <Download className="h-3 w-3 mr-1" /> Baixar Documento (PDF)
                    </Button>
                  </div>
                )}

                {/* Ações do cartorário */}
                {isCartorario && showDetalhes.status !== "emitido" && showDetalhes.status !== "recusado" && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <LinksInput
                      label="Anexar Links ao Emitir"
                      links={emitirLinks}
                      onChange={setEmitirLinks}
                    />
                    <div className="flex gap-2">
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
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Card Dialog */}
      {viewingProfile && (
        <ProfileCard profile={viewingProfile} onClose={() => setViewingProfile(null)} />
      )}
    </div>
  );
}

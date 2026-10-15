import { useState, useEffect } from "react";
import { useAI } from "@/hooks/useAI";
import { Sparkles, Loader2 } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
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
  Heart, Home, Users, ScrollText, FileSignature, Baby, BarChart3, User, Link, X, Trash2, ExternalLink, Download, Scale, AlertTriangle
} from "lucide-react";
import { generateCartorioPDF, imageToBase64 } from "@/lib/pdfGenerator";
import { isValidPublicUrl } from "@/lib/sanitize";
import { uploadArquivoAnexo } from "@/lib/r2Files";
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
    if (val.startsWith("http")) return [val];
  }
  return [];
}

/* ─── Document type config ─── */
const TIPOS_REGISTRO = [
  { value: "procuracao", label: "Procuração", icon: ScrollText },
  { value: "certidao_nascimento", label: "Certidão de Nascimento", icon: Baby },
  { value: "certidao_casamento", label: "Certidão de Casamento", icon: Heart },
  { value: "certidao_obito", label: "Certidão de Óbito", icon: ScrollText },
  { value: "certidao_distribuicao", label: "Certidão de Distribuição", icon: Scale },
  { value: "divorcio", label: "Divórcio", icon: FileSignature },
  { value: "adocao", label: "Adoção", icon: Users },
  { value: "antecedentes", label: "Certidão de Antecedentes", icon: FileText },
  { value: "contrato", label: "Registro de Contrato", icon: FileSignature },
  { value: "escritura", label: "Escritura Pública", icon: Home },
  { value: "reconhecimento_firma", label: "Reconhecimento de Firma", icon: Stamp },
  { value: "autenticacao", label: "Autenticação de Documento", icon: CheckCircle },
];

/* Document-specific field definitions */
interface FieldConfig {
  requerenteLabel: string;
  envolvidosLabel?: string;
  envolvidosRequired?: boolean;
  descricaoLabel: string;
  descricaoPlaceholder: string;
  extraFields?: string[];
  autoEmit?: boolean; // no approval needed
  confirmByParties?: boolean; // needs party confirmation
}

const TIPO_FIELDS: Record<string, FieldConfig> = {
  certidao_nascimento: {
    requerenteLabel: "Registrando (pessoa a ser registrada) *",
    envolvidosLabel: "Pais / Responsáveis",
    envolvidosRequired: true,
    descricaoLabel: "Informações do Nascimento *",
    descricaoPlaceholder: "Data de nascimento, local, hospital, naturalidade...",
  },
  certidao_casamento: {
    requerenteLabel: "Cônjuge 1 *",
    envolvidosLabel: "Cônjuge 2 *",
    envolvidosRequired: true,
    descricaoLabel: "Informações do Casamento *",
    descricaoPlaceholder: "Data do casamento, regime de bens, local da cerimônia...",
  },
  certidao_obito: {
    requerenteLabel: "Solicitante (familiar / responsável) *",
    envolvidosLabel: "Falecido(a) *",
    envolvidosRequired: true,
    descricaoLabel: "Informações do Óbito *",
    descricaoPlaceholder: "Data do óbito, causa, local, hospital...",
  },
  certidao_distribuicao: {
    requerenteLabel: "Solicitante *",
    descricaoLabel: "Finalidade da Certidão",
    descricaoPlaceholder: "Informe a finalidade (ex: concurso público, licitação, etc.)",
    autoEmit: true,
  },
  divorcio: {
    requerenteLabel: "Cônjuge 1 *",
    envolvidosLabel: "Cônjuge 2 *",
    envolvidosRequired: true,
    descricaoLabel: "Informações do Divórcio *",
    descricaoPlaceholder: "Nº do casamento, motivo, partilha de bens, guarda...",
  },
  adocao: {
    requerenteLabel: "Adotante(s) *",
    envolvidosLabel: "Adotado(a) *",
    envolvidosRequired: true,
    descricaoLabel: "Informações da Adoção *",
    descricaoPlaceholder: "Detalhes do processo de adoção, decisão judicial...",
  },
  antecedentes: {
    requerenteLabel: "Pessoa Consultada *",
    descricaoLabel: "Finalidade *",
    descricaoPlaceholder: "Motivo da solicitação (ex: emprego, concurso)...",
  },
  contrato: {
    requerenteLabel: "Parte 1 *",
    envolvidosLabel: "Demais Partes *",
    envolvidosRequired: true,
    descricaoLabel: "Objeto do Contrato *",
    descricaoPlaceholder: "Descrição do contrato, objeto, valor, prazo...",
  },
  escritura: {
    requerenteLabel: "Outorgante(s) *",
    envolvidosLabel: "Outorgado(s) / Adquirente(s) *",
    envolvidosRequired: true,
    descricaoLabel: "Objeto da Escritura *",
    descricaoPlaceholder: "Descrição do imóvel/bem, endereço, matrícula, valor...",
  },
  procuracao: {
    requerenteLabel: "Outorgante(s) — quem concede poderes *",
    envolvidosLabel: "Outorgado(s) — quem recebe poderes *",
    envolvidosRequired: true,
    descricaoLabel: "Poderes Conferidos *",
    descricaoPlaceholder: "Descreva os poderes: gerais, especiais, ad judicia, etc.",
    confirmByParties: true,
  },
  reconhecimento_firma: {
    requerenteLabel: "Solicitante *",
    descricaoLabel: "Documento a Reconhecer *",
    descricaoPlaceholder: "Tipo do documento, finalidade, descrição...",
  },
  autenticacao: {
    requerenteLabel: "Solicitante *",
    descricaoLabel: "Documento a Autenticar *",
    descricaoPlaceholder: "Tipo e descrição do documento original...",
  },
};

const getFieldConfig = (tipo: string): FieldConfig => TIPO_FIELDS[tipo] || {
  requerenteLabel: "Requerente(s) *",
  descricaoLabel: "Descrição *",
  descricaoPlaceholder: "Descreva o pedido...",
};

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
    aguardando_confirmacao: "bg-purple-100 text-purple-800",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    solicitado: "Solicitado", em_analise: "Em Análise",
    aprovado: "Aprovado", emitido: "Emitido", recusado: "Recusado",
    aguardando_confirmacao: "Aguardando Confirmação",
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
  const [nomeInput, setNomeInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "not_found">("idle");

  const handleLookupById = async () => {
    if (!idInput.trim()) return;
    if (entries.some((e) => e.id_personagem === idInput.trim())) {
      toast({ title: "ID já adicionado", variant: "destructive" });
      return;
    }
    setLookingUp(true);
    setLookupStatus("idle");
    const profile = await lookupProfile(idInput);
    setLookingUp(false);
    if (profile) {
      setLookupStatus("found");
      setNomeInput(profile.nome_completo);
      setIdInput(profile.id_personagem || idInput.trim());
    } else {
      setLookupStatus("not_found");
    }
  };

  const handleLookupByName = async () => {
    if (!nomeInput.trim()) return;
    setLookingUp(true);
    setLookupStatus("idle");
    const { data } = await supabase
      .from("profiles")
      .select("nome_completo, id_personagem")
      .ilike("nome_completo", `%${nomeInput.trim()}%`)
      .limit(1)
      .maybeSingle();
    setLookingUp(false);
    if (data) {
      setLookupStatus("found");
      setNomeInput(data.nome_completo);
      if (data.id_personagem) setIdInput(data.id_personagem);
    } else {
      setLookupStatus("not_found");
    }
  };

  const addPerson = () => {
    const nome = nomeInput.trim();
    if (!nome) return;
    const id = idInput.trim();
    if (id && entries.some((e) => e.id_personagem === id)) {
      toast({ title: "ID já adicionado", variant: "destructive" });
      return;
    }
    onChange([...entries, { id_personagem: id || nome, nome }]);
    setIdInput("");
    setNomeInput("");
    setLookupStatus("idle");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={idInput}
              onChange={(e) => { setIdInput(e.target.value); setLookupStatus("idle"); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupById(); } }}
              placeholder="ID do Personagem"
              className="pl-10"
            />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleLookupById} disabled={lookingUp || !idInput.trim()}>
            {lookingUp ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            value={nomeInput}
            onChange={(e) => { setNomeInput(e.target.value); setLookupStatus("idle"); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupByName(); } }}
            placeholder="Nome completo (buscar ou preencher)"
            className="flex-1"
          />
          <Button type="button" size="sm" variant="outline" onClick={handleLookupByName} disabled={lookingUp || !nomeInput.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {lookupStatus === "found" && (
          <p className="text-[11px] text-green-600 dark:text-green-400 px-1">✓ Perfil encontrado</p>
        )}
        {lookupStatus === "not_found" && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 px-1">Não encontrado — preencha manualmente</p>
        )}
        <Button type="button" size="sm" variant="outline" onClick={addPerson} disabled={!nomeInput.trim()} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
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
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024 || (file.type !== "application/pdf" && !file.type.startsWith("image/"))) {
      toast({ title: "Arquivo inválido", description: "Envie um PDF ou uma imagem de até 20 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadArquivoAnexo(file, "cartorio");
      onChange([...links, url]);
      toast({ title: "Arquivo anexado com sucesso" });
    } catch (error) {
      toast({ title: "Falha no envio", description: (error as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    const url = input.trim();
    if (!url) return;
    if (!isValidPublicUrl(url)) {
      toast({
        title: "Link inválido",
        description: "Cole um link público começando com https:// (ex.: Google Drive, Discord). Caminhos locais (file:///, C:\\...) não são acessíveis a outros usuários.",
        variant: "destructive",
      });
      return;
    }
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
            onBlur={addLink}
            placeholder="https://..."
            className="pl-10"
          />
        </div>
                <Button type="button" size="sm" variant="outline" onClick={addLink} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-3 text-sm hover:bg-muted" title="Enviar arquivo do computador">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" /></svg>
          {uploading ? "Enviando" : "Upload"}
          <input type="file" accept="application/pdf,image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void uploadFile(file); }} />
        </label>
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

/* ─── Confirmations helper ─── */
interface ConfirmationEntry {
  id_personagem: string;
  nome: string;
  confirmed: boolean;
}

function parseConfirmations(obs: string | null): ConfirmationEntry[] {
  if (!obs) return [];
  try {
    const parsed = JSON.parse(obs);
    if (Array.isArray(parsed) && parsed.length > 0 && "id_personagem" in parsed[0]) return parsed;
  } catch { /* not confirmation JSON */ }
  return [];
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
  const [formTipo, setFormTipo] = useState("procuracao");
  const [formRequerentes, setFormRequerentes] = useState<PersonEntry[]>([]);
  const [formEnvolvidos, setFormEnvolvidos] = useState<PersonEntry[]>([]);
  const [formDescricao, setFormDescricao] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");
  const [formLinks, setFormLinks] = useState<string[]>([]);
  const { run: runAI, loading: aiLoading } = useAI();

  const gerarTextoPadrao = async () => {
    const cfg = getFieldConfig(formTipo);
    const tipoLabel = getTipoLabel(formTipo);
    const campo = cfg.descricaoLabel.replace(" *", "");
    const extra = formDescricao.trim() ? `\nAjuste conforme esta observação, sem se prender a ela: ${formDescricao.trim()}` : "";
    const prompt = `Gere um TEXTO GENÉRICO e PADRÃO para preencher APENAS o campo "${campo}" de uma solicitação de "${tipoLabel}" em cartório.

REGRAS OBRIGATÓRIAS:
- NÃO gere o documento inteiro. NÃO inclua cabeçalho, qualificação de partes, foro, data, assinatura, nem títulos.
- Seja o MAIS RESUMIDO possível: 1 a 3 frases curtas, no máximo ~60 palavras. Nada de repetições ou floreios.
- Escreva o mais GENÉRICO possível, usando fórmulas padrão de cartório aplicáveis à maioria dos casos, de modo que quase não seja necessária edição.
- NÃO invente nomes, CPFs, endereços, datas, números ou dados pessoais. Se algum dado for indispensável, use um marcador neutro entre colchetes (ex.: [data], [local]), mas prefira redação impessoal que dispense o marcador.
- Português formal, direto, objetivo. Sem markdown. Devolva SOMENTE o conteúdo do campo.${extra}`;
    const res = await runAI({ operation: "gerar_certidao", prompt });
    if (res.ok) setFormDescricao(res.data as string);
  };

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
    setFormTipo("procuracao");
    setFormRequerentes([]);
    setFormEnvolvidos([]);
    setFormDescricao("");
    setFormObservacoes("");
    setFormLinks([]);
  };

  const fieldConfig = getFieldConfig(formTipo);

  const handleSolicitar = async () => {
    if (formRequerentes.length === 0) {
      toast({ title: "Adicione pelo menos um requerente/pessoa", variant: "destructive" });
      return;
    }
    if (fieldConfig.envolvidosRequired && formEnvolvidos.length === 0) {
      toast({ title: `Preencha: ${fieldConfig.envolvidosLabel?.replace(" *", "")}`, variant: "destructive" });
      return;
    }
    if (!formDescricao && !fieldConfig.autoEmit) {
      toast({ title: "Preencha a descrição", variant: "destructive" });
      return;
    }

    const requerenteNome = JSON.stringify(formRequerentes);
    const partesEnvolvidas = formEnvolvidos.length > 0 ? JSON.stringify(formEnvolvidos) : null;
    const documentoUrl = formLinks.length > 0 ? JSON.stringify(formLinks) : null;
    const primaryId = formRequerentes[0]?.id_personagem || null;

    // Determine initial status and observacoes
    let initialStatus = "solicitado";
    let observacoesData: string | null = formObservacoes || null;

    if (fieldConfig.autoEmit && formTipo === "certidao_distribuicao") {
      // Fetch processes where the person appears as author or defendant (public only)
      initialStatus = "emitido";
      const idPers = formRequerentes[0]?.id_personagem || "";
      const nomePers = formRequerentes[0]?.nome || "";

      const { data: allProcessos } = await supabase
        .from("processos")
        .select("numero, classe, status, autor_nome, reu_nome, assunto, created_at")
        .eq("sigilo", "publico")
        .order("created_at", { ascending: false });

      const processosDoSolicitante = (allProcessos || []).filter(p => {
        const checkField = (field: string) => {
          try {
            const arr = JSON.parse(field);
            if (Array.isArray(arr)) return arr.some((e: any) => e.id_personagem === idPers || e.nome === nomePers);
          } catch { /* plain text */ }
          return field.includes(nomePers);
        };
        return checkField(p.autor_nome) || checkField(p.reu_nome);
      });

      if (processosDoSolicitante.length > 0) {
        const lines = processosDoSolicitante.map(p => {
          const polo = (() => {
            const isAutor = (() => { try { const a = JSON.parse(p.autor_nome); return Array.isArray(a) && a.some((e: any) => e.id_personagem === idPers || e.nome === nomePers); } catch { return p.autor_nome.includes(nomePers); } })();
            const isReu = (() => { try { const a = JSON.parse(p.reu_nome); return Array.isArray(a) && a.some((e: any) => e.id_personagem === idPers || e.nome === nomePers); } catch { return p.reu_nome.includes(nomePers); } })();
            if (isAutor && isReu) return "Autor/Réu";
            if (isAutor) return "Autor";
            return "Réu";
          })();
          const statusMap: Record<string, string> = { novo: "Novo", em_andamento: "Em Andamento", concluso: "Concluso", sentenciado: "Sentenciado", arquivado: "Arquivado", suspenso: "Suspenso", prescrito: "Prescrito" };
          return `• ${p.numero} | ${p.classe?.toUpperCase()} | ${statusMap[p.status] || p.status} | Polo: ${polo} | ${p.assunto}`;
        });
        observacoesData = `PROCESSOS ENCONTRADOS: ${processosDoSolicitante.length}\n\n${lines.join("\n")}`;
      } else {
        observacoesData = "NADA CONSTA — Nenhum processo público encontrado para o solicitante.";
      }
    } else if (fieldConfig.autoEmit) {
      initialStatus = "emitido";
    } else if (fieldConfig.confirmByParties) {
      // Procuração: needs confirmation from all parties
      initialStatus = "aguardando_confirmacao";
      const allParties = [...formRequerentes, ...formEnvolvidos];
      const confirmations: ConfirmationEntry[] = allParties.map(p => ({
        id_personagem: p.id_personagem,
        nome: p.nome,
        confirmed: false,
      }));
      observacoesData = JSON.stringify(confirmations);
    }

    const insertData: any = {
      tipo: formTipo,
      requerente_id: user?.id,
      requerente_nome: requerenteNome,
      id_personagem: primaryId,
      partes_envolvidas: partesEnvolvidas,
      descricao: formDescricao || `Certidão de Distribuição solicitada por ${formRequerentes[0]?.nome}`,
      observacoes: observacoesData,
      documento_url: documentoUrl,
      status: initialStatus,
    };

    if (fieldConfig.autoEmit) {
      insertData.emitido_por_nome = "Sistema — Emissão Automática";
    }

    const { error } = await supabase.from("registros_cartorio").insert(insertData);

    if (error) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
      return;
    }

    if (fieldConfig.autoEmit) {
      toast({ title: "Certidão emitida automaticamente!" });
    } else if (fieldConfig.confirmByParties) {
      toast({
        title: "Procuração registrada — aguardando confirmação",
        description:
          "⚠️ Todas as partes devem assinar em até 24 horas, sob pena de CANCELAMENTO automático. Após emitida, a procuração terá validade de 30 dias.",
        duration: 12000,
      });
    } else {
      toast({ title: "Solicitação registrada com sucesso" });
    }
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

  const handleConfirmParty = async (registro: Registro) => {
    if (!profile?.id_personagem) {
      toast({ title: "Seu perfil não possui ID de personagem", variant: "destructive" });
      return;
    }
    const confirmations = parseConfirmations(registro.observacoes);
    if (confirmations.length === 0) {
      toast({ title: "Dados de confirmação inválidos", variant: "destructive" });
      return;
    }

    const idx = confirmations.findIndex(c => c.id_personagem === profile.id_personagem);
    if (idx === -1) {
      toast({ title: "Você não é parte desta procuração", variant: "destructive" });
      return;
    }
    if (confirmations[idx].confirmed) {
      toast({ title: "Você já confirmou esta procuração" });
      return;
    }

    confirmations[idx].confirmed = true;
    const allConfirmed = confirmations.every(c => c.confirmed);

    const updateData: any = {
      observacoes: JSON.stringify(confirmations),
    };

    if (allConfirmed) {
      updateData.status = "emitido";
      updateData.emitido_por_nome = "Sistema — Confirmação Automática";
    }

    const { error } = await supabase.from("registros_cartorio").update(updateData).eq("id", registro.id);

    if (error) {
      console.error("Erro ao confirmar assinatura:", error);
      toast({ title: "Erro ao confirmar assinatura", description: error.message, variant: "destructive" });
      return;
    }

    // Send notification to all parties about the confirmation
    const allParties = parseConfirmations(JSON.stringify(confirmations));
    const confirmerName = confirmations[idx].nome || profile.nome_completo;

    // Notify requerente
    if (registro.requerente_id && registro.requerente_id !== user?.id) {
      await supabase.from("notificacoes").insert({
        user_id: registro.requerente_id,
        titulo: `Assinatura confirmada — ${registro.numero_registro}`,
        mensagem: `${confirmerName} confirmou a assinatura na procuração.${allConfirmed ? " Todas as partes confirmaram — documento emitido automaticamente!" : ""}`,
        tipo: "cartorio",
        link_secao: "cartorio",
      });
    }

    // Notify other parties via id_personagem lookup
    for (const party of confirmations) {
      if (party.id_personagem === profile.id_personagem) continue;
      const partyProfile = await lookupProfile(party.id_personagem);
      if (partyProfile) {
        const { data: partyUser } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("id_personagem", party.id_personagem)
          .maybeSingle();
        if (partyUser && partyUser.user_id !== user?.id) {
          await supabase.from("notificacoes").insert({
            user_id: partyUser.user_id,
            titulo: `Assinatura confirmada — ${registro.numero_registro}`,
            mensagem: `${confirmerName} confirmou a assinatura na procuração.${allConfirmed ? " Todas as partes confirmaram — documento emitido automaticamente!" : ""}`,
            tipo: "cartorio",
            link_secao: "cartorio",
          });
        }
      }
    }

    if (allConfirmed) {
      toast({ title: "Todas as partes confirmaram — procuração emitida automaticamente!" });
    } else {
      toast({ title: "Sua confirmação foi registrada" });
    }
    fetchRegistros();
    setShowDetalhes(null);
  };

  const handleViewProfile = async (idPersonagem: string) => {
    const prof = await lookupProfile(idPersonagem);
    if (prof) setViewingProfile(prof);
    else toast({ title: "Perfil não encontrado", variant: "destructive" });
  };

  // Stats
  const solicitados = registros.filter((r) => r.status === "solicitado" || r.status === "aguardando_confirmacao").length;
  const emAnalise = registros.filter((r) => r.status === "em_analise").length;
  const emitidos = registros.filter((r) => r.status === "emitido").length;

  const getDisplayRequerentes = (r: Registro): string => {
    const arr = parseJsonArray<PersonEntry>(r.requerente_nome);
    if (arr.length > 0) return arr.map((p) => p.nome).join(", ");
    return r.requerente_nome;
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
      <div className="py-6">
        <ListSkeleton rows={5} />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Pendentes / Aguardando", value: solicitados, icon: Clock, color: "text-amber-600" },
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
                {registros.filter((r) => ["solicitado", "em_analise", "aguardando_confirmacao"].includes(r.status)).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
                )}
                {registros
                  .filter((r) => ["solicitado", "em_analise", "aguardando_confirmacao"].includes(r.status))
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
            {TIPOS_REGISTRO.map((t) => {
              const cfg = getFieldConfig(t.value);
              const desc = cfg.autoEmit
                ? "Emissão automática — sem necessidade de aprovação."
                : cfg.confirmByParties
                ? "Emissão automática após confirmação de todas as partes."
                : "Solicite a emissão deste documento no cartório.";
              return (
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
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                      {cfg.autoEmit && <Badge className="mt-1 bg-emerald-100 text-emerald-800 text-[10px]">Automático</Badge>}
                      {cfg.confirmByParties && <Badge className="mt-1 bg-purple-100 text-purple-800 text-[10px]">Confirmação</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG - Nova Solicitação */}
      <Dialog open={showNovoRegistro} onOpenChange={(open) => { if (!open) resetForm(); setShowNovoRegistro(open); }}>
        <DialogContent className="max-w-lg !max-h-[85vh] !overflow-hidden !flex !flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Nova Solicitação — {getTipoLabel(formTipo)}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4 pb-4">
              <div>
                <Label>Tipo de Documento *</Label>
                <Select value={formTipo} onValueChange={(v) => { setFormTipo(v); setFormRequerentes([]); setFormEnvolvidos([]); setFormDescricao(""); setFormObservacoes(""); setFormLinks([]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_REGISTRO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldConfig.autoEmit && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Este documento é emitido automaticamente.
                  </p>
                )}
                {fieldConfig.confirmByParties && (
                  <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-1">
                    <p className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" /> Regras da procuração
                    </p>
                    <ul className="list-disc pl-4 text-amber-900/90 dark:text-amber-100/90 space-y-0.5">
                      <li>Todas as partes devem confirmar em até <strong>24 horas</strong>, ou o pedido será <strong>cancelado</strong> automaticamente.</li>
                      <li>Após emitida, a procuração terá <strong>validade de 30 dias</strong> e depois expirará.</li>
                    </ul>
                  </div>
                )}
              </div>

              <PersonInput
                label={fieldConfig.requerenteLabel}
                entries={formRequerentes}
                onChange={setFormRequerentes}
              />

              {fieldConfig.envolvidosLabel && (
                <PersonInput
                  label={fieldConfig.envolvidosLabel}
                  entries={formEnvolvidos}
                  onChange={setFormEnvolvidos}
                />
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>{fieldConfig.descricaoLabel}</Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg" onClick={gerarTextoPadrao} disabled={aiLoading}>
                    {aiLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Gerar texto padrão com IA
                  </Button>
                </div>
                <Textarea value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} placeholder={fieldConfig.descricaoPlaceholder} rows={6} />
              </div>

              {!fieldConfig.autoEmit && !fieldConfig.confirmByParties && (
                <div>
                  <Label>Observações</Label>
                  <Textarea value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} placeholder="Informações adicionais..." rows={2} />
                </div>
              )}

              <LinksInput
                label="Links / Documentos Anexos"
                links={formLinks}
                onChange={setFormLinks}
              />

              <Button className="w-full" onClick={handleSolicitar}>
                <Stamp className="h-4 w-4 mr-1" />
                {fieldConfig.autoEmit ? "Emitir Certidão" : fieldConfig.confirmByParties ? "Registrar Procuração" : "Solicitar Documento"}
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
                  <p className="text-xs text-muted-foreground mb-1">
                    {getFieldConfig(showDetalhes.tipo).requerenteLabel.replace(" *", "")}
                  </p>
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
                    <p className="text-xs text-muted-foreground mb-1">
                      {getFieldConfig(showDetalhes.tipo).envolvidosLabel?.replace(" *", "") || "Partes Envolvidas"}
                    </p>
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

                {/* Procuração confirmation status */}
                {showDetalhes.tipo === "procuracao" && showDetalhes.status === "aguardando_confirmacao" && (() => {
                  const confirmations = parseConfirmations(showDetalhes.observacoes);
                  if (confirmations.length === 0) return null;
                  const myIdPersonagem = profile?.id_personagem;
                  const canConfirm = myIdPersonagem && confirmations.some(c => c.id_personagem === myIdPersonagem && !c.confirmed);
                  return (
                    <div className="space-y-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs font-semibold text-purple-800 dark:text-purple-300">Confirmação das Partes</p>
                      <div className="space-y-1">
                        {confirmations.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {c.confirmed ? (
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-600" />
                            )}
                            <span className={c.confirmed ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}>
                              {c.nome} — {c.confirmed ? "Confirmado" : "Pendente"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {canConfirm && (
                        <Button size="sm" className="w-full mt-2" onClick={() => handleConfirmParty(showDetalhes)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Confirmar minha assinatura
                        </Button>
                      )}
                    </div>
                  );
                })()}

                {/* Descrição */}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {getFieldConfig(showDetalhes.tipo).descricaoLabel.replace(" *", "")}
                  </p>
                  <p className="text-sm">{showDetalhes.descricao}</p>
                </div>

                {/* Observações (only show if not confirmation JSON) */}
                {showDetalhes.observacoes && parseConfirmations(showDetalhes.observacoes).length === 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {showDetalhes.tipo === "certidao_distribuicao" ? "Processos Distribuídos" : "Observações"}
                    </p>
                    <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{showDetalhes.observacoes}</p>
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

                {/* Ações do cartorário — only for non-auto types */}
                {isCartorario && showDetalhes.status !== "emitido" && showDetalhes.status !== "recusado" && showDetalhes.status !== "aguardando_confirmacao" && (
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

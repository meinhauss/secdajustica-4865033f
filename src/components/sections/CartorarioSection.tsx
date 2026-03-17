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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText, Send, Bell, Award, Archive, BarChart3, Plus, Search,
  CheckCircle, Clock, Eye, Stamp, AlertTriangle
} from "lucide-react";

// ── Tipos ──
interface Protocolo {
  id: string; numero: string; processo_id: string | null; tipo: string;
  descricao: string; remetente_id: string | null; remetente_nome: string;
  documento_url: string | null; created_at: string;
}
interface Intimacao {
  id: string; processo_id: string; destinatario_id: string | null;
  destinatario_nome: string; tipo: string; conteudo: string;
  prazo_dias: number; data_envio: string; data_leitura: string | null;
  data_limite: string | null; status: string; created_at: string;
}
interface Certificacao {
  id: string; processo_id: string; tipo: string; conteudo: string;
  emitido_por: string | null; emitido_por_nome: string | null;
  assinado: boolean; data_assinatura: string | null; created_at: string;
}
interface Processo {
  id: string; numero: string; autor_nome: string; reu_nome: string;
  status: string; classe: string; assunto: string;
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pendente: "bg-amber-100 text-amber-800", lida: "bg-blue-100 text-blue-800",
    cumprida: "bg-emerald-100 text-emerald-800", expirada: "bg-destructive/10 text-destructive",
    expedido: "bg-amber-100 text-amber-800", registrado: "bg-blue-100 text-blue-800",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

export default function CartorarioSection() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isCartorario = isAdmin || roles.includes("oficial_justica");

  const [tab, setTab] = useState("painel");
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [intimacoes, setIntimacoes] = useState<Intimacao[]>([]);
  const [certificacoes, setCertificacoes] = useState<Certificacao[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ── Dialogs ──
  const [showProtocolo, setShowProtocolo] = useState(false);
  const [showIntimacao, setShowIntimacao] = useState(false);
  const [showCertificacao, setShowCertificacao] = useState(false);

  // ── Forms ──
  const [protoForm, setProtoForm] = useState({ processo_id: "", tipo: "peticao", descricao: "" });
  const [intimForm, setIntimForm] = useState({ processo_id: "", destinatario_nome: "", tipo: "intimacao", conteudo: "", prazo_dias: "5" });
  const [certForm, setCertForm] = useState({ processo_id: "", tipo: "certidao_juntada", conteudo: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [p, i, c, pr] = await Promise.all([
      supabase.from("protocolos").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("intimacoes").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("certificacoes").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("processos").select("id,numero,autor_nome,reu_nome,status,classe,assunto").order("created_at", { ascending: false }).limit(500),
    ]);
    if (p.data) setProtocolos(p.data as any);
    if (i.data) setIntimacoes(i.data as any);
    if (c.data) setCertificacoes(c.data as any);
    if (pr.data) setProcessos(pr.data as any);
    setLoading(false);
  };

  const getProcessoNumero = (pid: string | null) => processos.find(p => p.id === pid)?.numero || "—";

  // ── Protocolar ──
  const handleProtocolar = async () => {
    if (!protoForm.descricao) { toast({ title: "Preencha a descrição", variant: "destructive" }); return; }
    const { error } = await supabase.from("protocolos").insert({
      processo_id: protoForm.processo_id || null,
      tipo: protoForm.tipo,
      descricao: protoForm.descricao,
      remetente_id: user?.id,
      remetente_nome: profile?.nome_completo || "Servidor",
    } as any);
    if (error) { toast({ title: "Erro ao protocolar", description: error.message, variant: "destructive" }); return; }
    // Register movement
    if (protoForm.processo_id) {
      await supabase.from("movimentacoes").insert({
        processo_id: protoForm.processo_id,
        tipo: "protocolo",
        descricao: `Protocolo registrado: ${protoForm.tipo} — ${protoForm.descricao.substring(0, 80)}`,
        autor_id: user?.id,
      });
    }
    toast({ title: "Protocolo registrado com sucesso" });
    setShowProtocolo(false);
    setProtoForm({ processo_id: "", tipo: "peticao", descricao: "" });
    fetchAll();
  };

  // ── Intimar ──
  const handleIntimar = async () => {
    if (!intimForm.processo_id || !intimForm.destinatario_nome || !intimForm.conteudo) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" }); return;
    }
    const prazo = parseInt(intimForm.prazo_dias) || 5;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + prazo);
    const { error } = await supabase.from("intimacoes").insert({
      processo_id: intimForm.processo_id,
      destinatario_nome: intimForm.destinatario_nome,
      tipo: intimForm.tipo,
      conteudo: intimForm.conteudo,
      prazo_dias: prazo,
      data_limite: dataLimite.toISOString(),
    } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("movimentacoes").insert({
      processo_id: intimForm.processo_id, tipo: "intimacao",
      descricao: `Intimação expedida para ${intimForm.destinatario_nome}`, autor_id: user?.id,
    });
    toast({ title: "Intimação expedida" });
    setShowIntimacao(false);
    setIntimForm({ processo_id: "", destinatario_nome: "", tipo: "intimacao", conteudo: "", prazo_dias: "5" });
    fetchAll();
  };

  // ── Certificar ──
  const handleCertificar = async () => {
    if (!certForm.processo_id || !certForm.conteudo) {
      toast({ title: "Preencha todos os campos", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("certificacoes").insert({
      processo_id: certForm.processo_id,
      tipo: certForm.tipo,
      conteudo: certForm.conteudo,
      emitido_por: user?.id,
      emitido_por_nome: profile?.nome_completo || "Servidor",
      assinado: true,
      data_assinatura: new Date().toISOString(),
    } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("movimentacoes").insert({
      processo_id: certForm.processo_id, tipo: "certidao",
      descricao: `Certidão emitida: ${certForm.tipo.replace(/_/g, " ")}`, autor_id: user?.id,
    });
    toast({ title: "Certidão emitida e assinada" });
    setShowCertificacao(false);
    setCertForm({ processo_id: "", tipo: "certidao_juntada", conteudo: "" });
    fetchAll();
  };

  // ── Confirmar leitura de intimação ──
  const handleConfirmarLeitura = async (id: string) => {
    await supabase.from("intimacoes").update({ status: "lida", data_leitura: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Leitura confirmada" });
    fetchAll();
  };

  const handleCumprirIntimacao = async (id: string) => {
    await supabase.from("intimacoes").update({ status: "cumprida" } as any).eq("id", id);
    toast({ title: "Intimação cumprida" });
    fetchAll();
  };

  // ── Stats ──
  const pendingIntimacoes = intimacoes.filter(i => i.status === "pendente").length;
  const protocolosHoje = protocolos.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length;
  const processosConclusos = processos.filter(p => p.status === "concluso").length;

  const filteredProtocolos = protocolos.filter(p =>
    p.numero.toLowerCase().includes(search.toLowerCase()) ||
    p.descricao.toLowerCase().includes(search.toLowerCase()) ||
    p.remetente_nome.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Protocolos Hoje", value: protocolosHoje, icon: FileText, color: "text-blue-600" },
          { label: "Intimações Pendentes", value: pendingIntimacoes, icon: Bell, color: "text-amber-600" },
          { label: "Processos Conclusos", value: processosConclusos, icon: Clock, color: "text-emerald-600" },
          { label: "Certidões Emitidas", value: certificacoes.length, icon: Award, color: "text-purple-600" },
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
          <TabsTrigger value="protocolos">Protocolos</TabsTrigger>
          <TabsTrigger value="intimacoes">Intimações</TabsTrigger>
          <TabsTrigger value="certificacoes">Certidões</TabsTrigger>
          <TabsTrigger value="arquivo">Arquivo</TabsTrigger>
        </TabsList>

        {/* ── PAINEL ── */}
        <TabsContent value="painel" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tarefas Pendentes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Intimações Pendentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {intimacoes.filter(i => i.status === "pendente").length === 0 && <p className="text-sm text-muted-foreground">Nenhuma intimação pendente.</p>}
                {intimacoes.filter(i => i.status === "pendente").slice(0, 10).map(i => (
                  <div key={i.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{i.destinatario_nome}</p>
                      <p className="text-xs text-muted-foreground">Proc. {getProcessoNumero(i.processo_id)} • Prazo: {i.prazo_dias}d</p>
                    </div>
                    {isCartorario && (
                      <Button size="sm" variant="outline" onClick={() => handleConfirmarLeitura(i.id)}>
                        <Eye className="h-3 w-3 mr-1" /> Lida
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Processos Conclusos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-500" /> Processos Conclusos p/ Magistrado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {processos.filter(p => p.status === "concluso").length === 0 && <p className="text-sm text-muted-foreground">Nenhum processo concluso.</p>}
                {processos.filter(p => p.status === "concluso").slice(0, 10).map(p => (
                  <div key={p.id} className="p-2 rounded-lg bg-muted/50 text-sm">
                    <p className="font-medium text-foreground">{p.numero}</p>
                    <p className="text-xs text-muted-foreground">{p.autor_nome} vs {p.reu_nome} • {p.assunto}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          {isCartorario && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowProtocolo(true)}><Plus className="h-4 w-4 mr-1" /> Novo Protocolo</Button>
              <Button variant="outline" onClick={() => setShowIntimacao(true)}><Send className="h-4 w-4 mr-1" /> Expedir Intimação</Button>
              <Button variant="outline" onClick={() => setShowCertificacao(true)}><Stamp className="h-4 w-4 mr-1" /> Emitir Certidão</Button>
            </div>
          )}
        </TabsContent>

        {/* ── PROTOCOLOS ── */}
        <TabsContent value="protocolos" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar protocolo..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {isCartorario && <Button onClick={() => setShowProtocolo(true)}><Plus className="h-4 w-4 mr-1" /> Protocolar</Button>}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Protocolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Remetente</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProtocolos.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum protocolo encontrado.</TableCell></TableRow>
                )}
                {filteredProtocolos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-medium">{p.numero}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{p.tipo.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-xs">{getProcessoNumero(p.processo_id)}</TableCell>
                    <TableCell className="text-sm">{p.remetente_nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── INTIMAÇÕES ── */}
        <TabsContent value="intimacoes" className="space-y-4">
          <div className="flex items-center gap-2">
            {isCartorario && <Button onClick={() => setShowIntimacao(true)}><Send className="h-4 w-4 mr-1" /> Nova Intimação</Button>}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intimacoes.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma intimação.</TableCell></TableRow>
                )}
                {intimacoes.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium text-sm">{i.destinatario_nome}</TableCell>
                    <TableCell className="text-xs">{getProcessoNumero(i.processo_id)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{i.tipo}</Badge></TableCell>
                    <TableCell className="text-xs">{i.prazo_dias} dias • {i.data_limite ? new Date(i.data_limite).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell><Badge className={statusBadge(i.status)}>{i.status}</Badge></TableCell>
                    <TableCell>
                      {isCartorario && i.status === "pendente" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleConfirmarLeitura(i.id)}><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleCumprirIntimacao(i.id)}><CheckCircle className="h-3 w-3" /></Button>
                        </div>
                      )}
                      {isCartorario && i.status === "lida" && (
                        <Button size="sm" variant="ghost" onClick={() => handleCumprirIntimacao(i.id)}><CheckCircle className="h-3 w-3" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── CERTIDÕES ── */}
        <TabsContent value="certificacoes" className="space-y-4">
          {isCartorario && <Button onClick={() => setShowCertificacao(true)}><Stamp className="h-4 w-4 mr-1" /> Nova Certidão</Button>}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Emitido por</TableHead>
                  <TableHead>Assinado</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificacoes.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma certidão.</TableCell></TableRow>
                )}
                {certificacoes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="outline" className="capitalize">{c.tipo.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-xs">{getProcessoNumero(c.processo_id)}</TableCell>
                    <TableCell className="text-sm">{c.emitido_por_nome || "—"}</TableCell>
                    <TableCell>{c.assinado ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── ARQUIVO ── */}
        <TabsContent value="arquivo" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4" /> Processos Arquivados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Partes</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processos.filter(p => p.status === "arquivado").length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum processo arquivado.</TableCell></TableRow>
                  )}
                  {processos.filter(p => p.status === "arquivado").map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                      <TableCell className="text-sm">{p.autor_nome} vs {p.reu_nome}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{p.classe}</Badge></TableCell>
                      <TableCell><Badge className="bg-muted text-muted-foreground">Arquivado</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ── */}

      {/* Protocolo */}
      <Dialog open={showProtocolo} onOpenChange={setShowProtocolo}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Protocolo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Processo (opcional)</label>
              <Select value={protoForm.processo_id} onValueChange={v => setProtoForm(f => ({ ...f, processo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Vincular a processo..." /></SelectTrigger>
                <SelectContent>{processos.slice(0, 50).map(p => <SelectItem key={p.id} value={p.id}>{p.numero} — {p.autor_nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo</label>
              <Select value={protoForm.tipo} onValueChange={v => setProtoForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="peticao">Petição</SelectItem>
                  <SelectItem value="manifestacao">Manifestação</SelectItem>
                  <SelectItem value="documento">Documento</SelectItem>
                  <SelectItem value="recurso">Recurso</SelectItem>
                  <SelectItem value="contrarrazoes">Contrarrazões</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Descrição *</label>
              <Textarea value={protoForm.descricao} onChange={e => setProtoForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o documento protocolado..." />
            </div>
            <Button className="w-full" onClick={handleProtocolar}><FileText className="h-4 w-4 mr-1" /> Protocolar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Intimação */}
      <Dialog open={showIntimacao} onOpenChange={setShowIntimacao}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Expedir Intimação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Processo *</label>
              <Select value={intimForm.processo_id} onValueChange={v => setIntimForm(f => ({ ...f, processo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o processo..." /></SelectTrigger>
                <SelectContent>{processos.slice(0, 50).map(p => <SelectItem key={p.id} value={p.id}>{p.numero} — {p.autor_nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Destinatário *</label>
              <Input value={intimForm.destinatario_nome} onChange={e => setIntimForm(f => ({ ...f, destinatario_nome: e.target.value }))} placeholder="Nome do intimado" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Tipo</label>
                <Select value={intimForm.tipo} onValueChange={v => setIntimForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intimacao">Intimação</SelectItem>
                    <SelectItem value="citacao">Citação</SelectItem>
                    <SelectItem value="notificacao">Notificação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Prazo (dias)</label>
                <Input type="number" value={intimForm.prazo_dias} onChange={e => setIntimForm(f => ({ ...f, prazo_dias: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Conteúdo *</label>
              <Textarea value={intimForm.conteudo} onChange={e => setIntimForm(f => ({ ...f, conteudo: e.target.value }))} placeholder="Texto da intimação..." rows={4} />
            </div>
            <Button className="w-full" onClick={handleIntimar}><Send className="h-4 w-4 mr-1" /> Expedir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certidão */}
      <Dialog open={showCertificacao} onOpenChange={setShowCertificacao}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Emitir Certidão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Processo *</label>
              <Select value={certForm.processo_id} onValueChange={v => setCertForm(f => ({ ...f, processo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o processo..." /></SelectTrigger>
                <SelectContent>{processos.slice(0, 50).map(p => <SelectItem key={p.id} value={p.id}>{p.numero} — {p.autor_nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo de Certidão</label>
              <Select value={certForm.tipo} onValueChange={v => setCertForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="certidao_juntada">Certidão de Juntada</SelectItem>
                  <SelectItem value="certidao_prazo">Certidão de Decurso de Prazo</SelectItem>
                  <SelectItem value="certidao_mandado">Certidão de Cumprimento de Mandado</SelectItem>
                  <SelectItem value="certidao_publicacao">Certidão de Publicação</SelectItem>
                  <SelectItem value="certidao_transito">Certidão de Trânsito em Julgado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Conteúdo *</label>
              <Textarea value={certForm.conteudo} onChange={e => setCertForm(f => ({ ...f, conteudo: e.target.value }))} placeholder="Texto da certidão..." rows={5} />
            </div>
            <Button className="w-full" onClick={handleCertificar}><Stamp className="h-4 w-4 mr-1" /> Emitir e Assinar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

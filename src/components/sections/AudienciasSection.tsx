import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Plus, UserPlus, Trash2, Gavel, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PersonLookupInput } from "@/components/PersonLookupInput";

const TIPOS_AUDIENCIA = ["instrução", "conciliação", "julgamento", "custódia", "justificação", "admonitória"];
const TIPOS_ENVOLVIDO = ["participante", "testemunha", "perito", "outro"];
const DECISOES_CUSTODIA = [
  { value: "relaxamento", label: "Relaxamento da prisão (ilegal)" },
  { value: "preventiva", label: "Conversão em prisão preventiva" },
  { value: "liberdade_provisoria", label: "Liberdade provisória (com ou sem fiança)" },
  { value: "liberdade_medidas", label: "Liberdade com medidas cautelares diversas" },
];


interface EnvolvidoLocal {
  nome: string;
  tipo: string;
  id_personagem: string;
  observacoes: string;
  user_id?: string | null;
}

export default function AudienciasSection() {
  const { roles, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [ataText, setAtaText] = useState("");
  const [showAtaForm, setShowAtaForm] = useState(false);

  const isMagistrado = roles.some(r => ["magistrado", "desembargador", "presidente_tribunal", "admin"].includes(r));
  const isOficialJustica = roles.includes("oficial_justica");
  const canRealizarAudiencia = isMagistrado || isOficialJustica;

  const { data: audiencias } = useQuery({
    queryKey: ["audiencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audiencias")
        .select("*, processos(numero, assunto)")
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: detailEnvolvidos } = useQuery({
    queryKey: ["envolvidos-audiencia", detailId],
    queryFn: async () => {
      if (!detailId) return [];
      const { data, error } = await supabase
        .from("envolvidos_audiencia")
        .select("*")
        .eq("audiencia_id", detailId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!detailId,
  });

  const { data: processos } = useQuery({
    queryKey: ["processos-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("id, numero, assunto")
        .in("status", ["novo", "em_andamento", "concluso"])
        .order("numero", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isMagistrado,
  });

  const [form, setForm] = useState({
    tipo: "instrução",
    data_hora: "",
    local: "Sala de Audiências 1",
    processo_id: "",
    observacoes: "",
  });

  // Envolvidos adicionados no formulário de agendamento (audiências sem processo)
  const [envolvidos, setEnvolvidos] = useState<EnvolvidoLocal[]>([]);
  const [envForm, setEnvForm] = useState<EnvolvidoLocal>({ nome: "", tipo: "participante", id_personagem: "", observacoes: "" });

  const addEnvolvidoLocal = () => {
    if (!envForm.nome.trim()) return;
    setEnvolvidos(prev => [...prev, { ...envForm }]);
    setEnvForm({ nome: "", tipo: "participante", id_personagem: "", observacoes: "" });
  };

  const removeEnvolvidoLocal = (idx: number) => {
    setEnvolvidos(prev => prev.filter((_, i) => i !== idx));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const dataHoraISO = new Date(form.data_hora).toISOString();
      const payload: any = {
        tipo: form.tipo,
        data_hora: dataHoraISO,
        local: form.local || null,
        observacoes: form.observacoes || null,
        processo_id: form.processo_id || null,
      };
      const { data: inserted, error } = await supabase.from("audiencias").insert(payload).select("id").single();
      if (error) throw error;

      const dataFormatada = format(new Date(form.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      if (form.processo_id) {
        // Notificar partes do processo
        const { data: proc } = await supabase
          .from("processos")
          .select("numero, advogado_autor_id, advogado_reu_id, juiz_id")
          .eq("id", form.processo_id)
          .single();

        const { data: interessados } = await supabase
          .from("interessados_processo")
          .select("user_id")
          .eq("processo_id", form.processo_id);

        const userIds = new Set<string>();
        if (proc?.advogado_autor_id) userIds.add(proc.advogado_autor_id);
        if (proc?.advogado_reu_id) userIds.add(proc.advogado_reu_id);
        if (proc?.juiz_id) userIds.add(proc.juiz_id);
        interessados?.forEach(i => userIds.add(i.user_id));
        if (user?.id) userIds.delete(user.id);

        const notifs = Array.from(userIds).map(uid => ({
          user_id: uid,
          titulo: "Audiência Agendada",
          mensagem: `Audiência de ${form.tipo} agendada para ${dataFormatada} — Processo ${proc?.numero || ""}. Local: ${form.local || "A definir"}`,
          tipo: "audiencia",
          link_secao: "audiencias",
        }));
        if (notifs.length > 0) await supabase.from("notificacoes").insert(notifs);
      } else if (envolvidos.length > 0) {
        // Inserir envolvidos e notificar por user_id (se encontrado pelo id_personagem)
        const envsToInsert = envolvidos.map(e => ({
          audiencia_id: inserted.id,
          nome: e.nome,
          tipo: e.tipo,
          id_personagem: e.id_personagem || null,
          observacoes: e.observacoes || null,
        }));
        await supabase.from("envolvidos_audiencia").insert(envsToInsert);

        // Buscar user_ids dos envolvidos pelo id_personagem para notificar
        const idsPersonagem = envolvidos.map(e => e.id_personagem).filter(Boolean);
        if (idsPersonagem.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, id_personagem")
            .in("id_personagem", idsPersonagem);

          const userIds = new Set<string>();
          profiles?.forEach(p => userIds.add(p.user_id));
          if (user?.id) userIds.delete(user.id);

          const notifs = Array.from(userIds).map(uid => ({
            user_id: uid,
            titulo: "Audiência Agendada",
            mensagem: `Você foi incluído como envolvido em audiência de ${form.tipo} agendada para ${dataFormatada}. Local: ${form.local || "A definir"}`,
            tipo: "audiencia",
            link_secao: "audiencias",
          }));
          if (notifs.length > 0) await supabase.from("notificacoes").insert(notifs);
        }
      }
    },
    onSuccess: () => {
      toast.success("Audiência agendada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["audiencias"] });
      setOpen(false);
      setForm({ tipo: "instrução", data_hora: "", local: "Sala de Audiências 1", processo_id: "", observacoes: "" });
      setEnvolvidos([]);
    },
    onError: (e: any) => toast.error("Erro ao agendar: " + e.message),
  });

  const realizarMutation = useMutation({
    mutationFn: async () => {
      if (!detailId) throw new Error("Sem audiência selecionada");
      const { error } = await supabase
        .from("audiencias")
        .update({ status: "realizada", ata: ataText || null })
        .eq("id", detailId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Audiência marcada como realizada!");
      queryClient.invalidateQueries({ queryKey: ["audiencias"] });
      setShowAtaForm(false);
      setAtaText("");
      setDetailId(null);
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  // ===== AUDIÊNCIA DE CUSTÓDIA =====
  const canCustodia = isMagistrado || isOficialJustica;
  const [openCustodia, setOpenCustodia] = useState(false);
  const [custForm, setCustForm] = useState({
    data_hora: "",
    local: "Sala de Custódia",
    preso_nome: "",
    preso_id_personagem: "",
    autoridade_prisao: "",
    data_prisao: "",
    tipificacao: "",
    relato_fatos: "",
    alegacoes_preso: "",
    decisao: "preventiva",
    fundamentacao: "",
    observacoes: "",
  });
  const [openProcessoCustodia, setOpenProcessoCustodia] = useState<string | null>(null);

  const resetCustForm = () => setCustForm({
    data_hora: "", local: "Sala de Custódia", preso_nome: "", preso_id_personagem: "",
    autoridade_prisao: "", data_prisao: "", tipificacao: "", relato_fatos: "",
    alegacoes_preso: "", decisao: "preventiva", fundamentacao: "", observacoes: "",
  });

  const createCustodiaMutation = useMutation({
    mutationFn: async () => {
      if (!custForm.data_hora) throw new Error("Informe a data e hora da audiência");
      if (!custForm.preso_nome.trim()) throw new Error("Informe o nome do preso");
      if (!custForm.relato_fatos.trim()) throw new Error("Informe o relato dos fatos");

      const decisaoLabel = DECISOES_CUSTODIA.find(d => d.value === custForm.decisao)?.label || custForm.decisao;
      const dataHoraISO = new Date(custForm.data_hora).toISOString();
      const dataPrisaoISO = custForm.data_prisao ? new Date(custForm.data_prisao).toISOString() : null;

      const ata = `AUDIÊNCIA DE CUSTÓDIA — Art. 310 do CPP\n\n`
        + `Preso: ${custForm.preso_nome}${custForm.preso_id_personagem ? ` (RG: ${custForm.preso_id_personagem})` : ""}\n`
        + `Autoridade que efetuou a prisão: ${custForm.autoridade_prisao || "Não informado"}\n`
        + (dataPrisaoISO ? `Data/hora da prisão: ${format(new Date(dataPrisaoISO), "dd/MM/yyyy HH:mm", { locale: ptBR })}\n` : "")
        + (custForm.tipificacao ? `Tipificação: ${custForm.tipificacao}\n` : "")
        + `\n=== RELATO DOS FATOS ===\n${custForm.relato_fatos}\n`
        + (custForm.alegacoes_preso ? `\n=== ALEGAÇÕES DO PRESO ===\n${custForm.alegacoes_preso}\n` : "")
        + `\n=== DECISÃO ===\n${decisaoLabel}\n`
        + (custForm.fundamentacao ? `\nFUNDAMENTAÇÃO:\n${custForm.fundamentacao}\n` : "")
        + (custForm.observacoes ? `\nOBSERVAÇÕES:\n${custForm.observacoes}` : "");

      const { data: inserted, error } = await supabase.from("audiencias").insert({
        tipo: "custódia",
        data_hora: dataHoraISO,
        local: custForm.local || null,
        observacoes: `Custódia — Preso: ${custForm.preso_nome}. Decisão: ${decisaoLabel}.`,
        status: "realizada",
        ata,
      }).select("id").single();
      if (error) throw error;

      if (custForm.preso_nome.trim()) {
        await supabase.from("envolvidos_audiencia").insert({
          audiencia_id: inserted.id,
          nome: custForm.preso_nome,
          tipo: "participante",
          id_personagem: custForm.preso_id_personagem || null,
          observacoes: "Preso (audiência de custódia)",
        });
      }

      return inserted.id as string;
    },
    onSuccess: (id) => {
      toast.success("Audiência de custódia registrada!");
      queryClient.invalidateQueries({ queryKey: ["audiencias"] });
      setOpenCustodia(false);
      // Oferecer abertura de processo criminal
      setOpenProcessoCustodia(id);
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const abrirProcessoCriminal = useMutation({
    mutationFn: async (audienciaId: string) => {
      // Buscar dados da audiência criada
      const { data: aud, error: errAud } = await supabase.from("audiencias").select("*").eq("id", audienciaId).single();
      if (errAud) throw errAud;
      const { data: envs } = await supabase.from("envolvidos_audiencia").select("*").eq("audiencia_id", audienciaId);
      const preso = envs?.[0];

      const reuArr = preso ? [{ nome: preso.nome, ...(preso.id_personagem ? { id_personagem: preso.id_personagem } : {}) }] : [];
      const autorArr = [{ nome: "Ministério Público" }];

      const { data: sorteioData } = await supabase.rpc("sortear_magistrado");
      const juizId = sorteioData || null;

      const processoId = crypto.randomUUID();
      const { error } = await supabase.from("processos").insert({
        id: processoId,
        numero: "",
        classe: "criminal" as any,
        assunto: `Ação penal — origem: Audiência de Custódia (${format(new Date(aud.data_hora), "dd/MM/yyyy", { locale: ptBR })})`,
        descricao: aud.ata || "",
        autor_nome: JSON.stringify(autorArr),
        reu_nome: JSON.stringify(reuArr),
        juiz_id: juizId,
        sigilo: "publico",
      });
      if (error) throw error;

      // Vincular audiência ao processo recém-criado
      await supabase.from("audiencias").update({ processo_id: processoId }).eq("id", audienciaId);

      // Movimentação
      await supabase.from("movimentacoes").insert({
        processo_id: processoId,
        tipo: "origem_custodia",
        descricao: `Processo criminal aberto a partir de audiência de custódia realizada em ${format(new Date(aud.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.`,
        autor_id: user?.id,
      });

      return processoId;
    },
    onSuccess: () => {
      toast.success("Processo criminal aberto e vinculado!");
      queryClient.invalidateQueries({ queryKey: ["audiencias"] });
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setOpenProcessoCustodia(null);
      resetCustForm();
    },
    onError: (e: any) => toast.error("Erro ao abrir processo: " + e.message),
  });

  const showEnvolvidos = !form.processo_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Audiências</h2>
          <p className="text-sm text-muted-foreground">Pauta de audiências da Comarca</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        {canCustodia && (
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpenCustodia(true)}>
            <Gavel className="h-4 w-4" /> Audiência de Custódia
          </Button>
        )}
        {isMagistrado && (
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEnvolvidos([]); setEnvForm({ nome: "", tipo: "participante", id_personagem: "", observacoes: "" }); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Agendar Audiência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Audiência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_AUDIENCIA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data e Hora</Label>
                    <Input type="datetime-local" value={form.data_hora} onChange={e => setForm(f => ({ ...f, data_hora: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Local</Label>
                  <Input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} placeholder="Sala de Audiências 1" />
                </div>

                <div className="space-y-1.5">
                  <Label>Processo (opcional)</Label>
                  <Select value={form.processo_id} onValueChange={v => setForm(f => ({ ...f, processo_id: v === "__none__" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Sem vínculo a processo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem vínculo a processo</SelectItem>
                      {processos?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.numero} — {p.assunto}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} placeholder="Informações adicionais..." />
                </div>

                {/* Envolvidos — apenas quando sem processo */}
                {showEnvolvidos && (
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <UserPlus className="h-4 w-4" /> Envolvidos na Audiência
                    </p>

                    {envolvidos.length > 0 && (
                      <div className="space-y-1.5">
                        {envolvidos.map((e, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-background rounded-md px-2.5 py-1.5 text-sm border">
                            <div>
                              <span className="font-medium">{e.nome}</span>
                              {e.id_personagem && <span className="text-muted-foreground ml-1 text-xs">(ID: {e.id_personagem})</span>}
                              <span className="text-xs text-muted-foreground ml-1.5 capitalize">— {e.tipo}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeEnvolvidoLocal(idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <PersonLookupInput
                      nomeValue={envForm.nome}
                      onNomeChange={nome => setEnvForm(f => ({ ...f, nome }))}
                      onLookupResult={p => { if (p) setEnvForm(f => ({ ...f, nome: p.nome_completo, id_personagem: p.id_personagem || "" })); }}
                      idValue={envForm.id_personagem}
                      onIdChange={id => setEnvForm(f => ({ ...f, id_personagem: id }))}
                      compact
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={envForm.tipo} onValueChange={v => setEnvForm(f => ({ ...f, tipo: v }))}>
                        <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_ENVOLVIDO.map(t => <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="h-8 text-xs" value={envForm.observacoes} onChange={e => setEnvForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Obs. (opcional)" />
                    </div>
                    <Button type="button" variant="outline" size="sm" className="w-full gap-1 text-xs" disabled={!envForm.nome.trim()} onClick={addEnvolvidoLocal}>
                      <Plus className="h-3 w-3" /> Adicionar Envolvido
                    </Button>
                  </div>
                )}

                <Button className="w-full" disabled={!form.data_hora || createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? "Agendando..." : "Agendar Audiência"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dialog detalhes completos da audiência */}
      <Dialog open={!!detailId} onOpenChange={o => { if (!o) { setDetailId(null); setShowAtaForm(false); setAtaText(""); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Audiência</DialogTitle>
          </DialogHeader>
          {(() => {
            const a = audiencias?.find((x: any) => x.id === detailId);
            if (!a) return null;
            return (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="text-sm font-medium text-foreground capitalize">{a.tipo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">{a.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Data e Hora</p>
                    <p className="text-sm font-medium text-foreground">{format(new Date(a.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Local</p>
                    <p className="text-sm font-medium text-foreground">{a.local || "Não definido"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Processo</p>
                  <p className="text-sm font-medium text-foreground">
                    {(a as any).processos?.numero
                      ? `${(a as any).processos.numero} — ${(a as any).processos.assunto}`
                      : "Sem vínculo a processo"}
                  </p>
                </div>
                {a.observacoes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm text-foreground">{a.observacoes}</p>
                  </div>
                )}

                {/* Ata da audiência (quando já realizada) */}
                {a.status === "realizada" && (a as any).ata && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Ata da Audiência</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3">{(a as any).ata}</p>
                  </div>
                )}

                {/* Botão para marcar como realizada — juiz do caso, admin ou oficial de justiça */}
                {a.status === "agendada" && canRealizarAudiencia && (
                  <div className="border-t pt-3 space-y-3">
                    {!showAtaForm ? (
                      <Button className="w-full" onClick={() => setShowAtaForm(true)}>
                        Marcar como Realizada
                      </Button>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label>Ata da Audiência</Label>
                          <Textarea
                            value={ataText}
                            onChange={e => setAtaText(e.target.value)}
                            rows={6}
                            placeholder="Registre aqui o conteúdo da ata da audiência..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => { setShowAtaForm(false); setAtaText(""); }}>
                            Cancelar
                          </Button>
                          <Button className="flex-1" disabled={realizarMutation.isPending} onClick={() => realizarMutation.mutate()}>
                            {realizarMutation.isPending ? "Salvando..." : "Confirmar Realização"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Envolvidos (audiências sem processo) */}
                {!a.processo_id && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <UserPlus className="h-3.5 w-3.5" /> Envolvidos
                    </p>
                    {detailEnvolvidos && detailEnvolvidos.length > 0 ? (
                      <div className="space-y-1.5">
                        {detailEnvolvidos.map((e: any) => (
                          <div key={e.id} className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                            <span className="font-medium text-foreground">{e.nome}</span>
                            {e.id_personagem && <span className="text-muted-foreground ml-1 text-xs">(ID: {e.id_personagem})</span>}
                            <span className="text-xs text-muted-foreground ml-2 capitalize">— {e.tipo}</span>
                            {e.observacoes && <p className="text-xs text-muted-foreground italic">{e.observacoes}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">Nenhum envolvido registrado.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {!audiencias?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p>Nenhuma audiência agendada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audiencias.map((a: any, i: number) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border shadow-institutional cursor-pointer hover:border-institutional/40 transition-colors"
              onClick={() => setDetailId(a.id)}
            >
              <div className="flex items-center gap-3">
                <div className="bg-institutional/10 rounded-lg p-2">
                  <Calendar className="h-5 w-5 text-institutional" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(a.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.tipo} — {a.local}
                    {a.processos?.numero ? ` — Processo: ${a.processos.numero}` : " — Sem processo vinculado"}
                  </p>
                  {a.observacoes && <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{a.observacoes}</p>}
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark ml-auto shrink-0">
                  {a.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

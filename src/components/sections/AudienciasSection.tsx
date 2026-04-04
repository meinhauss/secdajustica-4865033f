import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Plus, UserPlus, Trash2 } from "lucide-react";
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
import PersonLookupInput from "@/components/PersonLookupInput";

const TIPOS_AUDIENCIA = [
  "instrução",
  "conciliação",
  "julgamento",
  "custódia",
  "justificação",
  "admonitória",
];

const TIPOS_ENVOLVIDO = [
  "participante",
  "testemunha",
  "perito",
  "outro",
];

export default function AudienciasSection() {
  const { roles, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [envolvidosDialogId, setEnvolvidosDialogId] = useState<string | null>(null);

  const isMagistrado = roles.some(r => ["magistrado", "desembargador", "presidente_tribunal", "admin"].includes(r));

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

  const { data: envolvidos } = useQuery({
    queryKey: ["envolvidos-audiencia", envolvidosDialogId],
    queryFn: async () => {
      if (!envolvidosDialogId) return [];
      const { data, error } = await supabase
        .from("envolvidos_audiencia")
        .select("*")
        .eq("audiencia_id", envolvidosDialogId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!envolvidosDialogId,
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

  const [envForm, setEnvForm] = useState({ nome: "", tipo: "participante", id_personagem: "", observacoes: "" });

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
      const { error } = await supabase.from("audiencias").insert(payload);
      if (error) throw error;

      if (form.processo_id) {
        const { data: proc } = await supabase
          .from("processos")
          .select("numero, advogado_autor_id, advogado_reu_id, juiz_id")
          .eq("id", form.processo_id)
          .single();

        const { data: interessados } = await supabase
          .from("interessados_processo")
          .select("user_id")
          .eq("processo_id", form.processo_id);

        const dataFormatada = format(new Date(form.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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
        if (notifs.length > 0) {
          await supabase.from("notificacoes").insert(notifs);
        }
      }
    },
    onSuccess: () => {
      toast.success("Audiência agendada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["audiencias"] });
      setOpen(false);
      setForm({ tipo: "instrução", data_hora: "", local: "Sala de Audiências 1", processo_id: "", observacoes: "" });
    },
    onError: (e: any) => toast.error("Erro ao agendar: " + e.message),
  });

  const addEnvolvidoMutation = useMutation({
    mutationFn: async () => {
      if (!envolvidosDialogId || !envForm.nome.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("envolvidos_audiencia").insert({
        audiencia_id: envolvidosDialogId,
        nome: envForm.nome.trim(),
        tipo: envForm.tipo,
        id_personagem: envForm.id_personagem || null,
        observacoes: envForm.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Envolvido adicionado!");
      queryClient.invalidateQueries({ queryKey: ["envolvidos-audiencia", envolvidosDialogId] });
      setEnvForm({ nome: "", tipo: "participante", id_personagem: "", observacoes: "" });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const removeEnvolvidoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("envolvidos_audiencia").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Envolvido removido!");
      queryClient.invalidateQueries({ queryKey: ["envolvidos-audiencia", envolvidosDialogId] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const audienciaEnvolvidos = envolvidosDialogId ? audiencias?.find((a: any) => a.id === envolvidosDialogId) : null;
  const isAudienciaSemProcesso = audienciaEnvolvidos && !audienciaEnvolvidos.processo_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Audiências</h2>
          <p className="text-sm text-muted-foreground">Pauta de audiências da Comarca</p>
        </div>
        {isMagistrado && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Agendar Audiência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
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
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero} — {p.assunto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} placeholder="Informações adicionais..." />
                </div>

                <Button className="w-full" disabled={!form.data_hora || createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? "Agendando..." : "Agendar Audiência"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dialog de envolvidos */}
      <Dialog open={!!envolvidosDialogId} onOpenChange={o => { if (!o) setEnvolvidosDialogId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Envolvidos na Audiência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Lista de envolvidos */}
            {envolvidos && envolvidos.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {envolvidos.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{e.nome}</span>
                      {e.id_personagem && <span className="text-muted-foreground ml-1">(ID: {e.id_personagem})</span>}
                      <span className="text-xs text-muted-foreground ml-2 capitalize">— {e.tipo}</span>
                      {e.observacoes && <p className="text-xs text-muted-foreground italic">{e.observacoes}</p>}
                    </div>
                    {isMagistrado && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEnvolvidoMutation.mutate(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum envolvido adicionado.</p>
            )}

            {/* Form para adicionar */}
            {isMagistrado && (
              <div className="border-t pt-3 space-y-3">
                <p className="text-sm font-medium text-foreground">Adicionar envolvido</p>
                <PersonLookupInput
                  label="Nome"
                  value={envForm.nome}
                  onChange={nome => setEnvForm(f => ({ ...f, nome }))}
                  onPersonFound={p => setEnvForm(f => ({ ...f, nome: p.nome_completo, id_personagem: p.id_personagem || "" }))}
                  idValue={envForm.id_personagem}
                  onIdChange={id => setEnvForm(f => ({ ...f, id_personagem: id }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={envForm.tipo} onValueChange={v => setEnvForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_ENVOLVIDO.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Observações</Label>
                    <Input value={envForm.observacoes} onChange={e => setEnvForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Opcional" />
                  </div>
                </div>
                <Button size="sm" className="w-full gap-2" disabled={!envForm.nome.trim() || addEnvolvidoMutation.isPending} onClick={() => addEnvolvidoMutation.mutate()}>
                  <UserPlus className="h-4 w-4" /> {addEnvolvidoMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            )}
          </div>
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
              className="bg-card rounded-xl p-4 border border-border shadow-institutional"
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
                  {a.observacoes && <p className="text-xs text-muted-foreground mt-0.5 italic">{a.observacoes}</p>}
                </div>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {!a.processo_id && isMagistrado && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setEnvolvidosDialogId(a.id)}>
                      <UserPlus className="h-3.5 w-3.5" /> Envolvidos
                    </Button>
                  )}
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">
                    {a.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

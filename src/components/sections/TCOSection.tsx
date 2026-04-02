import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, ArrowLeft, Trash2, Send, Eye, Search } from "lucide-react";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  elaborado: "Elaborado",
  finalizado: "Finalizado",
  encaminhado_jecrim: "Encaminhado ao JECrim",
};

const STATUS_COLORS: Record<string, string> = {
  elaborado: "bg-amber-500/20 text-amber-700",
  finalizado: "bg-green-500/20 text-green-700",
  encaminhado_jecrim: "bg-blue-500/20 text-blue-700",
};

const NATUREZAS: { label: string; tipificacao: string }[] = [
  { label: "Lesão Corporal Leve", tipificacao: "Art. 129, caput, do Código Penal" },
  { label: "Ameaça", tipificacao: "Art. 147 do Código Penal" },
  { label: "Injúria", tipificacao: "Art. 140 do Código Penal" },
  { label: "Calúnia", tipificacao: "Art. 138 do Código Penal" },
  { label: "Difamação", tipificacao: "Art. 139 do Código Penal" },
  { label: "Perturbação do Sossego", tipificacao: "Art. 42, III, da Lei de Contravenções Penais" },
  { label: "Vias de Fato", tipificacao: "Art. 21 da Lei de Contravenções Penais" },
  { label: "Desacato", tipificacao: "Art. 331 do Código Penal" },
  { label: "Dano Simples", tipificacao: "Art. 163, caput, do Código Penal" },
  { label: "Desobediência", tipificacao: "Art. 330 do Código Penal" },
  { label: "Contravenção Penal", tipificacao: "Lei de Contravenções Penais (Dec.-Lei 3.688/41)" },
];

interface Envolvido {
  id?: string;
  nome: string;
  tipo: string;
  id_personagem: string;
  qualificacao: string;
  observacoes: string;
}

const emptyEnvolvido = (): Envolvido => ({
  nome: "",
  tipo: "autor_fato",
  id_personagem: "",
  qualificacao: "",
  observacoes: "",
});

export default function TCOSection() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedTco, setSelectedTco] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [natureza, setNatureza] = useState("");
  const [tipificacao, setTipificacao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataFato, setDataFato] = useState("");
  const [localFato, setLocalFato] = useState("");
  const [compromisso, setCompromisso] = useState(false);
  const [links, setLinks] = useState<string[]>([""]);
  const [envolvidos, setEnvolvidos] = useState<Envolvido[]>([
    { ...emptyEnvolvido(), tipo: "autor_fato" },
    { ...emptyEnvolvido(), tipo: "vitima" },
  ]);

  const { data: tcos, isLoading } = useQuery({
    queryKey: ["tcos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tcos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tcoDetail } = useQuery({
    queryKey: ["tco-detail", selectedTco],
    queryFn: async () => {
      const [{ data: tco }, { data: envs }] = await Promise.all([
        supabase.from("tcos").select("*").eq("id", selectedTco!).single(),
        supabase.from("envolvidos_tco").select("*").eq("tco_id", selectedTco!).order("tipo"),
      ]);
      return { ...tco, envolvidos: envs || [] };
    },
    enabled: !!selectedTco && view === "detail",
  });

  const criarTco = useMutation({
    mutationFn: async () => {
      const validEnvolvidos = envolvidos.filter((e) => e.nome.trim());
      if (!natureza || !descricao.trim()) throw new Error("Preencha os campos obrigatórios");
      if (validEnvolvidos.length === 0) throw new Error("Adicione pelo menos um envolvido");

      const validLinks = links.filter((l) => l.trim());

      const { data: tco, error } = await supabase
        .from("tcos")
        .insert({
          autor_policial_id: user!.id,
          autor_policial_nome: profile?.nome_completo || "Policial",
          natureza_infracao: natureza,
          tipificacao_penal: tipificacao,
          descricao_fatos: descricao,
          data_fato: dataFato || null,
          local_fato: localFato || null,
          compromisso_jecrim: compromisso,
          data_compromisso: null,
          local_compromisso: null,
          links: validLinks,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (validEnvolvidos.length > 0) {
        const { error: envErr } = await supabase.from("envolvidos_tco").insert(
          validEnvolvidos.map((e) => ({
            tco_id: tco.id,
            nome: e.nome,
            tipo: e.tipo,
            id_personagem: e.id_personagem || null,
            qualificacao: e.qualificacao || null,
            observacoes: e.observacoes || null,
          })) as any
        );
        if (envErr) throw envErr;
      }

      return tco;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tcos"] });
      toast.success("TCO registrado com sucesso");
      resetForm();
      setView("list");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const encaminharJecrim = useMutation({
    mutationFn: async (tcoId: string) => {
      const { data: tco } = await supabase.from("tcos").select("*").eq("id", tcoId).single();
      if (!tco) throw new Error("TCO não encontrado");

      const { data: envs } = await supabase.from("envolvidos_tco").select("*").eq("tco_id", tcoId);
      const autores = (envs || []).filter((e: any) => e.tipo === "autor_fato");
      const vitimas = (envs || []).filter((e: any) => e.tipo === "vitima");

      const autorNome = autores.map((a: any) => a.nome).join(", ") || "Autor desconhecido";
      const reuNome = vitimas.map((v: any) => v.nome).join(", ") || autorNome;
      const vitimaComoAutor = vitimas.length > 0 ? vitimas.map((v: any) => v.nome).join(", ") : "Ministério Público";

      const { data: juizData } = await supabase.rpc("sortear_magistrado");

      const { data: processo, error: procErr } = await supabase
        .from("processos")
        .insert({
          autor_nome: vitimaComoAutor,
          reu_nome: autorNome,
          assunto: `TCO - ${(tco as any).natureza_infracao}`,
          descricao: (tco as any).descricao_fatos,
          classe: "criminal" as any,
          juiz_id: juizData || null,
          sigilo: "publico",
        } as any)
        .select()
        .single();

      if (procErr) throw procErr;

      await supabase.from("movimentacoes").insert({
        processo_id: processo.id,
        tipo: "distribuicao",
        descricao: `Processo originado de TCO ${(tco as any).numero}. Natureza: ${(tco as any).natureza_infracao}. Tipificação: ${(tco as any).tipificacao_penal || "Não especificada"}.`,
        autor_id: user!.id,
      });

      await supabase
        .from("tcos")
        .update({ status: "encaminhado_jecrim", processo_id: processo.id } as any)
        .eq("id", tcoId);

      return processo;
    },
    onSuccess: (proc) => {
      queryClient.invalidateQueries({ queryKey: ["tcos"] });
      queryClient.invalidateQueries({ queryKey: ["tco-detail"] });
      toast.success(`TCO encaminhado ao JECrim — Processo ${(proc as any).numero}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const finalizarTco = useMutation({
    mutationFn: async (tcoId: string) => {
      await supabase.from("tcos").update({ status: "finalizado" } as any).eq("id", tcoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tcos"] });
      queryClient.invalidateQueries({ queryKey: ["tco-detail"] });
      toast.success("TCO finalizado");
    },
  });

  const resetForm = () => {
    setNatureza("");
    setTipificacao("");
    setDescricao("");
    setDataFato("");
    setLocalFato("");
    setCompromisso(false);
    setLinks([""]);
    setEnvolvidos([
      { ...emptyEnvolvido(), tipo: "autor_fato" },
      { ...emptyEnvolvido(), tipo: "vitima" },
    ]);
  };

  const addEnvolvido = () => setEnvolvidos([...envolvidos, emptyEnvolvido()]);
  const removeEnvolvido = (i: number) => setEnvolvidos(envolvidos.filter((_, idx) => idx !== i));
  const updateEnvolvido = (i: number, field: keyof Envolvido, value: string) => {
    const updated = [...envolvidos];
    updated[i] = { ...updated[i], [field]: value };
    setEnvolvidos(updated);
  };

  const filteredTcos = (tcos || []).filter(
    (t: any) =>
      t.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.natureza_infracao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.autor_policial_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // DETAIL VIEW
  if (view === "detail" && tcoDetail) {
    const t = tcoDetail as any;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedTco(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h2 className="font-display text-2xl font-bold text-foreground">{t.numero}</h2>
          <Badge className={STATUS_COLORS[t.status]}>{STATUS_LABELS[t.status] || t.status}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional space-y-4">
            <h3 className="font-display font-semibold text-lg">Informações do TCO</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Natureza</p><p className="font-medium">{t.natureza_infracao}</p></div>
              <div><p className="text-muted-foreground">Tipificação</p><p className="font-medium">{t.tipificacao_penal || "—"}</p></div>
              <div><p className="text-muted-foreground">Data do Fato</p><p className="font-medium">{t.data_fato ? format(new Date(t.data_fato), "dd/MM/yyyy HH:mm") : "—"}</p></div>
              <div><p className="text-muted-foreground">Local</p><p className="font-medium">{t.local_fato || "—"}</p></div>
              <div><p className="text-muted-foreground">Policial</p><p className="font-medium">{t.autor_policial_nome}</p></div>
              <div><p className="text-muted-foreground">Registrado em</p><p className="font-medium">{format(new Date(t.created_at), "dd/MM/yyyy HH:mm")}</p></div>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Descrição dos Fatos</p>
              <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{t.descricao_fatos}</p>
            </div>
            {t.compromisso_jecrim && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="font-semibold text-blue-700">Compromisso de comparecimento ao JECrim registrado</p>
                <p className="text-xs text-muted-foreground">A audiência será agendada pelo juiz.</p>
              </div>
            )}
            {Array.isArray(t.links) && t.links.length > 0 && (
              <div>
                <p className="text-muted-foreground text-sm mb-1">Anexos / Links</p>
                <ul className="space-y-1">
                  {t.links.map((link: string, i: number) => (
                    <li key={i}><a href={link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">{link}</a></li>
                  ))}
                </ul>
              </div>
            )}
            {t.processo_id && (
              <div className="bg-institutional/5 border border-institutional/20 rounded-lg p-3">
                <p className="text-sm font-medium">Processo vinculado: <span className="font-mono text-institutional">{t.processo_id.slice(0, 8)}...</span></p>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional space-y-4">
            <h3 className="font-display font-semibold text-lg">Envolvidos</h3>
            {(t.envolvidos || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum envolvido registrado.</p>
            ) : (
              <div className="space-y-3">
                {t.envolvidos.map((e: any) => (
                  <div key={e.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{e.nome}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {e.tipo === "autor_fato" ? "Autor do Fato" : e.tipo === "vitima" ? "Vítima" : "Testemunha"}
                      </Badge>
                      {e.id_personagem && <Badge variant="secondary" className="text-[10px]">ID {e.id_personagem}</Badge>}
                    </div>
                    {e.qualificacao && <p className="text-xs text-muted-foreground">{e.qualificacao}</p>}
                    {e.observacoes && <p className="text-xs text-muted-foreground italic">{e.observacoes}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {t.status === "elaborado" && (
              <div className="pt-4 border-t border-border space-y-2">
                <Button className="w-full rounded-xl" onClick={() => finalizarTco.mutate(t.id)} disabled={finalizarTco.isPending}>
                  Finalizar TCO
                </Button>
              </div>
            )}
            {t.status === "finalizado" && (
              <div className="pt-4 border-t border-border">
                <Button className="w-full rounded-xl" variant="default" onClick={() => encaminharJecrim.mutate(t.id)} disabled={encaminharJecrim.isPending}>
                  <Send className="h-4 w-4 mr-2" /> Encaminhar ao JECrim
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // NEW TCO FORM
  if (view === "new") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView("list"); resetForm(); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h2 className="font-display text-2xl font-bold text-foreground">Novo TCO</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Facts */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional space-y-4">
            <h3 className="font-display font-semibold">Dados da Ocorrência</h3>

            <div>
              <label className="text-sm font-medium">Natureza da Infração *</label>
              <Select value={natureza} onValueChange={(v) => {
                setNatureza(v);
                const found = NATUREZAS.find((n) => n.label === v);
                if (found) setTipificacao(found.tipificacao);
              }}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {NATUREZAS.map((n) => <SelectItem key={n.label} value={n.label}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tipificação Penal</label>
              <Input value={tipificacao} onChange={(e) => setTipificacao(e.target.value)} placeholder="Preenchido automaticamente" className="rounded-xl mt-1" readOnly />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data/Hora do Fato</label>
                <Input type="datetime-local" value={dataFato} onChange={(e) => setDataFato(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Local do Fato</label>
                <Input value={localFato} onChange={(e) => setLocalFato(e.target.value)} placeholder="Endereço..." className="rounded-xl mt-1" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição dos Fatos *</label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} placeholder="Relato circunstanciado dos fatos..." className="rounded-xl mt-1" />
            </div>

            {/* Compromisso JECrim */}
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={compromisso} onChange={(e) => setCompromisso(e.target.checked)} className="rounded" />
                <span className="text-sm font-medium">Compromisso de comparecimento ao JECrim</span>
              </label>
              {compromisso && (
                <p className="text-xs text-muted-foreground ml-6 mt-1">A data da audiência será agendada pelo juiz no decorrer do processo.</p>
              )}
            </div>

            {/* Links/Anexos */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Links / Anexos</label>
              {links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={link} onChange={(e) => { const u = [...links]; u[i] = e.target.value; setLinks(u); }} placeholder="https://..." className="rounded-xl" />
                  {links.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setLinks([...links, ""])} className="rounded-xl">
                <Plus className="h-3 w-3 mr-1" /> Adicionar Link
              </Button>
            </div>
          </motion.div>

          {/* Right: Envolvidos */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-6 border border-border shadow-institutional space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Envolvidos</h3>
              <Button variant="outline" size="sm" onClick={addEnvolvido} className="rounded-xl">
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {envolvidos.map((env, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-4 space-y-3 relative">
                  {envolvidos.length > 2 && (
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeEnvolvido(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Nome *</label>
                      <Input value={env.nome} onChange={(e) => updateEnvolvido(i, "nome", e.target.value)} className="rounded-xl mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Tipo</label>
                      <Select value={env.tipo} onValueChange={(v) => updateEnvolvido(i, "tipo", v)}>
                        <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="autor_fato">Autor do Fato</SelectItem>
                          <SelectItem value="vitima">Vítima</SelectItem>
                          <SelectItem value="testemunha">Testemunha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">ID Personagem</label>
                      <Input value={env.id_personagem} onChange={(e) => updateEnvolvido(i, "id_personagem", e.target.value)} className="rounded-xl mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Qualificação</label>
                      <Input value={env.qualificacao} onChange={(e) => updateEnvolvido(i, "qualificacao", e.target.value)} placeholder="RG, CPF..." className="rounded-xl mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Observações</label>
                    <Input value={env.observacoes} onChange={(e) => updateEnvolvido(i, "observacoes", e.target.value)} className="rounded-xl mt-1" />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border">
              <Button className="w-full rounded-xl" onClick={() => criarTco.mutate()} disabled={criarTco.isPending}>
                {criarTco.isPending ? "Registrando..." : "Registrar TCO"}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Termos Circunstanciados (TCO)</h2>
          <p className="text-sm text-muted-foreground">Registro de infrações de menor potencial ofensivo</p>
        </div>
        <Button onClick={() => setView("new")} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> Novo TCO
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, natureza ou policial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-institutional border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : filteredTcos.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Nenhum TCO registrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTcos.map((tco: any) => (
            <motion.div
              key={tco.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-xl p-4 border border-border shadow-institutional hover:border-institutional/30 transition-colors cursor-pointer"
              onClick={() => { setSelectedTco(tco.id); setView("detail"); }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-institutional" />
                  <div>
                    <p className="font-semibold text-foreground">{tco.numero}</p>
                    <p className="text-xs text-muted-foreground">{tco.natureza_infracao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{tco.autor_policial_nome}</p>
                    <p>{format(new Date(tco.created_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <Badge className={STATUS_COLORS[tco.status]}>{STATUS_LABELS[tco.status] || tco.status}</Badge>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

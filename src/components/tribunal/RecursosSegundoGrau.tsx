import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RichTextEditor, RichTextView } from "@/components/ui/rich-text-editor";
import { Gavel, Scroll } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_LABEL: Record<string, string> = {
  agravo_interno: "Agravo Interno",
  embargos_declaracao: "Embargos de Declaração",
};
const VICIO_LABEL: Record<string, string> = { omissao: "Omissão", contradicao: "Contradição", obscuridade: "Obscuridade", erro_material: "Erro material" };
const RESULTADOS: Record<string, { value: string; label: string }[]> = {
  agravo_interno: [
    { value: "provido", label: "Provido (reforma a decisão monocrática)" },
    { value: "parcialmente_provido", label: "Parcialmente provido" },
    { value: "desprovido", label: "Desprovido (mantém a decisão)" },
    { value: "nao_conhecido", label: "Não conhecido" },
  ],
  embargos_declaracao: [
    { value: "acolhidos", label: "Acolhidos" },
    { value: "acolhidos_parcialmente", label: "Acolhidos parcialmente" },
    { value: "rejeitados", label: "Rejeitados" },
    { value: "nao_conhecidos", label: "Não conhecidos" },
  ],
};
const resultadoLabel = (tipo: string, r?: string | null) => RESULTADOS[tipo]?.find((x) => x.value === r)?.label.split(" (")[0] || r || "";
const vazio = (h: string) => !h || h.replace(/<[^>]+>/g, "").trim() === "";

export default function RecursosSegundoGrau({ processoId, apelacaoId, relatorId }: { processoId: string; apelacaoId?: string | null; relatorId?: string | null }) {
  const { user, profile, roles } = useAuth();
  const qc = useQueryClient();
  const podeJulgar = roles.some((r) => ["desembargador", "presidente_tribunal", "admin"].includes(r));
  const key = ["recursos-2g", processoId, apelacaoId || null];

  const { data: recursos } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = (supabase as any).from("recursos_segundo_grau").select("*").eq("processo_id", processoId).order("created_at", { ascending: false });
      if (apelacaoId) q = q.eq("apelacao_id", apelacaoId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: "agravo_interno", decisao_impugnada: "", vicio: "omissao", peca: "" });

  const notificar = async (ids: (string | null | undefined)[], titulo: string, mensagem: string) => {
    const uniq = Array.from(new Set(ids.filter(Boolean))) as string[];
    if (uniq.length) await supabase.from("notificacoes").insert(uniq.map((u) => ({ user_id: u, titulo, mensagem, tipo: "processo", link_secao: "tribunal" })));
  };

  const interpor = useMutation({
    mutationFn: async () => {
      if (!form.decisao_impugnada.trim()) throw new Error("Identifique a decisão impugnada.");
      if (vazio(form.peca)) throw new Error("Redija a peça do recurso.");
      const { error } = await (supabase as any).from("recursos_segundo_grau").insert({
        processo_id: processoId, apelacao_id: apelacaoId || null, tipo: form.tipo,
        decisao_impugnada: form.decisao_impugnada.trim(),
        vicio: form.tipo === "embargos_declaracao" ? form.vicio : null,
        peca: form.peca, recorrente_id: user!.id, recorrente_nome: profile?.nome_completo || "Recorrente",
      });
      if (error) throw error;
      const extra = form.tipo === "embargos_declaracao" ? ` — vício: ${VICIO_LABEL[form.vicio]}` : "";
      await supabase.from("movimentacoes").insert({
        processo_id: processoId, tipo: form.tipo, autor_id: user!.id,
        descricao: `${TIPO_LABEL[form.tipo].toUpperCase()} interposto(s) por ${profile?.nome_completo || ""} contra: ${form.decisao_impugnada.trim()}${extra}.`,
      });
      let alvo: string[] = relatorId ? [relatorId] : [];
      if (!alvo.length) {
        const { data } = await supabase.from("user_roles").select("user_id").in("role", ["desembargador", "presidente_tribunal"] as any);
        alvo = (data || []).map((d: any) => d.user_id);
      }
      await notificar(alvo, `${TIPO_LABEL[form.tipo]} interposto`, `Novo recurso no Tribunal contra: ${form.decisao_impugnada.trim()}`);
    },
    onSuccess: () => {
      toast.success("Recurso interposto!");
      setOpen(false);
      setForm({ tipo: "agravo_interno", decisao_impugnada: "", vicio: "omissao", peca: "" });
      qc.invalidateQueries({ queryKey: ["recursos-2g"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [julgando, setJulgando] = useState<any>(null);
  const [jForm, setJForm] = useState({ resultado: "", decisao: "" });
  const julgar = useMutation({
    mutationFn: async () => {
      if (!jForm.resultado) throw new Error("Selecione o resultado.");
      if (vazio(jForm.decisao)) throw new Error("Fundamente a decisão.");
      const { error } = await (supabase as any).from("recursos_segundo_grau").update({
        status: "julgado", resultado: jForm.resultado, decisao: jForm.decisao,
        decidido_por: user!.id, decidido_por_nome: profile?.nome_completo || "", decidido_em: new Date().toISOString(),
      }).eq("id", julgando.id);
      if (error) throw error;
      const orgao = julgando.tipo === "agravo_interno" ? "pelo órgão colegiado" : "pelo(a) Relator(a)";
      await supabase.from("movimentacoes").insert({
        processo_id: processoId, tipo: `decisao_${julgando.tipo}`, autor_id: user!.id,
        descricao: `${TIPO_LABEL[julgando.tipo].toUpperCase()} julgado(s) ${orgao} — ${resultadoLabel(julgando.tipo, jForm.resultado).toUpperCase()}. Decisão proferida por ${profile?.nome_completo || ""}.`,
      });
      await notificar([julgando.recorrente_id], `${TIPO_LABEL[julgando.tipo]} julgado`, `Resultado: ${resultadoLabel(julgando.tipo, jForm.resultado)}`);
    },
    onSuccess: () => {
      toast.success("Decisão registrada!");
      setJulgando(null); setJForm({ resultado: "", decisao: "" });
      qc.invalidateQueries({ queryKey: ["recursos-2g"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-institutional space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2"><Scroll className="h-5 w-5 text-institutional" /> Recursos no Tribunal</h3>
          <p className="text-xs text-muted-foreground">Agravo Interno contra decisão monocrática e Embargos de Declaração contra decisão ou acórdão.</p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>Interpor recurso</Button>
      </div>

      {!recursos?.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum recurso interposto no Tribunal.</p>
      ) : (
        <div className="space-y-3">
          {recursos.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{TIPO_LABEL[r.tipo] || r.tipo}</span>
                {r.vicio && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{VICIO_LABEL[r.vicio] || r.vicio}</span>}
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${r.status === "julgado" ? "bg-institutional/10 text-institutional" : "bg-gold/10 text-gold-dark"}`}>
                  {r.status === "julgado" ? resultadoLabel(r.tipo, r.resultado) : "Aguardando julgamento"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Por {r.recorrente_nome} em {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} — contra: <span className="text-foreground">{r.decisao_impugnada}</span>
              </p>
              <details className="text-sm"><summary className="cursor-pointer text-xs text-institutional">Ver peça</summary><div className="mt-2"><RichTextView html={r.peca} /></div></details>
              {r.status === "julgado" ? (
                <div className="border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">Decidido por {r.decidido_por_nome}{r.decidido_em && ` em ${format(new Date(r.decidido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}</p>
                  <div className="text-sm mt-1"><RichTextView html={r.decisao} /></div>
                </div>
              ) : podeJulgar && (
                <Button size="sm" className="rounded-lg bg-institutional hover:bg-institutional-light text-gold-light" onClick={() => { setJulgando(r); setJForm({ resultado: "", decisao: "" }); }}>
                  <Gavel className="h-3.5 w-3.5 mr-1" /> Julgar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Interpor recurso no Tribunal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agravo_interno">Agravo Interno (contra decisão monocrática do relator)</SelectItem>
                <SelectItem value="embargos_declaracao">Embargos de Declaração</SelectItem>
              </SelectContent>
            </Select>
            <Input className="rounded-xl" placeholder="Decisão impugnada (ex.: decisão monocrática de 10/11 que inadmitiu a apelação)" value={form.decisao_impugnada} onChange={(e) => setForm({ ...form, decisao_impugnada: e.target.value })} />
            {form.tipo === "embargos_declaracao" && (
              <Select value={form.vicio} onValueChange={(v) => setForm({ ...form, vicio: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VICIO_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              {form.tipo === "agravo_interno"
                ? "O agravo interno leva a decisão monocrática ao órgão colegiado. Impugne especificamente os fundamentos da decisão."
                : "Aponte o ponto omisso, contraditório, obscuro ou o erro material e formule o pedido de saneamento."}
            </p>
            <RichTextEditor value={form.peca} onChange={(h) => setForm({ ...form, peca: h })} placeholder="Peça integral: fatos, fundamentos e pedidos..." minHeight="240px" />
            <Button className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light" disabled={interpor.isPending} onClick={() => interpor.mutate()}>
              {interpor.isPending ? "Enviando..." : "Interpor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!julgando} onOpenChange={(o) => !o && setJulgando(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Julgar {julgando && TIPO_LABEL[julgando.tipo]}</DialogTitle></DialogHeader>
          {julgando && (
            <div className="space-y-3">
              <Select value={jForm.resultado} onValueChange={(v) => setJForm({ ...jForm, resultado: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Resultado" /></SelectTrigger>
                <SelectContent>
                  {RESULTADOS[julgando.tipo]?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <RichTextEditor value={jForm.decisao} onChange={(h) => setJForm({ ...jForm, decisao: h })} placeholder="Fundamentação e dispositivo..." minHeight="220px" />
              <Button className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light" disabled={julgar.isPending} onClick={() => julgar.mutate()}>
                {julgar.isPending ? "Registrando..." : "Registrar decisão"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

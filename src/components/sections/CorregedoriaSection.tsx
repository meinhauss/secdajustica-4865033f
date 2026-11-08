import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldAlert, Loader2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";

const ORGAOS: Record<string, string> = { tj: "Tribunal de Justiça", mp: "Ministério Público", dp: "Defensoria Pública", oab: "OAB" };
const STATUS: Record<string, string> = { nova: "Nova", em_apuracao: "Em apuração", arquivada: "Arquivada", concluida: "Concluída" };
type Acao = "aceitar" | "arquivar" | "concluir" | "remeter_mp";
const ACOES: Record<Acao, { titulo: string; label: string }> = {
  aceitar: { titulo: "Aceitar e instaurar apuração", label: "Motivo da instauração" },
  arquivar: { titulo: "Arquivar representação", label: "Fundamentação do arquivamento (será publicada no DJEM)" },
  concluir: { titulo: "Concluir apuração", label: "Decisão final (será publicada no DJEM)" },
  remeter_mp: { titulo: "Remeter ao Ministério Público", label: "Indícios de crime a avaliar" },
};

export default function CorregedoriaSection() {
  const qc = useQueryClient();
  const [aba, setAba] = useState("ativas");
  const [dialogo, setDialogo] = useState<{ d: any; acao: Acao } | null>(null);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["corregedoria"],
    queryFn: async () => {
      const { data, error } = await supabase.from("denuncias_ouvidoria" as any).select("*").eq("contra_membro", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const lista = data.filter((d) => (aba === "ativas" ? ["nova", "em_apuracao"].includes(d.corregedoria_status) : !["nova", "em_apuracao"].includes(d.corregedoria_status)));

  const confirmar = async () => {
    if (!dialogo) return;
    if (texto.trim().length < 10) return toast.error("Escreva a fundamentação (mínimo 10 caracteres).");
    setSalvando(true);
    const { d, acao } = dialogo;
    const { error } = await (supabase.rpc as any)("decidir_corregedoria", { _id: d.id, _acao: acao, _texto: texto.trim() });
    if (error) { setSalvando(false); return toast.error(error.message); }
    if (acao === "arquivar" || acao === "concluir") {
      const { error: e2 } = await supabase.functions.invoke("discord-djem-publicar", {
        body: {
          titulo: `Corregedoria (${ORGAOS[d.orgao_corregedoria] || ""}) — ${acao === "arquivar" ? "Extrato de arquivamento" : "Decisão final"} de representação disciplinar`,
          texto: `**Representado:** ${d.denunciado_nome}\n**Protocolo:** ${String(d.id).slice(0, 8).toUpperCase()}\n\n${texto.trim()}`,
          marcar_cargo: false,
        },
      });
      if (e2) toast.warning("Decisão registrada, mas a publicação no DJEM falhou.");
    }
    toast.success("Decisão registrada.");
    setSalvando(false); setDialogo(null); setTexto("");
    qc.invalidateQueries({ queryKey: ["corregedoria"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" /> Corregedoria</h2>
        <p className="text-sm text-muted-foreground">Representações da Ouvidoria contra membros do seu órgão.</p>
      </div>
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="ativas">Pendentes ({data.filter((d) => ["nova", "em_apuracao"].includes(d.corregedoria_status)).length})</TabsTrigger>
          <TabsTrigger value="encerradas">Encerradas</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma representação.</p>
      ) : lista.map((d) => (
        <Card key={d.id}>
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{d.denunciado_nome}</span>
              <span className="text-xs text-muted-foreground">{(d.denunciado_cargos || []).map((c: string) => ROLE_LABELS[c as keyof typeof ROLE_LABELS] || c).join(" / ")}</span>
              <Badge variant="outline">{ORGAOS[d.orgao_corregedoria]}</Badge>
              <Badge>{STATUS[d.corregedoria_status] || d.corregedoria_status}</Badge>
              {d.encaminhada_mp && <Badge variant="destructive">Enviada ao MP</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">Protocolo {String(d.id).slice(0, 8).toUpperCase()} • {new Date(d.created_at).toLocaleString("pt-BR")} • Denunciante: {d.nome_denunciante || "Anônimo"}</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{d.descricao}</p>
            {d.corregedoria_motivo && <p className="text-xs text-muted-foreground whitespace-pre-wrap"><b>Apuração:</b> {d.corregedoria_motivo}</p>}
            {d.corregedoria_decisao && <p className="text-xs text-muted-foreground whitespace-pre-wrap"><b>Decisão:</b> {d.corregedoria_decisao}</p>}
            <div className="flex flex-wrap gap-2">
              {d.corregedoria_status === "nova" && <Button size="sm" onClick={() => setDialogo({ d, acao: "aceitar" })}>Aceitar</Button>}
              {d.corregedoria_status === "em_apuracao" && <Button size="sm" onClick={() => setDialogo({ d, acao: "concluir" })}>Concluir</Button>}
              {["nova", "em_apuracao"].includes(d.corregedoria_status) && <Button size="sm" variant="outline" onClick={() => setDialogo({ d, acao: "arquivar" })}>Arquivar</Button>}
              {!d.encaminhada_mp && <Button size="sm" variant="secondary" onClick={() => setDialogo({ d, acao: "remeter_mp" })}>Remeter ao MP</Button>}
            </div>
          </CardContent>
        </Card>
      ))}
      <Dialog open={!!dialogo} onOpenChange={(o) => { if (!o) { setDialogo(null); setTexto(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogo && ACOES[dialogo.acao].titulo}</DialogTitle></DialogHeader>
          <label className="text-sm text-muted-foreground">{dialogo && ACOES[dialogo.acao].label}</label>
          <Textarea rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <DialogFooter><Button onClick={confirmar} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

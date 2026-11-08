import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldAlert, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";

const ORGAOS: Record<string, string> = { tj: "Tribunal de Justiça", mp: "Ministério Público", dp: "Defensoria Pública", oab: "OAB" };
const STATUS: Record<string, string> = {
  nova: "Nova", em_apuracao: "Em apuração", aguardando_defesa: "Aguardando defesa",
  defesa_apresentada: "Defesa apresentada", arquivada: "Arquivada", concluida: "Concluída",
};
const ATIVOS = ["nova", "em_apuracao", "aguardando_defesa", "defesa_apresentada"];
const TIPOS_MOV: Record<string, string> = {
  instauracao: "Instauração e intimação para defesa", intimacao: "Intimação para manifestação", despacho: "Despacho",
  defesa: "Defesa do representado", arquivamento: "Arquivamento", decisao: "Decisão final", remessa_mp: "Remessa ao MP",
};
type Acao = "aceitar" | "intimar_defesa" | "despacho" | "arquivar" | "concluir" | "remeter_mp";
const ACOES: Record<Acao, { titulo: string; label: string; prazo?: boolean }> = {
  aceitar: { titulo: "Instaurar procedimento", label: "Portaria / motivo da instauração (o representado será intimado para defesa)", prazo: true },
  intimar_defesa: { titulo: "Intimar o representado", label: "Objeto da intimação (ex.: manifestar-se sobre nova prova)", prazo: true },
  despacho: { titulo: "Novo despacho", label: "Conteúdo do despacho" },
  arquivar: { titulo: "Arquivar representação", label: "Fundamentação do arquivamento (será publicada no DJEM)" },
  concluir: { titulo: "Decisão final", label: "Decisão final, considerando a defesa (será publicada no DJEM)" },
  remeter_mp: { titulo: "Remeter ao Ministério Público", label: "Indícios de crime a avaliar" },
};

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "");

function Historico({ id }: { id: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["corregedoria-movs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("corregedoria_movimentacoes" as any).select("*").eq("denuncia_id", id).order("created_at");
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (!data.length) return <p className="text-xs text-muted-foreground">Sem movimentações.</p>;
  return (
    <ol className="space-y-2 border-l border-border pl-4">
      {data.map((m) => (
        <li key={m.id} className="text-sm">
          <p className="text-xs text-muted-foreground">{fmt(m.created_at)} • {m.autor_nome || "Sistema"}</p>
          <p className="font-medium text-foreground">{TIPOS_MOV[m.tipo] || m.tipo}</p>
          <p className="text-foreground/90 whitespace-pre-wrap">{m.texto}</p>
        </li>
      ))}
    </ol>
  );
}

export default function CorregedoriaSection() {
  const qc = useQueryClient();
  const [aba, setAba] = useState("ativas");
  const [dialogo, setDialogo] = useState<{ d: any; acao: Acao } | null>(null);
  const [defesa, setDefesa] = useState<any | null>(null);
  const [texto, setTexto] = useState("");
  const [prazo, setPrazo] = useState(5);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["corregedoria"],
    queryFn: async () => {
      const { data, error } = await supabase.from("denuncias_ouvidoria" as any).select("*").eq("contra_membro", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const { data: minhas = [] } = useQuery({
    queryKey: ["corregedoria-minhas"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("minhas_representacoes");
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const minhasIds = new Set(minhas.map((m) => m.id));
  const chefia = data.filter((d) => !minhasIds.has(d.id));
  const abaAtual = chefia.length === 0 && minhas.length > 0 && aba !== "minhas" ? "minhas" : aba;
  const lista = chefia.filter((d) => (abaAtual === "ativas" ? ATIVOS.includes(d.corregedoria_status) : !ATIVOS.includes(d.corregedoria_status)));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["corregedoria"] });
    qc.invalidateQueries({ queryKey: ["corregedoria-minhas"] });
    qc.invalidateQueries({ queryKey: ["corregedoria-movs"] });
  };
  const fechar = () => { setDialogo(null); setDefesa(null); setTexto(""); setPrazo(5); };

  const confirmar = async () => {
    if (!dialogo) return;
    if (texto.trim().length < 10) return toast.error("Escreva a fundamentação (mínimo 10 caracteres).");
    setSalvando(true);
    const { d, acao } = dialogo;
    const { error } = await (supabase.rpc as any)("decidir_corregedoria", { _id: d.id, _acao: acao, _texto: texto.trim(), _prazo_dias: prazo });
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
    toast.success("Movimentação registrada e responsáveis notificados.");
    setSalvando(false); fechar(); refresh();
  };

  const enviarDefesa = async () => {
    if (texto.trim().length < 20) return toast.error("A defesa deve ter ao menos 20 caracteres.");
    setSalvando(true);
    const { error } = await (supabase.rpc as any)("apresentar_defesa_corregedoria", { _id: defesa.id, _texto: texto.trim() });
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Defesa protocolada.");
    fechar(); refresh();
  };

  const prazoInfo = (d: any) => d.corregedoria_status === "aguardando_defesa" && d.defesa_prazo && (
    <p className={`text-xs ${new Date(d.defesa_prazo) < new Date() ? "text-destructive" : "text-muted-foreground"}`}>
      Prazo de defesa: {fmt(d.defesa_prazo)}{new Date(d.defesa_prazo) < new Date() ? " (decorrido)" : ""}
    </p>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" /> Corregedoria</h2>
        <p className="text-sm text-muted-foreground">Procedimentos disciplinares com contraditório e ampla defesa.</p>
      </div>
      <Tabs value={abaAtual} onValueChange={setAba}>
        <TabsList className="flex-wrap h-auto">
          {chefia.length > 0 && <TabsTrigger value="ativas">Em andamento ({chefia.filter((d) => ATIVOS.includes(d.corregedoria_status)).length})</TabsTrigger>}
          {chefia.length > 0 && <TabsTrigger value="encerradas">Encerradas</TabsTrigger>}
          {minhas.length > 0 && <TabsTrigger value="minhas">Contra mim ({minhas.length})</TabsTrigger>}
        </TabsList>
      </Tabs>

      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : abaAtual === "minhas" ? (
        minhas.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">Protocolo {String(d.id).slice(0, 8).toUpperCase()}</span>
                <Badge variant="outline">{ORGAOS[d.orgao_corregedoria]}</Badge>
                <Badge>{STATUS[d.corregedoria_status] || d.corregedoria_status}</Badge>
              </div>
              {prazoInfo(d)}
              <div><p className="text-xs font-medium text-muted-foreground">Fatos imputados</p><p className="text-sm whitespace-pre-wrap">{d.descricao}</p></div>
              {d.defesa_texto && <p className="text-xs text-muted-foreground">Última defesa em {fmt(d.defesa_em)}</p>}
              <Button size="sm" variant="ghost" onClick={() => setAberto(aberto === d.id ? null : d.id)}>
                {aberto === d.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}Andamento
              </Button>
              {aberto === d.id && <Historico id={d.id} />}
              {["aguardando_defesa", "em_apuracao", "defesa_apresentada"].includes(d.corregedoria_status) && (
                <Button size="sm" onClick={() => setDefesa(d)}>{d.defesa_texto ? "Nova manifestação" : "Apresentar defesa"}</Button>
              )}
            </CardContent>
          </Card>
        ))
      ) : lista.length === 0 ? (
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
            <p className="text-xs text-muted-foreground">Protocolo {String(d.id).slice(0, 8).toUpperCase()} • {fmt(d.created_at)} • Denunciante: {d.nome_denunciante || "Anônimo"}</p>
            {prazoInfo(d)}
            <p className="text-sm text-foreground whitespace-pre-wrap">{d.descricao}</p>
            {d.defesa_texto && (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">Defesa do representado ({fmt(d.defesa_em)})</p>
                <p className="text-sm whitespace-pre-wrap">{d.defesa_texto}</p>
              </div>
            )}
            <Button size="sm" variant="ghost" onClick={() => setAberto(aberto === d.id ? null : d.id)}>
              {aberto === d.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}Histórico
            </Button>
            {aberto === d.id && <Historico id={d.id} />}
            <div className="flex flex-wrap gap-2">
              {d.corregedoria_status === "nova" && <Button size="sm" onClick={() => setDialogo({ d, acao: "aceitar" })}>Instaurar</Button>}
              {["em_apuracao", "defesa_apresentada"].includes(d.corregedoria_status) && <Button size="sm" variant="outline" onClick={() => setDialogo({ d, acao: "intimar_defesa" })}>Intimar representado</Button>}
              {["em_apuracao", "aguardando_defesa", "defesa_apresentada"].includes(d.corregedoria_status) && <Button size="sm" variant="outline" onClick={() => setDialogo({ d, acao: "despacho" })}>Despacho</Button>}
              {(["em_apuracao", "defesa_apresentada"].includes(d.corregedoria_status) || (d.corregedoria_status === "aguardando_defesa" && d.defesa_prazo && new Date(d.defesa_prazo) < new Date())) && (
                <Button size="sm" onClick={() => setDialogo({ d, acao: "concluir" })}>Decisão final</Button>
              )}
              {ATIVOS.includes(d.corregedoria_status) && <Button size="sm" variant="outline" onClick={() => setDialogo({ d, acao: "arquivar" })}>Arquivar</Button>}
              {!d.encaminhada_mp && <Button size="sm" variant="secondary" onClick={() => setDialogo({ d, acao: "remeter_mp" })}>Remeter ao MP</Button>}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!dialogo || !!defesa} onOpenChange={(o) => { if (!o) fechar(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{defesa ? "Apresentar defesa" : dialogo && ACOES[dialogo.acao].titulo}</DialogTitle></DialogHeader>
          <label className="text-sm text-muted-foreground">{defesa ? "Exponha seus argumentos e indique provas (links podem ser colados no texto)." : dialogo && ACOES[dialogo.acao].label}</label>
          <Textarea rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} />
          {dialogo && ACOES[dialogo.acao].prazo && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Prazo para defesa (dias):</span>
              <Input type="number" min={1} max={30} value={prazo} onChange={(e) => setPrazo(Number(e.target.value) || 5)} className="w-20" />
            </div>
          )}
          <DialogFooter>
            <Button onClick={defesa ? enviarDefesa : confirmar} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

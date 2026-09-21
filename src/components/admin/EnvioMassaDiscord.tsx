import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Megaphone, Search, Users, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Cargo = { id: string; name: string; color: number | null; position: number; managed: boolean };
type Alvo = { discord_id: string; nome: string; cadastrado: boolean };
type Falha = { discord_id: string; nome: string; motivo: string };
type PreviewRes = {
  total: number;
  amostra: Alvo[];
  sem_cadastro: number;
  dm_desativada: number;
  bots_ignorados: number;
  servidores: number;
  limitado: boolean;
};
type SendRes = {
  total: number;
  enviados: number;
  falhas: Falha[];
  pendentes: Alvo[];
  incomplete?: boolean;
  lote?: string;
};

const CATEGORIAS = [
  { valor: "aviso", rotulo: "📣 Comunicado oficial" },
  { valor: "intimacao", rotulo: "📩 Intimação" },
  { valor: "movimentacao", rotulo: "⚖️ Movimentação processual" },
  { valor: "prazo", rotulo: "⏰ Prazo" },
  { valor: "audiencia", rotulo: "🏛️ Audiência" },
  { valor: "cartorio", rotulo: "📜 Cartório" },
  { valor: "convocacao", rotulo: "🔔 Convocação" },
  { valor: "concurso", rotulo: "📝 Concurso público" },
];

function extrairMensagem(erro: any): string {
  return erro?.message || "Falha ao falar com o Discord";
}

async function chamarDiscord(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke("discord-broadcast", { body });
  if (error) {
    let mensagem = extrairMensagem(error);
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const json = await ctx.json();
        if (json?.error) mensagem = String(json.error);
      }
    } catch {
      /* mantém a mensagem original */
    }
    throw new Error(mensagem);
  }
  return data;
}

export function EnvioMassaDiscord() {
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [apenasCadastrados, setApenasCadastrados] = useState(true);
  const [titulo, setTitulo] = useState("Comunicado da Secretaria de Justiça e Cidadania");
  const [mensagem, setMensagem] = useState("");
  const [tipo, setTipo] = useState("aviso");
  const [linkSecao, setLinkSecao] = useState("");

  const [preview, setPreview] = useState<PreviewRes | null>(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<SendRes | null>(null);

  const { data: cargos, isLoading: carregandoCargos } = useQuery({
    queryKey: ["discord-cargos"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const d = await chamarDiscord({ action: "roles" });
      return (d?.cargos || []) as Cargo[];
    },
  });

  const listaCargos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const todos = cargos || [];
    return termo ? todos.filter((c) => c.name.toLowerCase().includes(termo)) : todos;
  }, [cargos, busca]);

  useEffect(() => {
    if (!enviando) return;
    const t = setInterval(() => setProgresso((p) => Math.min(p + 3, 92)), 400);
    return () => clearInterval(t);
  }, [enviando]);

  const alternar = (id: string) => {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    );
    setPreview(null);
    setResultado(null);
  };

  const gerarPreview = async () => {
    if (!selecionados.length) {
      toast.error("Selecione pelo menos um cargo");
      return;
    }
    setCarregandoPreview(true);
    setResultado(null);
    try {
      const d = (await chamarDiscord({
        action: "preview",
        role_ids: selecionados,
        apenas_cadastrados: apenasCadastrados,
      })) as PreviewRes;
      setPreview(d);
      if (!d.total) toast.warning("Nenhum destinatário encontrado com esses filtros");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao calcular destinatários");
    } finally {
      setCarregandoPreview(false);
    }
  };

  const enviar = async (ids?: string[]) => {
    if (!mensagem.trim()) {
      toast.error("Escreva a mensagem antes de enviar");
      return;
    }
    setEnviando(true);
    setProgresso(4);
    try {
      const d = (await chamarDiscord({
        action: "send",
        role_ids: selecionados,
        discord_ids: ids,
        apenas_cadastrados: apenasCadastrados,
        titulo,
        mensagem,
        tipo,
        link_secao: linkSecao || null,
      })) as SendRes;
      setResultado(d);
      setPreview(null);
      if (d.enviados > 0) toast.success(`${d.enviados} mensagem(ns) enviada(s)`);
      else if (d.falhas?.length) toast.error(`Nenhuma mensagem enviada — ${d.falhas.length} falha(s)`);
      else toast.warning("Nenhum destinatário para enviar");
    } catch (e: any) {
      toast.error(e?.message || "Falha no envio");
    } finally {
      setEnviando(false);
      setProgresso(100);
      setTimeout(() => setProgresso(0), 800);
    }
  };

  const nomesSelecionados = (cargos || [])
    .filter((c) => selecionados.includes(c.id))
    .map((c) => c.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-xl p-6 border border-border shadow-institutional"
    >
      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="h-5 w-5 text-institutional" />
        <h3 className="font-display text-lg font-semibold">Envio em massa no Discord</h3>
        <Badge variant="outline" className="ml-auto text-xs">
          DM individual por cargo do servidor
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Label>Cargos do servidor Discord</Label>
          <div className="relative mt-2">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cargo..."
              className="pl-9"
            />
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
            {carregandoCargos && (
              <p className="text-sm text-muted-foreground p-2">Carregando cargos...</p>
            )}
            {!carregandoCargos && !listaCargos.length && (
              <p className="text-sm text-muted-foreground p-2">
                Nenhum cargo encontrado. Recarregue a página para tentar novamente.
              </p>
            )}
            {listaCargos.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selecionados.includes(c.id)}
                  onCheckedChange={() => alternar(c.id)}
                />
                <span className="text-sm text-foreground">{c.name}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Switch
              id="apenas-cadastrados"
              checked={apenasCadastrados}
              onCheckedChange={(v) => {
                setApenasCadastrados(v);
                setPreview(null);
              }}
            />
            <Label htmlFor="apenas-cadastrados" className="text-sm font-normal cursor-pointer">
              Somente quem tem cadastro no sistema
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Quem desativou &quot;Receber DMs&quot; no próprio perfil nunca é incluído.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={250} />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea
              rows={6}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva o recado que será enviado no privado de cada pessoa."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.valor} value={c.valor}>
                      {c.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link da seção (opcional)</Label>
              <Input
                value={linkSecao}
                onChange={(e) => setLinkSecao(e.target.value)}
                placeholder="ex: meus-processos ou cartorio"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Formatos comuns: <code>meus-processos</code>, <code>cartorio</code>,{" "}
            <code>concursos</code>. O botão do Discord abre o sistema na seção indicada.
          </p>
        </div>
      </div>

      {nomesSelecionados.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {nomesSelecionados.map((n) => (
            <Badge key={n} variant="secondary" className="text-[10px]">
              {n}
            </Badge>
          ))}
        </div>
      )}

      {preview && (
        <div className="mt-4 border border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-institutional" />
            <p className="text-sm font-medium">
              {preview.total} pessoa(s) receberão esta mensagem
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {preview.amostra.map((a) => (
              <Badge
                key={a.discord_id}
                variant={a.cadastrado ? "outline" : "secondary"}
                className="text-[10px]"
              >
                {a.nome}
              </Badge>
            ))}
            {preview.total > preview.amostra.length && (
              <Badge variant="outline" className="text-[10px]">
                +{preview.total - preview.amostra.length}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            {preview.sem_cadastro > 0 && (
              <span>{preview.sem_cadastro} sem cadastro no sistema (fora do envio)</span>
            )}
            {preview.dm_desativada > 0 && (
              <span>{preview.dm_desativada} com DM desativada</span>
            )}
            {preview.bots_ignorados > 0 && <span>{preview.bots_ignorados} bots ignorados</span>}
            {preview.limitado && (
              <span className="text-amber-600">
                Lista de integrantes interrompida antes do fim — confira o recorte.
              </span>
            )}
          </div>
        </div>
      )}

      {enviando && (
        <div className="mt-4">
          <Progress value={progresso} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Enviando no privado, um por vez, respeitando o limite do Discord...
          </p>
        </div>
      )}

      {resultado && (
        <div className="mt-4 border border-border rounded-lg p-4 bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-medium">
              {resultado.enviados} enviado(s) de {resultado.total} destinatário(s)
            </p>
          </div>

          {resultado.falhas?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                {resultado.falhas.length} falha(s)
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                {resultado.falhas.map((f) => (
                  <li key={f.discord_id}>
                    <strong>{f.nome}</strong> — {f.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.incomplete && (
            <Alert>
              <AlertDescription className="text-xs">
                O envio parou por limite de tempo: {resultado.pendentes.length} pessoa(s) ainda
                não receberam. Use &quot;Enviar agora&quot; novamente para alcançar quem falta.
              </AlertDescription>
            </Alert>
          )}

          {resultado.falhas?.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => enviar(resultado.falhas.map((f) => f.discord_id))}
              disabled={enviando}
            >
              <Send className="h-4 w-4 mr-2" />
              Reenviar só para quem falhou
            </Button>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={gerarPreview} disabled={carregandoPreview || enviando}>
          <Users className="h-4 w-4 mr-2" />
          {carregandoPreview ? "Calculando..." : "Pré-visualizar destinatários"}
        </Button>
        <Button
          onClick={() => setConfirmar(true)}
          disabled={!preview?.total || enviando || carregandoPreview}
        >
          <Send className="h-4 w-4 mr-2" />
          Enviar para {preview?.total ?? 0} pessoa(s)
        </Button>
      </div>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Enviar para {preview?.total ?? 0} pessoa(s) no privado?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A mensagem será enviada como DM individual para {preview?.total ?? 0} integrante(s)
              dos cargos {nomesSelecionados.slice(0, 4).join(", ")}
              {nomesSelecionados.length > 4 ? " e outros" : ""}. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => enviar()}>Enviar agora</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

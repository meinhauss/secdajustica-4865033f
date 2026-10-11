import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type RedistribuicaoDialogProps = {
  processo: any;
  userId?: string;
  juizAtual?: { nome_completo?: string; recesso?: boolean } | null;
  relatorAtual?: { nome_completo?: string; recesso?: boolean } | null;
};

type Candidato = {
  user_id: string;
  nome_completo: string;
  recesso: boolean;
  acervo: number;
};

export default function RedistribuicaoProcessoDialog({ processo, userId, juizAtual, relatorAtual }: RedistribuicaoDialogProps) {
  const [open, setOpen] = useState(false);
  const [metodo, setMetodo] = useState<"automatico" | "manual">("automatico");
  const [novoResponsavelId, setNovoResponsavelId] = useState("");
  const [busca, setBusca] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const queryClient = useQueryClient();
  const isSegundaInstancia = processo?.instancia === 2;
  const atual = isSegundaInstancia ? relatorAtual : juizAtual;
  const role = isSegundaInstancia ? "desembargador" : "magistrado";

  const { data: candidatos = [], isLoading: candidatosLoading } = useQuery({
    queryKey: ["redistribuicao-candidatos", role, processo?.id],
    enabled: open,
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", role as any);
      if (rolesError) throw rolesError;
      const ids = (roles || []).map((item: any) => item.user_id).filter((id: string) => id !== (isSegundaInstancia ? processo?.relator_id : processo?.juiz_id));
      if (!ids.length) return [] as Candidato[];

      const [{ data: profiles, error: profilesError }, { data: processos, error: processosError }] = await Promise.all([
        supabase.from("profiles").select("user_id, nome_completo, recesso").in("user_id", ids),
        supabase.from("processos").select("juiz_id, relator_id, status"),
      ]);
      if (profilesError) throw profilesError;
      if (processosError) throw processosError;

      return (profiles || []).map((profile: any) => ({
        user_id: profile.user_id,
        nome_completo: profile.nome_completo,
        recesso: Boolean(profile.recesso),
        acervo: (processos || []).filter((item: any) =>
          (isSegundaInstancia ? item.relator_id : item.juiz_id) === profile.user_id &&
          ["novo", "em_andamento", "concluso", "suspenso"].includes(item.status)
        ).length,
      })).sort((a, b) => a.acervo - b.acervo || a.nome_completo.localeCompare(b.nome_completo));
    },
  });

  const candidatosAptos = useMemo(
    () => candidatos.filter((candidato) => !candidato.recesso && candidato.nome_completo.toLowerCase().includes(busca.toLowerCase())),
    [candidatos, busca],
  );

  const redistribuir = useMutation({
    mutationFn: async () => {
      const motivo = justificativa.trim();
      if (motivo.length < 10) throw new Error("Informe uma justificativa administrativa com pelo menos 10 caracteres.");
      if (metodo === "manual" && !novoResponsavelId) throw new Error("Selecione o novo magistrado ou relator.");

      const { error } = await supabase.rpc("redistribuir_processo_admin" as any, {
        _processo_id: processo.id,
        _novo_responsavel_id: metodo === "manual" ? novoResponsavelId : null,
        _metodo: metodo,
        _justificativa: motivo,
      });
      if (error) throw error;
      return metodo === "manual" ? candidatos.find((candidato) => candidato.user_id === novoResponsavelId)?.nome_completo : "novo responsável";
    },
    onSuccess: (nome) => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      queryClient.invalidateQueries({ queryKey: ["processo", processo.id] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes", processo.id] });
      setOpen(false);
      setJustificativa("");
      setNovoResponsavelId("");
      setBusca("");
      toast.success(`Processo redistribuído com sucesso para ${nome}.`);
    },
    onError: (error: any) => toast.error(error?.message || "Não foi possível redistribuir o processo."),
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl text-xs"
        title="Redistribuir este processo para outro magistrado/relator (Apenas Administrador)"
        onClick={() => setOpen(true)}
      >
        <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Redistribuir Processo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Redistribuir Processo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm space-y-1">
              <p><strong>Processo:</strong> {processo?.numero || "—"}</p>
              <p><strong>Vara / Comarca:</strong> {processo?.vara || processo?.orgao_julgador || "—"}</p>
              <p><strong>{isSegundaInstancia ? "Relator(a) atual" : "Magistrado(a) atual"}:</strong> {atual?.nome_completo || "Não atribuído"} ({atual?.recesso ? "em recesso" : "ativo"})</p>
            </div>

            <RadioGroup value={metodo} onValueChange={(value) => setMetodo(value as "automatico" | "manual")} className="grid gap-2">
              <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
                <RadioGroupItem value="automatico" className="mt-0.5" />
                <span><strong>Sorteio Aleatório / Automático</strong><span className="block text-xs text-muted-foreground">Seleciona o responsável apto com menor acervo, sem recesso e diferente do atual.</span></span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
                <RadioGroupItem value="manual" className="mt-0.5" />
                <span><strong>Designação Direta (Manual)</strong><span className="block text-xs text-muted-foreground">Escolha um responsável apto e visualize o acervo em andamento.</span></span>
              </label>
            </RadioGroup>

            {metodo === "manual" && (
              <div className="space-y-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar magistrado/relator por nome" className="rounded-xl pl-9" /></div>
                <Select value={novoResponsavelId} onValueChange={setNovoResponsavelId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={candidatosLoading ? "Carregando responsáveis..." : "Selecione o novo responsável"} /></SelectTrigger>
                  <SelectContent>
                    {candidatosAptos.map((candidato) => <SelectItem key={candidato.user_id} value={candidato.user_id}>{candidato.nome_completo} — {candidato.acervo} processo(s) em andamento</SelectItem>)}
                  </SelectContent>
                </Select>
                {!candidatosLoading && candidatosAptos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum responsável apto encontrado.</p>}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Justificativa Administrativa <span className="text-destructive">*</span></label>
              <Textarea value={justificativa} onChange={(event) => setJustificativa(event.target.value)} required minLength={10} rows={5} placeholder="Informe a motivação da redistribuição: impedimento/suspeição, afastamento, readequação de vara, determinação da Corregedoria, etc." className="rounded-xl" />
              <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres.</p>
            </div>

            <Button type="button" className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light" onClick={() => redistribuir.mutate()} disabled={redistribuir.isPending || justificativa.trim().length < 10 || (metodo === "manual" && !novoResponsavelId)}>
              {redistribuir.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redistribuindo...</> : <><ArrowRightLeft className="h-4 w-4 mr-2" /> Confirmar Redistribuição</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

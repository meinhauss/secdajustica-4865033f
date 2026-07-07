import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarRange, Loader2, Copy, Check } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS_FASE4 } from "@/lib/ai/prompts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function AIResumoSemanal() {
  const { user, profile, roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const { run, loading } = useAI();

  const gerar = async () => {
    if (!user) return;
    setTexto("");
    const agora = new Date();
    const seteDias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodo = `${seteDias.toLocaleDateString("pt-BR")} a ${agora.toLocaleDateString("pt-BR")}`;

    // Processos do usuário
    const { data: processos } = await supabase
      .from("processos")
      .select("id,numero,status,prazo_final")
      .or(`juiz_id.eq.${user.id},promotor_id.eq.${user.id}`)
      .limit(500);

    const procList = (processos || []).map((p: any) => ({
      numero: p.numero,
      status: p.status,
      atrasado: p.prazo_final ? new Date(p.prazo_final) < agora : false,
    }));

    // Movimentações da semana
    const processoIds = (processos || []).map((p: any) => p.id);
    let movs: any[] = [];
    if (processoIds.length > 0) {
      const { data } = await supabase
        .from("movimentacoes")
        .select("tipo")
        .in("processo_id", processoIds)
        .gte("created_at", seteDias.toISOString());
      movs = data || [];
    }
    const contagemTipos: Record<string, number> = {};
    movs.forEach((m: any) => { contagemTipos[m.tipo] = (contagemTipos[m.tipo] || 0) + 1; });
    const movimentacoesSemana = Object.entries(contagemTipos).map(([tipo, total]) => ({ tipo, total }));

    // Audiências próximos 7 dias
    let audiencias: any[] = [];
    if (processoIds.length > 0) {
      const proximos7 = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { data } = await supabase
        .from("audiencias")
        .select("data_hora,processo_id")
        .in("processo_id", processoIds)
        .gte("data_hora", agora.toISOString())
        .lte("data_hora", proximos7.toISOString())
        .limit(20);
      audiencias = (data || []).map((a: any) => {
        const p = processos?.find((x: any) => x.id === a.processo_id);
        return { data: new Date(a.data_hora).toLocaleString("pt-BR"), processo: p?.numero || a.processo_id };
      });
    }

    const pendencias = procList
      .filter(p => p.atrasado)
      .slice(0, 10)
      .map(p => ({ descricao: `Processo ${p.numero} com prazo vencido`, prazo: "vencido" }));

    const cargoLabel = roles.includes("magistrado") ? "Juiz(a) de Direito"
      : roles.includes("ministerio_publico") ? "Promotor(a) de Justiça"
      : roles[0];

    const res = await run({
      operation: "resumir_processo",
      prompt: PROMPTS_FASE4.resumoSemanalGabinete({
        nome: profile?.nome_completo || undefined,
        cargo: cargoLabel,
        periodo,
        processos: procList,
        movimentacoesSemana,
        pendencias,
        audiencias,
      }),
      options: { temperature: 0.3 },
    });
    if (res.ok) setTexto(res.data as string);
    else toast.error("Falha ao gerar resumo.");
  };

  const abrir = () => { setOpen(true); if (!texto) gerar(); };

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success("Copiado");
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-xl" onClick={abrir}>
        <CalendarRange className="h-4 w-4 mr-1" /> Resumo semanal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" /> Resumo Semanal do Gabinete
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {loading && (
              <div className="py-10 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Compilando dados e gerando resumo...
              </div>
            )}
            {!loading && texto && (
              <>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm border border-border rounded-xl p-4 bg-muted/30">
                  {texto}
                </div>
                <div className="flex justify-between items-center">
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={gerar}>Gerar novamente</Button>
                  <Button size="sm" className="rounded-xl" onClick={copiar}>
                    {copiado ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copiado ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

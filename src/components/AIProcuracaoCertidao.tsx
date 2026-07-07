import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileSignature, Loader2, Copy, Check, ChevronDown } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { PROMPTS_FASE4 } from "@/lib/ai/prompts";
import { toast } from "sonner";

type Tipo = "procuracao" | "certidao" | null;

export default function AIProcuracaoCertidao() {
  const [tipo, setTipo] = useState<Tipo>(null);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const { run, loading } = useAI();

  // Procuração
  const [pOutorgante, setPOutorgante] = useState("");
  const [pCpf, setPCpf] = useState("");
  const [pEndereco, setPEndereco] = useState("");
  const [pAdvogado, setPAdvogado] = useState("");
  const [pOab, setPOab] = useState("");
  const [pFinalidade, setPFinalidade] = useState("");

  // Certidão
  const [cNome, setCNome] = useState("");
  const [cCpf, setCCpf] = useState("");
  const [cPeriodo, setCPeriodo] = useState("");
  const [cResultado, setCResultado] = useState<"nada_consta" | "consta">("nada_consta");

  const validar = () => {
    if (tipo === "procuracao") {
      if (!pOutorgante.trim() || !pAdvogado.trim()) { toast.error("Informe outorgante e advogado."); return false; }
      if (pCpf && !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(pCpf.replace(/\D/g, "").padStart(11, "0").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"))) {
        // validação leve
      }
    }
    if (tipo === "certidao") {
      if (!cNome.trim()) { toast.error("Informe o requerente."); return false; }
    }
    return true;
  };

  const gerar = async () => {
    if (!validar()) return;
    setTexto("");
    const req = tipo === "procuracao"
      ? { operation: "gerar_certidao" as const, prompt: PROMPTS_FASE4.procuracaoCartorio({
          outorgante: pOutorgante, outorganteCpf: pCpf, outorganteEndereco: pEndereco,
          outorgado: pAdvogado, outorgadoOab: pOab, finalidade: pFinalidade,
        }) }
      : { operation: "gerar_certidao" as const, prompt: PROMPTS_FASE4.certidaoDistribuicao({
          nome: cNome, cpf: cCpf, periodo: cPeriodo, resultado: cResultado,
        }) };
    const res = await run(req);
    if (res.ok) setTexto(res.data as string);
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success("Copiado");
    setTimeout(() => setCopiado(false), 2000);
  };

  const abrir = (t: Tipo) => { setTexto(""); setCopiado(false); setTipo(t); };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-xl">
            <FileSignature className="h-4 w-4 mr-1" /> Gerar com IA <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => abrir("procuracao")}>Procuração ad judicia</DropdownMenuItem>
          <DropdownMenuItem onClick={() => abrir("certidao")}>Certidão de distribuição</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!tipo} onOpenChange={(o) => !o && setTipo(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-primary" />
              {tipo === "procuracao" ? "Procuração ad judicia" : "Certidão de distribuição"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {tipo === "procuracao" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Outorgante (nome)*" value={pOutorgante} onChange={(e) => setPOutorgante(e.target.value)} className="rounded-xl" />
                <Input placeholder="CPF do outorgante" value={pCpf} onChange={(e) => setPCpf(e.target.value)} className="rounded-xl" />
                <Input placeholder="Endereço" value={pEndereco} onChange={(e) => setPEndereco(e.target.value)} className="rounded-xl sm:col-span-2" />
                <Input placeholder="Advogado(a)*" value={pAdvogado} onChange={(e) => setPAdvogado(e.target.value)} className="rounded-xl" />
                <Input placeholder="OAB" value={pOab} onChange={(e) => setPOab(e.target.value)} className="rounded-xl" />
                <Input placeholder="Finalidade" value={pFinalidade} onChange={(e) => setPFinalidade(e.target.value)} className="rounded-xl sm:col-span-2" />
              </div>
            )}
            {tipo === "certidao" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Requerente*" value={cNome} onChange={(e) => setCNome(e.target.value)} className="rounded-xl" />
                <Input placeholder="CPF" value={cCpf} onChange={(e) => setCCpf(e.target.value)} className="rounded-xl" />
                <Input placeholder="Período pesquisado (ex: últimos 5 anos)" value={cPeriodo} onChange={(e) => setCPeriodo(e.target.value)} className="rounded-xl sm:col-span-2" />
                <select value={cResultado} onChange={(e) => setCResultado(e.target.value as any)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm sm:col-span-2">
                  <option value="nada_consta">Nada consta</option>
                  <option value="consta">Consta distribuição</option>
                </select>
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" className="rounded-xl" onClick={gerar} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                Gerar
              </Button>
            </div>
            {texto && !loading && (
              <>
                <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="rounded-xl min-h-[360px] font-mono text-xs" />
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground">⚠️ Gerado por IA — confira dados antes de assinar.</p>
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

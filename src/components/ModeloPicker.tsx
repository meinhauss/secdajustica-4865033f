import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Star } from "lucide-react";
import { aplicarVariaveis, type ModeloContext } from "@/lib/modelosVars";
import { toast } from "sonner";

interface ModeloPickerProps {
  onInsert: (texto: string) => void;
  context?: ModeloContext;
  categoria?: string;
  label?: string;
  size?: "sm" | "default";
}

interface Modelo {
  id: string;
  titulo: string;
  categoria: string;
  descricao: string | null;
  conteudo: string;
  cargos: string[];
  fonte: "oficial" | "favorito";
}

export default function ModeloPicker({
  onInsert,
  context,
  categoria,
  label = "Inserir modelo",
  size = "sm",
}: ModeloPickerProps) {
  const { roles, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const [oficiaisRes, favRes] = await Promise.all([
        supabase.from("modelos_documentos").select("*").order("titulo"),
        supabase.from("modelos_favoritos").select("*").order("titulo"),
      ]);
      const oficiais: Modelo[] = (oficiaisRes.data || [])
        .filter((m: any) =>
          !categoria || m.categoria === categoria
        )
        .filter((m: any) =>
          !m.cargos?.length || m.cargos.some((c: string) => roles.includes(c)) || roles.includes("admin")
        )
        .map((m: any) => ({ ...m, fonte: "oficial" as const }));
      const favs: Modelo[] = (favRes.data || []).map((m: any) => ({
        ...m,
        cargos: [],
        fonte: "favorito" as const,
      }));
      setModelos([...favs, ...oficiais]);
      setLoading(false);
    })();
  }, [open, categoria, roles]);

  const ctx: ModeloContext = {
    nome_usuario: profile?.nome_completo || "",
    ...context,
  };

  const filtrados = modelos.filter((m) =>
    !busca || m.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    (m.descricao || "").toLowerCase().includes(busca.toLowerCase())
  );

  const handleUse = (m: Modelo) => {
    const texto = aplicarVariaveis(m.conteudo, ctx);
    onInsert(texto);
    setOpen(false);
    toast.success(`Modelo "${m.titulo}" inserido`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={size} variant="outline">
          <FileText className="h-4 w-4 mr-1" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar modelo</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
            autoFocus
          />
        </div>
        <ScrollArea className="flex-1 max-h-[55vh]">
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum modelo disponível para seu cargo{categoria ? ` nesta categoria` : ""}.
            </p>
          ) : (
            <div className="space-y-2 pr-3">
              {filtrados.map((m) => (
                <button
                  key={`${m.fonte}-${m.id}`}
                  type="button"
                  onClick={() => handleUse(m)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {m.fonte === "favorito" && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                        <span className="font-medium text-sm">{m.titulo}</span>
                      </div>
                      {m.descricao && (
                        <p className="text-xs text-muted-foreground mt-1">{m.descricao}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{m.categoria}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

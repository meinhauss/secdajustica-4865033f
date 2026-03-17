import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Search, Eye } from "lucide-react";
import { toast } from "sonner";

export default function ProcessosSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    classe: "civil" as string,
    assunto: "",
    descricao: "",
    autor_nome: "",
    reu_nome: "",
    vara: "1ª Vara Cível",
    valor_causa: "",
  });

  const { data: processos, isLoading } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createProcesso = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("processos").insert({
        numero: "",
        classe: form.classe as any,
        assunto: form.assunto,
        descricao: form.descricao,
        autor_nome: form.autor_nome,
        reu_nome: form.reu_nome,
        vara: form.vara,
        valor_causa: form.valor_causa ? parseFloat(form.valor_causa) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      queryClient.invalidateQueries({ queryKey: ["processos-count"] });
      setOpen(false);
      setForm({ classe: "civil", assunto: "", descricao: "", autor_nome: "", reu_nome: "", vara: "1ª Vara Cível", valor_causa: "" });
      toast.success("Processo cadastrado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = processos?.filter(
    (p) =>
      p.numero?.toLowerCase().includes(search.toLowerCase()) ||
      p.assunto?.toLowerCase().includes(search.toLowerCase()) ||
      p.autor_nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.reu_nome?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    novo: "bg-institutional/10 text-institutional",
    em_andamento: "bg-gold/10 text-gold-dark",
    concluso: "bg-accent/20 text-accent-foreground",
    sentenciado: "bg-green-100 text-green-800",
    arquivado: "bg-muted text-muted-foreground",
    suspenso: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Processos Eletrônicos</h2>
          <p className="text-sm text-muted-foreground">Gerenciamento processual da Comarca</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Plus className="h-4 w-4 mr-2" /> Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Cadastrar Novo Processo</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProcesso.mutate();
              }}
              className="space-y-4 mt-4"
            >
              <Select value={form.classe} onValueChange={(v) => setForm({ ...form, classe: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Classe Processual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="criminal">Criminal</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="constitucional">Constitucional</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Assunto"
                value={form.assunto}
                onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                required
                className="rounded-xl"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Nome do Autor"
                  value={form.autor_nome}
                  onChange={(e) => setForm({ ...form, autor_nome: e.target.value })}
                  required
                  className="rounded-xl"
                />
                <Input
                  placeholder="Nome do Réu"
                  value={form.reu_nome}
                  onChange={(e) => setForm({ ...form, reu_nome: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>
              <Input
                placeholder="Vara"
                value={form.vara}
                onChange={(e) => setForm({ ...form, vara: e.target.value })}
                className="rounded-xl"
              />
              <Input
                type="number"
                placeholder="Valor da Causa (R$)"
                value={form.valor_causa}
                onChange={(e) => setForm({ ...form, valor_causa: e.target.value })}
                className="rounded-xl"
              />
              <Textarea
                placeholder="Descrição dos fatos"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="rounded-xl"
              />
              <Button
                type="submit"
                disabled={createProcesso.isPending}
                className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light"
              >
                {createProcesso.isPending ? "Cadastrando..." : "Cadastrar Processo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, assunto, autor ou réu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando processos...</div>
      ) : !filtered?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          Nenhum processo encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border shadow-institutional hover:shadow-gold/10 transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-institutional">
                      {p.numero}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusColors[p.status] || ""}`}>
                      {p.status?.replace("_", " ")}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {p.classe}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1">{p.assunto}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.autor_nome} × {p.reu_nome} — {p.vara}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="rounded-lg">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

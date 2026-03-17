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
import { Plus, FileText, Search, Eye, User } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const number = parseInt(digits || "0", 10) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseCurrencyToNumber = (value: string): number | null => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return parseInt(digits, 10) / 100;
};

function useProfileLookup() {
  const [result, setResult] = useState<{ nome_completo: string; id_personagem: string } | null>(null);

  const lookup = async (idPersonagem: string) => {
    setResult(null);
    if (!idPersonagem) return;
    const { data } = await supabase
      .from("profiles")
      .select("nome_completo, id_personagem")
      .eq("id_personagem", idPersonagem)
      .maybeSingle();
    if (data) {
      setResult({ nome_completo: data.nome_completo, id_personagem: data.id_personagem || "" });
    }
    return data;
  };

  return { result, lookup, clear: () => setResult(null) };
}

export default function ProcessosSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const autorLookup = useProfileLookup();
  const reuLookup = useProfileLookup();

  const [form, setForm] = useState({
    classe: "civil" as string,
    assunto: "",
    descricao: "",
    autor_nome: "",
    autor_id: "",
    reu_nome: "",
    reu_id: "",
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

  const handleAutorIdChange = async (id: string) => {
    setForm((f) => ({ ...f, autor_id: id }));
    const data = await autorLookup.lookup(id);
    if (data) setForm((f) => ({ ...f, autor_nome: data.nome_completo }));
  };

  const handleReuIdChange = async (id: string) => {
    setForm((f) => ({ ...f, reu_id: id }));
    const data = await reuLookup.lookup(id);
    if (data) setForm((f) => ({ ...f, reu_nome: data.nome_completo }));
  };

  const createProcesso = useMutation({
    mutationFn: async () => {
      const autorDisplay = form.autor_id ? `${form.autor_nome} (ID: ${form.autor_id})` : form.autor_nome;
      const reuDisplay = form.reu_id ? `${form.reu_nome} (ID: ${form.reu_id})` : form.reu_nome;
      const { error } = await supabase.from("processos").insert({
        numero: "",
        classe: form.classe as any,
        assunto: form.assunto,
        descricao: form.descricao,
        autor_nome: autorDisplay,
        reu_nome: reuDisplay,
        vara: form.vara,
        valor_causa: parseCurrencyToNumber(form.valor_causa),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      queryClient.invalidateQueries({ queryKey: ["processos-count"] });
      setOpen(false);
      setForm({ classe: "civil", assunto: "", descricao: "", autor_nome: "", autor_id: "", reu_nome: "", reu_id: "", vara: "1ª Vara Cível", valor_causa: "" });
      autorLookup.clear();
      reuLookup.clear();
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

  const IdLookupField = ({
    label,
    idValue,
    onIdChange,
    nameValue,
    onNameChange,
    lookupResult,
  }: {
    label: string;
    idValue: string;
    onIdChange: (v: string) => void;
    nameValue: string;
    onNameChange: (v: string) => void;
    lookupResult: { nome_completo: string; id_personagem: string } | null;
  }) => (
    <div className="space-y-2">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`ID do Personagem (${label})`}
          value={idValue}
          onChange={(e) => onIdChange(e.target.value)}
          className="rounded-xl pl-10"
        />
      </div>
      {lookupResult && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-xs">
          <User className="h-3 w-3 text-green-600" />
          <span className="text-green-800 dark:text-green-300 font-medium">{lookupResult.nome_completo}</span>
          <span className="text-green-600 dark:text-green-400">(ID: {lookupResult.id_personagem})</span>
        </div>
      )}
      {idValue && !lookupResult && (
        <p className="text-[11px] text-muted-foreground px-1">ID não encontrado — preencha o nome manualmente.</p>
      )}
      <Input
        placeholder={`Nome do ${label}`}
        value={nameValue}
        onChange={(e) => onNameChange(e.target.value)}
        required
        className="rounded-xl"
        readOnly={!!lookupResult}
      />
    </div>
  );

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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

              {/* Autor with ID lookup */}
              <IdLookupField
                label="Autor"
                idValue={form.autor_id}
                onIdChange={handleAutorIdChange}
                nameValue={form.autor_nome}
                onNameChange={(v) => setForm({ ...form, autor_nome: v })}
                lookupResult={autorLookup.result}
              />

              {/* Réu with ID lookup */}
              <IdLookupField
                label="Réu"
                idValue={form.reu_id}
                onIdChange={handleReuIdChange}
                nameValue={form.reu_nome}
                onNameChange={(v) => setForm({ ...form, reu_nome: v })}
                lookupResult={reuLookup.result}
              />

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, assunto, autor, réu ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

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

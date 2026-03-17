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
import { Plus, Shield, Search } from "lucide-react";
import { toast } from "sonner";

export default function DelegaciaSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    tipo: "furto",
    descricao: "",
    local_fato: "",
    vitima_nome: "",
  });

  const { data: bos, isLoading } = useQuery({
    queryKey: ["boletins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boletins_ocorrencia")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createBO = useMutation({
    mutationFn: async () => {
      const numero = `BO-${Date.now().toString().slice(-8)}`;
      const { error } = await supabase.from("boletins_ocorrencia").insert({
        numero,
        tipo: form.tipo,
        descricao: form.descricao,
        local_fato: form.local_fato,
        vitima_nome: form.vitima_nome,
        vitima_id: user?.id,
        data_fato: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletins"] });
      queryClient.invalidateQueries({ queryKey: ["bos-count"] });
      setOpen(false);
      setForm({ tipo: "furto", descricao: "", local_fato: "", vitima_nome: "" });
      toast.success("Boletim de Ocorrência registrado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColors: Record<string, string> = {
    registrado: "bg-institutional/10 text-institutional",
    em_investigacao: "bg-gold/10 text-gold-dark",
    concluido: "bg-green-100 text-green-800",
    arquivado: "bg-muted text-muted-foreground",
  };

  const filtered = bos?.filter(
    (b) =>
      b.numero?.toLowerCase().includes(search.toLowerCase()) ||
      b.vitima_nome?.toLowerCase().includes(search.toLowerCase()) ||
      b.tipo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Delegacia Virtual</h2>
          <p className="text-sm text-muted-foreground">Registro e acompanhamento de Boletins de Ocorrência</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-institutional hover:bg-institutional-light text-gold-light">
              <Plus className="h-4 w-4 mr-2" /> Registrar B.O.
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Registrar Boletim de Ocorrência</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBO.mutate();
              }}
              className="space-y-4 mt-4"
            >
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Tipo de Ocorrência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="furto">Furto</SelectItem>
                  <SelectItem value="roubo">Roubo</SelectItem>
                  <SelectItem value="agressao">Agressão</SelectItem>
                  <SelectItem value="ameaca">Ameaça</SelectItem>
                  <SelectItem value="estelionato">Estelionato</SelectItem>
                  <SelectItem value="vandalismo">Vandalismo</SelectItem>
                  <SelectItem value="homicidio">Homicídio</SelectItem>
                  <SelectItem value="trafico">Tráfico</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Nome da Vítima"
                value={form.vitima_nome}
                onChange={(e) => setForm({ ...form, vitima_nome: e.target.value })}
                required
                className="rounded-xl"
              />
              <Input
                placeholder="Local do Fato"
                value={form.local_fato}
                onChange={(e) => setForm({ ...form, local_fato: e.target.value })}
                className="rounded-xl"
              />
              <Textarea
                placeholder="Descreva detalhadamente os fatos ocorridos..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                required
                rows={4}
                className="rounded-xl"
              />
              <Button
                type="submit"
                disabled={createBO.isPending}
                className="w-full rounded-xl bg-institutional hover:bg-institutional-light text-gold-light"
              >
                {createBO.isPending ? "Registrando..." : "Registrar Ocorrência"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar boletins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !filtered?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          Nenhum boletim registrado.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bo, i) => (
            <motion.div
              key={bo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border shadow-institutional"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-institutional">{bo.numero}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusColors[bo.status] || ""}`}>
                      {bo.status?.replace("_", " ")}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {bo.tipo}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">Vítima: {bo.vitima_nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{bo.descricao}</p>
                  {bo.local_fato && (
                    <p className="text-xs text-muted-foreground mt-0.5">📍 {bo.local_fato}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

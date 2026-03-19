import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function ConsultaPublicaSection() {
  const [search, setSearch] = useState("");

  const { data: processos } = useQuery({
    queryKey: ["consulta-processos", search],
    queryFn: async () => {
      let query = supabase
        .from("processos")
        .select("numero, classe, status, assunto, vara, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (search) {
        query = query.or(
          `numero.ilike.%${search}%,assunto.ilike.%${search}%`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Consulta Pública</h2>
        <p className="text-sm text-muted-foreground">
          Pesquise processos por número ou assunto
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Número do processo, nome, ou ID do personagem..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl h-12 text-base"
        />
      </div>

      {!processos?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p>{search ? "Nenhum processo encontrado." : "Digite para pesquisar processos."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {processos.map((p, i) => (
            <motion.div
              key={p.numero}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-sm font-semibold text-institutional">{p.numero}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {p.classe}
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {p.status?.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{p.assunto}</p>
              <p className="text-xs text-muted-foreground">{p.vara}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

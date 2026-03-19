import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, IdCard } from "lucide-react";
import { motion } from "framer-motion";

export default function ConsultaPublicaSection() {
  const [search, setSearch] = useState("");

  const { data: resultados } = useQuery({
    queryKey: ["consulta-credenciais", search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const term = search.trim();
      const { data, error } = await supabase
        .from("carteiras_oab")
        .select("numero_oab, nome_completo, id_personagem, especialidade, status, data_inscricao")
        .or(`numero_oab.ilike.%${term}%,id_personagem.ilike.%${term}%`)
        .order("data_inscricao", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Consulta de Credenciais</h2>
        <p className="text-sm text-muted-foreground">
          Pesquise pela numeração da OAB ou ID do servidor
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Número OAB ou ID do servidor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl h-12 text-base"
        />
      </div>

      {!resultados?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <IdCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p>{search ? "Nenhuma credencial encontrada." : "Digite o número da OAB ou ID do servidor para pesquisar."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resultados.map((c, i) => (
            <motion.div
              key={c.numero_oab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-sm font-semibold text-institutional">{c.numero_oab}</span>
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                  c.status === "ativo" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                }`}>
                  {c.status}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{c.nome_completo}</p>
              <div className="flex gap-4 mt-1">
                {c.id_personagem && <p className="text-xs text-muted-foreground">ID: {c.id_personagem}</p>}
                {c.especialidade && <p className="text-xs text-muted-foreground">{c.especialidade}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

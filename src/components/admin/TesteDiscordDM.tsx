import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function TesteDiscordDM() {
  const [userId, setUserId] = useState("");
  const [titulo, setTitulo] = useState("Teste de notificação");
  const [mensagem, setMensagem] = useState("Esta é uma mensagem de teste enviada pelo painel administrativo.");
  const [tipo, setTipo] = useState("teste");
  const [linkSecao, setLinkSecao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: perfis } = useQuery({
    queryKey: ["profiles-discord"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome_completo, discord, discord_user_id, discord_dm_enabled")
        .order("nome_completo");
      return (data || []).filter((p: any) => {
        const dm = p.discord_user_id || (p.discord && /^[0-9]{17,20}$/.test(p.discord) ? p.discord : null);
        return !!dm;
      });
    },
  });

  const enviar = async () => {
    if (!userId) {
      toast.error("Selecione um usuário");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.from("notificacoes").insert({
        user_id: userId,
        titulo,
        mensagem,
        tipo,
        link_secao: linkSecao || null,
      });
      if (error) throw error;
      toast.success("Notificação criada — a DM deve chegar em instantes");
    } catch (e: any) {
      toast.error("Falha: " + (e?.message || "erro desconhecido"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-xl p-6 border border-border shadow-institutional"
    >
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-5 w-5 text-institutional" />
        <h3 className="font-display text-lg font-semibold">Teste de DM Discord</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Destinatário (perfis com Discord configurado)</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {perfis?.map((p: any) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.nome_completo} — {p.discord_user_id || p.discord}
                  {p.discord_dm_enabled === false ? " (DM desativada)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div>
          <Label>Tipo</Label>
          <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="teste, intimacao, movimentacao..." />
        </div>
        <div className="md:col-span-2">
          <Label>Mensagem</Label>
          <Textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Link da seção (opcional)</Label>
          <Input
            value={linkSecao}
            onChange={(e) => setLinkSecao(e.target.value)}
            placeholder="ex: processos:UUID ou cartorio"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Formatos comuns: <code>processos:&lt;id&gt;</code>, <code>cartorio</code>, <code>jurados</code>. O botão do Discord abrirá o sistema na seção indicada.
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={enviar} disabled={enviando || !userId}>
          <Send className="h-4 w-4 mr-2" />
          {enviando ? "Enviando..." : "Disparar DM de teste"}
        </Button>
      </div>
    </motion.div>
  );
}

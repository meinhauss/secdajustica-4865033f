import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, Save, Loader2 } from "lucide-react";

export default function MeuPerfilSection() {
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_completo: "",
    discord: "",
    id_personagem: "",
    telefone_ingame: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        nome_completo: profile.nome_completo || "",
        discord: profile.discord || "",
        id_personagem: profile.id_personagem || "",
        telefone_ingame: profile.telefone_ingame || "",
        cpf: profile.cpf || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.nome_completo.trim()) {
      toast.error("Nome completo é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome_completo: form.nome_completo.trim(),
          discord: form.discord.trim() || null,
          id_personagem: form.id_personagem.trim() || null,
          telefone_ingame: form.telefone_ingame.trim() || null,
          cpf: form.cpf.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
      // Reload to refresh profile data in context
      window.location.reload();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-6 w-6 text-accent" />
        <h2 className="text-2xl font-display font-bold text-foreground">Meu Perfil</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>E-mail</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado.</p>
          </div>

          <div>
            <Label>Nome Completo *</Label>
            <Input
              value={form.nome_completo}
              onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
              placeholder="Seu nome completo"
              maxLength={100}
            />
          </div>

          <div>
            <Label>Discord</Label>
            <Input
              value={form.discord}
              onChange={(e) => setForm({ ...form, discord: e.target.value })}
              placeholder="usuario#0000"
              maxLength={50}
            />
          </div>

          <div>
            <Label>ID do Personagem</Label>
            <Input
              value={form.id_personagem}
              onChange={(e) => setForm({ ...form, id_personagem: e.target.value })}
              placeholder="Ex: 12345"
              maxLength={20}
            />
          </div>

          <div>
            <Label>Telefone (In-Game)</Label>
            <Input
              value={form.telefone_ingame}
              onChange={(e) => setForm({ ...form, telefone_ingame: e.target.value })}
              placeholder="Ex: 555-1234"
              maxLength={20}
            />
          </div>

          <div>
            <Label>CPF</Label>
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, Save, Loader2, Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatTelefoneIngame } from "@/lib/formatPhone";

function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const ox = (img.width - size) / 2;
      const oy = (img.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, ox, oy, size, size, 0, 0, 512, 512);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao recortar"))),
        "image/webp",
        0.85
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function MeuPerfilSection() {
  const { profile, user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nome_completo: "",
    discord: "",
    id_personagem: "",
    telefone_ingame: "",
    discord_user_id: "",
    discord_dm_enabled: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        nome_completo: profile.nome_completo || "",
        discord: profile.discord || "",
        id_personagem: profile.id_personagem || "",
        telefone_ingame: profile.telefone_ingame || "",
        discord_user_id: (profile as any).discord_user_id || "",
        discord_dm_enabled: (profile as any).discord_dm_enabled ?? true,
      });
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }

    setUploading(true);
    try {
      const cropped = await cropToSquare(file);
      const path = `${user.id}/avatar.webp`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, cropped, { upsert: true, contentType: "image/webp" });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      setAvatarUrl(publicUrl);
      await refreshProfile();
      toast.success("Foto de perfil atualizada!");
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + (err.message || "Tente novamente."));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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
          precisa_atualizar_cadastro: false,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente."));
    } finally {
      setSaving(false);
    }
  };

  const initials = form.nome_completo
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Avatar className="h-28 w-28 border-2 border-border">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Foto de perfil" className="object-cover" />
                ) : null}
                <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Clique para alterar a foto</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

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
              onChange={(e) => setForm({ ...form, telefone_ingame: formatTelefoneIngame(e.target.value) })}
              placeholder="(14) 9 0000-0000"
              maxLength={16}
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

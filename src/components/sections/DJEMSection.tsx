import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Newspaper, ImagePlus, X, Send, Loader2 } from "lucide-react";

const MAX = 8 * 1024 * 1024;

const toBase64 = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(f);
  });

export default function DJEMSection() {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [marcar, setMarcar] = useState(true);
  const [imagem, setImagem] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const escolher = (f?: File) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(f.type)) return toast.error("Use PNG, JPG, GIF ou WEBP.");
    if (f.size > MAX) return toast.error("Imagem acima de 8 MB.");
    setImagem(f);
    setPreview(URL.createObjectURL(f));
  };
  const limparImagem = () => { if (preview) URL.revokeObjectURL(preview); setImagem(null); setPreview(null); };

  const publicar = async () => {
    if (!texto.trim()) return toast.error("Escreva o texto da publicação.");
    if (!confirm("Publicar no DJEM do Discord agora?")) return;
    setEnviando(true);
    try {
      const body: Record<string, unknown> = { titulo, texto, marcar_cargo: marcar };
      if (imagem) { body.imagem_base64 = await toBase64(imagem); body.imagem_tipo = imagem.type; }
      const { data, error } = await supabase.functions.invoke("discord-djem-publicar", { body });
      if (error || data?.error) throw new Error(data?.error || "Falha ao publicar");
      toast.success("Publicado no DJEM!");
      setTitulo(""); setTexto(""); limparImagem();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Newspaper className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">DJEM</h1>
          <p className="text-sm text-muted-foreground">Diário da Justiça Eletrônico Municipal — publicação no Discord</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nova publicação</CardTitle>
          <CardDescription>O texto será publicado pelo bot no canal oficial do DJEM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="djem-titulo">Título (opcional)</Label>
            <Input id="djem-titulo" maxLength={250} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Edital nº 01/2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="djem-texto">Texto</Label>
            <Textarea id="djem-texto" rows={10} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva a publicação. Aceita formatação do Discord: **negrito**, *itálico*, > citação." />
            <p className="text-xs text-muted-foreground text-right">{texto.length}/4000</p>
          </div>
          <div className="space-y-2">
            <Label>Imagem (opcional)</Label>
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="Prévia da imagem" className="max-h-60 rounded-md border" />
                <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={limparImagem} aria-label="Remover imagem">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/50">
                <ImagePlus className="h-5 w-5" /> Escolher imagem do computador (até 8 MB)
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            )}
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Marcar o cargo no Discord</p>
              <p className="text-xs text-muted-foreground">Notifica todos os membros do cargo oficial.</p>
            </div>
            <Switch checked={marcar} onCheckedChange={setMarcar} />
          </div>
          <Button onClick={publicar} disabled={enviando} className="w-full">
            {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Publicar no DJEM
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

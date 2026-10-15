import { useRef, useState } from "react";
import { CheckCircle, CloudUpload, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadArquivoProcesso } from "@/lib/r2Files";
import { toast } from "sonner";

type FileUploadZoneProps = {
  processoId: string;
  onUploaded: (url: string, name: string) => void;
  onRemove: (url: string) => void;
};

export default function FileUploadZone({ processoId, onUploaded, onRemove }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
    const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState("");

    const upload = async (files?: FileList | File[]) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name}: excede o limite de 20 MB.`);
        return false;
      }
      if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
        toast.error(`${file.name}: envie um PDF ou uma imagem.`);
        return false;
      }
      return true;
    });
    if (!validFiles.length) return;

    setError("");
    setSending(true);
    setProgress(`Enviando 0 de ${validFiles.length} arquivos...`);
    let completed = 0;
    let failed = 0;
    for (const file of validFiles) {
      try {
        const url = await uploadArquivoProcesso(file, processoId);
        onUploaded(url, file.name);
        setUploaded({ url, name: file.name });
        completed += 1;
      } catch (err) {
        failed += 1;
        toast.error(`${file.name}: ${(err as Error).message || "não foi possível enviar."}`);
      }
      setProgress(`Enviando ${completed + failed} de ${validFiles.length} arquivos...`);
    }
    setSending(false);
    setProgress(completed ? `${completed} arquivo(s) enviado(s) com sucesso.` : "");
    if (completed) toast.success(`${completed} arquivo(s) enviado(s) com sucesso.`);
    if (!completed && failed) setError("Nenhum arquivo pôde ser enviado.");
  };

  const remove = () => {
    if (uploaded) onRemove(uploaded.url);
    setUploaded(null);
    setError("");
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
                type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg,image/*"
        className="hidden"
        disabled={sending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void upload(file);
        }}
      />
      {uploaded ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">Anexado: {uploaded.name}</span>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 text-emerald-800 hover:text-destructive dark:text-emerald-300" onClick={remove}>
            <X className="mr-1 h-4 w-4" /> Remover
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={sending}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void upload(event.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${dragging ? "border-primary bg-primary/10" : "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10"} ${sending ? "cursor-wait opacity-80" : "cursor-pointer"}`}
        >
          {sending ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <CloudUpload className="h-8 w-8 text-primary" />}
          <span className="text-sm font-semibold text-foreground">
            {sending ? "Enviando arquivo…" : "Clique ou arraste um arquivo do computador — Recomendado"}
          </span>
          <span className="text-xs text-muted-foreground">PDF, PNG ou JPG • até 20 MB</span>
          {!sending && <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><Upload className="h-3.5 w-3.5" /> Selecionar arquivo</span>}
        </button>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

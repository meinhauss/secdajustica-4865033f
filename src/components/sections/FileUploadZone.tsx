import { useRef, useState } from "react";
import { CloudUpload, FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type FileUploadZoneProps = {
  files: File[];
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
};

export default function FileUploadZone({ files, disabled = false, onFilesSelected, onRemoveFile }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (filesList?: FileList | File[] | null) => {
    if (disabled || !filesList) return;
    const selected = Array.from(filesList);
    const validFiles: File[] = [];

    for (const file of selected) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`"${file.name}" excede o limite máximo de 20 MB.`);
        continue;
      }
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImage = ["image/png", "image/jpeg"].includes(file.type) || /\.(png|jpe?g)$/i.test(file.name);
      if (!isPdf && !isImage) {
        toast.error(`"${file.name}" não é suportado. Envie apenas PDF, PNG ou JPG.`);
        continue;
      }
      validFiles.push(file);
    }

        const existingKeys = new Set(files.map((file) => `${file.name}:${file.size}`));
    const newFiles = validFiles.filter((file) => {
      const key = `${file.name}:${file.size}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });

    if (newFiles.length) {
      onFilesSelected(newFiles);
      toast.success(`${newFiles.length} arquivo(s) adicionado(s) à fila local.`);
    } else if (validFiles.length) {
      toast.info("Os arquivos selecionados já estão na fila.");
    }
  };

  const formatSize = (size: number) => size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${dragging ? "border-primary bg-primary/10" : "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <CloudUpload className="h-7 w-7 text-primary" />
        <span className="text-sm font-semibold text-foreground">Clique ou arraste arquivos do computador</span>
        <span className="text-xs text-muted-foreground">PDF, PNG ou JPG até 20 MB • O envio ocorre ao Registrar</span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><Upload className="h-3.5 w-3.5" /> Selecionar do computador</span>
      </button>
      {files.length > 0 && (
        <ul className="space-y-1.5" aria-label="Arquivos pendentes de envio">
          {files.map((file, index) => {
            const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
            const Icon = isPdf ? FileText : ImageIcon;
            return (
              <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                <Icon className="h-4 w-4 shrink-0 text-institutional" />
                <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                <span className="shrink-0 text-muted-foreground">{formatSize(file.size)}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Pendente de envio</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Remover ${file.name} da fila`} disabled={disabled} onClick={() => onRemoveFile(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

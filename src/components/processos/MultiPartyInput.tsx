import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Search, Plus, X, AlertTriangle } from "lucide-react";

export type ParteEntry = { nome: string; id_personagem?: string };

interface MultiPartyInputProps {
  label: string;
  entries: ParteEntry[];
  onChange: (e: ParteEntry[]) => void;
}

/**
 * Componente reutilizável para entrada de múltiplas partes (autores/réus)
 * com lookup por ID de personagem ou nome.
 */
export function MultiPartyInput({ label, entries, onChange }: MultiPartyInputProps) {
  const [currentId, setCurrentId] = useState("");
  const [currentNome, setCurrentNome] = useState("");
  const [lookupResult, setLookupResult] = useState<{ nome_completo: string; id_personagem: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupNotFound, setLookupNotFound] = useState(false);

  const handleIdLookup = async () => {
    const id = currentId.trim();
    if (!id) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupNotFound(false);
    const { data } = await supabase.from("profiles").select("nome_completo, id_personagem").eq("id_personagem", id).maybeSingle();
    if (data) {
      setLookupResult({ nome_completo: data.nome_completo, id_personagem: data.id_personagem || "" });
      setCurrentNome(data.nome_completo);
      setLookupNotFound(false);
    } else {
      setLookupNotFound(true);
      setCurrentNome("");
    }
    setLookupLoading(false);
  };

  const handleNameLookup = async () => {
    const nome = currentNome.trim();
    if (!nome) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupNotFound(false);
    const { data } = await supabase.from("profiles").select("nome_completo, id_personagem").ilike("nome_completo", `%${nome}%`).limit(1).maybeSingle();
    if (data) {
      setLookupResult({ nome_completo: data.nome_completo, id_personagem: data.id_personagem || "" });
      setCurrentNome(data.nome_completo);
      if (data.id_personagem) setCurrentId(data.id_personagem);
      setLookupNotFound(false);
    } else {
      setLookupNotFound(true);
    }
    setLookupLoading(false);
  };

  const addEntry = () => {
    const nome = currentNome.trim();
    if (!nome) return;
    const entry: ParteEntry = { nome };
    if (currentId.trim()) entry.id_personagem = currentId.trim();
    onChange([...entries, entry]);
    setCurrentId("");
    setCurrentNome("");
    setLookupResult(null);
    setLookupNotFound(false);
  };

  const removeEntry = (idx: number) => {
    onChange(entries.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 border border-border rounded-xl p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 text-xs">
              <User className="h-3 w-3 text-institutional" />
              <span className="font-medium flex-1">{entry.nome}{entry.id_personagem ? ` (ID: ${entry.id_personagem})` : ""}</span>
              <button type="button" onClick={() => removeEntry(idx)} className="text-destructive hover:text-destructive/80"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`ID do Personagem (${label})`}
                value={currentId}
                onChange={(e) => { setCurrentId(e.target.value); setLookupResult(null); setLookupNotFound(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleIdLookup(); } }}
                className="rounded-xl pl-10"
              />
            </div>
            <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleIdLookup} disabled={lookupLoading || !currentId.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {lookupResult && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-xs">
              <User className="h-3 w-3 text-green-600" />
              <span className="text-green-800 dark:text-green-300 font-medium">{lookupResult.nome_completo}</span>
            </div>
          )}
          {lookupNotFound && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-destructive font-medium">Nenhum cidadão encontrado</span>
            </div>
          )}
          <div className="flex gap-1.5">
            <Input
              placeholder={`Nome do ${label}`}
              value={currentNome}
              onChange={(e) => { setCurrentNome(e.target.value); if (lookupResult) { setLookupResult(null); } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNameLookup(); } }}
              className="rounded-xl flex-1"
            />
            <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleNameLookup} disabled={lookupLoading || !currentNome.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button type="button" variant="outline" size="icon" className="rounded-xl self-end" onClick={addEntry} disabled={!currentNome.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Helpers de formatação de partes ─── */

export function parsePartesFromString(value: string): ParteEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return [{ nome: value }];
}

export function formatPartesDisplay(partes: ParteEntry[]): string {
  return partes.map(p => p.id_personagem ? `${p.nome} (ID: ${p.id_personagem})` : p.nome).join(", ");
}

export function formatPartesShort(value: string): string {
  const partes = parsePartesFromString(value);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].nome;
  return `${partes[0].nome} e outros (${partes.length})`;
}
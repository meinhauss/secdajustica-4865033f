import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User } from "lucide-react";

interface PersonLookupResult {
  nome_completo: string;
  id_personagem: string;
  cpf?: string | null;
}

interface PersonLookupInputProps {
  idValue: string;
  nomeValue: string;
  onIdChange: (id: string) => void;
  onNomeChange: (nome: string) => void;
  onLookupResult?: (result: PersonLookupResult | null) => void;
  idPlaceholder?: string;
  nomePlaceholder?: string;
  idLabel?: string;
  nomeLabel?: string;
  required?: boolean;
  /** Compact layout: single row */
  compact?: boolean;
}

export function PersonLookupInput({
  idValue,
  nomeValue,
  onIdChange,
  onNomeChange,
  onLookupResult,
  idPlaceholder = "ID do Personagem",
  nomePlaceholder = "Nome completo",
  idLabel = "ID Personagem",
  nomeLabel = "Nome",
  required = false,
  compact = false,
}: PersonLookupInputProps) {
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<boolean | null>(null);

  const handleLookupById = async () => {
    const id = idValue.trim();
    if (!id) return;
    setLoading(true);
    setFound(null);
    const { data } = await supabase
      .from("profiles")
      .select("nome_completo, id_personagem, cpf")
      .eq("id_personagem", id)
      .maybeSingle();
    if (data) {
      setFound(true);
      // Use callback to batch updates and avoid stale closure issues
      const result: PersonLookupResult = { nome_completo: data.nome_completo, id_personagem: data.id_personagem || id, cpf: data.cpf };
      if (onLookupResult) {
        onLookupResult(result);
      } else {
        onNomeChange(data.nome_completo);
        if (data.id_personagem) onIdChange(data.id_personagem);
      }
    } else {
      setFound(false);
      onLookupResult?.(null);
    }
    setLoading(false);
  };

  const handleLookupByName = async () => {
    const nome = nomeValue.trim();
    if (!nome) return;
    setLoading(true);
    setFound(null);
    const { data } = await supabase
      .from("profiles")
      .select("nome_completo, id_personagem")
      .ilike("nome_completo", `%${nome}%`)
      .limit(1)
      .maybeSingle();
    if (data) {
      setFound(true);
      onNomeChange(data.nome_completo);
      if (data.id_personagem) onIdChange(data.id_personagem);
      onLookupResult?.({ nome_completo: data.nome_completo, id_personagem: data.id_personagem || "" });
    } else {
      setFound(false);
      onLookupResult?.(null);
    }
    setLoading(false);
  };

  const resetFound = () => setFound(null);

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={idPlaceholder}
              value={idValue}
              onChange={(e) => { onIdChange(e.target.value); resetFound(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupById(); } }}
              className="rounded-xl pl-10"
            />
          </div>
          <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleLookupById} disabled={loading || !idValue.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1.5">
          <Input
            placeholder={nomePlaceholder}
            value={nomeValue}
            onChange={(e) => { onNomeChange(e.target.value); resetFound(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupByName(); } }}
            className="rounded-xl flex-1"
            required={required}
          />
          <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleLookupByName} disabled={loading || !nomeValue.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {found === true && (
          <p className="text-[11px] text-green-600 dark:text-green-400 px-1">✓ Perfil encontrado</p>
        )}
        {found === false && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 px-1">Não encontrado — preencha manualmente</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-muted-foreground">{idLabel}</label>
        <div className="flex gap-1.5 mt-1">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={idPlaceholder}
              value={idValue}
              onChange={(e) => { onIdChange(e.target.value); resetFound(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupById(); } }}
              className="rounded-xl pl-10"
            />
          </div>
          <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleLookupById} disabled={loading || !idValue.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{nomeLabel} {required && "*"}</label>
        <div className="flex gap-1.5 mt-1">
          <Input
            placeholder={nomePlaceholder}
            value={nomeValue}
            onChange={(e) => { onNomeChange(e.target.value); resetFound(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupByName(); } }}
            className="rounded-xl flex-1"
            required={required}
          />
          <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleLookupByName} disabled={loading || !nomeValue.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {found === true && (
        <p className="text-[11px] text-green-600 dark:text-green-400 px-1">✓ Perfil encontrado e dados preenchidos</p>
      )}
      {found === false && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 px-1">Perfil não encontrado — preencha manualmente</p>
      )}
    </div>
  );
}

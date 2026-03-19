
-- Table for procuracoes (power of attorney) - supports multiple lawyers per process
CREATE TABLE public.procuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  advogado_id UUID NOT NULL,
  advogado_nome TEXT NOT NULL,
  parte TEXT NOT NULL DEFAULT 'autor', -- 'autor' or 'reu'
  documento_url TEXT, -- link to the procuração document
  status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa' or 'renunciada'
  renunciada_em TIMESTAMP WITH TIME ZONE,
  motivo_renuncia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procuracoes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Procuracoes readable by authenticated"
ON public.procuracoes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Advogados can insert procuracoes"
ON public.procuracoes FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'advogado'));

CREATE POLICY "Advogados can update own procuracoes"
ON public.procuracoes FOR UPDATE TO authenticated
USING (advogado_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_procuracoes_updated_at
  BEFORE UPDATE ON public.procuracoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

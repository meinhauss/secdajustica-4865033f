
CREATE TABLE public.envolvidos_audiencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audiencia_id UUID NOT NULL REFERENCES public.audiencias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'participante',
  id_personagem TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.envolvidos_audiencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envolvidos audiencia readable by authenticated"
ON public.envolvidos_audiencia FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert envolvidos audiencia"
ON public.envolvidos_audiencia FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete envolvidos audiencia"
ON public.envolvidos_audiencia FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

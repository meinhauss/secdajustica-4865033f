
CREATE TABLE public.envolvidos_bo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bo_id uuid NOT NULL REFERENCES public.boletins_ocorrencia(id) ON DELETE CASCADE,
  nome text NOT NULL,
  id_personagem text,
  tipo text NOT NULL DEFAULT 'vitima',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.envolvidos_bo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envolvidos BO readable by authenticated" ON public.envolvidos_bo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert envolvidos BO" ON public.envolvidos_bo
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete envolvidos BO" ON public.envolvidos_bo
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

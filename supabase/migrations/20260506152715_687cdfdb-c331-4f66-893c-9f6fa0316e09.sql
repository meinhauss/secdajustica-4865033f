
-- Add reasons columns and voting table for appeals

ALTER TABLE public.apelacoes
  ADD COLUMN IF NOT EXISTS razoes_admissao text,
  ADD COLUMN IF NOT EXISTS razoes_inadmissao text;

CREATE TABLE IF NOT EXISTS public.votos_apelacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apelacao_id uuid NOT NULL REFERENCES public.apelacoes(id) ON DELETE CASCADE,
  desembargador_id uuid NOT NULL,
  desembargador_nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'proprio', -- 'relator' | 'acompanha' | 'proprio'
  decisao_tipo text,
  fundamentacao text,
  dispositivo text,
  acompanha_voto_id uuid REFERENCES public.votos_apelacao(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apelacao_id, desembargador_id)
);

ALTER TABLE public.votos_apelacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votos readable by authenticated"
  ON public.votos_apelacao FOR SELECT TO authenticated USING (true);

CREATE POLICY "Desembargadores can insert own voto"
  ON public.votos_apelacao FOR INSERT TO authenticated
  WITH CHECK (
    desembargador_id = auth.uid() AND (
      has_role(auth.uid(), 'desembargador'::user_role) OR
      has_role(auth.uid(), 'presidente_tribunal'::user_role) OR
      has_role(auth.uid(), 'admin'::user_role)
    )
  );

CREATE POLICY "Desembargadores can update own voto"
  ON public.votos_apelacao FOR UPDATE TO authenticated
  USING (desembargador_id = auth.uid());

CREATE POLICY "Admin can delete votos"
  ON public.votos_apelacao FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

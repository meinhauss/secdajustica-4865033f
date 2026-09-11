
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Movimentacoes are publicly readable" ON public.movimentacoes;

-- Create restricted policy: only involved parties and admins
CREATE POLICY "Movimentacoes visible to involved users"
  ON public.movimentacoes FOR SELECT
  TO authenticated
  USING (
    autor_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::user_role)
    OR has_role(auth.uid(), 'magistrado'::user_role)
    OR has_role(auth.uid(), 'presidente_tribunal'::user_role)
    OR has_role(auth.uid(), 'desembargador'::user_role)
    OR has_role(auth.uid(), 'ministerio_publico'::user_role)
    OR EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = movimentacoes.processo_id
      AND (
        p.juiz_id = auth.uid()
        OR p.advogado_autor_id = auth.uid()
        OR p.advogado_reu_id = auth.uid()
      )
    )
  );

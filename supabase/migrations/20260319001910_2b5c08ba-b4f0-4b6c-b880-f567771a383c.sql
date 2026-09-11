
-- Drop the current public SELECT policy on audiencias
DROP POLICY IF EXISTS "Audiencias are publicly readable" ON public.audiencias;

-- Create new policy: only users involved in the linked processo can see the audiência
-- Involved = juiz, advogado do autor, advogado do réu, or privileged roles (admin, magistrado, desembargador, presidente_tribunal, ministerio_publico, oficial_justica)
CREATE POLICY "Audiencias visible to involved users"
ON public.audiencias
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = audiencias.processo_id
    AND (
      p.juiz_id = auth.uid()
      OR p.advogado_autor_id = auth.uid()
      OR p.advogado_reu_id = auth.uid()
    )
  )
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'magistrado')
  OR has_role(auth.uid(), 'desembargador')
  OR has_role(auth.uid(), 'presidente_tribunal')
  OR has_role(auth.uid(), 'ministerio_publico')
  OR has_role(auth.uid(), 'oficial_justica')
);

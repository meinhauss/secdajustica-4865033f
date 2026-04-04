
-- Drop old SELECT policy
DROP POLICY IF EXISTS "Audiencias visible to involved users" ON public.audiencias;

-- Recreate with broader access including interested parties
CREATE POLICY "Audiencias visible to involved users"
ON public.audiencias
FOR SELECT
TO authenticated
USING (
  processo_id IS NULL
  OR EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = audiencias.processo_id
    AND (
      p.juiz_id = auth.uid()
      OR p.advogado_autor_id = auth.uid()
      OR p.advogado_reu_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM interessados_processo ip
    WHERE ip.processo_id = audiencias.processo_id
    AND ip.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'magistrado'::user_role)
  OR has_role(auth.uid(), 'desembargador'::user_role)
  OR has_role(auth.uid(), 'presidente_tribunal'::user_role)
  OR has_role(auth.uid(), 'ministerio_publico'::user_role)
  OR has_role(auth.uid(), 'oficial_justica'::user_role)
);

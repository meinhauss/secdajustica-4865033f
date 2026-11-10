DROP POLICY IF EXISTS "Proprio usuario ou servidor adiciona interessado" ON public.interessados_processo;
CREATE POLICY "Proprio usuario ou servidor adiciona interessado" ON public.interessados_processo FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_servidor_judiciario(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::user_role)
  OR EXISTS (SELECT 1 FROM public.analista_vinculos av WHERE av.analista_id = interessados_processo.user_id AND av.supervisor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.acoes_pendentes ap WHERE ap.analista_id = interessados_processo.user_id AND ap.supervisor_id = auth.uid() AND ap.status = 'pendente')
);
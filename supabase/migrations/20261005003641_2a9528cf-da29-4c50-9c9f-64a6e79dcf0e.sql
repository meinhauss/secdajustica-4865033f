DROP POLICY IF EXISTS "Autor da movimentacao e quem grava" ON public.movimentacoes;
CREATE POLICY "Autor da movimentacao e quem grava" ON public.movimentacoes FOR INSERT TO authenticated
WITH CHECK (
  autor_id IS NULL OR autor_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::user_role)
  OR EXISTS (SELECT 1 FROM analista_vinculos av WHERE av.analista_id = movimentacoes.autor_id AND av.supervisor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM acoes_pendentes ap WHERE ap.analista_id = movimentacoes.autor_id AND ap.supervisor_id = auth.uid() AND ap.status = 'pendente')
);
DROP POLICY IF EXISTS "Agendador e cargos criam audiencias" ON public.audiencias;
CREATE POLICY "Agendador e cargos criam audiencias" ON public.audiencias FOR INSERT TO authenticated
WITH CHECK (
  (criado_por IS NULL OR criado_por = auth.uid() OR has_role(auth.uid(), 'admin'::user_role)
    OR EXISTS (SELECT 1 FROM analista_vinculos av WHERE av.analista_id = audiencias.criado_por AND av.supervisor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM acoes_pendentes ap WHERE ap.analista_id = audiencias.criado_por AND ap.supervisor_id = auth.uid() AND ap.status = 'pendente'))
  AND (is_staff_processual(auth.uid()) OR criado_por = auth.uid() OR has_role(auth.uid(), 'admin'::user_role)
    OR (processo_id IS NOT NULL AND pode_atuar_processo(auth.uid(), processo_id))
    OR EXISTS (SELECT 1 FROM acoes_pendentes ap WHERE ap.analista_id = audiencias.criado_por AND ap.supervisor_id = auth.uid() AND ap.status = 'pendente'))
);
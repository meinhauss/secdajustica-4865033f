CREATE OR REPLACE FUNCTION public.pode_gerir_concurso_analista(_concurso_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'desembargador'::public.user_role)
 AND EXISTS (SELECT 1 FROM public.concursos c WHERE c.id = _concurso_id AND c.cargo = 'Analista Judiciário');
$$;
REVOKE ALL ON FUNCTION public.pode_gerir_concurso_analista(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_concurso_analista(uuid) TO authenticated, service_role;
CREATE POLICY "Desembargador cria concursos de Analista" ON public.concursos FOR INSERT TO authenticated
 WITH CHECK (public.has_role(auth.uid(), 'desembargador') AND cargo = 'Analista Judiciário' AND criado_por = auth.uid());
CREATE POLICY "Desembargador edita concursos de Analista" ON public.concursos FOR UPDATE TO authenticated
 USING (public.has_role(auth.uid(), 'desembargador') AND cargo = 'Analista Judiciário')
 WITH CHECK (public.has_role(auth.uid(), 'desembargador') AND cargo = 'Analista Judiciário');
CREATE POLICY "Desembargador administra questoes de Analista" ON public.questoes_concurso FOR ALL TO authenticated
 USING (public.pode_gerir_concurso_analista(concurso_id)) WITH CHECK (public.pode_gerir_concurso_analista(concurso_id));
CREATE POLICY "Desembargador corrige inscricoes de Analista" ON public.inscricoes_concurso FOR UPDATE TO authenticated
 USING (public.pode_gerir_concurso_analista(concurso_id)) WITH CHECK (public.pode_gerir_concurso_analista(concurso_id));
CREATE POLICY "Desembargador corrige respostas de Analista" ON public.respostas_concurso FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.inscricoes_concurso i WHERE i.id = inscricao_id AND public.pode_gerir_concurso_analista(i.concurso_id)))
 WITH CHECK (EXISTS (SELECT 1 FROM public.inscricoes_concurso i WHERE i.id = inscricao_id AND public.pode_gerir_concurso_analista(i.concurso_id)));
CREATE POLICY "Desembargador publica comunicados de Analista" ON public.comunicados_concurso FOR INSERT TO authenticated
 WITH CHECK (public.pode_gerir_concurso_analista(concurso_id) AND autor_id = auth.uid());
NOTIFY pgrst, 'reload schema';
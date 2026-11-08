CREATE OR REPLACE FUNCTION public.pode_gerir_concurso_defensoria(_concurso_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'defensor_publico_geral'::public.user_role)
 AND EXISTS (SELECT 1 FROM public.concursos c WHERE c.id = _concurso_id AND c.cargo = 'Defensor Público');
$$;
REVOKE ALL ON FUNCTION public.pode_gerir_concurso_defensoria(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_concurso_defensoria(uuid) TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.concursos TO authenticated;
GRANT SELECT ON public.concursos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questoes_concurso TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inscricoes_concurso, public.respostas_concurso TO authenticated;
GRANT SELECT, INSERT ON public.comunicados_concurso TO authenticated;
GRANT ALL ON public.concursos, public.questoes_concurso, public.inscricoes_concurso, public.respostas_concurso, public.comunicados_concurso TO service_role;
CREATE POLICY "DPG cria concursos da Defensoria" ON public.concursos FOR INSERT TO authenticated
 WITH CHECK (public.has_role(auth.uid(), 'defensor_publico_geral') AND cargo = 'Defensor Público' AND criado_por = auth.uid());
CREATE POLICY "DPG edita concursos da Defensoria" ON public.concursos FOR UPDATE TO authenticated
 USING (public.has_role(auth.uid(), 'defensor_publico_geral') AND cargo = 'Defensor Público')
 WITH CHECK (public.has_role(auth.uid(), 'defensor_publico_geral') AND cargo = 'Defensor Público');
CREATE POLICY "DPG administra questoes da Defensoria" ON public.questoes_concurso FOR ALL TO authenticated
 USING (public.pode_gerir_concurso_defensoria(concurso_id)) WITH CHECK (public.pode_gerir_concurso_defensoria(concurso_id));
CREATE POLICY "DPG corrige inscricoes da Defensoria" ON public.inscricoes_concurso FOR UPDATE TO authenticated
 USING (public.pode_gerir_concurso_defensoria(concurso_id)) WITH CHECK (public.pode_gerir_concurso_defensoria(concurso_id));
CREATE POLICY "DPG corrige respostas da Defensoria" ON public.respostas_concurso FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.inscricoes_concurso i WHERE i.id = inscricao_id AND public.pode_gerir_concurso_defensoria(i.concurso_id)))
 WITH CHECK (EXISTS (SELECT 1 FROM public.inscricoes_concurso i WHERE i.id = inscricao_id AND public.pode_gerir_concurso_defensoria(i.concurso_id)));
CREATE POLICY "DPG publica comunicados da Defensoria" ON public.comunicados_concurso FOR INSERT TO authenticated
 WITH CHECK (public.pode_gerir_concurso_defensoria(concurso_id) AND autor_id = auth.uid());
NOTIFY pgrst, 'reload schema';
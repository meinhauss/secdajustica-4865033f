CREATE OR REPLACE FUNCTION public.can_view_processo(_user_id uuid, _processo_id uuid, _sigilo text, _juiz_id uuid, _advogado_autor_id uuid, _advogado_reu_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _sigilo = 'publico' OR _sigilo IS NULL THEN true
    WHEN _sigilo = 'segredo_justica' THEN (
      _user_id IS NOT NULL AND (
        _user_id = _juiz_id OR _user_id = _advogado_autor_id OR _user_id = _advogado_reu_id
        OR EXISTS (SELECT 1 FROM public.procuracoes WHERE processo_id = _processo_id AND advogado_id = _user_id AND status = 'ativa')
        OR EXISTS (SELECT 1 FROM public.interessados_processo WHERE processo_id = _processo_id AND user_id = _user_id)
        OR EXISTS (SELECT 1 FROM public.intimacoes i JOIN public.user_roles ur ON ur.user_id = _user_id AND ur.role::text = i.cargo_intimado
                   WHERE i.processo_id = _processo_id AND i.cargo_intimado IS NOT NULL)
        OR EXISTS (SELECT 1 FROM public.analista_vinculos av WHERE av.analista_id = _user_id AND (
              av.supervisor_id = _juiz_id OR av.supervisor_id = _advogado_autor_id OR av.supervisor_id = _advogado_reu_id
              OR EXISTS (SELECT 1 FROM public.interessados_processo ip WHERE ip.processo_id = _processo_id AND ip.user_id = av.supervisor_id)))
        OR has_role(_user_id, 'admin') OR has_role(_user_id, 'magistrado') OR has_role(_user_id, 'ministerio_publico')
        OR has_role(_user_id, 'presidente_tribunal') OR has_role(_user_id, 'desembargador')
        OR has_role(_user_id, 'procurador_geral') OR has_role(_user_id, 'procurador_geral_adjunto')
        OR has_role(_user_id, 'delegado')
      )
    )
    WHEN _sigilo = 'sigilo_absoluto' THEN (
      _user_id IS NOT NULL AND (
        _user_id = _juiz_id OR _user_id = _advogado_autor_id OR _user_id = _advogado_reu_id
        OR EXISTS (SELECT 1 FROM public.procuracoes WHERE processo_id = _processo_id AND advogado_id = _user_id AND status = 'ativa')
        OR EXISTS (SELECT 1 FROM public.interessados_processo WHERE processo_id = _processo_id AND user_id = _user_id)
        OR EXISTS (SELECT 1 FROM public.intimacoes i JOIN public.user_roles ur ON ur.user_id = _user_id AND ur.role::text = i.cargo_intimado
                   WHERE i.processo_id = _processo_id AND i.cargo_intimado IS NOT NULL)
        OR EXISTS (SELECT 1 FROM public.analista_vinculos av WHERE av.analista_id = _user_id AND (
              av.supervisor_id = _juiz_id OR av.supervisor_id = _advogado_autor_id OR av.supervisor_id = _advogado_reu_id
              OR EXISTS (SELECT 1 FROM public.interessados_processo ip WHERE ip.processo_id = _processo_id AND ip.user_id = av.supervisor_id)))
        OR has_role(_user_id, 'admin') OR has_role(_user_id, 'presidente_tribunal')
      )
    )
    ELSE true
  END
$$;

CREATE OR REPLACE FUNCTION public.is_staff_processual(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_servidor_judiciario(_uid)
    OR public.has_role(_uid,'ministerio_publico') OR public.has_role(_uid,'procurador_geral') OR public.has_role(_uid,'procurador_geral_adjunto')
    OR public.has_role(_uid,'gaeco') OR public.has_role(_uid,'chefe_gaeco')
    OR public.has_role(_uid,'defensor_publico') OR public.has_role(_uid,'defensor_publico_geral');
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_corregedoria(_uid uuid, _denuncia_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM denuncias_ouvidoria d WHERE d.id = _denuncia_id AND d.contra_membro AND (
    (d.denunciado_user_id = _uid AND COALESCE(d.corregedoria_status,'nova') <> 'nova')
    OR (d.denunciado_user_id IS DISTINCT FROM _uid AND pode_corregedoria(_uid, d.orgao_corregedoria))));
$$;
REVOKE EXECUTE ON FUNCTION public.pode_ver_corregedoria(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_corregedoria(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Chefes e representado leem movimentações" ON public.corregedoria_movimentacoes;
CREATE POLICY "Chefes e representado leem movimentações" ON public.corregedoria_movimentacoes FOR SELECT TO authenticated
USING (public.pode_ver_corregedoria(auth.uid(), denuncia_id));
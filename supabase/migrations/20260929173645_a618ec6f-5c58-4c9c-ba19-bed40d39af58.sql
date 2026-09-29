
CREATE OR REPLACE FUNCTION public.pode_atuar_processo(_uid uuid, _processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM processos p WHERE p.id = _processo_id AND (
      p.juiz_id = _uid OR p.relator_id = _uid OR p.advogado_autor_id = _uid OR p.advogado_reu_id = _uid))
    OR EXISTS (SELECT 1 FROM interessados_processo ip WHERE ip.processo_id = _processo_id AND ip.user_id = _uid)
    OR EXISTS (SELECT 1 FROM procuracoes pr WHERE pr.processo_id = _processo_id AND pr.advogado_id = _uid AND pr.status = 'ativa');
$$;
REVOKE EXECUTE ON FUNCTION public.pode_atuar_processo(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_atuar_processo(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_staff_processual(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_servidor_judiciario(_uid)
    OR public.has_role(_uid,'ministerio_publico') OR public.has_role(_uid,'procurador_geral')
    OR public.has_role(_uid,'gaeco') OR public.has_role(_uid,'chefe_gaeco')
    OR public.has_role(_uid,'defensor_publico') OR public.has_role(_uid,'defensor_publico_geral');
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff_processual(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_processual(uuid) TO authenticated;

-- processos
DROP POLICY IF EXISTS "Authenticated can insert processos" ON public.processos;
DROP POLICY IF EXISTS "Authenticated can update processos" ON public.processos;
CREATE POLICY "Cargos podem criar processos" ON public.processos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'cidadao'));
CREATE POLICY "Envolvidos e cargos podem editar processos" ON public.processos FOR UPDATE TO authenticated
  USING (public.is_staff_processual(auth.uid()) OR public.pode_atuar_processo(auth.uid(), id));

-- movimentacoes
DROP POLICY IF EXISTS "Authenticated can insert movimentacoes" ON public.movimentacoes;
CREATE POLICY "Autor da movimentacao e quem grava" ON public.movimentacoes FOR INSERT TO authenticated
  WITH CHECK (autor_id IS NULL OR autor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM analista_vinculos av WHERE av.analista_id = movimentacoes.autor_id AND av.supervisor_id = auth.uid()));

-- audiencias
DROP POLICY IF EXISTS "Authenticated can insert audiencias" ON public.audiencias;
DROP POLICY IF EXISTS "Authenticated can update audiencias" ON public.audiencias;
CREATE POLICY "Agendador e cargos criam audiencias" ON public.audiencias FOR INSERT TO authenticated
  WITH CHECK ((criado_por IS NULL OR criado_por = auth.uid()
      OR EXISTS (SELECT 1 FROM analista_vinculos av WHERE av.analista_id = audiencias.criado_por AND av.supervisor_id = auth.uid()))
    AND (public.is_staff_processual(auth.uid()) OR criado_por = auth.uid()
      OR (processo_id IS NOT NULL AND public.pode_atuar_processo(auth.uid(), processo_id))));
CREATE POLICY "Agendador e cargos editam audiencias" ON public.audiencias FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.is_staff_processual(auth.uid()));

-- envolvidos_audiencia
DROP POLICY IF EXISTS "Authenticated can insert envolvidos audiencia" ON public.envolvidos_audiencia;
DROP POLICY IF EXISTS "Authenticated can delete envolvidos audiencia" ON public.envolvidos_audiencia;
CREATE POLICY "Agendador e cargos inserem envolvidos" ON public.envolvidos_audiencia FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_processual(auth.uid()) OR EXISTS (SELECT 1 FROM audiencias a WHERE a.id = audiencia_id AND a.criado_por = auth.uid()));
CREATE POLICY "Agendador e cargos removem envolvidos" ON public.envolvidos_audiencia FOR DELETE TO authenticated
  USING (public.is_staff_processual(auth.uid()) OR EXISTS (SELECT 1 FROM audiencias a WHERE a.id = audiencia_id AND a.criado_por = auth.uid()));

-- concursos
DROP POLICY IF EXISTS "Admin can insert concursos" ON public.concursos;
DROP POLICY IF EXISTS "Admin can update concursos" ON public.concursos;
CREATE POLICY "Administracao cria concursos" ON public.concursos FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal') OR has_role(auth.uid(),'presidente_oab'));
CREATE POLICY "Administracao edita concursos" ON public.concursos FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal') OR has_role(auth.uid(),'presidente_oab'));

-- comunicados_oab
DROP POLICY IF EXISTS "Admin can insert comunicados" ON public.comunicados_oab;
CREATE POLICY "OAB publica comunicados" ON public.comunicados_oab FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab'));

-- documentos_processo
DROP POLICY IF EXISTS "Authenticated can insert docs" ON public.documentos_processo;
CREATE POLICY "Autor ou servidor junta documentos" ON public.documentos_processo FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() OR public.is_staff_processual(auth.uid()));

-- interessados_processo
DROP POLICY IF EXISTS "Authenticated can insert interessados" ON public.interessados_processo;
CREATE POLICY "Proprio usuario ou servidor adiciona interessado" ON public.interessados_processo FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_servidor_judiciario(auth.uid()));

-- procedimentos_disciplinares
DROP POLICY IF EXISTS "Authenticated can insert disciplinares" ON public.procedimentos_disciplinares;
DROP POLICY IF EXISTS "Authenticated can update disciplinares" ON public.procedimentos_disciplinares;
CREATE POLICY "Denunciante abre procedimento" ON public.procedimentos_disciplinares FOR INSERT TO authenticated
  WITH CHECK (denunciante_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab'));
CREATE POLICY "OAB conduz procedimento" ON public.procedimentos_disciplinares FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab'));

-- storage
DROP POLICY IF EXISTS "Authenticated can upload process docs" ON storage.objects;
CREATE POLICY "Authenticated can upload process docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-processuais' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY IF EXISTS "Public can read process docs" ON storage.objects;
CREATE POLICY "Owners can read process docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-processuais' AND owner_id = (auth.uid())::text);
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Owners can list own avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);

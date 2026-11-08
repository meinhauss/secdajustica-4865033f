ALTER TABLE public.denuncias_ouvidoria
  ADD COLUMN IF NOT EXISTS contra_membro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS denunciado_id_personagem text,
  ADD COLUMN IF NOT EXISTS denunciado_user_id uuid,
  ADD COLUMN IF NOT EXISTS denunciado_nome text,
  ADD COLUMN IF NOT EXISTS denunciado_cargos text[],
  ADD COLUMN IF NOT EXISTS orgao_corregedoria text,
  ADD COLUMN IF NOT EXISTS indicio_crime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encaminhada_mp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS corregedoria_status text,
  ADD COLUMN IF NOT EXISTS corregedoria_motivo text,
  ADD COLUMN IF NOT EXISTS corregedoria_decisao text,
  ADD COLUMN IF NOT EXISTS corregedoria_responsavel_id uuid,
  ADD COLUMN IF NOT EXISTS corregedoria_atualizado_em timestamptz;

CREATE OR REPLACE FUNCTION public.orgao_do_membro(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id=_uid AND role::text IN ('magistrado','desembargador','presidente_tribunal','oficial_justica')) THEN 'tj'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id=_uid AND role::text IN ('ministerio_publico','procurador_geral','procurador_geral_adjunto','gaeco','chefe_gaeco')) THEN 'mp'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id=_uid AND role::text IN ('defensor_publico','defensor_publico_geral')) THEN 'dp'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id=_uid AND role::text IN ('advogado','bacharel_direito','presidente_oab')) THEN 'oab'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.pode_corregedoria(_uid uuid, _orgao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_role(_uid,'admin') OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id=_uid AND (
      (_orgao='tj' AND role::text IN ('desembargador','presidente_tribunal')) OR
      (_orgao='mp' AND role::text IN ('procurador_geral','procurador_geral_adjunto')) OR
      (_orgao='dp' AND role::text = 'defensor_publico_geral') OR
      (_orgao='oab' AND role::text = 'presidente_oab')))
$$;

CREATE OR REPLACE FUNCTION public.buscar_membro_juridico(_id_personagem text)
RETURNS TABLE(nome text, cargos text[], orgao text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.nome_completo,
    ARRAY(SELECT ur.role::text FROM user_roles ur WHERE ur.user_id=p.user_id AND ur.role::text NOT IN ('cidadao','admin','analista','hospital','detran','policia_civil','policia_militar','policia_federal','delegado','investigador','corregedor')),
    orgao_do_membro(p.user_id)
  FROM profiles p
  WHERE trim(p.id_personagem) = trim(_id_personagem) AND orgao_do_membro(p.user_id) IS NOT NULL
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.buscar_membro_juridico(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.preparar_denuncia_membro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p record;
BEGIN
  NEW.corregedoria_status := NULL; NEW.corregedoria_motivo := NULL; NEW.corregedoria_decisao := NULL;
  NEW.corregedoria_responsavel_id := NULL; NEW.denunciado_user_id := NULL; NEW.orgao_corregedoria := NULL;
  IF NOT NEW.contra_membro THEN
    NEW.indicio_crime := false; NEW.encaminhada_mp := false; RETURN NEW;
  END IF;
  SELECT p.user_id, p.nome_completo INTO _p FROM profiles p
   WHERE trim(p.id_personagem)=trim(COALESCE(NEW.denunciado_id_personagem,'')) AND orgao_do_membro(p.user_id) IS NOT NULL LIMIT 1;
  IF _p.user_id IS NULL THEN RAISE EXCEPTION 'Membro do sistema de justiça não encontrado para o RG informado'; END IF;
  NEW.denunciado_user_id := _p.user_id;
  NEW.denunciado_nome := _p.nome_completo;
  NEW.denunciado_cargos := ARRAY(SELECT role::text FROM user_roles WHERE user_id=_p.user_id);
  NEW.orgao_corregedoria := orgao_do_membro(_p.user_id);
  NEW.corregedoria_status := 'nova';
  NEW.encaminhada_mp := NEW.indicio_crime;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_preparar_denuncia_membro ON public.denuncias_ouvidoria;
CREATE TRIGGER trg_preparar_denuncia_membro BEFORE INSERT ON public.denuncias_ouvidoria
FOR EACH ROW EXECUTE FUNCTION public.preparar_denuncia_membro();

CREATE OR REPLACE FUNCTION public.notify_ouvidoria_promotores()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _u RECORD; _resumo TEXT;
BEGIN
  _resumo := regexp_replace(COALESCE(NEW.descricao, ''), '\s+', ' ', 'g');
  IF length(_resumo) > 180 THEN _resumo := left(_resumo, 177) || '...'; END IF;
  IF NOT NEW.contra_membro OR NEW.encaminhada_mp THEN
    FOR _u IN SELECT DISTINCT user_id FROM user_roles WHERE role::text IN ('ministerio_publico','procurador_geral','procurador_geral_adjunto')
      AND user_id IS DISTINCT FROM NEW.denunciado_user_id LOOP
      INSERT INTO notificacoes (user_id,titulo,mensagem,tipo,link_secao) VALUES (_u.user_id,
        'Nova Manifestação na Ouvidoria do MP',
        'Nova manifestação protocolada por ' || COALESCE(NULLIF(TRIM(NEW.nome_denunciante),''),'Cidadão Anônimo') || E':\n"' || _resumo || E'"\nAcesse o Portal do MP para análise.',
        'ouvidoria','mp:' || NEW.id::text);
    END LOOP;
  END IF;
  IF NEW.contra_membro THEN
    FOR _u IN SELECT DISTINCT user_id FROM user_roles WHERE user_id IS DISTINCT FROM NEW.denunciado_user_id
      AND pode_corregedoria(user_id, NEW.orgao_corregedoria) AND NOT has_role(user_id,'admin') LOOP
      INSERT INTO notificacoes (user_id,titulo,mensagem,tipo,link_secao) VALUES (_u.user_id,
        'Nova representação na Corregedoria', 'Representação contra ' || COALESCE(NEW.denunciado_nome,'membro') || E':\n"' || _resumo || '"',
        'ouvidoria','corregedoria');
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Falha ao notificar denúncia %: %', NEW.id, SQLERRM; RETURN NEW;
END $$;

DROP POLICY IF EXISTS "MP and admin can read denuncias ouvidoria" ON public.denuncias_ouvidoria;
DROP POLICY IF EXISTS "MP and admin can update denuncias ouvidoria" ON public.denuncias_ouvidoria;
CREATE POLICY "MP and admin can read denuncias ouvidoria" ON public.denuncias_ouvidoria FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR (
  (has_role(auth.uid(),'ministerio_publico') OR has_role(auth.uid(),'procurador_geral') OR has_role(auth.uid(),'procurador_geral_adjunto'))
  AND (NOT contra_membro OR encaminhada_mp) AND denunciado_user_id IS DISTINCT FROM auth.uid()));
CREATE POLICY "MP and admin can update denuncias ouvidoria" ON public.denuncias_ouvidoria FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin') OR (
  (has_role(auth.uid(),'ministerio_publico') OR has_role(auth.uid(),'procurador_geral') OR has_role(auth.uid(),'procurador_geral_adjunto'))
  AND (NOT contra_membro OR encaminhada_mp) AND denunciado_user_id IS DISTINCT FROM auth.uid()));
CREATE POLICY "Corregedoria le denuncias do orgao" ON public.denuncias_ouvidoria FOR SELECT TO authenticated
USING (contra_membro AND denunciado_user_id IS DISTINCT FROM auth.uid() AND pode_corregedoria(auth.uid(), orgao_corregedoria));

CREATE OR REPLACE FUNCTION public.decidir_corregedoria(_id uuid, _acao text, _texto text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d record;
BEGIN
  SELECT * INTO _d FROM denuncias_ouvidoria WHERE id=_id AND contra_membro;
  IF _d.id IS NULL THEN RAISE EXCEPTION 'Representação não encontrada'; END IF;
  IF _d.denunciado_user_id = auth.uid() OR NOT pode_corregedoria(auth.uid(), _d.orgao_corregedoria) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF length(trim(COALESCE(_texto,''))) < 10 THEN RAISE EXCEPTION 'Informe a fundamentação (mínimo 10 caracteres)'; END IF;
  IF _acao = 'aceitar' AND _d.corregedoria_status = 'nova' THEN
    UPDATE denuncias_ouvidoria SET corregedoria_status='em_apuracao', corregedoria_motivo=_texto WHERE id=_id;
  ELSIF _acao = 'arquivar' AND _d.corregedoria_status IN ('nova','em_apuracao') THEN
    UPDATE denuncias_ouvidoria SET corregedoria_status='arquivada', corregedoria_decisao=_texto WHERE id=_id;
  ELSIF _acao = 'concluir' AND _d.corregedoria_status = 'em_apuracao' THEN
    UPDATE denuncias_ouvidoria SET corregedoria_status='concluida', corregedoria_decisao=_texto WHERE id=_id;
  ELSIF _acao = 'remeter_mp' AND NOT _d.encaminhada_mp THEN
    UPDATE denuncias_ouvidoria SET encaminhada_mp=true, corregedoria_motivo=COALESCE(corregedoria_motivo,'') || E'\nRemessa ao MP: ' || _texto WHERE id=_id;
    INSERT INTO notificacoes (user_id,titulo,mensagem,tipo,link_secao)
      SELECT DISTINCT user_id,'Representação remetida pela Corregedoria','Indícios de crime contra ' || COALESCE(_d.denunciado_nome,'membro') || ' para avaliação.','ouvidoria','mp:' || _id::text
      FROM user_roles WHERE role::text IN ('ministerio_publico','procurador_geral','procurador_geral_adjunto') AND user_id IS DISTINCT FROM _d.denunciado_user_id;
  ELSE RAISE EXCEPTION 'Ação inválida para a situação atual'; END IF;
  UPDATE denuncias_ouvidoria SET corregedoria_responsavel_id=auth.uid(), corregedoria_atualizado_em=now() WHERE id=_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.decidir_corregedoria(uuid,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.decidir_corregedoria(uuid,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
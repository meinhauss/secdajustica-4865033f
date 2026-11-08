ALTER TABLE public.denuncias_ouvidoria ADD COLUMN IF NOT EXISTS defesa_prazo timestamptz, ADD COLUMN IF NOT EXISTS defesa_texto text, ADD COLUMN IF NOT EXISTS defesa_em timestamptz;

CREATE TABLE public.corregedoria_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.denuncias_ouvidoria(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  texto text NOT NULL,
  autor_id uuid,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.corregedoria_movimentacoes TO authenticated;
GRANT ALL ON public.corregedoria_movimentacoes TO service_role;
ALTER TABLE public.corregedoria_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chefes e representado leem movimentações" ON public.corregedoria_movimentacoes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.denuncias_ouvidoria d WHERE d.id = denuncia_id AND (d.denunciado_user_id = auth.uid() OR (d.denunciado_user_id IS DISTINCT FROM auth.uid() AND public.pode_corregedoria(auth.uid(), d.orgao_corregedoria)))));

CREATE OR REPLACE FUNCTION public.corregedoria_registrar(_d public.denuncias_ouvidoria, _tipo text, _texto text, _titulo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _nome text;
BEGIN
  SELECT nome_completo INTO _nome FROM profiles WHERE user_id = auth.uid();
  INSERT INTO corregedoria_movimentacoes (denuncia_id, tipo, texto, autor_id, autor_nome) VALUES (_d.id, _tipo, _texto, auth.uid(), _nome);
  INSERT INTO notificacoes (user_id, titulo, mensagem, tipo, link_secao)
  SELECT DISTINCT ur.user_id, _titulo, 'Representação ' || upper(left(_d.id::text,8)) || ' — ' || COALESCE(_d.denunciado_nome,'membro'), 'corregedoria', 'corregedoria'
  FROM user_roles ur
  WHERE ur.user_id IS DISTINCT FROM auth.uid() AND ur.user_id IS DISTINCT FROM _d.denunciado_user_id
    AND pode_corregedoria(ur.user_id, _d.orgao_corregedoria) AND (NOT has_role(ur.user_id,'admin') OR EXISTS (SELECT 1 FROM user_roles x WHERE x.user_id=ur.user_id AND x.role::text <> 'admin' AND pode_corregedoria(ur.user_id,_d.orgao_corregedoria)));
  IF _d.denunciado_user_id IS NOT NULL AND _d.denunciado_user_id IS DISTINCT FROM auth.uid() THEN
    INSERT INTO notificacoes (user_id, titulo, mensagem, tipo, link_secao)
    VALUES (_d.denunciado_user_id, _titulo, 'Movimentação na representação disciplinar ' || upper(left(_d.id::text,8)) || ' em que você figura como representado.', 'corregedoria', 'corregedoria');
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.corregedoria_registrar(public.denuncias_ouvidoria, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.decidir_corregedoria(_id uuid, _acao text, _texto text, _prazo_dias integer DEFAULT 5)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _d denuncias_ouvidoria; _dias int := LEAST(GREATEST(COALESCE(_prazo_dias,5),1),30);
BEGIN
  SELECT * INTO _d FROM denuncias_ouvidoria WHERE id=_id AND contra_membro;
  IF _d.id IS NULL THEN RAISE EXCEPTION 'Representação não encontrada'; END IF;
  IF _d.denunciado_user_id = auth.uid() OR NOT pode_corregedoria(auth.uid(), _d.orgao_corregedoria) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF length(trim(COALESCE(_texto,''))) < 10 THEN RAISE EXCEPTION 'Informe a fundamentação (mínimo 10 caracteres)'; END IF;
  IF _acao = 'aceitar' AND _d.corregedoria_status = 'nova' THEN
    UPDATE denuncias_ouvidoria SET corregedoria_status='aguardando_defesa', corregedoria_motivo=_texto, defesa_prazo=now() + make_interval(days=>_dias) WHERE id=_id;
    PERFORM corregedoria_registrar(_d, 'instauracao', _texto || E'\n\nIntimação do representado para apresentar defesa em ' || _dias || ' dia(s).', 'Procedimento disciplinar instaurado');
  ELSIF _acao = 'intimar_defesa' AND _d.corregedoria_status IN ('em_apuracao','defesa_apresentada') THEN
    UPDATE denuncias_ouvidoria SET corregedoria_status='aguardando_defesa', defesa_prazo=now() + make_interval(days=>_dias) WHERE id=_id;
    PERFORM corregedoria_registrar(_d, 'intimacao', _texto || E'\n\nPrazo para manifestação: ' || _dias || ' dia(s).', 'Intimação para manifestação na Corregedoria');
  ELSIF _acao = 'despacho' AND _d.corregedoria_status IN ('em_apuracao','aguardando_defesa','defesa_apresentada') THEN
    PERFORM corregedoria_registrar(_d, 'despacho', _texto, 'Novo despacho na Corregedoria');
  ELSIF _acao = 'arquivar' AND _d.corregedoria_status IN ('nova','em_apuracao','aguardando_defesa','defesa_apresentada') THEN
    UPDATE denuncias_ouvidoria SET corregedoria_status='arquivada', corregedoria_decisao=_texto WHERE id=_id;
    PERFORM corregedoria_registrar(_d, 'arquivamento', _texto, 'Representação arquivada');
  ELSIF _acao = 'concluir' AND (_d.corregedoria_status IN ('em_apuracao','defesa_apresentada') OR (_d.corregedoria_status='aguardando_defesa' AND _d.defesa_prazo < now())) THEN
    UPDATE denuncias_ouvidoria SET corregedoria_status='concluida', corregedoria_decisao=_texto WHERE id=_id;
    PERFORM corregedoria_registrar(_d, 'decisao', CASE WHEN _d.corregedoria_status='aguardando_defesa' THEN E'[Prazo de defesa decorrido sem manifestação]\n\n' ELSE '' END || _texto, 'Decisão final da Corregedoria');
  ELSIF _acao = 'concluir' AND _d.corregedoria_status='aguardando_defesa' THEN
    RAISE EXCEPTION 'Aguarde a defesa do representado ou o fim do prazo para decidir';
  ELSIF _acao = 'remeter_mp' AND NOT _d.encaminhada_mp THEN
    UPDATE denuncias_ouvidoria SET encaminhada_mp=true WHERE id=_id;
    INSERT INTO notificacoes (user_id,titulo,mensagem,tipo,link_secao)
      SELECT DISTINCT user_id,'Representação remetida pela Corregedoria','Indícios de crime contra ' || COALESCE(_d.denunciado_nome,'membro') || ' para avaliação.','ouvidoria','mp:' || _id::text
      FROM user_roles WHERE role::text IN ('ministerio_publico','procurador_geral','procurador_geral_adjunto') AND user_id IS DISTINCT FROM _d.denunciado_user_id;
    PERFORM corregedoria_registrar(_d, 'remessa_mp', _texto, 'Representação remetida ao Ministério Público');
  ELSE RAISE EXCEPTION 'Ação inválida para a situação atual'; END IF;
  UPDATE denuncias_ouvidoria SET corregedoria_responsavel_id=auth.uid(), corregedoria_atualizado_em=now() WHERE id=_id;
END $$;
DROP FUNCTION IF EXISTS public.decidir_corregedoria(uuid, text, text);
GRANT EXECUTE ON FUNCTION public.decidir_corregedoria(uuid, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.apresentar_defesa_corregedoria(_id uuid, _texto text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _d denuncias_ouvidoria;
BEGIN
  SELECT * INTO _d FROM denuncias_ouvidoria WHERE id=_id AND contra_membro AND denunciado_user_id = auth.uid();
  IF _d.id IS NULL THEN RAISE EXCEPTION 'Representação não encontrada'; END IF;
  IF _d.corregedoria_status NOT IN ('aguardando_defesa','em_apuracao','defesa_apresentada') THEN RAISE EXCEPTION 'O procedimento não admite manifestação nesta fase'; END IF;
  IF length(trim(COALESCE(_texto,''))) < 20 THEN RAISE EXCEPTION 'A defesa deve ter ao menos 20 caracteres'; END IF;
  UPDATE denuncias_ouvidoria SET corregedoria_status='defesa_apresentada', defesa_texto=_texto, defesa_em=now(), corregedoria_atualizado_em=now() WHERE id=_id;
  PERFORM corregedoria_registrar(_d, 'defesa', _texto, 'Defesa apresentada na Corregedoria');
END $$;
GRANT EXECUTE ON FUNCTION public.apresentar_defesa_corregedoria(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.minhas_representacoes()
RETURNS TABLE(id uuid, created_at timestamptz, descricao text, orgao_corregedoria text, corregedoria_status text, corregedoria_motivo text, corregedoria_decisao text, defesa_prazo timestamptz, defesa_texto text, defesa_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id, created_at, descricao, orgao_corregedoria, corregedoria_status, corregedoria_motivo, corregedoria_decisao, defesa_prazo, defesa_texto, defesa_em
  FROM denuncias_ouvidoria WHERE contra_membro AND denunciado_user_id = auth.uid() AND corregedoria_status <> 'nova' ORDER BY created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.minhas_representacoes() TO authenticated;
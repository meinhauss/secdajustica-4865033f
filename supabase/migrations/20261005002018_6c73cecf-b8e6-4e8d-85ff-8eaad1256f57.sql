CREATE OR REPLACE FUNCTION public.redistribuir_por_suspeicao(_processo_id uuid, _justificativa text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _p record;
  _novo uuid;
  _nome text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF coalesce(trim(_justificativa),'') = '' THEN RAISE EXCEPTION 'Informe a justificativa.'; END IF;
  SELECT * INTO _p FROM processos WHERE id = _processo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Processo não encontrado.'; END IF;
  IF NOT (_p.juiz_id = _uid OR _p.relator_id = _uid OR has_role(_uid,'admin') OR has_role(_uid,'presidente_tribunal')) THEN
    RAISE EXCEPTION 'Apenas o magistrado do processo pode declarar suspeição.';
  END IF;

  SELECT ur.user_id INTO _novo
  FROM user_roles ur JOIN profiles pr ON pr.user_id = ur.user_id
  WHERE ur.role IN ('magistrado','desembargador')
    AND ur.user_id <> _uid
    AND ur.user_id IS DISTINCT FROM _p.juiz_id
    AND coalesce(pr.recesso,false) = false
  GROUP BY ur.user_id
  ORDER BY (SELECT count(*) FROM processos x WHERE x.juiz_id = ur.user_id
            AND x.status NOT IN ('arquivado','sentenciado','suspenso')) ASC, random()
  LIMIT 1;

  IF _novo IS NULL THEN
    RAISE EXCEPTION 'Não há outro magistrado disponível (fora de recesso) para receber o processo.';
  END IF;

  SELECT nome_completo INTO _nome FROM profiles WHERE user_id = _uid;

  INSERT INTO movimentacoes (processo_id, tipo, descricao, autor_id) VALUES
    (_processo_id, 'suspeicao', 'DECLARAÇÃO DE SUSPEIÇÃO' || E'\n\n' || 'O(A) Magistrado(a) ' || coalesce(_nome,'') || ' declarou-se suspeito(a) para atuar neste processo.' || E'\n\n' || 'Justificativa: ' || _justificativa, _uid);

  UPDATE processos SET juiz_id = _novo, updated_at = now() WHERE id = _processo_id;

  INSERT INTO movimentacoes (processo_id, tipo, descricao, autor_id) VALUES
    (_processo_id, 'redistribuicao', 'Processo redistribuído por sorteio a novo magistrado em razão de declaração de suspeição.', _uid);

  RETURN _novo;
END $$;
REVOKE EXECUTE ON FUNCTION public.redistribuir_por_suspeicao(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redistribuir_por_suspeicao(uuid, text) TO authenticated;
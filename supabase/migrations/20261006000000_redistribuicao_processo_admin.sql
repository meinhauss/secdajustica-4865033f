-- Redistribuição de processos exclusivamente por administradores.
CREATE OR REPLACE FUNCTION public.redistribuir_processo_admin(
  _processo_id UUID,
  _novo_responsavel_id UUID DEFAULT NULL,
  _metodo TEXT DEFAULT 'automatico',
  _justificativa TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _processo public.processos%ROWTYPE;
  _novo_responsavel UUID;
  _responsavel_anterior UUID;
  _nome_anterior TEXT;
  _nome_novo TEXT;
  _nome_admin TEXT;
  _campo_responsavel TEXT;
  _papel_responsavel public.user_role;
  _descricao TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem redistribuir processos';
  END IF;

  IF COALESCE(length(trim(_justificativa)), 0) < 10 THEN
    RAISE EXCEPTION 'A justificativa administrativa deve ter pelo menos 10 caracteres';
  END IF;

  IF _metodo NOT IN ('automatico', 'manual') THEN
    RAISE EXCEPTION 'Método de redistribuição inválido';
  END IF;

  SELECT * INTO _processo
  FROM public.processos
  WHERE id = _processo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Processo não encontrado';
  END IF;

  IF _processo.instancia = 2 THEN
    _campo_responsavel := 'relator_id';
    _papel_responsavel := 'desembargador'::public.user_role;
    _responsavel_anterior := _processo.relator_id;
  ELSE
    _campo_responsavel := 'juiz_id';
    _papel_responsavel := 'magistrado'::public.user_role;
    _responsavel_anterior := _processo.juiz_id;
  END IF;

  SELECT nome_completo INTO _nome_anterior
  FROM public.profiles
  WHERE user_id = _responsavel_anterior;

  SELECT nome_completo INTO _nome_admin
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF _metodo = 'manual' THEN
    IF _novo_responsavel_id IS NULL THEN
      RAISE EXCEPTION 'É necessário informar o novo magistrado ou relator';
    END IF;

    IF _novo_responsavel_id = _responsavel_anterior THEN
      RAISE EXCEPTION 'O novo responsável deve ser diferente do responsável atual';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = _novo_responsavel_id
        AND p.recesso IS FALSE
        AND public.has_role(p.user_id, _papel_responsavel)
    ) THEN
      RAISE EXCEPTION 'O responsável selecionado não está apto para receber o processo';
    END IF;
  ELSE
    SELECT p.user_id INTO _novo_responsavel
    FROM public.profiles p
    WHERE p.recesso IS FALSE
      AND p.user_id <> COALESCE(_responsavel_anterior, '00000000-0000-0000-0000-000000000000'::UUID)
      AND public.has_role(p.user_id, _papel_responsavel)
    ORDER BY (
      SELECT count(*)
      FROM public.processos pr
      WHERE (CASE WHEN _processo.instancia = 2 THEN pr.relator_id ELSE pr.juiz_id END) = p.user_id
        AND pr.status IN ('novo', 'em_andamento', 'concluso', 'suspenso')
    ), p.nome_completo
    LIMIT 1;

    IF _novo_responsavel IS NULL THEN
      RAISE EXCEPTION 'Não há responsável apto disponível para a redistribuição';
    END IF;
  END IF;

  IF _metodo = 'manual' THEN
    _novo_responsavel := _novo_responsavel_id;
  END IF;

  SELECT nome_completo INTO _nome_novo
  FROM public.profiles
  WHERE user_id = _novo_responsavel;

  IF _processo.instancia = 2 THEN
    UPDATE public.processos
    SET relator_id = _novo_responsavel, updated_at = now()
    WHERE id = _processo_id;
  ELSE
    UPDATE public.processos
    SET juiz_id = _novo_responsavel, updated_at = now()
    WHERE id = _processo_id;
  END IF;

  _descricao := 'REDISTRIBUIÇÃO DE PROCESSO POR DETERMINAÇÃO ADMINISTRATIVA' || E'\n\n'
    || 'Magistrado anterior: ' || COALESCE(_nome_anterior, 'Não informado') || E'\n'
    || 'Novo magistrado designado: ' || COALESCE(_nome_novo, 'Não informado') || E'\n'
    || 'Responsável pela redistribuição: ' || COALESCE(_nome_admin, 'Administrador') || E'\n'
    || 'Motivação: ' || trim(_justificativa);

  INSERT INTO public.movimentacoes (processo_id, tipo, autor_id, descricao)
  VALUES (_processo_id, 'redistribuicao', auth.uid(), _descricao);

  IF _novo_responsavel IS NOT NULL THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
    VALUES (
      _novo_responsavel,
      'Processo redistribuído',
      'O processo nº ' || _processo.numero || ' foi redistribuído para o seu gabinete por determinação administrativa.',
      'redistribuicao',
      'processos'
    );
  END IF;

  IF _responsavel_anterior IS NOT NULL AND _responsavel_anterior <> _novo_responsavel THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
    VALUES (
      _responsavel_anterior,
      'Desvinculação de processo',
      'O processo nº ' || _processo.numero || ' foi redistribuído e não está mais sob sua responsabilidade.',
      'redistribuicao',
      'processos'
    );
  END IF;

  RETURN _novo_responsavel;
END;
$$;

REVOKE ALL ON FUNCTION public.redistribuir_processo_admin(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redistribuir_processo_admin(UUID, UUID, TEXT, TEXT) TO authenticated;

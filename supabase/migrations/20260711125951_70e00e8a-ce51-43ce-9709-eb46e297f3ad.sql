
CREATE OR REPLACE FUNCTION public.notify_concurso_evento(
  _user_id uuid,
  _titulo text,
  _mensagem text,
  _tipo text DEFAULT 'concurso',
  _link_secao text DEFAULT 'concursos'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF NOT (
    has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'presidente_tribunal')
    OR has_role(auth.uid(),'ministerio_publico')
    OR has_role(auth.uid(),'procurador_geral')
    OR has_role(auth.uid(),'chefe_gaeco')
    OR auth.uid() = _user_id
  ) THEN
    RAISE EXCEPTION 'Sem permissão para enviar notificação';
  END IF;

  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
  VALUES (_user_id, _titulo, _mensagem, _tipo, _link_secao)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_concurso_evento(uuid, text, text, text, text) TO authenticated;

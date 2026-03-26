
-- Function to notify all users with a specific role about an intimação in a process
CREATE OR REPLACE FUNCTION public.notify_cargo_intimacao(
  _processo_id UUID,
  _cargo user_role,
  _conteudo TEXT,
  _autor_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proc RECORD;
  _user_id UUID;
  _cargo_label TEXT;
BEGIN
  SELECT numero, sigilo, juiz_id, advogado_autor_id, advogado_reu_id
  INTO _proc
  FROM public.processos WHERE id = _processo_id;

  -- Map cargo to readable label
  _cargo_label := CASE _cargo
    WHEN 'admin' THEN 'Administrador'
    WHEN 'magistrado' THEN 'Juiz(a) de Direito'
    WHEN 'ministerio_publico' THEN 'Promotor(a) de Justiça'
    WHEN 'procurador_geral' THEN 'Procurador(a)-Geral'
    WHEN 'oficial_justica' THEN 'Oficial de Justiça'
    WHEN 'advogado' THEN 'Advogado(a)'
    WHEN 'presidente_tribunal' THEN 'Presidente do Tribunal'
    WHEN 'desembargador' THEN 'Desembargador(a)'
    WHEN 'presidente_oab' THEN 'Presidente da OAB'
    WHEN 'policia_civil' THEN 'Polícia Civil'
    WHEN 'policia_militar' THEN 'Polícia Militar'
    WHEN 'policia_federal' THEN 'Polícia Federal'
    WHEN 'hospital' THEN 'Hospital'
    ELSE _cargo::text
  END;

  FOR _user_id IN
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = _cargo AND ur.user_id != _autor_id
  LOOP
    -- Respect sigilo
    IF NOT can_view_processo(_user_id, _processo_id, COALESCE(_proc.sigilo, 'publico'), _proc.juiz_id, _proc.advogado_autor_id, _proc.advogado_reu_id) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
    VALUES (
      _user_id,
      'Intimação ao cargo ' || _cargo_label || ' — Processo ' || _proc.numero,
      _conteudo,
      'intimacao',
      'processos:' || _processo_id::text
    );
  END LOOP;
END;
$$;


-- Update can_view_processo: remove police and hospital from automatic access
CREATE OR REPLACE FUNCTION public.can_view_processo(_user_id uuid, _processo_id uuid, _sigilo text, _juiz_id uuid, _advogado_autor_id uuid, _advogado_reu_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $$
  SELECT CASE
    WHEN _sigilo = 'publico' OR _sigilo IS NULL THEN true
    WHEN _sigilo = 'segredo_justica' THEN (
      _user_id IS NOT NULL AND (
        _user_id = _juiz_id
        OR _user_id = _advogado_autor_id
        OR _user_id = _advogado_reu_id
        OR EXISTS (
          SELECT 1 FROM public.procuracoes
          WHERE processo_id = _processo_id
            AND advogado_id = _user_id
            AND status = 'ativa'
        )
        OR EXISTS (
          SELECT 1 FROM public.interessados_processo
          WHERE processo_id = _processo_id
            AND user_id = _user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.intimacoes i
          JOIN public.user_roles ur ON ur.user_id = _user_id AND ur.role::text = i.cargo_intimado
          WHERE i.processo_id = _processo_id
            AND i.cargo_intimado IS NOT NULL
        )
        OR has_role(_user_id, 'admin')
        OR has_role(_user_id, 'magistrado')
        OR has_role(_user_id, 'ministerio_publico')
        OR has_role(_user_id, 'presidente_tribunal')
        OR has_role(_user_id, 'desembargador')
        OR has_role(_user_id, 'procurador_geral')
        OR has_role(_user_id, 'delegado')
      )
    )
    WHEN _sigilo = 'sigilo_absoluto' THEN (
      _user_id IS NOT NULL AND (
        _user_id = _juiz_id
        OR EXISTS (
          SELECT 1 FROM public.interessados_processo
          WHERE processo_id = _processo_id
            AND user_id = _user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.intimacoes i
          JOIN public.user_roles ur ON ur.user_id = _user_id AND ur.role::text = i.cargo_intimado
          WHERE i.processo_id = _processo_id
            AND i.cargo_intimado IS NOT NULL
        )
        OR has_role(_user_id, 'admin')
        OR has_role(_user_id, 'presidente_tribunal')
      )
    )
    ELSE true
  END
$$;

-- Update notify_cargo_intimacao to include delegado label
CREATE OR REPLACE FUNCTION public.notify_cargo_intimacao(_processo_id uuid, _cargo user_role, _conteudo text, _autor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
DECLARE
  _proc RECORD;
  _user_id UUID;
  _cargo_label TEXT;
BEGIN
  SELECT numero, sigilo, juiz_id, advogado_autor_id, advogado_reu_id
  INTO _proc
  FROM public.processos WHERE id = _processo_id;

  _cargo_label := CASE _cargo
    WHEN 'admin' THEN 'Administrador'
    WHEN 'magistrado' THEN 'Juiz(a) de Direito'
    WHEN 'ministerio_publico' THEN 'Promotor(a) de Justiça'
    WHEN 'procurador_geral' THEN 'Procurador(a)-Geral'
    WHEN 'procurador_estado' THEN 'Procurador(a) Geral do Estado'
    WHEN 'oficial_justica' THEN 'Oficial de Justiça'
    WHEN 'advogado' THEN 'Advogado(a)'
    WHEN 'presidente_tribunal' THEN 'Presidente do Tribunal'
    WHEN 'desembargador' THEN 'Desembargador(a)'
    WHEN 'presidente_oab' THEN 'Presidente da OAB'
    WHEN 'bacharel_direito' THEN 'Bacharel em Direito'
    WHEN 'delegado' THEN 'Delegado(a)'
    WHEN 'policia_civil' THEN 'Polícia Civil'
    WHEN 'policia_militar' THEN 'Polícia Militar'
    WHEN 'policia_federal' THEN 'Polícia Federal'
    WHEN 'hospital' THEN 'Hospital'
    ELSE _cargo::text
  END;

  FOR _user_id IN
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = _cargo AND ur.user_id != _autor_id
  LOOP
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

-- Update notify_movimentacao to include delegado
CREATE OR REPLACE FUNCTION public.notify_movimentacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
DECLARE
  _proc RECORD;
  _user_id UUID;
  _sigilo TEXT;
BEGIN
  SELECT p.juiz_id, p.advogado_autor_id, p.advogado_reu_id, p.sigilo, p.numero
  INTO _proc
  FROM public.processos p WHERE p.id = NEW.processo_id;

  _sigilo := COALESCE(_proc.sigilo, 'publico');

  FOR _user_id IN
    SELECT _proc.juiz_id WHERE _proc.juiz_id IS NOT NULL
    UNION
    SELECT _proc.advogado_autor_id WHERE _proc.advogado_autor_id IS NOT NULL
    UNION
    SELECT _proc.advogado_reu_id WHERE _proc.advogado_reu_id IS NOT NULL
    UNION
    SELECT pr.advogado_id FROM public.procuracoes pr
    WHERE pr.processo_id = NEW.processo_id AND pr.status = 'ativa' AND pr.advogado_id IS NOT NULL
    UNION
    SELECT ip.user_id FROM public.interessados_processo ip
    WHERE ip.processo_id = NEW.processo_id
  LOOP
    IF _user_id = NEW.autor_id THEN CONTINUE; END IF;

    IF _sigilo = 'sigilo_absoluto' AND NOT (
      _user_id = _proc.juiz_id
      OR has_role(_user_id, 'admin')
      OR has_role(_user_id, 'presidente_tribunal')
    ) THEN CONTINUE; END IF;

    IF _sigilo = 'segredo_justica' AND NOT (
      _user_id = _proc.juiz_id
      OR _user_id = _proc.advogado_autor_id
      OR _user_id = _proc.advogado_reu_id
      OR EXISTS (SELECT 1 FROM public.procuracoes WHERE processo_id = NEW.processo_id AND advogado_id = _user_id AND status = 'ativa')
      OR has_role(_user_id, 'admin')
      OR has_role(_user_id, 'magistrado')
      OR has_role(_user_id, 'ministerio_publico')
      OR has_role(_user_id, 'presidente_tribunal')
      OR has_role(_user_id, 'desembargador')
      OR has_role(_user_id, 'procurador_geral')
      OR has_role(_user_id, 'delegado')
    ) THEN CONTINUE; END IF;

    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
    VALUES (
      _user_id,
      'Movimentação no Processo ' || _proc.numero,
      NEW.descricao,
      'movimentacao',
      'processos:' || NEW.processo_id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

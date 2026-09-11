
-- Function to create notifications for movimentacoes (process movements)
CREATE OR REPLACE FUNCTION public.notify_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_notify_movimentacao ON public.movimentacoes;
CREATE TRIGGER trg_notify_movimentacao
AFTER INSERT ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.notify_movimentacao();

CREATE OR REPLACE FUNCTION public.notify_intimacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proc_numero TEXT;
BEGIN
  SELECT numero INTO _proc_numero FROM public.processos WHERE id = NEW.processo_id;

  IF NEW.destinatario_id IS NOT NULL THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
    VALUES (
      NEW.destinatario_id,
      'Nova Intimação — Processo ' || COALESCE(_proc_numero, ''),
      NEW.conteudo,
      'intimacao',
      'processos:' || NEW.processo_id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_intimacao ON public.intimacoes;
CREATE TRIGGER trg_notify_intimacao
AFTER INSERT ON public.intimacoes
FOR EACH ROW EXECUTE FUNCTION public.notify_intimacao();

CREATE OR REPLACE FUNCTION public.notify_cartorio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _msg := 'Nova solicitação de ' || NEW.tipo || ' registrada: ' || NEW.descricao;
  ELSE
    _msg := 'Atualização no registro ' || NEW.numero_registro || ': status alterado para ' || NEW.status;
  END IF;

  IF NEW.requerente_id IS NOT NULL THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
    VALUES (
      NEW.requerente_id,
      'Cartório — ' || NEW.numero_registro,
      _msg,
      'cartorio',
      'cartorio'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cartorio_insert ON public.registros_cartorio;
CREATE TRIGGER trg_notify_cartorio_insert
AFTER INSERT ON public.registros_cartorio
FOR EACH ROW EXECUTE FUNCTION public.notify_cartorio();

DROP TRIGGER IF EXISTS trg_notify_cartorio_update ON public.registros_cartorio;
CREATE TRIGGER trg_notify_cartorio_update
AFTER UPDATE ON public.registros_cartorio
FOR EACH ROW EXECUTE FUNCTION public.notify_cartorio();

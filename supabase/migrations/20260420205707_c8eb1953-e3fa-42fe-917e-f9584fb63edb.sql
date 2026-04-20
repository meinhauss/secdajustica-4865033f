CREATE OR REPLACE FUNCTION public.notify_intimacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _proc_numero TEXT;
  _link TEXT;
  _titulo TEXT;
BEGIN
  SELECT numero INTO _proc_numero FROM public.processos WHERE id = NEW.processo_id;

  IF NEW.tipo = 'convocacao_jurado' THEN
    _link := 'jurados';
    _titulo := 'Convocação de Jurado — Processo ' || COALESCE(_proc_numero, '');
  ELSE
    _link := 'processos:' || NEW.processo_id::text;
    _titulo := 'Nova Intimação — Processo ' || COALESCE(_proc_numero, '');
  END IF;

  IF NEW.destinatario_id IS NOT NULL THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
    VALUES (
      NEW.destinatario_id,
      _titulo,
      NEW.conteudo,
      CASE WHEN NEW.tipo = 'convocacao_jurado' THEN 'convocacao_jurado' ELSE 'intimacao' END,
      _link
    );
  END IF;

  RETURN NEW;
END;
$function$;
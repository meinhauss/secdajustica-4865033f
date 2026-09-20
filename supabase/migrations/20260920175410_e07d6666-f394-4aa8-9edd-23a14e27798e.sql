CREATE OR REPLACE FUNCTION public.notify_discord_dm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _discord_id text;
  _enabled boolean;
BEGIN
  SELECT
    COALESCE(
      NULLIF(p.discord_user_id, ''),
      CASE WHEN p.discord ~ '^[0-9]{17,20}$' THEN p.discord ELSE NULL END
    ),
    COALESCE(p.discord_dm_enabled, true)
  INTO _discord_id, _enabled
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  IF _discord_id IS NULL OR NOT _enabled THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://avjbxuxnxsvywvrsumlg.supabase.co/functions/v1/discord-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2amJ4dXhueHN2eXd2cnN1bWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDQzMzAsImV4cCI6MjEwNDcyMDMzMH0.w8GIBCj-FMH5Pa1-XvBXy8q4CXRT8s2NImH7X2pwQaw'
    ),
    body := jsonb_build_object(
      'notificacao_id', NEW.id,
      'user_id',       NEW.user_id,
      'discord_user_id', _discord_id,
      'titulo',        NEW.titulo,
      'mensagem',      NEW.mensagem,
      'tipo',          NEW.tipo,
      'link_secao',    NEW.link_secao
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_discord_dm ON public.notificacoes;
CREATE TRIGGER trg_notify_discord_dm
AFTER INSERT ON public.notificacoes
FOR EACH ROW EXECUTE FUNCTION public.notify_discord_dm();
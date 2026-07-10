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

  PERFORM extensions.http_post(
    url := 'https://xmijvtkexbdduvwgwpsk.supabase.co/functions/v1/discord-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaWp2dGtleGJkZHV2d2d3cHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDg0NjEsImV4cCI6MjA4OTI4NDQ2MX0.qnhDDv3NHOLNF1gng0NqPQgVnRf5-KD3L6iw8YpqYJ4'
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
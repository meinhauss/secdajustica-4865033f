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
    url := 'https://zbbkwsqdgwdjllmuuejp.supabase.co/functions/v1/discord-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_-MrdW4sH8RT2u_ANRSCLVw_ltF8z5zJ'
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
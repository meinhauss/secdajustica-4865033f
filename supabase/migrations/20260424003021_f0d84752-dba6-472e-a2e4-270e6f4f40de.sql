CREATE OR REPLACE FUNCTION public.get_last_friday()
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT (
    date_trunc('day',
      CASE 
        WHEN EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')) >= 5 
        THEN (now() AT TIME ZONE 'America/Sao_Paulo') - ((EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')) - 5) || ' days')::interval
        ELSE (now() AT TIME ZONE 'America/Sao_Paulo') - ((EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')) + 2) || ' days')::interval
      END
    )
  ) AT TIME ZONE 'America/Sao_Paulo'
$function$;
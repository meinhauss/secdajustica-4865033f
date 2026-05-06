CREATE OR REPLACE FUNCTION public.sortear_desembargador()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  chosen uuid;
BEGIN
  SELECT ur.user_id INTO chosen
  FROM public.user_roles ur
  JOIN public.profiles pr ON pr.user_id = ur.user_id
  WHERE ur.role = 'desembargador'
    AND COALESCE(pr.recesso, false) = false
  ORDER BY (
    SELECT COUNT(*) FROM public.processos p
    WHERE p.relator_id = ur.user_id
      AND p.status NOT IN ('arquivado','sentenciado')
  ) ASC, random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  RETURN chosen;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sortear_magistrado()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  selected_judge_id UUID;
  override_id TEXT;
BEGIN
  SELECT valor INTO override_id FROM public.config_sistema WHERE chave = 'proximo_juiz_id';
  
  IF override_id IS NOT NULL AND override_id != '' THEN
    selected_judge_id := override_id::uuid;
    DELETE FROM public.config_sistema WHERE chave = 'proximo_juiz_id';
    RETURN selected_judge_id;
  END IF;

  PERFORM ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('magistrado', 'desembargador')
  FOR UPDATE;

  SELECT ur.user_id INTO selected_judge_id
  FROM public.user_roles ur
  JOIN public.profiles pr ON pr.user_id = ur.user_id
  WHERE ur.role IN ('magistrado', 'desembargador')
    AND COALESCE(pr.recesso, false) = false
  ORDER BY (
    SELECT COUNT(*) FROM public.processos p 
    WHERE p.juiz_id = ur.user_id 
    AND p.status NOT IN ('arquivado', 'sentenciado', 'suspenso')
  ) ASC,
  random()
  LIMIT 1;
  
  RETURN selected_judge_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.sortear_magistrado()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  selected_judge_id UUID;
BEGIN
  -- Lock the user_roles rows for magistrados to serialize concurrent calls
  PERFORM ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('magistrado', 'desembargador')
  FOR UPDATE;

  -- Pick the magistrado with fewest active (non-archived, non-sentenced) processes
  SELECT ur.user_id INTO selected_judge_id
  FROM public.user_roles ur
  WHERE ur.role IN ('magistrado', 'desembargador')
  ORDER BY (
    SELECT COUNT(*) FROM public.processos p 
    WHERE p.juiz_id = ur.user_id 
    AND p.status NOT IN ('arquivado', 'sentenciado')
  ) ASC,
  random()
  LIMIT 1;
  
  RETURN selected_judge_id;
END;
$function$;

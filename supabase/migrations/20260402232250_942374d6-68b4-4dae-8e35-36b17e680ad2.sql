
-- Config table for system settings
CREATE TABLE IF NOT EXISTS public.config_sistema (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.config_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage config" ON public.config_sistema
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read config" ON public.config_sistema
  FOR SELECT TO authenticated
  USING (true);

-- Update sortear_magistrado to check for manual override
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
  -- Check for manual override
  SELECT valor INTO override_id FROM public.config_sistema WHERE chave = 'proximo_juiz_id';
  
  IF override_id IS NOT NULL AND override_id != '' THEN
    selected_judge_id := override_id::uuid;
    -- Clear the override after use
    DELETE FROM public.config_sistema WHERE chave = 'proximo_juiz_id';
    RETURN selected_judge_id;
  END IF;

  -- Lock to serialize concurrent calls
  PERFORM ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('magistrado', 'desembargador')
  FOR UPDATE;

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

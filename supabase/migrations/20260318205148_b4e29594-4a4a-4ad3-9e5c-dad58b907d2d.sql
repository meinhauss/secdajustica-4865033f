
-- Function to assign a judge via weighted lottery (fewer active cases = higher priority)
CREATE OR REPLACE FUNCTION public.sortear_magistrado()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  selected_judge_id UUID;
BEGIN
  -- Get all magistrado/desembargador users, count their active processos, pick the one with fewest
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
$$;

-- Make carteiras_oab publicly readable for credential verification without login
DROP POLICY IF EXISTS "Carteiras OAB readable by authenticated" ON public.carteiras_oab;

CREATE POLICY "Carteiras OAB publicly readable"
  ON public.carteiras_oab FOR SELECT
  TO public
  USING (true);

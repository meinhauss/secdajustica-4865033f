-- 1) Add columns to processos
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS instancia smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS classe_originaria text,
  ADD COLUMN IF NOT EXISTS orgao_julgador text,
  ADD COLUMN IF NOT EXISTS relator_id uuid,
  ADD COLUMN IF NOT EXISTS pedido text;

-- 2) Sortear desembargador (least-loaded, exclude recesso)
CREATE OR REPLACE FUNCTION public.sortear_desembargador()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen uuid;
BEGIN
  SELECT ur.user_id INTO chosen
  FROM public.user_roles ur
  JOIN public.profiles pr ON pr.user_id = ur.user_id
  WHERE ur.role = 'desembargador'
    AND COALESCE(pr.status_atividade, 'ativo') <> 'recesso'
  ORDER BY (
    SELECT COUNT(*) FROM public.processos p
    WHERE p.relator_id = ur.user_id
      AND p.status NOT IN ('arquivado','sentenciado')
  ) ASC, random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  RETURN chosen;
END;
$$;
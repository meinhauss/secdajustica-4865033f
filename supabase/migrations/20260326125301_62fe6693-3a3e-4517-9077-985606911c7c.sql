
CREATE OR REPLACE FUNCTION public.get_processo_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'por_classe', (
      SELECT jsonb_object_agg(classe, cnt)
      FROM (SELECT classe::text, count(*) as cnt FROM public.processos GROUP BY classe) sub
    ),
    'por_status', (
      SELECT jsonb_object_agg(status, cnt)
      FROM (SELECT status::text, count(*) as cnt FROM public.processos GROUP BY status) sub
    ),
    'total', (SELECT count(*) FROM public.processos)
  )
$$;

WITH o AS (
  SELECT id, analista_id, created_at,
    CASE WHEN created_at - lag(created_at) OVER (PARTITION BY analista_id ORDER BY created_at) <= interval '3 seconds' THEN 0 ELSE 1 END AS novo
  FROM public.acoes_pendentes WHERE grupo_id IS NULL AND status = 'pendente'
), g AS (
  SELECT id, analista_id, sum(novo) OVER (PARTITION BY analista_id ORDER BY created_at) AS n FROM o
), ids AS (
  SELECT analista_id, n, gen_random_uuid() AS gid FROM g GROUP BY analista_id, n
)
UPDATE public.acoes_pendentes a SET grupo_id = ids.gid
FROM g JOIN ids USING (analista_id, n) WHERE a.id = g.id;
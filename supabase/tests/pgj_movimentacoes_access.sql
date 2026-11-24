-- Read-only regression tests for the deployed chief policy.
-- Execute with the Supabase read-query tool. Every row must have passed = true.
-- Evaluate the actual deployed expression for real PGJ accounts, without
-- modifying their roles, minting sessions, or creating production fixtures.
WITH policy AS (
  SELECT qual FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'movimentacoes'
    AND policyname = 'Chefias veem movimentacoes de servidores'
), candidates AS (
  SELECT DISTINCT ON (ur.role) ur.role, ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('procurador_geral', 'procurador_geral_adjunto')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles other
      WHERE other.user_id = ur.user_id
        AND other.role IN ('admin', 'ministerio_publico', 'advogado', 'procurador_estado')
    )
  ORDER BY ur.role, ur.user_id
), expected AS (
  SELECT c.role, c.user_id, count(*) AS expected_count,
    count(*) FILTER (WHERE m.autor_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles author_roles
      WHERE author_roles.user_id = m.autor_id AND author_roles.role = 'ministerio_publico'
    )) AS non_promotor_count
  FROM candidates c
  JOIN public.processos p ON public.can_view_processo(
    c.user_id, p.id, p.sigilo, p.juiz_id, p.advogado_autor_id, p.advogado_reu_id)
  JOIN public.movimentacoes m ON m.processo_id = p.id
  GROUP BY c.role, c.user_id
), evaluated AS (
  SELECT e.*, ((xpath('/table/row/count/text()', query_to_xml(
    format(
      'SELECT count(*) FROM public.movimentacoes movimentacoes JOIN public.processos accessible ON accessible.id = movimentacoes.processo_id WHERE public.can_view_processo(%L::uuid, accessible.id, accessible.sigilo, accessible.juiz_id, accessible.advogado_autor_id, accessible.advogado_reu_id) AND (%s)',
      e.user_id,
      replace(policy.qual, 'auth.uid()', format('%L::uuid', e.user_id))
    ), false, false, '')
  ))[1]::text)::bigint AS actual_count
  FROM expected e CROSS JOIN policy
)
SELECT required.role::text AS rule, evaluated.expected_count,
  evaluated.actual_count, evaluated.non_promotor_count,
  coalesce(evaluated.expected_count > 0 AND evaluated.non_promotor_count > 0
    AND evaluated.actual_count = evaluated.expected_count, false) AS passed
FROM (VALUES ('procurador_geral'::public.user_role),
             ('procurador_geral_adjunto'::public.user_role)) required(role)
LEFT JOIN evaluated USING (role);
CREATE OR REPLACE FUNCTION public.get_promotor_ranking()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.score DESC), '[]'::jsonb)
  FROM (
    SELECT
      pr.user_id,
      pr.nome_completo,
      pr.id_personagem,
      pr.avatar_url,
      ur.role::text AS cargo,
      COALESCE(den.total, 0) AS denuncias,
      0 AS denuncias_rapidas,
      COALESCE(mov.total, 0) AS pareceres,
      0 AS requisicoes,
      0 AS arquivamentos,
      0 AS transito_julgado,
      COALESCE(manif.total, 0) AS manifestacoes,
      (
        COALESCE(mov.total, 0) * 5
        + COALESCE(manif.total, 0) * 15
        + COALESCE(den.total, 0) * 30
      ) AS score
    FROM public.profiles pr
    JOIN public.user_roles ur ON ur.user_id = pr.user_id
    LEFT JOIN (
      SELECT autor_id, count(*)::int AS total
      FROM public.movimentacoes
      WHERE autor_id IS NOT NULL
      GROUP BY autor_id
    ) mov ON mov.autor_id = pr.user_id
    LEFT JOIN (
      SELECT user_id, count(*)::int AS total
      FROM public.interessados_processo
      GROUP BY user_id
    ) manif ON manif.user_id = pr.user_id
    LEFT JOIN (
      SELECT autor_id, count(*)::int AS total
      FROM public.movimentacoes
      WHERE autor_id IS NOT NULL
        AND tipo = 'denuncia'
        AND created_at >= get_last_friday()
      GROUP BY autor_id
    ) den ON den.autor_id = pr.user_id
    WHERE ur.role IN ('ministerio_publico', 'procurador_geral')
  ) sub
  WHERE sub.score > 0
$function$;
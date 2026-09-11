DROP FUNCTION IF EXISTS public.get_promotor_ranking();

CREATE OR REPLACE FUNCTION public.get_promotor_ranking()
 RETURNS jsonb
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
      COALESCE(den.rapidas, 0) AS denuncias_rapidas,
      COALESCE(par.total, 0) AS pareceres,
      0 AS requisicoes,
      COALESCE(arq.total, 0) AS arquivamentos,
      COALESCE(tj.total, 0) AS transito_julgado,
      COALESCE(manif.total, 0) AS manifestacoes,
      (
        COALESCE(den.total, 0) * 10
        + COALESCE(par.total, 0) * 15
        + COALESCE(manif.total, 0) * 15
        + COALESCE(arq.total, 0) * 10
        + COALESCE(tj.total, 0) * 50
        + COALESCE(den.rapidas, 0) * 25
      ) AS score
    FROM public.profiles pr
    JOIN public.user_roles ur ON ur.user_id = pr.user_id
    LEFT JOIN (
      SELECT m.autor_id,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE EXISTS (
                 SELECT 1 FROM public.processos p
                 WHERE p.id = m.processo_id
                   AND m.created_at <= (p.created_at + interval '24 hours')
               )
             )::int AS rapidas
      FROM public.movimentacoes m
      WHERE m.autor_id IS NOT NULL
        AND m.tipo = 'denuncia'
        AND m.created_at >= get_last_friday()
      GROUP BY m.autor_id
    ) den ON den.autor_id = pr.user_id
    LEFT JOIN (
      SELECT autor_id, COUNT(*)::int AS total
      FROM public.movimentacoes
      WHERE autor_id IS NOT NULL
        AND tipo IN ('parecer_mp', 'manifestacao_mp', 'manifestacao')
        AND created_at >= get_last_friday()
      GROUP BY autor_id
    ) par ON par.autor_id = pr.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*)::int AS total
      FROM public.interessados_processo
      WHERE created_at >= get_last_friday()
      GROUP BY user_id
    ) manif ON manif.user_id = pr.user_id
    LEFT JOIN (
      SELECT autor_id, COUNT(*)::int AS total
      FROM public.movimentacoes
      WHERE autor_id IS NOT NULL
        AND tipo IN ('arquivamento_automatico', 'arquivamento')
        AND created_at >= get_last_friday()
      GROUP BY autor_id
    ) arq ON arq.autor_id = pr.user_id
    LEFT JOIN (
      SELECT ip.user_id, COUNT(DISTINCT p.id)::int AS total
      FROM public.interessados_processo ip
      JOIN public.processos p ON p.id = ip.processo_id
      WHERE p.status = 'arquivado'
        AND p.updated_at >= get_last_friday()
      GROUP BY ip.user_id
    ) tj ON tj.user_id = pr.user_id
    WHERE ur.role IN ('ministerio_publico', 'procurador_geral')
  ) sub
  WHERE sub.score > 0
$function$;
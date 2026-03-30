
CREATE OR REPLACE FUNCTION public.get_promotor_ranking()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
      COALESCE(req.total, 0) AS requisicoes,
      COALESCE(arq.total, 0) AS arquivamentos,
      COALESCE(tj.total, 0) AS transito_julgado,
      COALESCE(manif.total, 0) AS manifestacoes,
      (
        COALESCE(den.total, 0) * 10
        + COALESCE(par.total, 0) * 15
        + COALESCE(req.total, 0) * 20
        + COALESCE(tj.total, 0) * 50
        + COALESCE(den.rapidas, 0) * 25
        + COALESCE(arq.total, 0) * 10
        + COALESCE(manif.total, 0) * 15
      ) AS score
    FROM public.user_roles ur
    JOIN public.profiles pr ON pr.user_id = ur.user_id
    LEFT JOIN (
      SELECT 
        d.promotor_id,
        COUNT(*) AS total,
        COUNT(*) FILTER (
          WHERE d.inquerito_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.inqueritos ip
            WHERE ip.id = d.inquerito_id
            AND d.created_at <= (ip.updated_at + interval '24 hours')
          )
        ) AS rapidas
      FROM public.denuncias_mp d
      WHERE d.promotor_id IS NOT NULL
      GROUP BY d.promotor_id
    ) den ON den.promotor_id = ur.user_id
    LEFT JOIN (
      SELECT promotor_id, COUNT(*) AS total
      FROM public.pareceres_mp
      WHERE promotor_id IS NOT NULL
      GROUP BY promotor_id
    ) par ON par.promotor_id = ur.user_id
    LEFT JOIN (
      SELECT promotor_id, COUNT(*) AS total
      FROM public.requisicoes_diligencia_mp
      WHERE promotor_id IS NOT NULL
      GROUP BY promotor_id
    ) req ON req.promotor_id = ur.user_id
    LEFT JOIN (
      SELECT promotor_id, COUNT(*) AS total
      FROM public.arquivamentos_mp
      WHERE promotor_id IS NOT NULL
      GROUP BY promotor_id
    ) arq ON arq.promotor_id = ur.user_id
    LEFT JOIN (
      SELECT 
        d.promotor_id,
        COUNT(DISTINCT proc.id) AS total
      FROM public.denuncias_mp d
      JOIN public.processos proc ON proc.id = d.processo_id
      WHERE proc.status = 'arquivado' AND d.promotor_id IS NOT NULL
      GROUP BY d.promotor_id
    ) tj ON tj.promotor_id = ur.user_id
    LEFT JOIN (
      SELECT 
        ip.user_id,
        COUNT(*) AS total
      FROM public.interessados_processo ip
      WHERE EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = ip.user_id
        AND ur2.role IN ('ministerio_publico', 'procurador_geral')
      )
      GROUP BY ip.user_id
    ) manif ON manif.user_id = ur.user_id
    WHERE ur.role IN ('ministerio_publico', 'procurador_geral')
    GROUP BY pr.user_id, pr.nome_completo, pr.id_personagem, pr.avatar_url, ur.role,
             den.total, den.rapidas, par.total, req.total, arq.total, tj.total, manif.total
  ) sub
$$;

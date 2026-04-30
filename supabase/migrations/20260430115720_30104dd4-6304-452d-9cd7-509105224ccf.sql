CREATE OR REPLACE FUNCTION public.get_magistrado_ranking()
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
      (
        SELECT ur2.role::text
        FROM public.user_roles ur2
        WHERE ur2.user_id = pr.user_id
          AND ur2.role::text IN ('presidente_tribunal','desembargador','magistrado')
        ORDER BY CASE ur2.role::text
          WHEN 'presidente_tribunal' THEN 1
          WHEN 'desembargador' THEN 2
          WHEN 'magistrado' THEN 3
          ELSE 99 END
        LIMIT 1
      ) AS cargo,
      COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= get_last_friday()) AS processos_count,
      COALESCE(sent.total_sentencas, 0) AS sentencas,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'arquivado' AND p.updated_at >= get_last_friday()) AS transito_julgado,
      COALESCE(aud.realizadas, 0) AS audiencias_realizadas,
      COALESCE(sent.sentencas_rapidas, 0) AS sentencas_rapidas,
      COALESCE(acordaos.total, 0) AS acordaos,
      (
        COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= get_last_friday()) * 10
        + COALESCE(sent.total_sentencas, 0) * 25
        + COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'arquivado' AND p.updated_at >= get_last_friday()) * 50
        + COALESCE(aud.realizadas, 0) * 15
        + COALESCE(sent.sentencas_rapidas, 0) * 20
        + COALESCE(acordaos.total, 0) * 30
      ) AS score
    FROM public.profiles pr
    LEFT JOIN public.processos p ON p.juiz_id = pr.user_id
    LEFT JOIN (
      SELECT
        s.magistrado_id,
        COUNT(*) FILTER (WHERE s.created_at >= get_last_friday()) AS total_sentencas,
        COUNT(*) FILTER (
          WHERE s.created_at >= get_last_friday() AND EXISTS (
            SELECT 1 FROM public.processos proc
            WHERE proc.id = s.processo_id
            AND s.created_at <= (proc.updated_at + interval '24 hours')
          )
        ) AS sentencas_rapidas
      FROM public.sentencas s
      WHERE s.magistrado_id IS NOT NULL
      GROUP BY s.magistrado_id
    ) sent ON sent.magistrado_id = pr.user_id
    LEFT JOIN (
      SELECT
        proc.juiz_id,
        COUNT(*) FILTER (WHERE a.created_at >= get_last_friday()) AS realizadas
      FROM public.audiencias a
      JOIN public.processos proc ON proc.id = a.processo_id
      WHERE a.status = 'realizada'
      GROUP BY proc.juiz_id
    ) aud ON aud.juiz_id = pr.user_id
    LEFT JOIN (
      SELECT
        ap.desembargador_id,
        COUNT(*) FILTER (WHERE ap.updated_at >= get_last_friday()) AS total
      FROM public.apelacoes ap
      WHERE ap.decisao_tipo IS NOT NULL AND ap.desembargador_id IS NOT NULL
      GROUP BY ap.desembargador_id
    ) acordaos ON acordaos.desembargador_id = pr.user_id
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = pr.user_id
        AND ur.role::text IN ('magistrado','desembargador','presidente_tribunal')
    )
    GROUP BY pr.user_id, pr.nome_completo, pr.id_personagem, pr.avatar_url,
             sent.total_sentencas, sent.sentencas_rapidas, aud.realizadas, acordaos.total
  ) sub
$function$;
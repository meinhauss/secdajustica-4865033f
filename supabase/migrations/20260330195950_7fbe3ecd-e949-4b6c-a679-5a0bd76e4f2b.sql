
-- Ranking de Magistrados (Juízes e Desembargadores)
-- Pontuação:
--   10 pts por processo atribuído
--   25 pts por sentença proferida
--   50 pts por processo com trânsito em julgado (arquivado)
--   15 pts por audiência realizada
--   20 pts bônus por sentença rápida (proferida em menos de 24h após concluso)
--   30 pts por acórdão proferido (desembargador)

CREATE OR REPLACE FUNCTION public.get_magistrado_ranking()
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
      -- Processos atribuídos
      COUNT(DISTINCT p.id) AS processos_count,
      -- Sentenças proferidas
      COALESCE(sent.total_sentencas, 0) AS sentencas,
      -- Processos arquivados (trânsito em julgado)
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'arquivado') AS transito_julgado,
      -- Audiências realizadas
      COALESCE(aud.realizadas, 0) AS audiencias_realizadas,
      -- Sentenças rápidas (< 24h após concluso)
      COALESCE(sent.sentencas_rapidas, 0) AS sentencas_rapidas,
      -- Acórdãos (desembargador)
      COALESCE(acordaos.total, 0) AS acordaos,
      -- Score
      (
        COUNT(DISTINCT p.id) * 10
        + COALESCE(sent.total_sentencas, 0) * 25
        + COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'arquivado') * 50
        + COALESCE(aud.realizadas, 0) * 15
        + COALESCE(sent.sentencas_rapidas, 0) * 20
        + COALESCE(acordaos.total, 0) * 30
      ) AS score
    FROM public.user_roles ur
    JOIN public.profiles pr ON pr.user_id = ur.user_id
    LEFT JOIN public.processos p ON p.juiz_id = ur.user_id
    LEFT JOIN (
      SELECT 
        s.magistrado_id,
        COUNT(*) AS total_sentencas,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM public.processos proc 
            WHERE proc.id = s.processo_id 
            AND s.created_at <= (proc.updated_at + interval '24 hours')
          )
        ) AS sentencas_rapidas
      FROM public.sentencas s
      WHERE s.magistrado_id IS NOT NULL
      GROUP BY s.magistrado_id
    ) sent ON sent.magistrado_id = ur.user_id
    LEFT JOIN (
      SELECT 
        proc.juiz_id,
        COUNT(*) AS realizadas
      FROM public.audiencias a
      JOIN public.processos proc ON proc.id = a.processo_id
      WHERE a.status = 'realizada'
      GROUP BY proc.juiz_id
    ) aud ON aud.juiz_id = ur.user_id
    LEFT JOIN (
      SELECT
        ap.desembargador_id,
        COUNT(*) AS total
      FROM public.apelacoes ap
      WHERE ap.decisao_tipo IS NOT NULL AND ap.desembargador_id IS NOT NULL
      GROUP BY ap.desembargador_id
    ) acordaos ON acordaos.desembargador_id = ur.user_id
    WHERE ur.role IN ('magistrado', 'desembargador', 'presidente_tribunal')
    GROUP BY pr.user_id, pr.nome_completo, pr.id_personagem, pr.avatar_url, ur.role, 
             sent.total_sentencas, sent.sentencas_rapidas, aud.realizadas, acordaos.total
  ) sub
$$;

-- Ranking de Promotores (Ministério Público)
-- Pontuação:
--   10 pts por denúncia oferecida
--   15 pts por parecer emitido
--   20 pts por requisição de diligência
--   50 pts por processo com trânsito em julgado (arquivado) onde atuou
--   25 pts bônus por denúncia rápida (oferecida em menos de 24h após receber inquérito)
--   10 pts por arquivamento promovido

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
      -- Denúncias
      COALESCE(den.total, 0) AS denuncias,
      COALESCE(den.rapidas, 0) AS denuncias_rapidas,
      -- Pareceres
      COALESCE(par.total, 0) AS pareceres,
      -- Requisições
      COALESCE(req.total, 0) AS requisicoes,
      -- Arquivamentos
      COALESCE(arq.total, 0) AS arquivamentos,
      -- Processos com trânsito em julgado (via denúncia ou parecer)
      COALESCE(tj.total, 0) AS transito_julgado,
      -- Score
      (
        COALESCE(den.total, 0) * 10
        + COALESCE(par.total, 0) * 15
        + COALESCE(req.total, 0) * 20
        + COALESCE(tj.total, 0) * 50
        + COALESCE(den.rapidas, 0) * 25
        + COALESCE(arq.total, 0) * 10
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
    WHERE ur.role IN ('ministerio_publico', 'procurador_geral')
    GROUP BY pr.user_id, pr.nome_completo, pr.id_personagem, pr.avatar_url, ur.role,
             den.total, den.rapidas, par.total, req.total, arq.total, tj.total
  ) sub
$$;

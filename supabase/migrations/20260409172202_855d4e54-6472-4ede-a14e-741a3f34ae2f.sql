
-- Helper function to get last Friday at midnight (or current time if today is Friday)
CREATE OR REPLACE FUNCTION public.get_last_friday()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT date_trunc('day',
    CASE 
      WHEN EXTRACT(DOW FROM now()) >= 5 
      THEN now() - ((EXTRACT(DOW FROM now()) - 5) || ' days')::interval
      ELSE now() - ((EXTRACT(DOW FROM now()) + 2) || ' days')::interval
    END
  )
$$;

-- Table to store weekly highlights
CREATE TABLE public.ranking_destaques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_ranking text NOT NULL, -- 'magistrado', 'promotor', 'advogado'
  user_id uuid NOT NULL,
  nome_completo text NOT NULL,
  avatar_url text,
  id_personagem text,
  score integer NOT NULL DEFAULT 0,
  semana_inicio timestamptz NOT NULL,
  semana_fim timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ranking_destaques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Destaques readable by authenticated"
ON public.ranking_destaques FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Only admin can insert destaques"
ON public.ranking_destaques FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service role can insert destaques"
ON public.ranking_destaques FOR INSERT TO service_role
WITH CHECK (true);

CREATE INDEX idx_ranking_destaques_tipo_semana ON public.ranking_destaques(tipo_ranking, semana_fim DESC);

-- ============================================================
-- MAGISTRADO RANKING - Weekly version
-- ============================================================
DROP FUNCTION IF EXISTS public.get_magistrado_ranking();
CREATE FUNCTION public.get_magistrado_ranking()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.score DESC), '[]'::jsonb)
  FROM (
    SELECT
      pr.user_id,
      pr.nome_completo,
      pr.id_personagem,
      pr.avatar_url,
      ur.role::text AS cargo,
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
    FROM public.user_roles ur
    JOIN public.profiles pr ON pr.user_id = ur.user_id
    LEFT JOIN public.processos p ON p.juiz_id = ur.user_id
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
    ) sent ON sent.magistrado_id = ur.user_id
    LEFT JOIN (
      SELECT 
        proc.juiz_id,
        COUNT(*) FILTER (WHERE a.created_at >= get_last_friday()) AS realizadas
      FROM public.audiencias a
      JOIN public.processos proc ON proc.id = a.processo_id
      WHERE a.status = 'realizada'
      GROUP BY proc.juiz_id
    ) aud ON aud.juiz_id = ur.user_id
    LEFT JOIN (
      SELECT
        ap.desembargador_id,
        COUNT(*) FILTER (WHERE ap.updated_at >= get_last_friday()) AS total
      FROM public.apelacoes ap
      WHERE ap.decisao_tipo IS NOT NULL AND ap.desembargador_id IS NOT NULL
      GROUP BY ap.desembargador_id
    ) acordaos ON acordaos.desembargador_id = ur.user_id
    WHERE ur.role IN ('magistrado', 'desembargador', 'presidente_tribunal')
    GROUP BY pr.user_id, pr.nome_completo, pr.id_personagem, pr.avatar_url, ur.role, 
             sent.total_sentencas, sent.sentencas_rapidas, aud.realizadas, acordaos.total
  ) sub
$$;

-- ============================================================
-- PROMOTOR RANKING - Weekly version
-- ============================================================
DROP FUNCTION IF EXISTS public.get_promotor_ranking();
CREATE FUNCTION public.get_promotor_ranking()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
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
      (COALESCE(par.total, 0) + COALESCE(par_mov.total, 0)) AS pareceres,
      (COALESCE(req.total, 0) + COALESCE(req_mov.total, 0)) AS requisicoes,
      COALESCE(arq.total, 0) AS arquivamentos,
      COALESCE(tj.total, 0) AS transito_julgado,
      COALESCE(manif.total, 0) AS manifestacoes,
      (
        COALESCE(den.total, 0) * 10
        + (COALESCE(par.total, 0) + COALESCE(par_mov.total, 0)) * 15
        + (COALESCE(req.total, 0) + COALESCE(req_mov.total, 0)) * 20
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
        COUNT(*) FILTER (WHERE d.created_at >= get_last_friday()) AS total,
        COUNT(*) FILTER (
          WHERE d.created_at >= get_last_friday() AND d.inquerito_id IS NOT NULL AND EXISTS (
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
      SELECT promotor_id, COUNT(*) FILTER (WHERE created_at >= get_last_friday()) AS total
      FROM public.pareceres_mp
      WHERE promotor_id IS NOT NULL
      GROUP BY promotor_id
    ) par ON par.promotor_id = ur.user_id
    LEFT JOIN (
      SELECT autor_id, COUNT(*) FILTER (WHERE created_at >= get_last_friday()) AS total
      FROM public.movimentacoes
      WHERE tipo = 'parecer_mp' AND autor_id IS NOT NULL
      GROUP BY autor_id
    ) par_mov ON par_mov.autor_id = ur.user_id
    LEFT JOIN (
      SELECT promotor_id, COUNT(*) FILTER (WHERE created_at >= get_last_friday()) AS total
      FROM public.requisicoes_diligencia_mp
      WHERE promotor_id IS NOT NULL
      GROUP BY promotor_id
    ) req ON req.promotor_id = ur.user_id
    LEFT JOIN (
      SELECT autor_id, COUNT(*) FILTER (WHERE created_at >= get_last_friday()) AS total
      FROM public.movimentacoes
      WHERE tipo IN ('requisicao_diligencia', 'denuncia') AND autor_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = movimentacoes.autor_id
        AND ur2.role IN ('ministerio_publico', 'procurador_geral')
      )
      GROUP BY autor_id
    ) req_mov ON req_mov.autor_id = ur.user_id
    LEFT JOIN (
      SELECT promotor_id, COUNT(*) FILTER (WHERE created_at >= get_last_friday()) AS total
      FROM public.arquivamentos_mp
      WHERE promotor_id IS NOT NULL
      GROUP BY promotor_id
    ) arq ON arq.promotor_id = ur.user_id
    LEFT JOIN (
      SELECT 
        sub_tj.user_id,
        COUNT(DISTINCT sub_tj.processo_id) AS total
      FROM (
        SELECT d.promotor_id AS user_id, proc.id AS processo_id
        FROM public.denuncias_mp d
        JOIN public.processos proc ON proc.id = d.processo_id
        WHERE proc.status = 'arquivado' AND d.promotor_id IS NOT NULL AND proc.updated_at >= get_last_friday()
        UNION
        SELECT ip.user_id, proc.id AS processo_id
        FROM public.interessados_processo ip
        JOIN public.processos proc ON proc.id = ip.processo_id
        WHERE proc.status = 'arquivado' AND proc.updated_at >= get_last_friday()
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = ip.user_id
          AND ur2.role IN ('ministerio_publico', 'procurador_geral')
        )
      ) sub_tj
      GROUP BY sub_tj.user_id
    ) tj ON tj.user_id = ur.user_id
    LEFT JOIN (
      SELECT 
        ip.user_id,
        COUNT(*) FILTER (WHERE ip.created_at >= get_last_friday()) AS total
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
             den.total, den.rapidas, par.total, par_mov.total, req.total, req_mov.total, arq.total, tj.total, manif.total
  ) sub
$$;

-- ============================================================
-- ADVOGADO RANKING - Weekly version
-- ============================================================
DROP FUNCTION IF EXISTS public.get_advogado_ranking();
CREATE FUNCTION public.get_advogado_ranking()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.score DESC), '[]'::jsonb)
  FROM (
    SELECT
      c.user_id,
      c.nome_completo,
      c.numero_oab,
      c.id_personagem,
      c.especialidade,
      c.foto_url,
      COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= get_last_friday()) AS processos_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('sentenciado', 'arquivado') AND p.updated_at >= get_last_friday()) AS sentencas,
      COALESCE(pf.pareceres_favoraveis, 0) AS pareceres_favoraveis,
      COALESCE(rapido.total, 0) AS sentencas_rapidas,
      (
        COUNT(DISTINCT p.id) FILTER (WHERE p.created_at >= get_last_friday()) * 10
        + COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('sentenciado', 'arquivado') AND p.updated_at >= get_last_friday()) * 25
        + COALESCE(pf.pareceres_favoraveis, 0) * 50
        + COALESCE(rapido.total, 0) * 50
      ) AS score
    FROM public.carteiras_oab c
    LEFT JOIN (
      SELECT DISTINCT proc.id, proc.status, proc.advogado_autor_id, proc.advogado_reu_id, proc.created_at, proc.updated_at
      FROM public.processos proc
    ) p ON (
      p.advogado_autor_id = c.user_id 
      OR p.advogado_reu_id = c.user_id
      OR EXISTS (
        SELECT 1 FROM public.procuracoes pr
        WHERE pr.processo_id = p.id
          AND pr.advogado_id = c.user_id
          AND pr.status = 'ativa'
      )
    )
    LEFT JOIN (
      SELECT 
        ap.apelante_id,
        COUNT(*) FILTER (WHERE ap.updated_at >= get_last_friday()) AS pareceres_favoraveis
      FROM public.apelacoes ap
      WHERE ap.decisao_tipo IN ('provido', 'parcialmente_provido')
        AND ap.apelante_id IS NOT NULL
      GROUP BY ap.apelante_id
    ) pf ON pf.apelante_id = c.user_id
    LEFT JOIN (
      SELECT 
        adv_id,
        COUNT(*) AS total
      FROM (
        SELECT DISTINCT ON (pr.processo_id, pr.advogado_id)
          pr.advogado_id AS adv_id,
          pr.processo_id
        FROM public.procuracoes pr
        JOIN public.sentencas s ON s.processo_id = pr.processo_id
        WHERE pr.advogado_id IS NOT NULL
          AND pr.status = 'ativa'
          AND s.created_at <= (pr.created_at + interval '24 hours')
          AND s.created_at >= get_last_friday()
        UNION
        SELECT DISTINCT ON (proc.id, proc.advogado_autor_id)
          proc.advogado_autor_id AS adv_id,
          proc.id AS processo_id
        FROM public.processos proc
        JOIN public.sentencas s ON s.processo_id = proc.id
        WHERE proc.advogado_autor_id IS NOT NULL
          AND s.created_at <= (proc.created_at + interval '24 hours')
          AND s.created_at >= get_last_friday()
        UNION
        SELECT DISTINCT ON (proc.id, proc.advogado_reu_id)
          proc.advogado_reu_id AS adv_id,
          proc.id AS processo_id
        FROM public.processos proc
        JOIN public.sentencas s ON s.processo_id = proc.id
        WHERE proc.advogado_reu_id IS NOT NULL
          AND s.created_at <= (proc.created_at + interval '24 hours')
          AND s.created_at >= get_last_friday()
      ) combined
      GROUP BY adv_id
    ) rapido ON rapido.adv_id = c.user_id
    WHERE c.status = 'ativo'
    GROUP BY c.user_id, c.nome_completo, c.numero_oab, c.id_personagem, c.especialidade, c.foto_url, pf.pareceres_favoraveis, rapido.total
  ) sub
$$;

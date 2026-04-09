
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
      COALESCE(c.foto_url, pr.avatar_url) AS foto_url,
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
    JOIN public.profiles pr ON pr.user_id = c.user_id
    LEFT JOIN (
      SELECT DISTINCT proc.id, proc.status, proc.advogado_autor_id, proc.advogado_reu_id, proc.created_at, proc.updated_at
      FROM public.processos proc
    ) p ON (
      p.advogado_autor_id = c.user_id 
      OR p.advogado_reu_id = c.user_id
      OR EXISTS (
        SELECT 1 FROM public.procuracoes pr2
        WHERE pr2.processo_id = p.id
          AND pr2.advogado_id = c.user_id
          AND pr2.status = 'ativa'
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
        SELECT DISTINCT ON (pr3.processo_id, pr3.advogado_id)
          pr3.advogado_id AS adv_id,
          pr3.processo_id
        FROM public.procuracoes pr3
        JOIN public.sentencas s ON s.processo_id = pr3.processo_id
        WHERE pr3.advogado_id IS NOT NULL
          AND pr3.status = 'ativa'
          AND s.created_at <= (pr3.created_at + interval '24 hours')
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
    GROUP BY c.user_id, c.nome_completo, c.numero_oab, c.id_personagem, c.especialidade, c.foto_url, pr.avatar_url, pf.pareceres_favoraveis, rapido.total
  ) sub
$$;

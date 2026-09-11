
CREATE OR REPLACE FUNCTION public.get_advogado_ranking()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
      COUNT(DISTINCT p.id) AS processos_count,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('sentenciado', 'arquivado')) AS sentencas,
      COALESCE(pf.pareceres_favoraveis, 0) AS pareceres_favoraveis,
      (
        COUNT(DISTINCT p.id) * 10
        + COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('sentenciado', 'arquivado')) * 25
        + COALESCE(pf.pareceres_favoraveis, 0) * 50
      ) AS score
    FROM public.carteiras_oab c
    LEFT JOIN (
      SELECT DISTINCT proc.id, proc.status, proc.advogado_autor_id, proc.advogado_reu_id
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
        COUNT(*) AS pareceres_favoraveis
      FROM public.apelacoes ap
      WHERE ap.decisao_tipo IN ('provido', 'parcialmente_provido')
        AND ap.apelante_id IS NOT NULL
      GROUP BY ap.apelante_id
    ) pf ON pf.apelante_id = c.user_id
    WHERE c.status = 'ativo'
    GROUP BY c.user_id, c.nome_completo, c.numero_oab, c.id_personagem, c.especialidade, c.foto_url, pf.pareceres_favoraveis
  ) sub
$$;

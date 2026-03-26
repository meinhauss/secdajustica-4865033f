
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
      COUNT(p.id) AS processos_count,
      COUNT(p.id) FILTER (WHERE p.status = 'sentenciado') AS vitorias,
      (COUNT(p.id) * 10 + COUNT(p.id) FILTER (WHERE p.status = 'sentenciado') * 25) AS score
    FROM public.carteiras_oab c
    LEFT JOIN public.processos p
      ON p.advogado_autor_id = c.user_id OR p.advogado_reu_id = c.user_id
    WHERE c.status = 'ativo'
    GROUP BY c.user_id, c.nome_completo, c.numero_oab, c.id_personagem, c.especialidade, c.foto_url
  ) sub
$$;

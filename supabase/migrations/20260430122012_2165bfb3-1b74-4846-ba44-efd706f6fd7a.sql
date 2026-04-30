
-- Drop dependent functions/sequences first
DROP FUNCTION IF EXISTS public.generate_denuncia_numero() CASCADE;
DROP SEQUENCE IF EXISTS public.denuncias_mp_numero_seq CASCADE;

-- Drop tables (CASCADE removes dependent FKs, policies, triggers)
DROP TABLE IF EXISTS public.comunicacoes_externas CASCADE;
DROP TABLE IF EXISTS public.api_keys_externas CASCADE;
DROP TABLE IF EXISTS public.envolvidos_bo CASCADE;
DROP TABLE IF EXISTS public.boletins_ocorrencia CASCADE;
DROP TABLE IF EXISTS public.denuncias_mp CASCADE;
DROP TABLE IF EXISTS public.diligencias CASCADE;
DROP TABLE IF EXISTS public.envolvidos_inquerito CASCADE;
DROP TABLE IF EXISTS public.arquivamentos_mp CASCADE;
DROP TABLE IF EXISTS public.requisicoes_diligencia_mp CASCADE;
DROP TABLE IF EXISTS public.pareceres_mp CASCADE;
DROP TABLE IF EXISTS public.oitivas CASCADE;
DROP TABLE IF EXISTS public.protocolos CASCADE;
DROP TABLE IF EXISTS public.inqueritos CASCADE;
DROP TABLE IF EXISTS public.honorarios_tabela CASCADE;

-- Recreate get_processo_stats without removed tables
CREATE OR REPLACE FUNCTION public.get_processo_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'por_classe', (
      SELECT jsonb_object_agg(classe, cnt)
      FROM (SELECT classe::text, count(*) as cnt FROM public.processos GROUP BY classe) sub
    ),
    'por_status', (
      SELECT jsonb_object_agg(status, cnt)
      FROM (SELECT status::text, count(*) as cnt FROM public.processos GROUP BY status) sub
    ),
    'total', (SELECT count(*) FROM public.processos),
    'audiencias_total', (SELECT count(*) FROM public.audiencias),
    'audiencias_agendadas', (SELECT count(*) FROM public.audiencias WHERE status = 'agendada'),
    'audiencias_realizadas', (SELECT count(*) FROM public.audiencias WHERE status = 'realizada'),
    'intimacoes_total', (SELECT count(*) FROM public.intimacoes),
    'intimacoes_pendentes', (SELECT count(*) FROM public.intimacoes WHERE status = 'pendente'),
    'intimacoes_lidas', (SELECT count(*) FROM public.intimacoes WHERE status = 'lida'),
    'mandados_total', (SELECT count(*) FROM public.mandados),
    'mandados_pendentes', (SELECT count(*) FROM public.mandados WHERE status = 'pendente'),
    'mandados_cumpridos', (SELECT count(*) FROM public.mandados WHERE status = 'cumprido'),
    'sentencas_total', (SELECT count(*) FROM public.sentencas),
    'apelacoes_total', (SELECT count(*) FROM public.apelacoes),
    'jurisprudencias_total', (SELECT count(*) FROM public.jurisprudencias)
  )
$function$;

-- Recreate simplified get_promotor_ranking based only on movimentacoes and manifestações
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
      0 AS denuncias,
      0 AS denuncias_rapidas,
      COALESCE(mov.total, 0) AS pareceres,
      0 AS requisicoes,
      0 AS arquivamentos,
      0 AS transito_julgado,
      COALESCE(manif.total, 0) AS manifestacoes,
      (
        COALESCE(mov.total, 0) * 5
        + COALESCE(manif.total, 0) * 15
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
    WHERE ur.role IN ('ministerio_publico', 'procurador_geral')
  ) sub
  WHERE sub.score > 0
$function$;

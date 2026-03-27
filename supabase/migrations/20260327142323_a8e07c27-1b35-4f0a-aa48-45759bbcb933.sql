
CREATE OR REPLACE FUNCTION public.get_processo_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    'inqueritos_total', (SELECT count(*) FROM public.inqueritos),
    'inqueritos_abertos', (SELECT count(*) FROM public.inqueritos WHERE status = 'em_andamento'),
    'boletins_total', (SELECT count(*) FROM public.boletins_ocorrencia),
    'denuncias_mp_total', (SELECT count(*) FROM public.denuncias_mp),
    'jurisprudencias_total', (SELECT count(*) FROM public.jurisprudencias)
  )
$$;

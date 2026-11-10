UPDATE public.interessados_processo ip SET qualificacao = 'Fazenda Pública'
WHERE qualificacao = 'custos legis'
  AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = ip.user_id AND r.role = 'procurador_estado')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = ip.user_id AND r.role IN ('ministerio_publico','procurador_geral','procurador_geral_adjunto'));
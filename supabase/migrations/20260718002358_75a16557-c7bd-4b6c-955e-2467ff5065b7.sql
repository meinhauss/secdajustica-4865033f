
CREATE OR REPLACE FUNCTION public.notificar_lembrete_prova_concurso()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  horas_restantes int;
  link text;
BEGIN
  FOR r IN
    SELECT i.user_id, i.id AS inscricao_id, c.id AS concurso_id, c.titulo, c.cargo, c.data_fim_prova
    FROM public.inscricoes_concurso i
    JOIN public.concursos c ON c.id = i.concurso_id
    WHERE i.user_id IS NOT NULL
      AND i.prova_iniciada_em IS NULL
      AND c.data_fim_prova IS NOT NULL
      AND c.data_fim_prova > now()
      AND c.data_fim_prova <= now() + interval '12 hours'
      AND c.status NOT IN ('encerrado','cancelado','resultado_publicado')
      AND NOT EXISTS (
        SELECT 1 FROM public.respostas_concurso rc WHERE rc.inscricao_id = i.id
      )
  LOOP
    link := 'concursos:' || r.concurso_id::text;
    IF NOT EXISTS (
      SELECT 1 FROM public.notificacoes
      WHERE user_id = r.user_id
        AND tipo = 'concurso_lembrete_prova'
        AND link_secao = link
    ) THEN
      horas_restantes := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.data_fim_prova - now())) / 3600)::int);
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
      VALUES (
        r.user_id,
        'Lembrete: prova do concurso encerra em ' || horas_restantes || 'h',
        'Você se inscreveu no concurso "' || r.titulo || '" (' || r.cargo || ') e ainda não realizou a prova. A janela de aplicação encerra em ' || horas_restantes || ' horas. Acesse o sistema para realizar a prova antes do prazo.',
        'concurso_lembrete_prova',
        link
      );
    END IF;
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION public.notificar_prazos_proximos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  destinatario UUID;
  horas_restantes INT;
  faixa TEXT;
  tipo_notif TEXT;
  link TEXT;
BEGIN
  FOR r IN
    SELECT pp.id, pp.processo_id, pp.descricao, pp.data_fim, pp.responsavel_id,
           p.numero, p.juiz_id
    FROM public.prazos_processuais pp
    JOIN public.processos p ON p.id = pp.processo_id
    WHERE pp.status = 'pendente'
      AND pp.data_fim > NOW()
      AND pp.data_fim <= NOW() + INTERVAL '12 hours'
  LOOP
    destinatario := COALESCE(r.responsavel_id, r.juiz_id);
    IF destinatario IS NULL THEN CONTINUE; END IF;

    horas_restantes := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.data_fim - NOW())) / 3600)::INT);

    IF horas_restantes <= 6 THEN
      faixa := '6h';
    ELSE
      faixa := '12h';
    END IF;
    tipo_notif := 'prazo_' || faixa;
    link := 'processos:' || r.processo_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.notificacoes
      WHERE user_id = destinatario
        AND tipo = tipo_notif
        AND link_secao = link
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
      VALUES (
        destinatario,
        'Prazo vencendo em ' || horas_restantes || 'h',
        'Processo ' || COALESCE(r.numero, '') || ': ' || COALESCE(r.descricao, 'prazo processual'),
        tipo_notif,
        link
      );
    END IF;
  END LOOP;

  -- Marca vencidos
  UPDATE public.prazos_processuais
     SET status = 'vencido'
   WHERE status = 'pendente' AND data_fim < NOW();
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notificar-prazos-proximos') THEN
    PERFORM cron.unschedule('notificar-prazos-proximos');
  END IF;
END $$;

SELECT cron.schedule(
  'notificar-prazos-proximos',
  '5 * * * *',
  $$ SELECT public.notificar_prazos_proximos(); $$
);


-- Coluna para marcar quando a procuração foi efetivamente emitida
ALTER TABLE public.registros_cartorio
  ADD COLUMN IF NOT EXISTS emitido_em timestamptz;

-- Trigger: quando status muda para 'emitido', grava emitido_em
CREATE OR REPLACE FUNCTION public.set_emitido_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'emitido' AND (OLD.status IS DISTINCT FROM 'emitido') AND NEW.emitido_em IS NULL THEN
    NEW.emitido_em := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_emitido_em ON public.registros_cartorio;
CREATE TRIGGER trg_set_emitido_em
  BEFORE UPDATE ON public.registros_cartorio
  FOR EACH ROW EXECUTE FUNCTION public.set_emitido_em();

-- Também na INSERT (quando cartório emite direto)
DROP TRIGGER IF EXISTS trg_set_emitido_em_ins ON public.registros_cartorio;
CREATE TRIGGER trg_set_emitido_em_ins
  BEFORE INSERT ON public.registros_cartorio
  FOR EACH ROW
  WHEN (NEW.status = 'emitido')
  EXECUTE FUNCTION public.set_emitido_em();

-- Função de expiração / cancelamento automáticos
CREATE OR REPLACE FUNCTION public.expirar_procuracoes_cartorio()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _canceladas int := 0;
  _expiradas int := 0;
  _reg RECORD;
BEGIN
  -- 1. Cancelar procurações não assinadas em 24h
  FOR _reg IN
    SELECT id, requerente_id, numero_registro
    FROM public.registros_cartorio
    WHERE tipo = 'procuracao'
      AND status = 'aguardando_confirmacao'
      AND created_at < (now() - interval '24 hours')
  LOOP
    UPDATE public.registros_cartorio
      SET status = 'cancelado',
          observacoes = COALESCE(observacoes, '') ||
            E'\n[SISTEMA] Procuração cancelada automaticamente por falta de assinatura de todas as partes em 24 horas.'
      WHERE id = _reg.id;

    IF _reg.requerente_id IS NOT NULL THEN
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
      VALUES (
        _reg.requerente_id,
        'Procuração cancelada — ' || COALESCE(_reg.numero_registro, 'sem número'),
        'Sua procuração foi cancelada automaticamente por não ter sido assinada por todas as partes em até 24 horas.',
        'cartorio',
        'cartorio'
      );
    END IF;
    _canceladas := _canceladas + 1;
  END LOOP;

  -- 2. Expirar procurações emitidas há mais de 30 dias
  FOR _reg IN
    SELECT id, requerente_id, numero_registro
    FROM public.registros_cartorio
    WHERE tipo = 'procuracao'
      AND status = 'emitido'
      AND emitido_em IS NOT NULL
      AND emitido_em < (now() - interval '30 days')
  LOOP
    UPDATE public.registros_cartorio
      SET status = 'expirado',
          observacoes = COALESCE(observacoes, '') ||
            E'\n[SISTEMA] Procuração expirada automaticamente após 30 dias de validade.'
      WHERE id = _reg.id;

    IF _reg.requerente_id IS NOT NULL THEN
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link_secao)
      VALUES (
        _reg.requerente_id,
        'Procuração expirada — ' || COALESCE(_reg.numero_registro, 'sem número'),
        'Sua procuração completou 30 dias de validade e foi expirada automaticamente. Solicite uma nova se necessário.',
        'cartorio',
        'cartorio'
      );
    END IF;
    _expiradas := _expiradas + 1;
  END LOOP;

  RETURN jsonb_build_object('canceladas', _canceladas, 'expiradas', _expiradas);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expirar_procuracoes_cartorio() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expirar_procuracoes_cartorio() TO service_role, authenticated;

-- Retroativamente marcar emitido_em nas procurações já emitidas
UPDATE public.registros_cartorio
  SET emitido_em = updated_at
  WHERE tipo = 'procuracao' AND status = 'emitido' AND emitido_em IS NULL;

-- Cron a cada hora
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expirar-procuracoes-cartorio') THEN
    PERFORM cron.unschedule('expirar-procuracoes-cartorio');
  END IF;
END $$;

SELECT cron.schedule(
  'expirar-procuracoes-cartorio',
  '15 * * * *',  -- todo minuto 15 de cada hora
  $$ SELECT public.expirar_procuracoes_cartorio(); $$
);

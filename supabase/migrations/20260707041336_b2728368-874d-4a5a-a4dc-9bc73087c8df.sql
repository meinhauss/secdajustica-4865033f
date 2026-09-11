
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_processos_juiz_status ON public.processos (juiz_id, status);
CREATE INDEX IF NOT EXISTS idx_processos_advogado_autor ON public.processos (advogado_autor_id);
CREATE INDEX IF NOT EXISTS idx_processos_advogado_reu ON public.processos (advogado_reu_id);
CREATE INDEX IF NOT EXISTS idx_processos_status_updated ON public.processos (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_processos_created_at ON public.processos (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_processo_created ON public.movimentacoes (processo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_autor ON public.movimentacoes (autor_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida ON public.notificacoes (user_id, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_created ON public.notificacoes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intimacoes_destinatario_status ON public.intimacoes (destinatario_id, status);
CREATE INDEX IF NOT EXISTS idx_intimacoes_processo ON public.intimacoes (processo_id);

CREATE INDEX IF NOT EXISTS idx_procuracoes_processo_advogado ON public.procuracoes (processo_id, advogado_id) WHERE status = 'ativa';
CREATE INDEX IF NOT EXISTS idx_interessados_processo_user ON public.interessados_processo (processo_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sentencas_processo ON public.sentencas (processo_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);

-- Enable realtime for notifications and movements
ALTER TABLE public.notificacoes REPLICA IDENTITY FULL;
ALTER TABLE public.movimentacoes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notificacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'movimentacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes;
  END IF;
END $$;

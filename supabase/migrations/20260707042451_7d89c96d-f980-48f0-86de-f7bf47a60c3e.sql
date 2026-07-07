
-- ============================================================
-- 1. Consolidar policies de notificacoes (8 → 5, sem duplicatas)
-- ============================================================
DROP POLICY IF EXISTS "Users can read own notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can update own notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Admins can delete all notifications" ON public.notificacoes;
-- Removida: permitia inserir notificação para qualquer user_id
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "System can insert notificacoes" ON public.notificacoes;

CREATE POLICY "notif_select_own" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notif_insert_own" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_update_own" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_delete_own" ON public.notificacoes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notif_delete_admin" ON public.notificacoes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Triggers do sistema (notify_intimacao, notify_movimentacao, notify_cartorio,
-- notify_cargo_intimacao) são SECURITY DEFINER e continuam funcionando pois
-- bypassam RLS.

-- ============================================================
-- 2. Funções de retenção
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_cargo_historico()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.cargo_historico
  WHERE data_alteracao < (now() - interval '180 days');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
EXCEPTION WHEN undefined_column THEN
  DELETE FROM public.cargo_historico
  WHERE created_at < (now() - interval '180 days');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_ranking_destaques()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ranking_destaques
  WHERE created_at < (now() - interval '365 days');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================
-- 3. Restringir EXECUTE de funções administrativas ao role authenticated
--    (corrige warn "Public Can Execute SECURITY DEFINER Function")
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.cleanup_read_notifications() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_cargo_historico() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_ranking_destaques() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_processo_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_advogado_ranking() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_promotor_ranking() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_magistrado_ranking() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_remove_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delegado_remove_police_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sortear_jurados(uuid, timestamptz, integer, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sortear_magistrado() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sortear_desembargador() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marcar_intimacoes_lidas(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.cleanup_read_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_cargo_historico() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_ranking_destaques() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_processo_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_advogado_ranking() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_promotor_ranking() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_magistrado_ranking() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delegado_remove_police_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sortear_jurados(uuid, timestamptz, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sortear_magistrado() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sortear_desembargador() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.marcar_intimacoes_lidas(uuid) TO authenticated;

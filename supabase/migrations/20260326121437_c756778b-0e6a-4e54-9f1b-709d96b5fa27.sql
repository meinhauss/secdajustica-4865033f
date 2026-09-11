
-- RLS policies for notificacoes - users can only see and update their own
DROP POLICY IF EXISTS "Users can read own notificacoes" ON public.notificacoes;
CREATE POLICY "Users can read own notificacoes"
ON public.notificacoes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notificacoes" ON public.notificacoes;
CREATE POLICY "Users can update own notificacoes"
ON public.notificacoes FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- System inserts via SECURITY DEFINER triggers, but allow insert policy for completeness
DROP POLICY IF EXISTS "System can insert notificacoes" ON public.notificacoes;
CREATE POLICY "System can insert notificacoes"
ON public.notificacoes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

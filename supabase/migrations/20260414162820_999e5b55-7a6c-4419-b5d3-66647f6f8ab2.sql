
-- Allow admins to delete all notifications
CREATE POLICY "Admins can delete all notifications"
ON public.notificacoes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notificacoes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to clean up read notifications older than 24h
CREATE OR REPLACE FUNCTION public.cleanup_read_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.notificacoes
  WHERE lida = true
    AND created_at < (now() - interval '24 hours')
  ;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

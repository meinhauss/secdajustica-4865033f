-- Permitir admin deletar movimentações (limpeza pós-arquivamento)
CREATE POLICY "Admin can delete movimentacoes"
ON public.movimentacoes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Garantir extensões para cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
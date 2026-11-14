DROP POLICY IF EXISTS "Advogados can insert procuracoes" ON public.procuracoes;
CREATE POLICY "Advogados can insert procuracoes" ON public.procuracoes FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (
  public.is_advogado_like(auth.uid())
  OR (public.is_magistrado_role(auth.uid()) AND advogado_id = auth.uid() AND documento_url = 'Em Causa Própria (Art. 103 do CPC)')
));
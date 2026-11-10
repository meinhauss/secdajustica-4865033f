CREATE OR REPLACE FUNCTION public.is_advogado_like(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'advogado') OR public.has_role(_uid,'defensor_publico')
      OR public.has_role(_uid,'defensor_publico_geral') OR public.has_role(_uid,'procurador_estado');
$$;
REVOKE EXECUTE ON FUNCTION public.is_advogado_like(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_advogado_like(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Advogados can insert procuracoes" ON public.procuracoes;
CREATE POLICY "Advogados can insert procuracoes" ON public.procuracoes FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND public.is_advogado_like(auth.uid()));

CREATE POLICY "Defensores e PGE veem movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated
USING (public.is_advogado_like(auth.uid()));
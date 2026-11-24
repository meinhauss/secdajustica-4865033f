CREATE POLICY "PGJ e Adjunto veem historico de processos acessiveis"
ON public.movimentacoes
FOR SELECT TO authenticated
USING (
  (public.has_role(auth.uid(), 'procurador_geral'::public.user_role)
   OR public.has_role(auth.uid(), 'procurador_geral_adjunto'::public.user_role))
  AND EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = movimentacoes.processo_id
      AND public.can_view_processo(auth.uid(), p.id, p.sigilo, p.juiz_id, p.advogado_autor_id, p.advogado_reu_id)
  )
);
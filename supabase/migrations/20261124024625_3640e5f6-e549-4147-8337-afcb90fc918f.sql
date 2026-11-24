ALTER POLICY "Chefias veem movimentacoes de servidores" ON public.movimentacoes
USING (
  (public.has_role(auth.uid(), 'defensor_publico_geral'::public.user_role)
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = movimentacoes.autor_id AND ur.role = 'defensor_publico'::public.user_role))
  OR (
    (public.has_role(auth.uid(), 'procurador_geral'::public.user_role) OR public.has_role(auth.uid(), 'procurador_geral_adjunto'::public.user_role))
    AND (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = movimentacoes.autor_id AND ur.role = 'ministerio_publico'::public.user_role)
      OR EXISTS (SELECT 1 FROM public.processos p WHERE p.id = movimentacoes.processo_id
        AND public.can_view_processo(auth.uid(), p.id, p.sigilo, p.juiz_id, p.advogado_autor_id, p.advogado_reu_id))
    )
  )
);
DROP POLICY "PGJ e Adjunto veem historico de processos acessiveis" ON public.movimentacoes;
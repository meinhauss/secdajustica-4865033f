
DROP POLICY "Movimentacoes visible to involved users" ON public.movimentacoes;

CREATE POLICY "Movimentacoes visible to involved users"
ON public.movimentacoes
FOR SELECT
TO authenticated
USING (
  (autor_id = auth.uid())
  OR (EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = movimentacoes.processo_id
    AND (p.juiz_id = auth.uid() OR p.advogado_autor_id = auth.uid() OR p.advogado_reu_id = auth.uid())
  ))
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'magistrado')
  OR has_role(auth.uid(), 'desembargador')
  OR has_role(auth.uid(), 'presidente_tribunal')
  OR has_role(auth.uid(), 'ministerio_publico')
  OR has_role(auth.uid(), 'oficial_justica')
  OR has_role(auth.uid(), 'advogado')
  OR has_role(auth.uid(), 'policia_civil')
  OR has_role(auth.uid(), 'policia_militar')
  OR has_role(auth.uid(), 'policia_federal')
);

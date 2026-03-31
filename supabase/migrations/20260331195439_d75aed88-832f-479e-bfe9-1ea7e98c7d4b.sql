-- Allow involved parties to update registros_cartorio (for signature confirmation)
DROP POLICY IF EXISTS "Oficial justica and admin can update registros cartorio" ON public.registros_cartorio;

CREATE POLICY "Involved users can update registros cartorio"
ON public.registros_cartorio
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'oficial_justica'::user_role)
  OR has_role(auth.uid(), 'admin'::user_role)
  OR is_involved_cartorio(auth.uid(), requerente_id, requerente_nome, partes_envolvidas)
);
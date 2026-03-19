
-- Drop the overly permissive SELECT policy
DROP POLICY "Registros cartorio readable by authenticated" ON public.registros_cartorio;

-- Create restrictive SELECT policy: only requerente, oficial_justica, or admin
CREATE POLICY "Registros cartorio visible to involved users"
ON public.registros_cartorio
FOR SELECT
TO authenticated
USING (
  requerente_id = auth.uid()
  OR has_role(auth.uid(), 'oficial_justica')
  OR has_role(auth.uid(), 'admin')
);

-- Also restrict UPDATE to only oficial_justica and admin
DROP POLICY "Authenticated can update registros cartorio" ON public.registros_cartorio;

CREATE POLICY "Oficial justica and admin can update registros cartorio"
ON public.registros_cartorio
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'oficial_justica')
  OR has_role(auth.uid(), 'admin')
);

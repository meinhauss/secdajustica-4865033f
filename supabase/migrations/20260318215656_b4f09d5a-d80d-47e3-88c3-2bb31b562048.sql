CREATE POLICY "Admin can delete carteiras OAB"
  ON public.carteiras_oab
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'presidente_oab'::user_role)
  );
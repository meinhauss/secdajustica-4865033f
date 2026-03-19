CREATE POLICY "Presidente OAB can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'presidente_oab'::user_role));
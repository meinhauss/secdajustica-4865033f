-- Add explicit INSERT policy for admins on user_roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Also allow presidente_oab to insert roles
CREATE POLICY "Presidente OAB can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'presidente_oab'::user_role));
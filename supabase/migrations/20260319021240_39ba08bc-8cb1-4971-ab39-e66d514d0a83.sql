CREATE POLICY "User roles publicly readable"
ON public.user_roles
FOR SELECT
TO public
USING (true);
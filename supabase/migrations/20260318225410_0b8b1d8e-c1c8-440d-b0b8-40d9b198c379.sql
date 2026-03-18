DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or admin"
ON public.profiles
FOR UPDATE
TO public
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::user_role)
);
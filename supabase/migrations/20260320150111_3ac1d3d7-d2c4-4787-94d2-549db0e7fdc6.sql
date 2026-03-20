CREATE POLICY "Admins can delete processos"
ON public.processos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));
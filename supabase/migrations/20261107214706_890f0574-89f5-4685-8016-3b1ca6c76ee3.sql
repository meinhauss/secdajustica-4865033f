GRANT INSERT ON public.denuncias_ouvidoria TO anon;
GRANT SELECT, INSERT, UPDATE ON public.denuncias_ouvidoria TO authenticated;
GRANT ALL ON public.denuncias_ouvidoria TO service_role;
DROP POLICY IF EXISTS "MP and admin can read denuncias ouvidoria" ON public.denuncias_ouvidoria;
DROP POLICY IF EXISTS "MP and admin can update denuncias ouvidoria" ON public.denuncias_ouvidoria;
CREATE POLICY "MP and admin can read denuncias ouvidoria" ON public.denuncias_ouvidoria FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'ministerio_publico') OR has_role(auth.uid(),'procurador_geral') OR has_role(auth.uid(),'procurador_geral_adjunto'));
CREATE POLICY "MP and admin can update denuncias ouvidoria" ON public.denuncias_ouvidoria FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'ministerio_publico') OR has_role(auth.uid(),'procurador_geral') OR has_role(auth.uid(),'procurador_geral_adjunto'));
NOTIFY pgrst, 'reload schema';

-- Allow public read access to concursos for the public portal
CREATE POLICY "Concursos publicly readable"
  ON public.concursos FOR SELECT
  TO public
  USING (true);


CREATE TABLE public.denuncias_ouvidoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_denunciante text DEFAULT 'Anônimo',
  contato_denunciante text,
  descricao text NOT NULL,
  envolvidos jsonb DEFAULT '[]'::jsonb,
  links jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'recebida'
);

ALTER TABLE public.denuncias_ouvidoria ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous complaints)
CREATE POLICY "Anyone can insert denuncias ouvidoria"
ON public.denuncias_ouvidoria FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Only MP and admin can read
CREATE POLICY "MP and admin can read denuncias ouvidoria"
ON public.denuncias_ouvidoria FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'ministerio_publico'::user_role)
  OR has_role(auth.uid(), 'procurador_geral'::user_role)
);

-- MP and admin can update status
CREATE POLICY "MP and admin can update denuncias ouvidoria"
ON public.denuncias_ouvidoria FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'ministerio_publico'::user_role)
  OR has_role(auth.uid(), 'procurador_geral'::user_role)
);

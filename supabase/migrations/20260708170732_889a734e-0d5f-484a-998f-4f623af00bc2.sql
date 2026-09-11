
CREATE TABLE public.leis_municipais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  ementa TEXT,
  conteudo TEXT NOT NULL,
  data_vigencia DATE,
  revogada BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.leis_municipais TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leis_municipais TO authenticated;
GRANT ALL ON public.leis_municipais TO service_role;

ALTER TABLE public.leis_municipais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leis municipais são públicas para leitura"
  ON public.leis_municipais FOR SELECT
  USING (true);

CREATE POLICY "Admins podem inserir leis"
  ON public.leis_municipais FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar leis"
  ON public.leis_municipais FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem remover leis"
  ON public.leis_municipais FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_leis_municipais_updated_at
  BEFORE UPDATE ON public.leis_municipais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_leis_municipais_categoria ON public.leis_municipais(categoria);
CREATE INDEX idx_leis_municipais_revogada ON public.leis_municipais(revogada);


-- Create cargo history table for promotion tracking
CREATE TABLE public.cargo_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'nomeacao', -- nomeacao, promocao, exoneracao, substituicao
  nomeado_por UUID REFERENCES auth.users(id),
  observacoes TEXT,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_fim TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cargo_historico ENABLE ROW LEVEL SECURITY;

-- Everyone can read cargo history
CREATE POLICY "Cargo history is publicly readable"
  ON public.cargo_historico FOR SELECT
  TO public USING (true);

-- Only admins can manage cargo history
CREATE POLICY "Admins can manage cargo history"
  ON public.cargo_historico FOR ALL
  TO public USING (public.has_role(auth.uid(), 'admin'));

-- Tabela de renúncias de prazo recursal
CREATE TABLE public.renuncias_prazo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  sentenca_id UUID NOT NULL REFERENCES public.sentencas(id) ON DELETE CASCADE,
  parte_tipo TEXT NOT NULL, -- 'autor' | 'reu' | 'mp'
  user_id UUID NOT NULL,
  user_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (sentenca_id, parte_tipo)
);

ALTER TABLE public.renuncias_prazo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renuncias readable by authenticated"
ON public.renuncias_prazo FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert renuncias"
ON public.renuncias_prazo FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

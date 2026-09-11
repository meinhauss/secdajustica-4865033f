
CREATE TABLE public.interessados_processo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  orgao TEXT NOT NULL,
  qualificacao TEXT NOT NULL DEFAULT 'interessado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(processo_id, user_id)
);

ALTER TABLE public.interessados_processo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interessados readable by authenticated" ON public.interessados_processo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert interessados" ON public.interessados_processo
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own interessado" ON public.interessados_processo
  FOR DELETE TO authenticated USING (user_id = auth.uid());

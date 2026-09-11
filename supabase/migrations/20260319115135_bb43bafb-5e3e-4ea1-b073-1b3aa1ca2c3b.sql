
CREATE TABLE public.jurisprudencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apelacao_id UUID REFERENCES public.apelacoes(id) ON DELETE CASCADE NOT NULL,
  processo_id UUID REFERENCES public.processos(id) NOT NULL,
  numero_acordao TEXT NOT NULL,
  classe TEXT,
  assunto TEXT,
  ementa TEXT NOT NULL,
  decisao_tipo TEXT NOT NULL,
  decisao_fundamentacao TEXT,
  decisao_dispositivo TEXT,
  desembargador_id UUID,
  desembargador_nome TEXT,
  data_julgamento TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.jurisprudencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jurisprudencias readable by authenticated"
  ON public.jurisprudencias FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert jurisprudencias"
  ON public.jurisprudencias FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

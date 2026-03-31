
CREATE TABLE public.embargos_declaracao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES public.processos(id),
  sentenca_id UUID NOT NULL REFERENCES public.sentencas(id),
  embargante_id UUID,
  embargante_nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'omissao',
  fundamentacao TEXT NOT NULL,
  pedido TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'opostos',
  decisao TEXT,
  decidido_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.embargos_declaracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Embargos readable by authenticated" ON public.embargos_declaracao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert embargos" ON public.embargos_declaracao
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update embargos" ON public.embargos_declaracao
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

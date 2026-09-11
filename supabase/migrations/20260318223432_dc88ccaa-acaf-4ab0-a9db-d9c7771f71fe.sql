
-- Table for appeals (apelações) to the Tribunal de Justiça
CREATE TABLE public.apelacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id),
  sentenca_id uuid NOT NULL REFERENCES public.sentencas(id),
  apelante_tipo text NOT NULL DEFAULT 'defesa', -- defesa, acusacao, ambos
  apelante_nome text NOT NULL,
  apelante_id uuid,
  desembargador_id uuid,
  fundamentacao text NOT NULL,
  pedido text NOT NULL,
  decisao_tipo text, -- mantida, reformada_parcial, reformada_total, anulada
  decisao_fundamentacao text,
  decisao_dispositivo text,
  status text NOT NULL DEFAULT 'interposta', -- interposta, admitida, em_julgamento, julgada, inadmitida
  numero_acordao text,
  data_distribuicao timestamptz,
  data_julgamento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apelacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apelacoes readable by authenticated" ON public.apelacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert apelacoes" ON public.apelacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update apelacoes" ON public.apelacoes
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_apelacoes_updated_at
  BEFORE UPDATE ON public.apelacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sequence for acordao numbers
CREATE SEQUENCE IF NOT EXISTS acordao_numero_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_acordao_numero()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.numero_acordao := 'AC-' || LPAD(nextval('acordao_numero_seq')::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM now())::TEXT;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_acordao_numero
  BEFORE INSERT ON public.apelacoes
  FOR EACH ROW EXECUTE FUNCTION generate_acordao_numero();

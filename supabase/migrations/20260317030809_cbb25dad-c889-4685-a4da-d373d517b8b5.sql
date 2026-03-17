
-- Sequence for protocol numbers
CREATE SEQUENCE IF NOT EXISTS protocolo_numero_seq START 1;

-- Protocolos (electronic filing)
CREATE TABLE public.protocolos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL DEFAULT '',
  processo_id uuid REFERENCES public.processos(id),
  tipo text NOT NULL DEFAULT 'peticao',
  descricao text NOT NULL,
  remetente_id uuid,
  remetente_nome text NOT NULL,
  documento_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.protocolos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Protocolos readable by authenticated" ON public.protocolos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert protocolos" ON public.protocolos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update protocolos" ON public.protocolos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Auto-generate protocol number
CREATE OR REPLACE FUNCTION public.generate_protocolo_numero()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.numero := 'PROT-' || LPAD(nextval('protocolo_numero_seq')::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM now())::TEXT;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_protocolo_numero BEFORE INSERT ON public.protocolos FOR EACH ROW EXECUTE FUNCTION generate_protocolo_numero();

-- Intimacoes (judicial notifications)
CREATE TABLE public.intimacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos(id) NOT NULL,
  destinatario_id uuid,
  destinatario_nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'intimacao',
  conteudo text NOT NULL,
  prazo_dias integer NOT NULL DEFAULT 5,
  data_envio timestamptz NOT NULL DEFAULT now(),
  data_leitura timestamptz,
  data_limite timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intimacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Intimacoes readable by authenticated" ON public.intimacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert intimacoes" ON public.intimacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update intimacoes" ON public.intimacoes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Certificacoes (certifications)
CREATE TABLE public.certificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos(id) NOT NULL,
  tipo text NOT NULL DEFAULT 'certidao_juntada',
  conteudo text NOT NULL,
  emitido_por uuid,
  emitido_por_nome text,
  assinado boolean NOT NULL DEFAULT false,
  data_assinatura timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificacoes readable by authenticated" ON public.certificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert certificacoes" ON public.certificacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update certificacoes" ON public.certificacoes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

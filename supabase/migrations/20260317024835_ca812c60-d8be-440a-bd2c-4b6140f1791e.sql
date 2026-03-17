
-- Table: denuncias_mp (prosecution filings by MP)
CREATE TABLE public.denuncias_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquerito_id uuid REFERENCES public.inqueritos(id) ON DELETE SET NULL,
  promotor_id uuid NOT NULL,
  numero_protocolo text NOT NULL DEFAULT '',
  resumo text NOT NULL,
  fundamentacao text NOT NULL,
  tipificacao text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'elaborada',
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.denuncias_mp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Denuncias MP readable by authenticated" ON public.denuncias_mp FOR SELECT TO authenticated USING (true);
CREATE POLICY "MP can insert denuncias" ON public.denuncias_mp FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "MP can update denuncias" ON public.denuncias_mp FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Table: arquivamentos_mp
CREATE TABLE public.arquivamentos_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquerito_id uuid NOT NULL REFERENCES public.inqueritos(id) ON DELETE CASCADE,
  promotor_id uuid NOT NULL,
  justificativa text NOT NULL,
  status text NOT NULL DEFAULT 'promovido',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arquivamentos_mp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Arquivamentos readable by authenticated" ON public.arquivamentos_mp FOR SELECT TO authenticated USING (true);
CREATE POLICY "MP can insert arquivamentos" ON public.arquivamentos_mp FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "MP can update arquivamentos" ON public.arquivamentos_mp FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Table: pareceres_mp (opinions on ongoing processes)
CREATE TABLE public.pareceres_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  promotor_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'parecer',
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pareceres_mp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pareceres readable by authenticated" ON public.pareceres_mp FOR SELECT TO authenticated USING (true);
CREATE POLICY "MP can insert pareceres" ON public.pareceres_mp FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Table: requisicoes_diligencia_mp (MP requests for police investigation)
CREATE TABLE public.requisicoes_diligencia_mp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquerito_id uuid NOT NULL REFERENCES public.inqueritos(id) ON DELETE CASCADE,
  promotor_id uuid NOT NULL,
  descricao text NOT NULL,
  prazo_dias integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pendente',
  resposta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.requisicoes_diligencia_mp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requisicoes readable by authenticated" ON public.requisicoes_diligencia_mp FOR SELECT TO authenticated USING (true);
CREATE POLICY "MP can insert requisicoes" ON public.requisicoes_diligencia_mp FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update requisicoes" ON public.requisicoes_diligencia_mp FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Sequence for denuncias protocol number
CREATE SEQUENCE IF NOT EXISTS denuncias_mp_numero_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_denuncia_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.numero_protocolo := 'DN-' || LPAD(nextval('denuncias_mp_numero_seq')::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM now())::TEXT;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_denuncia_numero
  BEFORE INSERT ON public.denuncias_mp
  FOR EACH ROW EXECUTE FUNCTION public.generate_denuncia_numero();


-- Inquéritos Policiais
CREATE TABLE public.inqueritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  bo_id uuid REFERENCES public.boletins_ocorrencia(id) ON DELETE SET NULL,
  delegado_id uuid,
  tipo text NOT NULL DEFAULT 'comum',
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'instaurado',
  sigilo boolean NOT NULL DEFAULT false,
  data_instauracao timestamptz NOT NULL DEFAULT now(),
  data_conclusao timestamptz,
  relatorio_final text,
  remetido_mp boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inqueritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inqueritos readable by authenticated" ON public.inqueritos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Police can insert inqueritos" ON public.inqueritos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Police can update inqueritos" ON public.inqueritos
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Sequence for inquérito numbers
CREATE SEQUENCE IF NOT EXISTS inquerito_numero_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_inquerito_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.numero := 'IP-' || LPAD(nextval('inquerito_numero_seq')::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM now())::TEXT;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_inquerito_numero
  BEFORE INSERT ON public.inqueritos
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_inquerito_numero();

-- Envolvidos (investigados, vítimas, testemunhas)
CREATE TABLE public.envolvidos_inquerito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquerito_id uuid NOT NULL REFERENCES public.inqueritos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  id_personagem text,
  tipo text NOT NULL DEFAULT 'investigado',
  qualificacao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.envolvidos_inquerito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envolvidos readable by authenticated" ON public.envolvidos_inquerito
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Police can insert envolvidos" ON public.envolvidos_inquerito
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Police can update envolvidos" ON public.envolvidos_inquerito
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Diligências
CREATE TABLE public.diligencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquerito_id uuid NOT NULL REFERENCES public.inqueritos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'investigacao',
  descricao text NOT NULL,
  responsavel_id uuid,
  responsavel_nome text,
  status text NOT NULL DEFAULT 'pendente',
  resultado text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diligencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diligencias readable by authenticated" ON public.diligencias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Police can insert diligencias" ON public.diligencias
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Police can update diligencias" ON public.diligencias
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Oitivas (depoimentos)
CREATE TABLE public.oitivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquerito_id uuid NOT NULL REFERENCES public.inqueritos(id) ON DELETE CASCADE,
  envolvido_id uuid REFERENCES public.envolvidos_inquerito(id) ON DELETE SET NULL,
  nome_depoente text NOT NULL,
  tipo text NOT NULL DEFAULT 'testemunha',
  conteudo text NOT NULL,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oitivas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Oitivas readable by authenticated" ON public.oitivas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Police can insert oitivas" ON public.oitivas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Sequence for B.O. numbers (replace random approach)
CREATE SEQUENCE IF NOT EXISTS bo_numero_seq START 100;

CREATE OR REPLACE FUNCTION public.generate_bo_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' OR NEW.numero LIKE 'BO-%' THEN
    NEW.numero := 'BO-' || LPAD(nextval('bo_numero_seq')::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM now())::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_bo_numero
  BEFORE INSERT ON public.boletins_ocorrencia
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_bo_numero();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inqueritos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.boletins_ocorrencia;

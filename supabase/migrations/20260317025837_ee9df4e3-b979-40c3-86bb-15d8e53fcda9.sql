
-- Inscricoes OAB (lawyer registration applications)
CREATE TABLE public.inscricoes_oab (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome_completo text NOT NULL,
  id_personagem text,
  email text,
  telefone text,
  especialidade text,
  justificativa text,
  status text NOT NULL DEFAULT 'pendente',
  motivo_indeferimento text,
  aprovado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inscricoes_oab ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inscricoes OAB readable by authenticated" ON public.inscricoes_oab FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inscricoes OAB" ON public.inscricoes_oab FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update inscricoes OAB" ON public.inscricoes_oab FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Carteiras OAB (digital lawyer cards)
CREATE SEQUENCE IF NOT EXISTS oab_numero_seq START 1001;

CREATE TABLE public.carteiras_oab (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inscricao_id uuid REFERENCES public.inscricoes_oab(id) ON DELETE SET NULL,
  numero_oab text NOT NULL DEFAULT '',
  nome_completo text NOT NULL,
  id_personagem text,
  foto_url text,
  especialidade text,
  status text NOT NULL DEFAULT 'ativo',
  data_inscricao timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.carteiras_oab ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Carteiras OAB readable by authenticated" ON public.carteiras_oab FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert carteiras OAB" ON public.carteiras_oab FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update carteiras OAB" ON public.carteiras_oab FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.generate_oab_numero()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.numero_oab := 'OAB/SP ' || LPAD(nextval('oab_numero_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_oab_numero
  BEFORE INSERT ON public.carteiras_oab
  FOR EACH ROW EXECUTE FUNCTION public.generate_oab_numero();

-- Tabela de honorários
CREATE TABLE public.honorarios_tabela (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_atuacao text NOT NULL,
  descricao text,
  valor_minimo numeric NOT NULL DEFAULT 0,
  valor_sugerido numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.honorarios_tabela ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Honorarios readable by authenticated" ON public.honorarios_tabela FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert honorarios" ON public.honorarios_tabela FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can update honorarios" ON public.honorarios_tabela FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete honorarios" ON public.honorarios_tabela FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Procedimentos disciplinares
CREATE TABLE public.procedimentos_disciplinares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advogado_user_id uuid NOT NULL,
  denunciante_id uuid,
  tipo text NOT NULL DEFAULT 'denuncia',
  descricao text NOT NULL,
  sancao text,
  status text NOT NULL DEFAULT 'aberto',
  parecer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procedimentos_disciplinares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Disciplinares readable by authenticated" ON public.procedimentos_disciplinares FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert disciplinares" ON public.procedimentos_disciplinares FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update disciplinares" ON public.procedimentos_disciplinares FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Comunicados OAB
CREATE TABLE public.comunicados_oab (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'aviso',
  autor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comunicados_oab ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comunicados readable by authenticated" ON public.comunicados_oab FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert comunicados" ON public.comunicados_oab FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);


-- Concursos (contests/exams)
CREATE TABLE public.concursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  cargo text NOT NULL,
  vagas integer NOT NULL DEFAULT 1,
  requisitos text,
  conteudo_programatico text,
  regras_classificacao text,
  status text NOT NULL DEFAULT 'rascunho',
  data_abertura timestamptz,
  data_encerramento_inscricoes timestamptz,
  data_prova timestamptz,
  data_resultado timestamptz,
  edital_url text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.concursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Concursos readable by authenticated" ON public.concursos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert concursos" ON public.concursos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can update concursos" ON public.concursos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Inscrições em concursos
CREATE SEQUENCE IF NOT EXISTS concurso_inscricao_seq START 1;

CREATE TABLE public.inscricoes_concurso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  numero_inscricao text NOT NULL DEFAULT '',
  nome_completo text NOT NULL,
  id_personagem text,
  status text NOT NULL DEFAULT 'confirmada',
  nota_objetiva numeric,
  nota_discursiva numeric,
  nota_final numeric,
  classificacao integer,
  presente boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inscricoes_concurso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inscricoes concurso readable by authenticated" ON public.inscricoes_concurso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inscricoes concurso" ON public.inscricoes_concurso FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update inscricoes concurso" ON public.inscricoes_concurso FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.generate_inscricao_concurso_numero()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.numero_inscricao := 'INSC-' || LPAD(nextval('concurso_inscricao_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_inscricao_concurso_numero
  BEFORE INSERT ON public.inscricoes_concurso
  FOR EACH ROW EXECUTE FUNCTION public.generate_inscricao_concurso_numero();

-- Questões de prova
CREATE TABLE public.questoes_concurso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  numero integer NOT NULL DEFAULT 1,
  tipo text NOT NULL DEFAULT 'objetiva',
  enunciado text NOT NULL,
  alternativa_a text,
  alternativa_b text,
  alternativa_c text,
  alternativa_d text,
  gabarito text,
  peso numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.questoes_concurso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questoes readable by authenticated" ON public.questoes_concurso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert questoes" ON public.questoes_concurso FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can update questoes" ON public.questoes_concurso FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete questoes" ON public.questoes_concurso FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Respostas dos candidatos
CREATE TABLE public.respostas_concurso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL REFERENCES public.inscricoes_concurso(id) ON DELETE CASCADE,
  questao_id uuid NOT NULL REFERENCES public.questoes_concurso(id) ON DELETE CASCADE,
  resposta text,
  correta boolean,
  nota numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.respostas_concurso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Respostas readable by authenticated" ON public.respostas_concurso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert respostas" ON public.respostas_concurso FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update respostas" ON public.respostas_concurso FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Comunicados de concurso
CREATE TABLE public.comunicados_concurso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'aviso',
  autor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comunicados_concurso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comunicados concurso readable by authenticated" ON public.comunicados_concurso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert comunicados concurso" ON public.comunicados_concurso FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);


-- Documentos do processo (petições, laudos, provas, etc.)
CREATE TABLE public.documentos_processo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'peticao',
  descricao text,
  arquivo_url text,
  autor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_processo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Docs are readable by authenticated" ON public.documentos_processo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert docs" ON public.documentos_processo
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Prazos processuais
CREATE TABLE public.prazos_processuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'intimacao',
  data_inicio timestamptz NOT NULL DEFAULT now(),
  data_fim timestamptz NOT NULL,
  dias_uteis integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'em_andamento',
  responsavel_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prazos_processuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prazos readable by authenticated" ON public.prazos_processuais
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert prazos" ON public.prazos_processuais
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update prazos" ON public.prazos_processuais
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Atos judiciais (mandados, intimações, sentenças, alvarás, certidões)
CREATE TABLE public.atos_judiciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'despacho',
  titulo text NOT NULL,
  conteudo text NOT NULL,
  autor_id uuid,
  autor_nome text,
  assinado boolean NOT NULL DEFAULT false,
  data_assinatura timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.atos_judiciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atos readable by authenticated" ON public.atos_judiciais
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert atos" ON public.atos_judiciais
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update atos" ON public.atos_judiciais
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Storage bucket for process documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-processuais', 'documentos-processuais', true);

CREATE POLICY "Authenticated can upload process docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos-processuais');

CREATE POLICY "Public can read process docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos-processuais');

-- Enable realtime for movimentacoes and atos
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atos_judiciais;

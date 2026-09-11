
-- Table: mandados (judicial warrants/orders)
CREATE TABLE public.mandados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  magistrado_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'generico',
  destinatario_nome text NOT NULL,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'expedido',
  cumprido_por uuid,
  cumprido_em timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mandados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mandados readable by authenticated" ON public.mandados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert mandados" ON public.mandados FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update mandados" ON public.mandados FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Table: sentencas (sentences/judgments)
CREATE TABLE public.sentencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  magistrado_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'sentenca',
  ementa text,
  fundamentacao text NOT NULL,
  dispositivo text NOT NULL,
  assinado boolean NOT NULL DEFAULT false,
  data_publicacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sentencas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sentencas readable by authenticated" ON public.sentencas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sentencas" ON public.sentencas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update sentencas" ON public.sentencas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

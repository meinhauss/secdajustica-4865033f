
-- Table to store API keys for external systems
CREATE TABLE public.api_keys_externas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orgao text NOT NULL, -- 'policia_civil', 'policia_federal', 'receita'
  nome_sistema text NOT NULL,
  api_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys_externas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can manage api keys" ON public.api_keys_externas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Table for external communications (inbox/outbox)
CREATE TABLE public.comunicacoes_externas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys_externas(id) NOT NULL,
  orgao_origem text NOT NULL,
  tipo text NOT NULL DEFAULT 'inquerito', -- 'inquerito', 'denuncia', 'comunicacao', 'resposta_mp'
  direcao text NOT NULL DEFAULT 'entrada', -- 'entrada' (para MP), 'saida' (do MP)
  titulo text NOT NULL,
  conteudo text NOT NULL,
  envolvidos jsonb DEFAULT '[]'::jsonb,
  links jsonb DEFAULT '[]'::jsonb,
  numero_referencia text,
  inquerito_id uuid REFERENCES public.inqueritos(id),
  denuncia_ouvidoria_id uuid REFERENCES public.denuncias_ouvidoria(id),
  status text NOT NULL DEFAULT 'pendente', -- 'pendente', 'recebido', 'lido', 'respondido'
  lido_em timestamptz,
  lido_por uuid,
  resposta_a uuid REFERENCES public.comunicacoes_externas(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comunicacoes_externas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MP and admin can read comunicacoes externas" ON public.comunicacoes_externas
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'ministerio_publico'::user_role) OR has_role(auth.uid(), 'procurador_geral'::user_role));

CREATE POLICY "MP and admin can update comunicacoes externas" ON public.comunicacoes_externas
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'ministerio_publico'::user_role) OR has_role(auth.uid(), 'procurador_geral'::user_role));

CREATE POLICY "MP and admin can insert comunicacoes externas" ON public.comunicacoes_externas
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'ministerio_publico'::user_role) OR has_role(auth.uid(), 'procurador_geral'::user_role));

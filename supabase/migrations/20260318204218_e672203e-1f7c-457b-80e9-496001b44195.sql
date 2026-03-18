
-- 1. Notifications table
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  lida BOOLEAN NOT NULL DEFAULT false,
  link_secao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.notificacoes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notificacoes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated can insert notifications (for system use)
CREATE POLICY "Authenticated can insert notifications"
  ON public.notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix BO visibility - drop overly permissive SELECT policy, add restricted one
DROP POLICY IF EXISTS "BOs are publicly readable" ON public.boletins_ocorrencia;

CREATE POLICY "Users can read own BOs"
  ON public.boletins_ocorrencia FOR SELECT
  TO authenticated
  USING (
    vitima_id = auth.uid() 
    OR delegado_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::user_role)
    OR has_role(auth.uid(), 'magistrado'::user_role)
    OR has_role(auth.uid(), 'ministerio_publico'::user_role)
  );

-- 3. Cartório civil registry table
CREATE TABLE public.registros_cartorio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'certidao_nascimento',
  subtipo TEXT,
  requerente_id UUID,
  requerente_nome TEXT NOT NULL,
  id_personagem TEXT,
  partes_envolvidas TEXT,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'solicitado',
  observacoes TEXT,
  documento_url TEXT,
  emitido_por UUID,
  emitido_por_nome TEXT,
  numero_registro TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.registros_cartorio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registros cartorio readable by authenticated"
  ON public.registros_cartorio FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert registros cartorio"
  ON public.registros_cartorio FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update registros cartorio"
  ON public.registros_cartorio FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Auto-generate registro number
CREATE SEQUENCE IF NOT EXISTS registro_cartorio_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_registro_cartorio_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.numero_registro := 'RC-' || LPAD(nextval('registro_cartorio_seq')::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM now())::TEXT;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_registro_cartorio_numero
  BEFORE INSERT ON public.registros_cartorio
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_registro_cartorio_numero();

-- Updated_at trigger for registros_cartorio
CREATE TRIGGER update_registros_cartorio_updated_at
  BEFORE UPDATE ON public.registros_cartorio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

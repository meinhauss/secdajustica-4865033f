
CREATE TABLE public.inscricoes_unisp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_completo TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  id_personagem TEXT,
  motivacao TEXT NOT NULL,
  area_interesse TEXT NOT NULL DEFAULT 'juridico_publico',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inscricoes_unisp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inscricoes_unisp"
ON public.inscricoes_unisp FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inscricoes_unisp"
ON public.inscricoes_unisp FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all inscricoes_unisp"
ON public.inscricoes_unisp FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all inscricoes_unisp"
ON public.inscricoes_unisp FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_inscricoes_unisp_updated_at
BEFORE UPDATE ON public.inscricoes_unisp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

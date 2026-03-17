
-- Drop the words table (not needed for this project)
DROP TABLE IF EXISTS public.words;

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM (
  'admin', 'magistrado', 'ministerio_publico', 'delegado', 
  'oficial_justica', 'advogado', 'cidadao'
);

-- Create enum for process status
CREATE TYPE public.processo_status AS ENUM (
  'novo', 'em_andamento', 'concluso', 'sentenciado', 'arquivado', 'suspenso'
);

-- Create enum for process class
CREATE TYPE public.classe_processual AS ENUM (
  'criminal', 'civil', 'administrativo', 'constitucional'
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  oab_numero TEXT,
  cargo TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Processos table
CREATE TABLE public.processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  classe classe_processual NOT NULL DEFAULT 'civil',
  status processo_status NOT NULL DEFAULT 'novo',
  assunto TEXT NOT NULL,
  descricao TEXT,
  autor_nome TEXT NOT NULL,
  reu_nome TEXT NOT NULL,
  juiz_id UUID REFERENCES auth.users(id),
  advogado_autor_id UUID REFERENCES auth.users(id),
  advogado_reu_id UUID REFERENCES auth.users(id),
  vara TEXT,
  valor_causa DECIMAL(15,2),
  prioridade BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Processos are publicly readable" ON public.processos FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert processos" ON public.processos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update processos" ON public.processos FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Movimentações processuais
CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  autor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Movimentacoes are publicly readable" ON public.movimentacoes FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert movimentacoes" ON public.movimentacoes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Boletins de Ocorrência
CREATE TABLE public.boletins_ocorrencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  local_fato TEXT,
  data_fato TIMESTAMP WITH TIME ZONE,
  vitima_nome TEXT NOT NULL,
  vitima_id UUID REFERENCES auth.users(id),
  delegado_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'registrado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boletins_ocorrencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BOs are publicly readable" ON public.boletins_ocorrencia FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert BOs" ON public.boletins_ocorrencia FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update BOs" ON public.boletins_ocorrencia FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Audiências
CREATE TABLE public.audiencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'instrução',
  local TEXT DEFAULT 'Sala de Audiências 1',
  status TEXT NOT NULL DEFAULT 'agendada',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audiencias are publicly readable" ON public.audiencias FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert audiencias" ON public.audiencias FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update audiencias" ON public.audiencias FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Sequence for process numbers
CREATE SEQUENCE IF NOT EXISTS processo_numero_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_processo_numero()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero := LPAD(nextval('processo_numero_seq')::TEXT, 7, '0') || '-' || 
                EXTRACT(YEAR FROM now())::TEXT || '.8.26.0001';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_processo_numero
  BEFORE INSERT ON public.processos
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION public.generate_processo_numero();

-- Auto update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON public.processos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bos_updated_at BEFORE UPDATE ON public.boletins_ocorrencia FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome_completo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cidadao');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

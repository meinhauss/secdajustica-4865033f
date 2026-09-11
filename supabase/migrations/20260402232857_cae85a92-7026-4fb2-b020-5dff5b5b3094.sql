
CREATE SEQUENCE IF NOT EXISTS tco_numero_seq START 1;

CREATE TABLE public.tcos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL DEFAULT '',
  autor_policial_id UUID,
  autor_policial_nome TEXT NOT NULL,
  natureza_infracao TEXT NOT NULL,
  tipificacao_penal TEXT NOT NULL DEFAULT '',
  descricao_fatos TEXT NOT NULL,
  data_fato TIMESTAMP WITH TIME ZONE,
  local_fato TEXT,
  compromisso_jecrim BOOLEAN NOT NULL DEFAULT false,
  data_compromisso TIMESTAMP WITH TIME ZONE,
  local_compromisso TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'elaborado',
  processo_id UUID REFERENCES public.processos(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.generate_tco_numero()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  NEW.numero := 'TCO-' || LPAD(nextval('tco_numero_seq')::TEXT, 6, '0') || '/' || EXTRACT(YEAR FROM now())::TEXT;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_tco_numero BEFORE INSERT ON public.tcos FOR EACH ROW EXECUTE FUNCTION public.generate_tco_numero();
CREATE TRIGGER update_tcos_updated_at BEFORE UPDATE ON public.tcos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.envolvidos_tco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tco_id UUID NOT NULL REFERENCES public.tcos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'autor_fato',
  id_personagem TEXT,
  qualificacao TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tcos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envolvidos_tco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Police and admin can read tcos" ON public.tcos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'policia_civil') OR has_role(auth.uid(), 'policia_militar') OR has_role(auth.uid(), 'policia_federal') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'magistrado') OR has_role(auth.uid(), 'desembargador') OR has_role(auth.uid(), 'presidente_tribunal') OR has_role(auth.uid(), 'ministerio_publico') OR has_role(auth.uid(), 'procurador_geral'));

CREATE POLICY "Police can insert tcos" ON public.tcos FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'policia_civil') OR has_role(auth.uid(), 'policia_militar') OR has_role(auth.uid(), 'policia_federal') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Police can update tcos" ON public.tcos FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'policia_civil') OR has_role(auth.uid(), 'policia_militar') OR has_role(auth.uid(), 'policia_federal') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Read envolvidos_tco" ON public.envolvidos_tco FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'policia_civil') OR has_role(auth.uid(), 'policia_militar') OR has_role(auth.uid(), 'policia_federal') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'magistrado') OR has_role(auth.uid(), 'desembargador') OR has_role(auth.uid(), 'presidente_tribunal') OR has_role(auth.uid(), 'ministerio_publico') OR has_role(auth.uid(), 'procurador_geral'));

CREATE POLICY "Insert envolvidos_tco" ON public.envolvidos_tco FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'policia_civil') OR has_role(auth.uid(), 'policia_militar') OR has_role(auth.uid(), 'policia_federal') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete envolvidos_tco" ON public.envolvidos_tco FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'policia_civil') OR has_role(auth.uid(), 'policia_militar') OR has_role(auth.uid(), 'policia_federal') OR has_role(auth.uid(), 'admin'));

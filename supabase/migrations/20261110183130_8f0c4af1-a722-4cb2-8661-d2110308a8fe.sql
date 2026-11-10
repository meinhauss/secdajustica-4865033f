CREATE TABLE public.recursos_segundo_grau (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  apelacao_id uuid REFERENCES public.apelacoes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  decisao_impugnada text NOT NULL,
  vicio text,
  peca text NOT NULL,
  recorrente_id uuid NOT NULL,
  recorrente_nome text NOT NULL,
  status text NOT NULL DEFAULT 'interposto',
  resultado text,
  decisao text,
  decidido_por uuid,
  decidido_por_nome text,
  decidido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.recursos_segundo_grau TO authenticated;
GRANT ALL ON public.recursos_segundo_grau TO service_role;
ALTER TABLE public.recursos_segundo_grau ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver recursos de 2o grau de processos visiveis" ON public.recursos_segundo_grau FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.processos p WHERE p.id = processo_id
  AND public.can_view_processo(auth.uid(), p.id, p.sigilo, p.juiz_id, p.advogado_autor_id, p.advogado_reu_id)));

CREATE POLICY "Interpor recurso de 2o grau" ON public.recursos_segundo_grau FOR INSERT TO authenticated
WITH CHECK (recorrente_id = auth.uid() AND status = 'interposto' AND resultado IS NULL AND decidido_por IS NULL
  AND tipo IN ('agravo_interno','embargos_declaracao')
  AND EXISTS (SELECT 1 FROM public.processos p WHERE p.id = processo_id
  AND public.can_view_processo(auth.uid(), p.id, p.sigilo, p.juiz_id, p.advogado_autor_id, p.advogado_reu_id)));

CREATE POLICY "Tribunal decide recurso de 2o grau" ON public.recursos_segundo_grau FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'desembargador') OR public.has_role(auth.uid(),'presidente_tribunal') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'desembargador') OR public.has_role(auth.uid(),'presidente_tribunal') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_recursos_2g_updated BEFORE UPDATE ON public.recursos_segundo_grau
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
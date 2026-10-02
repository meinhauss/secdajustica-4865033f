CREATE TABLE public.outorga_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outorgante user_role NOT NULL,
  cargo user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outorgante, cargo)
);
GRANT SELECT ON public.outorga_regras TO authenticated;
GRANT ALL ON public.outorga_regras TO service_role;
ALTER TABLE public.outorga_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logados leem regras" ON public.outorga_regras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia regras" ON public.outorga_regras FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.outorga_regras(outorgante, cargo) VALUES
('presidente_tribunal','desembargador'),('presidente_tribunal','magistrado'),('presidente_tribunal','oficial_justica'),('presidente_tribunal','analista'),
('desembargador','magistrado'),('desembargador','analista'),
('magistrado','analista'),
('procurador_geral','ministerio_publico'),('procurador_geral','analista'),
('ministerio_publico','analista'),
('chefe_gaeco','gaeco'),('chefe_gaeco','analista'),
('defensor_publico_geral','defensor_publico'),('defensor_publico_geral','analista'),
('defensor_publico','analista'),
('procurador_estado','analista'),
('presidente_oab','advogado'),('presidente_oab','bacharel_direito'),
('delegado','delegado'),('delegado','policia_civil'),('delegado','policia_federal'),('delegado','investigador'),('delegado','analista');

CREATE OR REPLACE FUNCTION public.pode_outorgar(_uid uuid, _cargo user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM outorga_regras r JOIN user_roles ur ON ur.role = r.outorgante
                 WHERE ur.user_id = _uid AND r.cargo = _cargo)
$$;

CREATE OR REPLACE FUNCTION public.delegado_assign_police_role(p_user_id uuid, p_role user_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _inst text[] := corregedor_instituicoes(auth.uid()); _ok boolean := false;
BEGIN
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode alterar seus próprios cargos'; END IF;
  IF has_role(auth.uid(), 'admin') THEN _ok := true;
  ELSIF pode_outorgar(auth.uid(), p_role) THEN _ok := true;
  ELSIF p_role::text = ANY(_inst) THEN _ok := true;
  ELSIF p_role::text = 'corregedor' AND array_length(_inst,1) > 0 AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role::text = ANY(_inst)) THEN _ok := true;
  END IF;
  IF NOT _ok THEN RAISE EXCEPTION 'Você não tem permissão para atribuir este cargo'; END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = p_role) THEN
    RAISE EXCEPTION 'Usuário já possui este cargo';
  END IF;
  INSERT INTO user_roles(user_id, role) VALUES (p_user_id, p_role);
  INSERT INTO cargo_historico(user_id, role, tipo, nomeado_por, observacoes)
  VALUES (p_user_id, p_role, 'nomeacao', auth.uid(), 'Nomeado por liderança institucional');
  IF p_role = 'analista' AND NOT has_role(auth.uid(),'admin') THEN
    INSERT INTO analista_vinculos(analista_id, supervisor_id, created_by)
    VALUES (p_user_id, auth.uid(), auth.uid())
    ON CONFLICT (analista_id) DO UPDATE SET supervisor_id = EXCLUDED.supervisor_id, created_by = EXCLUDED.created_by;
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.delegado_remove_police_role(p_role_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _target_role text; _target_user uuid; _inst text[] := corregedor_instituicoes(auth.uid()); _ok boolean := false;
BEGIN
  SELECT role::text, user_id INTO _target_role, _target_user FROM user_roles WHERE id = p_role_id;
  IF _target_role IS NULL THEN RAISE EXCEPTION 'Cargo não encontrado'; END IF;
  IF _target_user = auth.uid() THEN RAISE EXCEPTION 'Você não pode remover seu próprio cargo'; END IF;
  IF has_role(auth.uid(), 'admin') THEN _ok := true;
  ELSIF pode_outorgar(auth.uid(), _target_role::user_role) THEN _ok := true;
  ELSIF _target_role = ANY(_inst) THEN _ok := true;
  ELSIF _target_role = 'corregedor' AND array_length(_inst,1) > 0 AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _target_user AND role::text = ANY(_inst)) THEN _ok := true;
  ELSIF has_role(auth.uid(), 'chefe_gaeco') AND _target_role IN ('policia_civil','policia_militar','policia_federal','delegado','gaeco','chefe_gaeco')
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = _target_role) THEN _ok := true;
  END IF;
  IF NOT _ok THEN RAISE EXCEPTION 'Você não tem permissão para remover este cargo'; END IF;
  DELETE FROM user_roles WHERE id = p_role_id;
  IF _target_role = 'analista' THEN DELETE FROM analista_vinculos WHERE analista_id = _target_user; END IF;
  INSERT INTO cargo_historico(user_id, role, tipo, nomeado_por, observacoes)
  VALUES (_target_user, _target_role::user_role, 'exoneracao', auth.uid(), 'Exoneração do cargo');
  UPDATE cargo_historico SET data_fim = now()
  WHERE user_id = _target_user AND role::text = _target_role AND tipo = 'nomeacao' AND data_fim IS NULL;
END; $function$;
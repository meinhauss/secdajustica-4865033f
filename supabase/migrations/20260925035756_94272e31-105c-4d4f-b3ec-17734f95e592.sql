CREATE OR REPLACE FUNCTION public.corregedor_instituicoes(_uid uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id=_uid AND role::text='corregedor')
    THEN COALESCE(ARRAY(SELECT role::text FROM user_roles WHERE user_id=_uid AND role::text IN ('policia_civil','policia_militar','policia_federal')), '{}')
    ELSE '{}'::text[] END
$$;
REVOKE EXECUTE ON FUNCTION public.corregedor_instituicoes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.corregedor_instituicoes(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delegado_assign_police_role(p_user_id uuid, p_role user_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _inst text[] := corregedor_instituicoes(auth.uid()); _ok boolean := false;
BEGIN
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode alterar seus próprios cargos'; END IF;
  IF has_role(auth.uid(), 'admin') THEN _ok := true;
  ELSIF has_role(auth.uid(), 'delegado') AND p_role::text IN ('delegado','policia_civil','policia_federal') THEN _ok := true;
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
  VALUES (p_user_id, p_role, 'nomeacao', auth.uid(), 'Nomeado por delegado/corregedor');
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
  ELSIF has_role(auth.uid(), 'delegado') AND _target_role IN ('delegado','policia_civil','policia_federal') THEN _ok := true;
  ELSIF _target_role = ANY(_inst) THEN _ok := true;
  ELSIF _target_role = 'corregedor' AND array_length(_inst,1) > 0 AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _target_user AND role::text = ANY(_inst)) THEN _ok := true;
  ELSIF has_role(auth.uid(), 'chefe_gaeco') AND _target_role IN ('policia_civil','policia_militar','policia_federal','delegado','gaeco','chefe_gaeco')
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = _target_role) THEN _ok := true;
  END IF;
  IF NOT _ok THEN RAISE EXCEPTION 'Você não tem permissão para remover este cargo'; END IF;
  DELETE FROM user_roles WHERE id = p_role_id;
  INSERT INTO cargo_historico(user_id, role, tipo, nomeado_por, observacoes)
  VALUES (_target_user, _target_role::user_role, 'exoneracao', auth.uid(), 'Exoneração do cargo');
  UPDATE cargo_historico SET data_fim = now()
  WHERE user_id = _target_user AND role::text = _target_role AND tipo = 'nomeacao' AND data_fim IS NULL;
END; $function$;
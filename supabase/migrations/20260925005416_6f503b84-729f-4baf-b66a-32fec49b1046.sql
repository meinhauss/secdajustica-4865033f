CREATE OR REPLACE FUNCTION public.delegado_assign_police_role(p_user_id uuid, p_role user_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'delegado')) THEN
    RAISE EXCEPTION 'Apenas administradores ou delegados podem atribuir cargos policiais';
  END IF;
  IF NOT has_role(auth.uid(), 'admin') AND p_role::text NOT IN ('delegado','policia_civil','policia_federal') THEN
    RAISE EXCEPTION 'Delegados só podem atribuir Delegado, Polícia Civil ou Polícia Federal';
  END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = p_role) THEN
    RAISE EXCEPTION 'Usuário já possui este cargo';
  END IF;
  INSERT INTO user_roles(user_id, role) VALUES (p_user_id, p_role);
  INSERT INTO cargo_historico(user_id, role, tipo, nomeado_por, observacoes)
  VALUES (p_user_id, p_role, 'nomeacao', auth.uid(), 'Nomeado por delegado');
END; $$;
REVOKE EXECUTE ON FUNCTION public.delegado_assign_police_role(uuid, user_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delegado_assign_police_role(uuid, user_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.delegado_remove_police_role(p_role_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _target_role text; _target_user uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'delegado') OR has_role(auth.uid(), 'chefe_gaeco')) THEN
    RAISE EXCEPTION 'Apenas administradores ou delegados podem remover cargos policiais';
  END IF;
  SELECT role::text, user_id INTO _target_role, _target_user FROM user_roles WHERE id = p_role_id;
  IF _target_role IS NULL THEN RAISE EXCEPTION 'Cargo não encontrado'; END IF;
  IF _target_user = auth.uid() THEN RAISE EXCEPTION 'Você não pode remover seu próprio cargo'; END IF;
  IF NOT has_role(auth.uid(), 'admin') THEN
    IF has_role(auth.uid(), 'delegado') AND _target_role IN ('delegado','policia_civil','policia_federal') THEN
      NULL;
    ELSIF _target_role IN ('policia_civil','policia_militar','policia_federal','delegado','gaeco','chefe_gaeco')
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = _target_role) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Você não tem permissão para remover este cargo';
    END IF;
  END IF;
  DELETE FROM user_roles WHERE id = p_role_id;
  INSERT INTO cargo_historico(user_id, role, tipo, nomeado_por, observacoes)
  VALUES (_target_user, _target_role::user_role, 'exoneracao', auth.uid(), 'Exoneração do cargo');
  UPDATE cargo_historico SET data_fim = now()
  WHERE user_id = _target_user AND role::text = _target_role AND tipo = 'nomeacao' AND data_fim IS NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.delegado_remove_police_role(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delegado_remove_police_role(uuid) TO authenticated;
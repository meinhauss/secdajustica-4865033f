CREATE OR REPLACE FUNCTION public.delegado_remove_police_role(p_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _target_role text;
  _target_user uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'delegado')) THEN
    RAISE EXCEPTION 'Apenas administradores ou delegados podem remover cargos policiais';
  END IF;

  SELECT role::text, user_id INTO _target_role, _target_user
  FROM public.user_roles WHERE id = p_role_id;

  IF _target_role IS NULL THEN
    RAISE EXCEPTION 'Cargo não encontrado';
  END IF;

  IF _target_user = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio cargo';
  END IF;

  IF NOT has_role(auth.uid(), 'admin') THEN
    IF _target_role NOT IN ('policia_civil','policia_militar','policia_federal','delegado') THEN
      RAISE EXCEPTION 'Delegados só podem remover cargos policiais';
    END IF;
    -- Delegado precisa ter o mesmo cargo policial que está removendo (ou ser delegado removendo delegado)
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text = _target_role
    ) THEN
      RAISE EXCEPTION 'Você só pode remover cargos que você mesmo possui';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE id = p_role_id;
END;
$$;
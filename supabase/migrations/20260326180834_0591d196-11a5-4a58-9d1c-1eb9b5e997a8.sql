
CREATE OR REPLACE FUNCTION public.admin_remove_role(p_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem remover cargos';
  END IF;

  DELETE FROM public.user_roles WHERE id = p_role_id;
END;
$$;

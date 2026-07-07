
CREATE OR REPLACE FUNCTION public.sync_oab_status_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('suspenso', 'cancelado')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role <> 'cidadao';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'cidadao')
    ON CONFLICT (user_id, role) DO NOTHING;

  ELSIF NEW.status = 'ativo'
        AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'advogado')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_oab_status_roles ON public.carteiras_oab;
CREATE TRIGGER trg_sync_oab_status_roles
AFTER INSERT OR UPDATE OF status ON public.carteiras_oab
FOR EACH ROW
EXECUTE FUNCTION public.sync_oab_status_roles();

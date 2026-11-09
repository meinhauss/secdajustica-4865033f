CREATE OR REPLACE FUNCTION public.sync_oab_status_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IN ('suspenso','cancelado') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role IN ('advogado','presidente_oab');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'cidadao') ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'advogado') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_oab_status_roles() FROM PUBLIC, anon, authenticated;

UPDATE public.carteiras_oab c SET status = 'suspenso'
WHERE c.status = 'ativo' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = c.user_id
  AND ur.role::text IN ('defensor_publico','defensor_publico_geral','magistrado','desembargador','presidente_tribunal','ministerio_publico','procurador_geral','procurador_geral_adjunto'));
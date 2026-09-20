CREATE OR REPLACE FUNCTION public.generate_oab_numero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.numero_oab := 'OAB/SP ' || LPAD(nextval('public.oab_numero_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

-- Function to check if a user is involved in a cartorio record
CREATE OR REPLACE FUNCTION public.is_involved_cartorio(_user_id uuid, _requerente_id uuid, _requerente_nome text, _partes_envolvidas text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id_personagem text;
  _entry jsonb;
BEGIN
  -- Direct requester match
  IF _requerente_id = _user_id THEN
    RETURN true;
  END IF;

  -- Get the user's id_personagem
  SELECT id_personagem INTO _id_personagem
  FROM public.profiles
  WHERE user_id = _user_id;

  IF _id_personagem IS NULL OR _id_personagem = '' THEN
    RETURN false;
  END IF;

  -- Check requerente_nome JSON array
  IF _requerente_nome IS NOT NULL AND _requerente_nome LIKE '[%' THEN
    BEGIN
      FOR _entry IN SELECT * FROM jsonb_array_elements(_requerente_nome::jsonb)
      LOOP
        IF _entry->>'id_personagem' = _id_personagem THEN
          RETURN true;
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Check partes_envolvidas JSON array
  IF _partes_envolvidas IS NOT NULL AND _partes_envolvidas LIKE '[%' THEN
    BEGIN
      FOR _entry IN SELECT * FROM jsonb_array_elements(_partes_envolvidas::jsonb)
      LOOP
        IF _entry->>'id_personagem' = _id_personagem THEN
          RETURN true;
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN false;
END;
$$;

-- Drop old policy and create new one
DROP POLICY IF EXISTS "Registros cartorio visible to involved users" ON public.registros_cartorio;

CREATE POLICY "Registros cartorio visible to involved users"
ON public.registros_cartorio
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'oficial_justica'::user_role)
  OR has_role(auth.uid(), 'admin'::user_role)
  OR is_involved_cartorio(auth.uid(), requerente_id, requerente_nome, partes_envolvidas)
);

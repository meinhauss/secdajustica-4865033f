
-- Drop the existing open SELECT policy
DROP POLICY IF EXISTS "Processos are publicly readable" ON public.processos;

-- Create a function to check sigilo access
CREATE OR REPLACE FUNCTION public.can_view_processo(_user_id uuid, _sigilo text, _juiz_id uuid, _advogado_autor_id uuid, _advogado_reu_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Public processes: everyone can see
    WHEN _sigilo = 'publico' OR _sigilo IS NULL THEN true
    -- Segredo de justiça: involved parties + admin + MP + tribunal
    WHEN _sigilo = 'segredo_justica' THEN (
      _user_id IS NOT NULL AND (
        _user_id = _juiz_id
        OR _user_id = _advogado_autor_id
        OR _user_id = _advogado_reu_id
        OR has_role(_user_id, 'admin')
        OR has_role(_user_id, 'magistrado')
        OR has_role(_user_id, 'ministerio_publico')
        OR has_role(_user_id, 'presidente_tribunal')
        OR has_role(_user_id, 'desembargador')
        OR has_role(_user_id, 'procurador_geral')
      )
    )
    -- Sigilo absoluto: only assigned judge + admin + presidente_tribunal
    WHEN _sigilo = 'sigilo_absoluto' THEN (
      _user_id IS NOT NULL AND (
        _user_id = _juiz_id
        OR has_role(_user_id, 'admin')
        OR has_role(_user_id, 'presidente_tribunal')
      )
    )
    ELSE true
  END
$$;

-- New SELECT policy using the function
CREATE POLICY "Processos visible by sigilo level"
ON public.processos
FOR SELECT
TO public
USING (
  public.can_view_processo(auth.uid(), sigilo, juiz_id, advogado_autor_id, advogado_reu_id)
);

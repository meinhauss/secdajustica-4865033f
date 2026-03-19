
-- Drop the current policy
DROP POLICY IF EXISTS "Processos visible by sigilo level" ON public.processos;

-- Drop the old function
DROP FUNCTION IF EXISTS public.can_view_processo(uuid, text, uuid, uuid, uuid);

-- Recreate with processo_id for proper procuracoes lookup
CREATE OR REPLACE FUNCTION public.can_view_processo(_user_id uuid, _processo_id uuid, _sigilo text, _juiz_id uuid, _advogado_autor_id uuid, _advogado_reu_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _sigilo = 'publico' OR _sigilo IS NULL THEN true
    WHEN _sigilo = 'segredo_justica' THEN (
      _user_id IS NOT NULL AND (
        _user_id = _juiz_id
        OR _user_id = _advogado_autor_id
        OR _user_id = _advogado_reu_id
        OR EXISTS (
          SELECT 1 FROM public.procuracoes
          WHERE processo_id = _processo_id
            AND advogado_id = _user_id
            AND status = 'ativa'
        )
        OR has_role(_user_id, 'admin')
        OR has_role(_user_id, 'magistrado')
        OR has_role(_user_id, 'ministerio_publico')
        OR has_role(_user_id, 'presidente_tribunal')
        OR has_role(_user_id, 'desembargador')
        OR has_role(_user_id, 'procurador_geral')
      )
    )
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

-- Recreate policy using the new function with processo id
CREATE POLICY "Processos visible by sigilo level"
ON public.processos
FOR SELECT
TO public
USING (
  public.can_view_processo(auth.uid(), id, sigilo, juiz_id, advogado_autor_id, advogado_reu_id)
);

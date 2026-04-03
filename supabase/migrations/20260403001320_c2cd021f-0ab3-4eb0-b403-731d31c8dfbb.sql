
CREATE OR REPLACE FUNCTION public.can_view_processo(_user_id uuid, _processo_id uuid, _sigilo text, _juiz_id uuid, _advogado_autor_id uuid, _advogado_reu_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
        OR EXISTS (
          SELECT 1 FROM public.interessados_processo
          WHERE processo_id = _processo_id
            AND user_id = _user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.intimacoes i
          JOIN public.user_roles ur ON ur.user_id = _user_id AND ur.role::text = i.cargo_intimado
          WHERE i.processo_id = _processo_id
            AND i.cargo_intimado IS NOT NULL
        )
        -- Only autores (not réus) get automatic access by id_personagem
        OR EXISTS (
          SELECT 1 FROM public.profiles pr
          JOIN public.processos p ON p.id = _processo_id
          WHERE pr.user_id = _user_id
            AND pr.id_personagem IS NOT NULL
            AND pr.id_personagem != ''
            AND p.autor_nome ILIKE '%' || pr.id_personagem || '%'
        )
        OR has_role(_user_id, 'admin')
        OR has_role(_user_id, 'magistrado')
        OR has_role(_user_id, 'ministerio_publico')
        OR has_role(_user_id, 'presidente_tribunal')
        OR has_role(_user_id, 'desembargador')
        OR has_role(_user_id, 'procurador_geral')
        OR has_role(_user_id, 'policia_civil')
        OR has_role(_user_id, 'policia_militar')
        OR has_role(_user_id, 'policia_federal')
      )
    )
    WHEN _sigilo = 'sigilo_absoluto' THEN (
      _user_id IS NOT NULL AND (
        _user_id = _juiz_id
        OR EXISTS (
          SELECT 1 FROM public.interessados_processo
          WHERE processo_id = _processo_id
            AND user_id = _user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.intimacoes i
          JOIN public.user_roles ur ON ur.user_id = _user_id AND ur.role::text = i.cargo_intimado
          WHERE i.processo_id = _processo_id
            AND i.cargo_intimado IS NOT NULL
        )
        OR has_role(_user_id, 'admin')
        OR has_role(_user_id, 'presidente_tribunal')
      )
    )
    ELSE true
  END
$$;

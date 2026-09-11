CREATE OR REPLACE FUNCTION public.marcar_intimacoes_lidas(_processo_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _updated int := 0;
BEGIN
  IF _user_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.intimacoes i
  SET status = 'lida',
      data_leitura = now()
  WHERE i.processo_id = _processo_id
    AND i.status = 'pendente'
    AND (
      -- Destinatário direto
      i.destinatario_id = _user_id
      -- Cargo intimado coincide com role do usuário
      OR (
        i.cargo_intimado IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.role::text = i.cargo_intimado
        )
      )
      -- Advogado da parte (autor ou réu) - intimações genéricas para a parte
      OR EXISTS (
        SELECT 1 FROM public.processos p
        WHERE p.id = _processo_id
          AND (p.advogado_autor_id = _user_id OR p.advogado_reu_id = _user_id)
      )
      -- Advogado com procuração ativa no processo
      OR EXISTS (
        SELECT 1 FROM public.procuracoes pr
        WHERE pr.processo_id = _processo_id
          AND pr.advogado_id = _user_id
          AND pr.status = 'ativa'
      )
    );

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;
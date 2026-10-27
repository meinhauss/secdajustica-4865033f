-- 1) Arquivar automaticamente quando o acórdão é proclamado (exceto anulação de sentença)
CREATE OR REPLACE FUNCTION public.arquivar_apos_acordao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'julgada'
     AND (OLD.status IS DISTINCT FROM 'julgada')
     AND COALESCE(NEW.decisao_tipo, '') <> 'anulada' THEN
    UPDATE public.processos
       SET status = 'arquivado', updated_at = now()
     WHERE id = NEW.processo_id
       AND status <> 'arquivado';
    IF FOUND THEN
      INSERT INTO public.movimentacoes (processo_id, autor_id, tipo, descricao)
      VALUES (
        NEW.processo_id,
        NEW.desembargador_id,
        'transito_julgado',
        'Trânsito em julgado certificado — acórdão ' || COALESCE(NEW.numero_acordao, '') || ' proferido pelo Tribunal de Justiça. Autos arquivados.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_arquivar_apos_acordao ON public.apelacoes;
CREATE TRIGGER trg_arquivar_apos_acordao
AFTER UPDATE OF status ON public.apelacoes
FOR EACH ROW
EXECUTE FUNCTION public.arquivar_apos_acordao();

-- 2) Certificar trânsito quando o prazo recursal (72h) expira sem recurso
CREATE OR REPLACE FUNCTION public.certificar_transito_se_expirado(p_processo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sentenca public.sentencas%ROWTYPE;
BEGIN
  -- Só age sobre processos sentenciados
  IF NOT EXISTS (SELECT 1 FROM public.processos WHERE id = p_processo_id AND status = 'sentenciado') THEN
    RETURN false;
  END IF;

  -- Sentença mais recente e não anulada
  SELECT * INTO v_sentenca
    FROM public.sentencas
   WHERE processo_id = p_processo_id
     AND anulada = false
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Prazo de 72h ainda vigente
  IF v_sentenca.created_at > now() - interval '3 days' THEN
    RETURN false;
  END IF;

  -- Há apelação interposta sobre a sentença
  IF EXISTS (SELECT 1 FROM public.apelacoes WHERE sentenca_id = v_sentenca.id) THEN
    RETURN false;
  END IF;

  -- Há embargos de declaração pendentes sobre a sentença
  IF EXISTS (SELECT 1 FROM public.embargos_declaracao WHERE sentenca_id = v_sentenca.id AND status = 'pendente') THEN
    RETURN false;
  END IF;

  UPDATE public.processos
     SET status = 'arquivado', updated_at = now()
   WHERE id = p_processo_id
     AND status = 'sentenciado';

  IF FOUND THEN
    INSERT INTO public.movimentacoes (processo_id, autor_id, tipo, descricao)
    VALUES (
      p_processo_id,
      auth.uid(),
      'transito_julgado',
      'Trânsito em julgado certificado — prazo recursal de 72 horas expirado sem interposição de recurso. Autos arquivados.'
    );
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.certificar_transito_se_expirado(uuid) TO authenticated;
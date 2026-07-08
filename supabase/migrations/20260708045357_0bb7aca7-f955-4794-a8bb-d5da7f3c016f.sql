
CREATE OR REPLACE FUNCTION public.get_procuracao_publica(_numero text)
RETURNS TABLE (
  numero_registro text,
  status text,
  emitido_em timestamptz,
  requerente_nome text,
  partes_envolvidas text,
  descricao text,
  documento_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.numero_registro, r.status, r.emitido_em, r.requerente_nome,
         r.partes_envolvidas, r.descricao, r.documento_url
  FROM public.registros_cartorio r
  WHERE r.tipo = 'procuracao'
    AND r.numero_registro = _numero
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_procuracao_publica(text) TO authenticated;

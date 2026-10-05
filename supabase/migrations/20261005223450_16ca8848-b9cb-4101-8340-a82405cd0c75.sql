CREATE OR REPLACE FUNCTION public.analista_tabelas_aprovacao(_uid uuid)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  sup uuid; r text[]; t text[] := '{}';
  proc text[] := ARRAY['processos','movimentacoes','atos_judiciais','sentencas','audiencias','envolvidos_audiencia','intimacoes','mandados','prazos_processuais','certificacoes','documentos_processo','interessados_processo','procuracoes','renuncias_prazo','apelacoes','embargos_declaracao','votos_apelacao','jurisprudencias','convocacoes_jurados','jurados_convocados'];
BEGIN
  SELECT supervisor_id INTO sup FROM analista_vinculos WHERE analista_id=_uid;
  IF sup IS NULL THEN RETURN proc; END IF;
  SELECT array_agg(role::text) INTO r FROM user_roles WHERE user_id=sup;
  r := coalesce(r,'{}');
  IF r && ARRAY['admin','magistrado','desembargador','presidente_tribunal','oficial_justica','ministerio_publico','procurador_geral','procurador_geral_adjunto','procurador_estado','gaeco','chefe_gaeco','defensor_publico','defensor_publico_geral'] THEN
    t := t || proc;
  END IF;
  IF r && ARRAY['admin','delegado','corregedor','policia_civil','policia_militar','policia_federal','investigador'] THEN
    t := t || ARRAY['tcos','envolvidos_tco','processos','movimentacoes','documentos_processo','interessados_processo'];
  END IF;
  IF r && ARRAY['admin','presidente_oab'] THEN
    t := t || ARRAY['inscricoes_oab','carteiras_oab','comunicados_oab','procedimentos_disciplinares'];
  END IF;
  IF r && ARRAY['admin','presidente_tribunal'] THEN
    t := t || ARRAY['concursos','questoes_concurso','comunicados_concurso','leis_municipais','registros_cartorio'];
  END IF;
  RETURN t || ARRAY['user_roles','cargo_historico','config_sistema'];
END $$;
REVOKE EXECUTE ON FUNCTION public.analista_tabelas_aprovacao(uuid) FROM PUBLIC, anon, authenticated;
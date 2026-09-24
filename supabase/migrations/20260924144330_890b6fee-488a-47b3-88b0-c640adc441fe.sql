CREATE OR REPLACE FUNCTION public.notificar_audiencia(_audiencia_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a record; p record; ids uuid[] := '{}'; n integer := 0; dt text; msg text;
BEGIN
  SELECT * INTO a FROM audiencias WHERE id = _audiencia_id;
  IF a IS NULL THEN RETURN 0; END IF;
  IF auth.uid() IS NULL OR NOT (a.criado_por = auth.uid() OR is_magistrado_role(auth.uid()) OR is_servidor_judiciario(auth.uid()) OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;
  dt := to_char(a.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');
  IF a.processo_id IS NOT NULL THEN
    SELECT * INTO p FROM processos WHERE id = a.processo_id;
    ids := ids || ARRAY[p.advogado_autor_id, p.advogado_reu_id, p.juiz_id];
    ids := ids || ARRAY(SELECT user_id FROM interessados_processo WHERE processo_id = a.processo_id);
    ids := ids || ARRAY(SELECT user_id FROM procuracoes WHERE processo_id = a.processo_id AND status='ativa' AND advogado_id IS NOT NULL);
    ids := ids || ARRAY(SELECT user_id FROM profiles WHERE id_personagem IS NOT NULL AND id_personagem <> '' AND (
      coalesce(p.autor_nome,'') LIKE '%"id_personagem":"' || id_personagem || '"%' OR
      coalesce(p.reu_nome,'') LIKE '%"id_personagem":"' || id_personagem || '"%'));
  END IF;
  ids := ids || ARRAY(SELECT pr.user_id FROM envolvidos_audiencia e JOIN profiles pr ON pr.id_personagem = e.id_personagem
                      WHERE e.audiencia_id = _audiencia_id AND e.id_personagem IS NOT NULL AND e.id_personagem <> '');
  msg := 'Audiência de ' || a.tipo || ' agendada para ' || dt ||
         CASE WHEN p.numero IS NOT NULL THEN ' — Processo ' || p.numero ELSE '' END ||
         '. Local: ' || coalesce(a.local, 'A definir');
  INSERT INTO notificacoes(user_id, titulo, mensagem, tipo, link_secao)
  SELECT DISTINCT u, 'Audiência Agendada', msg, 'audiencia', 'audiencias'
  FROM unnest(ids) u WHERE u IS NOT NULL AND u <> auth.uid();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.notificar_audiencia(uuid) TO authenticated;
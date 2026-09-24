CREATE OR REPLACE FUNCTION public.notificar_audiencia(_audiencia_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a record; v_autor text; v_reu text; v_num text; v_adv1 uuid; v_adv2 uuid; v_juiz uuid;
  ids uuid[] := '{}'; n integer := 0; dt text; msg text;
BEGIN
  SELECT * INTO a FROM audiencias WHERE id = _audiencia_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF auth.uid() IS NULL OR NOT (a.criado_por = auth.uid() OR is_magistrado_role(auth.uid()) OR is_servidor_judiciario(auth.uid()) OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;
  dt := to_char(a.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');
  IF a.processo_id IS NOT NULL THEN
    SELECT numero, autor_nome, reu_nome, advogado_autor_id, advogado_reu_id, juiz_id
      INTO v_num, v_autor, v_reu, v_adv1, v_adv2, v_juiz FROM processos WHERE id = a.processo_id;
    ids := ids || ARRAY[v_adv1, v_adv2, v_juiz];
    ids := ids || ARRAY(SELECT user_id FROM interessados_processo WHERE processo_id = a.processo_id);
    ids := ids || ARRAY(SELECT advogado_id FROM procuracoes WHERE processo_id = a.processo_id AND status='ativa' AND advogado_id IS NOT NULL);
    ids := ids || ARRAY(SELECT user_id FROM profiles WHERE coalesce(id_personagem,'') <> '' AND (
      coalesce(v_autor,'') LIKE '%"id_personagem":"' || id_personagem || '"%' OR
      coalesce(v_reu,'') LIKE '%"id_personagem":"' || id_personagem || '"%'));
  END IF;
  ids := ids || ARRAY(SELECT pr.user_id FROM envolvidos_audiencia e JOIN profiles pr ON pr.id_personagem = e.id_personagem
                      WHERE e.audiencia_id = _audiencia_id AND coalesce(e.id_personagem,'') <> '');
  msg := 'Audiência de ' || a.tipo || ' agendada para ' || dt ||
         CASE WHEN v_num IS NOT NULL THEN ' — Processo ' || v_num ELSE '' END ||
         '. Local: ' || coalesce(a.local, 'A definir');
  INSERT INTO notificacoes(user_id, titulo, mensagem, tipo, link_secao)
  SELECT DISTINCT u, 'Audiência Agendada', msg, 'audiencia', 'audiencias'
  FROM unnest(ids) u WHERE u IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.notificar_audiencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notificar_audiencia(uuid) TO authenticated;

INSERT INTO notificacoes(user_id, titulo, mensagem, tipo, link_secao)
SELECT DISTINCT pr.user_id, 'Audiência Agendada',
  'Audiência de ' || a.tipo || ' agendada para ' || to_char(a.data_hora AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY "às" HH24:MI') || '. Local: ' || coalesce(a.local,'A definir'),
  'audiencia','audiencias'
FROM audiencias a JOIN envolvidos_audiencia e ON e.audiencia_id=a.id JOIN profiles pr ON pr.id_personagem=e.id_personagem
WHERE a.id IN ('2dc29260-d0af-4fba-8806-8b401ed769d9','b4ed609c-3a6c-47f0-886b-a042bf56a288');
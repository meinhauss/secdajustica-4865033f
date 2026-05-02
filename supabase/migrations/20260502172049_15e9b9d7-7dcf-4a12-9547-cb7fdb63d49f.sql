
ALTER TABLE public.certificacoes ADD COLUMN IF NOT EXISTS numero text;

CREATE SEQUENCE IF NOT EXISTS public.certidao_prevencao_seq START 1;

CREATE OR REPLACE FUNCTION public.detectar_prevencao_processo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ids text[] := '{}';
  _entry jsonb;
  _prev RECORD;
  _matches_autor jsonb;
  _matches_reu jsonb;
  _coincidentes text[];
  _all_coincidentes text[] := '{}';
  _processos_anteriores text[] := '{}';
  _conteudo text;
  _numero text;
  _fundamento text;
  _val text;
BEGIN
  -- Coletar id_personagem das partes do novo processo
  IF NEW.autor_nome IS NOT NULL AND NEW.autor_nome LIKE '[%' THEN
    BEGIN
      FOR _entry IN SELECT * FROM jsonb_array_elements(NEW.autor_nome::jsonb) LOOP
        IF _entry->>'id_personagem' IS NOT NULL AND _entry->>'id_personagem' <> '' THEN
          _ids := array_append(_ids, _entry->>'id_personagem');
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF NEW.reu_nome IS NOT NULL AND NEW.reu_nome LIKE '[%' THEN
    BEGIN
      FOR _entry IN SELECT * FROM jsonb_array_elements(NEW.reu_nome::jsonb) LOOP
        IF _entry->>'id_personagem' IS NOT NULL AND _entry->>'id_personagem' <> '' THEN
          _ids := array_append(_ids, _entry->>'id_personagem');
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  IF array_length(_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar processos anteriores com partes coincidentes
  FOR _prev IN
    SELECT id, numero, autor_nome, reu_nome
    FROM public.processos
    WHERE id <> NEW.id
      AND created_at < NEW.created_at
    ORDER BY created_at ASC
  LOOP
    _coincidentes := '{}';
    -- Verificar autor_nome do anterior
    IF _prev.autor_nome IS NOT NULL AND _prev.autor_nome LIKE '[%' THEN
      BEGIN
        FOR _entry IN SELECT * FROM jsonb_array_elements(_prev.autor_nome::jsonb) LOOP
          _val := _entry->>'id_personagem';
          IF _val IS NOT NULL AND _val = ANY(_ids) THEN
            _coincidentes := array_append(_coincidentes, COALESCE(_entry->>'nome','') || ' (RG: ' || _val || ')');
          END IF;
        END LOOP;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    IF _prev.reu_nome IS NOT NULL AND _prev.reu_nome LIKE '[%' THEN
      BEGIN
        FOR _entry IN SELECT * FROM jsonb_array_elements(_prev.reu_nome::jsonb) LOOP
          _val := _entry->>'id_personagem';
          IF _val IS NOT NULL AND _val = ANY(_ids) THEN
            _coincidentes := array_append(_coincidentes, COALESCE(_entry->>'nome','') || ' (RG: ' || _val || ')');
          END IF;
        END LOOP;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    IF array_length(_coincidentes, 1) IS NOT NULL THEN
      _processos_anteriores := array_append(_processos_anteriores,
        '<li>Processo nº <strong>' || _prev.numero || '</strong> — Partes coincidentes: ' || array_to_string(_coincidentes, '; ') || '</li>');
      _all_coincidentes := _all_coincidentes || _coincidentes;
    END IF;
  END LOOP;

  IF array_length(_processos_anteriores, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fundamento legal conforme classe
  IF NEW.classe::text = 'criminal' THEN
    _fundamento := 'Art. 76 do Código de Processo Penal';
  ELSE
    _fundamento := 'Art. 83 do Código de Processo Civil';
  END IF;

  _numero := 'CP-' || LPAD(nextval('public.certidao_prevencao_seq')::text, 6, '0') || '/' || EXTRACT(YEAR FROM now())::text;

  _conteudo := '<h2>CERTIDÃO DE PREVENÇÃO</h2>'
    || '<p><strong>Certidão nº:</strong> ' || _numero || '</p>'
    || '<p><strong>Data de emissão:</strong> ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '</p>'
    || '<p>Certifico e dou fé que, ao ser distribuído o processo nº <strong>' || NEW.numero || '</strong>, '
    || 'foi identificada a existência de processo(s) anterior(es) com partes coincidentes, configurando hipótese de <strong>PREVENÇÃO</strong>, '
    || 'nos termos do <strong>' || _fundamento || '</strong>.</p>'
    || '<p><strong>Processo(s) gerador(es) da prevenção:</strong></p>'
    || '<ul>' || array_to_string(_processos_anteriores, '') || '</ul>'
    || '<p>O referido é verdade. Dou fé.</p>';

  INSERT INTO public.certificacoes (processo_id, tipo, conteudo, numero, emitido_por_nome, assinado, data_assinatura)
  VALUES (NEW.id, 'prevencao', _conteudo, _numero, 'Sistema — Distribuição Automática', true, now());

  INSERT INTO public.movimentacoes (processo_id, tipo, descricao)
  VALUES (NEW.id, 'certidao_prevencao',
    'Certidão de Prevenção ' || _numero || ' emitida automaticamente. Fundamento: ' || _fundamento || '.');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detectar_prevencao ON public.processos;
CREATE TRIGGER trg_detectar_prevencao
AFTER INSERT ON public.processos
FOR EACH ROW
EXECUTE FUNCTION public.detectar_prevencao_processo();

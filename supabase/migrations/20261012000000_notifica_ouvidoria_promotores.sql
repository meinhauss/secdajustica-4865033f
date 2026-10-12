-- Notifica membros do Ministério Público sobre novas manifestações da Ouvidoria.
CREATE OR REPLACE FUNCTION public.notify_ouvidoria_promotores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _promotor RECORD;
  _autor_texto TEXT;
  _resumo_texto TEXT;
  _corpo_notificacao TEXT;
BEGIN
  _autor_texto := COALESCE(NULLIF(TRIM(NEW.nome_denunciante), ''), 'Cidadão Anônimo');

  _resumo_texto := regexp_replace(COALESCE(NEW.descricao, ''), '\s+', ' ', 'g');
  IF length(_resumo_texto) > 180 THEN
    _resumo_texto := left(_resumo_texto, 177) || '...';
  END IF;

  _corpo_notificacao := 'Nova manifestação protocolada por ' || _autor_texto
    || E':\n"' || _resumo_texto || E'"\nAcesse o Portal do MP para análise.';

  FOR _promotor IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text IN (
      'ministerio_publico',
      'procurador_geral',
      'procurador_geral_adjunto'
    )
  LOOP
    INSERT INTO public.notificacoes (
      user_id,
      titulo,
      mensagem,
      tipo,
      link_secao
    ) VALUES (
      _promotor.user_id,
      'Nova Manifestação na Ouvidoria do MP',
      _corpo_notificacao,
      'ouvidoria',
      'mp:' || NEW.id::text
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Falha ao notificar promotores sobre denúncia %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ouvidoria_promotores ON public.denuncias_ouvidoria;

CREATE TRIGGER trg_notify_ouvidoria_promotores
AFTER INSERT ON public.denuncias_ouvidoria
FOR EACH ROW
EXECUTE FUNCTION public.notify_ouvidoria_promotores();


-- Colunas para intimações a pessoas não cadastradas no sistema
ALTER TABLE public.intimacoes
  ADD COLUMN IF NOT EXISTS destinatario_discord_id text,
  ADD COLUMN IF NOT EXISTS destinatario_id_personagem text;

CREATE INDEX IF NOT EXISTS idx_intimacoes_dest_id_personagem
  ON public.intimacoes (destinatario_id_personagem)
  WHERE destinatario_id_personagem IS NOT NULL AND destinatario_id IS NULL;

-- Atualiza handle_new_user para:
-- 1) manter comportamento anterior (profile + role cidadao)
-- 2) vincular intimações órfãs (pelo id_personagem) ao novo user_id
-- 3) registrar movimentação nos processos avisando o cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id_personagem text;
  _nome text;
  _rec RECORD;
BEGIN
  _nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email);
  _id_personagem := NEW.raw_user_meta_data->>'id_personagem';

  INSERT INTO public.profiles (user_id, nome_completo, discord, id_personagem, telefone_ingame)
  VALUES (
    NEW.id,
    _nome,
    NEW.raw_user_meta_data->>'discord',
    _id_personagem,
    NEW.raw_user_meta_data->>'telefone_ingame'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cidadao');

  -- Vincula intimações pendentes (sem destinatário registrado) por id_personagem
  IF _id_personagem IS NOT NULL AND _id_personagem <> '' THEN
    FOR _rec IN
      SELECT DISTINCT processo_id
      FROM public.intimacoes
      WHERE destinatario_id_personagem = _id_personagem
        AND destinatario_id IS NULL
    LOOP
      UPDATE public.intimacoes
         SET destinatario_id = NEW.id
       WHERE destinatario_id_personagem = _id_personagem
         AND destinatario_id IS NULL
         AND processo_id = _rec.processo_id;

      INSERT INTO public.movimentacoes (processo_id, tipo, descricao, autor_id)
      VALUES (
        _rec.processo_id,
        'cadastro_intimado',
        'O intimado ' || COALESCE(_nome, 'sem nome') ||
          ' (ID: ' || _id_personagem || ') realizou seu cadastro no sistema judicial. ' ||
          'A partir de agora receberá as comunicações processuais diretamente pela plataforma.',
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome_completo, discord, id_personagem, telefone_ingame)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.raw_user_meta_data->>'discord',
    NEW.raw_user_meta_data->>'id_personagem',
    NEW.raw_user_meta_data->>'telefone_ingame'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cidadao');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

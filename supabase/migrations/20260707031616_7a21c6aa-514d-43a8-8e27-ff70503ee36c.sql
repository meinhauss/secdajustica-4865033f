ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS precisa_atualizar_cadastro boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET precisa_atualizar_cadastro = true;

-- Make FK columns nullable so user deletion can nullify references
ALTER TABLE public.sentencas ALTER COLUMN magistrado_id DROP NOT NULL;
ALTER TABLE public.mandados ALTER COLUMN magistrado_id DROP NOT NULL;
ALTER TABLE public.procuracoes ALTER COLUMN advogado_id DROP NOT NULL;
ALTER TABLE public.pareceres_mp ALTER COLUMN promotor_id DROP NOT NULL;
ALTER TABLE public.denuncias_mp ALTER COLUMN promotor_id DROP NOT NULL;
ALTER TABLE public.requisicoes_diligencia_mp ALTER COLUMN promotor_id DROP NOT NULL;
ALTER TABLE public.arquivamentos_mp ALTER COLUMN promotor_id DROP NOT NULL;
ALTER TABLE public.procedimentos_disciplinares ALTER COLUMN advogado_user_id DROP NOT NULL;

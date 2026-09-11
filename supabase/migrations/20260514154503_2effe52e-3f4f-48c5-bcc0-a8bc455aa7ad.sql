-- Adicionar colunas de período de prova na tabela de concursos
ALTER TABLE public.concursos 
ADD COLUMN IF NOT EXISTS data_inicio_prova TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_fim_prova TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna para registrar o início da prova do candidato
ALTER TABLE public.inscricoes_concurso
ADD COLUMN IF NOT EXISTS prova_iniciada_em TIMESTAMP WITH TIME ZONE;
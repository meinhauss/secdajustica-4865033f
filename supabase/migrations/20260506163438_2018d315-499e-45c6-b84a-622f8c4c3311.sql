ALTER TABLE public.apelacoes
  ADD COLUMN IF NOT EXISTS destaque_solicitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS destaque_justificativa text,
  ADD COLUMN IF NOT EXISTS destaque_solicitante_id uuid,
  ADD COLUMN IF NOT EXISTS destaque_solicitante_nome text,
  ADD COLUMN IF NOT EXISTS destaque_solicitante_qualificacao text,
  ADD COLUMN IF NOT EXISTS destaque_solicitado_em timestamptz;
ALTER TABLE public.sentencas ADD COLUMN IF NOT EXISTS anulada boolean NOT NULL DEFAULT false;
ALTER TABLE public.sentencas ADD COLUMN IF NOT EXISTS anulada_em timestamp with time zone;
ALTER TABLE public.sentencas ADD COLUMN IF NOT EXISTS anulada_por_apelacao_id uuid REFERENCES public.apelacoes(id) ON DELETE SET NULL;
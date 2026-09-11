ALTER TABLE public.jurisprudencias ALTER COLUMN apelacao_id DROP NOT NULL;
ALTER TABLE public.jurisprudencias ALTER COLUMN processo_id DROP NOT NULL;
ALTER TABLE public.jurisprudencias ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'apelacao';
ALTER TABLE public.jurisprudencias ADD COLUMN IF NOT EXISTS sessao_descricao text;
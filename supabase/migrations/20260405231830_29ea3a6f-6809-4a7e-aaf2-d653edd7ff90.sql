
ALTER TABLE public.embargos_declaracao
DROP CONSTRAINT embargos_declaracao_processo_id_fkey;

ALTER TABLE public.embargos_declaracao
ADD CONSTRAINT embargos_declaracao_processo_id_fkey
FOREIGN KEY (processo_id) REFERENCES public.processos(id)
ON DELETE CASCADE;

ALTER TABLE public.embargos_declaracao
DROP CONSTRAINT embargos_declaracao_sentenca_id_fkey;

ALTER TABLE public.embargos_declaracao
ADD CONSTRAINT embargos_declaracao_sentenca_id_fkey
FOREIGN KEY (sentenca_id) REFERENCES public.sentencas(id)
ON DELETE CASCADE;

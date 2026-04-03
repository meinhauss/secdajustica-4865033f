
ALTER TABLE public.tcos DROP CONSTRAINT tcos_processo_id_fkey;
ALTER TABLE public.tcos ADD CONSTRAINT tcos_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE SET NULL;

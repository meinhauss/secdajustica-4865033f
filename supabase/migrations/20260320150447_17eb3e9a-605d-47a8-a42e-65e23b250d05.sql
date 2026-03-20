-- Drop and recreate all foreign keys referencing processos with ON DELETE CASCADE

ALTER TABLE public.apelacoes DROP CONSTRAINT apelacoes_processo_id_fkey;
ALTER TABLE public.apelacoes ADD CONSTRAINT apelacoes_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.atos_judiciais DROP CONSTRAINT atos_judiciais_processo_id_fkey;
ALTER TABLE public.atos_judiciais ADD CONSTRAINT atos_judiciais_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.audiencias DROP CONSTRAINT audiencias_processo_id_fkey;
ALTER TABLE public.audiencias ADD CONSTRAINT audiencias_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.certificacoes DROP CONSTRAINT certificacoes_processo_id_fkey;
ALTER TABLE public.certificacoes ADD CONSTRAINT certificacoes_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.denuncias_mp DROP CONSTRAINT denuncias_mp_processo_id_fkey;
ALTER TABLE public.denuncias_mp ADD CONSTRAINT denuncias_mp_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.documentos_processo DROP CONSTRAINT documentos_processo_processo_id_fkey;
ALTER TABLE public.documentos_processo ADD CONSTRAINT documentos_processo_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.interessados_processo DROP CONSTRAINT interessados_processo_processo_id_fkey;
ALTER TABLE public.interessados_processo ADD CONSTRAINT interessados_processo_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.intimacoes DROP CONSTRAINT intimacoes_processo_id_fkey;
ALTER TABLE public.intimacoes ADD CONSTRAINT intimacoes_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.jurisprudencias DROP CONSTRAINT jurisprudencias_processo_id_fkey;
ALTER TABLE public.jurisprudencias ADD CONSTRAINT jurisprudencias_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.mandados DROP CONSTRAINT mandados_processo_id_fkey;
ALTER TABLE public.mandados ADD CONSTRAINT mandados_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.movimentacoes DROP CONSTRAINT movimentacoes_processo_id_fkey;
ALTER TABLE public.movimentacoes ADD CONSTRAINT movimentacoes_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.pareceres_mp DROP CONSTRAINT pareceres_mp_processo_id_fkey;
ALTER TABLE public.pareceres_mp ADD CONSTRAINT pareceres_mp_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.prazos_processuais DROP CONSTRAINT prazos_processuais_processo_id_fkey;
ALTER TABLE public.prazos_processuais ADD CONSTRAINT prazos_processuais_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.procuracoes DROP CONSTRAINT procuracoes_processo_id_fkey;
ALTER TABLE public.procuracoes ADD CONSTRAINT procuracoes_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.protocolos DROP CONSTRAINT protocolos_processo_id_fkey;
ALTER TABLE public.protocolos ADD CONSTRAINT protocolos_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

ALTER TABLE public.sentencas DROP CONSTRAINT sentencas_processo_id_fkey;
ALTER TABLE public.sentencas ADD CONSTRAINT sentencas_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;
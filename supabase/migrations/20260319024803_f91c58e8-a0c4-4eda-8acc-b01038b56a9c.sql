-- processos: juiz_id
ALTER TABLE public.processos DROP CONSTRAINT processos_juiz_id_fkey;
ALTER TABLE public.processos ADD CONSTRAINT processos_juiz_id_fkey FOREIGN KEY (juiz_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- processos: advogado_autor_id
ALTER TABLE public.processos DROP CONSTRAINT processos_advogado_autor_id_fkey;
ALTER TABLE public.processos ADD CONSTRAINT processos_advogado_autor_id_fkey FOREIGN KEY (advogado_autor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- processos: advogado_reu_id
ALTER TABLE public.processos DROP CONSTRAINT processos_advogado_reu_id_fkey;
ALTER TABLE public.processos ADD CONSTRAINT processos_advogado_reu_id_fkey FOREIGN KEY (advogado_reu_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- movimentacoes: autor_id
ALTER TABLE public.movimentacoes DROP CONSTRAINT movimentacoes_autor_id_fkey;
ALTER TABLE public.movimentacoes ADD CONSTRAINT movimentacoes_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- boletins_ocorrencia: vitima_id
ALTER TABLE public.boletins_ocorrencia DROP CONSTRAINT boletins_ocorrencia_vitima_id_fkey;
ALTER TABLE public.boletins_ocorrencia ADD CONSTRAINT boletins_ocorrencia_vitima_id_fkey FOREIGN KEY (vitima_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- boletins_ocorrencia: delegado_id
ALTER TABLE public.boletins_ocorrencia DROP CONSTRAINT boletins_ocorrencia_delegado_id_fkey;
ALTER TABLE public.boletins_ocorrencia ADD CONSTRAINT boletins_ocorrencia_delegado_id_fkey FOREIGN KEY (delegado_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- cargo_historico: nomeado_por
ALTER TABLE public.cargo_historico DROP CONSTRAINT cargo_historico_nomeado_por_fkey;
ALTER TABLE public.cargo_historico ADD CONSTRAINT cargo_historico_nomeado_por_fkey FOREIGN KEY (nomeado_por) REFERENCES auth.users(id) ON DELETE SET NULL;
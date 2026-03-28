
ALTER TABLE comunicacoes_externas DROP CONSTRAINT comunicacoes_externas_inquerito_id_fkey,
  ADD CONSTRAINT comunicacoes_externas_inquerito_id_fkey FOREIGN KEY (inquerito_id) REFERENCES inqueritos(id) ON DELETE CASCADE;

ALTER TABLE diligencias DROP CONSTRAINT diligencias_inquerito_id_fkey,
  ADD CONSTRAINT diligencias_inquerito_id_fkey FOREIGN KEY (inquerito_id) REFERENCES inqueritos(id) ON DELETE CASCADE;

ALTER TABLE oitivas DROP CONSTRAINT oitivas_inquerito_id_fkey,
  ADD CONSTRAINT oitivas_inquerito_id_fkey FOREIGN KEY (inquerito_id) REFERENCES inqueritos(id) ON DELETE CASCADE;

ALTER TABLE envolvidos_inquerito DROP CONSTRAINT envolvidos_inquerito_inquerito_id_fkey,
  ADD CONSTRAINT envolvidos_inquerito_inquerito_id_fkey FOREIGN KEY (inquerito_id) REFERENCES inqueritos(id) ON DELETE CASCADE;

ALTER TABLE requisicoes_diligencia_mp DROP CONSTRAINT requisicoes_diligencia_mp_inquerito_id_fkey,
  ADD CONSTRAINT requisicoes_diligencia_mp_inquerito_id_fkey FOREIGN KEY (inquerito_id) REFERENCES inqueritos(id) ON DELETE CASCADE;

ALTER TABLE arquivamentos_mp DROP CONSTRAINT arquivamentos_mp_inquerito_id_fkey,
  ADD CONSTRAINT arquivamentos_mp_inquerito_id_fkey FOREIGN KEY (inquerito_id) REFERENCES inqueritos(id) ON DELETE CASCADE;

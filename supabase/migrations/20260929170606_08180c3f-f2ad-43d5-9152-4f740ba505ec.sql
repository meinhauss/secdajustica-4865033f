CREATE POLICY "Analista ve movimentacoes do superior" ON public.movimentacoes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.processos p JOIN public.analista_vinculos av ON av.analista_id = auth.uid()
  WHERE p.id = movimentacoes.processo_id AND (av.supervisor_id IN (p.juiz_id, p.advogado_autor_id, p.advogado_reu_id)
   OR EXISTS (SELECT 1 FROM public.interessados_processo ip WHERE ip.processo_id = p.id AND ip.user_id = av.supervisor_id))));
CREATE POLICY "Analista ve audiencias do superior" ON public.audiencias FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.processos p JOIN public.analista_vinculos av ON av.analista_id = auth.uid()
  WHERE p.id = audiencias.processo_id AND (av.supervisor_id IN (p.juiz_id, p.advogado_autor_id, p.advogado_reu_id)
   OR EXISTS (SELECT 1 FROM public.interessados_processo ip WHERE ip.processo_id = p.id AND ip.user_id = av.supervisor_id))));
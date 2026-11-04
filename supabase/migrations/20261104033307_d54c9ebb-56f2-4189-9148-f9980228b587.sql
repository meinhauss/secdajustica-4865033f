drop policy if exists "Chefias veem movimentacoes de servidores" on public.movimentacoes;
create policy "Chefias veem movimentacoes de servidores" on public.movimentacoes for select to authenticated using (
  (has_role(auth.uid(),'defensor_publico_geral'::user_role) and exists (select 1 from user_roles ur where ur.user_id = movimentacoes.autor_id and ur.role = 'defensor_publico'::user_role))
  or ((has_role(auth.uid(),'procurador_geral'::user_role) or has_role(auth.uid(),'procurador_geral_adjunto'::user_role)) and exists (select 1 from user_roles ur where ur.user_id = movimentacoes.autor_id and ur.role = 'ministerio_publico'::user_role))
);
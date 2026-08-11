-- Helper: judicial roles
CREATE OR REPLACE FUNCTION public.is_magistrado_role(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR public.has_role(_uid,'magistrado')
      OR public.has_role(_uid,'presidente_tribunal') OR public.has_role(_uid,'desembargador');
$$;

CREATE OR REPLACE FUNCTION public.is_servidor_judiciario(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_magistrado_role(_uid) OR public.has_role(_uid,'oficial_justica');
$$;

CREATE OR REPLACE FUNCTION public.is_postulante_role(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_magistrado_role(_uid)
      OR public.has_role(_uid,'advogado') OR public.has_role(_uid,'bacharel_direito')
      OR public.has_role(_uid,'defensor_publico') OR public.has_role(_uid,'defensor_publico_geral')
      OR public.has_role(_uid,'ministerio_publico') OR public.has_role(_uid,'procurador_geral')
      OR public.has_role(_uid,'procurador_estado');
$$;

-- SENTENCAS
DROP POLICY IF EXISTS "Authenticated can insert sentencas" ON public.sentencas;
DROP POLICY IF EXISTS "Authenticated can update sentencas" ON public.sentencas;
CREATE POLICY "Magistrados can insert sentencas" ON public.sentencas FOR INSERT TO authenticated WITH CHECK (public.is_magistrado_role(auth.uid()));
CREATE POLICY "Magistrados can update sentencas" ON public.sentencas FOR UPDATE TO authenticated USING (public.is_magistrado_role(auth.uid())) WITH CHECK (public.is_magistrado_role(auth.uid()));

-- ATOS JUDICIAIS
DROP POLICY IF EXISTS "Authenticated can insert atos" ON public.atos_judiciais;
DROP POLICY IF EXISTS "Authenticated can update atos" ON public.atos_judiciais;
CREATE POLICY "Servidores can insert atos" ON public.atos_judiciais FOR INSERT TO authenticated WITH CHECK (public.is_servidor_judiciario(auth.uid()));
CREATE POLICY "Servidores can update atos" ON public.atos_judiciais FOR UPDATE TO authenticated USING (public.is_servidor_judiciario(auth.uid())) WITH CHECK (public.is_servidor_judiciario(auth.uid()));

-- CERTIFICACOES
DROP POLICY IF EXISTS "Authenticated can insert certificacoes" ON public.certificacoes;
DROP POLICY IF EXISTS "Authenticated can update certificacoes" ON public.certificacoes;
CREATE POLICY "Servidores can insert certificacoes" ON public.certificacoes FOR INSERT TO authenticated WITH CHECK (public.is_servidor_judiciario(auth.uid()));
CREATE POLICY "Servidores can update certificacoes" ON public.certificacoes FOR UPDATE TO authenticated USING (public.is_servidor_judiciario(auth.uid())) WITH CHECK (public.is_servidor_judiciario(auth.uid()));

-- MANDADOS
DROP POLICY IF EXISTS "Authenticated can insert mandados" ON public.mandados;
DROP POLICY IF EXISTS "Authenticated can update mandados" ON public.mandados;
CREATE POLICY "Magistrados can insert mandados" ON public.mandados FOR INSERT TO authenticated WITH CHECK (public.is_magistrado_role(auth.uid()));
CREATE POLICY "Cumpridores can update mandados" ON public.mandados FOR UPDATE TO authenticated
USING (
  public.is_servidor_judiciario(auth.uid())
  OR public.has_role(auth.uid(),'policia_civil') OR public.has_role(auth.uid(),'policia_militar')
  OR public.has_role(auth.uid(),'policia_federal') OR public.has_role(auth.uid(),'investigador')
  OR public.has_role(auth.uid(),'delegado') OR public.has_role(auth.uid(),'gaeco') OR public.has_role(auth.uid(),'chefe_gaeco')
)
WITH CHECK (
  public.is_servidor_judiciario(auth.uid())
  OR public.has_role(auth.uid(),'policia_civil') OR public.has_role(auth.uid(),'policia_militar')
  OR public.has_role(auth.uid(),'policia_federal') OR public.has_role(auth.uid(),'investigador')
  OR public.has_role(auth.uid(),'delegado') OR public.has_role(auth.uid(),'gaeco') OR public.has_role(auth.uid(),'chefe_gaeco')
);

-- INTIMACOES
DROP POLICY IF EXISTS "Authenticated can insert intimacoes" ON public.intimacoes;
DROP POLICY IF EXISTS "Authenticated can update intimacoes" ON public.intimacoes;
CREATE POLICY "Servidores can insert intimacoes" ON public.intimacoes FOR INSERT TO authenticated
WITH CHECK (public.is_servidor_judiciario(auth.uid()) OR public.has_role(auth.uid(),'ministerio_publico') OR public.has_role(auth.uid(),'procurador_geral'));
CREATE POLICY "Servidores or destinatario can update intimacoes" ON public.intimacoes FOR UPDATE TO authenticated
USING (public.is_servidor_judiciario(auth.uid()) OR public.has_role(auth.uid(),'ministerio_publico') OR public.has_role(auth.uid(),'procurador_geral') OR destinatario_id = auth.uid())
WITH CHECK (public.is_servidor_judiciario(auth.uid()) OR public.has_role(auth.uid(),'ministerio_publico') OR public.has_role(auth.uid(),'procurador_geral') OR destinatario_id = auth.uid());

-- PRAZOS PROCESSUAIS
DROP POLICY IF EXISTS "Authenticated can insert prazos" ON public.prazos_processuais;
DROP POLICY IF EXISTS "Authenticated can update prazos" ON public.prazos_processuais;
CREATE POLICY "Servidores can insert prazos" ON public.prazos_processuais FOR INSERT TO authenticated
WITH CHECK (public.is_servidor_judiciario(auth.uid()) OR public.has_role(auth.uid(),'ministerio_publico'));
CREATE POLICY "Servidores can update prazos" ON public.prazos_processuais FOR UPDATE TO authenticated
USING (public.is_servidor_judiciario(auth.uid()) OR public.has_role(auth.uid(),'ministerio_publico'))
WITH CHECK (public.is_servidor_judiciario(auth.uid()) OR public.has_role(auth.uid(),'ministerio_publico'));

-- JURISPRUDENCIAS
DROP POLICY IF EXISTS "Authenticated can insert jurisprudencias" ON public.jurisprudencias;
CREATE POLICY "Magistrados can insert jurisprudencias" ON public.jurisprudencias FOR INSERT TO authenticated WITH CHECK (public.is_magistrado_role(auth.uid()));

-- APELACOES
DROP POLICY IF EXISTS "Authenticated can insert apelacoes" ON public.apelacoes;
DROP POLICY IF EXISTS "Authenticated can update apelacoes" ON public.apelacoes;
CREATE POLICY "Partes can insert apelacoes" ON public.apelacoes FOR INSERT TO authenticated WITH CHECK (public.is_postulante_role(auth.uid()));
CREATE POLICY "Julgadores or apelante can update apelacoes" ON public.apelacoes FOR UPDATE TO authenticated
USING (public.is_magistrado_role(auth.uid()) OR apelante_id = auth.uid() OR destaque_solicitante_id = auth.uid())
WITH CHECK (public.is_magistrado_role(auth.uid()) OR apelante_id = auth.uid() OR destaque_solicitante_id = auth.uid());

-- EMBARGOS
DROP POLICY IF EXISTS "Authenticated can insert embargos" ON public.embargos_declaracao;
DROP POLICY IF EXISTS "Authenticated can update embargos" ON public.embargos_declaracao;
CREATE POLICY "Partes can insert embargos" ON public.embargos_declaracao FOR INSERT TO authenticated WITH CHECK (public.is_postulante_role(auth.uid()));
CREATE POLICY "Magistrados or embargante can update embargos" ON public.embargos_declaracao FOR UPDATE TO authenticated
USING (public.is_magistrado_role(auth.uid()) OR embargante_id = auth.uid())
WITH CHECK (public.is_magistrado_role(auth.uid()) OR embargante_id = auth.uid());

-- QUESTOES CONCURSO
DROP POLICY IF EXISTS "Admin can insert questoes" ON public.questoes_concurso;
DROP POLICY IF EXISTS "Admin can update questoes" ON public.questoes_concurso;
DROP POLICY IF EXISTS "Admin can delete questoes" ON public.questoes_concurso;
CREATE POLICY "Admin can insert questoes" ON public.questoes_concurso FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));
CREATE POLICY "Admin can update questoes" ON public.questoes_concurso FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal')) WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));
CREATE POLICY "Admin can delete questoes" ON public.questoes_concurso FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));

-- COMUNICADOS CONCURSO
DROP POLICY IF EXISTS "Admin can insert comunicados concurso" ON public.comunicados_concurso;
CREATE POLICY "Admin can insert comunicados concurso" ON public.comunicados_concurso FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));

-- INSCRICOES CONCURSO
DROP POLICY IF EXISTS "Authenticated can insert inscricoes concurso" ON public.inscricoes_concurso;
DROP POLICY IF EXISTS "Authenticated can update inscricoes concurso" ON public.inscricoes_concurso;
CREATE POLICY "Users can insert own inscricao concurso" ON public.inscricoes_concurso FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));
CREATE POLICY "Users or banca can update inscricao concurso" ON public.inscricoes_concurso FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'))
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));

-- RESPOSTAS CONCURSO
DROP POLICY IF EXISTS "Authenticated can insert respostas" ON public.respostas_concurso;
DROP POLICY IF EXISTS "Authenticated can update respostas" ON public.respostas_concurso;
CREATE POLICY "Candidato can insert respostas" ON public.respostas_concurso FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal')
  OR EXISTS (SELECT 1 FROM public.inscricoes_concurso i WHERE i.id = inscricao_id AND i.user_id = auth.uid())
);
CREATE POLICY "Candidato or banca can update respostas" ON public.respostas_concurso FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal')
  OR EXISTS (SELECT 1 FROM public.inscricoes_concurso i WHERE i.id = inscricao_id AND i.user_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal')
  OR EXISTS (SELECT 1 FROM public.inscricoes_concurso i WHERE i.id = inscricao_id AND i.user_id = auth.uid())
);

-- INSCRICOES OAB
DROP POLICY IF EXISTS "Authenticated can insert inscricoes OAB" ON public.inscricoes_oab;
DROP POLICY IF EXISTS "Authenticated can update inscricoes OAB" ON public.inscricoes_oab;
CREATE POLICY "Users can insert own inscricao OAB" ON public.inscricoes_oab FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab'));
CREATE POLICY "Users or OAB can update inscricao OAB" ON public.inscricoes_oab FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab'))
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab'));

-- CARTEIRAS OAB
DROP POLICY IF EXISTS "Authenticated can insert carteiras OAB" ON public.carteiras_oab;
DROP POLICY IF EXISTS "Authenticated can update carteiras OAB" ON public.carteiras_oab;
CREATE POLICY "OAB can insert carteiras" ON public.carteiras_oab FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab'));
CREATE POLICY "OAB or owner can update carteiras" ON public.carteiras_oab FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab') OR user_id = auth.uid())
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_oab') OR user_id = auth.uid());

-- REGISTROS CARTORIO
DROP POLICY IF EXISTS "Authenticated can insert registros cartorio" ON public.registros_cartorio;
CREATE POLICY "Requerente or cartorio can insert registros" ON public.registros_cartorio FOR INSERT TO authenticated
WITH CHECK (requerente_id = auth.uid() OR has_role(auth.uid(),'oficial_justica') OR has_role(auth.uid(),'admin'));
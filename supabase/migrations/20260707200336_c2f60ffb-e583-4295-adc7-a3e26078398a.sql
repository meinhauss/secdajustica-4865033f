
-- 1. Modelos oficiais
CREATE TABLE public.modelos_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  categoria text NOT NULL,
  cargos text[] NOT NULL DEFAULT '{}',
  descricao text,
  conteudo text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos_documentos TO authenticated;
GRANT ALL ON public.modelos_documentos TO service_role;

ALTER TABLE public.modelos_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler modelos"
  ON public.modelos_documentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia modelos"
  ON public.modelos_documentos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_modelos_documentos_updated_at
  BEFORE UPDATE ON public.modelos_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_modelos_documentos_categoria ON public.modelos_documentos(categoria);
CREATE INDEX idx_modelos_documentos_cargos ON public.modelos_documentos USING GIN(cargos);

-- 2. Favoritos pessoais
CREATE TABLE public.modelos_favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  categoria text,
  descricao text,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos_favoritos TO authenticated;
GRANT ALL ON public.modelos_favoritos TO service_role;

ALTER TABLE public.modelos_favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia seus favoritos"
  ON public.modelos_favoritos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_modelos_favoritos_updated_at
  BEFORE UPDATE ON public.modelos_favoritos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_modelos_favoritos_user ON public.modelos_favoritos(user_id);

-- 3. Seeds iniciais (exemplos por cargo)
INSERT INTO public.modelos_documentos (titulo, categoria, cargos, descricao, conteudo) VALUES
('Petição — Porte de Arma de Fogo', 'peticao', ARRAY['advogado','bacharel_direito','presidente_oab'],
 'Requerimento de autorização judicial para porte de arma de fogo',
 E'EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO\n\n{{nome_usuario}}, advogado(a) inscrito(a) na OAB, vem respeitosamente à presença de Vossa Excelência, com fundamento na Lei nº 10.826/2003, requerer AUTORIZAÇÃO JUDICIAL PARA PORTE DE ARMA DE FOGO em favor de {{nome_autor}}, pelas razões de fato e de direito a seguir expostas.\n\nI — DOS FATOS\n[Descrever os fatos]\n\nII — DO DIREITO\n[Fundamentação legal]\n\nIII — DO PEDIDO\nAnte o exposto, requer o deferimento do porte de arma de fogo em favor do requerente.\n\nTermos em que pede deferimento.\n\n{{data_hoje}}\n\n{{nome_usuario}}\nOAB/SP'),

('Petição — Limpeza de Ficha Criminal', 'peticao', ARRAY['advogado','bacharel_direito','presidente_oab'],
 'Requerimento de reabilitação criminal / exclusão de antecedentes',
 E'EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO\n\nProcesso nº {{numero_processo}}\n\n{{nome_usuario}}, advogado(a) constituído(a) por {{nome_autor}}, vem requerer a REABILITAÇÃO CRIMINAL, nos termos dos arts. 93 a 95 do Código Penal, ante o cumprimento integral da pena e o decurso do prazo legal.\n\nRequer o deferimento para exclusão dos antecedentes criminais.\n\n{{data_hoje}}\n\n{{nome_usuario}}'),

('Petição — Simples Movimentação', 'movimentacao', ARRAY['advogado','bacharel_direito'],
 'Modelo genérico para movimentações processuais',
 E'Processo nº {{numero_processo}}\n\n{{nome_usuario}}, advogado(a) da parte {{nome_autor}}, vem informar/requerer:\n\n[Descrever a manifestação]\n\nTermos em que pede deferimento.\n\n{{data_hoje}}'),

('Contestação Cível', 'peticao', ARRAY['advogado','bacharel_direito','procurador_estado','procurador_geral'],
 'Modelo padrão de contestação',
 E'EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO\n\nProcesso nº {{numero_processo}}\n\n{{nome_reu}}, por seu(sua) advogado(a) que esta subscreve, nos autos em epígrafe, vem apresentar CONTESTAÇÃO à ação proposta por {{nome_autor}}, pelas razões a seguir:\n\nI — PRELIMINARES\n\nII — DO MÉRITO\n\nIII — DOS PEDIDOS\nRequer a total improcedência da ação.\n\n{{data_hoje}}\n\n{{nome_usuario}}'),

('Denúncia — MP', 'denuncia', ARRAY['ministerio_publico','procurador_geral'],
 'Peça inicial de denúncia criminal',
 E'EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO\n\nO MINISTÉRIO PÚBLICO DO ESTADO DE SÃO PAULO, por meio do(a) Promotor(a) de Justiça que esta subscreve, com fundamento no art. 129, I, da CF/88 e no art. 41 do CPP, oferece DENÚNCIA em face de:\n\n{{nome_reu}}\n\npelos fatos a seguir narrados:\n\nI — DOS FATOS\n[Narrativa dos fatos delituosos]\n\nII — DA CAPITULAÇÃO\n[Tipo penal violado]\n\nIII — DOS REQUERIMENTOS\nRequer o recebimento da denúncia, a citação do denunciado e a condenação nas sanções cabíveis.\n\n{{data_hoje}}\n\n{{nome_usuario}}\nPromotor(a) de Justiça'),

('Promoção — Arquivamento', 'promocao', ARRAY['ministerio_publico','procurador_geral'],
 'Manifestação ministerial pelo arquivamento',
 E'MM. Juiz(a),\n\nProcesso nº {{numero_processo}}\n\nO MINISTÉRIO PÚBLICO, analisando os autos, verifica a ausência de justa causa para o prosseguimento da persecução penal, razão pela qual PROMOVE O ARQUIVAMENTO do presente feito, nos termos do art. 28 do CPP.\n\n{{data_hoje}}\n\n{{nome_usuario}}\nPromotor(a) de Justiça'),

('Parecer Ministerial', 'parecer', ARRAY['ministerio_publico','procurador_geral','procurador_estado'],
 'Parecer genérico do MP',
 E'MM. Juiz(a),\n\nProcesso nº {{numero_processo}}\n\nO MINISTÉRIO PÚBLICO, atuando como custos legis, opina no seguinte sentido:\n\n[Fundamentação]\n\nDiante do exposto, o parecer é [FAVORÁVEL / DESFAVORÁVEL] ao pedido.\n\n{{data_hoje}}\n\n{{nome_usuario}}'),

('Sentença Cível', 'sentenca', ARRAY['magistrado','desembargador','presidente_tribunal'],
 'Estrutura básica de sentença cível',
 E'SENTENÇA\n\nProcesso nº {{numero_processo}}\nAutor: {{nome_autor}}\nRéu: {{nome_reu}}\n\nI — RELATÓRIO\n[Síntese do processo]\n\nII — FUNDAMENTAÇÃO\n[Análise das provas e do direito]\n\nIII — DISPOSITIVO\nAnte o exposto, JULGO [PROCEDENTE/IMPROCEDENTE] o pedido, nos termos do art. 487, I, do CPC.\n\nPublique-se. Registre-se. Intime-se.\n\n{{data_hoje}}\n\n{{nome_usuario}}\nJuiz(a) de Direito'),

('Sentença Criminal', 'sentenca', ARRAY['magistrado','desembargador','presidente_tribunal'],
 'Estrutura básica de sentença criminal',
 E'SENTENÇA\n\nProcesso nº {{numero_processo}}\nRéu: {{nome_reu}}\n\nI — RELATÓRIO\n\nII — FUNDAMENTAÇÃO\n\nIII — DISPOSITIVO\nDiante do exposto, JULGO [PROCEDENTE/IMPROCEDENTE] a denúncia, para CONDENAR/ABSOLVER o réu {{nome_reu}} nas sanções do art. [...] do Código Penal.\n\n{{data_hoje}}\n\n{{nome_usuario}}\nJuiz(a) de Direito'),

('Despacho Ordinatório', 'despacho', ARRAY['magistrado','desembargador','presidente_tribunal'],
 'Despacho simples de andamento',
 E'DESPACHO\n\nProcesso nº {{numero_processo}}\n\n[Determinação]\n\nIntimem-se.\n\n{{data_hoje}}\n\n{{nome_usuario}}\nJuiz(a) de Direito'),

('Relatório de Investigação', 'policial', ARRAY['policia_civil','policia_militar','policia_federal','delegado','gaeco','chefe_gaeco'],
 'Relatório de diligência policial',
 E'RELATÓRIO DE INVESTIGAÇÃO\n\nData: {{data_hoje}}\nAgente responsável: {{nome_usuario}}\n\nI — OBJETO\n[Descrever o objeto da diligência]\n\nII — DILIGÊNCIAS REALIZADAS\n[Detalhar as ações]\n\nIII — CONCLUSÃO\n[Resultados obtidos]'),

('Mandado de Cumprimento', 'policial', ARRAY['oficial_justica','policia_civil','delegado'],
 'Certidão de cumprimento de mandado',
 E'CERTIDÃO DE CUMPRIMENTO\n\nCertifico que, em cumprimento ao mandado expedido nos autos do processo nº {{numero_processo}}, dirigi-me ao endereço indicado e [DESCREVER O CUMPRIMENTO].\n\n{{data_hoje}}\n\n{{nome_usuario}}\nOficial de Justiça');

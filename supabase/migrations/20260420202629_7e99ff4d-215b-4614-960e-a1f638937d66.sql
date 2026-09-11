-- Tabela de jurados
CREATE TABLE public.jurados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  nome_completo TEXT NOT NULL,
  id_personagem TEXT,
  profissao TEXT,
  disponibilidade TEXT NOT NULL DEFAULT 'integral',
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jurados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jurado" ON public.jurados
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal') OR has_role(auth.uid(),'magistrado') OR has_role(auth.uid(),'desembargador'));

CREATE POLICY "Users can insert own jurado" ON public.jurados
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own jurado" ON public.jurados
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));

CREATE POLICY "Users can delete own jurado" ON public.jurados
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_jurados_updated_at
BEFORE UPDATE ON public.jurados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de convocações
CREATE TABLE public.convocacoes_jurados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL,
  data_sessao TIMESTAMPTZ NOT NULL,
  local TEXT DEFAULT 'Plenário do Tribunal do Júri',
  quantidade INTEGER NOT NULL DEFAULT 7,
  observacoes TEXT,
  convocado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convocacoes_jurados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Convocacoes readable by authenticated" ON public.convocacoes_jurados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Presidente and admin can insert convocacoes" ON public.convocacoes_jurados
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));

-- Tabela de junção
CREATE TABLE public.jurados_convocados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convocacao_id UUID NOT NULL REFERENCES public.convocacoes_jurados(id) ON DELETE CASCADE,
  jurado_id UUID NOT NULL REFERENCES public.jurados(id) ON DELETE CASCADE,
  intimacao_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(convocacao_id, jurado_id)
);

ALTER TABLE public.jurados_convocados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jurados convocados readable by authenticated" ON public.jurados_convocados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Presidente and admin can insert jurados convocados" ON public.jurados_convocados
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal'));

-- Função de sorteio
CREATE OR REPLACE FUNCTION public.sortear_jurados(
  _processo_id UUID,
  _data_sessao TIMESTAMPTZ,
  _quantidade INTEGER DEFAULT 7,
  _local TEXT DEFAULT 'Plenário do Tribunal do Júri',
  _observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _convocacao_id UUID;
  _proc_numero TEXT;
  _jurado RECORD;
  _intimacao_id UUID;
  _conteudo TEXT;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'presidente_tribunal')) THEN
    RAISE EXCEPTION 'Apenas o Presidente do Tribunal ou administradores podem convocar jurados';
  END IF;

  SELECT numero INTO _proc_numero FROM public.processos WHERE id = _processo_id;
  IF _proc_numero IS NULL THEN
    RAISE EXCEPTION 'Processo não encontrado';
  END IF;

  INSERT INTO public.convocacoes_jurados (processo_id, data_sessao, local, quantidade, observacoes, convocado_por)
  VALUES (_processo_id, _data_sessao, _local, _quantidade, _observacoes, auth.uid())
  RETURNING id INTO _convocacao_id;

  FOR _jurado IN
    SELECT j.id, j.user_id, j.nome_completo
    FROM public.jurados j
    WHERE j.status = 'ativo'
    ORDER BY random()
    LIMIT _quantidade
  LOOP
    _conteudo := 'Convocação para servir como jurado no Tribunal do Júri. Processo: ' || _proc_numero
      || '. Sessão: ' || to_char(_data_sessao, 'DD/MM/YYYY HH24:MI')
      || '. Local: ' || _local
      || COALESCE('. Observações: ' || _observacoes, '');

    INSERT INTO public.intimacoes (processo_id, destinatario_id, destinatario_nome, tipo, conteudo, prazo_dias)
    VALUES (_processo_id, _jurado.user_id, _jurado.nome_completo, 'convocacao_jurado', _conteudo, 3)
    RETURNING id INTO _intimacao_id;

    INSERT INTO public.jurados_convocados (convocacao_id, jurado_id, intimacao_id)
    VALUES (_convocacao_id, _jurado.id, _intimacao_id);
  END LOOP;

  INSERT INTO public.movimentacoes (processo_id, tipo, descricao, autor_id)
  VALUES (_processo_id, 'convocacao_juri', 'Convocação de ' || _quantidade || ' jurados para sessão em ' || to_char(_data_sessao, 'DD/MM/YYYY HH24:MI'), auth.uid());

  RETURN _convocacao_id;
END;
$$;
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'analista';

CREATE OR REPLACE FUNCTION public.is_analista(_uid uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM user_roles WHERE user_id=_uid AND role::text='analista')
     AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id=_uid AND role::text='admin');
END $$;

CREATE TABLE public.analista_vinculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analista_id uuid NOT NULL UNIQUE,
  supervisor_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analista_vinculos TO authenticated;
GRANT ALL ON public.analista_vinculos TO service_role;
ALTER TABLE public.analista_vinculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY av_select ON public.analista_vinculos FOR SELECT TO authenticated
  USING (analista_id = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY av_admin ON public.analista_vinculos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.acoes_pendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analista_id uuid NOT NULL,
  analista_nome text,
  supervisor_id uuid NOT NULL,
  tabela text NOT NULL,
  operacao text NOT NULL,
  payload jsonb,
  filtros jsonb NOT NULL DEFAULT '[]'::jsonb,
  descricao text,
  status text NOT NULL DEFAULT 'pendente',
  motivo text,
  erro text,
  decidido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.acoes_pendentes TO authenticated;
GRANT ALL ON public.acoes_pendentes TO service_role;
ALTER TABLE public.acoes_pendentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ap_select ON public.acoes_pendentes FOR SELECT TO authenticated
  USING (analista_id = auth.uid() OR supervisor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY ap_insert ON public.acoes_pendentes FOR INSERT TO authenticated
  WITH CHECK (analista_id = auth.uid() AND status='pendente'
    AND supervisor_id = (SELECT v.supervisor_id FROM public.analista_vinculos v WHERE v.analista_id = auth.uid()));
CREATE POLICY ap_update ON public.acoes_pendentes FOR UPDATE TO authenticated
  USING (supervisor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (supervisor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ap_updated BEFORE UPDATE ON public.acoes_pendentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_acao_pendente() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO notificacoes(user_id,titulo,mensagem,tipo,link_secao)
    VALUES (NEW.supervisor_id,'Ação de analista aguardando aprovação',
      coalesce(NEW.analista_nome,'Analista')||': '||coalesce(NEW.descricao,NEW.operacao||' em '||NEW.tabela),'sistema','aprovacoes');
  ELSIF NEW.status <> OLD.status AND NEW.status IN ('aprovada','rejeitada') THEN
    INSERT INTO notificacoes(user_id,titulo,mensagem,tipo,link_secao)
    VALUES (NEW.analista_id,'Sua ação foi '||NEW.status,
      coalesce(NEW.descricao,NEW.operacao||' em '||NEW.tabela)||coalesce(' — '||NEW.motivo,''),'sistema','aprovacoes');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ap_notify AFTER INSERT OR UPDATE ON public.acoes_pendentes
  FOR EACH ROW EXECUTE FUNCTION public.notify_acao_pendente();

CREATE OR REPLACE FUNCTION public.bloquear_analista() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_analista(auth.uid()) THEN
    RAISE EXCEPTION 'Analistas não podem alterar dados diretamente: a ação precisa ser aprovada pelo superior.';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
    AND tablename NOT IN ('acoes_pendentes','analista_vinculos','notificacoes','profiles')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_bloquear_analista ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_bloquear_analista BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_analista()', t);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.bloquear_analista() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_acao_pendente() FROM PUBLIC, anon, authenticated;
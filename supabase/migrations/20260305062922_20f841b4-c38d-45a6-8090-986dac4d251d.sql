
-- =====================================================
-- 1. PENSÃO ALIMENTÍCIA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_pensao_alimenticia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  tipo text NOT NULL DEFAULT 'percentual',
  percentual numeric DEFAULT 0,
  valor_fixo numeric DEFAULT 0,
  base_incidencia text DEFAULT 'liquido',
  beneficiario text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculo_id)
);
ALTER TABLE public.pjecalc_pensao_alimenticia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage pensao config" ON public.pjecalc_pensao_alimenticia_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.pjecalc_pensao_config AS
SELECT pc.id, c.case_id, pc.calculo_id, pc.apurar, pc.tipo, pc.percentual, pc.valor_fixo,
       pc.base_incidencia, pc.beneficiario, pc.observacoes, pc.created_at, pc.updated_at
FROM public.pjecalc_pensao_alimenticia_config pc
JOIN public.pjecalc_calculos c ON c.id = pc.calculo_id;

CREATE OR REPLACE FUNCTION public.pjecalc_pensao_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_pensao_alimenticia_config (calculo_id, apurar, tipo, percentual, valor_fixo, base_incidencia, beneficiario, observacoes)
  VALUES (v_cid, COALESCE(NEW.apurar, false), COALESCE(NEW.tipo, 'percentual'), COALESCE(NEW.percentual, 0), COALESCE(NEW.valor_fixo, 0), COALESCE(NEW.base_incidencia, 'liquido'), NEW.beneficiario, NEW.observacoes)
  ON CONFLICT (calculo_id) DO UPDATE SET apurar=EXCLUDED.apurar, tipo=EXCLUDED.tipo, percentual=EXCLUDED.percentual, valor_fixo=EXCLUDED.valor_fixo, base_incidencia=EXCLUDED.base_incidencia, beneficiario=EXCLUDED.beneficiario, observacoes=EXCLUDED.observacoes, updated_at=now();
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_pensao_config_ioi INSTEAD OF INSERT ON public.pjecalc_pensao_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_pensao_ioi();

CREATE OR REPLACE FUNCTION public.pjecalc_pensao_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE pjecalc_pensao_alimenticia_config SET apurar=COALESCE(NEW.apurar,apurar), tipo=COALESCE(NEW.tipo,tipo), percentual=COALESCE(NEW.percentual,percentual), valor_fixo=COALESCE(NEW.valor_fixo,valor_fixo), base_incidencia=COALESCE(NEW.base_incidencia,base_incidencia), beneficiario=COALESCE(NEW.beneficiario,beneficiario), observacoes=COALESCE(NEW.observacoes,observacoes), updated_at=now() WHERE id=NEW.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_pensao_config_iou INSTEAD OF UPDATE ON public.pjecalc_pensao_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_pensao_iou();

CREATE OR REPLACE FUNCTION public.pjecalc_pensao_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN DELETE FROM pjecalc_pensao_alimenticia_config WHERE id=OLD.id; RETURN OLD; END; $$;
CREATE TRIGGER pjecalc_pensao_config_iod INSTEAD OF DELETE ON public.pjecalc_pensao_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_pensao_iod();

-- =====================================================
-- 2. PREVIDÊNCIA PRIVADA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_prev_privada_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  percentual_empregado numeric DEFAULT 0,
  percentual_empregador numeric DEFAULT 0,
  entidade text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculo_id)
);
ALTER TABLE public.pjecalc_prev_privada_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage prev privada config" ON public.pjecalc_prev_privada_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.pjecalc_previdencia_privada_config AS
SELECT pp.id, c.case_id, pp.calculo_id, pp.apurar, pp.percentual_empregado, pp.percentual_empregador,
       pp.entidade, pp.observacoes, pp.created_at, pp.updated_at
FROM public.pjecalc_prev_privada_config pp
JOIN public.pjecalc_calculos c ON c.id = pp.calculo_id;

CREATE OR REPLACE FUNCTION public.pjecalc_prevpriv_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_prev_privada_config (calculo_id, apurar, percentual_empregado, percentual_empregador, entidade, observacoes)
  VALUES (v_cid, COALESCE(NEW.apurar, false), COALESCE(NEW.percentual_empregado, 0), COALESCE(NEW.percentual_empregador, 0), NEW.entidade, NEW.observacoes)
  ON CONFLICT (calculo_id) DO UPDATE SET apurar=EXCLUDED.apurar, percentual_empregado=EXCLUDED.percentual_empregado, percentual_empregador=EXCLUDED.percentual_empregador, entidade=EXCLUDED.entidade, observacoes=EXCLUDED.observacoes, updated_at=now();
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_previdencia_privada_config_ioi INSTEAD OF INSERT ON public.pjecalc_previdencia_privada_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_prevpriv_ioi();

CREATE OR REPLACE FUNCTION public.pjecalc_prevpriv_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE pjecalc_prev_privada_config SET apurar=COALESCE(NEW.apurar,apurar), percentual_empregado=COALESCE(NEW.percentual_empregado,percentual_empregado), percentual_empregador=COALESCE(NEW.percentual_empregador,percentual_empregador), entidade=COALESCE(NEW.entidade,entidade), observacoes=COALESCE(NEW.observacoes,observacoes), updated_at=now() WHERE id=NEW.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_previdencia_privada_config_iou INSTEAD OF UPDATE ON public.pjecalc_previdencia_privada_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_prevpriv_iou();

CREATE OR REPLACE FUNCTION public.pjecalc_prevpriv_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN DELETE FROM pjecalc_prev_privada_config WHERE id=OLD.id; RETURN OLD; END; $$;
CREATE TRIGGER pjecalc_previdencia_privada_config_iod INSTEAD OF DELETE ON public.pjecalc_previdencia_privada_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_prevpriv_iod();

-- =====================================================
-- 3. SALÁRIO-FAMÍLIA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_sal_familia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  numero_filhos integer DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculo_id)
);
ALTER TABLE public.pjecalc_sal_familia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage sal familia config" ON public.pjecalc_sal_familia_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.pjecalc_salario_familia_config AS
SELECT sf.id, c.case_id, sf.calculo_id, sf.apurar, sf.numero_filhos,
       sf.observacoes, sf.created_at, sf.updated_at
FROM public.pjecalc_sal_familia_config sf
JOIN public.pjecalc_calculos c ON c.id = sf.calculo_id;

CREATE OR REPLACE FUNCTION public.pjecalc_salfam_ioi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_sal_familia_config (calculo_id, apurar, numero_filhos, observacoes)
  VALUES (v_cid, COALESCE(NEW.apurar, false), COALESCE(NEW.numero_filhos, 0), NEW.observacoes)
  ON CONFLICT (calculo_id) DO UPDATE SET apurar=EXCLUDED.apurar, numero_filhos=EXCLUDED.numero_filhos, observacoes=EXCLUDED.observacoes, updated_at=now();
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_salario_familia_config_ioi INSTEAD OF INSERT ON public.pjecalc_salario_familia_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_salfam_ioi();

CREATE OR REPLACE FUNCTION public.pjecalc_salfam_iou() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE pjecalc_sal_familia_config SET apurar=COALESCE(NEW.apurar,apurar), numero_filhos=COALESCE(NEW.numero_filhos,numero_filhos), observacoes=COALESCE(NEW.observacoes,observacoes), updated_at=now() WHERE id=NEW.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER pjecalc_salario_familia_config_iou INSTEAD OF UPDATE ON public.pjecalc_salario_familia_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_salfam_iou();

CREATE OR REPLACE FUNCTION public.pjecalc_salfam_iod() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN DELETE FROM pjecalc_sal_familia_config WHERE id=OLD.id; RETURN OLD; END; $$;
CREATE TRIGGER pjecalc_salario_familia_config_iod INSTEAD OF DELETE ON public.pjecalc_salario_familia_config FOR EACH ROW EXECUTE FUNCTION public.pjecalc_salfam_iod();

NOTIFY pgrst, 'reload schema';


-- Step 2: Add version_id to existing tables + create missing tables + SQL functions

-- Add version_id to existing tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_salario_minimo' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_salario_minimo ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_contribuicao_social' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_contribuicao_social ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_seguro_desemprego' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_seguro_desemprego ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_custas_judiciais' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_custas_judiciais ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_correcao_monetaria' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_correcao_monetaria ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_salario_familia' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_salario_familia ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
END$$;

-- Create missing domain tables
CREATE TABLE IF NOT EXISTS public.pjecalc_verbas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, tipo text NOT NULL DEFAULT 'principal',
  valor_tipo text NOT NULL DEFAULT 'calculado', caracteristica text NOT NULL DEFAULT 'comum',
  ocorrencia_pagamento text NOT NULL DEFAULT 'mensal',
  incidencia_fgts boolean NOT NULL DEFAULT false, incidencia_cs boolean NOT NULL DEFAULT false,
  incidencia_irpf boolean NOT NULL DEFAULT false, regra_json jsonb DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true, version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_verbas_padrao ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_verbas_padrao' AND policyname = 'auth_manage_verbas_padrao') THEN
    CREATE POLICY "auth_manage_verbas_padrao" ON public.pjecalc_verbas_padrao FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_juros_mora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL, tipo text NOT NULL DEFAULT 'trabalhista',
  taxa_mensal numeric NOT NULL, acumulado numeric,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competencia, tipo)
);
ALTER TABLE public.pjecalc_juros_mora ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_juros_mora' AND policyname = 'read_juros') THEN
    CREATE POLICY "read_juros" ON public.pjecalc_juros_mora FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_juros_mora' AND policyname = 'auth_manage_juros') THEN
    CREATE POLICY "auth_manage_juros" ON public.pjecalc_juros_mora FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_imposto_renda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL UNIQUE,
  deducao_dependente numeric DEFAULT 0, deducao_aposentado_65 numeric DEFAULT 0,
  faixas jsonb NOT NULL DEFAULT '[]'::jsonb,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_imposto_renda ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_imposto_renda' AND policyname = 'read_irrf') THEN
    CREATE POLICY "read_irrf" ON public.pjecalc_imposto_renda FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_imposto_renda' AND policyname = 'auth_manage_irrf') THEN
    CREATE POLICY "auth_manage_irrf" ON public.pjecalc_imposto_renda FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.pjecalc_feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL, nome text NOT NULL,
  scope text NOT NULL DEFAULT 'national', uf text, municipio text,
  municipio_ibge text, fonte text,
  version_id uuid REFERENCES public.reference_table_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_feriados ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_feriados' AND policyname = 'read_feriados_pub') THEN
    CREATE POLICY "read_feriados_pub" ON public.pjecalc_feriados FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_feriados' AND policyname = 'auth_manage_feriados') THEN
    CREATE POLICY "auth_manage_feriados" ON public.pjecalc_feriados FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

-- Add version_id / fonte_doc / max_desconto_pct to existing tables if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_pisos_salariais' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_pisos_salariais ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_pisos_salariais' AND column_name = 'fonte_doc') THEN
    ALTER TABLE public.pjecalc_pisos_salariais ADD COLUMN fonte_doc text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_vale_transporte' AND column_name = 'version_id') THEN
    ALTER TABLE public.pjecalc_vale_transporte ADD COLUMN version_id uuid REFERENCES public.reference_table_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pjecalc_vale_transporte' AND column_name = 'max_desconto_pct') THEN
    ALTER TABLE public.pjecalc_vale_transporte ADD COLUMN max_desconto_pct numeric NOT NULL DEFAULT 6.00;
  END IF;
END$$;

-- SQL Functions
CREATE OR REPLACE FUNCTION public.get_reference_version(p_table_slug text, p_date date)
RETURNS uuid LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT id FROM reference_table_versions
  WHERE table_slug = p_table_slug AND status = 'published'
    AND ((competency_year = EXTRACT(YEAR FROM p_date)::int AND (competency_month IS NULL OR competency_month = EXTRACT(MONTH FROM p_date)::int))
      OR (valid_from IS NOT NULL AND valid_from <= p_date AND (valid_to IS NULL OR valid_to >= p_date)))
  ORDER BY competency_year DESC, competency_month DESC NULLS LAST LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.calc_inss(p_base numeric, p_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_faixas RECORD; v_total numeric := 0; v_restante numeric := p_base;
  v_competencia date; v_explain jsonb := '[]'::jsonb; v_faixa_anterior numeric := 0; v_contrib numeric; v_base_faixa numeric;
BEGIN
  SELECT competencia INTO v_competencia FROM pjecalc_contribuicao_social
  WHERE tipo = 'segurado_empregado' AND competencia <= p_date ORDER BY competencia DESC LIMIT 1;
  IF v_competencia IS NULL THEN RETURN jsonb_build_object('valor', 0, 'error', 'Tabela INSS não encontrada'); END IF;
  FOR v_faixas IN SELECT faixa, valor_inicial, valor_final, aliquota FROM pjecalc_contribuicao_social
    WHERE tipo = 'segurado_empregado' AND competencia = v_competencia ORDER BY faixa LOOP
    IF v_restante <= 0 THEN EXIT; END IF;
    v_base_faixa := LEAST(v_restante, COALESCE(v_faixas.valor_final, v_restante) - v_faixa_anterior);
    IF v_base_faixa <= 0 THEN v_faixa_anterior := COALESCE(v_faixas.valor_final, v_faixa_anterior); CONTINUE; END IF;
    v_contrib := ROUND(v_base_faixa * v_faixas.aliquota / 100, 2);
    v_total := v_total + v_contrib; v_restante := v_restante - v_base_faixa;
    v_explain := v_explain || jsonb_build_object('faixa', v_faixas.faixa, 'base', v_base_faixa, 'aliquota', v_faixas.aliquota, 'contribuicao', v_contrib);
    v_faixa_anterior := COALESCE(v_faixas.valor_final, v_faixa_anterior);
  END LOOP;
  RETURN jsonb_build_object('valor', v_total, 'competencia_tabela', v_competencia, 'base', p_base, 'faixas_aplicadas', v_explain);
END;$$;

CREATE OR REPLACE FUNCTION public.calc_irrf(p_base numeric, p_dependentes int DEFAULT 0, p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_competencia date; v_deducao_dep numeric; v_faixas jsonb; v_faixa jsonb; v_base_calc numeric; v_imposto numeric := 0; i int;
BEGIN
  SELECT competencia, COALESCE(deducao_dependente,0), faixas INTO v_competencia, v_deducao_dep, v_faixas
  FROM pjecalc_imposto_renda WHERE competencia <= p_date ORDER BY competencia DESC LIMIT 1;
  IF v_competencia IS NULL THEN RETURN jsonb_build_object('valor', 0, 'error', 'Tabela IRRF não encontrada'); END IF;
  v_base_calc := p_base - (v_deducao_dep * p_dependentes);
  IF v_base_calc <= 0 THEN RETURN jsonb_build_object('valor', 0, 'isento', true); END IF;
  FOR i IN 0..jsonb_array_length(v_faixas) - 1 LOOP
    v_faixa := v_faixas->i;
    IF v_base_calc >= (v_faixa->>'faixa_inicio')::numeric AND
       (v_faixa->>'faixa_fim' IS NULL OR v_base_calc <= (v_faixa->>'faixa_fim')::numeric) THEN
      v_imposto := ROUND(v_base_calc * (v_faixa->>'aliquota')::numeric - COALESCE((v_faixa->>'deducao')::numeric, 0), 2);
      RETURN jsonb_build_object('valor', GREATEST(v_imposto, 0), 'base_original', p_base, 'deducao_dependentes', v_deducao_dep * p_dependentes,
        'base_calc', v_base_calc, 'aliquota', (v_faixa->>'aliquota')::numeric, 'competencia_tabela', v_competencia);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('valor', 0, 'isento', true, 'base_calc', v_base_calc);
END;$$;

CREATE OR REPLACE FUNCTION public.apply_correction(p_value numeric, p_from_date date, p_to_date date, p_index text DEFAULT 'IPCA-E')
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_factor numeric := 1; v_rec RECORD; v_months jsonb := '[]'::jsonb;
BEGIN
  FOR v_rec IN SELECT competencia, valor FROM pjecalc_correcao_monetaria
    WHERE indice = p_index AND competencia >= date_trunc('month', p_from_date) AND competencia <= date_trunc('month', p_to_date) ORDER BY competencia LOOP
    v_factor := v_factor * (1 + v_rec.valor / 100);
    v_months := v_months || jsonb_build_object('competencia', v_rec.competencia, 'indice', v_rec.valor, 'fator_acumulado', v_factor);
  END LOOP;
  RETURN jsonb_build_object('valor_original', p_value, 'valor_corrigido', ROUND(p_value * v_factor, 2), 'fator_total', v_factor,
    'indice', p_index, 'periodo', jsonb_build_object('de', p_from_date, 'ate', p_to_date), 'meses_aplicados', jsonb_array_length(v_months), 'detalhes', v_months);
END;$$;

CREATE OR REPLACE FUNCTION public.calc_juros(p_value numeric, p_from_date date, p_to_date date, p_rule text DEFAULT 'trabalhista')
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE v_total_taxa numeric := 0; v_rec RECORD; v_meses int; v_details jsonb := '[]'::jsonb;
BEGIN
  IF p_rule = 'trabalhista' THEN
    v_meses := GREATEST(0, (EXTRACT(YEAR FROM p_to_date) - EXTRACT(YEAR FROM p_from_date)) * 12 + EXTRACT(MONTH FROM p_to_date) - EXTRACT(MONTH FROM p_from_date));
    v_total_taxa := v_meses * 1.0;
    RETURN jsonb_build_object('valor_principal', p_value, 'juros', ROUND(p_value * v_total_taxa / 100, 2), 'taxa_total_pct', v_total_taxa, 'meses', v_meses, 'regra', '1% a.m.');
  ELSE
    FOR v_rec IN SELECT competencia, taxa_mensal FROM pjecalc_juros_mora
      WHERE tipo = p_rule AND competencia >= date_trunc('month', p_from_date) AND competencia <= date_trunc('month', p_to_date) ORDER BY competencia LOOP
      v_total_taxa := v_total_taxa + v_rec.taxa_mensal;
      v_details := v_details || jsonb_build_object('competencia', v_rec.competencia, 'taxa', v_rec.taxa_mensal);
    END LOOP;
    RETURN jsonb_build_object('valor_principal', p_value, 'juros', ROUND(p_value * v_total_taxa / 100, 2), 'taxa_total_pct', v_total_taxa, 'regra', p_rule, 'detalhes', v_details);
  END IF;
END;$$;

-- Seed registry
INSERT INTO public.reference_table_registry (slug, name, update_frequency, is_auto_importable, requires_manual_input, status) VALUES
  ('salario_minimo', 'Salário Mínimo', 'yearly', true, false, 'ok'),
  ('pisos_salariais', 'Pisos Salariais', 'ad-hoc', false, true, 'ok'),
  ('salario_familia', 'Salário-família', 'yearly', true, false, 'ok'),
  ('seguro_desemprego', 'Seguro-desemprego', 'yearly', true, false, 'ok'),
  ('vale_transporte', 'Vale-transporte', 'ad-hoc', false, true, 'ok'),
  ('feriados', 'Feriados', 'yearly', true, true, 'ok'),
  ('verbas', 'Verbas', 'ad-hoc', false, true, 'ok'),
  ('contribuicao_social', 'Contribuição Social (INSS)', 'yearly', true, false, 'ok'),
  ('imposto_renda', 'Imposto de Renda (IRRF)', 'yearly', true, false, 'ok'),
  ('custas_judiciais', 'Custas Judiciais', 'ad-hoc', true, true, 'ok'),
  ('correcao_monetaria', 'Correção Monetária', 'monthly', true, false, 'ok'),
  ('juros_mora', 'Juros de Mora', 'monthly', true, false, 'ok')
ON CONFLICT DO NOTHING;

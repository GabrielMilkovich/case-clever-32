
-- =============================================
-- TABELAS DE REFERÊNCIA PJe-Calc (Nacionais)
-- =============================================

-- 1. Salário Mínimo (Nacional)
CREATE TABLE public.pjecalc_salario_minimo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  valor numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia)
);
ALTER TABLE public.pjecalc_salario_minimo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read salario_minimo" ON public.pjecalc_salario_minimo FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage salario_minimo" ON public.pjecalc_salario_minimo FOR ALL USING (auth.role() = 'authenticated');

-- 2. Salário-família (faixas por competência)
CREATE TABLE public.pjecalc_salario_familia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  valor_cota numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, faixa)
);
ALTER TABLE public.pjecalc_salario_familia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read salario_familia" ON public.pjecalc_salario_familia FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage salario_familia" ON public.pjecalc_salario_familia FOR ALL USING (auth.role() = 'authenticated');

-- 3. Seguro-desemprego (faixas por competência)
CREATE TABLE public.pjecalc_seguro_desemprego (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  valor_piso numeric NOT NULL,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  percentual numeric NOT NULL,
  valor_soma numeric,
  valor_teto numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, faixa)
);
ALTER TABLE public.pjecalc_seguro_desemprego ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read seguro_desemprego" ON public.pjecalc_seguro_desemprego FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage seguro_desemprego" ON public.pjecalc_seguro_desemprego FOR ALL USING (auth.role() = 'authenticated');

-- 4. Contribuição Social (faixas progressivas por competência e tipo)
CREATE TABLE public.pjecalc_contribuicao_social (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  tipo text NOT NULL DEFAULT 'segurado_empregado',  -- segurado_empregado, empregado_domestico
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL,
  aliquota numeric NOT NULL,
  teto_maximo numeric,
  teto_beneficio numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, tipo, faixa)
);
ALTER TABLE public.pjecalc_contribuicao_social ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read contribuicao_social" ON public.pjecalc_contribuicao_social FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage contribuicao_social" ON public.pjecalc_contribuicao_social FOR ALL USING (auth.role() = 'authenticated');

-- 5. Imposto de Renda (tabela progressiva + deduções por competência)
CREATE TABLE public.pjecalc_imposto_renda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  deducao_dependente numeric NOT NULL DEFAULT 0,
  deducao_aposentado_65 numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia)
);
ALTER TABLE public.pjecalc_imposto_renda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read imposto_renda" ON public.pjecalc_imposto_renda FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage imposto_renda" ON public.pjecalc_imposto_renda FOR ALL USING (auth.role() = 'authenticated');

-- 5b. Faixas do Imposto de Renda
CREATE TABLE public.pjecalc_imposto_renda_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ir_id uuid NOT NULL REFERENCES public.pjecalc_imposto_renda(id) ON DELETE CASCADE,
  faixa integer NOT NULL DEFAULT 1,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric,
  aliquota numeric NOT NULL DEFAULT 0,
  parcela_deduzir numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ir_id, faixa)
);
ALTER TABLE public.pjecalc_imposto_renda_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ir_faixas" ON public.pjecalc_imposto_renda_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage ir_faixas" ON public.pjecalc_imposto_renda_faixas FOR ALL USING (auth.role() = 'authenticated');

-- 6. Custas Judiciais (por TRT/período)
CREATE TABLE public.pjecalc_custas_judiciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  atos_oficiais_urbana numeric DEFAULT 0,
  atos_oficiais_rural numeric DEFAULT 0,
  agravo_instrumento numeric DEFAULT 0,
  agravo_peticao numeric DEFAULT 0,
  impugnacao_sentenca numeric DEFAULT 0,
  recurso_revista numeric DEFAULT 0,
  embargos_arrematacao numeric DEFAULT 0,
  embargos_execucao numeric DEFAULT 0,
  embargos_terceiros numeric DEFAULT 0,
  piso_custas_conhecimento numeric DEFAULT 0,
  teto_custas_liquidacao numeric DEFAULT 0,
  teto_custas_autos numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vigencia_inicio)
);
ALTER TABLE public.pjecalc_custas_judiciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read custas" ON public.pjecalc_custas_judiciais FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage custas" ON public.pjecalc_custas_judiciais FOR ALL USING (auth.role() = 'authenticated');

-- 7. Correção Monetária (índices mensais por tipo)
CREATE TABLE public.pjecalc_correcao_monetaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  indice text NOT NULL, -- IPCA-E, INPC, TR, SELIC, etc.
  valor numeric NOT NULL,
  acumulado numeric,
  fonte text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, indice)
);
ALTER TABLE public.pjecalc_correcao_monetaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read correcao" ON public.pjecalc_correcao_monetaria FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage correcao" ON public.pjecalc_correcao_monetaria FOR ALL USING (auth.role() = 'authenticated');

-- 8. Juros de Mora (taxas por período)
CREATE TABLE public.pjecalc_juros_mora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL,
  tipo text NOT NULL DEFAULT 'trabalhista', -- trabalhista, selic, civil
  taxa_mensal numeric NOT NULL,
  acumulado numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competencia, tipo)
);
ALTER TABLE public.pjecalc_juros_mora ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read juros" ON public.pjecalc_juros_mora FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage juros" ON public.pjecalc_juros_mora FOR ALL USING (auth.role() = 'authenticated');

-- 9. Pisos Salariais (regionais, por TRT)
CREATE TABLE public.pjecalc_pisos_salariais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  uf text NOT NULL,
  competencia date NOT NULL,
  valor numeric NOT NULL,
  categoria text,
  sindicato text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_pisos_salariais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pisos" ON public.pjecalc_pisos_salariais FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage pisos" ON public.pjecalc_pisos_salariais FOR ALL USING (auth.role() = 'authenticated');

-- 10. Vale-Transporte (regional)
CREATE TABLE public.pjecalc_vale_transporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha text NOT NULL,
  uf text NOT NULL,
  municipio text,
  valor numeric NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_vale_transporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vt" ON public.pjecalc_vale_transporte FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage vt" ON public.pjecalc_vale_transporte FOR ALL USING (auth.role() = 'authenticated');

-- 11. Verbas Padrão (cadastro nacional de verbas)
CREATE TABLE public.pjecalc_verbas_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'principal', -- principal, reflexa
  valor_tipo text NOT NULL DEFAULT 'calculado', -- calculado, informado
  caracteristica text NOT NULL DEFAULT 'comum', -- comum, 13_salario, ferias
  ocorrencia_pagamento text NOT NULL DEFAULT 'mensal',
  divisor_padrao numeric DEFAULT 30,
  multiplicador_padrao numeric DEFAULT 1,
  incidencia_fgts boolean DEFAULT false,
  incidencia_cs boolean DEFAULT false,
  incidencia_irpf boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_verbas_padrao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read verbas_padrao" ON public.pjecalc_verbas_padrao FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage verbas_padrao" ON public.pjecalc_verbas_padrao FOR ALL USING (auth.role() = 'authenticated');

-- 12. Feriados (complementar à tabela calendars existente - dados regionais)
-- Já existe a tabela calendars, vamos usá-la

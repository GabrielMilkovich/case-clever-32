
-- Config tables for PJe-Calc modules
CREATE TABLE IF NOT EXISTS public.pjecalc_dados_processo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  numero_processo TEXT,
  vara TEXT,
  comarca TEXT,
  uf TEXT DEFAULT 'SP',
  tipo_acao TEXT DEFAULT 'trabalhista',
  rito TEXT DEFAULT 'ordinario',
  fase TEXT DEFAULT 'conhecimento',
  data_distribuicao TEXT,
  data_citacao TEXT,
  data_transito TEXT,
  juiz TEXT,
  reclamante_nome TEXT,
  reclamante_cpf TEXT,
  reclamada_nome TEXT,
  reclamada_cnpj TEXT,
  objeto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_cartao_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  competencia TEXT NOT NULL,
  dias_uteis INTEGER DEFAULT 22,
  dias_trabalhados INTEGER DEFAULT 22,
  horas_normais NUMERIC DEFAULT 0,
  horas_extras_50 NUMERIC DEFAULT 0,
  horas_extras_100 NUMERIC DEFAULT 0,
  horas_noturnas NUMERIC DEFAULT 0,
  adicional_noturno_pct NUMERIC DEFAULT 20,
  intervalo_suprimido NUMERIC DEFAULT 0,
  sobreaviso NUMERIC DEFAULT 0,
  dsr_horas NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, competencia)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_fgts_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  destino TEXT DEFAULT 'pagar_reclamante',
  compor_principal BOOLEAN DEFAULT true,
  multa_apurar BOOLEAN DEFAULT true,
  multa_tipo TEXT DEFAULT 'calculada',
  multa_percentual NUMERIC DEFAULT 40,
  multa_base TEXT DEFAULT 'devido',
  multa_valor_informado NUMERIC,
  deduzir_saldo BOOLEAN DEFAULT false,
  lc110_10 BOOLEAN DEFAULT false,
  lc110_05 BOOLEAN DEFAULT false,
  saldos_saques JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_cs_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar_segurado BOOLEAN DEFAULT true,
  cobrar_reclamante BOOLEAN DEFAULT true,
  cs_sobre_salarios_pagos BOOLEAN DEFAULT false,
  aliquota_segurado_tipo TEXT DEFAULT 'empregado',
  aliquota_segurado_fixa NUMERIC,
  limitar_teto BOOLEAN DEFAULT true,
  apurar_empresa BOOLEAN DEFAULT true,
  apurar_sat BOOLEAN DEFAULT true,
  apurar_terceiros BOOLEAN DEFAULT true,
  aliquota_empresa_fixa NUMERIC DEFAULT 20,
  aliquota_sat_fixa NUMERIC DEFAULT 2,
  aliquota_terceiros_fixa NUMERIC DEFAULT 5.8,
  periodos_simples JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_ir_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  incidir_sobre_juros BOOLEAN DEFAULT false,
  cobrar_reclamado BOOLEAN DEFAULT false,
  tributacao_exclusiva_13 BOOLEAN DEFAULT true,
  tributacao_separada_ferias BOOLEAN DEFAULT false,
  deduzir_cs BOOLEAN DEFAULT true,
  deduzir_prev_privada BOOLEAN DEFAULT false,
  deduzir_pensao BOOLEAN DEFAULT false,
  deduzir_honorarios BOOLEAN DEFAULT false,
  aposentado_65 BOOLEAN DEFAULT false,
  dependentes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_correcao_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  indice TEXT DEFAULT 'IPCA-E',
  epoca TEXT DEFAULT 'mensal',
  data_fixa TEXT,
  juros_tipo TEXT DEFAULT 'selic',
  juros_percentual NUMERIC DEFAULT 1,
  juros_inicio TEXT DEFAULT 'ajuizamento',
  multa_523 BOOLEAN DEFAULT false,
  multa_523_percentual NUMERIC DEFAULT 10,
  data_liquidacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_seguro_desemprego (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT false,
  parcelas INTEGER DEFAULT 5,
  valor_parcela NUMERIC,
  recebeu BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_honorarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar_sucumbenciais BOOLEAN DEFAULT true,
  percentual_sucumbenciais NUMERIC DEFAULT 15,
  base_sucumbenciais TEXT DEFAULT 'condenacao',
  apurar_contratuais BOOLEAN DEFAULT false,
  percentual_contratuais NUMERIC DEFAULT 20,
  valor_fixo NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_custas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  apurar BOOLEAN DEFAULT true,
  percentual NUMERIC DEFAULT 2,
  valor_minimo NUMERIC DEFAULT 10.64,
  valor_maximo NUMERIC,
  isento BOOLEAN DEFAULT false,
  assistencia_judiciaria BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_liquidacao_resultado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  resultado JSONB NOT NULL,
  engine_version TEXT DEFAULT '1.0.0',
  data_liquidacao TEXT,
  total_bruto NUMERIC,
  total_liquido NUMERIC,
  total_reclamante NUMERIC,
  total_reclamada NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pjecalc_dados_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_cartao_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_fgts_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_cs_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_ir_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_correcao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_seguro_desemprego ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_honorarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_custas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_liquidacao_resultado ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow authenticated users)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'pjecalc_dados_processo','pjecalc_cartao_ponto','pjecalc_fgts_config',
    'pjecalc_cs_config','pjecalc_ir_config','pjecalc_correcao_config',
    'pjecalc_seguro_desemprego','pjecalc_honorarios','pjecalc_custas',
    'pjecalc_liquidacao_resultado'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow authenticated full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END;
$$;

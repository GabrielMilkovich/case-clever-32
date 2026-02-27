
-- =====================================================
-- PJE-CALC: TABELAS DE VERBAS E OCORRÊNCIAS
-- Réplica do modelo de dados do PJe-Calc CSJT
-- =====================================================

-- Parâmetros do Cálculo PJe-Calc
CREATE TABLE public.pjecalc_parametros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'SP',
  municipio TEXT NOT NULL DEFAULT '',
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  data_ajuizamento DATE NOT NULL,
  data_inicial DATE,
  data_final DATE,
  prescricao_quinquenal BOOLEAN DEFAULT false,
  prescricao_fgts BOOLEAN DEFAULT false,
  data_prescricao_quinquenal DATE,
  regime_trabalho TEXT NOT NULL DEFAULT 'tempo_integral',
  maior_remuneracao NUMERIC,
  ultima_remuneracao NUMERIC,
  prazo_aviso_previo TEXT NOT NULL DEFAULT 'nao_apurar',
  prazo_aviso_dias INTEGER,
  projetar_aviso_indenizado BOOLEAN DEFAULT false,
  limitar_avos_periodo BOOLEAN DEFAULT false,
  zerar_valor_negativo BOOLEAN DEFAULT false,
  considerar_feriado_estadual BOOLEAN DEFAULT false,
  considerar_feriado_municipal BOOLEAN DEFAULT false,
  carga_horaria_padrao INTEGER NOT NULL DEFAULT 220,
  excecoes_carga_horaria JSONB DEFAULT '[]'::jsonb,
  sabado_dia_util BOOLEAN DEFAULT true,
  excecoes_sabado JSONB DEFAULT '[]'::jsonb,
  pontos_facultativos JSONB DEFAULT '[]'::jsonb,
  comentarios TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

-- Histórico Salarial PJe-Calc
CREATE TABLE public.pjecalc_historico_salarial (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_valor TEXT NOT NULL DEFAULT 'informado',
  incidencia_fgts BOOLEAN DEFAULT false,
  incidencia_cs BOOLEAN DEFAULT false,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  valor_informado NUMERIC,
  quantidade NUMERIC,
  base_referencia TEXT,
  categoria_piso TEXT,
  fgts_recolhido BOOLEAN DEFAULT false,
  cs_recolhida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ocorrências do Histórico Salarial
CREATE TABLE public.pjecalc_historico_ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  historico_id UUID NOT NULL REFERENCES public.pjecalc_historico_salarial(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'calculado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Faltas PJe-Calc
CREATE TABLE public.pjecalc_faltas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  data_inicial DATE NOT NULL,
  data_final DATE NOT NULL,
  justificada BOOLEAN DEFAULT false,
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Férias PJe-Calc
CREATE TABLE public.pjecalc_ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  relativas TEXT NOT NULL,
  periodo_aquisitivo_inicio DATE NOT NULL,
  periodo_aquisitivo_fim DATE NOT NULL,
  periodo_concessivo_inicio DATE NOT NULL,
  periodo_concessivo_fim DATE NOT NULL,
  prazo_dias INTEGER NOT NULL DEFAULT 30,
  situacao TEXT NOT NULL DEFAULT 'gozadas',
  dobra BOOLEAN DEFAULT false,
  abono BOOLEAN DEFAULT false,
  periodos_gozo JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verbas PJe-Calc (CORE)
CREATE TABLE public.pjecalc_verbas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  assunto_cnj TEXT,
  tipo TEXT NOT NULL DEFAULT 'principal',
  valor TEXT NOT NULL DEFAULT 'calculado',
  caracteristica TEXT NOT NULL DEFAULT 'comum',
  ocorrencia_pagamento TEXT NOT NULL DEFAULT 'mensal',
  incidencias JSONB NOT NULL DEFAULT '{"fgts":false,"irpf":false,"contribuicao_social":false,"previdencia_privada":false,"pensao_alimenticia":false}'::jsonb,
  juros_ajuizamento TEXT NOT NULL DEFAULT 'ocorrencias_vencidas',
  gerar_verba_reflexa TEXT NOT NULL DEFAULT 'devido',
  gerar_verba_principal TEXT NOT NULL DEFAULT 'devido',
  compor_principal BOOLEAN NOT NULL DEFAULT true,
  zerar_valor_negativo BOOLEAN DEFAULT false,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  exclusoes JSONB NOT NULL DEFAULT '{"faltas_justificadas":false,"faltas_nao_justificadas":false,"ferias_gozadas":false}'::jsonb,
  dobrar_valor_devido BOOLEAN DEFAULT false,
  base_calculo JSONB NOT NULL DEFAULT '{"historicos":[],"tabelas":[],"verbas":[],"proporcionalizar":false,"integralizar":false}'::jsonb,
  tipo_divisor TEXT NOT NULL DEFAULT 'informado',
  divisor_informado NUMERIC DEFAULT 30,
  divisor_cartao_colunas JSONB DEFAULT '[]'::jsonb,
  multiplicador NUMERIC NOT NULL DEFAULT 1,
  tipo_quantidade TEXT NOT NULL DEFAULT 'informada',
  quantidade_informada NUMERIC,
  quantidade_calendario_tipo TEXT,
  quantidade_cartao_colunas JSONB DEFAULT '[]'::jsonb,
  quantidade_proporcionalizar BOOLEAN DEFAULT false,
  valor_informado_devido NUMERIC,
  valor_informado_pago NUMERIC,
  verba_principal_id UUID REFERENCES public.pjecalc_verbas(id) ON DELETE SET NULL,
  verbas_reflexas_base JSONB DEFAULT '[]'::jsonb,
  comportamento_reflexo TEXT,
  comentarios TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ocorrências das Verbas PJe-Calc
CREATE TABLE public.pjecalc_verba_ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verba_id UUID NOT NULL REFERENCES public.pjecalc_verbas(id) ON DELETE CASCADE,
  competencia TEXT NOT NULL,
  data_inicial DATE NOT NULL,
  data_final DATE NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  valor_base NUMERIC NOT NULL DEFAULT 0,
  divisor NUMERIC NOT NULL DEFAULT 30,
  multiplicador NUMERIC NOT NULL DEFAULT 1,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  dobra INTEGER NOT NULL DEFAULT 1,
  devido NUMERIC NOT NULL DEFAULT 0,
  pago NUMERIC NOT NULL DEFAULT 0,
  diferenca NUMERIC NOT NULL DEFAULT 0,
  tipo_valor TEXT NOT NULL DEFAULT 'calculado',
  tipo_divisor TEXT NOT NULL DEFAULT 'calculado',
  tipo_quantidade TEXT NOT NULL DEFAULT 'calculado',
  tipo_pago TEXT NOT NULL DEFAULT 'informado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies (owner-based via cases)
ALTER TABLE public.pjecalc_parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_historico_salarial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_historico_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_faltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_verbas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_verba_ocorrencias ENABLE ROW LEVEL SECURITY;

-- Parametros: owner via cases
CREATE POLICY "Users manage own pjecalc_parametros" ON public.pjecalc_parametros
  FOR ALL USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = pjecalc_parametros.case_id AND c.criado_por = auth.uid()));

-- Historico salarial
CREATE POLICY "Users manage own pjecalc_historico" ON public.pjecalc_historico_salarial
  FOR ALL USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = pjecalc_historico_salarial.case_id AND c.criado_por = auth.uid()));

-- Historico ocorrencias (via historico -> case)
CREATE POLICY "Users manage own pjecalc_hist_oc" ON public.pjecalc_historico_ocorrencias
  FOR ALL USING (EXISTS (
    SELECT 1 FROM pjecalc_historico_salarial h 
    JOIN cases c ON c.id = h.case_id 
    WHERE h.id = pjecalc_historico_ocorrencias.historico_id AND c.criado_por = auth.uid()
  ));

-- Faltas
CREATE POLICY "Users manage own pjecalc_faltas" ON public.pjecalc_faltas
  FOR ALL USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = pjecalc_faltas.case_id AND c.criado_por = auth.uid()));

-- Ferias
CREATE POLICY "Users manage own pjecalc_ferias" ON public.pjecalc_ferias
  FOR ALL USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = pjecalc_ferias.case_id AND c.criado_por = auth.uid()));

-- Verbas
CREATE POLICY "Users manage own pjecalc_verbas" ON public.pjecalc_verbas
  FOR ALL USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = pjecalc_verbas.case_id AND c.criado_por = auth.uid()));

-- Verba ocorrencias (via verba -> case)
CREATE POLICY "Users manage own pjecalc_verba_oc" ON public.pjecalc_verba_ocorrencias
  FOR ALL USING (EXISTS (
    SELECT 1 FROM pjecalc_verbas v 
    JOIN cases c ON c.id = v.case_id 
    WHERE v.id = pjecalc_verba_ocorrencias.verba_id AND c.criado_por = auth.uid()
  ));

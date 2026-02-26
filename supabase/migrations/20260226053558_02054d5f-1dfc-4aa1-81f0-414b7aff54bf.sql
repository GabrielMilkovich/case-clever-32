
-- =====================================================
-- TABELA: legal_sources (Fontes Oficiais)
-- =====================================================
CREATE TABLE public.legal_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orgao TEXT NOT NULL,
  nome TEXT NOT NULL,
  url TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('lei','decreto','portaria','sumula','oj','tema_stf','decisao','nr','cct','act','tabela','instrucao_normativa')),
  publicado_em DATE,
  observado_em DATE DEFAULT CURRENT_DATE,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  notas TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.legal_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view legal sources" ON public.legal_sources FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage legal sources" ON public.legal_sources FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: legal_rules (Regras Jurídicas Versionadas)
-- =====================================================
CREATE TABLE public.legal_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  formula_texto TEXT,
  parametros_json JSONB DEFAULT '{}'::jsonb,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  prioridade INTEGER DEFAULT 0,
  jurisdicao TEXT NOT NULL DEFAULT 'lei' CHECK (jurisdicao IN ('lei','jurisprudencia','instrumento_coletivo','administrativo')),
  source_id UUID REFERENCES public.legal_sources(id),
  referencia TEXT,
  link_ref TEXT,
  flag_controversia BOOLEAN DEFAULT FALSE,
  tese_opcoes JSONB DEFAULT '[]'::jsonb,
  categoria TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  versao INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_rules_codigo ON public.legal_rules(codigo);
CREATE INDEX idx_legal_rules_vigencia ON public.legal_rules(vigencia_inicio, vigencia_fim);

ALTER TABLE public.legal_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view legal rules" ON public.legal_rules FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage legal rules" ON public.legal_rules FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: reference_tables (Tabelas Oficiais com Hash)
-- =====================================================
CREATE TABLE public.reference_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  competencia TEXT NOT NULL,
  dados_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_id UUID REFERENCES public.legal_sources(id),
  coletado_em DATE DEFAULT CURRENT_DATE,
  hash_integridade TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reference_tables_nome_comp ON public.reference_tables(nome, competencia);

ALTER TABLE public.reference_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reference tables" ON public.reference_tables FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage reference tables" ON public.reference_tables FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: audit_log (Log de Auditoria Geral)
-- =====================================================
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  acao TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entidade ON public.audit_log(entidade, entidade_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own audit logs" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: calculation_cases (Dados Ampliados do Caso)
-- =====================================================
CREATE TABLE public.calculation_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tipo_contrato TEXT DEFAULT 'clt' CHECK (tipo_contrato IN ('clt','domestico','rural','aprendiz','intermitente','temporario','estagio')),
  categoria TEXT DEFAULT 'urbano' CHECK (categoria IN ('urbano','rural','domestico','aprendiz','intermitente')),
  uf TEXT,
  cidade TEXT,
  cct_act TEXT,
  ajuizamento_data DATE,
  periodo_inicio DATE,
  periodo_fim DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

ALTER TABLE public.calculation_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their calculation cases" ON public.calculation_cases FOR ALL
  USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = calculation_cases.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: case_inputs (Eventos Normalizados)
-- =====================================================
CREATE TABLE public.case_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'salario','comissao','horas_extras_50','horas_extras_100',
    'adicional_noturno','adicional_periculosidade','adicional_insalubridade',
    'faltas','feriados','afastamento','mudanca_salario','intervalo',
    'gratificacao','premio','dsr','plantao','sobreaviso','outro'
  )),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor NUMERIC,
  quantidade NUMERIC,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  source_document_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_inputs_case ON public.case_inputs(case_id);
CREATE INDEX idx_case_inputs_tipo ON public.case_inputs(tipo_evento);

ALTER TABLE public.case_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their case inputs" ON public.case_inputs FOR ALL
  USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_inputs.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: case_outputs (Resultados com Base Legal)
-- =====================================================
CREATE TABLE public.case_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.calc_snapshots(id),
  verba_codigo TEXT NOT NULL,
  verba_nome TEXT,
  periodo_ref TEXT,
  base_calculo NUMERIC,
  formula_aplicada TEXT,
  valor_bruto NUMERIC NOT NULL,
  reflexos_json JSONB DEFAULT '[]'::jsonb,
  descontos_json JSONB DEFAULT '[]'::jsonb,
  valor_liquido NUMERIC,
  legal_basis_json JSONB DEFAULT '[]'::jsonb,
  memoria_json JSONB DEFAULT '[]'::jsonb,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_outputs_case ON public.case_outputs(case_id);
CREATE INDEX idx_case_outputs_snapshot ON public.case_outputs(snapshot_id);

ALTER TABLE public.case_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their case outputs" ON public.case_outputs FOR ALL
  USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_outputs.case_id AND c.criado_por = auth.uid()));

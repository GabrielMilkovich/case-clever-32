-- =====================================================
-- MODELO DE DADOS AUDITÁVEL - LIQUIDAÇÃO TRABALHISTA
-- =====================================================

-- 1. ENUM para tipo de parte
DO $$ BEGIN
  CREATE TYPE party_type AS ENUM ('reclamante', 'reclamada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. ENUM para tipo de demissão
DO $$ BEGIN
  CREATE TYPE termination_type AS ENUM (
    'sem_justa_causa', 
    'justa_causa', 
    'pedido_demissao', 
    'rescisao_indireta', 
    'acordo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. ENUM para status de validação
DO $$ BEGIN
  CREATE TYPE validation_action AS ENUM ('aprovar', 'editar', 'rejeitar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. ENUM para status de snapshot
DO $$ BEGIN
  CREATE TYPE snapshot_status AS ENUM ('gerado', 'revisao', 'aprovado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- TABELA: parties (Partes do processo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tipo party_type NOT NULL,
  nome TEXT NOT NULL,
  documento TEXT, -- CPF ou CNPJ
  documento_tipo TEXT, -- 'cpf' ou 'cnpj'
  contato JSONB DEFAULT '{}'::jsonb, -- telefone, email, endereço
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para parties
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parties of their cases"
ON public.parties FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = parties.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can insert parties to their cases"
ON public.parties FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = parties.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update parties of their cases"
ON public.parties FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = parties.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can delete parties of their cases"
ON public.parties FOR DELETE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = parties.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: employment_contracts (Contrato de trabalho)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employment_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  
  -- Datas
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  tipo_demissao termination_type,
  
  -- Informações do cargo
  funcao TEXT,
  local_trabalho TEXT,
  sindicato TEXT,
  
  -- Salário inicial
  salario_inicial DECIMAL(15,2),
  
  -- Histórico salarial (JSON array)
  historico_salarial JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{data_inicio, data_fim, salario_base, adicionais_fixos: {nome, valor}[]}]
  
  -- Jornada
  jornada_contratual JSONB DEFAULT '{"horas_semanais": 44, "divisor": 220}'::jsonb,
  
  -- Observações
  observacoes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para employment_contracts
ALTER TABLE public.employment_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts of their cases"
ON public.employment_contracts FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = employment_contracts.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can insert contracts to their cases"
ON public.employment_contracts FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = employment_contracts.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update contracts of their cases"
ON public.employment_contracts FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = employment_contracts.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can delete contracts of their cases"
ON public.employment_contracts FOR DELETE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = employment_contracts.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: extractions (Extrações OCR/IA)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  
  -- Campo extraído
  campo TEXT NOT NULL, -- ex: salario_base, horas_extras_50
  valor_proposto TEXT NOT NULL,
  tipo_valor TEXT NOT NULL DEFAULT 'texto', -- money, number, date, string, duration
  
  -- Confiança
  confianca DECIMAL(3,2), -- 0.00 a 1.00
  
  -- Origem/Proveniência
  origem JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Formato: {pagina, trecho_texto, linha, bounding_box?, coordenadas?}
  
  metodo TEXT DEFAULT 'ocr', -- ocr, regra, modelo
  
  -- Status
  status TEXT DEFAULT 'pendente', -- pendente, validado, rejeitado
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para extractions
ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view extractions of their cases"
ON public.extractions FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = extractions.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can insert extractions to their cases"
ON public.extractions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = extractions.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update extractions of their cases"
ON public.extractions FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = extractions.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can delete extractions of their cases"
ON public.extractions FOR DELETE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = extractions.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: validations (Validações humanas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES public.extractions(id) ON DELETE SET NULL,
  snapshot_id UUID, -- Será referenciado após criar calc_snapshots
  
  -- Campo validado
  campo TEXT NOT NULL,
  
  -- Valores
  valor_anterior TEXT, -- proposto
  valor_validado TEXT, -- aprovado/editado
  
  -- Ação
  acao validation_action NOT NULL,
  justificativa TEXT,
  
  -- Auditoria
  usuario_id UUID NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS para validations
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validations of their cases"
ON public.validations FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = validations.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can insert validations to their cases"
ON public.validations FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = validations.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update validations of their cases"
ON public.validations FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = validations.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: calc_rules (Regras/Rubricas de cálculo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calc_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE, -- HE50, HE100, DSR_HE, ADIC_NOT, etc.
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL, -- horas_extras, reflexos, rescisao, tributos
  
  -- Fórmula estruturada
  formula JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Formato: {expressao, variaveis[], operacoes[]}
  
  -- Parâmetros requeridos
  parametros_requeridos JSONB DEFAULT '[]'::jsonb,
  
  -- Versionamento
  versao TEXT NOT NULL DEFAULT 'v1',
  versao_numero INTEGER NOT NULL DEFAULT 1,
  
  -- Vigência
  vigencia_inicio DATE,
  vigencia_fim DATE,
  
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para calc_rules (leitura pública para autenticados)
ALTER TABLE public.calc_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view calc rules"
ON public.calc_rules FOR SELECT
USING (ativo = true);

-- =====================================================
-- TABELA: calc_snapshots (Execuções de cálculo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calc_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.calculation_profiles(id),
  
  -- Versionamento
  versao INTEGER NOT NULL DEFAULT 1,
  engine_version TEXT NOT NULL DEFAULT '2.0.0',
  ruleset_hash TEXT, -- Hash do conjunto de regras usado
  
  -- Status
  status snapshot_status NOT NULL DEFAULT 'gerado',
  
  -- Snapshot de inputs
  inputs_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Contém: fatos validados, parâmetros do perfil, regras usadas
  
  -- Resultados consolidados
  resultado_bruto JSONB DEFAULT '{}'::jsonb,
  resultado_liquido JSONB DEFAULT '{}'::jsonb,
  total_bruto DECIMAL(15,2),
  total_liquido DECIMAL(15,2),
  total_descontos DECIMAL(15,2),
  
  -- Warnings e alertas
  warnings JSONB DEFAULT '[]'::jsonb,
  alertas_consistencia JSONB DEFAULT '[]'::jsonb,
  
  -- Auditoria
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  observacoes TEXT
);

-- RLS para calc_snapshots
ALTER TABLE public.calc_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots of their cases"
ON public.calc_snapshots FOR SELECT
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = calc_snapshots.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can create snapshots for their cases"
ON public.calc_snapshots FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM cases c WHERE c.id = calc_snapshots.case_id AND c.criado_por = auth.uid()));

CREATE POLICY "Users can update snapshots of their cases"
ON public.calc_snapshots FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = calc_snapshots.case_id AND c.criado_por = auth.uid()));

-- =====================================================
-- TABELA: calc_result_items (Itens de resultado)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calc_result_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.calc_snapshots(id) ON DELETE CASCADE,
  
  -- Rubrica
  rubrica_codigo TEXT NOT NULL,
  rubrica_nome TEXT,
  
  -- Período
  competencia TEXT, -- "2024-01" ou null para itens únicos
  periodo_inicio DATE,
  periodo_fim DATE,
  
  -- Valores de cálculo
  base_calculo DECIMAL(15,4),
  quantidade DECIMAL(15,4), -- horas, dias, meses
  percentual DECIMAL(8,4),
  fator DECIMAL(8,4),
  
  -- Resultado
  valor_bruto DECIMAL(15,2) NOT NULL,
  valor_liquido DECIMAL(15,2),
  
  -- Memória detalhada
  memoria_detalhada JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{passo, descricao, formula, valor}]
  
  -- Dependências (outras rubricas que este item usa)
  dependencias JSONB DEFAULT '[]'::jsonb,
  
  -- Ordem de exibição
  ordem INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para calc_result_items
ALTER TABLE public.calc_result_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view result items of their snapshots"
ON public.calc_result_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM calc_snapshots s 
  JOIN cases c ON c.id = s.case_id 
  WHERE s.id = calc_result_items.snapshot_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert result items to their snapshots"
ON public.calc_result_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM calc_snapshots s 
  JOIN cases c ON c.id = s.case_id 
  WHERE s.id = calc_result_items.snapshot_id AND c.criado_por = auth.uid()
));

-- =====================================================
-- TABELA: calc_lineage (Proveniência/Rastreabilidade)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.calc_lineage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES public.calc_snapshots(id) ON DELETE CASCADE,
  result_item_id UUID REFERENCES public.calc_result_items(id) ON DELETE CASCADE,
  
  -- Regra/Fórmula usada
  rule_id UUID REFERENCES public.calc_rules(id),
  rule_codigo TEXT,
  rule_versao TEXT,
  
  -- Inputs com origem
  inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Formato: [{campo, valor, tipo, fonte_documento_id, fonte_pagina, fonte_trecho, validacao_id}]
  
  -- Parâmetros do perfil usados
  parametros JSONB DEFAULT '{}'::jsonb,
  
  -- Fórmula aplicada (string legível)
  formula_aplicada TEXT,
  
  -- Output
  output_valor DECIMAL(15,4),
  output_tipo TEXT,
  
  -- Hash para reprodutibilidade
  hash_reproducao TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para calc_lineage
ALTER TABLE public.calc_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lineage of their snapshots"
ON public.calc_lineage FOR SELECT
USING (EXISTS (
  SELECT 1 FROM calc_snapshots s 
  JOIN cases c ON c.id = s.case_id 
  WHERE s.id = calc_lineage.snapshot_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert lineage to their snapshots"
ON public.calc_lineage FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM calc_snapshots s 
  JOIN cases c ON c.id = s.case_id 
  WHERE s.id = calc_lineage.snapshot_id AND c.criado_por = auth.uid()
));

-- =====================================================
-- TABELA: test_scenarios (Cenários de teste)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.test_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  
  -- Inputs do cenário
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Resultados esperados
  resultados_esperados JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Última execução
  ultima_execucao TIMESTAMPTZ,
  ultimo_resultado TEXT, -- pass, fail
  ultimo_diff JSONB,
  
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para test_scenarios
ALTER TABLE public.test_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view test scenarios"
ON public.test_scenarios FOR SELECT
USING (ativo = true);

-- =====================================================
-- Adicionar FK de validations para calc_snapshots
-- =====================================================
ALTER TABLE public.validations 
ADD CONSTRAINT validations_snapshot_fk 
FOREIGN KEY (snapshot_id) REFERENCES public.calc_snapshots(id) ON DELETE SET NULL;

-- =====================================================
-- Adicionar campos extras à tabela cases
-- =====================================================
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS tribunal TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- =====================================================
-- Adicionar campos extras à tabela documents
-- =====================================================
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS periodo_inicio DATE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS periodo_fim DATE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS competencia TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS hash_integridade TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS versao_documento INTEGER DEFAULT 1;

-- =====================================================
-- Índices para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_parties_case ON public.parties(case_id);
CREATE INDEX IF NOT EXISTS idx_contracts_case ON public.employment_contracts(case_id);
CREATE INDEX IF NOT EXISTS idx_extractions_case ON public.extractions(case_id);
CREATE INDEX IF NOT EXISTS idx_extractions_document ON public.extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_validations_case ON public.validations(case_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_case ON public.calc_snapshots(case_id);
CREATE INDEX IF NOT EXISTS idx_result_items_snapshot ON public.calc_result_items(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_lineage_snapshot ON public.calc_lineage(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_calc_rules_codigo ON public.calc_rules(codigo);
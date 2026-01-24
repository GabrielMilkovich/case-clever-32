-- =============================================
-- MODO PERICIAL: Tabelas para Cálculo Defensável
-- =============================================

-- 1) CENÁRIOS/TESES: Premissas travadas por snapshot
CREATE TABLE IF NOT EXISTS public.calc_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('conservador', 'tese_forte', 'sentenca', 'custom')),
  descricao TEXT,
  -- Premissas travadas
  prescricao_tipo TEXT CHECK (prescricao_tipo IN ('quinquenal', 'bienal', 'nenhuma', 'custom')),
  prescricao_data_limite DATE,
  divisor INTEGER NOT NULL DEFAULT 220,
  metodo_he TEXT NOT NULL DEFAULT 'diaria' CHECK (metodo_he IN ('diaria', 'semanal', 'hibrida')),
  metodo_dsr TEXT NOT NULL DEFAULT 'calendario' CHECK (metodo_dsr IN ('calendario', 'fator_fixo')),
  dsr_fator NUMERIC(4,2) DEFAULT 6,
  media_variaveis_metodo TEXT DEFAULT 'ultimos_12' CHECK (media_variaveis_metodo IN ('ultimos_12', 'todo_periodo', 'maior_remuneracao', 'custom')),
  indice_correcao TEXT DEFAULT 'IPCA-E',
  taxa_juros NUMERIC(5,2) DEFAULT 1.0,
  -- Config completa em JSON para flexibilidade
  premissas_completas JSONB DEFAULT '{}',
  hash_config TEXT,
  -- Auditoria
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) PONTOS CONTROVERTIDOS: Gestão de controvérsias
CREATE TABLE IF NOT EXISTS public.case_controversies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  campo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('incontroverso', 'controvertido', 'resolvido')),
  -- Escolha e justificativa
  valor_escolhido TEXT,
  justificativa TEXT,
  fundamentacao_legal TEXT,
  -- Evidências vinculadas
  fact_ids UUID[] DEFAULT '{}',
  document_ids UUID[] DEFAULT '{}',
  -- Impacto
  impacto_estimado NUMERIC(15,2),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  -- Auditoria
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) ANÁLISE DE RISCO: Cálculo de risco do caso
CREATE TABLE IF NOT EXISTS public.case_risk_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  -- Nível geral
  nivel_risco TEXT NOT NULL CHECK (nivel_risco IN ('baixo', 'medio', 'alto', 'critico')),
  score_risco INTEGER CHECK (score_risco >= 0 AND score_risco <= 100),
  -- Fatores de risco individuais
  fatores JSONB NOT NULL DEFAULT '[]',
  -- Resumo
  resumo TEXT,
  recomendacoes TEXT[],
  -- Versão/snapshot
  snapshot_id UUID REFERENCES public.calc_snapshots(id),
  -- Auditoria
  analisado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  analisado_por UUID REFERENCES auth.users(id)
);

-- 4) VALIDAÇÃO PERICIAL: Status estendido para fatos
ALTER TABLE public.facts 
  ADD COLUMN IF NOT EXISTS status_pericial TEXT CHECK (status_pericial IN ('incontroverso', 'controvertido', 'pendente')) DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS justificativa_validacao TEXT,
  ADD COLUMN IF NOT EXISTS prova_qualidade TEXT CHECK (prova_qualidade IN ('forte', 'media', 'fraca', 'ausente')) DEFAULT 'media';

-- 5) REQUISITOS DE PROVA por Rubrica
CREATE TABLE IF NOT EXISTS public.rubrica_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica_codigo TEXT NOT NULL UNIQUE,
  rubrica_nome TEXT NOT NULL,
  -- Requisitos de prova
  documentos_requeridos TEXT[] NOT NULL DEFAULT '{}',
  fatos_requeridos TEXT[] NOT NULL DEFAULT '{}',
  descricao_requisito TEXT,
  -- Alertas
  alerta_sem_prova TEXT,
  nivel_exigencia TEXT DEFAULT 'obrigatorio' CHECK (nivel_exigencia IN ('obrigatorio', 'recomendado', 'opcional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) CALENDÁRIO VERSIONADO
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  municipio TEXT,
  ano INTEGER NOT NULL,
  feriados JSONB NOT NULL DEFAULT '[]',
  hash_versao TEXT NOT NULL,
  fonte TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) SNAPSHOT: Adicionar campos periciais
ALTER TABLE public.calc_snapshots
  ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES public.calc_scenarios(id),
  ADD COLUMN IF NOT EXISTS periodo_inicio DATE,
  ADD COLUMN IF NOT EXISTS periodo_fim DATE,
  ADD COLUMN IF NOT EXISTS prescricao_aplicada DATE,
  ADD COLUMN IF NOT EXISTS calendario_hash TEXT,
  ADD COLUMN IF NOT EXISTS qualidade_score INTEGER CHECK (qualidade_score >= 0 AND qualidade_score <= 100),
  ADD COLUMN IF NOT EXISTS pendencias JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS diff_anterior JSONB;

-- 8) DOCUMENTOS: Campos adicionais para validação
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS periodo_referencia_inicio DATE,
  ADD COLUMN IF NOT EXISTS periodo_referencia_fim DATE,
  ADD COLUMN IF NOT EXISTS ocr_confianca NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS validado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES auth.users(id);

-- Seed: Requisitos de prova para rubricas principais
INSERT INTO public.rubrica_requirements (rubrica_codigo, rubrica_nome, documentos_requeridos, fatos_requeridos, alerta_sem_prova, nivel_exigencia) VALUES
  ('HE50', 'Horas Extras 50%', ARRAY['cartao_ponto', 'holerite'], ARRAY['jornada_contratual', 'salario_base'], 'Cálculo de HE sem cartão de ponto ou holerite pode ser impugnado', 'obrigatorio'),
  ('HE100', 'Horas Extras 100%', ARRAY['cartao_ponto', 'holerite'], ARRAY['jornada_contratual', 'salario_base'], 'Cálculo de HE sem cartão de ponto ou holerite pode ser impugnado', 'obrigatorio'),
  ('DSR_HE', 'DSR sobre Horas Extras', ARRAY['cartao_ponto'], ARRAY['jornada_contratual'], 'DSR depende de prova de jornada extraordinária', 'obrigatorio'),
  ('ADIC_NOT', 'Adicional Noturno', ARRAY['cartao_ponto'], ARRAY['jornada_contratual'], 'Adicional noturno requer prova de trabalho noturno', 'obrigatorio'),
  ('FGTS', 'FGTS', ARRAY['holerite', 'trct'], ARRAY['salario_mensal'], 'FGTS pode ser calculado com base em salário presumido', 'recomendado'),
  ('SALDO_SAL', 'Saldo de Salário', ARRAY['trct'], ARRAY['data_demissao', 'salario_mensal'], 'Saldo requer data exata de demissão', 'obrigatorio'),
  ('AVISO_PREVIO', 'Aviso Prévio', ARRAY['trct'], ARRAY['data_admissao', 'data_demissao'], 'Aviso prévio requer tempo de serviço comprovado', 'obrigatorio'),
  ('FERIAS_PROP', 'Férias Proporcionais', ARRAY['trct', 'holerite'], ARRAY['data_admissao', 'data_demissao', 'salario_mensal'], 'Férias proporcionais dependem de período aquisitivo', 'obrigatorio'),
  ('DECIMO_PROP', '13º Proporcional', ARRAY['trct', 'holerite'], ARRAY['data_demissao', 'salario_mensal'], '13º proporcional depende de meses trabalhados no ano', 'obrigatorio'),
  ('MULTA_FGTS', 'Multa 40% FGTS', ARRAY['trct'], ARRAY['tipo_demissao'], 'Multa depende de tipo de demissão e saldo de FGTS', 'obrigatorio')
ON CONFLICT (rubrica_codigo) DO NOTHING;

-- Seed: Calendário 2024/2025 para MG
INSERT INTO public.calendars (nome, uf, municipio, ano, feriados, hash_versao, fonte) VALUES
  ('Calendário MG 2024', 'MG', NULL, 2024, '[
    {"data": "2024-01-01", "nome": "Confraternização Universal"},
    {"data": "2024-02-12", "nome": "Carnaval"},
    {"data": "2024-02-13", "nome": "Carnaval"},
    {"data": "2024-03-29", "nome": "Sexta-feira Santa"},
    {"data": "2024-04-21", "nome": "Tiradentes"},
    {"data": "2024-05-01", "nome": "Dia do Trabalho"},
    {"data": "2024-05-30", "nome": "Corpus Christi"},
    {"data": "2024-09-07", "nome": "Independência"},
    {"data": "2024-10-12", "nome": "Nossa Senhora Aparecida"},
    {"data": "2024-11-02", "nome": "Finados"},
    {"data": "2024-11-15", "nome": "Proclamação da República"},
    {"data": "2024-12-25", "nome": "Natal"}
  ]'::jsonb, 'mg_2024_v1', 'TST'),
  ('Calendário MG 2025', 'MG', NULL, 2025, '[
    {"data": "2025-01-01", "nome": "Confraternização Universal"},
    {"data": "2025-03-03", "nome": "Carnaval"},
    {"data": "2025-03-04", "nome": "Carnaval"},
    {"data": "2025-04-18", "nome": "Sexta-feira Santa"},
    {"data": "2025-04-21", "nome": "Tiradentes"},
    {"data": "2025-05-01", "nome": "Dia do Trabalho"},
    {"data": "2025-06-19", "nome": "Corpus Christi"},
    {"data": "2025-09-07", "nome": "Independência"},
    {"data": "2025-10-12", "nome": "Nossa Senhora Aparecida"},
    {"data": "2025-11-02", "nome": "Finados"},
    {"data": "2025-11-15", "nome": "Proclamação da República"},
    {"data": "2025-12-25", "nome": "Natal"}
  ]'::jsonb, 'mg_2025_v1', 'TST')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.calc_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_controversies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_risk_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrica_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para usuários autenticados
CREATE POLICY "Authenticated users can manage scenarios" ON public.calc_scenarios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage controversies" ON public.case_controversies FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view risk analysis" ON public.case_risk_analysis FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can view rubrica requirements" ON public.rubrica_requirements FOR SELECT USING (true);
CREATE POLICY "Anyone can view calendars" ON public.calendars FOR SELECT USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calc_scenarios_case_id ON public.calc_scenarios(case_id);
CREATE INDEX IF NOT EXISTS idx_case_controversies_case_id ON public.case_controversies(case_id);
CREATE INDEX IF NOT EXISTS idx_case_risk_analysis_case_id ON public.case_risk_analysis(case_id);
CREATE INDEX IF NOT EXISTS idx_calendars_uf_ano ON public.calendars(uf, ano);
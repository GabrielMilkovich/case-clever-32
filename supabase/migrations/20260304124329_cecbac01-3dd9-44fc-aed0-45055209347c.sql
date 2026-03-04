
-- =====================================================
-- CORE MODEL PJe-Calc v2 — Baseado no .PJC real
-- Substitui tabelas de modelagem, mantém referências
-- =====================================================

-- 1) DROP das tabelas de modelagem antigas (ordem: dependentes primeiro)
DROP TABLE IF EXISTS pjecalc_verba_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_fgts_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_cs_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_historico_ocorrencias CASCADE;
DROP TABLE IF EXISTS pjecalc_liquidacao_resultado CASCADE;
DROP TABLE IF EXISTS pjecalc_metricas CASCADE;
DROP TABLE IF EXISTS pjecalc_observacoes CASCADE;
DROP TABLE IF EXISTS pjecalc_vale_transporte CASCADE;
DROP TABLE IF EXISTS pjecalc_verbas_padrao CASCADE;
DROP TABLE IF EXISTS pjecalc_verbas CASCADE;
DROP TABLE IF EXISTS pjecalc_ponto_diario CASCADE;
DROP TABLE IF EXISTS pjecalc_cartao_ponto_colunas CASCADE;
DROP TABLE IF EXISTS pjecalc_cartao_ponto CASCADE;
DROP TABLE IF EXISTS pjecalc_ferias CASCADE;
DROP TABLE IF EXISTS pjecalc_faltas CASCADE;
DROP TABLE IF EXISTS pjecalc_historico_salarial CASCADE;
DROP TABLE IF EXISTS pjecalc_parametros_extras CASCADE;
DROP TABLE IF EXISTS pjecalc_parametros CASCADE;
DROP TABLE IF EXISTS pjecalc_correcao_config CASCADE;
DROP TABLE IF EXISTS pjecalc_fgts_config CASCADE;
DROP TABLE IF EXISTS pjecalc_cs_config CASCADE;
DROP TABLE IF EXISTS pjecalc_ir_config CASCADE;
DROP TABLE IF EXISTS pjecalc_ir_faixas CASCADE;
DROP TABLE IF EXISTS pjecalc_multas_config CASCADE;
DROP TABLE IF EXISTS pjecalc_custas_config CASCADE;
DROP TABLE IF EXISTS pjecalc_custas CASCADE;
DROP TABLE IF EXISTS pjecalc_custas_judiciais CASCADE;
DROP TABLE IF EXISTS pjecalc_honorarios CASCADE;
DROP TABLE IF EXISTS pjecalc_pensao_config CASCADE;
DROP TABLE IF EXISTS pjecalc_previdencia_privada_config CASCADE;
DROP TABLE IF EXISTS pjecalc_seguro_config CASCADE;
DROP TABLE IF EXISTS pjecalc_salario_familia_config CASCADE;
DROP TABLE IF EXISTS pjecalc_dados_processo CASCADE;

-- =====================================================
-- 2) TABELA CENTRAL: pjecalc_calculos
-- =====================================================
CREATE TABLE pjecalc_calculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  processo_cnj TEXT,
  vara TEXT,
  tribunal TEXT,
  reclamante_nome TEXT,
  reclamante_cpf TEXT,
  reclamado_nome TEXT,
  reclamado_cnpj TEXT,
  data_admissao DATE,
  data_demissao DATE,
  data_ajuizamento DATE,
  data_inicio_calculo DATE,
  data_fim_calculo DATE,
  data_liquidacao DATE,
  tipo_demissao TEXT DEFAULT 'sem_justa_causa',
  aviso_previo_tipo TEXT DEFAULT 'indenizado',
  aviso_previo_dias INTEGER DEFAULT 30,
  jornada_contratual_horas NUMERIC(5,2) DEFAULT 44,
  divisor_horas NUMERIC(7,2) DEFAULT 220,
  percentual_he_50 NUMERIC(5,2) DEFAULT 50,
  percentual_he_100 NUMERIC(5,2) DEFAULT 100,
  percentual_adicional_noturno NUMERIC(5,2) DEFAULT 20,
  honorarios_percentual NUMERIC(5,2) DEFAULT 15,
  honorarios_sobre TEXT DEFAULT 'liquido',
  custas_percentual NUMERIC(5,2) DEFAULT 2,
  custas_limite NUMERIC(12,2),
  multa_477_habilitada BOOLEAN DEFAULT false,
  multa_467_habilitada BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'rascunho',
  versao INTEGER DEFAULT 1,
  hash_estado TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calculos_case ON pjecalc_calculos(case_id);
CREATE INDEX idx_calculos_user ON pjecalc_calculos(user_id);

-- =====================================================
-- 3) EVENTOS POR INTERVALO
-- =====================================================
CREATE TABLE pjecalc_evento_intervalo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ferias_aquisitivo_inicio DATE,
  ferias_aquisitivo_fim DATE,
  ferias_concessivo_inicio DATE,
  ferias_concessivo_fim DATE,
  ferias_dias INTEGER DEFAULT 30,
  ferias_abono BOOLEAN DEFAULT false,
  ferias_dias_abono INTEGER DEFAULT 0,
  ferias_dobra BOOLEAN DEFAULT false,
  ferias_situacao TEXT DEFAULT 'GOZADAS',
  ferias_gozo2_inicio DATE,
  ferias_gozo2_fim DATE,
  ferias_gozo3_inicio DATE,
  ferias_gozo3_fim DATE,
  motivo TEXT,
  justificado BOOLEAN DEFAULT false,
  observacoes TEXT,
  documento_id UUID,
  pagina INTEGER,
  confianca NUMERIC(3,2),
  status_revisao TEXT DEFAULT 'AUTO',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evento_calculo ON pjecalc_evento_intervalo(calculo_id);

-- =====================================================
-- 4) APURAÇÃO DIÁRIA
-- =====================================================
CREATE TABLE pjecalc_apuracao_diaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  frequencia_str TEXT,
  minutos_trabalhados INTEGER DEFAULT 0,
  minutos_extra_diaria INTEGER DEFAULT 0,
  minutos_extra_semanal INTEGER DEFAULT 0,
  minutos_extra_repouso INTEGER DEFAULT 0,
  minutos_extra_feriado INTEGER DEFAULT 0,
  minutos_noturno INTEGER DEFAULT 0,
  minutos_intrajornada INTEGER DEFAULT 0,
  minutos_interjornada INTEGER DEFAULT 0,
  minutos_art384 INTEGER DEFAULT 0,
  minutos_art253 INTEGER DEFAULT 0,
  horas_trabalhadas NUMERIC(8,4) DEFAULT 0,
  horas_extras_diaria NUMERIC(8,4) DEFAULT 0,
  horas_extras_semanal NUMERIC(8,4) DEFAULT 0,
  horas_noturnas NUMERIC(8,4) DEFAULT 0,
  is_dsr BOOLEAN DEFAULT false,
  is_feriado BOOLEAN DEFAULT false,
  is_falta BOOLEAN DEFAULT false,
  is_ferias BOOLEAN DEFAULT false,
  is_afastamento BOOLEAN DEFAULT false,
  is_compensado BOOLEAN DEFAULT false,
  feriado_nome TEXT,
  origem TEXT DEFAULT 'CALCULADA',
  documento_id UUID,
  pagina INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calculo_id, data)
);

CREATE INDEX idx_apuracao_calculo ON pjecalc_apuracao_diaria(calculo_id);

-- =====================================================
-- 5) HISTÓRICO SALARIAL
-- =====================================================
CREATE TABLE pjecalc_hist_salarial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_variacao TEXT DEFAULT 'VARIAVEL',
  incide_inss BOOLEAN DEFAULT true,
  incide_fgts BOOLEAN DEFAULT true,
  incide_ir BOOLEAN DEFAULT true,
  valor_fixo NUMERIC(12,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calculo_id, nome)
);

CREATE TABLE pjecalc_hist_salarial_mes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  hist_salarial_id UUID NOT NULL REFERENCES pjecalc_hist_salarial(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  origem TEXT DEFAULT 'IMPORTADA',
  documento_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hist_salarial_id, competencia)
);

CREATE INDEX idx_hist_mes_calculo ON pjecalc_hist_salarial_mes(calculo_id);

-- =====================================================
-- 6) RUBRICAS RAW + MAPEAMENTO
-- =====================================================
CREATE TABLE pjecalc_rubrica_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  codigo TEXT,
  descricao TEXT NOT NULL,
  classificacao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  tipo_documento TEXT,
  documento_id UUID,
  pagina INTEGER,
  confianca NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rubrica_raw_calc ON pjecalc_rubrica_raw(calculo_id);

CREATE TABLE pjecalc_rubrica_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_match TEXT,
  descricao_regex TEXT,
  empresa_cnpj TEXT,
  conceito TEXT NOT NULL,
  categoria TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  prioridade INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO pjecalc_rubrica_map (codigo_match, descricao_regex, conceito, categoria, prioridade) VALUES
  ('0620', '(?i)comiss', 'COMISSOES_PAGAS', 'comissao', 10),
  ('1307', '(?i)comiss', 'COMISSOES_PAGAS', 'comissao', 9),
  ('0501', '(?i)dsr.*comiss', 'DSR_COMISSAO', 'dsr', 10),
  ('0502', '(?i)dsr.*h.*extra', 'DSR_HORA_EXTRA', 'dsr', 10),
  ('2377', '(?i)pr[eê]mio', 'PREMIOS_PAGOS', 'premio', 10),
  ('2477', '(?i)pr[eê]mio', 'PREMIOS_PAGOS', 'premio', 9),
  ('2481', '(?i)antecipa.*pr[eê]mio', 'PREMIOS_PAGOS', 'premio', 9),
  ('3290', '(?i)pr[eê]mio', 'PREMIOS_PAGOS', 'premio', 8),
  ('1800', '(?i)adic.*noturn', 'ADICIONAL_NOTURNO', 'adicional_noturno', 10),
  ('4001', '(?i)hora.*extra', 'HORAS_EXTRAS', 'hora_extra', 10),
  (NULL, '(?i)sal[aá]rio.*base', 'SALARIO_BASE', 'salario_base', 5),
  (NULL, '(?i)sal[aá]rio.*fixo', 'SALARIO_BASE', 'salario_base', 5),
  (NULL, '(?i)m[ií]nimo.*garant', 'MINIMO_GARANTIDO', 'salario_base', 5),
  (NULL, '(?i)vendas?.*(?:vf|prazo)', 'VENDAS_VF', 'comissao', 5);

-- =====================================================
-- 7) VERBAS BASE (Calculada no PJC)
-- =====================================================
CREATE TABLE pjecalc_verba_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  fonte TEXT DEFAULT 'historico_mensal',
  hist_salarial_nome TEXT,
  tipo_variacao TEXT DEFAULT 'VARIAVEL',
  incide_inss BOOLEAN DEFAULT true,
  incide_fgts BOOLEAN DEFAULT true,
  incide_ir BOOLEAN DEFAULT true,
  periodicidade TEXT DEFAULT 'MENSAL',
  periodo_inicio DATE,
  periodo_fim DATE,
  multiplicador NUMERIC(10,4) DEFAULT 1,
  divisor NUMERIC(10,4) DEFAULT 1,
  caracteristica TEXT DEFAULT 'COMUM',
  ordem INTEGER DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verba_base_calc ON pjecalc_verba_base(calculo_id);

-- =====================================================
-- 8) REFLEXOS
-- =====================================================
CREATE TABLE pjecalc_reflexo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  tipo TEXT NOT NULL,
  comportamento_reflexo TEXT,
  periodo_media_reflexo TEXT,
  tratamento_fracao_mes TEXT,
  media_tipo TEXT DEFAULT 'PERIODO_CALCULO',
  media_meses INTEGER,
  incide_inss BOOLEAN DEFAULT false,
  incide_fgts BOOLEAN DEFAULT false,
  incide_ir BOOLEAN DEFAULT false,
  periodo_inicio DATE,
  periodo_fim DATE,
  ordem INTEGER DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  gerar_principal BOOLEAN DEFAULT false,
  gerar_reflexo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reflexo_calc ON pjecalc_reflexo(calculo_id);

CREATE TABLE pjecalc_reflexo_base_verba (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflexo_id UUID NOT NULL REFERENCES pjecalc_reflexo(id) ON DELETE CASCADE,
  verba_base_id UUID NOT NULL REFERENCES pjecalc_verba_base(id) ON DELETE CASCADE,
  integralizar BOOLEAN DEFAULT false,
  UNIQUE(reflexo_id, verba_base_id)
);

-- =====================================================
-- 9) ATUALIZAÇÃO CONFIG
-- =====================================================
CREATE TABLE pjecalc_atualizacao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  regimes JSONB NOT NULL DEFAULT '[]',
  regime_padrao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calculo_id, tipo)
);

-- =====================================================
-- 10) OCORRÊNCIAS DE CÁLCULO
-- =====================================================
CREATE TABLE pjecalc_ocorrencia_calculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  verba_base_id UUID REFERENCES pjecalc_verba_base(id) ON DELETE CASCADE,
  reflexo_id UUID REFERENCES pjecalc_reflexo(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  competencia DATE NOT NULL,
  base_valor NUMERIC(14,2) DEFAULT 0,
  multiplicador NUMERIC(10,4) DEFAULT 1,
  divisor NUMERIC(10,4) DEFAULT 1,
  quantidade NUMERIC(10,4) DEFAULT 1,
  dobra NUMERIC(4,2) DEFAULT 1,
  devido NUMERIC(14,2) DEFAULT 0,
  pago NUMERIC(14,2) DEFAULT 0,
  diferenca NUMERIC(14,2) DEFAULT 0,
  correcao NUMERIC(14,2) DEFAULT 0,
  juros NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  fator_correcao NUMERIC(12,8) DEFAULT 1,
  taxa_juros NUMERIC(8,4) DEFAULT 0,
  indice_usado TEXT,
  juros_regime_usado TEXT,
  origem TEXT DEFAULT 'CALCULADA',
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ocorr_calc ON pjecalc_ocorrencia_calculo(calculo_id);
CREATE INDEX idx_ocorr_comp ON pjecalc_ocorrencia_calculo(calculo_id, competencia);

-- =====================================================
-- 11) RESULTADO DA LIQUIDAÇÃO
-- =====================================================
CREATE TABLE pjecalc_resultado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL REFERENCES pjecalc_calculos(id) ON DELETE CASCADE,
  total_bruto NUMERIC(14,2) DEFAULT 0,
  total_pago NUMERIC(14,2) DEFAULT 0,
  total_diferenca NUMERIC(14,2) DEFAULT 0,
  total_correcao NUMERIC(14,2) DEFAULT 0,
  total_juros NUMERIC(14,2) DEFAULT 0,
  total_liquido_antes_descontos NUMERIC(14,2) DEFAULT 0,
  desconto_inss_reclamante NUMERIC(14,2) DEFAULT 0,
  desconto_ir NUMERIC(14,2) DEFAULT 0,
  desconto_inss_reclamado NUMERIC(14,2) DEFAULT 0,
  honorarios NUMERIC(14,2) DEFAULT 0,
  custas NUMERIC(14,2) DEFAULT 0,
  multa_477 NUMERIC(14,2) DEFAULT 0,
  multa_467 NUMERIC(14,2) DEFAULT 0,
  fgts_depositar NUMERIC(14,2) DEFAULT 0,
  fgts_multa_40 NUMERIC(14,2) DEFAULT 0,
  total_reclamante NUMERIC(14,2) DEFAULT 0,
  total_reclamado NUMERIC(14,2) DEFAULT 0,
  engine_version TEXT DEFAULT '2.0.0',
  calculado_em TIMESTAMPTZ DEFAULT now(),
  hash_resultado TEXT,
  resumo_verbas JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calculo_id)
);

-- =====================================================
-- 12) RLS POLICIES
-- =====================================================
ALTER TABLE pjecalc_calculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_evento_intervalo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_apuracao_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_hist_salarial ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_hist_salarial_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_rubrica_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_rubrica_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_verba_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_reflexo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_reflexo_base_verba ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_atualizacao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_ocorrencia_calculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pjecalc_resultado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calculos" ON pjecalc_calculos
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own eventos" ON pjecalc_evento_intervalo
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own apuracao" ON pjecalc_apuracao_diaria
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own hist_salarial" ON pjecalc_hist_salarial
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own hist_salarial_mes" ON pjecalc_hist_salarial_mes
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own rubrica_raw" ON pjecalc_rubrica_raw
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read rubrica_map" ON pjecalc_rubrica_map
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own verba_base" ON pjecalc_verba_base
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own reflexo" ON pjecalc_reflexo
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own reflexo_base" ON pjecalc_reflexo_base_verba
  FOR ALL TO authenticated USING (reflexo_id IN (
    SELECT r.id FROM pjecalc_reflexo r JOIN pjecalc_calculos c ON r.calculo_id = c.id WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users manage own atualizacao" ON pjecalc_atualizacao_config
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own ocorrencias" ON pjecalc_ocorrencia_calculo
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own resultado" ON pjecalc_resultado
  FOR ALL TO authenticated USING (calculo_id IN (SELECT id FROM pjecalc_calculos WHERE user_id = auth.uid()));


-- =====================================================
-- VIEWS DE COMPATIBILIDADE
-- Permite que código existente continue funcionando
-- enquanto a migração gradual para as novas tabelas acontece
-- =====================================================

-- 1) pjecalc_parametros → view sobre pjecalc_calculos
CREATE OR REPLACE VIEW pjecalc_parametros AS
SELECT
  c.id,
  c.case_id,
  c.data_admissao::text as data_admissao,
  c.data_demissao::text as data_demissao,
  c.data_ajuizamento::text as data_ajuizamento,
  c.data_inicio_calculo::text as data_inicial,
  c.data_fim_calculo::text as data_final,
  c.tribunal as estado,
  c.vara as municipio,
  false as prescricao_quinquenal,
  false as prescricao_fgts,
  'tempo_integral' as regime_trabalho,
  c.divisor_horas as carga_horaria_padrao,
  NULL::numeric as maior_remuneracao,
  NULL::numeric as ultima_remuneracao,
  c.aviso_previo_tipo as prazo_aviso_previo,
  c.aviso_previo_dias::text as prazo_aviso_dias,
  false as projetar_aviso_indenizado,
  false as limitar_avos_periodo,
  false as zerar_valor_negativo,
  true as sabado_dia_util,
  false as considerar_feriado_estadual,
  false as considerar_feriado_municipal,
  c.observacoes as comentarios,
  c.created_at,
  c.updated_at
FROM pjecalc_calculos c;

-- 2) pjecalc_dados_processo → view sobre pjecalc_calculos
CREATE OR REPLACE VIEW pjecalc_dados_processo AS
SELECT
  c.id,
  c.case_id,
  c.processo_cnj as numero_processo,
  c.reclamante_nome,
  c.reclamante_cpf,
  c.reclamado_nome as reclamada_nome,
  c.reclamado_cnpj as reclamada_cnpj,
  c.vara,
  NULL::text as comarca,
  NULL::text as objeto,
  c.created_at,
  c.updated_at
FROM pjecalc_calculos c;

-- 3) pjecalc_faltas → view sobre pjecalc_evento_intervalo (tipo != FERIAS)
CREATE OR REPLACE VIEW pjecalc_faltas AS
SELECT
  e.id,
  c.case_id,
  e.calculo_id,
  e.data_inicio::text as data_inicial,
  e.data_fim::text as data_final,
  e.tipo as tipo_falta,
  e.justificado as justificada,
  e.motivo,
  e.observacoes,
  e.created_at
FROM pjecalc_evento_intervalo e
JOIN pjecalc_calculos c ON e.calculo_id = c.id
WHERE e.tipo != 'FERIAS';

-- 4) pjecalc_ferias → view sobre pjecalc_evento_intervalo (tipo = FERIAS)
CREATE OR REPLACE VIEW pjecalc_ferias AS
SELECT
  e.id,
  c.case_id,
  e.calculo_id,
  e.ferias_aquisitivo_inicio::text as periodo_aquisitivo_inicio,
  e.ferias_aquisitivo_fim::text as periodo_aquisitivo_fim,
  e.ferias_concessivo_inicio::text as periodo_concessivo_inicio,
  e.ferias_concessivo_fim::text as periodo_concessivo_fim,
  e.data_inicio::text as gozo_inicio,
  e.data_fim::text as gozo_fim,
  e.ferias_dias as dias,
  e.ferias_abono as abono,
  e.ferias_dias_abono as dias_abono,
  e.ferias_dobra as dobra,
  e.ferias_situacao as situacao,
  e.ferias_gozo2_inicio::text as gozo2_inicio,
  e.ferias_gozo2_fim::text as gozo2_fim,
  e.ferias_gozo3_inicio::text as gozo3_inicio,
  e.ferias_gozo3_fim::text as gozo3_fim,
  e.observacoes,
  e.created_at
FROM pjecalc_evento_intervalo e
JOIN pjecalc_calculos c ON e.calculo_id = c.id
WHERE e.tipo = 'FERIAS';

-- 5) pjecalc_historico_salarial → view sobre pjecalc_hist_salarial
CREATE OR REPLACE VIEW pjecalc_historico_salarial AS
SELECT
  h.id,
  c.case_id,
  h.calculo_id,
  h.nome,
  h.tipo_variacao as tipo_valor,
  h.valor_fixo as valor_informado,
  NULL::text as periodo_inicio,
  NULL::text as periodo_fim,
  h.incide_fgts as incidencia_fgts,
  h.incide_inss as incidencia_cs,
  h.observacoes,
  h.created_at
FROM pjecalc_hist_salarial h
JOIN pjecalc_calculos c ON h.calculo_id = c.id;

-- 6) pjecalc_verbas → view sobre pjecalc_verba_base
CREATE OR REPLACE VIEW pjecalc_verbas AS
SELECT
  v.id,
  c.case_id,
  v.calculo_id,
  v.nome,
  v.codigo,
  v.caracteristica,
  v.periodicidade as ocorrencia_pagamento,
  CASE WHEN EXISTS(SELECT 1 FROM pjecalc_reflexo_base_verba rbv WHERE rbv.verba_base_id = v.id) THEN 'reflexa' ELSE 'principal' END as tipo,
  v.multiplicador,
  v.divisor as divisor_informado,
  v.periodo_inicio::text,
  v.periodo_fim::text,
  v.ordem,
  v.ativa,
  v.incide_inss,
  v.incide_fgts,
  v.incide_ir,
  NULL::uuid as verba_principal_id,
  '{}'::jsonb as base_calculo,
  '{}'::jsonb as incidencias,
  v.observacoes,
  v.created_at,
  v.updated_at
FROM pjecalc_verba_base v
JOIN pjecalc_calculos c ON v.calculo_id = c.id;

-- 7) pjecalc_liquidacao_resultado → view sobre pjecalc_resultado
CREATE OR REPLACE VIEW pjecalc_liquidacao_resultado AS
SELECT
  r.id,
  c.case_id,
  r.calculo_id,
  r.total_bruto,
  r.total_liquido_antes_descontos as total_liquido,
  r.desconto_inss_reclamante as inss_segurado,
  r.desconto_ir as irrf,
  r.desconto_inss_reclamado as inss_patronal,
  r.honorarios,
  r.custas,
  r.fgts_depositar,
  r.fgts_multa_40,
  r.total_reclamante,
  r.total_reclamado,
  r.resumo_verbas as resultado,
  r.engine_version,
  r.calculado_em,
  r.created_at
FROM pjecalc_resultado r
JOIN pjecalc_calculos c ON r.calculo_id = c.id;

-- 8) pjecalc_ocorrencias → view sobre pjecalc_ocorrencia_calculo
CREATE OR REPLACE VIEW pjecalc_ocorrencias AS
SELECT
  o.id,
  c.case_id,
  o.calculo_id,
  o.verba_base_id as verba_id,
  o.nome as verba_nome,
  o.competencia::text,
  o.base_valor,
  o.multiplicador as multiplicador_valor,
  o.divisor as divisor_valor,
  o.quantidade as quantidade_valor,
  o.dobra,
  o.devido,
  o.pago,
  o.diferenca,
  o.correcao,
  o.juros,
  o.total,
  o.origem,
  o.ativa,
  o.created_at,
  o.updated_at
FROM pjecalc_ocorrencia_calculo o
JOIN pjecalc_calculos c ON o.calculo_id = c.id;

-- 9) Config views (empty stubs for sub-components that query them)
CREATE OR REPLACE VIEW pjecalc_fgts_config AS
SELECT
  c.id,
  c.case_id,
  true as habilitado,
  8.0::numeric as percentual_deposito,
  40.0::numeric as percentual_multa,
  c.created_at
FROM pjecalc_calculos c;

CREATE OR REPLACE VIEW pjecalc_cs_config AS
SELECT
  c.id,
  c.case_id,
  true as habilitado,
  'progressiva'::text as regime,
  c.created_at
FROM pjecalc_calculos c;

CREATE OR REPLACE VIEW pjecalc_ir_config AS
SELECT
  c.id,
  c.case_id,
  true as habilitado,
  'rra'::text as metodo,
  0::integer as dependentes,
  c.created_at
FROM pjecalc_calculos c;

CREATE OR REPLACE VIEW pjecalc_correcao_config AS
SELECT
  c.id,
  c.case_id,
  ac.regimes as config,
  ac.regime_padrao as indice_correcao,
  c.created_at
FROM pjecalc_calculos c
LEFT JOIN pjecalc_atualizacao_config ac ON ac.calculo_id = c.id AND ac.tipo = 'correcao';

CREATE OR REPLACE VIEW pjecalc_honorarios AS
SELECT
  c.id,
  c.case_id,
  c.honorarios_percentual as percentual,
  c.honorarios_sobre as sobre,
  c.created_at
FROM pjecalc_calculos c;

CREATE OR REPLACE VIEW pjecalc_multas_config AS
SELECT
  c.id,
  c.case_id,
  c.multa_477_habilitada as multa_477,
  c.multa_467_habilitada as multa_467,
  c.created_at
FROM pjecalc_calculos c;

-- 10) Cartão de ponto view (monthly aggregate from daily)
CREATE OR REPLACE VIEW pjecalc_cartao_ponto AS
SELECT
  gen_random_uuid() as id,
  c.case_id,
  a.calculo_id,
  to_char(a.data, 'YYYY-MM') as competencia,
  SUM(a.horas_trabalhadas) as horas_trabalhadas,
  SUM(a.horas_extras_diaria) as horas_extras_50,
  0::numeric as horas_extras_100,
  SUM(a.horas_noturnas) as horas_noturnas,
  0::numeric as horas_intrajornada,
  0::numeric as horas_interjornada,
  COUNT(*) FILTER (WHERE a.is_dsr) as dias_dsr,
  COUNT(*) FILTER (WHERE a.is_feriado) as dias_feriado,
  COUNT(*) FILTER (WHERE a.is_falta) as dias_falta,
  MIN(a.created_at) as created_at
FROM pjecalc_apuracao_diaria a
JOIN pjecalc_calculos c ON a.calculo_id = c.id
GROUP BY c.case_id, a.calculo_id, to_char(a.data, 'YYYY-MM');

-- 11) FGTS/CS ocorrencias views
CREATE OR REPLACE VIEW pjecalc_fgts_ocorrencias AS
SELECT * FROM pjecalc_ocorrencias WHERE 1=0;

CREATE OR REPLACE VIEW pjecalc_cs_ocorrencias AS
SELECT * FROM pjecalc_ocorrencias WHERE 1=0;

-- 12) pjecalc_verba_ocorrencias compatibility
CREATE OR REPLACE VIEW pjecalc_verba_ocorrencias AS
SELECT * FROM pjecalc_ocorrencias;

-- 13) Custas config view
CREATE OR REPLACE VIEW pjecalc_custas_config AS
SELECT
  c.id,
  c.case_id,
  c.custas_percentual as percentual,
  c.custas_limite as limite,
  c.created_at
FROM pjecalc_calculos c;

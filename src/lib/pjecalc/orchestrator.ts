/**
 * =====================================================
 * PJeCalc ORCHESTRATOR — EXECUÇÃO CANÔNICA DO MOTOR
 * =====================================================
 * 
 * Este é o ÚNICO ponto de entrada para executar cálculos.
 * Nenhuma página, componente ou hook deve instanciar PjeCalcEngine diretamente.
 * 
 * Responsabilidades:
 * 1. Carregar todos os dados do caso via PjeCalcService
 * 2. Converter dados das views para formato do engine
 * 3. Executar o PjeCalcEngine
 * 4. Gerar fingerprint de execução (EngineExecutionFingerprint)
 * 5. Persistir resultado + ocorrências via service
 * 6. Retornar resultado tipado
 */

import { supabase } from "@/integrations/supabase/client";
import {
  PjeCalcEngine,
  type PjeParametros,
  type PjeHistoricoSalarial,
  type PjeFalta,
  type PjeFerias,
  type PjeVerba,
  type PjeCartaoPonto,
  type PjeFGTSConfig,
  type PjeCSConfig,
  type PjeIRConfig,
  type PjeCorrecaoConfig,
  type PjeHonorariosConfig,
  type PjeCustasConfig,
  type PjeSeguroConfig,
  type PjeLiquidacaoResult,
} from './engine';
import * as svc from './service';
import type {
  EngineExecutionFingerprint,
  PjecalcParametrosRow,
  PjecalcVerbaRow,
  PjecalcHistoricoSalarialRow,
  PjecalcFaltaRow,
  PjecalcFeriasRow,
  PjecalcCartaoPontoRow,
  PjecalcFgtsConfigRow,
  PjecalcCsConfigRow,
  PjecalcIrConfigRow,
  PjecalcCorrecaoConfigRow,
  PjecalcHonorariosRow,
  PjecalcCustasConfigRow,
} from './types';

// =====================================================
// VERSION CONSTANTS
// =====================================================

const ENGINE_VERSION = '3.0.0';
const RULESET_VERSION = '2025.03.05';

// =====================================================
// HASH UTILITY
// =====================================================

function simpleHash(obj: unknown): string {
  const str = JSON.stringify(obj, Object.keys(obj as object).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// =====================================================
// DATA CONVERTERS: View → Engine
// =====================================================

function toEngineParams(p: PjecalcParametrosRow): PjeParametros {
  return {
    case_id: p.case_id,
    data_admissao: p.data_admissao || '',
    data_demissao: p.data_demissao || undefined,
    data_ajuizamento: p.data_ajuizamento || '',
    data_inicial: p.data_inicial || undefined,
    data_final: p.data_final || undefined,
    estado: p.estado || 'SP',
    municipio: p.municipio || '',
    regime_trabalho: (p.regime_trabalho as 'tempo_integral' | 'tempo_parcial') || 'tempo_integral',
    carga_horaria_padrao: p.carga_horaria_padrao || 220,
    prescricao_quinquenal: p.prescricao_quinquenal ?? false,
    prescricao_fgts: p.prescricao_fgts ?? false,
    maior_remuneracao: p.maior_remuneracao ?? undefined,
    ultima_remuneracao: p.ultima_remuneracao ?? undefined,
    prazo_aviso_previo: (p.prazo_aviso_previo as 'nao_apurar' | 'calculado' | 'informado') || 'nao_apurar',
    prazo_aviso_dias: p.prazo_aviso_dias ?? undefined,
    projetar_aviso_indenizado: p.projetar_aviso_indenizado ?? false,
    limitar_avos_periodo: p.limitar_avos_periodo ?? false,
    zerar_valor_negativo: p.zerar_valor_negativo ?? false,
    sabado_dia_util: p.sabado_dia_util ?? true,
    considerar_feriado_estadual: p.considerar_feriado_estadual ?? false,
    considerar_feriado_municipal: p.considerar_feriado_municipal ?? false,
  };
}

function toEngineFaltas(faltas: PjecalcFaltaRow[]): PjeFalta[] {
  return faltas.map(f => ({
    id: f.id,
    data_inicial: f.data_inicial || '',
    data_final: f.data_final || '',
    justificada: f.justificada ?? false,
    justificativa: f.motivo || undefined,
  }));
}

function toEngineFerias(ferias: PjecalcFeriasRow[]): PjeFerias[] {
  return ferias.map(f => ({
    id: f.id,
    relativas: '',
    periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio || '',
    periodo_aquisitivo_fim: f.periodo_aquisitivo_fim || '',
    periodo_concessivo_inicio: f.periodo_concessivo_inicio || '',
    periodo_concessivo_fim: f.periodo_concessivo_fim || '',
    prazo_dias: f.dias || 30,
    situacao: (f.situacao as 'gozadas' | 'indenizadas' | 'perdidas' | 'gozadas_parcialmente') || 'gozadas',
    dobra: f.dobra ?? false,
    abono: f.abono ?? false,
    abono_dias: f.dias_abono || 0,
    periodos_gozo: f.gozo_inicio ? [{ inicio: f.gozo_inicio, fim: f.gozo_fim || f.gozo_inicio, dias: f.dias || 30 }] : [],
  }));
}

function toEngineHistoricos(
  historicos: PjecalcHistoricoSalarialRow[],
  ocorrencias: svc.PjecalcCaseData['historicos'] extends (infer _T)[] ? never : never
): PjeHistoricoSalarial[] {
  // We'll load ocorrências separately
  return historicos.map(h => ({
    id: h.id,
    nome: h.nome,
    periodo_inicio: h.periodo_inicio || '',
    periodo_fim: h.periodo_fim || '',
    tipo_valor: (h.tipo_valor as 'informado' | 'calculado') || 'informado',
    valor_informado: h.valor_informado ?? undefined,
    incidencia_fgts: h.incidencia_fgts ?? true,
    incidencia_cs: h.incidencia_cs ?? true,
    fgts_recolhido: false,
    cs_recolhida: false,
    ocorrencias: [], // will be populated separately
  }));
}

function toEngineVerbas(verbas: PjecalcVerbaRow[]): PjeVerba[] {
  return verbas.map(v => ({
    id: v.id,
    nome: v.nome,
    tipo: (v.tipo === 'reflexa' ? 'reflexa' : 'principal') as 'principal' | 'reflexa',
    valor: (v.valor as 'calculado' | 'informado') || 'calculado',
    caracteristica: (v.caracteristica as 'comum' | '13_salario' | 'aviso_previo' | 'ferias') || 'comum',
    ocorrencia_pagamento: (v.ocorrencia_pagamento as 'mensal' | 'dezembro' | 'periodo_aquisitivo' | 'desligamento') || 'mensal',
    compor_principal: true,
    zerar_valor_negativo: false,
    dobrar_valor_devido: false,
    periodo_inicio: v.periodo_inicio || '',
    periodo_fim: v.periodo_fim || '',
    base_calculo: {
      historicos: v.hist_salarial_nome ? [v.hist_salarial_nome] : [],
      verbas: [],
      tabelas: [],
      proporcionalizar: false,
      integralizar: false,
    },
    tipo_divisor: 'informado' as const,
    divisor_informado: v.divisor_informado || 1,
    multiplicador: v.multiplicador || 1,
    tipo_quantidade: 'informada' as const,
    quantidade_informada: 1,
    quantidade_proporcionalizar: false,
    exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
    valor_informado_devido: v.valor_informado_devido ?? undefined,
    valor_informado_pago: v.valor_informado_pago ?? undefined,
    incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
    juros_ajuizamento: 'ocorrencias_vencidas' as const,
    verba_principal_id: v.verba_principal_id ?? undefined,
    gerar_verba_reflexa: 'diferenca' as const,
    gerar_verba_principal: 'diferenca' as const,
    ordem: v.ordem || 0,
  }));
}

function toEngineCartaoPonto(cp: PjecalcCartaoPontoRow[]): PjeCartaoPonto[] {
  return cp.map(c => ({
    competencia: c.competencia,
    dias_uteis: c.dias_uteis || 0,
    dias_trabalhados: c.dias_trabalhados || 0,
    horas_extras_50: c.horas_extras_50 || 0,
    horas_extras_100: c.horas_extras_100 || 0,
    horas_noturnas: c.horas_noturnas || 0,
    intervalo_suprimido: c.intervalo_suprimido || 0,
    dsr_horas: c.dsr_horas || 0,
    sobreaviso: c.sobreaviso || 0,
  }));
}

function toEngineFgtsConfig(cfg: PjecalcFgtsConfigRow | null): PjeFGTSConfig {
  return {
    apurar: cfg?.habilitado ?? true,
    destino: 'pagar_reclamante',
    compor_principal: false,
    multa_apurar: true,
    multa_tipo: 'calculada',
    multa_percentual: cfg?.percentual_multa ?? 40,
    multa_base: 'diferenca',
    saldos_saques: [],
    deduzir_saldo: false,
    lc110_10: false,
    lc110_05: false,
  };
}

function toEngineCsConfig(cfg: PjecalcCsConfigRow | null): PjeCSConfig {
  return {
    apurar_segurado: cfg?.habilitado ?? true,
    cobrar_reclamante: true,
    cs_sobre_salarios_pagos: false,
    aliquota_segurado_tipo: 'empregado',
    limitar_teto: true,
    apurar_empresa: true,
    apurar_sat: true,
    apurar_terceiros: true,
    aliquota_empregador_tipo: 'atividade',
    periodos_simples: [],
  };
}

function toEngineIrConfig(cfg: PjecalcIrConfigRow | null): PjeIRConfig {
  return {
    apurar: cfg?.habilitado ?? true,
    incidir_sobre_juros: false,
    cobrar_reclamado: false,
    tributacao_exclusiva_13: true,
    tributacao_separada_ferias: true,
    deduzir_cs: true,
    deduzir_prev_privada: false,
    deduzir_pensao: false,
    deduzir_honorarios: false,
    aposentado_65: false,
    dependentes: cfg?.dependentes ?? 0,
  };
}

function toEngineCorrecaoConfig(cfg: PjecalcCorrecaoConfigRow | null): PjeCorrecaoConfig {
  return {
    indice: cfg?.indice || 'IPCA-E',
    epoca: (cfg?.epoca as 'mensal' | 'fixo') || 'mensal',
    juros_tipo: (cfg?.juros_tipo as 'simples_mensal' | 'selic' | 'nenhum' | 'composto') || 'simples_mensal',
    juros_percentual: cfg?.juros_percentual ?? 1,
    juros_inicio: (cfg?.juros_inicio as 'ajuizamento' | 'citacao' | 'vencimento') || 'ajuizamento',
    multa_523: cfg?.multa_523 ?? false,
    multa_523_percentual: cfg?.multa_523_percentual ?? 10,
    data_liquidacao: cfg?.data_liquidacao || new Date().toISOString().slice(0, 10),
  };
}

function toEngineHonorariosConfig(cfg: PjecalcHonorariosRow | null): PjeHonorariosConfig {
  return {
    apurar_sucumbenciais: !!cfg,
    percentual_sucumbenciais: cfg?.percentual ?? 15,
    base_sucumbenciais: (cfg?.sobre as 'condenacao' | 'causa' | 'proveito') || 'condenacao',
    apurar_contratuais: false,
    percentual_contratuais: 0,
  };
}

function toEngineCustasConfig(cfg: PjecalcCustasConfigRow | null): PjeCustasConfig {
  return {
    apurar: !!cfg,
    percentual: cfg?.percentual ?? 2,
    valor_minimo: 10.64,
    isento: false,
    assistencia_judiciaria: false,
    itens: [],
  };
}

// =====================================================
// EXECUTION RESULT
// =====================================================

export interface OrchestratorResult {
  result: PjeLiquidacaoResult;
  fingerprint: EngineExecutionFingerprint;
  persistedAt: string;
}

// =====================================================
// MAIN: executarLiquidacao
// =====================================================

export async function executarLiquidacao(
  caseId: string,
  mode: 'manual' | 'auto' | 'seed' = 'manual'
): Promise<OrchestratorResult> {
  // 1. Load all case data in parallel
  const caseData = await svc.loadCaseData(caseId);

  if (!caseData.params) {
    throw new Error('Parâmetros do cálculo não encontrados. Preencha primeiro.');
  }

  // 2. Load historico ocorrencias
  const histOcorrencias = await svc.getHistoricoOcorrencias(caseId);

  // 3. Convert to engine types
  const engineParams = toEngineParams(caseData.params);
  const engineFaltas = toEngineFaltas(caseData.faltas);
  const engineFerias = toEngineFerias(caseData.ferias);
  const engineCartao = toEngineCartaoPonto(caseData.cartaoPonto);

  // Build historicos with ocorrencias
  const engineHistoricos: PjeHistoricoSalarial[] = caseData.historicos.map(h => ({
    id: h.id,
    nome: h.nome,
    periodo_inicio: h.periodo_inicio || '',
    periodo_fim: h.periodo_fim || '',
    tipo_valor: (h.tipo_valor as 'informado' | 'calculado') || 'informado',
    valor_informado: h.valor_informado ?? undefined,
    incidencia_fgts: h.incidencia_fgts ?? true,
    incidencia_cs: h.incidencia_cs ?? true,
    fgts_recolhido: false,
    cs_recolhida: false,
    ocorrencias: histOcorrencias
      .filter(o => o.historico_id === h.id)
      .map(o => ({
        id: o.id,
        historico_id: o.historico_id,
        competencia: o.competencia,
        valor: o.valor,
        tipo: (o.tipo as 'calculado' | 'informado') || 'informado',
      })),
  }));

  const engineVerbas = toEngineVerbas(caseData.verbas);
  const engineFgts = toEngineFgtsConfig(caseData.fgtsConfig);
  const engineCs = toEngineCsConfig(caseData.csConfig);
  const engineIr = toEngineIrConfig(caseData.irConfig);
  const engineCorrecao = toEngineCorrecaoConfig(caseData.correcaoConfig);
  const engineHonorarios = toEngineHonorariosConfig(caseData.honorarios);
  const engineCustas = toEngineCustasConfig(caseData.custasConfig);

  const engineSeguro: PjeSeguroConfig = { apurar: false, parcelas: 0, recebeu: false };

  // 4. Execute engine
  const engine = new PjeCalcEngine(
    engineParams, engineHistoricos, engineFaltas, engineFerias,
    engineVerbas, engineCartao, engineFgts, engineCs, engineIr,
    engineCorrecao, engineHonorarios, engineCustas, engineSeguro,
  );

  const result = engine.liquidar();

  // 5. Generate fingerprint
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id || 'anonymous';

  const fingerprint: EngineExecutionFingerprint = {
    engine_version: ENGINE_VERSION,
    ruleset_version: RULESET_VERSION,
    tax_table_versions: { inss: '2025.01', irrf: '2025.01', seguro: '2025.01' },
    index_series_version: 'embedded',
    input_hash: simpleHash({
      params: caseData.params,
      faltas: caseData.faltas,
      ferias: caseData.ferias,
      historicos: caseData.historicos,
      verbas: caseData.verbas,
    }),
    facts_hash: simpleHash({ histOcorrencias }),
    calculation_profile_version: 'pjecalc-v3',
    execution_timestamp: new Date().toISOString(),
    execution_user: userId,
    execution_mode: mode,
  };

  // 6. Persist resultado
  await svc.upsertResultado({
    case_id: caseId,
    total_bruto: result.resumo.principal_bruto,
    total_liquido: result.resumo.liquido_reclamante,
    inss_segurado: result.resumo.cs_segurado,
    irrf: result.resumo.ir_retido,
    inss_patronal: result.resumo.cs_empregador,
    honorarios: result.resumo.honorarios_sucumbenciais + result.resumo.honorarios_contratuais,
    custas: result.resumo.custas,
    fgts_depositar: result.fgts.total_depositos,
    fgts_multa_40: result.fgts.multa_valor,
    total_reclamante: result.resumo.liquido_reclamante,
    total_reclamado: result.resumo.total_reclamada,
    resultado: {
      ...result as unknown as Record<string, unknown>,
      _fingerprint: fingerprint as unknown as Record<string, unknown>,
    },
    engine_version: ENGINE_VERSION,
  });

  // 7. Persist ocorrências
  await svc.deleteOcorrencias(caseId);
  
  for (const verba of result.verbas) {
    for (const oc of verba.ocorrencias) {
      await svc.insertOcorrencia({
        case_id: caseId,
        verba_id: verba.verba_id,
        verba_nome: verba.nome,
        competencia: oc.competencia,
        base_valor: oc.base,
        multiplicador_valor: oc.multiplicador,
        divisor_valor: oc.divisor,
        quantidade_valor: oc.quantidade,
        dobra: oc.dobra,
        devido: oc.devido,
        pago: oc.pago,
        diferenca: oc.diferenca,
        correcao: oc.valor_corrigido - oc.diferenca,
        juros: oc.juros,
        total: oc.valor_final,
        origem: 'CALCULADA',
        ativa: true,
      });
    }
  }

  return {
    result,
    fingerprint,
    persistedAt: new Date().toISOString(),
  };
}

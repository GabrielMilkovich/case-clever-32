/**
 * =====================================================
 * PJeCalcService — CAMADA DE SERVIÇO ÚNICA
 * =====================================================
 * 
 * Toda interação entre a UI e o banco de dados pjecalc_* passa por aqui.
 * Nenhum componente React deve acessar supabase.from('pjecalc_*') diretamente.
 * 
 * Responsabilidades:
 * - CRUD tipado para todas as views pjecalc_*
 * - Orquestração do PjeCalcEngine
 * - Persistência de resultados
 * - Snapshot com fingerprint de execução
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  PjecalcParametrosRow, PjecalcParametrosInsert,
  PjecalcDadosProcessoRow, PjecalcDadosProcessoInsert,
  PjecalcFaltaRow, PjecalcFaltaInsert,
  PjecalcFeriasRow, PjecalcFeriasInsert,
  PjecalcHistoricoSalarialRow, PjecalcHistoricoSalarialInsert,
  PjecalcHistoricoOcorrenciaRow, PjecalcHistoricoOcorrenciaInsert,
  PjecalcVerbaRow, PjecalcVerbaInsert,
  PjecalcOcorrenciaRow, PjecalcOcorrenciaInsert,
  PjecalcLiquidacaoResultadoRow, PjecalcLiquidacaoResultadoInsert,
  PjecalcCartaoPontoRow,
  PjecalcFgtsConfigRow, PjecalcFgtsConfigInsert,
  PjecalcCsConfigRow, PjecalcCsConfigInsert,
  PjecalcIrConfigRow, PjecalcIrConfigInsert,
  PjecalcCorrecaoConfigRow, PjecalcCorrecaoConfigInsert,
  PjecalcHonorariosRow, PjecalcHonorariosInsert,
  PjecalcCustasConfigRow, PjecalcCustasConfigInsert,
  PjecalcMultasConfigRow,
  CompletionInput,
} from './types';

// =====================================================
// HELPER: typed query wrapper (avoids `as any` everywhere)
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromView(name: string): any {
  return supabase.from(name as any);
}

// =====================================================
// PARAMETROS
// =====================================================

export async function getParametros(caseId: string): Promise<PjecalcParametrosRow | null> {
  const { data, error } = await fromView('pjecalc_parametros')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  if (error) throw error;
  return data as PjecalcParametrosRow | null;
}

export async function upsertParametros(payload: PjecalcParametrosInsert): Promise<void> {
  const existing = await getParametros(payload.case_id);
  if (existing) {
    const { error } = await fromView('pjecalc_parametros')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await fromView('pjecalc_parametros').insert(payload);
    if (error) throw error;
  }
}

// =====================================================
// DADOS DO PROCESSO
// =====================================================

export async function getDadosProcesso(caseId: string): Promise<PjecalcDadosProcessoRow | null> {
  const { data, error } = await fromView('pjecalc_dados_processo')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();
  if (error) throw error;
  return data as PjecalcDadosProcessoRow | null;
}

export async function upsertDadosProcesso(payload: PjecalcDadosProcessoInsert): Promise<void> {
  const existing = await getDadosProcesso(payload.case_id);
  if (existing) {
    const { error } = await fromView('pjecalc_dados_processo')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await fromView('pjecalc_dados_processo').insert(payload);
    if (error) throw error;
  }
}

// =====================================================
// FALTAS
// =====================================================

export async function getFaltas(caseId: string): Promise<PjecalcFaltaRow[]> {
  const { data, error } = await fromView('pjecalc_faltas')
    .select('*')
    .eq('case_id', caseId)
    .order('data_inicial');
  if (error) throw error;
  return (data || []) as PjecalcFaltaRow[];
}

export async function insertFalta(payload: PjecalcFaltaInsert): Promise<void> {
  const { error } = await fromView('pjecalc_faltas').insert(payload);
  if (error) throw error;
}

export async function deleteFalta(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_faltas').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================
// FÉRIAS
// =====================================================

export async function getFerias(caseId: string): Promise<PjecalcFeriasRow[]> {
  const { data, error } = await fromView('pjecalc_ferias')
    .select('*')
    .eq('case_id', caseId)
    .order('periodo_aquisitivo_inicio');
  if (error) throw error;
  return (data || []) as PjecalcFeriasRow[];
}

export async function insertFerias(payload: PjecalcFeriasInsert): Promise<void> {
  const { error } = await fromView('pjecalc_ferias').insert(payload);
  if (error) throw error;
}

export async function deleteFerias(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_ferias').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================
// HISTÓRICO SALARIAL
// =====================================================

export async function getHistoricoSalarial(caseId: string): Promise<PjecalcHistoricoSalarialRow[]> {
  const { data, error } = await fromView('pjecalc_historico_salarial')
    .select('*')
    .eq('case_id', caseId)
    .order('periodo_inicio');
  if (error) throw error;
  return (data || []) as PjecalcHistoricoSalarialRow[];
}

export async function insertHistoricoSalarial(payload: PjecalcHistoricoSalarialInsert): Promise<void> {
  const { error } = await fromView('pjecalc_historico_salarial').insert(payload);
  if (error) throw error;
}

export async function deleteHistoricoSalarial(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_historico_salarial').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================
// HISTÓRICO OCORRÊNCIAS (mensal)
// =====================================================

export async function getHistoricoOcorrencias(caseId: string): Promise<PjecalcHistoricoOcorrenciaRow[]> {
  const { data, error } = await fromView('pjecalc_historico_ocorrencias')
    .select('*')
    .eq('case_id', caseId)
    .order('competencia');
  if (error) throw error;
  return (data || []) as PjecalcHistoricoOcorrenciaRow[];
}

export async function insertHistoricoOcorrencia(payload: PjecalcHistoricoOcorrenciaInsert): Promise<void> {
  const { error } = await fromView('pjecalc_historico_ocorrencias').insert(payload);
  if (error) throw error;
}

// =====================================================
// VERBAS
// =====================================================

export async function getVerbas(caseId: string): Promise<PjecalcVerbaRow[]> {
  const { data, error } = await fromView('pjecalc_verbas')
    .select('*')
    .eq('case_id', caseId)
    .order('ordem');
  if (error) throw error;
  return (data || []) as PjecalcVerbaRow[];
}

export async function insertVerba(payload: PjecalcVerbaInsert): Promise<{ id: string }> {
  const { data, error } = await fromView('pjecalc_verbas')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function deleteVerba(id: string): Promise<void> {
  const { error } = await fromView('pjecalc_verbas').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================
// OCORRÊNCIAS
// =====================================================

export async function getOcorrencias(caseId: string, verbaId?: string): Promise<PjecalcOcorrenciaRow[]> {
  let query = fromView('pjecalc_ocorrencias')
    .select('*')
    .eq('case_id', caseId)
    .order('competencia');
  if (verbaId) {
    query = query.eq('verba_id', verbaId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PjecalcOcorrenciaRow[];
}

export async function insertOcorrencia(payload: PjecalcOcorrenciaInsert): Promise<void> {
  const { error } = await fromView('pjecalc_ocorrencias').insert(payload);
  if (error) throw error;
}

export async function deleteOcorrencias(caseId: string, verbaId?: string): Promise<void> {
  let query = fromView('pjecalc_ocorrencias').delete().eq('case_id', caseId);
  if (verbaId) {
    query = query.eq('verba_id', verbaId);
  }
  const { error } = await query;
  if (error) throw error;
}

// =====================================================
// RESULTADO DA LIQUIDAÇÃO
// =====================================================

export async function getResultado(caseId: string): Promise<PjecalcLiquidacaoResultadoRow | null> {
  const { data, error } = await fromView('pjecalc_liquidacao_resultado')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PjecalcLiquidacaoResultadoRow | null;
}

export async function upsertResultado(payload: PjecalcLiquidacaoResultadoInsert): Promise<void> {
  const { error } = await fromView('pjecalc_liquidacao_resultado').insert(payload);
  if (error) throw error;
}

// =====================================================
// CARTÃO DE PONTO (read-only view aggregate)
// =====================================================

export async function getCartaoPonto(caseId: string): Promise<PjecalcCartaoPontoRow[]> {
  const { data, error } = await fromView('pjecalc_cartao_ponto')
    .select('*')
    .eq('case_id', caseId)
    .order('competencia');
  if (error) throw error;
  return (data || []) as PjecalcCartaoPontoRow[];
}

// =====================================================
// CONFIG MODULES
// =====================================================

export async function getFgtsConfig(caseId: string): Promise<PjecalcFgtsConfigRow | null> {
  const { data, error } = await fromView('pjecalc_fgts_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcFgtsConfigRow | null;
}

export async function upsertFgtsConfig(payload: PjecalcFgtsConfigInsert): Promise<void> {
  const existing = await getFgtsConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_fgts_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_fgts_config').insert(payload);
  }
}

export async function getCsConfig(caseId: string): Promise<PjecalcCsConfigRow | null> {
  const { data, error } = await fromView('pjecalc_cs_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcCsConfigRow | null;
}

export async function upsertCsConfig(payload: PjecalcCsConfigInsert): Promise<void> {
  const existing = await getCsConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_cs_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_cs_config').insert(payload);
  }
}

export async function getIrConfig(caseId: string): Promise<PjecalcIrConfigRow | null> {
  const { data, error } = await fromView('pjecalc_ir_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcIrConfigRow | null;
}

export async function upsertIrConfig(payload: PjecalcIrConfigInsert): Promise<void> {
  const existing = await getIrConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_ir_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_ir_config').insert(payload);
  }
}

export async function getCorrecaoConfig(caseId: string): Promise<PjecalcCorrecaoConfigRow | null> {
  const { data, error } = await fromView('pjecalc_correcao_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcCorrecaoConfigRow | null;
}

export async function upsertCorrecaoConfig(payload: PjecalcCorrecaoConfigInsert): Promise<void> {
  const existing = await getCorrecaoConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_correcao_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_correcao_config').insert(payload);
  }
}

export async function getHonorarios(caseId: string): Promise<PjecalcHonorariosRow | null> {
  const { data, error } = await fromView('pjecalc_honorarios')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcHonorariosRow | null;
}

export async function upsertHonorarios(payload: PjecalcHonorariosInsert): Promise<void> {
  const existing = await getHonorarios(payload.case_id);
  if (existing) {
    await fromView('pjecalc_honorarios').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_honorarios').insert(payload);
  }
}

export async function getCustasConfig(caseId: string): Promise<PjecalcCustasConfigRow | null> {
  const { data, error } = await fromView('pjecalc_custas_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcCustasConfigRow | null;
}

export async function upsertCustasConfig(payload: PjecalcCustasConfigInsert): Promise<void> {
  const existing = await getCustasConfig(payload.case_id);
  if (existing) {
    await fromView('pjecalc_custas_config').update(payload).eq('id', existing.id);
  } else {
    await fromView('pjecalc_custas_config').insert(payload);
  }
}

export async function getMultasConfig(caseId: string): Promise<PjecalcMultasConfigRow | null> {
  const { data, error } = await fromView('pjecalc_multas_config')
    .select('*').eq('case_id', caseId).maybeSingle();
  if (error) throw error;
  return data as PjecalcMultasConfigRow | null;
}

// =====================================================
// BATCH: Carregar todos os dados de um caso
// =====================================================

export interface PjecalcCaseData {
  params: PjecalcParametrosRow | null;
  dadosProcesso: PjecalcDadosProcessoRow | null;
  faltas: PjecalcFaltaRow[];
  ferias: PjecalcFeriasRow[];
  historicos: PjecalcHistoricoSalarialRow[];
  verbas: PjecalcVerbaRow[];
  cartaoPonto: PjecalcCartaoPontoRow[];
  resultado: PjecalcLiquidacaoResultadoRow | null;
  fgtsConfig: PjecalcFgtsConfigRow | null;
  csConfig: PjecalcCsConfigRow | null;
  irConfig: PjecalcIrConfigRow | null;
  correcaoConfig: PjecalcCorrecaoConfigRow | null;
  honorarios: PjecalcHonorariosRow | null;
  custasConfig: PjecalcCustasConfigRow | null;
  multasConfig: PjecalcMultasConfigRow | null;
}

export async function loadCaseData(caseId: string): Promise<PjecalcCaseData> {
  const [
    params, dadosProcesso, faltas, ferias, historicos, verbas,
    cartaoPonto, resultado, fgtsConfig, csConfig, irConfig,
    correcaoConfig, honorarios, custasConfig, multasConfig,
  ] = await Promise.all([
    getParametros(caseId),
    getDadosProcesso(caseId),
    getFaltas(caseId),
    getFerias(caseId),
    getHistoricoSalarial(caseId),
    getVerbas(caseId),
    getCartaoPonto(caseId),
    getResultado(caseId),
    getFgtsConfig(caseId),
    getCsConfig(caseId),
    getIrConfig(caseId),
    getCorrecaoConfig(caseId),
    getHonorarios(caseId),
    getCustasConfig(caseId),
    getMultasConfig(caseId),
  ]);

  return {
    params, dadosProcesso, faltas, ferias, historicos, verbas,
    cartaoPonto, resultado, fgtsConfig, csConfig, irConfig,
    correcaoConfig, honorarios, custasConfig, multasConfig,
  };
}

// =====================================================
// NUKE: Limpar todos os dados de um caso
// =====================================================

export async function nukeCaseData(caseId: string): Promise<void> {
  // Get calculo IDs
  const { data: calcData } = await fromView('pjecalc_calculos')
    .select('id')
    .eq('case_id', caseId);

  const calculoIds = (calcData || []).map((c: { id: string }) => c.id);

  // Delete from base tables in reverse FK order
  const baseTablesToNuke = [
    'pjecalc_audit_log', 'pjecalc_resultado', 'pjecalc_ocorrencia_calculo',
    'pjecalc_reflexo_base_verba', 'pjecalc_reflexo', 'pjecalc_verba_base',
    'pjecalc_hist_salarial_mes', 'pjecalc_hist_salarial',
    'pjecalc_evento_intervalo', 'pjecalc_apuracao_diaria', 'pjecalc_atualizacao_config',
  ];

  for (const table of baseTablesToNuke) {
    for (const cid of calculoIds) {
      await fromView(table).delete().eq('calculo_id', cid);
    }
    await fromView(table).delete().eq('case_id', caseId);
  }

  // Delete calculo itself
  if (calculoIds.length > 0) {
    await fromView('pjecalc_calculos').delete().eq('case_id', caseId);
  }

  // Clear views that might have orphan data
  const viewsToClear = [
    'pjecalc_liquidacao_resultado', 'pjecalc_ocorrencias', 'pjecalc_verbas',
    'pjecalc_historico_ocorrencias', 'pjecalc_historico_salarial',
    'pjecalc_faltas', 'pjecalc_ferias', 'pjecalc_cartao_ponto',
    'pjecalc_correcao_config', 'pjecalc_honorarios', 'pjecalc_custas_config',
    'pjecalc_cs_config', 'pjecalc_ir_config', 'pjecalc_fgts_config',
    'pjecalc_dados_processo', 'pjecalc_parametros',
  ];

  for (const v of viewsToClear) {
    await fromView(v).delete().eq('case_id', caseId);
  }
}

// =====================================================
// COMPLETUDE — Gerar input tipado para cálculo de completude
// =====================================================

export function toCompletionInput(data: PjecalcCaseData): CompletionInput {
  return {
    params: data.params,
    faltas: data.faltas,
    ferias: data.ferias,
    historicos: data.historicos,
    verbas: data.verbas,
    cartaoPonto: data.cartaoPonto,
    resultado: data.resultado,
    fgtsConfig: data.fgtsConfig,
    csConfig: data.csConfig,
    irConfig: data.irConfig,
    correcaoConfig: data.correcaoConfig,
  };
}

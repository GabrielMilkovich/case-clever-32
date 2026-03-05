/**
 * PJC → Database Persistence Layer
 * Maps PJCAnalysis from pjc-analyzer.ts into pjecalc_* v2 tables
 */

import { supabase } from '@/integrations/supabase/client';
import type { PJCAnalysis, VerbaAnalysis, OcorrenciaAnalysis } from './pjc-analyzer';

export interface PersistResult {
  calculo_id: string;
  verbas_inseridas: number;
  reflexos_inseridos: number;
  historicos_inseridos: number;
  ocorrencias_hist_inseridas: number;
  faltas_inseridas: number;
  ferias_inseridas: number;
  ocorrencias_verba_inseridas: number;
  warnings: string[];
}

/**
 * Persists a fully parsed PJCAnalysis into the v2 database tables.
 * Creates or updates pjecalc_calculos and populates all child tables.
 */
export async function persistirPJCAnalysis(
  caseId: string,
  userId: string,
  analysis: PJCAnalysis,
): Promise<PersistResult> {
  const warnings: string[] = [];
  const p = analysis.parametros;

  // 1. Upsert pjecalc_calculos
  const { data: calcData, error: calcError } = await supabase
    .from('pjecalc_calculos')
    .upsert({
      case_id: caseId,
      user_id: userId,
      reclamante_nome: p.beneficiario,
      reclamante_cpf: p.cpf,
      reclamado_nome: p.reclamado,
      reclamado_cnpj: p.cnpj,
      data_admissao: p.admissao || null,
      data_demissao: p.demissao || null,
      data_ajuizamento: p.ajuizamento || null,
      data_inicio_calculo: p.inicio_calculo || null,
      data_fim_calculo: p.termino_calculo || null,
      divisor_horas: p.carga_horaria || 220,
      status: 'ABERTO',
    }, { onConflict: 'case_id' })
    .select('id')
    .single();

  if (calcError || !calcData) {
    throw new Error(`Falha ao criar cálculo: ${calcError?.message}`);
  }

  const calculoId = calcData.id;

  // 2. Clear existing child data for idempotent re-import
  await Promise.all([
    supabase.from('pjecalc_ocorrencia_calculo').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_reflexo_base_verba').delete().in('reflexo_id',
      (await supabase.from('pjecalc_reflexo').select('id').eq('calculo_id', calculoId)).data?.map(r => r.id) || []
    ),
  ]);
  await Promise.all([
    supabase.from('pjecalc_reflexo').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_verba_base').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_hist_salarial_mes').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_hist_salarial').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_evento_intervalo').delete().eq('calculo_id', calculoId),
  ]);

  // 3. Insert histórico salarial
  let historicos_inseridos = 0;
  let ocorrencias_hist_inseridas = 0;
  const histIdMap = new Map<string, string>(); // nome → db id

  for (const hist of analysis.historicos_salariais) {
    const { data: histRow, error: histErr } = await supabase
      .from('pjecalc_hist_salarial')
      .insert({
        calculo_id: calculoId,
        nome: hist.nome,
        tipo_variacao: hist.tipo_variacao || 'VARIAVEL',
        incide_fgts: hist.incide_fgts,
        incide_inss: hist.incide_inss,
      })
      .select('id')
      .single();

    if (histErr || !histRow) {
      warnings.push(`Histórico ${hist.nome}: ${histErr?.message}`);
      continue;
    }
    historicos_inseridos++;
    histIdMap.set(hist.nome, histRow.id);

    // Insert monthly occurrences
    if (hist.competencias.length > 0) {
      const monthRows = hist.competencias.map(c => ({
        calculo_id: calculoId,
        hist_salarial_id: histRow.id,
        competencia: c.comp.length === 7 ? `${c.comp}-01` : c.comp,
        valor: c.valor,
        origem: 'PJC_IMPORT',
      }));

      const { error: monthErr } = await supabase
        .from('pjecalc_hist_salarial_mes')
        .insert(monthRows);

      if (monthErr) {
        warnings.push(`Ocorrências hist ${hist.nome}: ${monthErr.message}`);
      } else {
        ocorrencias_hist_inseridas += monthRows.length;
      }
    }
  }

  // 4. Insert faltas as eventos_intervalo
  let faltas_inseridas = 0;
  for (const falta of analysis.faltas) {
    const { error } = await supabase.from('pjecalc_evento_intervalo').insert({
      calculo_id: calculoId,
      tipo: falta.tipo || 'FALTA',
      data_inicio: falta.data_inicio,
      data_fim: falta.data_fim,
      justificado: falta.justificada,
      observacoes: `Importado do PJC`,
    });
    if (!error) faltas_inseridas++;
    else warnings.push(`Falta ${falta.data_inicio}: ${error.message}`);
  }

  // 5. Insert férias as eventos_intervalo
  let ferias_inseridas = 0;
  for (const fer of analysis.ferias) {
    const { error } = await supabase.from('pjecalc_evento_intervalo').insert({
      calculo_id: calculoId,
      tipo: 'FERIAS',
      data_inicio: fer.gozo_inicio || fer.aquisitivo_inicio,
      data_fim: fer.gozo_fim || fer.aquisitivo_fim,
      ferias_aquisitivo_inicio: fer.aquisitivo_inicio || null,
      ferias_aquisitivo_fim: fer.aquisitivo_fim || null,
      ferias_concessivo_inicio: fer.concessivo_inicio || null,
      ferias_concessivo_fim: fer.concessivo_fim || null,
      ferias_dias: fer.dias,
      ferias_abono: fer.abono,
      ferias_dias_abono: fer.dias_abono,
      ferias_dobra: fer.dobra,
      ferias_situacao: fer.situacao,
    });
    if (!error) ferias_inseridas++;
    else warnings.push(`Férias ${fer.aquisitivo_inicio}: ${error.message}`);
  }

  // 6. Insert verbas (Calculada) into pjecalc_verba_base
  let verbas_inseridas = 0;
  const verbaIdMap = new Map<string, string>(); // pjc_id → db_id

  const calculadas = analysis.verbas.filter(v => v.tipo === 'Calculada');
  for (const v of calculadas) {
    const { data: vbRow, error: vbErr } = await supabase
      .from('pjecalc_verba_base')
      .insert({
        calculo_id: calculoId,
        nome: v.nome,
        codigo: v.id,
        caracteristica: v.caracteristica || 'COMUM',
        periodicidade: v.ocorrencia_pagamento || 'MENSAL',
        tipo_variacao: v.variacao || 'VARIAVEL',
        multiplicador: v.formula.multiplicador.valor,
        divisor: v.formula.divisor.valor,
        periodo_inicio: v.periodo_inicio || null,
        periodo_fim: v.periodo_fim || null,
        ordem: v.ordem,
        ativa: v.ativo,
        incide_fgts: v.incidencias.fgts,
        incide_inss: v.incidencias.inss,
        incide_ir: v.incidencias.irpf,
        hist_salarial_nome: v.formula.base_tabelada === 'HISTORICO_SALARIAL' ? 'HISTORICO_SALARIAL' : null,
        observacoes: `PJC import: ${v.descricao || ''} | qty_tipo=${v.formula.quantidade.tipo} qty_val=${v.formula.quantidade.valor}`,
      })
      .select('id')
      .single();

    if (vbErr || !vbRow) {
      warnings.push(`Verba ${v.nome}: ${vbErr?.message}`);
      continue;
    }
    verbas_inseridas++;
    verbaIdMap.set(v.id, vbRow.id);
  }

  // 7. Insert reflexos into pjecalc_reflexo + pjecalc_reflexo_base_verba
  let reflexos_inseridos = 0;
  const reflexos = analysis.verbas.filter(v => v.tipo === 'Reflexo');

  for (const r of reflexos) {
    const { data: refRow, error: refErr } = await supabase
      .from('pjecalc_reflexo')
      .insert({
        calculo_id: calculoId,
        nome: r.nome,
        codigo: r.id,
        tipo: r.caracteristica || 'COMUM',
        comportamento_reflexo: r.comportamento_reflexo || null,
        periodo_media_reflexo: r.periodo_media || null,
        tratamento_fracao_mes: r.tratamento_fracao || null,
        periodo_inicio: r.periodo_inicio || null,
        periodo_fim: r.periodo_fim || null,
        ordem: r.ordem,
        ativa: r.ativo,
        incide_fgts: r.incidencias.fgts,
        incide_inss: r.incidencias.inss,
        incide_ir: r.incidencias.irpf,
        gerar_principal: r.gerar_principal === 'true' || r.gerar_principal === 'DEVIDO',
        gerar_reflexo: r.gerar_reflexo === 'true' || r.gerar_reflexo === 'DEVIDO',
        observacoes: `PJC import | div=${r.formula.divisor.valor} mult=${r.formula.multiplicador.valor}`,
      })
      .select('id')
      .single();

    if (refErr || !refRow) {
      warnings.push(`Reflexo ${r.nome}: ${refErr?.message}`);
      continue;
    }
    reflexos_inseridos++;
    verbaIdMap.set(r.id, refRow.id);

    // Link base_verbas
    for (const bv of r.formula.base_verbas) {
      const dbVerbaId = verbaIdMap.get(bv.id);
      if (!dbVerbaId) {
        warnings.push(`BaseVerba ref ${bv.id} (${bv.nome}) não encontrada no mapa`);
        continue;
      }
      await supabase.from('pjecalc_reflexo_base_verba').insert({
        reflexo_id: refRow.id,
        verba_base_id: dbVerbaId,
        integralizar: bv.integralizar === 'SIM',
      });
    }
  }

  // 8. Insert ocorrências for all verbas
  let ocorrencias_verba_inseridas = 0;
  for (const v of analysis.verbas) {
    const dbId = verbaIdMap.get(v.id);
    if (!dbId) continue;

    // Get all occurrences (not just sample)
    // The analyzer only stores sample, so we use what we have
    const ocorrencias = v.ocorrencias_sample || [];
    if (ocorrencias.length === 0) continue;

    const ocRows = ocorrencias.map((oc: OcorrenciaAnalysis) => ({
      calculo_id: calculoId,
      verba_base_id: v.tipo === 'Calculada' ? dbId : null,
      reflexo_id: v.tipo === 'Reflexo' ? dbId : null,
      tipo: v.nome,
      nome: v.nome,
      competencia: oc.competencia || '2020-01-01',
      base_valor: oc.base,
      multiplicador: oc.multiplicador,
      divisor: oc.divisor,
      quantidade: oc.quantidade,
      dobra: oc.dobra ? 2 : 1,
      devido: oc.devido,
      pago: oc.pago,
      diferenca: oc.devido - oc.pago,
      correcao: 0,
      juros: 0,
      total: oc.devido - oc.pago,
      origem: 'PJC_IMPORT',
      ativa: true,
    }));

    const { error: ocErr } = await supabase
      .from('pjecalc_ocorrencia_calculo')
      .insert(ocRows);

    if (ocErr) {
      warnings.push(`Ocorrências ${v.nome}: ${ocErr.message}`);
    } else {
      ocorrencias_verba_inseridas += ocRows.length;
    }
  }

  // 9. Insert resultado (ground truth from PJC)
  const res = analysis.resultado;
  await supabase.from('pjecalc_resultado').upsert({
    calculo_id: calculoId,
    total_bruto: 0,
    total_liquido_antes_descontos: 0,
    desconto_inss_reclamante: res.inss_reclamante,
    desconto_inss_reclamado: res.inss_reclamado,
    desconto_ir: res.imposto_renda,
    fgts_depositar: res.fgts_deposito,
    honorarios: res.honorarios.reduce((s, h) => s + h.valor, 0),
    custas: res.custas,
    total_reclamante: res.liquido_exequente,
    total_reclamado: 0,
    resumo_verbas: analysis.verbas.map(v => ({
      nome: v.nome,
      tipo: v.tipo,
      total_devido: v.total_devido,
      total_pago: v.total_pago,
      total_diferenca: v.total_diferenca,
    })),
    engine_version: 'PJC_IMPORT',
  }, { onConflict: 'calculo_id' });

  return {
    calculo_id: calculoId,
    verbas_inseridas,
    reflexos_inseridos,
    historicos_inseridos,
    ocorrencias_hist_inseridas,
    faltas_inseridas,
    ferias_inseridas,
    ocorrencias_verba_inseridas,
    warnings,
  };
}

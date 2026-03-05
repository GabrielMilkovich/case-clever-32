/**
 * Seed completo do caso Maria Madalena a partir do Golden Snapshot.
 * Popula TODOS os módulos PJe-Calc com os dados corretos do PDF.
 * 
 * IMPORTANTE: Este seed usa as VIEWS do pjecalc (pjecalc_faltas, pjecalc_ferias, etc.)
 * que possuem triggers INSTEAD OF INSERT para redirecionar para as tabelas base.
 */
import { supabase } from "@/integrations/supabase/client";
import { MARIA_MADALENA_SNAPSHOT } from "@/lib/golden/maria-madalena-snapshot";

export async function seedGoldenMariaMadalena(caseId: string): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const snap = MARIA_MADALENA_SNAPSHOT;

  // ── 0. NUKE: Apagar TUDO do caso (tabelas base, ordem reversa de FK) ──
  const baseTablesToNuke = [
    'pjecalc_audit_log',
    'pjecalc_resultado',
    'pjecalc_ocorrencia_calculo',
    'pjecalc_reflexo',
    'pjecalc_reflexo_base_verba',
    'pjecalc_verba_base',
    'pjecalc_hist_salarial_mes',
    'pjecalc_hist_salarial',
    'pjecalc_evento_intervalo',
    'pjecalc_apuracao_diaria',
    'pjecalc_atualizacao_config',
  ];

  // Get calculo_id first
  const { data: calcData } = await supabase
    .from('pjecalc_calculos' as any)
    .select('id')
    .eq('case_id', caseId);

  const calculoIds = (calcData || []).map((c: any) => c.id);

  // Delete from base tables using calculo_id
  for (const table of baseTablesToNuke) {
    if (calculoIds.length > 0) {
      for (const cid of calculoIds) {
        await supabase.from(table as any).delete().eq('calculo_id', cid);
      }
    }
    // Also try case_id for tables that have it
    await supabase.from(table as any).delete().eq('case_id', caseId);
  }

  // Delete the calculo itself and recreate
  if (calculoIds.length > 0) {
    await supabase.from('pjecalc_calculos' as any).delete().eq('case_id', caseId);
  }

  // Also clear views that might have orphan data
  const viewsToClear = [
    'pjecalc_liquidacao_resultado',
    'pjecalc_ocorrencias',
    'pjecalc_verbas',
    'pjecalc_historico_ocorrencias',
    'pjecalc_historico_salarial',
    'pjecalc_faltas',
    'pjecalc_ferias',
    'pjecalc_cartao_ponto',
    'pjecalc_correcao_config',
    'pjecalc_honorarios',
    'pjecalc_custas_config',
    'pjecalc_cs_config',
    'pjecalc_ir_config',
    'pjecalc_fgts_config',
    'pjecalc_dados_processo',
    'pjecalc_parametros',
  ];
  for (const v of viewsToClear) {
    await supabase.from(v as any).delete().eq('case_id', caseId);
  }

  // ── 1. Parâmetros (view: pjecalc_parametros) ──
  // Columns: id, case_id, data_admissao, data_demissao, data_ajuizamento, data_inicial, data_final,
  //   estado, municipio, prescricao_quinquenal, prescricao_fgts, regime_trabalho, carga_horaria_padrao,
  //   maior_remuneracao, ultima_remuneracao, prazo_aviso_previo, prazo_aviso_dias,
  //   projetar_aviso_indenizado, limitar_avos_periodo, zerar_valor_negativo, sabado_dia_util,
  //   considerar_feriado_estadual, considerar_feriado_municipal, comentarios
  {
    const { error } = await supabase.from('pjecalc_parametros' as any).insert({
      case_id: caseId,
      data_admissao: snap.meta.admissao,
      data_demissao: snap.meta.demissao,
      data_ajuizamento: snap.meta.data_ajuizamento,
      data_inicial: snap.meta.periodo_calculo_inicio,
      data_final: snap.meta.periodo_calculo_fim,
      estado: snap.meta.estado,
      municipio: snap.meta.municipio,
      carga_horaria_padrao: snap.meta.carga_horaria,
      regime_trabalho: 'tempo_integral',
      sabado_dia_util: snap.meta.sabado_dia_util,
      considerar_feriado_estadual: snap.meta.considerar_feriados_estaduais,
      considerar_feriado_municipal: false,
      prescricao_quinquenal: snap.meta.prescricao_quinquenal,
      prescricao_fgts: false,
      limitar_avos_periodo: snap.meta.limitar_avos_periodo,
      projetar_aviso_indenizado: snap.meta.projetar_aviso_previo,
      zerar_valor_negativo: snap.meta.zerar_valor_negativo,
      prazo_aviso_previo: 'calculado',
    });
    if (error) errors.push(`Parâmetros: ${error.message}`);
  }

  // ── 2. Dados do Processo (view: pjecalc_dados_processo) ──
  // Columns: id, case_id, numero_processo, reclamante_nome, reclamante_cpf, reclamada_nome, reclamada_cnpj, vara, comarca, objeto
  {
    const { error } = await supabase.from('pjecalc_dados_processo' as any).insert({
      case_id: caseId,
      numero_processo: snap.meta.processo,
      reclamante_nome: snap.meta.reclamante,
      reclamada_nome: snap.meta.reclamado,
    });
    if (error) errors.push(`Dados Processo: ${error.message}`);
  }

  // ── 3. Histórico Salarial (view: pjecalc_historico_salarial) ──
  // Columns: id, case_id, calculo_id, nome, tipo_valor, valor_informado, periodo_inicio, periodo_fim, incidencia_fgts, incidencia_cs, observacoes
  const historicoItems = [
    { nome: 'COMISSÕES PAGAS', valor: 1800, tipo: 'VARIAVEL' },
    { nome: 'COMISSÕES ESTORNADAS', valor: 150, tipo: 'VARIAVEL' },
    { nome: 'DSR S/ COMISSÃO', valor: 360, tipo: 'VARIAVEL' },
    { nome: 'MÍNIMO GARANTIDO', valor: 1200, tipo: 'VARIAVEL' },
    { nome: 'PRÊMIOS PAGOS', valor: 280, tipo: 'VARIAVEL' },
    { nome: 'VENDAS VF', valor: 450, tipo: 'VARIAVEL' },
  ];

  for (const h of historicoItems) {
    const { error } = await supabase.from('pjecalc_historico_salarial' as any).insert({
      case_id: caseId,
      nome: h.nome,
      periodo_inicio: snap.meta.periodo_calculo_inicio,
      periodo_fim: snap.meta.periodo_calculo_fim,
      tipo_valor: h.tipo,
      valor_informado: h.valor,
      incidencia_fgts: true,
      incidencia_cs: true,
    });
    if (error) errors.push(`Hist ${h.nome}: ${error.message}`);
  }

  // ── 4. Faltas (view: pjecalc_faltas) ──
  // Columns: id, case_id, calculo_id, data_inicial, data_final, tipo_falta, justificada, motivo, observacoes
  for (const falta of snap.faltas) {
    const { error } = await supabase.from('pjecalc_faltas' as any).insert({
      case_id: caseId,
      data_inicial: falta.inicio,
      data_final: falta.fim,
      justificada: falta.justificada,
      motivo: falta.justificativa,
      tipo_falta: 'FALTA',
    });
    if (error) errors.push(`Falta: ${error.message}`);
  }

  // ── 5. Férias (view: pjecalc_ferias) ──
  // Columns: id, case_id, calculo_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim,
  //   periodo_concessivo_inicio, periodo_concessivo_fim, gozo_inicio, gozo_fim,
  //   dias, abono, dias_abono, dobra, situacao, gozo2_inicio, gozo2_fim, gozo3_inicio, gozo3_fim, observacoes
  for (const ferias of snap.ferias) {
    const { error } = await supabase.from('pjecalc_ferias' as any).insert({
      case_id: caseId,
      periodo_aquisitivo_inicio: ferias.periodo_aquisitivo_inicio,
      periodo_aquisitivo_fim: ferias.periodo_aquisitivo_fim,
      periodo_concessivo_inicio: ferias.periodo_concessivo_inicio,
      periodo_concessivo_fim: ferias.periodo_concessivo_fim,
      gozo_inicio: ferias.gozo1_inicio,
      gozo_fim: ferias.gozo1_fim,
      dias: ferias.prazo || 30,
      abono: ferias.abono || false,
      dias_abono: 0,
      dobra: false,
      situacao: ferias.situacao || 'GOZADAS',
      gozo2_inicio: ferias.gozo2_inicio || null,
      gozo2_fim: ferias.gozo2_fim || null,
      gozo3_inicio: ferias.gozo3_inicio || null,
      gozo3_fim: ferias.gozo3_fim || null,
    });
    if (error) errors.push(`Férias ${ferias.relativa}: ${error.message}`);
  }

  // ── 6. Verbas (view: pjecalc_verbas) ──
  // Columns: id, case_id, calculo_id, nome, codigo, caracteristica, ocorrencia_pagamento,
  //   tipo, multiplicador, divisor_informado, periodo_inicio, periodo_fim, ordem, ativa,
  //   incide_inss, incide_fgts, incide_ir, verba_principal_id, base_calculo, incidencias, observacoes
  const periodo = { inicio: snap.meta.periodo_calculo_inicio, fim: snap.meta.periodo_calculo_fim };

  const defaultIncidencias = {
    fgts: true, irpf: true, contribuicao_social: true,
    previdencia_privada: false, pensao_alimenticia: false,
  };

  const rubricas = [
    { nome: 'COMISSÕES ESTORNADAS', codigo: 'COMISSOES_ESTORNADAS', mult: 1, div: 1, ordem: 1, caract: 'comum', ocorrencia: 'mensal' },
    { nome: 'VENDAS A PRAZO', codigo: 'VENDAS_A_PRAZO', mult: 1, div: 1, ordem: 2, caract: 'comum', ocorrencia: 'mensal' },
    { nome: 'PRÊMIO ESTÍMULO', codigo: 'PREMIO_ESTIMULO', mult: 1, div: 1, ordem: 3, caract: 'comum', ocorrencia: 'mensal' },
    { nome: 'ARTIGO 384 DA CLT', codigo: 'ART384', mult: 1.5, div: 220, ordem: 4, caract: 'comum', ocorrencia: 'mensal' },
    { nome: 'DOMINGOS E FERIADOS', codigo: 'DOMINGOS_FERIADOS', mult: 1, div: 1, ordem: 5, caract: 'comum', ocorrencia: 'mensal' },
    { nome: 'HORAS EXTRAS', codigo: 'HORAS_EXTRAS', mult: 1.5, div: 220, ordem: 6, caract: 'comum', ocorrencia: 'mensal' },
    { nome: 'INTERVALO INTERJORNADAS', codigo: 'INTERJORNADAS', mult: 1.5, div: 220, ordem: 7, caract: 'comum', ocorrencia: 'mensal' },
    { nome: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', codigo: 'RSR_COMISSIONISTA', mult: 1, div: 26, ordem: 8, caract: 'comum', ocorrencia: 'mensal' },
  ];

  // Determinar quais rubricas têm aviso prévio no snapshot
  const hasAPMap: Record<string, boolean> = {};
  for (const r of snap.rubricas) {
    if (r.tipo === 'REFLEXO_AP' && r.rubrica_principal) {
      hasAPMap[r.rubrica_principal] = true;
    }
  }

  for (const rub of rubricas) {
    // Insert principal
    const { data: vData, error: vError } = await supabase.from('pjecalc_verbas' as any).insert({
      case_id: caseId,
      nome: rub.nome,
      codigo: rub.codigo,
      caracteristica: rub.caract,
      ocorrencia_pagamento: rub.ocorrencia,
      tipo: 'principal',
      multiplicador: rub.mult,
      divisor_informado: rub.div,
      periodo_inicio: periodo.inicio,
      periodo_fim: periodo.fim,
      ordem: rub.ordem,
      ativa: true,
      incidencias: defaultIncidencias,
    }).select('id').single();

    if (vError) { errors.push(`Verba ${rub.nome}: ${vError.message}`); continue; }
    const principalId = (vData as any).id;

    // Reflexos
    const reflexos: any[] = [
      { nome: `13º SALÁRIO SOBRE ${rub.nome}`, caract: '13_salario', ocorrencia: 'dezembro', mult: 1, div: 12, ordemDelta: 0.1 },
      { nome: `FÉRIAS + 1/3 SOBRE ${rub.nome}`, caract: 'ferias', ocorrencia: 'periodo_aquisitivo', mult: 1.3333, div: 12, ordemDelta: 0.3 },
    ];
    if (hasAPMap[rub.codigo]) {
      reflexos.push({ nome: `AVISO PRÉVIO SOBRE ${rub.nome}`, caract: 'aviso_previo', ocorrencia: 'desligamento', mult: 1, div: 30, ordemDelta: 0.2 });
    }
    // RSR reflexo for applicable rubricas
    if (!['RSR_COMISSIONISTA', 'DOMINGOS_FERIADOS'].includes(rub.codigo)) {
      reflexos.push({ nome: `RSR E FERIADO SOBRE ${rub.nome}`, caract: 'comum', ocorrencia: 'mensal', mult: 1, div: 26, ordemDelta: 0.4 });
    }

    for (const ref of reflexos) {
      const { error } = await supabase.from('pjecalc_verbas' as any).insert({
        case_id: caseId,
        nome: ref.nome,
        caracteristica: ref.caract,
        ocorrencia_pagamento: ref.ocorrencia,
        tipo: 'reflexa',
        multiplicador: ref.mult,
        divisor_informado: ref.div,
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim,
        ordem: rub.ordem * 10 + ref.ordemDelta,
        ativa: true,
        verba_principal_id: principalId,
        incidencias: defaultIncidencias,
      });
      if (error) errors.push(`Reflexo ${ref.nome}: ${error.message}`);
    }
  }

  // ── 7. Correção monetária (view: pjecalc_correcao_config) ──
  // Columns: id, case_id, indice, combinacoes_indice, combinacoes_juros, juros_tipo,
  //   transicao_adc58, data_citacao, epoca, data_fixa, juros_percentual, juros_inicio,
  //   juros_pro_rata, indice_pos_citacao, multa_523, multa_523_percentual, multa_467,
  //   multa_467_percentual, data_liquidacao
  {
    const { error } = await supabase.from('pjecalc_correcao_config' as any).insert({
      case_id: caseId,
      indice: 'IPCA-E',
      epoca: 'mensal',
      juros_tipo: 'simples_mensal',
      juros_percentual: 1,
      juros_inicio: 'vencimento',
      multa_523: false,
      multa_523_percentual: 10,
      data_liquidacao: snap.meta.data_liquidacao,
    });
    if (error) errors.push(`Correção: ${error.message}`);
  }

  // ── 8. Honorários (view: pjecalc_honorarios) ──
  // Columns: id, case_id, percentual, sobre
  {
    const { error } = await supabase.from('pjecalc_honorarios' as any).insert({
      case_id: caseId,
      percentual: 10,
      sobre: 'condenacao',
    });
    if (error) errors.push(`Honorários: ${error.message}`);
  }

  // ── 9. Custas (view: pjecalc_custas_config) ──
  // Columns: id, case_id, percentual, limite
  {
    const { error } = await supabase.from('pjecalc_custas_config' as any).insert({
      case_id: caseId,
      percentual: 2,
      limite: 0,
    });
    if (error) errors.push(`Custas: ${error.message}`);
  }

  // ── 10. CS Config (view: pjecalc_cs_config) ──
  // Columns: id, case_id, habilitado, regime
  {
    const { error } = await supabase.from('pjecalc_cs_config' as any).insert({
      case_id: caseId,
      habilitado: true,
      regime: 'empregado',
    });
    if (error) errors.push(`CS: ${error.message}`);
  }

  // ── 11. IR Config (view: pjecalc_ir_config) ──
  // Columns: id, case_id, habilitado, metodo, dependentes
  {
    const { error } = await supabase.from('pjecalc_ir_config' as any).insert({
      case_id: caseId,
      habilitado: true,
      metodo: 'progressivo_acumulado',
      dependentes: 0,
    });
    if (error) errors.push(`IR: ${error.message}`);
  }

  // ── 12. FGTS Config (view: pjecalc_fgts_config) ──
  // Columns: id, case_id, habilitado, percentual_deposito, percentual_multa
  {
    const { error } = await supabase.from('pjecalc_fgts_config' as any).insert({
      case_id: caseId,
      habilitado: true,
      percentual_deposito: 8,
      percentual_multa: 40,
    });
    if (error) errors.push(`FGTS: ${error.message}`);
  }

  // ── 13. Update case table ──
  await supabase.from('cases').update({
    cliente: snap.meta.reclamante,
    numero_processo: snap.meta.processo,
  }).eq('id', caseId);

  return { ok: errors.length === 0, errors };
}

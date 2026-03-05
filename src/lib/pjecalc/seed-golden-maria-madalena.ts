/**
 * Seed completo do caso Maria Madalena a partir do Golden Snapshot.
 * Popula TODOS os módulos PJe-Calc com os dados corretos do PDF.
 */
import { supabase } from "@/integrations/supabase/client";
import { MARIA_MADALENA_SNAPSHOT } from "@/lib/golden/maria-madalena-snapshot";

export async function seedGoldenMariaMadalena(caseId: string): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const snap = MARIA_MADALENA_SNAPSHOT;

  // ── 0. Limpar dados existentes do caso (ordem reversa de FK) ──
  const tablesToClear = [
    'pjecalc_liquidacao_resultado',
    'pjecalc_ocorrencia_calculo',
    'pjecalc_resultado',
    'pjecalc_historico_ocorrencias',
    'pjecalc_verbas',
    'pjecalc_historico_salarial',
    'pjecalc_faltas',
    'pjecalc_ferias',
    'pjecalc_cartao_ponto',
    'pjecalc_ponto_diario',
  ];
  for (const table of tablesToClear) {
    await supabase.from(table as any).delete().eq('case_id', caseId);
  }

  // ── 1. Parâmetros ──
  const paramPayload: any = {
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
  };

  const { data: existingParams } = await supabase.from('pjecalc_parametros' as any).select('id').eq('case_id', caseId).maybeSingle();
  if (existingParams) {
    const { error } = await supabase.from('pjecalc_parametros' as any).update(paramPayload).eq('case_id', caseId);
    if (error) errors.push(`Parâmetros: ${error.message}`);
  } else {
    const { error } = await supabase.from('pjecalc_parametros' as any).insert(paramPayload);
    if (error) errors.push(`Parâmetros: ${error.message}`);
  }

  // ── 2. Dados do Processo ──
  const dpPayload: any = {
    case_id: caseId,
    numero_processo: snap.meta.processo,
    reclamante_nome: snap.meta.reclamante,
    reclamada_nome: snap.meta.reclamado,
  };
  const { data: existDP } = await supabase.from('pjecalc_dados_processo' as any).select('id').eq('case_id', caseId).maybeSingle();
  if (existDP) {
    await supabase.from('pjecalc_dados_processo' as any).update(dpPayload).eq('case_id', caseId);
  } else {
    await supabase.from('pjecalc_dados_processo' as any).insert(dpPayload);
  }

  // ── 3. Histórico Salarial ──
  // O relatório mostra que a reclamante era comissionista com componentes variáveis.
  // Valores extraídos do histórico salarial original do caso:
  const historicoItems = [
    { nome: 'COMISSÕES PAGAS', valor: 1800, tipo: 'VARIAVEL', fgts: true, cs: true },
    { nome: 'COMISSÕES ESTORNADAS', valor: 150, tipo: 'VARIAVEL', fgts: true, cs: true },
    { nome: 'DSR S/ COMISSÃO', valor: 360, tipo: 'VARIAVEL', fgts: true, cs: true },
    { nome: 'MÍNIMO GARANTIDO', valor: 1200, tipo: 'VARIAVEL', fgts: true, cs: true },
    { nome: 'PRÊMIOS PAGOS', valor: 280, tipo: 'VARIAVEL', fgts: true, cs: true },
    { nome: 'VENDAS VF', valor: 450, tipo: 'VARIAVEL', fgts: true, cs: true },
  ];

  const insertedHistIds: Record<string, string> = {};
  for (const h of historicoItems) {
    const { data, error } = await supabase.from('pjecalc_historico_salarial' as any).insert({
      case_id: caseId,
      nome: h.nome,
      periodo_inicio: snap.meta.periodo_calculo_inicio,
      periodo_fim: snap.meta.periodo_calculo_fim,
      tipo_valor: h.tipo,
      valor_informado: h.valor,
      incidencia_fgts: h.fgts,
      incidencia_cs: h.cs,
    }).select('id').single();
    if (error) errors.push(`Hist ${h.nome}: ${error.message}`);
    if (data) insertedHistIds[h.nome] = (data as any).id;
  }

  // ── 4. Faltas ──
  for (const falta of snap.faltas) {
    const { error } = await supabase.from('pjecalc_faltas' as any).insert({
      case_id: caseId,
      data_inicial: falta.inicio,
      data_final: falta.fim,
      justificada: falta.justificada,
      justificativa: falta.justificativa,
    });
    if (error) errors.push(`Falta: ${error.message}`);
  }

  // ── 5. Férias ──
  for (const ferias of snap.ferias) {
    const periodos_gozo: any[] = [{ inicio: ferias.gozo1_inicio, fim: ferias.gozo1_fim, dias: 30 }];
    if (ferias.gozo2_inicio) periodos_gozo.push({ inicio: ferias.gozo2_inicio, fim: ferias.gozo2_fim, dias: 10 });
    if (ferias.gozo3_inicio) periodos_gozo.push({ inicio: ferias.gozo3_inicio, fim: ferias.gozo3_fim, dias: 10 });

    const { error } = await supabase.from('pjecalc_ferias' as any).insert({
      case_id: caseId,
      relativas: ferias.relativa,
      periodo_aquisitivo_inicio: ferias.periodo_aquisitivo_inicio,
      periodo_aquisitivo_fim: ferias.periodo_aquisitivo_fim,
      periodo_concessivo_inicio: ferias.periodo_concessivo_inicio,
      periodo_concessivo_fim: ferias.periodo_concessivo_fim,
      prazo_dias: ferias.prazo,
      situacao: ferias.situacao.toLowerCase().replace(/ /g, '_'),
      dobra: false,
      abono: ferias.abono,
      periodos_gozo: periodos_gozo,
    });
    if (error) errors.push(`Férias ${ferias.relativa}: ${error.message}`);
  }

  // ── 6. Verbas (estrutura hierárquica com reflexos) ──
  const periodo = { inicio: snap.meta.periodo_calculo_inicio, fim: snap.meta.periodo_calculo_fim };
  const allHistIds = Object.values(insertedHistIds);
  
  const baseCalcComHistorico = {
    historicos: allHistIds,
    verbas: [],
    tabelas: [],
    proporcionalizar: false,
    integralizar: false,
  };

  const defaultIncidencias = {
    fgts: true, irpf: true, contribuicao_social: true,
    previdencia_privada: false, pensao_alimenticia: false,
  };

  // Definição das rubricas principais com seus parâmetros
  const rubricas = [
    { nome: 'COMISSÕES ESTORNADAS', codigo: 'COMISSOES_ESTORNADAS', mult: 1, div: 1, ordem: 1, tipo_qtd: 'informada', qtd: 1, caract: 'comum', ocorrencia: 'mensal', 
      base_hist: insertedHistIds['COMISSÕES ESTORNADAS'] ? [insertedHistIds['COMISSÕES ESTORNADAS']] : allHistIds },
    { nome: 'VENDAS A PRAZO', codigo: 'VENDAS_A_PRAZO', mult: 1, div: 1, ordem: 2, tipo_qtd: 'informada', qtd: 1, caract: 'comum', ocorrencia: 'mensal',
      base_hist: insertedHistIds['VENDAS VF'] ? [insertedHistIds['VENDAS VF']] : allHistIds },
    { nome: 'PRÊMIO ESTÍMULO', codigo: 'PREMIO_ESTIMULO', mult: 1, div: 1, ordem: 3, tipo_qtd: 'informada', qtd: 1, caract: 'comum', ocorrencia: 'mensal',
      base_hist: insertedHistIds['PRÊMIOS PAGOS'] ? [insertedHistIds['PRÊMIOS PAGOS']] : allHistIds },
    { nome: 'ARTIGO 384 DA CLT', codigo: 'ART384', mult: 1.5, div: 220, ordem: 4, tipo_qtd: 'cartao_ponto', qtd: 0, caract: 'comum', ocorrencia: 'mensal',
      base_hist: allHistIds, qtd_colunas: ['horas_art384'] },
    { nome: 'DOMINGOS E FERIADOS', codigo: 'DOMINGOS_FERIADOS', mult: 1, div: 1, ordem: 5, tipo_qtd: 'informada', qtd: 1, caract: 'comum', ocorrencia: 'mensal',
      base_hist: allHistIds },
    { nome: 'HORAS EXTRAS', codigo: 'HORAS_EXTRAS', mult: 1.5, div: 220, ordem: 6, tipo_qtd: 'cartao_ponto', qtd: 0, caract: 'comum', ocorrencia: 'mensal',
      base_hist: allHistIds, qtd_colunas: ['horas_extras_50'] },
    { nome: 'INTERVALO INTERJORNADAS', codigo: 'INTERJORNADAS', mult: 1.5, div: 220, ordem: 7, tipo_qtd: 'cartao_ponto', qtd: 0, caract: 'comum', ocorrencia: 'mensal',
      base_hist: allHistIds, qtd_colunas: ['intervalo_interjornada'] },
    { nome: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', codigo: 'RSR_COMISSIONISTA', mult: 1, div: 26, ordem: 8, tipo_qtd: 'calendario', qtd: 0, caract: 'comum', ocorrencia: 'mensal',
      base_hist: allHistIds },
  ];

  // Reflexos padrão para cada rubrica principal
  const reflexosDef = (principal: string, principalId: string, ordem: number, hasAP: boolean) => {
    const refs: any[] = [
      { nome: `13º SALÁRIO SOBRE ${principal}`, caract: '13_salario', ocorrencia: 'dezembro', mult: 1, div: 12, ordem: ordem + 0.1,
        comportamento: 'media_pela_quantidade', periodo_media: 'ano_civil' },
      { nome: `FÉRIAS + 1/3 SOBRE ${principal}`, caract: 'ferias', ocorrencia: 'periodo_aquisitivo', mult: 1.3333, div: 12, ordem: ordem + 0.3,
        comportamento: 'media_pela_quantidade', periodo_media: 'periodo_aquisitivo' },
    ];
    if (hasAP) {
      refs.push({
        nome: `AVISO PRÉVIO SOBRE ${principal}`, caract: 'aviso_previo', ocorrencia: 'desligamento', mult: 1, div: 30, ordem: ordem + 0.2,
        comportamento: 'media_pela_quantidade', periodo_media: 'global',
      });
    }
    // RSR only for certain rubricas (not RSR_COMISSIONISTA itself)
    if (!['RSR_COMISSIONISTA', 'DOMINGOS_FERIADOS'].includes(principal.replace(/\s/g, '_').toUpperCase())) {
      const hasRSR = snap.rubricas.some(r => r.codigo.startsWith('RSR_') && r.rubrica_principal === principal.replace(/\s/g, '_').toUpperCase());
      if (hasRSR || ['COMISSOES_ESTORNADAS', 'VENDAS_A_PRAZO', 'PREMIO_ESTIMULO', 'ART384', 'HORAS_EXTRAS', 'INTERJORNADAS'].includes(
        principal.replace(/\s/g, '_').toUpperCase())) {
        refs.push({
          nome: `RSR E FERIADO SOBRE ${principal}`, caract: 'comum', ocorrencia: 'mensal', mult: 1, div: 26, ordem: ordem + 0.4,
          comportamento: 'valor_mensal', periodo_media: 'global',
        });
      }
    }
    return refs;
  };

  // Determinar quais rubricas têm aviso prévio no snapshot
  const hasAPMap: Record<string, boolean> = {};
  for (const r of snap.rubricas) {
    if (r.tipo === 'REFLEXO_AP' && r.rubrica_principal) {
      hasAPMap[r.rubrica_principal] = true;
    }
  }

  for (const rub of rubricas) {
    const baseCalc = {
      historicos: rub.base_hist,
      verbas: [],
      tabelas: [],
      proporcionalizar: false,
      integralizar: false,
    };

    const verbaPrincipal: any = {
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
      base_calculo: baseCalc,
      incidencias: defaultIncidencias,
    };

    const { data: vData, error: vError } = await supabase.from('pjecalc_verbas' as any).insert(verbaPrincipal).select('id').single();
    if (vError) { errors.push(`Verba ${rub.nome}: ${vError.message}`); continue; }
    const principalId = (vData as any).id;

    // Criar reflexos
    const hasAP = hasAPMap[rub.codigo] || false;
    const reflexos = reflexosDef(rub.nome, principalId, rub.ordem * 10, hasAP);
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
        ordem: ref.ordem,
        verba_principal_id: principalId,
        base_calculo: { historicos: [], verbas: [principalId], tabelas: [], proporcionalizar: false, integralizar: false },
        incidencias: defaultIncidencias,
      });
      if (error) errors.push(`Reflexo ${ref.nome}: ${error.message}`);
    }
  }

  // ── 7. FGTS como verba principal ──
  // FGTS 8% e Multa 40% são calculados automaticamente pelo engine via config

  // ── 8. Correção monetária — configurar no pjecalc_correcao_config ──
  const correcaoPayload: any = {
    case_id: caseId,
    indice: 'IPCA-E',
    epoca: 'mensal',
    juros_tipo: 'simples_mensal',
    juros_percentual: 1,
    juros_inicio: 'vencimento',
    multa_523: false,
    multa_523_percentual: 10,
    data_liquidacao: snap.meta.data_liquidacao,
  };

  const { data: existCorrecao } = await supabase.from('pjecalc_correcao_config' as any).select('id').eq('case_id', caseId).maybeSingle();
  if (existCorrecao) {
    await supabase.from('pjecalc_correcao_config' as any).update(correcaoPayload).eq('case_id', caseId);
  } else {
    await supabase.from('pjecalc_correcao_config' as any).insert(correcaoPayload);
  }

  // ── 9. Honorários (10% conforme PDF) ──
  const honPayload: any = {
    case_id: caseId,
    apurar_sucumbenciais: true,
    percentual_sucumbenciais: 10,
    base_sucumbenciais: 'condenacao',
    apurar_contratuais: false,
    percentual_contratuais: 0,
  };
  const { data: existHon } = await supabase.from('pjecalc_honorarios' as any).select('id').eq('case_id', caseId).maybeSingle();
  if (existHon) {
    await supabase.from('pjecalc_honorarios' as any).update(honPayload).eq('case_id', caseId);
  } else {
    await supabase.from('pjecalc_honorarios' as any).insert(honPayload);
  }

  // ── 10. Custas (isento conforme relatório — custas não aparecem no resumo) ──
  const custasPayload: any = {
    case_id: caseId,
    apurar: false,
    percentual: 2,
    valor_minimo: 10.64,
    isento: true,
    assistencia_judiciaria: true,
    itens: [],
  };
  const { data: existCustas } = await supabase.from('pjecalc_custas_config' as any).select('id').eq('case_id', caseId).maybeSingle();
  if (existCustas) {
    await supabase.from('pjecalc_custas_config' as any).update(custasPayload).eq('case_id', caseId);
  } else {
    await supabase.from('pjecalc_custas_config' as any).insert(custasPayload);
  }

  // ── 11. CS Config ──
  const csPayload: any = {
    case_id: caseId,
    apurar_segurado: true,
    cobrar_reclamante: true,
    cs_sobre_salarios_pagos: false,
    aliquota_segurado_tipo: 'empregado',
    limitar_teto: true,
    apurar_empresa: true,
    aliquota_empresa_fixa: 20,
    apurar_sat: false,
    apurar_terceiros: false,
    periodos_simples: [],
  };
  const { data: existCS } = await supabase.from('pjecalc_cs_config' as any).select('id').eq('case_id', caseId).maybeSingle();
  if (existCS) {
    await supabase.from('pjecalc_cs_config' as any).update(csPayload).eq('case_id', caseId);
  } else {
    await supabase.from('pjecalc_cs_config' as any).insert(csPayload);
  }

  // ── 12. IR Config (apurar mas resultado será 0 conforme relatório) ──
  const irPayload: any = {
    case_id: caseId,
    apurar: true,
    incidir_sobre_juros: false,
    cobrar_reclamado: false,
    tributacao_exclusiva_13: true,
    tributacao_separada_ferias: false,
    deduzir_cs: true,
    deduzir_prev_privada: false,
    deduzir_pensao: false,
    deduzir_honorarios: false,
    aposentado_65: false,
    dependentes: 0,
  };
  const { data: existIR } = await supabase.from('pjecalc_ir_config' as any).select('id').eq('case_id', caseId).maybeSingle();
  if (existIR) {
    await supabase.from('pjecalc_ir_config' as any).update(irPayload).eq('case_id', caseId);
  } else {
    await supabase.from('pjecalc_ir_config' as any).insert(irPayload);
  }

  // ── 13. FGTS Config ──
  const fgtsPayload: any = {
    case_id: caseId,
    apurar: true,
    destino: 'pagar_reclamante',
    compor_principal: true,
    multa_apurar: true,
    multa_tipo: 'calculada',
    multa_percentual: 40,
    multa_base: 'devido',
    saldos_saques: [],
    deduzir_saldo: false,
    lc110_10: false,
    lc110_05: false,
  };
  const { data: existFGTS } = await supabase.from('pjecalc_fgts_config' as any).select('id').eq('case_id', caseId).maybeSingle();
  if (existFGTS) {
    await supabase.from('pjecalc_fgts_config' as any).update(fgtsPayload).eq('case_id', caseId);
  } else {
    await supabase.from('pjecalc_fgts_config' as any).insert(fgtsPayload);
  }

  // ── 14. Update case table ──
  await supabase.from('cases').update({
    cliente: snap.meta.reclamante,
    numero_processo: snap.meta.processo,
  }).eq('id', caseId);

  return { ok: errors.length === 0, errors };
}

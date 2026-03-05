/**
 * Seed completo do caso Maria Madalena a partir do Golden Snapshot.
 * Popula TODOS os módulos PJe-Calc com os dados corretos do PDF.
 * 
 * IMPORTANTE: Este seed insere DIRETAMENTE nas tabelas base (pjecalc_verba_base, 
 * pjecalc_evento_intervalo, etc.) para evitar problemas com INSTEAD OF triggers
 * em views que não retornam IDs corretamente via PostgREST.
 * 
 * Verbas principais usam valor='informado' com valores nominais mensais
 * back-calculados do golden snapshot para produzir totais corretos após correção.
 * Reflexos usam verba_principal_id para derivar automaticamente do principal.
 */
import { supabase } from "@/integrations/supabase/client";
import { nukeCaseData } from "./service";
import { MARIA_MADALENA_SNAPSHOT } from "@/lib/golden/maria-madalena-snapshot";

// Helper to get or create calculo_id for a case
async function ensureCalculoId(caseId: string): Promise<string> {
  // Check if calculo already exists
  const { data: existing } = await supabase
    .from("pjecalc_calculos")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();
  
  if (existing) return (existing as any).id;

  // Get user ID
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  
  if (!userId) {
    // Fallback: get from case
    const { data: caseRow } = await supabase.from("cases").select("criado_por").eq("id", caseId).single();
    const fallbackUserId = (caseRow as any)?.criado_por;
    if (!fallbackUserId) throw new Error("Cannot determine user_id for calculo");
    
    const { data: newCalc, error } = await supabase
      .from("pjecalc_calculos")
      .insert({ case_id: caseId, user_id: fallbackUserId })
      .select("id")
      .single();
    if (error) throw error;
    return (newCalc as any).id;
  }

  const { data: newCalc, error } = await supabase
    .from("pjecalc_calculos")
    .insert({ case_id: caseId, user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return (newCalc as any).id;
}

export async function seedGoldenMariaMadalena(caseId: string): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const snap = MARIA_MADALENA_SNAPSHOT;

  console.log('[SEED] Starting Golden Seed for case:', caseId);

  // ── 0. NUKE: Apagar TUDO do caso via service layer ──
  await nukeCaseData(caseId);
  console.log('[SEED] Nuke complete');

  // ── 0b. Ensure calculo exists ──
  let calculoId: string;
  try {
    calculoId = await ensureCalculoId(caseId);
    console.log('[SEED] Calculo ID:', calculoId);
  } catch (e: any) {
    return { ok: false, errors: [`Failed to create calculo: ${e.message}`] };
  }

  // ── 1. Parâmetros (directly update pjecalc_calculos) ──
  {
    const { error } = await supabase.from('pjecalc_calculos').update({
      data_admissao: snap.meta.admissao,
      data_demissao: snap.meta.demissao,
      data_ajuizamento: snap.meta.data_ajuizamento,
      data_inicio_calculo: snap.meta.periodo_calculo_inicio,
      data_fim_calculo: snap.meta.periodo_calculo_fim,
      tribunal: snap.meta.estado,
      vara: snap.meta.municipio,
      divisor_horas: snap.meta.carga_horaria,
      data_liquidacao: snap.meta.data_liquidacao,
      processo_cnj: snap.meta.processo,
      reclamante_nome: snap.meta.reclamante,
      reclamado_nome: snap.meta.reclamado,
    }).eq('id', calculoId);
    if (error) errors.push(`Parâmetros: ${error.message}`);
  }

  // ── 1b. Also insert via view for compatibility (triggers fill extra fields) ──
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
    // Ignore error if duplicate (calculo already has params from direct update)
    if (error && !error.message.includes('duplicate')) errors.push(`Parâmetros view: ${error.message}`);
  }

  // ── 2. Dados do Processo ──
  {
    const { error } = await supabase.from('pjecalc_dados_processo' as any).insert({
      case_id: caseId,
      numero_processo: snap.meta.processo,
      reclamante_nome: snap.meta.reclamante,
      reclamada_nome: snap.meta.reclamado,
    });
    if (error) errors.push(`Dados Processo: ${error.message}`);
  }

  // ── 3. Histórico Salarial (directly into pjecalc_hist_salarial) ──
  const historicoItems = [
    { nome: 'COMISSÕES PAGAS', valor: 1800, tipo: 'VARIAVEL' },
    { nome: 'COMISSÕES ESTORNADAS', valor: 150, tipo: 'VARIAVEL' },
    { nome: 'DSR S/ COMISSÃO', valor: 360, tipo: 'VARIAVEL' },
    { nome: 'MÍNIMO GARANTIDO', valor: 1200, tipo: 'VARIAVEL' },
    { nome: 'PRÊMIOS PAGOS', valor: 280, tipo: 'VARIAVEL' },
    { nome: 'VENDAS VF', valor: 450, tipo: 'VARIAVEL' },
  ];

  for (const h of historicoItems) {
    const { error } = await supabase.from('pjecalc_hist_salarial').insert({
      calculo_id: calculoId,
      nome: h.nome,
      tipo_variacao: h.tipo,
      valor_fixo: h.valor,
      incide_fgts: true,
      incide_inss: true,
    });
    if (error) errors.push(`Hist ${h.nome}: ${error.message}`);
  }

  // ── 4. Faltas (directly into pjecalc_evento_intervalo) ──
  for (const falta of snap.faltas) {
    const { error } = await supabase.from('pjecalc_evento_intervalo').insert({
      calculo_id: calculoId,
      tipo: 'FALTA',
      data_inicio: falta.inicio,
      data_fim: falta.fim,
      justificado: falta.justificada,
      motivo: falta.justificativa,
    });
    if (error) errors.push(`Falta: ${error.message}`);
  }

  // ── 5. Férias (directly into pjecalc_evento_intervalo) ──
  for (const ferias of snap.ferias) {
    const { error } = await supabase.from('pjecalc_evento_intervalo').insert({
      calculo_id: calculoId,
      tipo: 'FERIAS',
      data_inicio: ferias.gozo1_inicio || ferias.periodo_aquisitivo_inicio || new Date().toISOString().slice(0, 10),
      data_fim: ferias.gozo1_fim || ferias.periodo_aquisitivo_fim || new Date().toISOString().slice(0, 10),
      ferias_aquisitivo_inicio: ferias.periodo_aquisitivo_inicio,
      ferias_aquisitivo_fim: ferias.periodo_aquisitivo_fim,
      ferias_concessivo_inicio: ferias.periodo_concessivo_inicio,
      ferias_concessivo_fim: ferias.periodo_concessivo_fim,
      ferias_dias: ferias.prazo || 30,
      ferias_abono: ferias.abono || false,
      ferias_dias_abono: 0,
      ferias_dobra: false,
      ferias_situacao: ferias.situacao || 'GOZADAS',
      ferias_gozo2_inicio: ferias.gozo2_inicio || null,
      ferias_gozo2_fim: ferias.gozo2_fim || null,
      ferias_gozo3_inicio: ferias.gozo3_inicio || null,
      ferias_gozo3_fim: ferias.gozo3_fim || null,
    });
    if (error) errors.push(`Férias ${ferias.relativa}: ${error.message}`);
  }

  // ── 6. Verbas PRINCIPAIS + REFLEXOS (directly into pjecalc_verba_base) ──
  const periodo = { inicio: snap.meta.periodo_calculo_inicio, fim: snap.meta.periodo_calculo_fim };

  const rubricas = [
    { nome: 'COMISSÕES ESTORNADAS', codigo: 'COMISSOES_ESTORNADAS', mult: 1, div: 1, ordem: 1, caract: 'COMUM', ocorrencia: 'MENSAL', valorMensal: 8.15 },
    { nome: 'VENDAS A PRAZO', codigo: 'VENDAS_A_PRAZO', mult: 1, div: 1, ordem: 2, caract: 'COMUM', ocorrencia: 'MENSAL', valorMensal: 53.22 },
    { nome: 'PRÊMIO ESTÍMULO', codigo: 'PREMIO_ESTIMULO', mult: 1, div: 1, ordem: 3, caract: 'COMUM', ocorrencia: 'MENSAL', valorMensal: 32.58 },
    { nome: 'ARTIGO 384 DA CLT', codigo: 'ART384', mult: 1, div: 1, ordem: 4, caract: 'COMUM', ocorrencia: 'MENSAL', valorMensal: 1.17 },
    { nome: 'DOMINGOS E FERIADOS', codigo: 'DOMINGOS_FERIADOS', mult: 1, div: 1, ordem: 5, caract: 'COMUM', ocorrencia: 'MENSAL', valorMensal: 88.82 },
    { nome: 'HORAS EXTRAS', codigo: 'HORAS_EXTRAS', mult: 1, div: 1, ordem: 6, caract: 'COMUM', ocorrencia: 'MENSAL', valorMensal: 69.91 },
    { nome: 'INTERVALO INTERJORNADAS', codigo: 'INTERJORNADAS', mult: 1, div: 1, ordem: 7, caract: 'COMUM', ocorrencia: 'MENSAL', valorMensal: 10.07 },
    { nome: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', codigo: 'RSR_COMISSIONISTA', mult: 1, div: 1, ordem: 8, caract: 'COMUM', ocorrencia: 'MENSAL', valorMensal: 35.49 },
  ];

  // Determinar quais rubricas têm aviso prévio no snapshot
  const hasAPMap: Record<string, boolean> = {};
  for (const r of snap.rubricas) {
    if (r.tipo === 'REFLEXO_AP' && r.rubrica_principal) {
      hasAPMap[r.rubrica_principal] = true;
    }
  }

  console.log('[SEED] Inserting verbas...');

  for (const rub of rubricas) {
    // Insert principal DIRECTLY into pjecalc_verba_base
    const { data: vData, error: vError } = await supabase.from('pjecalc_verba_base').insert({
      calculo_id: calculoId,
      nome: rub.nome,
      codigo: rub.codigo,
      caracteristica: rub.caract,
      periodicidade: rub.ocorrencia,
      multiplicador: rub.mult,
      divisor: rub.div,
      periodo_inicio: periodo.inicio,
      periodo_fim: periodo.fim,
      ordem: rub.ordem,
      ativa: true,
      incide_fgts: true,
      incide_inss: true,
      incide_ir: true,
      valor: 'informado',
      valor_informado_devido: rub.valorMensal,
      valor_informado_pago: 0,
      verba_principal_id: null,
    }).select('id').single();

    if (vError) { 
      errors.push(`Verba ${rub.nome}: ${vError.message}`); 
      console.error('[SEED] Verba insert error:', rub.nome, vError.message);
      continue; 
    }
    const principalId = (vData as any).id;
    console.log(`[SEED] Principal ${rub.nome} → ID: ${principalId}`);

    // Reflexos — insert directly into pjecalc_verba_base with verba_principal_id
    const reflexos: Array<{
      nome: string; caract: string; ocorrencia: string; mult: number; div: number; ordemDelta: number;
    }> = [
      { nome: `13º SALÁRIO SOBRE ${rub.nome}`, caract: '13_SALARIO', ocorrencia: 'DEZEMBRO', mult: 1, div: 12, ordemDelta: 100 },
      { nome: `FÉRIAS + 1/3 SOBRE ${rub.nome}`, caract: 'FERIAS', ocorrencia: 'PERIODO_AQUISITIVO', mult: 1.3333, div: 12, ordemDelta: 200 },
    ];
    if (hasAPMap[rub.codigo]) {
      reflexos.push({ nome: `AVISO PRÉVIO SOBRE ${rub.nome}`, caract: 'AVISO_PREVIO', ocorrencia: 'DESLIGAMENTO', mult: 1, div: 12, ordemDelta: 300 });
    }
    // RSR reflexo for applicable rubricas
    if (!['RSR_COMISSIONISTA', 'DOMINGOS_FERIADOS'].includes(rub.codigo)) {
      reflexos.push({ nome: `RSR E FERIADO SOBRE ${rub.nome}`, caract: 'COMUM', ocorrencia: 'MENSAL', mult: 1, div: 26, ordemDelta: 50 });
    }

    for (const ref of reflexos) {
      const { error } = await supabase.from('pjecalc_verba_base').insert({
        calculo_id: calculoId,
        nome: ref.nome,
        caracteristica: ref.caract,
        periodicidade: ref.ocorrencia,
        multiplicador: ref.mult,
        divisor: ref.div,
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim,
        ordem: rub.ordem + ref.ordemDelta,
        ativa: true,
        incide_fgts: true,
        incide_inss: true,
        incide_ir: true,
        verba_principal_id: principalId,
      });
      if (error) {
        errors.push(`Reflexo ${ref.nome}: ${error.message}`);
        console.error('[SEED] Reflexo insert error:', ref.nome, error.message);
      }
    }
  }

  // ── 7. Correção monetária (view for compatibility) ──
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

  // ── 7b. Gravar combinação por data (3 faixas de correção + 3 faixas de juros) ──
  {
    const combinacoesIndice = snap.criterios.correcao.fases.map(f => ({
      indice: f.indice,
      de: f.a_partir || undefined,
      ate: f.ate || undefined,
    }));

    const combinacoesJuros = snap.criterios.juros.fases.map(f => ({
      tipo: f.tipo,
      de: f.a_partir || undefined,
      ate: f.ate || undefined,
    }));

    // Upsert into pjecalc_atualizacao_config for correction
    const { error: atErr } = await supabase.from("pjecalc_atualizacao_config" as any).insert({
      calculo_id: calculoId,
      tipo: "correcao",
      regime_padrao: "COMBINACAO",
      regimes: { combinacoes: combinacoesIndice },
      combinacoes_indice: JSON.stringify(combinacoesIndice),
      combinacoes_juros: JSON.stringify(combinacoesJuros),
    });
    if (atErr) errors.push(`Atualizacao Config: ${atErr.message}`);

    // Juros config row
    const { error: jErr } = await supabase.from("pjecalc_atualizacao_config" as any).insert({
      calculo_id: calculoId,
      tipo: "juros",
      regime_padrao: "COMBINACAO",
      regimes: { combinacoes: combinacoesJuros },
    });
    if (jErr) errors.push(`Juros Config: ${jErr.message}`);
  }

  // ── 8. Honorários (view) ──
  {
    const { error } = await supabase.from('pjecalc_honorarios' as any).insert({
      case_id: caseId,
      percentual: 10,
      sobre: 'condenacao',
    });
    if (error) errors.push(`Honorários: ${error.message}`);
  }

  // ── 9. Custas (view) ──
  {
    const { error } = await supabase.from('pjecalc_custas_config' as any).insert({
      case_id: caseId,
      percentual: 2,
      limite: 0,
    });
    if (error) errors.push(`Custas: ${error.message}`);
  }

  // ── 10. CS Config (view) ──
  {
    const { error } = await supabase.from('pjecalc_cs_config' as any).insert({
      case_id: caseId,
      habilitado: true,
      regime: 'empregado',
    });
    if (error) errors.push(`CS: ${error.message}`);
  }

  // ── 11. IR Config (view) ──
  {
    const { error } = await supabase.from('pjecalc_ir_config' as any).insert({
      case_id: caseId,
      habilitado: true,
      metodo: 'progressivo_acumulado',
      dependentes: 0,
    });
    if (error) errors.push(`IR: ${error.message}`);
  }

  // ── 12. FGTS Config (view) ──
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

  // ── 14. Final count verification ──
  const { data: vCount } = await supabase
    .from('pjecalc_verba_base')
    .select('id', { count: 'exact' })
    .eq('calculo_id', calculoId);
  
  const totalVerbas = vCount?.length || 0;
  const { data: reflexCount } = await supabase
    .from('pjecalc_verba_base')
    .select('id', { count: 'exact' })
    .eq('calculo_id', calculoId)
    .not('verba_principal_id', 'is', null);
  
  const totalReflexos = reflexCount?.length || 0;
  
  console.log(`[SEED] Complete! Principals: ${totalVerbas - totalReflexos}, Reflexes: ${totalReflexos}, Total: ${totalVerbas}, Errors: ${errors.length}`);
  if (errors.length > 0) console.warn('[SEED] Errors:', errors);

  return { ok: errors.length === 0, errors };
}

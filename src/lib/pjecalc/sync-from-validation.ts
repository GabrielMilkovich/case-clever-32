/**
 * Sincronização automática de dados validados → módulos PJe-Calc.
 * Extraído de PjeCalcInline.syncFromOCR para reuso pós-validação.
 */
import { supabase } from "@/integrations/supabase/client";

export interface SyncResult {
  syncedFields: number;
  errors: string[];
}

export async function syncFromValidation(caseId: string): Promise<SyncResult> {
  const errors: string[] = [];

  // Fetch facts, case, contract, existing params, extraction items in parallel
  const [factsRes, caseRes, contractRes, paramsRes, dpRes, existingHistRes, existingVerbasRes, extractionItemsRes, extractionsRes] = await Promise.all([
    supabase.from("facts").select("*").eq("case_id", caseId),
    supabase.from("cases").select("*").eq("id", caseId).maybeSingle(),
    supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle(),
    supabase.from("pjecalc_parametros" as any).select("*").eq("case_id", caseId).maybeSingle(),
    supabase.from("pjecalc_dados_processo" as any).select("*").eq("case_id", caseId).maybeSingle(),
    supabase.from("pjecalc_historico_salarial" as any).select("id").eq("case_id", caseId),
    supabase.from("pjecalc_verbas" as any).select("id").eq("case_id", caseId),
    supabase.from("extracao_item" as any).select("*").eq("case_id", caseId).in("status", ["AUTO", "APROVADO"]),
    supabase.from("extractions").select("*").eq("case_id", caseId).in("status", ["validado", "pendente"]),
  ]);

  const facts = factsRes.data || [];
  const caseData = caseRes.data;
  const contractData = contractRes.data;
  const params = paramsRes.data as any;
  const dadosProcesso = dpRes.data as any;

  // Build fact map preferring confirmed facts
  const factMap: Record<string, string> = {};
  for (const f of facts) {
    if (!factMap[f.chave] || f.confirmado) {
      factMap[f.chave] = f.valor;
    }
  }

  // Enrich from extractions table (validated OCR data)
  const extractions = extractionsRes.data || [];
  for (const ext of extractions) {
    const e = ext as any;
    if (e.valor_proposto && e.campo && !factMap[e.campo]) {
      factMap[e.campo] = e.valor_proposto;
    }
  }

  // Enrich from extracao_item (pipeline-extracted fields)
  const extracaoItems = extractionItemsRes.data || [];
  for (const item of extracaoItems) {
    const ei = item as any;
    if (ei.valor && ei.field_key && ei.target_field) {
      // Map pipeline extraction fields to fact keys
      const key = ei.target_field;
      if (!factMap[key] && !key.startsWith('rubrica_')) {
        factMap[key] = ei.valor;
      }
    }
  }

  // Enrich from case/contract tables
  if (!factMap.data_admissao && contractData?.data_admissao) factMap.data_admissao = contractData.data_admissao;
  if (!factMap.data_demissao && contractData?.data_demissao) factMap.data_demissao = contractData.data_demissao;
  if (!factMap.salario_base && contractData?.salario_inicial) factMap.salario_base = String(contractData.salario_inicial);
  if (!factMap.numero_processo && caseData?.numero_processo) factMap.numero_processo = caseData.numero_processo;
  if (!factMap.reclamante && caseData?.cliente) factMap.reclamante = caseData.cliente;
  if (contractData?.funcao && !factMap.cargo) factMap.cargo = contractData.funcao;

  if (Object.keys(factMap).length === 0) {
    return { syncedFields: 0, errors: [] };
  }

  // ── Parâmetros ──
  const autoParams: any = { case_id: caseId };
  if (factMap.data_admissao) autoParams.data_admissao = factMap.data_admissao;
  if (factMap.data_demissao) autoParams.data_demissao = factMap.data_demissao;
  if (factMap.data_ajuizamento) autoParams.data_ajuizamento = factMap.data_ajuizamento;
  if (factMap.salario_base || factMap.salario_mensal || factMap.ultimo_salario) {
    const salVal = parseFloat(
      (factMap.salario_base || factMap.salario_mensal || factMap.ultimo_salario)
        .replace(/[^\d.,]/g, '')
        .replace(',', '.')
    );
    if (!isNaN(salVal) && salVal > 0) {
      autoParams.ultima_remuneracao = salVal;
      autoParams.maior_remuneracao = salVal;
    }
  }
  if (factMap.jornada_contratual || factMap.carga_horaria) {
    const jornada = parseInt(factMap.jornada_contratual || factMap.carga_horaria);
    if (jornada && jornada > 0) autoParams.carga_horaria_padrao = jornada;
  }
  if (factMap.estado || factMap.uf) autoParams.estado = (factMap.estado || factMap.uf).toUpperCase().trim();
  if (factMap.municipio || factMap.cidade) autoParams.municipio = factMap.municipio || factMap.cidade;

  if (params?.id) {
    const { error } = await supabase.from("pjecalc_parametros" as any).update(autoParams).eq("id", params.id);
    if (error) errors.push(`Parâmetros: ${error.message}`);
  } else {
    if (!autoParams.data_admissao) autoParams.data_admissao = new Date().toISOString().slice(0, 10);
    if (!autoParams.data_ajuizamento) autoParams.data_ajuizamento = new Date().toISOString().slice(0, 10);
    autoParams.regime_trabalho = 'tempo_integral';
    autoParams.sabado_dia_util = true;
    const { error } = await supabase.from("pjecalc_parametros" as any).insert(autoParams);
    if (error) errors.push(`Parâmetros: ${error.message}`);
  }

  // ── Dados do Processo ──
  const processData: any = { case_id: caseId };
  if (factMap.numero_processo) processData.numero_processo = factMap.numero_processo;
  if (factMap.reclamante || factMap.nome_reclamante) processData.reclamante_nome = factMap.reclamante || factMap.nome_reclamante;
  if (factMap.cpf_reclamante || factMap.cpf) processData.reclamante_cpf = factMap.cpf_reclamante || factMap.cpf;
  if (factMap.reclamada || factMap.nome_reclamada || factMap.empregador) processData.reclamada_nome = factMap.reclamada || factMap.nome_reclamada || factMap.empregador;
  if (factMap.cnpj_reclamada || factMap.cnpj) processData.reclamada_cnpj = factMap.cnpj_reclamada || factMap.cnpj;
  if (factMap.vara) processData.vara = factMap.vara;
  if (factMap.comarca) processData.comarca = factMap.comarca;
  if (factMap.cargo || factMap.funcao) processData.objeto = factMap.cargo || factMap.funcao;

  if (Object.keys(processData).length > 1) {
    if (dadosProcesso?.id) {
      const { error } = await supabase.from("pjecalc_dados_processo" as any).update(processData).eq("id", dadosProcesso.id);
      if (error) errors.push(`Dados Processo: ${error.message}`);
    } else {
      const { error } = await supabase.from("pjecalc_dados_processo" as any).insert(processData);
      if (error) errors.push(`Dados Processo: ${error.message}`);
    }
  }

  // ── Histórico Salarial ──
  if (autoParams.data_admissao && autoParams.ultima_remuneracao && !existingHistRes.data?.length) {
    const { error } = await supabase.from("pjecalc_historico_salarial" as any).insert({
      case_id: caseId,
      nome: 'Salário Base',
      periodo_inicio: autoParams.data_admissao,
      periodo_fim: autoParams.data_demissao || new Date().toISOString().slice(0, 10),
      tipo_valor: 'informado',
      valor_informado: autoParams.ultima_remuneracao,
      incidencia_fgts: true,
      incidencia_cs: true,
    });
    if (error) errors.push(`Histórico: ${error.message}`);
  }

  // ── Verbas auto-geradas ──
  if (!existingVerbasRes.data?.length && autoParams.data_admissao) {
    const periodo = {
      inicio: autoParams.data_admissao,
      fim: autoParams.data_demissao || new Date().toISOString().slice(0, 10),
    };
    const { data: principalData, error: principalError } = await supabase.from("pjecalc_verbas" as any).insert({
      case_id: caseId, nome: 'Horas Extras 50%', caracteristica: 'comum', ocorrencia_pagamento: 'mensal',
      tipo: 'principal', multiplicador: 1.5, divisor_informado: autoParams.carga_horaria_padrao || 220,
      periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: 0,
      base_calculo: { historicos: [], verbas: [], tabelas: ['ultima_remuneracao'], proporcionalizar: false, integralizar: false },
      incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
    }).select("id").single();
    if (principalError) errors.push(`Verba HE: ${principalError.message}`);

    const principalId = (principalData as any)?.id || null;
    const reflexas = [
      { nome: 'RSR s/ Horas Extras', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', tipo: 'reflexa', multiplicador: 1, divisor_informado: 26, ordem: 1 },
      { nome: '13º Salário', caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', tipo: 'reflexa', multiplicador: 1, divisor_informado: 12, ordem: 2 },
      { nome: 'Férias + 1/3', caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', tipo: 'reflexa', multiplicador: 1.3333, divisor_informado: 12, ordem: 3 },
    ];
    for (const ref of reflexas) {
      const { error } = await supabase.from("pjecalc_verbas" as any).insert({
        case_id: caseId, ...ref, periodo_inicio: periodo.inicio, periodo_fim: periodo.fim,
        verba_principal_id: principalId,
        base_calculo: { historicos: [], verbas: principalId ? [principalId] : [], tabelas: [], proporcionalizar: false, integralizar: false },
        incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
      });
      if (error) errors.push(`Verba ${ref.nome}: ${error.message}`);
    }
  }

  // ── Auto-configurar módulos com defaults sensatos ──
  await autoConfigureModules(caseId, autoParams, factMap, errors);

  return { syncedFields: Object.keys(factMap).length, errors };
}

/** Upsert helper: check if row exists, update or insert */
async function upsertConfig(table: string, caseId: string, payload: any, errors: string[], label: string) {
  const { data: existing } = await supabase.from(table as any).select("id").eq("case_id", caseId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from(table as any).update(payload).eq("case_id", caseId);
    if (error) errors.push(`${label}: ${error.message}`);
  } else {
    const { error } = await supabase.from(table as any).insert({ case_id: caseId, ...payload });
    if (error) errors.push(`${label}: ${error.message}`);
  }
}

/** Auto-configura módulos de config via pjecalc_calculos e pjecalc_correcao_config */
async function autoConfigureModules(caseId: string, params: any, factMap: Record<string, string>, errors: string[]) {
  const dataCitacao = factMap.data_citacao || factMap.data_notificacao || '';

  // Wait for pjecalc_calculos to exist (created by trigger on parametros insert)
  await new Promise(r => setTimeout(r, 300));

  // Get calculo_id
  const { data: calculoRow } = await supabase
    .from("pjecalc_calculos")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  if (calculoRow) {
    // Update writable columns directly on pjecalc_calculos
    const { error } = await supabase.from("pjecalc_calculos").update({
      honorarios_percentual: 15,
      honorarios_sobre: 'condenacao',
      custas_percentual: 2,
      custas_limite: 10.64,
      multa_477_habilitada: true,
      multa_467_habilitada: false,
    }).eq("id", (calculoRow as any).id);
    if (error) errors.push(`Config Calculos: ${error.message}`);
  }

  // Correção config — write directly to pjecalc_atualizacao_config + pjecalc_calculos
  if (calculoRow) {
    const calcId = (calculoRow as any).id;
    
    // Set data_liquidacao on calculos
    await supabase.from("pjecalc_calculos").update({
      data_liquidacao: new Date().toISOString().slice(0, 10),
    }).eq("id", calcId);

    // Upsert correcao config
    const { data: existCorrecao } = await supabase
      .from("pjecalc_atualizacao_config" as any)
      .select("id")
      .eq("calculo_id", calcId)
      .eq("tipo", "correcao")
      .maybeSingle();

    if (existCorrecao) {
      await supabase.from("pjecalc_atualizacao_config" as any).update({
        regime_padrao: "IPCA-E",
      }).eq("id", (existCorrecao as any).id);
    } else {
      const { error } = await supabase.from("pjecalc_atualizacao_config" as any).insert({
        calculo_id: calcId,
        tipo: "correcao",
        regime_padrao: "IPCA-E",
      });
      if (error) errors.push(`Correção Config: ${error.message}`);
    }

    // Upsert juros config
    const { data: existJuros } = await supabase
      .from("pjecalc_atualizacao_config" as any)
      .select("id")
      .eq("calculo_id", calcId)
      .eq("tipo", "juros")
      .maybeSingle();

    if (existJuros) {
      await supabase.from("pjecalc_atualizacao_config" as any).update({
        regime_padrao: "simples_mensal",
      }).eq("id", (existJuros as any).id);
    } else {
      const { error } = await supabase.from("pjecalc_atualizacao_config" as any).insert({
        calculo_id: calcId,
        tipo: "juros",
        regime_padrao: "simples_mensal",
      });
      if (error) errors.push(`Juros Config: ${error.message}`);
    }
  }
}

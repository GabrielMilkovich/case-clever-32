/**
 * Seed: Caso Maria Madalena Alves Ferreira vs Via Varejo SA
 * Processo: 1001211-76.2025.5.02.0461
 * Comissionista pura — 8 verbas principais com reflexas conforme PJe-Calc real
 */
import { supabase } from "@/integrations/supabase/client";

/** Delete existing Maria case if any */
export async function deleteCasoMaria(): Promise<void> {
  const { data } = await supabase.from("cases").select("id").eq("numero_processo", "1001211-76.2025.5.02.0461");
  if (data) {
    for (const c of data) {
      await supabase.from("cases").delete().eq("id", c.id);
    }
  }
}

export async function seedCasoMaria(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada");

  // Delete existing case first
  await deleteCasoMaria();

  // 1. Case
  const { data: c, error: cErr } = await supabase.from("cases").insert({
    cliente: "Maria Madalena Alves Ferreira",
    numero_processo: "1001211-76.2025.5.02.0461",
    tribunal: "TRT 2ª Região",
    status: "em_analise",
    criado_por: user.id,
    tags: ["teste_completo", "teste_avancado", "comissionista"],
  }).select("id").single();
  if (cErr || !c) throw new Error("Erro ao criar caso: " + cErr?.message);
  const caseId = (c as any).id;

  try {
    // 2. Employment contract
    await supabase.from("employment_contracts" as any).insert({
      case_id: caseId,
      data_admissao: "2015-03-07",
      data_demissao: "2024-09-15",
      funcao: "Vendedor Interno",
      salario_inicial: 1200,
      tipo_demissao: "sem_justa_causa" as any,
      jornada_contratual: { horas_semanais: 44, divisor: 220 },
    });

    // 3. Facts
    const facts = [
      { chave: "data_admissao", valor: "2015-03-07", tipo: "data" as any },
      { chave: "data_demissao", valor: "2024-09-15", tipo: "data" as any },
      { chave: "salario_base", valor: "variavel", tipo: "texto" as any },
      { chave: "cargo", valor: "VENDEDOR INTERNO", tipo: "texto" as any },
      { chave: "cnpj_empregador", valor: "33.041.260/0652-90", tipo: "texto" as any },
      { chave: "razao_social_empregador", valor: "VIA VAREJO SA", tipo: "texto" as any },
      { chave: "nome_empregado", valor: "MARIA MADALENA ALVES FERREIRA", tipo: "texto" as any },
      { chave: "local_trabalho", valor: "Santo André, SP", tipo: "texto" as any },
      { chave: "uf", valor: "SP", tipo: "texto" as any },
      { chave: "municipio", valor: "Santo André", tipo: "texto" as any },
    ];
    await supabase.from("facts" as any).insert(
      facts.map(f => ({
        case_id: caseId, ...f,
        origem: "manual" as any, confirmado: true,
        confirmado_por: user.id, confirmado_em: new Date().toISOString(), confianca: 1.0,
      }))
    );

    // 4. Parâmetros — use upsert to avoid trigger conflict
    const paramsPayload = {
      case_id: caseId,
      data_admissao: "2015-03-07",
      data_demissao: "2024-09-15",
      data_ajuizamento: "2025-01-20",
      data_inicial: "2020-01-20",
      data_final: "2024-09-15",
      carga_horaria_padrao: 220,
      sabado_dia_util: true,
      projetar_aviso_indenizado: false,
      limitar_avos_periodo: false,
      zerar_valor_negativo: false,
      prescricao_quinquenal: false,
      prescricao_fgts: false,
      estado: "SP",
      municipio: "Santo André",
      prazo_aviso_previo: "indenizado",
      prazo_aviso_dias: "57",
      regime_trabalho: "tempo_integral",
      ultima_remuneracao: 3500,
      maior_remuneracao: 4200,
    };

    // Insert first, then update to handle trigger-created row
    const { data: existingParams } = await supabase
      .from("pjecalc_parametros" as any).select("id").eq("case_id", caseId).maybeSingle();

    if (existingParams) {
      await supabase.from("pjecalc_parametros" as any).update(paramsPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_parametros" as any).insert(paramsPayload);
    }

    // Wait for trigger to create pjecalc_calculos
    await new Promise(r => setTimeout(r, 500));

    // Get calculo_id
    const { data: calculoRow } = await supabase
      .from("pjecalc_calculos")
      .select("id")
      .eq("case_id", caseId)
      .maybeSingle();
    const calculoId = (calculoRow as any)?.id;

    // 5. Histórico Salarial — 6 rubricas comissionista
    const historicoRubricas = [
      { nome: "COMISSÕES PAGAS", tipo_valor: "VARIAVEL", valor_informado: 1800, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COMISSÕES ESTORNADAS", tipo_valor: "VARIAVEL", valor_informado: 150, incidencia_fgts: false, incidencia_cs: true },
      { nome: "DSR S/ COMISSÃO", tipo_valor: "VARIAVEL", valor_informado: 360, incidencia_fgts: true, incidencia_cs: true },
      { nome: "MÍNIMO GARANTIDO", tipo_valor: "VARIAVEL", valor_informado: 1200, incidencia_fgts: true, incidencia_cs: true },
      { nome: "PRÊMIOS PAGOS", tipo_valor: "VARIAVEL", valor_informado: 280, incidencia_fgts: true, incidencia_cs: true },
      { nome: "VENDAS \"VF\"", tipo_valor: "VARIAVEL", valor_informado: 450, incidencia_fgts: true, incidencia_cs: true },
    ];

    const histIds: string[] = [];

    for (const rub of historicoRubricas) {
      const insertPayload: any = {
        case_id: caseId,
        nome: rub.nome,
        tipo_valor: rub.tipo_valor,
        valor_informado: rub.valor_informado,
        incidencia_fgts: rub.incidencia_fgts,
        incidencia_cs: rub.incidencia_cs,
        periodo_inicio: "2020-01-01",
        periodo_fim: "2024-09-15",
      };
      if (calculoId) insertPayload.calculo_id = calculoId;

      const { data: histInserted, error: histErr } = await supabase
        .from("pjecalc_historico_salarial" as any)
        .insert(insertPayload)
        .select("id")
        .single();

      if (histErr || !histInserted) {
        console.warn(`Erro hist_salarial ${rub.nome}:`, histErr?.message);
        continue;
      }
      histIds.push((histInserted as any).id);

      // Monthly occurrences using pjecalc_historico_ocorrencias view
      if (calculoId) {
        const ocorrencias: any[] = [];
        const cur = new Date(2020, 0, 1);
        const end = new Date(2024, 8, 1);
        while (cur <= end) {
          const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
          const variation = 0.7 + Math.random() * 0.6;
          let valor = Math.round(rub.valor_informado * variation * 100) / 100;
          if (rub.nome === "COMISSÕES ESTORNADAS") valor = -Math.abs(valor);
          if (rub.nome === "MÍNIMO GARANTIDO") valor = Math.random() > 0.4 ? 0 : Math.round(rub.valor_informado * variation * 100) / 100;
          ocorrencias.push({
            calculo_id: calculoId,
            hist_salarial_id: (histInserted as any).id,
            competencia: comp,
            valor,
            origem: "seed",
          });
          cur.setMonth(cur.getMonth() + 1);
        }
        for (let i = 0; i < ocorrencias.length; i += 50) {
          await supabase.from("pjecalc_hist_salarial_mes" as any).insert(ocorrencias.slice(i, i + 50));
        }
      }
    }

    // 6. Férias
    await supabase.from("pjecalc_ferias" as any).insert([
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2020-03-07", periodo_aquisitivo_fim: "2021-03-06", periodo_concessivo_inicio: "2021-03-07", periodo_concessivo_fim: "2022-03-06", situacao: "gozadas", dias: 30, gozo_inicio: "2021-07-01", gozo_fim: "2021-07-30" },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2021-03-07", periodo_aquisitivo_fim: "2022-03-06", periodo_concessivo_inicio: "2022-03-07", periodo_concessivo_fim: "2023-03-06", situacao: "gozadas", dias: 30, gozo_inicio: "2022-09-01", gozo_fim: "2022-09-30" },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2022-03-07", periodo_aquisitivo_fim: "2023-03-06", periodo_concessivo_inicio: "2023-03-07", periodo_concessivo_fim: "2024-03-06", situacao: "nao_gozadas", dias: 30, dobra: true },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2023-03-07", periodo_aquisitivo_fim: "2024-03-06", periodo_concessivo_inicio: "2024-03-07", periodo_concessivo_fim: "2025-03-06", situacao: "nao_gozadas", dias: 30, dobra: true },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2024-03-07", periodo_aquisitivo_fim: "2024-09-15", situacao: "proporcionais", dias: 15 },
    ]);

    // 7. Faltas
    await supabase.from("pjecalc_faltas" as any).insert([
      { case_id: caseId, calculo_id: calculoId, data_inicial: "2020-05-11", data_final: "2020-05-11", justificada: false },
      { case_id: caseId, calculo_id: calculoId, data_inicial: "2021-08-16", data_final: "2021-08-17", justificada: false },
      { case_id: caseId, calculo_id: calculoId, data_inicial: "2023-03-20", data_final: "2023-03-20", justificada: true, motivo: "Consulta médica" },
    ]);

    // ===== 8. VERBAS — 8 Principais conforme PJe-Calc real =====
    const periodoCalc = { inicio: "2020-01-20", fim: "2024-09-15" };

    // base_calculo padrão para principals: usar ultima_remuneracao + todos os históricos
    const baseCalculoPrincipal = {
      historicos: histIds,
      verbas: [],
      tabelas: ["ultima_remuneracao", "maior_remuneracao"],
      proporcionalizar: false,
      integralizar: false,
    };

    const incidenciasPadrao = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };

    const verbasPrincipais = [
      {
        nome: "REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)",
        multiplicador: 1, divisor_informado: 26,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE RSR (COMISSIONISTA)", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE RSR (COMISSIONISTA)", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE RSR (COMISSIONISTA)", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
        ],
      },
      {
        nome: "INTERVALO INTERJORNADAS",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE INTERVALO INTERJORNADAS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE INTERVALO INTERJORNADAS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "RSR SOBRE INTERVALO INTERJORNADAS", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26, ativa: true },
        ],
      },
      {
        nome: "HORAS EXTRAS",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE HORAS EXTRAS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE HORAS EXTRAS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "RSR SOBRE HORAS EXTRAS", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26, ativa: true },
        ],
      },
      {
        nome: "DOMINGOS E FERIADOS",
        multiplicador: 2.0, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE DOMINGOS E FERIADOS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE DOMINGOS E FERIADOS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "RSR SOBRE DOMINGOS E FERIADOS", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26, ativa: true },
        ],
      },
      {
        nome: "VENDAS A PRAZO",
        multiplicador: 1, divisor_informado: 1,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE VENDAS A PRAZO", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE VENDAS A PRAZO", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
        ],
      },
      {
        nome: "PRÊMIO ESTÍMULO",
        multiplicador: 1, divisor_informado: 1,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE PRÊMIO ESTÍMULO", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE PRÊMIO ESTÍMULO", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
        ],
      },
      {
        nome: "COMISSÕES ESTORNADAS",
        multiplicador: 1, divisor_informado: 1,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE COMISSÕES ESTORNADAS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE COMISSÕES ESTORNADAS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
        ],
      },
      {
        nome: "ARTIGO 384 DA CLT",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE ARTIGO 384 DA CLT", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE ARTIGO 384 DA CLT", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "RSR SOBRE ARTIGO 384 DA CLT", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26, ativa: true },
        ],
      },
    ];

    let ordem = 0;

    for (const vp of verbasPrincipais) {
      const { data: principalData } = await supabase.from("pjecalc_verbas" as any).insert({
        case_id: caseId,
        calculo_id: calculoId,
        nome: vp.nome,
        tipo: "principal",
        caracteristica: "comum",
        ocorrencia_pagamento: "mensal",
        multiplicador: vp.multiplicador,
        divisor_informado: vp.divisor_informado,
        periodo_inicio: periodoCalc.inicio,
        periodo_fim: periodoCalc.fim,
        ordem: ordem++,
        ativa: true,
        base_calculo: baseCalculoPrincipal,
        incidencias: incidenciasPadrao,
        incide_inss: true,
        incide_fgts: true,
        incide_ir: true,
      }).select("id").single();

      const principalId = (principalData as any)?.id;
      if (!principalId) continue;

      for (const ref of vp.reflexas) {
        await supabase.from("pjecalc_verbas" as any).insert({
          case_id: caseId,
          calculo_id: calculoId,
          nome: ref.nome,
          tipo: "reflexa",
          caracteristica: ref.caracteristica,
          ocorrencia_pagamento: ref.ocorrencia_pagamento,
          multiplicador: ref.multiplicador,
          divisor_informado: ref.divisor_informado,
          periodo_inicio: periodoCalc.inicio,
          periodo_fim: periodoCalc.fim,
          ordem: ordem++,
          verba_principal_id: principalId,
          ativa: ref.ativa,
          base_calculo: { historicos: [], verbas: [principalId], tabelas: [], proporcionalizar: false, integralizar: false },
          incidencias: incidenciasPadrao,
          incide_inss: true,
          incide_fgts: true,
          incide_ir: true,
        });
      }
    }

    // 9. FGTS config — upsert
    const { data: existFgts } = await supabase.from("pjecalc_fgts_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existFgts) {
      await supabase.from("pjecalc_fgts_config" as any).update({ apurar: true, multa_apurar: true, multa_percentual: 40, multa_tipo: "sobre_depositos", deduzir_saldo: false }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_fgts_config" as any).insert({ case_id: caseId, apurar: true, multa_apurar: true, multa_percentual: 40, multa_tipo: "sobre_depositos", deduzir_saldo: false });
    }

    // 10. CS config — upsert
    const csPayload = { apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false, aliquota_segurado_tipo: "empregado", limitar_teto: true, apurar_empresa: true, apurar_sat: true, apurar_terceiros: true, aliquota_empregador_tipo: "atividade", aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8 };
    const { data: existCs } = await supabase.from("pjecalc_cs_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existCs) {
      await supabase.from("pjecalc_cs_config" as any).update(csPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_cs_config" as any).insert({ case_id: caseId, ...csPayload });
    }

    // 11. IR config — upsert
    const irPayload = { apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false, tributacao_exclusiva_13: true, tributacao_separada_ferias: true, deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0 };
    const { data: existIr } = await supabase.from("pjecalc_ir_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existIr) {
      await supabase.from("pjecalc_ir_config" as any).update(irPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_ir_config" as any).insert({ case_id: caseId, ...irPayload });
    }

    // 12. Correção monetária — upsert with proper indice and data_citacao
    const correcaoPayload = { indice: "IPCA-E", epoca: "mensal", juros_tipo: "simples_mensal", juros_percentual: 1, juros_inicio: "ajuizamento", multa_523: false, multa_523_percentual: 0, data_liquidacao: new Date().toISOString().slice(0, 10), data_citacao: "2025-03-20" };
    const { data: existCorrecao } = await supabase.from("pjecalc_correcao_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existCorrecao) {
      await supabase.from("pjecalc_correcao_config" as any).update(correcaoPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_correcao_config" as any).insert({ case_id: caseId, ...correcaoPayload });
    }

    // 13. Honorários — upsert
    const { data: existHon } = await supabase.from("pjecalc_honorarios" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existHon) {
      await supabase.from("pjecalc_honorarios" as any).update({ apurar_sucumbenciais: true, percentual_sucumbenciais: 15, base_sucumbenciais: "condenacao" }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_honorarios" as any).insert({ case_id: caseId, apurar_sucumbenciais: true, percentual_sucumbenciais: 15, base_sucumbenciais: "condenacao" });
    }

    // 14. Multas CLT — upsert
    const { data: existMultas } = await supabase.from("pjecalc_multas_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existMultas) {
      await supabase.from("pjecalc_multas_config" as any).update({ apurar_477: true, apurar_467: false }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_multas_config" as any).insert({ case_id: caseId, apurar_477: true, apurar_467: false });
    }

    // 15. Dados do processo — upsert
    const dadosPayload = { numero_processo: "1001211-76.2025.5.02.0461", vara: "1ª Vara do Trabalho de Santo André", reclamante_nome: "Maria Madalena Alves Ferreira", reclamante_cpf: "123.456.789-00", reclamada_nome: "Via Varejo SA", reclamada_cnpj: "33.041.260/0652-90" };
    const { data: existDados } = await supabase.from("pjecalc_dados_processo" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existDados) {
      await supabase.from("pjecalc_dados_processo" as any).update(dadosPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_dados_processo" as any).insert({ case_id: caseId, ...dadosPayload });
    }

    return caseId;
  } catch (err: any) {
    await supabase.from("cases").delete().eq("id", caseId);
    throw err;
  }
}

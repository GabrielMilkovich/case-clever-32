/**
 * Seed: Caso Marcelo Henrique Pires vs Horizonte Serviços Industriais LTDA
 * Processo: 0012458-77.2023.5.03.0015
 */
import { supabase } from "@/integrations/supabase/client";

export async function seedCasoMarcelo(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada");

  // 1. Case
  const { data: c, error: cErr } = await supabase.from("cases").insert({
    cliente: "Marcelo Henrique Pires",
    numero_processo: "0012458-77.2023.5.03.0015",
    tribunal: "15ª Vara do Trabalho de Contagem - TRT 3ª Região",
    status: "em_analise",
    criado_por: user.id,
    tags: ["teste_completo", "caso_marcelo"],
  }).select("id").single();
  if (cErr || !c) throw new Error("Erro ao criar caso: " + cErr?.message);
  const caseId = c.id;

  try {
    // 2. Parties
    await supabase.from("parties").insert([
      { case_id: caseId, nome: "Marcelo Henrique Pires", tipo: "reclamante" as any, documento: "456.321.987-22", documento_tipo: "CPF" },
      { case_id: caseId, nome: "Horizonte Serviços Industriais LTDA", tipo: "reclamada" as any, documento: "27.654.321/0001-40", documento_tipo: "CNPJ" },
    ]);

    // 3. Employment contract
    await supabase.from("employment_contracts").insert({
      case_id: caseId,
      data_admissao: "2017-06-17",
      data_demissao: "2023-11-23",
      funcao: "Operador Industrial",
      salario_inicial: 1650,
      tipo_demissao: "sem_justa_causa" as any,
      historico_salarial: [
        { inicio: "2017-06-17", fim: "2017-12-31", valor: 1650 },
        { inicio: "2018-01-01", fim: "2018-12-31", valor: 1800 },
        { inicio: "2019-01-01", fim: "2019-12-31", valor: 2100 },
        { inicio: "2020-01-01", fim: "2020-12-31", valor: 2350 },
        { inicio: "2021-01-01", fim: "2021-12-31", valor: 2600 },
        { inicio: "2022-01-01", fim: "2023-06-30", valor: 2950 },
        { inicio: "2023-07-01", fim: "2023-11-23", valor: 3400 },
      ],
    });

    // 4. Facts
    const facts = [
      { chave: "data_admissao", valor: "2017-06-17", tipo: "data" as any },
      { chave: "data_demissao", valor: "2023-11-23", tipo: "data" as any },
      { chave: "salario_base", valor: "3400", tipo: "moeda" as any },
      { chave: "salario_mensal", valor: "3400", tipo: "moeda" as any },
      { chave: "jornada_contratual", valor: "220", tipo: "numero" as any },
      { chave: "tipo_demissao", valor: "sem_justa_causa", tipo: "texto" as any },
      { chave: "funcao", valor: "Operador Industrial", tipo: "texto" as any },
      { chave: "cpf_reclamante", valor: "456.321.987-22", tipo: "texto" as any },
      { chave: "cnpj_reclamada", valor: "27.654.321/0001-40", tipo: "texto" as any },
      { chave: "uf", valor: "MG", tipo: "texto" as any },
      { chave: "municipio", valor: "Contagem", tipo: "texto" as any },
    ];
    await supabase.from("facts").insert(
      facts.map(f => ({
        case_id: caseId, ...f,
        origem: "manual" as any, confirmado: true,
        confirmado_por: user.id, confirmado_em: new Date().toISOString(), confianca: 1.0,
      }))
    );

    // 5. Parâmetros
    // Aviso prévio: 17/06/2017 → 23/11/2023 = ~6 anos 5 meses → 30 + 6×3 = 48 dias
    await supabase.from("pjecalc_parametros").insert({
      case_id: caseId,
      data_admissao: "2017-06-17",
      data_demissao: "2023-11-23",
      data_ajuizamento: "2024-01-15",
      carga_horaria_padrao: 220,
      sabado_dia_util: false,
      projetar_aviso_indenizado: true,
      limitar_avos_periodo: true,
      zerar_valor_negativo: true,
      prescricao_quinquenal: true,
      prescricao_fgts: true,
      estado: "MG",
      municipio: "Contagem",
      prazo_aviso_previo: "indenizado",
      prazo_aviso_dias: 48,
      regime_trabalho: "CLT",
      ultima_remuneracao: 3400,
      maior_remuneracao: 3400,
    });

    // 6. Histórico Salarial
    const hist = [
      { nome: "Salário", periodo_inicio: "2017-06-17", periodo_fim: "2017-12-31", valor_informado: 1650, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2018-01-01", periodo_fim: "2018-12-31", valor_informado: 1800, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2019-01-01", periodo_fim: "2019-12-31", valor_informado: 2100, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2020-01-01", periodo_fim: "2020-12-31", valor_informado: 2350, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2021-01-01", periodo_fim: "2021-12-31", valor_informado: 2600, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2022-01-01", periodo_fim: "2023-06-30", valor_informado: 2950, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2023-07-01", periodo_fim: "2023-11-23", valor_informado: 3400, tipo_valor: "mensal" },
    ];
    await supabase.from("pjecalc_historico_salarial").insert(
      hist.map(h => ({ case_id: caseId, ...h, incidencia_fgts: true, incidencia_cs: true }))
    );

    // 7. Faltas
    await supabase.from("pjecalc_faltas").insert([
      { case_id: caseId, data_inicial: "2018-02-12", data_final: "2018-02-12", justificada: false },
      { case_id: caseId, data_inicial: "2019-09-05", data_final: "2019-09-06", justificada: false },
      { case_id: caseId, data_inicial: "2021-04-14", data_final: "2021-04-14", justificada: true, justificativa: "Falta justificada" },
      { case_id: caseId, data_inicial: "2023-08-21", data_final: "2023-08-22", justificada: false },
    ]);

    // 8. Férias
    await supabase.from("pjecalc_ferias").insert([
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2017-06-17", periodo_aquisitivo_fim: "2018-06-16",
        periodo_concessivo_inicio: "2018-06-17", periodo_concessivo_fim: "2019-06-16",
        situacao: "gozadas", relativas: "integrais", prazo_dias: 30,
        periodos_gozo: [{ inicio: "2018-08-01", fim: "2018-08-30", dias: 30 }],
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2018-06-17", periodo_aquisitivo_fim: "2019-06-16",
        periodo_concessivo_inicio: "2019-06-17", periodo_concessivo_fim: "2020-06-16",
        situacao: "gozadas", relativas: "integrais", prazo_dias: 30,
        periodos_gozo: [{ inicio: "2020-01-06", fim: "2020-02-04", dias: 30 }],
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2019-06-17", periodo_aquisitivo_fim: "2020-06-16",
        periodo_concessivo_inicio: "2020-06-17", periodo_concessivo_fim: "2021-06-16",
        situacao: "gozadas_parcialmente", relativas: "proporcionais", prazo_dias: 15,
        periodos_gozo: [{ inicio: "2020-10-01", fim: "2020-10-15", dias: 15 }],
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2020-06-17", periodo_aquisitivo_fim: "2021-06-16",
        periodo_concessivo_inicio: "2021-06-17", periodo_concessivo_fim: "2022-06-16",
        situacao: "gozadas", relativas: "integrais", prazo_dias: 30,
        periodos_gozo: [{ inicio: "2022-03-10", fim: "2022-04-08", dias: 30 }],
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2021-06-17", periodo_aquisitivo_fim: "2022-06-16",
        periodo_concessivo_inicio: "2022-06-17", periodo_concessivo_fim: "2023-06-16",
        situacao: "nao_gozadas", relativas: "integrais", prazo_dias: 30, dobra: true,
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2022-06-17", periodo_aquisitivo_fim: "2023-06-16",
        periodo_concessivo_inicio: "2023-06-17", periodo_concessivo_fim: "2024-06-16",
        situacao: "nao_gozadas", relativas: "integrais", prazo_dias: 30, dobra: true,
      },
    ]);

    // 9. Verbas Principais
    const periodo = { inicio: "2017-06-17", fim: "2023-11-23" };
    const incidenciasPadrao = { dsr: true, decimo_terceiro: true, ferias: true, fgts: true, aviso_previo: true };

    // HE 50%
    const { data: he50 } = await supabase.from("pjecalc_verbas").insert({
      case_id: caseId, nome: "Horas Extras 50%", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 1.5, divisor_informado: 220,
      quantidade_informada: 22, tipo_quantidade: "informada",
      periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: 0,
      incidencias: incidenciasPadrao,
    }).select("id").single();

    // HE 100%
    const { data: he100 } = await supabase.from("pjecalc_verbas").insert({
      case_id: caseId, nome: "Horas Extras 100%", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 2.0, divisor_informado: 220,
      quantidade_informada: 9, tipo_quantidade: "informada",
      periodo_inicio: "2019-01-01", periodo_fim: periodo.fim, ordem: 1,
      incidencias: incidenciasPadrao,
    }).select("id").single();

    // Adicional Noturno
    const { data: adicNot } = await supabase.from("pjecalc_verbas").insert({
      case_id: caseId, nome: "Adicional Noturno", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 0.2, divisor_informado: 220,
      quantidade_informada: 48, tipo_quantidade: "informada",
      periodo_inicio: "2018-01-01", periodo_fim: periodo.fim, ordem: 2,
      incidencias: incidenciasPadrao,
    }).select("id").single();

    // Intervalo Intrajornada Suprimido
    const { data: intervalo } = await supabase.from("pjecalc_verbas").insert({
      case_id: caseId, nome: "Intervalo Intrajornada Suprimido", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 1.5, divisor_informado: 220,
      quantidade_informada: 22, tipo_quantidade: "informada",
      periodo_inicio: "2021-01-01", periodo_fim: periodo.fim, ordem: 3,
      incidencias: incidenciasPadrao,
    }).select("id").single();

    // Adicional de Periculosidade
    const { data: periculosidade } = await supabase.from("pjecalc_verbas").insert({
      case_id: caseId, nome: "Adicional de Periculosidade", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 0.3, divisor_informado: 1,
      quantidade_informada: 1, tipo_quantidade: "informada",
      periodo_inicio: "2020-05-01", periodo_fim: periodo.fim, ordem: 4,
      incidencias: incidenciasPadrao,
    }).select("id").single();

    // 10. Reflexas para cada principal
    const principalIds = [he50?.id, he100?.id, adicNot?.id, intervalo?.id, periculosidade?.id].filter(Boolean);
    let ordem = 5;

    for (const principalId of principalIds) {
      const reflexas = [
        { nome: "DSR", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 30 },
        { nome: "13º Salário", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
        { nome: "Férias + 1/3", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
      ];
      for (const ref of reflexas) {
        await supabase.from("pjecalc_verbas").insert({
          case_id: caseId, ...ref, tipo: "reflexa",
          periodo_inicio: periodo.inicio, periodo_fim: periodo.fim,
          ordem: ordem++,
          verba_principal_id: principalId,
          base_calculo: { historicos: [], verbas: [principalId], tabelas: [], proporcionalizar: false, integralizar: false },
        });
      }
    }

    // 11. FGTS config
    await supabase.from("pjecalc_fgts_config").insert({
      case_id: caseId,
      apurar: true,
      multa_apurar: true,
      multa_percentual: 40,
      multa_tipo: "sobre_depositos",
      deduzir_saldo: true,
      saldos_saques: [{ data: "2023-10-10", valor: 6200, tipo: "saque" }],
    });

    // 12. CS config
    await supabase.from("pjecalc_cs_config" as any).insert({
      case_id: caseId,
      apurar_segurado: true,
      cobrar_reclamante: true,
      cs_sobre_salarios_pagos: true,
      aliquota_segurado_tipo: "empregado",
      limitar_teto: true,
      apurar_empresa: true,
      apurar_sat: true,
      apurar_terceiros: true,
      aliquota_empregador_tipo: "atividade",
      aliquota_sat_fixa: 3,
      aliquota_terceiros_fixa: 5.8,
    });

    // 13. IR config
    await supabase.from("pjecalc_ir_config" as any).insert({
      case_id: caseId,
      apurar: true,
      incidir_sobre_juros: false,
      cobrar_reclamado: false,
      tributacao_exclusiva_13: true,
      tributacao_separada_ferias: true,
      deduzir_cs: true,
      deduzir_prev_privada: true,
      deduzir_pensao: true,
      deduzir_honorarios: false,
      aposentado_65: false,
      dependentes: 3,
    });

    // 14. Correção monetária
    await supabase.from("pjecalc_correcao_config" as any).insert({
      case_id: caseId,
      indice: "IPCA-E",
      epoca: "mensal",
      juros_tipo: "simples_mensal",
      juros_percentual: 1,
      juros_inicio: "ajuizamento",
      multa_523: false,
      multa_523_percentual: 0,
      data_liquidacao: "2026-03-01",
    });

    // 15. Honorários sucumbenciais
    await supabase.from("pjecalc_honorarios").insert({
      case_id: caseId,
      apurar_sucumbenciais: true,
      percentual_sucumbenciais: 10,
      base_sucumbenciais: "condenacao",
    });

    // 16. Pensão Alimentícia
    await supabase.from("pjecalc_pensao_config" as any).insert({
      case_id: caseId,
      apurar: true,
      percentual: 12,
      base: "liquido",
      incidir_juros: true,
    });

    // 17. Previdência Privada
    await supabase.from("pjecalc_previdencia_privada_config" as any).insert({
      case_id: caseId,
      apurar: true,
      percentual: 4,
      base_calculo: "diferenca",
      deduzir_ir: true,
    });

    // 18. Multas CLT
    await supabase.from("pjecalc_multas_config" as any).insert({
      case_id: caseId,
      apurar_477: true,
      apurar_467: false,
    });

    // 19. Dados do processo (complementar)
    await supabase.from("pjecalc_dados_processo" as any).insert({
      case_id: caseId,
      numero_processo: "0012458-77.2023.5.03.0015",
      vara: "15ª Vara do Trabalho de Contagem",
      tribunal: "TRT 3ª Região",
      reclamante_nome: "Marcelo Henrique Pires",
      reclamante_cpf: "456.321.987-22",
      reclamada_nome: "Horizonte Serviços Industriais LTDA",
      reclamada_cnpj: "27.654.321/0001-40",
      tipo_acao: "trabalhista",
      rito: "ordinario",
    });

    return caseId;
  } catch (err: any) {
    await supabase.from("cases").delete().eq("id", caseId);
    throw err;
  }
}

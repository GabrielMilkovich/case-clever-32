/**
 * Seed function for the advanced test case
 * Creates a complete case with all PJe-Calc data pre-populated
 */
import { supabase } from "@/integrations/supabase/client";

export async function seedAdvancedTestCase(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada");

  // 1. Create case
  const { data: caseData, error: caseErr } = await supabase.from("cases").insert({
    cliente: "Ricardo Andrade Souza",
    numero_processo: "0009876-44.2022.5.03.0008",
    tribunal: "8ª Vara do Trabalho de Belo Horizonte - TRT 3ª Região",
    status: "em_analise",
    criado_por: user.id,
    tags: ["teste_avancado"],
  }).select("id").single();

  if (caseErr || !caseData) throw new Error("Erro ao criar caso: " + caseErr?.message);
  const caseId = caseData.id;

  try {
    // 2. Parties
    await supabase.from("parties").insert([
      { case_id: caseId, nome: "Ricardo Andrade Souza", tipo: "reclamante" as any, documento: "321.654.987-55", documento_tipo: "CPF" },
      { case_id: caseId, nome: "Delta Logística e Transportes LTDA", tipo: "reclamada" as any, documento: "45.678.901/0001-22", documento_tipo: "CNPJ" },
    ]);

    // 3. Employment contract
    await supabase.from("employment_contracts").insert({
      case_id: caseId,
      data_admissao: "2018-03-05",
      data_demissao: "2022-08-12",
      funcao: "Motorista de Carreta",
      salario_inicial: 1500,
      tipo_demissao: "sem_justa_causa" as any,
      historico_salarial: [
        { inicio: "2018-03-05", fim: "2018-12-31", valor: 1500 },
        { inicio: "2019-01-01", fim: "2019-12-31", valor: 1700 },
        { inicio: "2020-01-01", fim: "2020-12-31", valor: 1900 },
        { inicio: "2021-01-01", fim: "2021-12-31", valor: 2200 },
        { inicio: "2022-01-01", fim: "2022-08-12", valor: 2600 },
      ],
    });

    // 4. Critical facts (confirmed, so engine can run)
    const factsToInsert = [
      { chave: "data_admissao", valor: "2018-03-05", tipo: "data" as any },
      { chave: "data_demissao", valor: "2022-08-12", tipo: "data" as any },
      { chave: "salario_base", valor: "2600", tipo: "moeda" as any },
      { chave: "salario_mensal", valor: "2600", tipo: "moeda" as any },
      { chave: "jornada_contratual", valor: "220", tipo: "numero" as any },
      { chave: "tipo_demissao", valor: "sem_justa_causa", tipo: "texto" as any },
      { chave: "funcao", valor: "Motorista de Carreta", tipo: "texto" as any },
      { chave: "cpf_reclamante", valor: "321.654.987-55", tipo: "texto" as any },
      { chave: "cnpj_reclamada", valor: "45.678.901/0001-22", tipo: "texto" as any },
      { chave: "uf", valor: "MG", tipo: "texto" as any },
      { chave: "municipio", valor: "Belo Horizonte", tipo: "texto" as any },
    ];
    await supabase.from("facts").insert(
      factsToInsert.map(f => ({
        case_id: caseId,
        ...f,
        origem: "manual" as any,
        confirmado: true,
        confirmado_por: user.id,
        confirmado_em: new Date().toISOString(),
        confianca: 1.0,
      }))
    );

    // 5. PJe-Calc Parâmetros
    await supabase.from("pjecalc_parametros" as any).insert({
      case_id: caseId,
      data_admissao: "2018-03-05",
      data_demissao: "2022-08-12",
      data_ajuizamento: "2022-10-01",
      carga_horaria_padrao: 220,
      sabado_dia_util: false,
      projetar_aviso_indenizado: true,
      limitar_avos_periodo: true,
      zerar_valor_negativo: true,
      prescricao_quinquenal: true,
      prescricao_fgts: true,
      estado: "MG",
      municipio: "Belo Horizonte",
      prazo_aviso_previo: "indenizado",
      prazo_aviso_dias: 33,
      regime_trabalho: "CLT",
      ultima_remuneracao: 2600,
      maior_remuneracao: 2600,
    });

    // 6. Histórico salarial
    const historicoData = [
      { nome: "Salário", periodo_inicio: "2018-03-05", periodo_fim: "2018-12-31", valor_informado: 1500, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2019-01-01", periodo_fim: "2019-12-31", valor_informado: 1700, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2020-01-01", periodo_fim: "2020-12-31", valor_informado: 1900, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2021-01-01", periodo_fim: "2021-12-31", valor_informado: 2200, tipo_valor: "mensal" },
      { nome: "Salário", periodo_inicio: "2022-01-01", periodo_fim: "2022-08-12", valor_informado: 2600, tipo_valor: "mensal" },
    ];
    await supabase.from("pjecalc_historico_salarial" as any).insert(
      historicoData.map(h => ({ case_id: caseId, ...h, incidencia_fgts: true, incidencia_cs: true }))
    );

    // 7. Faltas
    await supabase.from("pjecalc_faltas" as any).insert([
      { case_id: caseId, data_inicial: "2019-09-05", data_final: "2019-09-05", justificada: false },
      { case_id: caseId, data_inicial: "2020-03-18", data_final: "2020-03-19", justificada: false },
      { case_id: caseId, data_inicial: "2021-11-07", data_final: "2021-11-07", justificada: true, justificativa: "Atestado médico" },
    ]);

    // 8. Férias
    await supabase.from("pjecalc_ferias" as any).insert([
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2018-03-05", periodo_aquisitivo_fim: "2019-03-04",
        periodo_concessivo_inicio: "2019-04-01", periodo_concessivo_fim: "2019-04-30",
        situacao: "gozadas", relativas: "integrais", prazo_dias: 30,
        periodos_gozo: [{ inicio: "2019-04-01", fim: "2019-04-30", dias: 30 }],
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2019-03-05", periodo_aquisitivo_fim: "2020-03-04",
        periodo_concessivo_inicio: "2020-07-01", periodo_concessivo_fim: "2020-07-30",
        situacao: "gozadas", relativas: "integrais", prazo_dias: 30,
        periodos_gozo: [{ inicio: "2020-07-01", fim: "2020-07-30", dias: 30 }],
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2020-03-05", periodo_aquisitivo_fim: "2021-03-04",
        periodo_concessivo_inicio: "2021-03-05", periodo_concessivo_fim: "2022-03-04",
        situacao: "gozadas_parcialmente", relativas: "proporcionais", prazo_dias: 15,
        periodos_gozo: [{ inicio: "2021-06-01", fim: "2021-06-15", dias: 15 }],
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2021-03-05", periodo_aquisitivo_fim: "2022-03-04",
        periodo_concessivo_inicio: "2022-03-05", periodo_concessivo_fim: "2023-03-04",
        situacao: "nao_gozadas", relativas: "integrais", prazo_dias: 30, dobra: true,
      },
    ]);

    // 9. Verbas (with proper principal linkage)
    const periodo = { inicio: "2018-03-05", fim: "2022-08-12" };

    // HE 50%
    const { data: he50 } = await supabase.from("pjecalc_verbas" as any).insert({
      case_id: caseId, nome: "Horas Extras 50%", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 1.5, divisor_informado: 220,
      quantidade_informada: 25, tipo_quantidade: "informada",
      periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: 0,
      incidencias: { dsr: true, decimo_terceiro: true, ferias: true, fgts: true, aviso_previo: true },
    }).select("id").single();

    // HE 100%
    const { data: he100 } = await supabase.from("pjecalc_verbas" as any).insert({
      case_id: caseId, nome: "Horas Extras 100%", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 2.0, divisor_informado: 220,
      quantidade_informada: 10, tipo_quantidade: "informada",
      periodo_inicio: "2020-01-01", periodo_fim: periodo.fim, ordem: 1,
      incidencias: { dsr: true, decimo_terceiro: true, ferias: true, fgts: true, aviso_previo: true },
    }).select("id").single();

    // Adicional Noturno
    const { data: adicNot } = await supabase.from("pjecalc_verbas" as any).insert({
      case_id: caseId, nome: "Adicional Noturno", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 0.2, divisor_informado: 220,
      quantidade_informada: 60, tipo_quantidade: "informada",
      periodo_inicio: "2019-01-01", periodo_fim: periodo.fim, ordem: 2,
      incidencias: { dsr: true, decimo_terceiro: true, ferias: true, fgts: true, aviso_previo: true },
    }).select("id").single();

    // Intervalo intrajornada
    const { data: intervalo } = await supabase.from("pjecalc_verbas" as any).insert({
      case_id: caseId, nome: "Intervalo Intrajornada Suprimido", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 1.5, divisor_informado: 220,
      quantidade_informada: 22, tipo_quantidade: "informada", // ~1h/dia × 22 dias úteis
      periodo_inicio: "2021-01-01", periodo_fim: periodo.fim, ordem: 3,
      incidencias: { dsr: true, decimo_terceiro: true, ferias: true, fgts: true, aviso_previo: false },
    }).select("id").single();

    // Reflexas linked to all principals
    const principalIds = [(he50 as any)?.id, (he100 as any)?.id, (adicNot as any)?.id, (intervalo as any)?.id].filter(Boolean);
    
    // For each principal, create reflexas
    let ordem = 4;
    for (const principalId of principalIds) {
      const reflexas = [
        { nome: "DSR", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 30 },
        { nome: "13º Salário", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
        { nome: "Férias + 1/3", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
      ];
      for (const ref of reflexas) {
        await supabase.from("pjecalc_verbas" as any).insert({
          case_id: caseId, ...ref, tipo: "reflexa",
          periodo_inicio: periodo.inicio, periodo_fim: periodo.fim,
          ordem: ordem++,
          verba_principal_id: principalId,
          base_calculo: { historicos: [], verbas: [principalId], tabelas: [], proporcionalizar: false, integralizar: false },
        });
      }
    }

    // 10. FGTS config
    await supabase.from("pjecalc_fgts_config").insert({
      case_id: caseId,
      apurar: true,
      multa_apurar: true,
      multa_percentual: 40,
      multa_tipo: "sobre_depositos",
      deduzir_saldo: true,
      saldos_saques: [{ data: "2022-07-15", valor: 5000, tipo: "saque" }],
    });

    // 11. Honorários
    await supabase.from("pjecalc_honorarios").insert({
      case_id: caseId,
      apurar_sucumbenciais: true,
      percentual_sucumbenciais: 10,
      base_sucumbenciais: "condenacao",
    });

    return caseId;
  } catch (err: any) {
    // Cleanup on error
    await supabase.from("cases").delete().eq("id", caseId);
    throw err;
  }
}

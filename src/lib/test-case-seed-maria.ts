/**
 * Seed: Caso Maria Madalena Alves Ferreira vs Via Varejo SA
 * Processo: 1001211-76.2025.5.02.0461
 * Comissionista pura — salário variável com 6 rubricas no histórico salarial
 */
import { supabase } from "@/integrations/supabase/client";

export async function seedCasoMaria(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada");

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
    // 2. Parties
    await supabase.from("parties" as any).insert([
      { case_id: caseId, nome: "Maria Madalena Alves Ferreira", tipo: "reclamante" as any, documento: "123.456.789-00", documento_tipo: "CPF" },
      { case_id: caseId, nome: "Via Varejo SA", tipo: "reclamada" as any, documento: "33.041.260/0652-90", documento_tipo: "CNPJ" },
    ]);

    // 3. Employment contract — comissionista pura, salário variável
    await supabase.from("employment_contracts" as any).insert({
      case_id: caseId,
      data_admissao: "2015-03-07",
      data_demissao: "2024-09-15",
      funcao: "Vendedor Interno",
      salario_inicial: 1200,
      tipo_demissao: "sem_justa_causa" as any,
    });

    // 4. Facts
    const facts = [
      { chave: "data_admissao", valor: "2015-03-07", tipo: "data" as any },
      { chave: "data_demissao", valor: "2024-09-15", tipo: "data" as any },
      { chave: "salario_base", valor: "variavel", tipo: "texto" as any },
      { chave: "cargo", valor: "VENDEDOR INTERNO", tipo: "texto" as any },
      { chave: "cnpj_empregador", valor: "33.041.260/0652-90", tipo: "texto" as any },
      { chave: "razao_social_empregador", valor: "VIA VAREJO SA", tipo: "texto" as any },
      { chave: "nome_empregado", valor: "MARIA MADALENA ALVES FERREIRA", tipo: "texto" as any },
      { chave: "local_trabalho", valor: "Santo André, SP", tipo: "texto" as any },
      { chave: "adicional_noturno", valor: "20%", tipo: "texto" as any },
      { chave: "horas_extras_percentual", valor: "100%", tipo: "texto" as any },
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

    // 5. Parâmetros
    // 07/03/2015 → 15/09/2024 = ~9 anos 6 meses → 30 + 9×3 = 57 dias aviso prévio
    await supabase.from("pjecalc_parametros" as any).insert({
      case_id: caseId,
      data_admissao: "2015-03-07",
      data_demissao: "2024-09-15",
      data_ajuizamento: "2025-01-20",
      data_inicial: "2020-01-20", // prescrição quinquenal
      data_final: "2024-09-15",
      carga_horaria_padrao: 220,
      sabado_dia_util: false,
      projetar_aviso_indenizado: true,
      limitar_avos_periodo: true,
      zerar_valor_negativo: true,
      prescricao_quinquenal: true,
      prescricao_fgts: true,
      estado: "SP",
      municipio: "Santo André",
      prazo_aviso_previo: "indenizado",
      prazo_aviso_dias: 57,
      regime_trabalho: "CLT",
      ultima_remuneracao: 3500, // média aprox. últimos meses
      maior_remuneracao: 4200,
    });

    // 6. Histórico Salarial — 6 rubricas conforme PJe-Calc real
    // Período do cálculo: 01/2020 a 09/2024 (prescrição quinquenal)
    const periodoCalc = { inicio: "2020-01-01", fim: "2024-09-15" };

    const historicoRubricas = [
      { nome: "COMISSÕES PAGAS", tipo_valor: "VARIAVEL", valor_informado: 1800 },
      { nome: "COMISSÕES ESTORNADAS", tipo_valor: "VARIAVEL", valor_informado: 150 },
      { nome: "DSR S/ COMISSÃO", tipo_valor: "VARIAVEL", valor_informado: 360 },
      { nome: "MÍNIMO GARANTIDO", tipo_valor: "VARIAVEL", valor_informado: 1200 },
      { nome: "PRÊMIOS PAGOS", tipo_valor: "VARIAVEL", valor_informado: 280 },
      { nome: "VENDAS \"VF\"", tipo_valor: "VARIAVEL", valor_informado: 450 },
    ];

    for (const rub of historicoRubricas) {
      const { data: histInserted } = await supabase.from("pjecalc_historico_salarial" as any).insert({
        case_id: caseId,
        nome: rub.nome,
        periodo_inicio: periodoCalc.inicio,
        periodo_fim: periodoCalc.fim,
        tipo_valor: rub.tipo_valor,
        valor_informado: rub.valor_informado,
        incidencia_fgts: rub.nome !== "COMISSÕES ESTORNADAS", // estornos não incidem FGTS
        incidencia_cs: true,
      }).select("id").single();

      // Generate monthly occurrences with realistic variation
      if ((histInserted as any)?.id) {
        const ocorrencias: any[] = [];
        const cur = new Date(2020, 0, 1);
        const end = new Date(2024, 8, 1);
        while (cur <= end) {
          const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
          // Realistic variation: ±30% from average
          const variation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
          let valor = Math.round(rub.valor_informado * variation * 100) / 100;

          // Estornos are negative
          if (rub.nome === "COMISSÕES ESTORNADAS") {
            valor = -Math.abs(valor);
          }

          // Mínimo garantido: only applies when comissões are low (some months = 0)
          if (rub.nome === "MÍNIMO GARANTIDO") {
            valor = Math.random() > 0.4 ? 0 : Math.round(rub.valor_informado * variation * 100) / 100;
          }

          ocorrencias.push({
            historico_id: (histInserted as any).id,
            case_id: caseId,
            competencia: comp,
            valor,
            tipo: "informado",
          });
          cur.setMonth(cur.getMonth() + 1);
        }
        if (ocorrencias.length > 0) {
          await supabase.from("pjecalc_historico_ocorrencias" as any).insert(ocorrencias);
        }
      }
    }

    // 7. Férias — períodos aquisitivos
    await supabase.from("pjecalc_ferias" as any).insert([
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2020-03-07", periodo_aquisitivo_fim: "2021-03-06",
        periodo_concessivo_inicio: "2021-03-07", periodo_concessivo_fim: "2022-03-06",
        situacao: "gozadas", relativas: "integrais", prazo_dias: 30,
        gozo_inicio: "2021-07-01", gozo_fim: "2021-07-30",
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2021-03-07", periodo_aquisitivo_fim: "2022-03-06",
        periodo_concessivo_inicio: "2022-03-07", periodo_concessivo_fim: "2023-03-06",
        situacao: "gozadas", relativas: "integrais", prazo_dias: 30,
        gozo_inicio: "2022-09-01", gozo_fim: "2022-09-30",
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2022-03-07", periodo_aquisitivo_fim: "2023-03-06",
        periodo_concessivo_inicio: "2023-03-07", periodo_concessivo_fim: "2024-03-06",
        situacao: "nao_gozadas", relativas: "integrais", prazo_dias: 30, dobra: true,
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2023-03-07", periodo_aquisitivo_fim: "2024-03-06",
        periodo_concessivo_inicio: "2024-03-07", periodo_concessivo_fim: "2025-03-06",
        situacao: "nao_gozadas", relativas: "integrais", prazo_dias: 30, dobra: true,
      },
      {
        case_id: caseId,
        periodo_aquisitivo_inicio: "2024-03-07", periodo_aquisitivo_fim: "2024-09-15",
        situacao: "indenizadas", relativas: "proporcionais", prazo_dias: 15,
        dias: 15,
      },
    ]);

    // 8. Faltas
    await supabase.from("pjecalc_faltas" as any).insert([
      { case_id: caseId, data_inicial: "2020-05-11", data_final: "2020-05-11", justificada: false },
      { case_id: caseId, data_inicial: "2021-08-16", data_final: "2021-08-17", justificada: false },
      { case_id: caseId, data_inicial: "2023-03-20", data_final: "2023-03-20", justificada: true, motivo: "Consulta médica" },
    ]);

    // 9. Verbas Principais — comissionista com adicional noturno e HE
    const incidenciasPadrao = { dsr: true, decimo_terceiro: true, ferias: true, fgts: true, aviso_previo: true };

    // Diferenças de Comissão (verba principal - base do cálculo)
    const { data: difComissao } = await supabase.from("pjecalc_verbas" as any).insert({
      case_id: caseId, nome: "Diferenças de Comissão", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 1,
      periodo_inicio: periodoCalc.inicio, periodo_fim: periodoCalc.fim, ordem: 0,
      incidencias: incidenciasPadrao,
    }).select("id").single();

    // Adicional Noturno 20%
    const { data: adicNot } = await supabase.from("pjecalc_verbas" as any).insert({
      case_id: caseId, nome: "Adicional Noturno 20%", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 0.2, divisor_informado: 220,
      quantidade_informada: 60, tipo_quantidade: "informada",
      periodo_inicio: periodoCalc.inicio, periodo_fim: periodoCalc.fim, ordem: 1,
      incidencias: incidenciasPadrao,
    }).select("id").single();

    // Horas Extras 100%
    const { data: he100 } = await supabase.from("pjecalc_verbas" as any).insert({
      case_id: caseId, nome: "Horas Extras 100%", tipo: "principal", caracteristica: "comum",
      ocorrencia_pagamento: "mensal", multiplicador: 2.0, divisor_informado: 220,
      quantidade_informada: 10, tipo_quantidade: "informada",
      periodo_inicio: periodoCalc.inicio, periodo_fim: periodoCalc.fim, ordem: 2,
      incidencias: incidenciasPadrao,
    }).select("id").single();

    // 10. Reflexas para cada principal
    const principalIds = [(difComissao as any)?.id, (adicNot as any)?.id, (he100 as any)?.id].filter(Boolean);
    let ordem = 3;

    for (const principalId of principalIds) {
      const reflexas = [
        { nome: "DSR", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 30 },
        { nome: "13º Salário", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
        { nome: "Férias + 1/3", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
      ];
      for (const ref of reflexas) {
        await supabase.from("pjecalc_verbas" as any).insert({
          case_id: caseId, ...ref, tipo: "reflexa",
          periodo_inicio: periodoCalc.inicio, periodo_fim: periodoCalc.fim,
          ordem: ordem++,
          verba_principal_id: principalId,
          base_calculo: { historicos: [], verbas: [principalId], tabelas: [], proporcionalizar: false, integralizar: false },
        });
      }
    }

    // 11. FGTS config
    await supabase.from("pjecalc_fgts_config" as any).insert({
      case_id: caseId,
      apurar: true,
      multa_apurar: true,
      multa_percentual: 40,
      multa_tipo: "sobre_depositos",
      deduzir_saldo: false,
    });

    // 12. CS config
    await supabase.from("pjecalc_cs_config" as any).insert({
      case_id: caseId,
      apurar_segurado: true,
      cobrar_reclamante: true,
      cs_sobre_salarios_pagos: false,
      aliquota_segurado_tipo: "empregado",
      limitar_teto: true,
      apurar_empresa: true,
      apurar_sat: true,
      apurar_terceiros: true,
      aliquota_empregador_tipo: "atividade",
      aliquota_sat_fixa: 2,
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
      deduzir_prev_privada: false,
      deduzir_pensao: false,
      deduzir_honorarios: false,
      aposentado_65: false,
      dependentes: 0,
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
      data_liquidacao: "2026-03-05",
    });

    // 15. Honorários
    await supabase.from("pjecalc_honorarios" as any).insert({
      case_id: caseId,
      apurar_sucumbenciais: true,
      percentual_sucumbenciais: 15,
      base_sucumbenciais: "condenacao",
    });

    // 16. Multas CLT
    await supabase.from("pjecalc_multas_config" as any).insert({
      case_id: caseId,
      apurar_477: true,
      apurar_467: false,
    });

    // 17. Dados do processo
    await supabase.from("pjecalc_dados_processo" as any).insert({
      case_id: caseId,
      numero_processo: "1001211-76.2025.5.02.0461",
      vara: "1ª Vara do Trabalho de Santo André",
      tribunal: "TRT 2ª Região",
      reclamante_nome: "Maria Madalena Alves Ferreira",
      reclamante_cpf: "123.456.789-00",
      reclamada_nome: "Via Varejo SA",
      reclamada_cnpj: "33.041.260/0652-90",
      tipo_acao: "trabalhista",
      rito: "ordinario",
    });

    return caseId;
  } catch (err: any) {
    // Rollback: delete the case (cascades)
    await supabase.from("cases").delete().eq("id", caseId);
    throw err;
  }
}

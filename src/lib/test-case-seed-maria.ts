/**
 * Seed: Caso Maria Madalena Alves Ferreira vs Via Varejo SA
 * Processo: 1001211-76.2025.5.02.0461
 * Comissionista pura — 8 verbas principais com reflexas conforme PJe-Calc real
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

    // 3. Employment contract
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

    // 5. Parâmetros (auto-creates pjecalc_calculos via trigger)
    await supabase.from("pjecalc_parametros" as any).insert({
      case_id: caseId,
      data_admissao: "2015-03-07",
      data_demissao: "2024-09-15",
      data_ajuizamento: "2025-01-20",
      data_inicial: "2020-01-20",
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
      ultima_remuneracao: 3500,
      maior_remuneracao: 4200,
    });

    // Get calculo_id
    const { data: calculoRow } = await supabase
      .from("pjecalc_calculos")
      .select("id")
      .eq("case_id", caseId)
      .maybeSingle();
    const calculoId = (calculoRow as any)?.id;
    if (!calculoId) throw new Error("pjecalc_calculos não foi criado pelo trigger");

    // 6. Histórico Salarial — 6 rubricas comissionista
    const historicoRubricas = [
      { nome: "COMISSÕES PAGAS", tipo_variacao: "variavel", valor_fixo: 1800, incide_fgts: true },
      { nome: "COMISSÕES ESTORNADAS", tipo_variacao: "variavel", valor_fixo: 150, incide_fgts: false },
      { nome: "DSR S/ COMISSÃO", tipo_variacao: "variavel", valor_fixo: 360, incide_fgts: true },
      { nome: "MÍNIMO GARANTIDO", tipo_variacao: "variavel", valor_fixo: 1200, incide_fgts: true },
      { nome: "PRÊMIOS PAGOS", tipo_variacao: "variavel", valor_fixo: 280, incide_fgts: true },
      { nome: "VENDAS VF", tipo_variacao: "variavel", valor_fixo: 450, incide_fgts: true },
    ];

    for (const rub of historicoRubricas) {
      const { data: histInserted, error: histErr } = await supabase.from("pjecalc_hist_salarial").insert({
        calculo_id: calculoId,
        nome: rub.nome,
        tipo_variacao: rub.tipo_variacao,
        valor_fixo: rub.valor_fixo,
        incide_fgts: rub.incide_fgts,
        incide_inss: true,
        incide_ir: true,
      }).select("id").single();

      if (histErr || !histInserted) {
        console.warn(`Erro hist_salarial ${rub.nome}:`, histErr?.message);
        continue;
      }

      // Monthly occurrences
      const ocorrencias: any[] = [];
      const cur = new Date(2020, 0, 1);
      const end = new Date(2024, 8, 1);
      while (cur <= end) {
        const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const variation = 0.7 + Math.random() * 0.6;
        let valor = Math.round(rub.valor_fixo * variation * 100) / 100;
        if (rub.nome === "COMISSÕES ESTORNADAS") valor = -Math.abs(valor);
        if (rub.nome === "MÍNIMO GARANTIDO") valor = Math.random() > 0.4 ? 0 : Math.round(rub.valor_fixo * variation * 100) / 100;
        ocorrencias.push({ calculo_id: calculoId, hist_salarial_id: histInserted.id, competencia: comp, valor, origem: "seed" });
        cur.setMonth(cur.getMonth() + 1);
      }
      if (ocorrencias.length > 0) {
        for (let i = 0; i < ocorrencias.length; i += 50) {
          await supabase.from("pjecalc_hist_salarial_mes").insert(ocorrencias.slice(i, i + 50));
        }
      }
    }

    // 7. Férias
    await supabase.from("pjecalc_ferias" as any).insert([
      { case_id: caseId, periodo_aquisitivo_inicio: "2020-03-07", periodo_aquisitivo_fim: "2021-03-06", periodo_concessivo_inicio: "2021-03-07", periodo_concessivo_fim: "2022-03-06", situacao: "gozadas", dias: 30, gozo_inicio: "2021-07-01", gozo_fim: "2021-07-30" },
      { case_id: caseId, periodo_aquisitivo_inicio: "2021-03-07", periodo_aquisitivo_fim: "2022-03-06", periodo_concessivo_inicio: "2022-03-07", periodo_concessivo_fim: "2023-03-06", situacao: "gozadas", dias: 30, gozo_inicio: "2022-09-01", gozo_fim: "2022-09-30" },
      { case_id: caseId, periodo_aquisitivo_inicio: "2022-03-07", periodo_aquisitivo_fim: "2023-03-06", periodo_concessivo_inicio: "2023-03-07", periodo_concessivo_fim: "2024-03-06", situacao: "nao_gozadas", dias: 30, dobra: true },
      { case_id: caseId, periodo_aquisitivo_inicio: "2023-03-07", periodo_aquisitivo_fim: "2024-03-06", periodo_concessivo_inicio: "2024-03-07", periodo_concessivo_fim: "2025-03-06", situacao: "nao_gozadas", dias: 30, dobra: true },
      { case_id: caseId, periodo_aquisitivo_inicio: "2024-03-07", periodo_aquisitivo_fim: "2024-09-15", situacao: "proporcionais", dias: 15 },
    ]);

    // 8. Faltas
    await supabase.from("pjecalc_faltas" as any).insert([
      { case_id: caseId, data_inicial: "2020-05-11", data_final: "2020-05-11", justificada: false },
      { case_id: caseId, data_inicial: "2021-08-16", data_final: "2021-08-17", justificada: false },
      { case_id: caseId, data_inicial: "2023-03-20", data_final: "2023-03-20", justificada: true, motivo: "Consulta médica" },
    ]);

    // ===== 9. VERBAS — 8 Principais conforme PJe-Calc real =====
    const periodoCalc = { inicio: "2020-01-20", fim: "2024-09-15" };

    // Definição das 8 verbas principais com suas reflexas (conforme screenshots PJe-Calc)
    const verbasPrincipais = [
      {
        nome: "REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)",
        multiplicador: 1, divisor_informado: 26,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE RSR (COMISSIONISTA)", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE RSR (COMISSIONISTA)", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE RSR (COMISSIONISTA)", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "MULTA DO ARTIGO 477 DA CLT SOBRE RSR (COMISSIONISTA)", caracteristica: "comum", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 1, ativa: false },
        ],
      },
      {
        nome: "INTERVALO INTERJORNADAS",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE INTERVALO INTERJORNADAS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE INTERVALO INTERJORNADAS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE INTERVALO INTERJORNADAS", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE INTERVALO INTERJORNADAS", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: false },
          { nome: "MULTA DO ARTIGO 477 DA CLT SOBRE INTERVALO INTERJORNADAS", caracteristica: "comum", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 1, ativa: false },
        ],
      },
      {
        nome: "HORAS EXTRAS",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE HORAS EXTRAS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE HORAS EXTRAS", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE HORAS EXTRAS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE HORAS EXTRAS", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26, ativa: true },
          { nome: "MULTA DO ARTIGO 477 DA CLT SOBRE HORAS EXTRAS", caracteristica: "comum", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 1, ativa: false },
        ],
      },
      {
        nome: "DOMINGOS E FERIADOS",
        multiplicador: 2.0, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE DOMINGOS E FERIADOS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE DOMINGOS E FERIADOS", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE DOMINGOS E FERIADOS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE DOMINGOS E FERIADOS", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26, ativa: true },
          { nome: "MULTA DO ARTIGO 477 DA CLT SOBRE DOMINGOS E FERIADOS", caracteristica: "comum", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 1, ativa: false },
        ],
      },
      {
        nome: "VENDAS A PRAZO",
        multiplicador: 1, divisor_informado: 1,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE VENDAS A PRAZO", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE VENDAS A PRAZO", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE VENDAS A PRAZO", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "MULTA DO ARTIGO 477 DA CLT SOBRE VENDAS A PRAZO", caracteristica: "comum", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 1, ativa: false },
        ],
      },
      {
        nome: "PRÊMIO ESTÍMULO",
        multiplicador: 1, divisor_informado: 1,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE PRÊMIO ESTÍMULO", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE PRÊMIO ESTÍMULO", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE PRÊMIO ESTÍMULO", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "MULTA DO ARTIGO 477 DA CLT SOBRE PRÊMIO ESTÍMULO", caracteristica: "comum", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 1, ativa: false },
        ],
      },
      {
        nome: "COMISSÕES ESTORNADAS",
        multiplicador: 1, divisor_informado: 1,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE COMISSÕES ESTORNADAS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE COMISSÕES ESTORNADAS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE COMISSÕES ESTORNADAS", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "MULTA DO ARTIGO 477 DA CLT SOBRE COMISSÕES ESTORNADAS", caracteristica: "comum", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 1, ativa: false },
        ],
      },
      {
        nome: "ARTIGO 384 DA CLT",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE ARTIGO 384 DA CLT", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "FÉRIAS + 1/3 SOBRE ARTIGO 384 DA CLT", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12, ativa: true },
          { nome: "REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE ARTIGO 384 DA CLT", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26, ativa: true },
          { nome: "AVISO PRÉVIO SOBRE ARTIGO 384 DA CLT", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12, ativa: true },
          { nome: "MULTA DO ARTIGO 477 DA CLT SOBRE ARTIGO 384 DA CLT", caracteristica: "comum", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 1, ativa: false },
        ],
      },
    ];

    const incidenciasPadrao = { dsr: true, decimo_terceiro: true, ferias: true, fgts: true, aviso_previo: true };
    let ordem = 0;

    for (const vp of verbasPrincipais) {
      // Insert principal
      const { data: principalData } = await supabase.from("pjecalc_verbas" as any).insert({
        case_id: caseId,
        nome: vp.nome,
        tipo: "principal",
        caracteristica: "comum",
        ocorrencia_pagamento: "mensal",
        multiplicador: vp.multiplicador,
        divisor_informado: vp.divisor_informado,
        periodo_inicio: periodoCalc.inicio,
        periodo_fim: periodoCalc.fim,
        ordem: ordem++,
        incidencias: incidenciasPadrao,
      }).select("id").single();

      const principalId = (principalData as any)?.id;
      if (!principalId) continue;

      // Insert reflexas
      for (const ref of vp.reflexas) {
        await supabase.from("pjecalc_verbas" as any).insert({
          case_id: caseId,
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
          incidencias: incidenciasPadrao,
          base_calculo: { historicos: [], verbas: [principalId], tabelas: [], proporcionalizar: false, integralizar: false },
          ativa: ref.ativa,
        });
      }
    }

    // 10. FGTS config
    await supabase.from("pjecalc_fgts_config" as any).insert({ case_id: caseId, apurar: true, multa_apurar: true, multa_percentual: 40, multa_tipo: "sobre_depositos", deduzir_saldo: false });

    // 11. CS config
    await supabase.from("pjecalc_cs_config" as any).insert({ case_id: caseId, apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false, aliquota_segurado_tipo: "empregado", limitar_teto: true, apurar_empresa: true, apurar_sat: true, apurar_terceiros: true, aliquota_empregador_tipo: "atividade", aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8 });

    // 12. IR config
    await supabase.from("pjecalc_ir_config" as any).insert({ case_id: caseId, apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false, tributacao_exclusiva_13: true, tributacao_separada_ferias: true, deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0 });

    // 13. Correção monetária
    await supabase.from("pjecalc_correcao_config" as any).insert({ case_id: caseId, indice: "IPCA-E", epoca: "mensal", juros_tipo: "simples_mensal", juros_percentual: 1, juros_inicio: "ajuizamento", multa_523: false, multa_523_percentual: 0, data_liquidacao: "2026-03-05" });

    // 14. Honorários
    await supabase.from("pjecalc_honorarios" as any).insert({ case_id: caseId, apurar_sucumbenciais: true, percentual_sucumbenciais: 15, base_sucumbenciais: "condenacao" });

    // 15. Multas CLT
    await supabase.from("pjecalc_multas_config" as any).insert({ case_id: caseId, apurar_477: true, apurar_467: false });

    // 16. Dados do processo
    await supabase.from("pjecalc_dados_processo" as any).insert({ case_id: caseId, numero_processo: "1001211-76.2025.5.02.0461", vara: "1ª Vara do Trabalho de Santo André", tribunal: "TRT 2ª Região", reclamante_nome: "Maria Madalena Alves Ferreira", reclamante_cpf: "123.456.789-00", reclamada_nome: "Via Varejo SA", reclamada_cnpj: "33.041.260/0652-90", tipo_acao: "trabalhista", rito: "ordinario" });

    return caseId;
  } catch (err: any) {
    await supabase.from("cases").delete().eq("id", caseId);
    throw err;
  }
}

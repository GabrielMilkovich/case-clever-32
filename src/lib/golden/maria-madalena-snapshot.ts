/**
 * GROUND TRUTH SNAPSHOT — Maria Madalena Alves Ferreira vs Grupo Casas Bahia S.A.
 * Processo: 1001211-76.2025.5.02.0461
 * Cálculo: 1475
 * PJe-Calc Cidadão v2.13.2 — liquidado em 16/10/2025 às 17:45:44
 *
 * Fonte: PDF do relatório oficial (119 páginas)
 */

export interface GoldenRubrica {
  codigo: string;
  descricao: string;
  valor_corrigido: number;
  juros: number;
  total: number;
  tipo: 'PRINCIPAL' | 'REFLEXO_13' | 'REFLEXO_AP' | 'REFLEXO_FERIAS' | 'REFLEXO_RSR' | 'FGTS' | 'MULTA_FGTS';
  rubrica_principal?: string; // código da rubrica principal para reflexos
  source: { page: number; line: string };
}

export interface GoldenFalta {
  inicio: string;
  fim: string;
  justificada: boolean;
  justificativa: string;
  source: { page: number };
}

export interface GoldenFerias {
  relativa: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_concessivo_inicio: string;
  periodo_concessivo_fim: string;
  prazo: number;
  situacao: string;
  abono: boolean;
  gozo1_inicio: string;
  gozo1_fim: string;
  gozo2_inicio?: string;
  gozo2_fim?: string;
  gozo3_inicio?: string;
  gozo3_fim?: string;
  source: { page: number };
}

export interface GoldenTimecardDay {
  data: string; // DD/MM/YYYY
  dia: string;
  frequencia: string;
  hs_trabalhadas: number;
  hs_ext_diarias: number;
  hs_ext_semanais: number;
  hs_ext_diarias_repousos: number;
  hs_ext_diarias_feriados: number;
  hs_interjornadas: number;
  hs_art384: number;
}

export interface GoldenCriterioCorrecao {
  descricao: string;
  fases: Array<{
    indice: string;
    ate?: string; // data limite
    a_partir?: string;
  }>;
  source: { page: number };
}

export interface GoldenCriterioJuros {
  descricao: string;
  fases: Array<{
    tipo: string;
    ate?: string;
    a_partir?: string;
  }>;
  source: { page: number };
}

export interface GoldenSnapshot {
  meta: {
    processo: string;
    calculo_id: number;
    reclamante: string;
    reclamado: string;
    periodo_calculo_inicio: string;
    periodo_calculo_fim: string;
    data_ajuizamento: string;
    data_liquidacao: string;
    admissao: string;
    demissao: string;
    estado: string;
    municipio: string;
    regime: string;
    prescricao_quinquenal: boolean;
    prescricao_trintenaria: boolean;
    limitar_avos_periodo: boolean;
    prazo_aviso_previo: string;
    projetar_aviso_previo: boolean;
    considerar_feriados: boolean;
    zerar_valor_negativo: boolean;
    considerar_feriados_estaduais: boolean;
    carga_horaria: number;
    sabado_dia_util: boolean;
    pje_calc_version: string;
    liquidado_em: string;
  };

  pontos_facultativos: Array<{
    nome: string;
    abrangencia: string;
  }>;

  faltas: GoldenFalta[];
  ferias: GoldenFerias[];

  rubricas: GoldenRubrica[];

  resumo: {
    percentual_remuneratorias_tributaveis: number;
    total_bruto_corrigido: number;
    total_bruto_juros: number;
    total_bruto: number;
    fgts_total: number;
    bruto_devido_reclamante: number;
    deducao_contribuicao_social: number;
    irpf_reclamante: number;
    total_descontos: number;
    liquido_reclamante: number;
    contribuicao_social_salarios: number;
    honorarios_liquidos: number;
    irrf_honorarios: number;
    total_reclamado: number;
    honorarios_advogado_nome: string;
  };

  criterios: {
    correcao: GoldenCriterioCorrecao;
    juros: GoldenCriterioJuros;
    contribuicao_social_empresa_aliquota: number;
    contribuicao_social_regra: string;
    imposto_renda_metodo: string;
    juros_apos_deducao_cs: boolean;
    aviso_previo_regra: string;
  };
}

/**
 * Snapshot completo extraído do PDF — fonte de verdade para golden tests
 */
export const MARIA_MADALENA_SNAPSHOT: GoldenSnapshot = {
  meta: {
    processo: '1001211-76.2025.5.02.0461',
    calculo_id: 1475,
    reclamante: 'MARIA MADALENA ALVES FERREIRA',
    reclamado: 'GRUPO CASAS BAHIA S.A.',
    periodo_calculo_inicio: '2016-04-16',
    periodo_calculo_fim: '2021-03-02',
    data_ajuizamento: '2021-04-16',
    data_liquidacao: '2025-10-31',
    admissao: '2015-03-07',
    demissao: '2021-03-02',
    estado: 'SP',
    municipio: 'SAO BERNARDO DO CAMPO',
    regime: 'Tempo Integral',
    prescricao_quinquenal: false,
    prescricao_trintenaria: false,
    limitar_avos_periodo: false,
    prazo_aviso_previo: 'Calculado',
    projetar_aviso_previo: true,
    considerar_feriados: true,
    zerar_valor_negativo: false,
    considerar_feriados_estaduais: true,
    carga_horaria: 220,
    sabado_dia_util: true,
    pje_calc_version: '2.13.2',
    liquidado_em: '2025-10-16T17:45:44',
  },

  pontos_facultativos: [
    { nome: 'CORPUS CHRISTI', abrangencia: 'Nacional' },
    { nome: 'CARNAVAL', abrangencia: 'Nacional' },
    { nome: 'SEXTA-FEIRA SANTA', abrangencia: 'Nacional' },
  ],

  faltas: [
    {
      inicio: '2015-09-24',
      fim: '2015-10-15',
      justificada: true,
      justificativa: 'ATESTADO MÉDICO',
      source: { page: 3 },
    },
    {
      inicio: '2016-04-18',
      fim: '2016-10-15',
      justificada: true,
      justificativa: 'LICENÇA MATERNIDADE',
      source: { page: 3 },
    },
    {
      inicio: '2020-04-23',
      fim: '2020-06-16',
      justificada: true,
      justificativa: 'SUSPENSÃO CONTRATO DE TRABALHO',
      source: { page: 3 },
    },
  ],

  ferias: [
    {
      relativa: '2015/2016',
      periodo_aquisitivo_inicio: '2015-03-07',
      periodo_aquisitivo_fim: '2016-03-06',
      periodo_concessivo_inicio: '2016-03-07',
      periodo_concessivo_fim: '2017-03-06',
      prazo: 30,
      situacao: 'Gozadas',
      abono: false,
      gozo1_inicio: '2016-10-19',
      gozo1_fim: '2016-11-17',
      source: { page: 3 },
    },
    {
      relativa: '2016/2017',
      periodo_aquisitivo_inicio: '2016-03-07',
      periodo_aquisitivo_fim: '2017-03-06',
      periodo_concessivo_inicio: '2017-03-07',
      periodo_concessivo_fim: '2018-03-06',
      prazo: 30,
      situacao: 'Gozadas',
      abono: false,
      gozo1_inicio: '2017-10-13',
      gozo1_fim: '2017-11-11',
      source: { page: 3 },
    },
    {
      relativa: '2017/2018',
      periodo_aquisitivo_inicio: '2017-03-07',
      periodo_aquisitivo_fim: '2018-03-06',
      periodo_concessivo_inicio: '2018-03-07',
      periodo_concessivo_fim: '2019-03-06',
      prazo: 30,
      situacao: 'Gozadas',
      abono: false,
      gozo1_inicio: '2018-10-15',
      gozo1_fim: '2018-11-13',
      source: { page: 3 },
    },
    {
      relativa: '2018/2019',
      periodo_aquisitivo_inicio: '2018-03-07',
      periodo_aquisitivo_fim: '2019-03-06',
      periodo_concessivo_inicio: '2019-03-07',
      periodo_concessivo_fim: '2020-03-06',
      prazo: 30,
      situacao: 'Gozadas',
      abono: false,
      gozo1_inicio: '2019-10-14',
      gozo1_fim: '2019-11-12',
      source: { page: 3 },
    },
    {
      relativa: '2019/2020',
      periodo_aquisitivo_inicio: '2019-03-07',
      periodo_aquisitivo_fim: '2020-03-06',
      periodo_concessivo_inicio: '2020-03-07',
      periodo_concessivo_fim: '2021-03-06',
      prazo: 30,
      situacao: 'Gozadas',
      abono: false,
      gozo1_inicio: '2020-04-02',
      gozo1_fim: '2020-04-11',
      gozo2_inicio: '2020-04-13',
      gozo2_fim: '2020-04-22',
      gozo3_inicio: '2020-10-29',
      gozo3_fim: '2020-11-07',
      source: { page: 3 },
    },
  ],

  rubricas: [
    // === COMISSÕES ESTORNADAS ===
    { codigo: 'COMISSOES_ESTORNADAS', descricao: 'COMISSÕES ESTORNADAS', valor_corrigido: 659.98, juros: 250.43, total: 910.41, tipo: 'PRINCIPAL', source: { page: 1, line: 'Resumo' } },
    { codigo: '13_COMISSOES_ESTORNADAS', descricao: '13º SALÁRIO SOBRE COMISSÕES ESTORNADAS', valor_corrigido: 56.03, juros: 21.22, total: 77.25, tipo: 'REFLEXO_13', rubrica_principal: 'COMISSOES_ESTORNADAS', source: { page: 1, line: 'Resumo' } },
    { codigo: 'AP_COMISSOES_ESTORNADAS', descricao: 'AVISO PRÉVIO SOBRE COMISSÕES ESTORNADAS', valor_corrigido: 34.01, juros: 13.83, total: 47.84, tipo: 'REFLEXO_AP', rubrica_principal: 'COMISSOES_ESTORNADAS', source: { page: 1, line: 'Resumo' } },
    { codigo: 'FERIAS_COMISSOES_ESTORNADAS', descricao: 'FÉRIAS + 1/3 SOBRE COMISSÕES ESTORNADAS', valor_corrigido: 104.78, juros: 41.10, total: 145.88, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'COMISSOES_ESTORNADAS', source: { page: 1, line: 'Resumo' } },
    { codigo: 'RSR_COMISSOES_ESTORNADAS', descricao: 'REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE COMISSÕES ESTORNADAS', valor_corrigido: 132.01, juros: 50.09, total: 182.10, tipo: 'REFLEXO_RSR', rubrica_principal: 'COMISSOES_ESTORNADAS', source: { page: 1, line: 'Resumo' } },

    // === VENDAS A PRAZO ===
    { codigo: 'VENDAS_A_PRAZO', descricao: 'VENDAS A PRAZO', valor_corrigido: 4310.33, juros: 1640.01, total: 5950.34, tipo: 'PRINCIPAL', source: { page: 1, line: 'Resumo' } },
    { codigo: '13_VENDAS_A_PRAZO', descricao: '13º SALÁRIO SOBRE VENDAS A PRAZO', valor_corrigido: 366.05, juros: 138.85, total: 504.90, tipo: 'REFLEXO_13', rubrica_principal: 'VENDAS_A_PRAZO', source: { page: 1, line: 'Resumo' } },
    { codigo: 'AP_VENDAS_A_PRAZO', descricao: 'AVISO PRÉVIO SOBRE VENDAS A PRAZO', valor_corrigido: 71.97, juros: 29.27, total: 101.24, tipo: 'REFLEXO_AP', rubrica_principal: 'VENDAS_A_PRAZO', source: { page: 1, line: 'Resumo' } },
    { codigo: 'FERIAS_VENDAS_A_PRAZO', descricao: 'FÉRIAS + 1/3 SOBRE VENDAS A PRAZO', valor_corrigido: 623.82, juros: 240.90, total: 864.72, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'VENDAS_A_PRAZO', source: { page: 1, line: 'Resumo' } },
    { codigo: 'RSR_VENDAS_A_PRAZO', descricao: 'REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE VENDAS A PRAZO', valor_corrigido: 877.60, juros: 334.11, total: 1211.71, tipo: 'REFLEXO_RSR', rubrica_principal: 'VENDAS_A_PRAZO', source: { page: 1, line: 'Resumo' } },

    // === PRÊMIO ESTÍMULO ===
    { codigo: 'PREMIO_ESTIMULO', descricao: 'PRÊMIO ESTÍMULO', valor_corrigido: 2639.05, juros: 1016.81, total: 3655.86, tipo: 'PRINCIPAL', source: { page: 1, line: 'Resumo' } },
    { codigo: '13_PREMIO_ESTIMULO', descricao: '13º SALÁRIO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 223.06, juros: 85.00, total: 308.06, tipo: 'REFLEXO_13', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'Resumo' } },
    { codigo: 'AP_PREMIO_ESTIMULO', descricao: 'AVISO PRÉVIO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 42.39, juros: 17.24, total: 59.63, tipo: 'REFLEXO_AP', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'Resumo' } },
    { codigo: 'FERIAS_PREMIO_ESTIMULO', descricao: 'FÉRIAS + 1/3 SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 363.78, juros: 141.01, total: 504.79, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'Resumo' } },
    { codigo: 'RSR_PREMIO_ESTIMULO', descricao: 'REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE PRÊMIO ESTÍMULO', valor_corrigido: 566.55, juros: 218.79, total: 785.34, tipo: 'REFLEXO_RSR', rubrica_principal: 'PREMIO_ESTIMULO', source: { page: 1, line: 'Resumo' } },

    // === ARTIGO 384 DA CLT ===
    { codigo: 'ART384', descricao: 'ARTIGO 384 DA CLT', valor_corrigido: 94.99, juros: 36.31, total: 131.30, tipo: 'PRINCIPAL', source: { page: 1, line: 'Resumo' } },
    { codigo: '13_ART384', descricao: '13º SALÁRIO SOBRE ARTIGO 384 DA CLT', valor_corrigido: 7.12, juros: 2.71, total: 9.83, tipo: 'REFLEXO_13', rubrica_principal: 'ART384', source: { page: 1, line: 'Resumo' } },
    { codigo: 'FERIAS_ART384', descricao: 'FÉRIAS + 1/3 SOBRE ARTIGO 384 DA CLT', valor_corrigido: 9.64, juros: 3.66, total: 13.30, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'ART384', source: { page: 1, line: 'Resumo' } },
    { codigo: 'RSR_ART384', descricao: 'REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE ARTIGO 384 DA CLT', valor_corrigido: 19.50, juros: 7.44, total: 26.94, tipo: 'REFLEXO_RSR', rubrica_principal: 'ART384', source: { page: 1, line: 'Resumo' } },

    // === DOMINGOS E FERIADOS ===
    { codigo: 'DOMINGOS_FERIADOS', descricao: 'DOMINGOS E FERIADOS', valor_corrigido: 7194.16, juros: 2731.45, total: 9925.61, tipo: 'PRINCIPAL', source: { page: 1, line: 'Resumo' } },
    { codigo: '13_DOMINGOS_FERIADOS', descricao: '13º SALÁRIO SOBRE DOMINGOS E FERIADOS', valor_corrigido: 596.01, juros: 225.82, total: 821.83, tipo: 'REFLEXO_13', rubrica_principal: 'DOMINGOS_FERIADOS', source: { page: 1, line: 'Resumo' } },
    { codigo: 'AP_DOMINGOS_FERIADOS', descricao: 'AVISO PRÉVIO SOBRE DOMINGOS E FERIADOS', valor_corrigido: 77.08, juros: 31.34, total: 108.42, tipo: 'REFLEXO_AP', rubrica_principal: 'DOMINGOS_FERIADOS', source: { page: 1, line: 'Resumo' } },
    { codigo: 'FERIAS_DOMINGOS_FERIADOS', descricao: 'FÉRIAS + 1/3 SOBRE DOMINGOS E FERIADOS', valor_corrigido: 903.94, juros: 348.67, total: 1252.61, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'DOMINGOS_FERIADOS', source: { page: 1, line: 'Resumo' } },

    // === HORAS EXTRAS ===
    { codigo: 'HORAS_EXTRAS', descricao: 'HORAS EXTRAS', valor_corrigido: 5662.99, juros: 2150.11, total: 7813.10, tipo: 'PRINCIPAL', source: { page: 1, line: 'Resumo' } },
    { codigo: '13_HORAS_EXTRAS', descricao: '13º SALÁRIO SOBRE HORAS EXTRAS', valor_corrigido: 469.37, juros: 177.85, total: 647.22, tipo: 'REFLEXO_13', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'Resumo' } },
    { codigo: 'AP_HORAS_EXTRAS', descricao: 'AVISO PRÉVIO SOBRE HORAS EXTRAS', valor_corrigido: 57.70, juros: 23.46, total: 81.16, tipo: 'REFLEXO_AP', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'Resumo' } },
    { codigo: 'FERIAS_HORAS_EXTRAS', descricao: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS', valor_corrigido: 709.39, juros: 273.54, total: 982.93, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'HORAS_EXTRAS', source: { page: 1, line: 'Resumo' } },
    { codigo: 'RSR_HORAS_EXTRAS', descricao: 'REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE HORAS EXTRAS', valor_corrigido: 1178.42, juros: 447.46, total: 1625.88, tipo: 'REFLEXO_RSR', rubrica_principal: 'HORAS_EXTRAS', source: { page: 2, line: 'Resumo' } },

    // === INTERVALO INTERJORNADAS ===
    { codigo: 'INTERJORNADAS', descricao: 'INTERVALO INTERJORNADAS', valor_corrigido: 815.63, juros: 309.19, total: 1124.82, tipo: 'PRINCIPAL', source: { page: 2, line: 'Resumo' } },
    { codigo: '13_INTERJORNADAS', descricao: '13º SALÁRIO SOBRE INTERVALO INTERJORNADAS', valor_corrigido: 10.92, juros: 4.15, total: 15.07, tipo: 'REFLEXO_13', rubrica_principal: 'INTERJORNADAS', source: { page: 2, line: 'Resumo' } },
    { codigo: 'FERIAS_INTERJORNADAS', descricao: 'FÉRIAS + 1/3 SOBRE INTERVALO INTERJORNADAS', valor_corrigido: 3.42, juros: 1.30, total: 4.72, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'INTERJORNADAS', source: { page: 2, line: 'Resumo' } },
    { codigo: 'RSR_INTERJORNADAS', descricao: 'REPOUSO SEMANAL REMUNERADO E FERIADO SOBRE INTERVALO INTERJORNADAS', valor_corrigido: 26.78, juros: 10.22, total: 37.00, tipo: 'REFLEXO_RSR', rubrica_principal: 'INTERJORNADAS', source: { page: 2, line: 'Resumo' } },

    // === RSR COMISSIONISTA ===
    { codigo: 'RSR_COMISSIONISTA', descricao: 'REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 2875.10, juros: 1092.95, total: 3968.05, tipo: 'PRINCIPAL', source: { page: 2, line: 'Resumo' } },
    { codigo: '13_RSR_COMISSIONISTA', descricao: '13º SALÁRIO SOBRE REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 235.26, juros: 89.21, total: 324.47, tipo: 'REFLEXO_13', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 2, line: 'Resumo' } },
    { codigo: 'AP_RSR_COMISSIONISTA', descricao: 'AVISO PRÉVIO SOBRE REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 7.57, juros: 3.08, total: 10.65, tipo: 'REFLEXO_AP', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 2, line: 'Resumo' } },
    { codigo: 'FERIAS_RSR_COMISSIONISTA', descricao: 'FÉRIAS + 1/3 SOBRE REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)', valor_corrigido: 347.71, juros: 133.01, total: 480.72, tipo: 'REFLEXO_FERIAS', rubrica_principal: 'RSR_COMISSIONISTA', source: { page: 2, line: 'Resumo' } },

    // === FGTS ===
    { codigo: 'FGTS_8', descricao: 'FGTS 8%', valor_corrigido: 1940.79, juros: 791.72, total: 2732.51, tipo: 'FGTS', source: { page: 2, line: 'Resumo' } },
    { codigo: 'MULTA_FGTS_40', descricao: 'MULTA SOBRE FGTS 40%', valor_corrigido: 776.07, juros: 315.58, total: 1091.65, tipo: 'MULTA_FGTS', source: { page: 2, line: 'Resumo' } },
  ],

  resumo: {
    percentual_remuneratorias_tributaveis: 89.34,
    total_bruto_corrigido: 35090.97,
    total_bruto_juros: 13448.89,
    total_bruto: 48539.86,
    fgts_total: 3824.16,
    bruto_devido_reclamante: 48539.86,
    deducao_contribuicao_social: 2113.35,
    irpf_reclamante: 0.00,
    total_descontos: 2113.35,
    liquido_reclamante: 46426.51,
    contribuicao_social_salarios: 12450.89,
    honorarios_liquidos: 4853.99,
    irrf_honorarios: 0.00,
    total_reclamado: 63731.39,
    honorarios_advogado_nome: 'MARCOS ROBERTO DIAS',
  },

  criterios: {
    correcao: {
      descricao: "Valores corrigidos pelo índice 'IPCA-E' até 15/04/2021, pelo índice 'Sem Correção' até 29/08/2024 e pelo índice 'IPCA' a partir de 30/08/2024, acumulados a partir do mês subsequente ao vencimento, conforme súmula nº 381 do TST.",
      fases: [
        { indice: 'IPCA-E', ate: '2021-04-15' },
        { indice: 'SEM_CORRECAO', a_partir: '2021-04-16', ate: '2024-08-29' },
        { indice: 'IPCA', a_partir: '2024-08-30' },
      ],
      source: { page: 2 },
    },
    juros: {
      descricao: "Juros apurados desde o vencimento das verbas vencidas, em fase pré-judicial, conforme decisão do STF na ADC 58; juros simples TRD até 15/04/2021; juros SELIC (Receita Federal) até 29/08/2024; e juros Taxa Legal a partir de 30/08/2024.",
      fases: [
        { tipo: 'TRD', ate: '2021-04-15' },
        { tipo: 'SELIC', a_partir: '2021-04-16', ate: '2024-08-29' },
        { tipo: 'TAXA_LEGAL', a_partir: '2024-08-30' },
      ],
      source: { page: 2 },
    },
    contribuicao_social_empresa_aliquota: 20,
    contribuicao_social_regra: 'Conforme itens IV e V da Súmula nº 368 do TST. Para salários devidos até 04/03/2009, sem juros e multa. A partir de 05/03/2009, com juros SELIC desde a prestação do serviço.',
    imposto_renda_metodo: 'Tabela progressiva acumulada vigente no mês da liquidação (Art. 12-A Lei 7.713/1988)',
    juros_apos_deducao_cs: true,
    aviso_previo_regra: 'Lei nº 12.506/2011',
  },
};

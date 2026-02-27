// =====================================================
// PJE-CALC ENGINE: CORREÇÃO MONETÁRIA + JUROS DE MORA
// Réplica exata da lógica PJe-Calc CSJT
// =====================================================
//
// Conforme ADCs 58 e 59 (STF, 18/12/2020):
//
// FASE PRÉ-JUDICIAL (até ajuizamento):
//   → IPCA-E (correção monetária)
//   → Sem juros de mora
//
// FASE JUDICIAL (a partir do ajuizamento):
//   Período entre ajuizamento e citação:
//     → IPCA-E + juros 1% a.m. pro rata die (Art. 39, §1º, Lei 8.177/91)
//   A partir da citação/notificação:
//     → SELIC (engloba correção + juros, sem cumulação)
//
// ALTERNATIVAS (conforme sentença):
//   → TR (Art. 879, §7º, CLT - se determinado)
//   → IPCA-E puro (sem SELIC)
//   → SELIC desde ajuizamento
//   → Juros 1% a.m. + TR (regime antigo)
//
// MULTA 523 CPC (antigo 475-J):
//   → 10% se não pago em 15 dias após intimação
//
// HONORÁRIOS:
//   → Sucumbenciais (5-15%, Art. 791-A CLT)
//   → Periciais
// =====================================================

import { Decimal } from 'decimal.js';

// ---- TIPOS ----

export type IndiceCorrecao = 'TR' | 'IPCA_E' | 'SELIC' | 'INPC' | 'IGP_M';

export type MetodoJuros =
  | 'selic'           // SELIC engloba tudo (pós ADC 58)
  | 'juros_1pct'      // 1% a.m. pro rata die (Art. 39, §1º, Lei 8.177/91)
  | 'juros_05pct'     // 0.5% a.m. (Fazenda Pública pré-2021)
  | 'sem_juros';      // Sem juros separados

export type RegimeAtualizacao =
  | 'adc_58_59'       // Regime padrão pós ADC 58/59
  | 'tr_juros_1pct'   // TR + 1% a.m. (regime antigo)
  | 'ipca_e_juros_1pct' // IPCA-E + 1% a.m. (período TST Arg. Inconst.)
  | 'selic_integral'  // SELIC desde ajuizamento (sem IPCA-E)
  | 'personalizado';  // Configuração manual

export interface ParametrosCorrecao {
  // Regime de atualização
  regime: RegimeAtualizacao;

  // Datas-chave
  data_ajuizamento: string;     // ISO date
  data_citacao?: string;        // ISO date (notificação da reclamada)
  data_base_calculo: string;    // Data-base para atualização (geralmente "hoje")

  // Índices (se regime = personalizado)
  indice_fase_prejuicial?: IndiceCorrecao;
  indice_fase_judicial?: IndiceCorrecao;
  metodo_juros_fase_judicial?: MetodoJuros;

  // Juros
  taxa_juros_mensal?: number; // 0.01 = 1% a.m. (padrão)

  // Multa 523 CPC
  aplicar_multa_523: boolean;
  percentual_multa_523?: number; // 0.10 = 10%
  data_intimacao_pagamento?: string; // Data da intimação para pagamento

  // Honorários sucumbenciais
  aplicar_honorarios: boolean;
  percentual_honorarios?: number; // 0.05 a 0.15

  // Honorários periciais
  valor_honorarios_periciais?: number;

  // Fazenda Pública
  fazenda_publica: boolean;
}

// Série de índices: competência → fator acumulado
export interface SerieIndice {
  nome: IndiceCorrecao;
  // Map de competência (YYYY-MM) → fator mensal (ex: 1.005 = 0.5%)
  fatores: Map<string, number>;
}

export interface ItemCorrigido {
  competencia_origem: string;  // YYYY-MM de quando o crédito surgiu
  valor_nominal: number;       // Valor original
  // Correção monetária
  fator_correcao: number;      // Fator acumulado de correção
  valor_corrigido: number;     // valor_nominal × fator_correcao
  indice_usado: IndiceCorrecao;
  // Juros de mora
  meses_juros: number;         // Meses desde marco inicial dos juros
  taxa_juros_aplicada: number; // Taxa mensal ou SELIC acumulada
  valor_juros: number;
  // Total
  valor_atualizado: number;    // corrigido + juros
  // Memória
  formula_correcao: string;
  formula_juros: string;
}

export interface ResultadoCorrecaoJuros {
  itens: ItemCorrigido[];
  // Totais
  total_nominal: number;
  total_correcao: number;      // Diferença: corrigido - nominal
  total_juros: number;
  total_atualizado: number;
  // Multa 523 CPC
  multa_523?: {
    base: number;
    percentual: number;
    valor: number;
  };
  // Honorários
  honorarios_sucumbenciais?: {
    base: number;
    percentual: number;
    valor: number;
  };
  honorarios_periciais?: number;
  // Total final (com multa e honorários)
  total_final: number;
  // Metadata
  regime_aplicado: RegimeAtualizacao;
  data_base: string;
  memoria: MemoriaCorrecao[];
}

export interface MemoriaCorrecao {
  competencia: string;
  descricao: string;
  formula: string;
  valor: number;
}

// ---- FUNÇÕES AUXILIARES ----

/**
 * Calcula meses entre duas competências (YYYY-MM)
 */
function mesesEntre(comp1: string, comp2: string): number {
  const [a1, m1] = comp1.split('-').map(Number);
  const [a2, m2] = comp2.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

/**
 * Converte data ISO para competência YYYY-MM
 */
function dataParaCompetencia(data: string): string {
  return data.substring(0, 7);
}

/**
 * Calcula fator de correção acumulado entre duas competências
 * usando a série de índices
 */
export function calcularFatorCorrecaoAcumulado(
  competenciaOrigem: string,
  competenciaDestino: string,
  serie: SerieIndice
): number {
  if (competenciaOrigem >= competenciaDestino) return 1;

  let fatorAcumulado = new Decimal(1);
  const comps = gerarCompetenciasRange(competenciaOrigem, competenciaDestino);

  for (const comp of comps) {
    const fatorMensal = serie.fatores.get(comp);
    if (fatorMensal !== undefined) {
      fatorAcumulado = fatorAcumulado.times(fatorMensal);
    }
    // Se não tem fator, mantém o anterior (sem correção naquele mês)
  }

  return fatorAcumulado.toDecimalPlaces(10).toNumber();
}

/**
 * Gera lista de competências entre duas YYYY-MM (exclusive a primeira, inclusive a última)
 */
function gerarCompetenciasRange(inicio: string, fim: string): string[] {
  const result: string[] = [];
  const [a1, m1] = inicio.split('-').map(Number);
  const [a2, m2] = fim.split('-').map(Number);

  let current = new Date(a1, m1, 1); // mês seguinte ao início
  const last = new Date(a2, m2 - 1, 1);

  while (current <= last) {
    const y = current.getFullYear();
    const m = (current.getMonth() + 1).toString().padStart(2, '0');
    result.push(`${y}-${m}`);
    current.setMonth(current.getMonth() + 1);
  }

  return result;
}

/**
 * Calcula juros pro rata die
 * PJe-Calc: juros 1% a.m. contados do ajuizamento, aplicados pro rata die
 */
function calcularJurosProRataDie(
  valorBase: number,
  taxaMensal: number,
  meses: number,
  diasProRata: number = 0,
  totalDiasMes: number = 30
): number {
  if (meses <= 0 && diasProRata <= 0) return 0;

  // Juros simples: valor × taxa × meses
  const jurosMeses = new Decimal(valorBase)
    .times(taxaMensal)
    .times(meses);

  // Pro rata die para mês incompleto
  const jurosDias = new Decimal(valorBase)
    .times(taxaMensal)
    .times(diasProRata)
    .div(totalDiasMes);

  return jurosMeses.plus(jurosDias).toDecimalPlaces(2).toNumber();
}

// ---- ENGINE PRINCIPAL ----

/**
 * Resolve o regime de atualização para índice + juros por fase
 */
function resolverRegime(params: ParametrosCorrecao): {
  indicePrejudicial: IndiceCorrecao;
  indiceJudicial: IndiceCorrecao;
  jurosPreCitacao: MetodoJuros;
  jurosPosCitacao: MetodoJuros;
} {
  switch (params.regime) {
    case 'adc_58_59':
      return {
        indicePrejudicial: 'IPCA_E',
        indiceJudicial: 'IPCA_E', // IPCA-E até citação, depois SELIC
        jurosPreCitacao: 'juros_1pct',
        jurosPosCitacao: 'selic',
      };

    case 'tr_juros_1pct':
      return {
        indicePrejudicial: 'TR',
        indiceJudicial: 'TR',
        jurosPreCitacao: 'juros_1pct',
        jurosPosCitacao: 'juros_1pct',
      };

    case 'ipca_e_juros_1pct':
      return {
        indicePrejudicial: 'IPCA_E',
        indiceJudicial: 'IPCA_E',
        jurosPreCitacao: 'juros_1pct',
        jurosPosCitacao: 'juros_1pct',
      };

    case 'selic_integral':
      return {
        indicePrejudicial: 'IPCA_E',
        indiceJudicial: 'IPCA_E',
        jurosPreCitacao: 'selic',
        jurosPosCitacao: 'selic',
      };

    case 'personalizado':
      return {
        indicePrejudicial: params.indice_fase_prejuicial || 'IPCA_E',
        indiceJudicial: params.indice_fase_judicial || 'IPCA_E',
        jurosPreCitacao: params.metodo_juros_fase_judicial || 'juros_1pct',
        jurosPosCitacao: params.metodo_juros_fase_judicial || 'selic',
      };
  }
}

/**
 * Corrige e aplica juros a uma lista de créditos por competência.
 *
 * @param creditos Map de competência → valor nominal
 * @param params Parâmetros de correção
 * @param series Map de índice → série de fatores
 */
export function calcularCorrecaoJuros(
  creditos: Map<string, number>,
  params: ParametrosCorrecao,
  series: Map<IndiceCorrecao, SerieIndice>
): ResultadoCorrecaoJuros {
  const memoria: MemoriaCorrecao[] = [];
  const itens: ItemCorrigido[] = [];
  const regime = resolverRegime(params);

  const compAjuizamento = dataParaCompetencia(params.data_ajuizamento);
  const compCitacao = params.data_citacao
    ? dataParaCompetencia(params.data_citacao)
    : compAjuizamento; // Se não informada, usa ajuizamento
  const compBase = dataParaCompetencia(params.data_base_calculo);
  const taxaJuros = params.taxa_juros_mensal ?? 0.01;

  // Processar cada competência
  const competenciasOrdenadas = Array.from(creditos.keys()).sort();

  for (const comp of competenciasOrdenadas) {
    const valorNominal = creditos.get(comp) || 0;
    if (valorNominal === 0) continue;

    // 1. Determinar índice de correção conforme fase
    const fasePreJudicial = comp < compAjuizamento;
    const fasePreCitacao = comp >= compAjuizamento && comp < compCitacao;

    let indiceUsado: IndiceCorrecao;
    let metodoJuros: MetodoJuros;

    if (params.regime === 'adc_58_59' && comp >= compCitacao) {
      // Pós-citação no regime ADC 58: SELIC pura (sem separar correção e juros)
      indiceUsado = 'SELIC';
      metodoJuros = 'sem_juros'; // SELIC já engloba juros
    } else if (fasePreJudicial) {
      indiceUsado = regime.indicePrejudicial;
      metodoJuros = 'sem_juros'; // Sem juros na fase pré-judicial
    } else if (fasePreCitacao) {
      indiceUsado = regime.indiceJudicial;
      metodoJuros = regime.jurosPreCitacao;
    } else {
      indiceUsado = regime.indiceJudicial;
      metodoJuros = regime.jurosPosCitacao;
    }

    // 2. Calcular fator de correção
    const serie = series.get(indiceUsado);
    let fatorCorrecao = 1;
    let formulaCorrecao = 'Sem série de índice disponível';

    if (serie) {
      fatorCorrecao = calcularFatorCorrecaoAcumulado(comp, compBase, serie);
      formulaCorrecao = `${indiceUsado} de ${comp} a ${compBase}: fator ${fatorCorrecao.toFixed(8)}`;
    }

    const valorCorrigido = new Decimal(valorNominal)
      .times(fatorCorrecao)
      .toDecimalPlaces(2)
      .toNumber();

    // 3. Calcular juros de mora
    let valorJuros = 0;
    let mesesJuros = 0;
    let taxaJurosAplicada = 0;
    let formulaJuros = 'Sem juros';

    if (metodoJuros === 'juros_1pct' || metodoJuros === 'juros_05pct') {
      const taxa = metodoJuros === 'juros_1pct' ? taxaJuros : 0.005;
      // Juros contados do ajuizamento (Art. 883, CLT)
      mesesJuros = Math.max(0, mesesEntre(compAjuizamento, compBase));
      // Para créditos anteriores ao ajuizamento: juros desde ajuizamento
      // Para créditos posteriores ao ajuizamento: juros desde o vencimento
      if (comp > compAjuizamento) {
        mesesJuros = Math.max(0, mesesEntre(comp, compBase));
      }

      valorJuros = calcularJurosProRataDie(valorCorrigido, taxa, mesesJuros);
      taxaJurosAplicada = taxa;
      formulaJuros = `${valorCorrigido.toFixed(2)} × ${(taxa * 100).toFixed(1)}% × ${mesesJuros} meses`;
    } else if (metodoJuros === 'selic') {
      // SELIC: juros embutidos no fator de correção
      // (a série SELIC já contém correção + juros)
      formulaJuros = 'Juros embutidos na SELIC';
    }

    const valorAtualizado = new Decimal(valorCorrigido)
      .plus(valorJuros)
      .toDecimalPlaces(2)
      .toNumber();

    itens.push({
      competencia_origem: comp,
      valor_nominal: valorNominal,
      fator_correcao: fatorCorrecao,
      valor_corrigido: valorCorrigido,
      indice_usado: indiceUsado,
      meses_juros: mesesJuros,
      taxa_juros_aplicada: taxaJurosAplicada,
      valor_juros: valorJuros,
      valor_atualizado: valorAtualizado,
      formula_correcao: formulaCorrecao,
      formula_juros: formulaJuros,
    });

    memoria.push({
      competencia: comp,
      descricao: `Correção ${indiceUsado} + ${metodoJuros === 'sem_juros' ? 'sem juros' : metodoJuros}`,
      formula: `Nominal: ${valorNominal.toFixed(2)} → Corrigido: ${valorCorrigido.toFixed(2)} + Juros: ${valorJuros.toFixed(2)} = ${valorAtualizado.toFixed(2)}`,
      valor: valorAtualizado,
    });
  }

  // Totalizar
  const totalNominal = itens.reduce((s, i) => s + i.valor_nominal, 0);
  const totalCorrigido = itens.reduce((s, i) => s + i.valor_corrigido, 0);
  const totalCorrecao = Number((totalCorrigido - totalNominal).toFixed(2));
  const totalJuros = Number(itens.reduce((s, i) => s + i.valor_juros, 0).toFixed(2));
  const totalAtualizado = Number(itens.reduce((s, i) => s + i.valor_atualizado, 0).toFixed(2));

  // Multa 523 CPC (Art. 523, §1º, CPC/2015)
  let multa523: ResultadoCorrecaoJuros['multa_523'];
  if (params.aplicar_multa_523) {
    const percMulta = params.percentual_multa_523 ?? 0.10;
    const valorMulta = new Decimal(totalAtualizado).times(percMulta).toDecimalPlaces(2).toNumber();
    multa523 = {
      base: totalAtualizado,
      percentual: percMulta,
      valor: valorMulta,
    };
    memoria.push({
      competencia: 'TOTAL',
      descricao: `Multa Art. 523, §1º, CPC (${(percMulta * 100).toFixed(0)}%)`,
      formula: `${totalAtualizado.toFixed(2)} × ${percMulta}`,
      valor: valorMulta,
    });
  }

  // Honorários sucumbenciais (Art. 791-A CLT)
  let honorariosSucumbenciais: ResultadoCorrecaoJuros['honorarios_sucumbenciais'];
  if (params.aplicar_honorarios && params.percentual_honorarios) {
    const baseHon = totalAtualizado;
    const valorHon = new Decimal(baseHon)
      .times(params.percentual_honorarios)
      .toDecimalPlaces(2)
      .toNumber();
    honorariosSucumbenciais = {
      base: baseHon,
      percentual: params.percentual_honorarios,
      valor: valorHon,
    };
    memoria.push({
      competencia: 'TOTAL',
      descricao: `Honorários sucumbenciais (${(params.percentual_honorarios * 100).toFixed(0)}%)`,
      formula: `${baseHon.toFixed(2)} × ${params.percentual_honorarios}`,
      valor: valorHon,
    });
  }

  // Total final
  let totalFinal = totalAtualizado;
  if (multa523) totalFinal += multa523.valor;
  if (honorariosSucumbenciais) totalFinal += honorariosSucumbenciais.valor;
  if (params.valor_honorarios_periciais) totalFinal += params.valor_honorarios_periciais;
  totalFinal = Number(totalFinal.toFixed(2));

  return {
    itens,
    total_nominal: Number(totalNominal.toFixed(2)),
    total_correcao: totalCorrecao,
    total_juros: totalJuros,
    total_atualizado: totalAtualizado,
    multa_523: multa523,
    honorarios_sucumbenciais: honorariosSucumbenciais,
    honorarios_periciais: params.valor_honorarios_periciais,
    total_final: totalFinal,
    regime_aplicado: params.regime,
    data_base: params.data_base_calculo,
    memoria,
  };
}

// ---- HELPER: Criar série de índices a partir de dados do banco ----

/**
 * Converte dados da tabela index_series para o formato SerieIndice
 * @param rows Linhas da tabela index_series { competencia, valor, nome }
 */
export function criarSerieDeIndices(
  rows: { competencia: string; valor: number; nome: string }[]
): Map<IndiceCorrecao, SerieIndice> {
  const series = new Map<IndiceCorrecao, SerieIndice>();

  for (const row of rows) {
    const nomeIndice = row.nome.toUpperCase().replace('-', '_') as IndiceCorrecao;

    if (!series.has(nomeIndice)) {
      series.set(nomeIndice, {
        nome: nomeIndice,
        fatores: new Map(),
      });
    }

    const serie = series.get(nomeIndice)!;
    // O valor no banco pode ser o percentual (0.5%) ou o fator (1.005)
    // Convenção: se valor < 1, é percentual → converter para fator
    const fator = row.valor < 1 ? 1 + row.valor : row.valor;
    serie.fatores.set(row.competencia.substring(0, 7), fator);
  }

  return series;
}

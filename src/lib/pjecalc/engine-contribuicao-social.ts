// =====================================================
// PJE-CALC ENGINE: CONTRIBUIÇÃO SOCIAL - Réplica exata PJe-Calc CSJT
// =====================================================
// Módulo Contribuição Social conforme manual PJe-Calc:
//
// 1. SEGURADO (empregado) - alíquota progressiva sobre remuneração
//    - Até 02/2020: faixas fixas (8%, 9%, 11%)
//    - A partir de 03/2020 (EC 103/2019): progressiva (7.5%, 9%, 12%, 14%)
//
// 2. EMPREGADOR:
//    - Empresa: 20% sobre folha (Art. 22, I, Lei 8.212/91)
//    - SAT/RAT: 1%, 2% ou 3% (Art. 22, II, Lei 8.212/91)
//    - Terceiros: INCRA, SENAI, SESI, SEBRAE, Salário-Educação
//
// 3. CS sobre 13º: base isolada (Art. 214, §6º, RPS)
// 4. Férias gozadas + 1/3: isento (Art. 28, §9º, "d", Lei 8.212/91)
// =====================================================

import { Decimal } from 'decimal.js';
import { ResultadoVerba } from './types';

// ---- TIPOS CS ----

export interface TabelaINSSSegurado {
  vigencia_inicio: string; // YYYY-MM
  vigencia_fim?: string;
  tipo: 'fixa' | 'progressiva'; // fixa = pré-reforma, progressiva = pós EC103
  faixas: FaixaINSS[];
  teto: number;
}

export interface FaixaINSS {
  ate: number;
  aliquota: number; // ex: 0.075
}

export interface AliquotasEmpregador {
  empresa: number;  // 20% padrão
  sat_rat: number;   // 1%, 2% ou 3%
  terceiros: number; // ~5.8%
  // Detalhamento terceiros (opcional)
  detalhamento_terceiros?: {
    incra: number;           // 0.2% ou 2.7%
    senai: number;           // 1.0%
    sesi: number;            // 1.5%
    sebrae: number;          // 0.6%
    salario_educacao: number; // 2.5%
  };
}

export interface ParametrosCS {
  // Tabelas INSS por período
  tabelas_inss: TabelaINSSSegurado[];
  // Alíquotas do empregador
  aliquotas_empregador: AliquotasEmpregador;
  // Flags
  calcular_segurado: boolean;
  calcular_empregador: boolean;
  // CS já recolhida (deduções)
  cs_ja_recolhida_segurado: number;
  cs_ja_recolhida_empregador: number;
}

export interface CSCompetencia {
  competencia: string;
  // Bases
  base_comum: number;  // verbas comuns com incidência CS
  base_13: number;     // 13º (base isolada)
  remuneracao_total: number; // para enquadramento na faixa
  // Segurado
  aliquota_efetiva_segurado: number;
  cs_segurado_comum: number;
  cs_segurado_13: number;
  cs_segurado_total: number;
  // Empregador
  cs_empregador_empresa: number;
  cs_empregador_sat: number;
  cs_empregador_terceiros: number;
  cs_empregador_total: number;
  // Total
  cs_total_competencia: number;
}

export interface ResultadoCS {
  competencias: CSCompetencia[];
  // Totais segurado
  total_segurado: number;
  total_segurado_comum: number;
  total_segurado_13: number;
  // Totais empregador
  total_empregador: number;
  total_empregador_empresa: number;
  total_empregador_sat: number;
  total_empregador_terceiros: number;
  // Total geral
  total_cs: number;
  // Memória
  memoria: MemoriaCS[];
}

export interface MemoriaCS {
  competencia: string;
  descricao: string;
  formula: string;
  valor: number;
}

// ---- TABELAS INSS PADRÃO ----

/** Tabelas INSS pré-configuradas (fontes oficiais) */
export const TABELAS_INSS_PADRAO: TabelaINSSSegurado[] = [
  // Pré-reforma: faixas fixas (vigente até 02/2020)
  // Portaria ME 914/2020 (valores de 01/2020)
  {
    vigencia_inicio: '2019-01',
    vigencia_fim: '2020-02',
    tipo: 'fixa',
    faixas: [
      { ate: 1830.29, aliquota: 0.08 },
      { ate: 3050.52, aliquota: 0.09 },
      { ate: 6101.06, aliquota: 0.11 },
    ],
    teto: 6101.06,
  },
  // Pós EC 103/2019 - Progressiva (03/2020 a 12/2020)
  {
    vigencia_inicio: '2020-03',
    vigencia_fim: '2020-12',
    tipo: 'progressiva',
    faixas: [
      { ate: 1045.00, aliquota: 0.075 },
      { ate: 2089.60, aliquota: 0.09 },
      { ate: 3134.40, aliquota: 0.12 },
      { ate: 6101.06, aliquota: 0.14 },
    ],
    teto: 6101.06,
  },
  // 2021 (Portaria SEPRT 477/2021)
  {
    vigencia_inicio: '2021-01',
    vigencia_fim: '2021-12',
    tipo: 'progressiva',
    faixas: [
      { ate: 1100.00, aliquota: 0.075 },
      { ate: 2203.48, aliquota: 0.09 },
      { ate: 3305.22, aliquota: 0.12 },
      { ate: 6433.57, aliquota: 0.14 },
    ],
    teto: 6433.57,
  },
  // 2022 (Portaria MTP 12/2022)
  {
    vigencia_inicio: '2022-01',
    vigencia_fim: '2022-12',
    tipo: 'progressiva',
    faixas: [
      { ate: 1212.00, aliquota: 0.075 },
      { ate: 2427.35, aliquota: 0.09 },
      { ate: 3641.03, aliquota: 0.12 },
      { ate: 7087.22, aliquota: 0.14 },
    ],
    teto: 7087.22,
  },
  // 2023 (Portaria MPS 26/2023)
  {
    vigencia_inicio: '2023-01',
    vigencia_fim: '2023-12',
    tipo: 'progressiva',
    faixas: [
      { ate: 1320.00, aliquota: 0.075 },
      { ate: 2571.29, aliquota: 0.09 },
      { ate: 3856.94, aliquota: 0.12 },
      { ate: 7507.49, aliquota: 0.14 },
    ],
    teto: 7507.49,
  },
  // 2024 (Portaria MPS 12/2024)
  {
    vigencia_inicio: '2024-01',
    vigencia_fim: '2024-12',
    tipo: 'progressiva',
    faixas: [
      { ate: 1412.00, aliquota: 0.075 },
      { ate: 2666.68, aliquota: 0.09 },
      { ate: 4000.03, aliquota: 0.12 },
      { ate: 7786.02, aliquota: 0.14 },
    ],
    teto: 7786.02,
  },
  // 2025 (Portaria MPS 6/2025)
  {
    vigencia_inicio: '2025-01',
    vigencia_fim: '2025-12',
    tipo: 'progressiva',
    faixas: [
      { ate: 1518.00, aliquota: 0.075 },
      { ate: 2793.88, aliquota: 0.09 },
      { ate: 4190.83, aliquota: 0.12 },
      { ate: 8157.41, aliquota: 0.14 },
    ],
    teto: 8157.41,
  },
];

/** Alíquotas padrão do empregador */
export const ALIQUOTAS_EMPREGADOR_PADRAO: AliquotasEmpregador = {
  empresa: 0.20,
  sat_rat: 0.02, // Grau médio (padrão)
  terceiros: 0.058,
  detalhamento_terceiros: {
    incra: 0.002,
    senai: 0.01,
    sesi: 0.015,
    sebrae: 0.006,
    salario_educacao: 0.025,
  },
};

// ---- CÁLCULO INSS SEGURADO ----

/**
 * Encontra a tabela INSS vigente para uma competência
 */
function encontrarTabelaINSS(
  competencia: string,
  tabelas: TabelaINSSSegurado[]
): TabelaINSSSegurado | null {
  for (const tabela of tabelas) {
    if (competencia >= tabela.vigencia_inicio) {
      if (!tabela.vigencia_fim || competencia <= tabela.vigencia_fim) {
        return tabela;
      }
    }
  }
  // Fallback: última tabela
  return tabelas.length > 0 ? tabelas[tabelas.length - 1] : null;
}

/**
 * Calcula INSS do segurado conforme tipo (fixa ou progressiva)
 * 
 * FIXA (pré-reforma): alíquota única sobre toda a base
 * PROGRESSIVA (pós EC 103): cada faixa é calculada isoladamente
 */
export function calcularINSSSegurado(
  base: number,
  tabela: TabelaINSSSegurado
): { valor: number; aliquota_efetiva: number } {
  if (base <= 0) return { valor: 0, aliquota_efetiva: 0 };

  const baseLimitada = Math.min(base, tabela.teto);

  if (tabela.tipo === 'fixa') {
    // Pré-reforma: alíquota única
    for (const faixa of tabela.faixas) {
      if (baseLimitada <= faixa.ate) {
        const valor = new Decimal(baseLimitada).times(faixa.aliquota).toDecimalPlaces(2).toNumber();
        return { valor, aliquota_efetiva: faixa.aliquota };
      }
    }
    // Acima de todas as faixas: teto
    const ultimaFaixa = tabela.faixas[tabela.faixas.length - 1];
    const valor = new Decimal(tabela.teto).times(ultimaFaixa.aliquota).toDecimalPlaces(2).toNumber();
    return { valor, aliquota_efetiva: ultimaFaixa.aliquota };
  }

  // Progressiva (EC 103/2019)
  let totalINSS = new Decimal(0);
  let faixaAnterior = 0;

  for (const faixa of tabela.faixas) {
    if (baseLimitada <= faixaAnterior) break;

    const topo = Math.min(baseLimitada, faixa.ate);
    const baseNaFaixa = Math.max(0, topo - faixaAnterior);

    totalINSS = totalINSS.plus(
      new Decimal(baseNaFaixa).times(faixa.aliquota)
    );

    faixaAnterior = faixa.ate;
  }

  const valor = totalINSS.toDecimalPlaces(2).toNumber();
  const aliquotaEfetiva = baseLimitada > 0 ? valor / baseLimitada : 0;

  return { valor, aliquota_efetiva: Number(aliquotaEfetiva.toFixed(6)) };
}

// ---- ENGINE PRINCIPAL CS ----

/**
 * Calcula Contribuição Social conforme PJe-Calc:
 * 
 * Para cada competência:
 * 1. Soma verbas com incidência CS (separando 13º)
 * 2. Calcula INSS segurado (progressivo ou fixo, conforme período)
 * 3. Calcula CS empregador (empresa + SAT + terceiros)
 * 4. 13º: base isolada (Art. 214, §6º, RPS)
 */
export function calcularContribuicaoSocial(
  resultadosVerbas: ResultadoVerba[],
  parametrosCS: ParametrosCS
): ResultadoCS {
  const memoria: MemoriaCS[] = [];
  const competencias: CSCompetencia[] = [];

  // Filtrar verbas com incidência CS
  const verbasComCS = resultadosVerbas.filter(r => r.incidencias.contribuicao_social);

  if (verbasComCS.length === 0) {
    return resultadoCSVazio();
  }

  // Coletar competências
  const todasComp = new Set<string>();
  for (const rv of verbasComCS) {
    for (const oc of rv.ocorrencias) {
      if (oc.ativa) todasComp.add(oc.competencia);
    }
  }

  const compsOrdenadas = Array.from(todasComp).sort();

  for (const comp of compsOrdenadas) {
    let baseComum = new Decimal(0);
    let base13 = new Decimal(0);

    for (const rv of verbasComCS) {
      const oc = rv.ocorrencias.find(o => o.competencia === comp && o.ativa);
      if (!oc) continue;

      // Férias gozadas + 1/3: isento de CS (Art. 28, §9º, "d", Lei 8.212/91)
      if (rv.caracteristica === 'ferias') continue;

      const valor = new Decimal(oc.diferenca);

      if (rv.caracteristica === '13_salario') {
        base13 = base13.plus(valor);
      } else {
        baseComum = baseComum.plus(valor);
      }
    }

    const baseTotal = baseComum.plus(base13);

    // ---- SEGURADO ----
    let csSeguradoComum = 0;
    let csSegurado13 = 0;
    let aliquotaEfetiva = 0;

    if (parametrosCS.calcular_segurado) {
      const tabela = encontrarTabelaINSS(comp, parametrosCS.tabelas_inss);
      if (tabela) {
        // Verbas comuns: usar remuneração total para enquadramento
        if (baseComum.gt(0)) {
          const resultComum = calcularINSSSegurado(baseComum.toNumber(), tabela);
          csSeguradoComum = resultComum.valor;
          aliquotaEfetiva = resultComum.aliquota_efetiva;

          memoria.push({
            competencia: comp,
            descricao: `INSS Segurado (comum) - alíq. efetiva ${(aliquotaEfetiva * 100).toFixed(2)}%`,
            formula: `Base: ${baseComum.toFixed(2)} | Teto: ${tabela.teto} | Tipo: ${tabela.tipo}`,
            valor: csSeguradoComum,
          });
        }

        // 13º: base isolada (Art. 214, §6º, RPS)
        if (base13.gt(0)) {
          const result13 = calcularINSSSegurado(base13.toNumber(), tabela);
          csSegurado13 = result13.valor;

          memoria.push({
            competencia: comp,
            descricao: `INSS Segurado (13º - base isolada)`,
            formula: `Base 13º: ${base13.toFixed(2)} | Alíq. efet.: ${(result13.aliquota_efetiva * 100).toFixed(2)}%`,
            valor: csSegurado13,
          });
        }
      }
    }

    // ---- EMPREGADOR ----
    let csEmpresa = 0;
    let csSAT = 0;
    let csTerceiros = 0;

    if (parametrosCS.calcular_empregador) {
      const baseEmpregador = baseTotal.toNumber();
      const aliq = parametrosCS.aliquotas_empregador;

      // Empresa: 20% (sem teto)
      csEmpresa = new Decimal(baseEmpregador).times(aliq.empresa).toDecimalPlaces(2).toNumber();

      // SAT/RAT: 1-3% (sem teto)
      csSAT = new Decimal(baseEmpregador).times(aliq.sat_rat).toDecimalPlaces(2).toNumber();

      // Terceiros: ~5.8% (sem teto)
      csTerceiros = new Decimal(baseEmpregador).times(aliq.terceiros).toDecimalPlaces(2).toNumber();

      if (baseEmpregador > 0) {
        memoria.push({
          competencia: comp,
          descricao: `CS Empregador`,
          formula: `Base: ${baseEmpregador.toFixed(2)} × (Empresa ${aliq.empresa * 100}% + SAT ${aliq.sat_rat * 100}% + Terc. ${aliq.terceiros * 100}%)`,
          valor: csEmpresa + csSAT + csTerceiros,
        });
      }
    }

    const csSeguradoTotal = csSeguradoComum + csSegurado13;
    const csEmpregadorTotal = csEmpresa + csSAT + csTerceiros;

    competencias.push({
      competencia: comp,
      base_comum: baseComum.toDecimalPlaces(2).toNumber(),
      base_13: base13.toDecimalPlaces(2).toNumber(),
      remuneracao_total: baseTotal.toDecimalPlaces(2).toNumber(),
      aliquota_efetiva_segurado: aliquotaEfetiva,
      cs_segurado_comum: csSeguradoComum,
      cs_segurado_13: csSegurado13,
      cs_segurado_total: csSeguradoTotal,
      cs_empregador_empresa: csEmpresa,
      cs_empregador_sat: csSAT,
      cs_empregador_terceiros: csTerceiros,
      cs_empregador_total: csEmpregadorTotal,
      cs_total_competencia: Number((csSeguradoTotal + csEmpregadorTotal).toFixed(2)),
    });
  }

  // Totalizar
  const totalSeguradoComum = competencias.reduce((s, c) => s + c.cs_segurado_comum, 0);
  const totalSegurado13 = competencias.reduce((s, c) => s + c.cs_segurado_13, 0);
  const totalSegurado = Number((totalSeguradoComum + totalSegurado13).toFixed(2));

  const totalEmpresa = competencias.reduce((s, c) => s + c.cs_empregador_empresa, 0);
  const totalSAT = competencias.reduce((s, c) => s + c.cs_empregador_sat, 0);
  const totalTerceiros = competencias.reduce((s, c) => s + c.cs_empregador_terceiros, 0);
  const totalEmpregador = Number((totalEmpresa + totalSAT + totalTerceiros).toFixed(2));

  return {
    competencias,
    total_segurado: totalSegurado,
    total_segurado_comum: Number(totalSeguradoComum.toFixed(2)),
    total_segurado_13: Number(totalSegurado13.toFixed(2)),
    total_empregador: totalEmpregador,
    total_empregador_empresa: Number(totalEmpresa.toFixed(2)),
    total_empregador_sat: Number(totalSAT.toFixed(2)),
    total_empregador_terceiros: Number(totalTerceiros.toFixed(2)),
    total_cs: Number((totalSegurado + totalEmpregador).toFixed(2)),
    memoria,
  };
}

function resultadoCSVazio(): ResultadoCS {
  return {
    competencias: [],
    total_segurado: 0,
    total_segurado_comum: 0,
    total_segurado_13: 0,
    total_empregador: 0,
    total_empregador_empresa: 0,
    total_empregador_sat: 0,
    total_empregador_terceiros: 0,
    total_cs: 0,
    memoria: [],
  };
}

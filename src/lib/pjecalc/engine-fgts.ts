// =====================================================
// PJE-CALC ENGINE: FGTS - Réplica exata da lógica PJe-Calc CSJT
// =====================================================
// Módulo FGTS conforme manual PJe-Calc:
// - Depósito mensal: 8% sobre verbas com incidência FGTS
// - Multa rescisória: 40% sobre saldo (dispensa sem justa causa)
// - LC 110/2001: 10% contribuição social sobre FGTS (extinta 01/2020)
// - FGTS sobre 13º: base isolada
// - Saldo para saque: soma depósitos corrigidos
// =====================================================

import { Decimal } from 'decimal.js';
import { ResultadoVerba, OcorrenciaVerba, ParametrosCalculo } from './types';

// ---- TIPOS FGTS ----

export type TipoDemissaoFGTS =
  | 'sem_justa_causa'
  | 'justa_causa'
  | 'pedido_demissao'
  | 'culpa_reciproca'
  | 'acordo_mutuo' // Art. 484-A CLT (Reforma Trabalhista)
  | 'falecimento'
  | 'aposentadoria';

export interface ParametrosFGTS {
  tipo_demissao: TipoDemissaoFGTS;
  // Alíquota FGTS (padrão 8%, aprendiz 2%)
  aliquota_fgts: number; // 0.08
  // Multa rescisória
  aplicar_multa: boolean;
  percentual_multa: number; // 0.40 ou 0.20 (acordo mútuo)
  // LC 110/2001 - contribuição social sobre FGTS
  aplicar_lc110: boolean;
  percentual_lc110: number; // 0.10
  // FGTS já depositado (informado pelo usuário)
  saldo_fgts_depositado: number;
  // Período de apuração FGTS (pode diferir do período das verbas)
  data_inicio_fgts?: string;
  data_fim_fgts?: string;
  // Flag para considerar prescrição do FGTS (diferente da quinquenal)
  prescricao_fgts: boolean;
  data_prescricao_fgts?: string;
}

export interface DepositoFGTS {
  competencia: string; // YYYY-MM
  // Bases por tipo
  base_verbas_comuns: number; // verbas comuns com incidência FGTS
  base_13_salario: number;   // 13º separado (Art. 15, Lei 8.036/90)
  // Depósitos calculados
  deposito_verbas_comuns: number; // 8% da base comum
  deposito_13_salario: number;    // 8% da base 13º
  deposito_total: number;
  // Depósito já realizado (informado ou do histórico)
  deposito_realizado: number;
  // Diferença
  diferenca: number;
  // Flags
  prescrito: boolean;
  fgts_ja_recolhido: boolean;
}

export interface MultaFGTS {
  tipo: 'multa_40' | 'multa_20' | 'lc110';
  descricao: string;
  base_calculo: number; // saldo para saque
  percentual: number;
  valor: number;
}

export interface ResultadoFGTS {
  depositos: DepositoFGTS[];
  // Totais
  total_depositos_devidos: number;
  total_depositos_realizados: number;
  total_diferenca_depositos: number;
  // Saldo
  saldo_para_saque: number; // total_diferenca + saldo já depositado
  // Multas
  multas: MultaFGTS[];
  total_multas: number;
  // Total geral FGTS
  total_fgts: number;
  // Audit
  memoria: MemoriaFGTS[];
}

export interface MemoriaFGTS {
  competencia: string;
  descricao: string;
  formula: string;
  valor: number;
}

// ---- REGRAS DE MULTA POR TIPO DE DEMISSÃO ----

function obterMultasPorDemissao(params: ParametrosFGTS): { multa40: number; lc110: number } {
  switch (params.tipo_demissao) {
    case 'sem_justa_causa':
      return { multa40: 0.40, lc110: params.aplicar_lc110 ? 0.10 : 0 };
    case 'acordo_mutuo':
      // Art. 484-A CLT: multa de 20%
      return { multa40: 0.20, lc110: params.aplicar_lc110 ? 0.10 : 0 };
    case 'culpa_reciproca':
      // Súmula 14 TST: multa de 20%
      return { multa40: 0.20, lc110: params.aplicar_lc110 ? 0.10 : 0 };
    case 'justa_causa':
    case 'pedido_demissao':
      // Sem multa
      return { multa40: 0, lc110: 0 };
    case 'falecimento':
    case 'aposentadoria':
      // Saque sem multa
      return { multa40: 0, lc110: 0 };
    default:
      return { multa40: 0, lc110: 0 };
  }
}

// ---- ENGINE PRINCIPAL ----

/**
 * Calcula FGTS conforme PJe-Calc:
 * 1. Para cada competência, soma as verbas com incidência FGTS
 * 2. Separa base de 13º (caracteristica = '13_salario')
 * 3. Calcula depósito = 8% × base
 * 4. Aplica multa rescisória sobre saldo
 * 5. Aplica LC 110 se aplicável
 */
export function calcularFGTS(
  resultadosVerbas: ResultadoVerba[],
  parametros: ParametrosCalculo,
  paramsFGTS: ParametrosFGTS
): ResultadoFGTS {
  const memoria: MemoriaFGTS[] = [];
  const depositos: DepositoFGTS[] = [];

  // 1. Filtrar verbas com incidência FGTS
  const verbasComFGTS = resultadosVerbas.filter(r => r.incidencias.fgts);

  if (verbasComFGTS.length === 0) {
    return resultadoVazio();
  }

  // 2. Coletar todas as competências únicas
  const todasCompetencias = new Set<string>();
  for (const rv of verbasComFGTS) {
    for (const oc of rv.ocorrencias) {
      if (oc.ativa) todasCompetencias.add(oc.competencia);
    }
  }

  const competenciasOrdenadas = Array.from(todasCompetencias).sort();

  // 3. Para cada competência, calcular depósito
  for (const comp of competenciasOrdenadas) {
    // Verificar prescrição FGTS
    const prescrito = paramsFGTS.prescricao_fgts &&
      paramsFGTS.data_prescricao_fgts &&
      comp < paramsFGTS.data_prescricao_fgts.substring(0, 7);

    let baseComum = new Decimal(0);
    let base13 = new Decimal(0);

    for (const rv of verbasComFGTS) {
      const oc = rv.ocorrencias.find(o => o.competencia === comp && o.ativa);
      if (!oc) continue;

      // Usar diferença (devido - pago) conforme PJe-Calc
      const valor = new Decimal(oc.diferenca);

      if (rv.caracteristica === '13_salario') {
        base13 = base13.plus(valor);
      } else {
        baseComum = baseComum.plus(valor);
      }
    }

    const aliquota = new Decimal(paramsFGTS.aliquota_fgts);
    const depositoComum = baseComum.times(aliquota).toDecimalPlaces(2);
    const deposito13 = base13.times(aliquota).toDecimalPlaces(2);
    const depositoTotal = depositoComum.plus(deposito13);

    const deposito: DepositoFGTS = {
      competencia: comp,
      base_verbas_comuns: baseComum.toDecimalPlaces(2).toNumber(),
      base_13_salario: base13.toDecimalPlaces(2).toNumber(),
      deposito_verbas_comuns: depositoComum.toNumber(),
      deposito_13_salario: deposito13.toNumber(),
      deposito_total: depositoTotal.toNumber(),
      deposito_realizado: 0,
      diferenca: depositoTotal.toNumber(),
      prescrito: !!prescrito,
      fgts_ja_recolhido: false,
    };

    depositos.push(deposito);

    // Memória de cálculo
    if (!prescrito && depositoTotal.gt(0)) {
      memoria.push({
        competencia: comp,
        descricao: `FGTS ${(paramsFGTS.aliquota_fgts * 100).toFixed(0)}%`,
        formula: `(Base Comum: ${baseComum.toFixed(2)} + Base 13º: ${base13.toFixed(2)}) × ${paramsFGTS.aliquota_fgts}`,
        valor: depositoTotal.toNumber(),
      });
    }
  }

  // 4. Totalizar depósitos (excluindo prescritos)
  const depositosAtivos = depositos.filter(d => !d.prescrito);
  const totalDevidos = depositosAtivos.reduce(
    (acc, d) => acc.plus(d.deposito_total), new Decimal(0)
  );
  const totalRealizados = depositosAtivos.reduce(
    (acc, d) => acc.plus(d.deposito_realizado), new Decimal(0)
  );
  const totalDiferenca = totalDevidos.minus(totalRealizados);

  // 5. Saldo para saque
  const saldoParaSaque = totalDiferenca.plus(paramsFGTS.saldo_fgts_depositado);

  // 6. Multas
  const multas: MultaFGTS[] = [];
  const { multa40, lc110 } = obterMultasPorDemissao(paramsFGTS);

  if (multa40 > 0 && saldoParaSaque.gt(0)) {
    const valorMulta = saldoParaSaque.times(multa40).toDecimalPlaces(2);
    const descMulta = multa40 === 0.40
      ? 'Multa rescisória 40% FGTS (Art. 18, §1º, Lei 8.036/90)'
      : 'Multa rescisória 20% FGTS (Art. 484-A CLT / Súmula 14 TST)';

    multas.push({
      tipo: multa40 === 0.40 ? 'multa_40' : 'multa_20',
      descricao: descMulta,
      base_calculo: saldoParaSaque.toNumber(),
      percentual: multa40,
      valor: valorMulta.toNumber(),
    });

    memoria.push({
      competencia: 'TOTAL',
      descricao: descMulta,
      formula: `${saldoParaSaque.toFixed(2)} × ${multa40}`,
      valor: valorMulta.toNumber(),
    });
  }

  // LC 110/2001 - contribuição social adicional de 10%
  // Vigente até 01/01/2020 (extinta pela Lei 13.932/2019)
  if (lc110 > 0 && saldoParaSaque.gt(0)) {
    // Verificar se a demissão foi antes de 01/2020
    const demissao = parametros.data_demissao;
    const dataLimiteLC110 = '2020-01-01';
    const aplicarLC110 = !demissao || demissao < dataLimiteLC110;

    if (aplicarLC110) {
      const valorLC110 = saldoParaSaque.times(lc110).toDecimalPlaces(2);
      multas.push({
        tipo: 'lc110',
        descricao: 'Contribuição social LC 110/2001 (10%)',
        base_calculo: saldoParaSaque.toNumber(),
        percentual: lc110,
        valor: valorLC110.toNumber(),
      });

      memoria.push({
        competencia: 'TOTAL',
        descricao: 'LC 110/2001 - Contribuição social 10%',
        formula: `${saldoParaSaque.toFixed(2)} × ${lc110}`,
        valor: valorLC110.toNumber(),
      });
    }
  }

  const totalMultas = multas.reduce((acc, m) => acc.plus(m.valor), new Decimal(0));
  const totalFGTS = totalDiferenca.plus(totalMultas);

  return {
    depositos,
    total_depositos_devidos: totalDevidos.toDecimalPlaces(2).toNumber(),
    total_depositos_realizados: totalRealizados.toDecimalPlaces(2).toNumber(),
    total_diferenca_depositos: totalDiferenca.toDecimalPlaces(2).toNumber(),
    saldo_para_saque: saldoParaSaque.toDecimalPlaces(2).toNumber(),
    multas,
    total_multas: totalMultas.toDecimalPlaces(2).toNumber(),
    total_fgts: totalFGTS.toDecimalPlaces(2).toNumber(),
    memoria,
  };
}

function resultadoVazio(): ResultadoFGTS {
  return {
    depositos: [],
    total_depositos_devidos: 0,
    total_depositos_realizados: 0,
    total_diferenca_depositos: 0,
    saldo_para_saque: 0,
    multas: [],
    total_multas: 0,
    total_fgts: 0,
    memoria: [],
  };
}

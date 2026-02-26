// =====================================================
// CALCULADORA DE VERBAS RESCISÓRIAS
// =====================================================
// Calcula automaticamente: saldo de salário, aviso prévio,
// férias proporcionais/vencidas e 13º proporcional

import {
  Calculator,
  CalculatorRules,
  CalcContext,
  CalcResult,
  CalculatorInputs,
  VerbaOutput,
  AuditLine,
  Warning,
  arredondarMoeda,
  parseFactAsNumber,
} from '../types';

interface RescisaoParams {
  tipo_demissao: 'sem_justa_causa' | 'justa_causa' | 'pedido_demissao' | 'rescisao_indireta' | 'acordo';
  data_admissao: Date;
  data_demissao: Date;
  salario_base: number;
}

function parseData(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

function normalizarTipoDemissao(value: string): RescisaoParams['tipo_demissao'] {
  const normalizado = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normalizado.includes('sem_justa_causa') ||
      (normalizado.includes('sem') && normalizado.includes('justa')) ||
      normalizado.includes('imotivada')) {
    return 'sem_justa_causa';
  }

  if (normalizado.includes('rescisao_indireta') || normalizado.includes('indireta')) {
    return 'rescisao_indireta';
  }

  if (normalizado.includes('pedido_demissao') || normalizado.includes('pedido')) {
    return 'pedido_demissao';
  }

  if (normalizado.includes('acordo')) {
    return 'acordo';
  }

  if (normalizado.includes('justa')) {
    return 'justa_causa';
  }

  return 'sem_justa_causa';
}

function anosDeServico(admissao: Date, demissao: Date): number {
  const diffMs = demissao.getTime() - admissao.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

function mesesProporcionais(inicio: Date, fim: Date): number {
  const diffMs = fim.getTime() - inicio.getTime();
  const meses = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
  const diasRestantes = Math.floor((diffMs % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
  return meses + (diasRestantes >= 15 ? 1 : 0);
}

export function createVerbasRescisoriasCalculator(rules: CalculatorRules): Calculator {
  const calculatorId = 'verbas_rescisorias';
  const calculatorNome = 'Verbas Rescisórias';
  const calculatorVersao = rules.versao || '1.0.0';
  
  return {
    id: calculatorId,
    nome: calculatorNome,
    version: calculatorVersao,
    
    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const verbas: VerbaOutput[] = [];
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      let lineNum = 1;
      
      // Extrair parâmetros dos fatos
      const rawTipoDemissao = String(
        ctx.facts['tipo_demissao']?.valor ||
        ctx.facts['motivo_demissao']?.valor ||
        inputs.tipo_demissao ||
        'sem_justa_causa'
      );
      const tipoDemissao = normalizarTipoDemissao(rawTipoDemissao);
      const dataAdmissaoFact = ctx.facts['data_admissao']?.valor || inputs.data_admissao;
      const dataDemissaoFact = ctx.facts['data_demissao']?.valor || inputs.data_demissao;
      const dataAdmissao = parseData(dataAdmissaoFact);
      const dataDemissao = parseData(dataDemissaoFact);
      
      const salarioFact = ctx.facts['salario_mensal'] || ctx.facts['salario_base'];
      const salarioFromFacts = parseFactAsNumber(salarioFact);
      const salarioFromInput = typeof inputs.salario_base === 'number'
        ? inputs.salario_base
        : Number(inputs.salario_base || 0);
      const salarioBase = salarioFromFacts > 0 ? salarioFromFacts : salarioFromInput;
      
      if (!dataAdmissao || !dataDemissao) {
        warnings.push({
          tipo: 'erro',
          codigo: 'DATAS_RESCISAO_FALTANDO',
          mensagem: 'Datas de admissão e/ou demissão não informadas',
          sugestao: 'Informe as datas na aba Premissas → Rescisão Contratual',
        });
        return {
          calculadoraId: calculatorId,
          calculadoraNome: calculatorNome,
          versao: calculatorVersao,
          outputs: { total_bruto: 0, total_liquido: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }
      
      if (salarioBase <= 0) {
        warnings.push({
          tipo: 'erro',
          codigo: 'SALARIO_INVALIDO',
          mensagem: 'Salário base não informado ou inválido',
          sugestao: 'Confirme o fato "salario_mensal" ou "salario_base" na validação',
        });
        return {
          calculadoraId: calculatorId,
          calculadoraNome: calculatorNome,
          versao: calculatorVersao,
          outputs: { total_bruto: 0, total_liquido: 0, verbas: [] },
          auditLines,
          warnings,
        };
      }
      
      const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
      
      // 1. SALDO DE SALÁRIO (sempre calculado)
      const diaRescisao = dataDemissao.getDate();
      const salarioDia = salarioBase / 30;
      const saldoSalario = arredondarMoeda(salarioDia * diaRescisao);
      
      verbas.push({
        codigo: 'SALDO_SAL',
        descricao: 'Saldo de Salário',
        valor_bruto: saldoSalario,
        competencias: [{ competencia, valor_bruto: saldoSalario }],
      });
      
      auditLines.push({
        linha: lineNum++,
        calculadora: 'verbas_rescisorias',
        competencia,
        descricao: 'Saldo de Salário',
        formula: `(${salarioBase} ÷ 30) × ${diaRescisao} dias`,
        valor_bruto: saldoSalario,
      });
      
      // 2. AVISO PRÉVIO INDENIZADO (sem justa causa ou rescisão indireta)
      if (['sem_justa_causa', 'rescisao_indireta'].includes(tipoDemissao)) {
        const anos = anosDeServico(dataAdmissao, dataDemissao);
        const diasBase = 30;
        const diasAdicionais = Math.min(anos * 3, 60);
        const diasAviso = diasBase + diasAdicionais;
        const valorAviso = arredondarMoeda((salarioBase / 30) * diasAviso);
        
        verbas.push({
          codigo: 'AVISO_PREVIO',
          descricao: 'Aviso Prévio Indenizado',
          valor_bruto: valorAviso,
          competencias: [{ competencia, valor_bruto: valorAviso }],
        });
        
        auditLines.push({
          linha: lineNum++,
          calculadora: 'verbas_rescisorias',
          competencia,
          descricao: `Aviso Prévio (${diasAviso} dias = 30 + ${anos} anos × 3)`,
          formula: `(${salarioBase} ÷ 30) × ${diasAviso}`,
          valor_bruto: valorAviso,
        });
      } else if (tipoDemissao === 'acordo') {
        // Acordo: 50% do aviso prévio
        const anos = anosDeServico(dataAdmissao, dataDemissao);
        const diasBase = 30;
        const diasAdicionais = Math.min(anos * 3, 60);
        const diasAviso = Math.ceil((diasBase + diasAdicionais) / 2);
        const valorAviso = arredondarMoeda((salarioBase / 30) * diasAviso);
        
        verbas.push({
          codigo: 'AVISO_PREVIO_ACORDO',
          descricao: 'Aviso Prévio (50% - Acordo)',
          valor_bruto: valorAviso,
          competencias: [{ competencia, valor_bruto: valorAviso }],
        });
        
        auditLines.push({
          linha: lineNum++,
          calculadora: 'verbas_rescisorias',
          competencia,
          descricao: `Aviso Prévio 50% Acordo (${diasAviso} dias)`,
          formula: `(${salarioBase} ÷ 30) × ${diasAviso}`,
          valor_bruto: valorAviso,
        });
      }
      
      // 3. FÉRIAS VENCIDAS + 1/3 (todos os tipos de demissão)
      let periodoInicio = new Date(dataAdmissao);
      let periodoNum = 0;
      
      while (periodoNum < 10) {
        const periodoFim = new Date(periodoInicio);
        periodoFim.setFullYear(periodoFim.getFullYear() + 1);
        
        const limiteGozo = new Date(periodoFim);
        limiteGozo.setFullYear(limiteGozo.getFullYear() + 1);
        
        if (limiteGozo <= dataDemissao) {
          periodoNum++;
          const valorFerias = salarioBase;
          const terco = valorFerias / 3;
          const totalFerias = arredondarMoeda(valorFerias + terco);
          
          verbas.push({
            codigo: 'FERIAS_VENC',
            descricao: `Férias Vencidas + 1/3 (${periodoNum}º período)`,
            valor_bruto: totalFerias,
            competencias: [{ competencia, valor_bruto: totalFerias }],
          });
          
          auditLines.push({
            linha: lineNum++,
            calculadora: 'verbas_rescisorias',
            competencia,
            descricao: `Férias Vencidas ${periodoNum}º período + 1/3`,
            formula: `${salarioBase} + (${salarioBase} ÷ 3)`,
            valor_bruto: totalFerias,
          });
          
          periodoInicio = periodoFim;
        } else {
          break;
        }
      }
      
      // 4. FÉRIAS PROPORCIONAIS + 1/3 (exceto justa causa)
      if (tipoDemissao !== 'justa_causa') {
        let inicioPerAq = new Date(dataAdmissao);
        while (true) {
          const proxAno = new Date(inicioPerAq);
          proxAno.setFullYear(proxAno.getFullYear() + 1);
          if (proxAno > dataDemissao) break;
          inicioPerAq = proxAno;
        }
        
        const avos = Math.min(mesesProporcionais(inicioPerAq, dataDemissao), 12);
        
        if (avos > 0) {
          const feriasBase = (salarioBase * avos) / 12;
          const terco = feriasBase / 3;
          const totalFerias = arredondarMoeda(feriasBase + terco);
          
          verbas.push({
            codigo: 'FERIAS_PROP',
            descricao: 'Férias Proporcionais + 1/3',
            valor_bruto: totalFerias,
            competencias: [{ competencia, valor_bruto: totalFerias }],
          });
          
          auditLines.push({
            linha: lineNum++,
            calculadora: 'verbas_rescisorias',
            competencia,
            descricao: `Férias Proporcionais (${avos}/12 avos) + 1/3`,
            formula: `(${salarioBase} × ${avos}/12) + 1/3`,
            valor_bruto: totalFerias,
          });
        }
      }
      
      // 5. 13º SALÁRIO PROPORCIONAL (exceto justa causa)
      if (tipoDemissao !== 'justa_causa') {
        const anoDemo = dataDemissao.getFullYear();
        let inicioAno = new Date(anoDemo, 0, 1);
        
        if (dataAdmissao.getFullYear() === anoDemo) {
          inicioAno = dataAdmissao;
        }
        
        const avos = Math.min(mesesProporcionais(inicioAno, dataDemissao), 12);
        
        if (avos > 0) {
          const decimo = arredondarMoeda((salarioBase * avos) / 12);
          
          verbas.push({
            codigo: 'DECIMO_PROP',
            descricao: '13º Salário Proporcional',
            valor_bruto: decimo,
            competencias: [{ competencia: `${anoDemo}-13`, valor_bruto: decimo }],
          });
          
          auditLines.push({
            linha: lineNum++,
            calculadora: 'verbas_rescisorias',
            competencia: `${anoDemo}-13`,
            descricao: `13º Proporcional (${avos}/12 avos)`,
            formula: `${salarioBase} × ${avos}/12`,
            valor_bruto: decimo,
          });
        }
      }
      
      // 6. MULTA FGTS (40% ou 20% para acordo)
      const totalFGTS = Number(inputs.total_fgts || 0);
      if (totalFGTS > 0) {
        if (['sem_justa_causa', 'rescisao_indireta'].includes(tipoDemissao)) {
          const multa = arredondarMoeda(totalFGTS * 0.4);
          
          verbas.push({
            codigo: 'MULTA_FGTS_40',
            descricao: 'Multa 40% FGTS',
            valor_bruto: multa,
            competencias: [{ competencia, valor_bruto: multa }],
          });
          
          auditLines.push({
            linha: lineNum++,
            calculadora: 'verbas_rescisorias',
            competencia,
            descricao: 'Multa 40% FGTS',
            formula: `${totalFGTS} × 0.40`,
            valor_bruto: multa,
          });
        } else if (tipoDemissao === 'acordo') {
          const multa = arredondarMoeda(totalFGTS * 0.2);
          
          verbas.push({
            codigo: 'MULTA_FGTS_20',
            descricao: 'Multa 20% FGTS (Acordo)',
            valor_bruto: multa,
            competencias: [{ competencia, valor_bruto: multa }],
          });
          
          auditLines.push({
            linha: lineNum++,
            calculadora: 'verbas_rescisorias',
            competencia,
            descricao: 'Multa 20% FGTS (Acordo Art. 484-A)',
            formula: `${totalFGTS} × 0.20`,
            valor_bruto: multa,
          });
        }
      }
      
      // Calcular totais
      const totalBruto = verbas.reduce((acc, v) => acc + v.valor_bruto, 0);
      
      return {
        calculadoraId: calculatorId,
        calculadoraNome: calculatorNome,
        versao: calculatorVersao,
        outputs: {
          total_bruto: arredondarMoeda(totalBruto),
          total_liquido: arredondarMoeda(totalBruto),
          verbas,
        },
        auditLines,
        warnings,
      };
    },
  };
}

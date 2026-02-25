// =====================================================
// RUBRICAS RESCISÓRIAS - VERBAS DE TÉRMINO DO CONTRATO
// =====================================================

import Decimal from 'decimal.js';
import {
  CalcResultItem,
  toDecimal,
} from '../types/index';
import { Rubrica } from './RubricaEngine';

// Configuração de precisão
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =====================================================
// RUBRICA: SALDO DE SALÁRIO
// =====================================================

export class SaldoSalario extends Rubrica {
  codigo = 'SALDO_SAL';
  nome = 'Saldo de Salário';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataDemissao) return [];
    
    const diaRescisao = dataDemissao.getDate();
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const salarioBase = this.getSalarioBase(competencia);
    const salarioDia = salarioBase.div(30);
    
    this.registrarPasso(
      'Cálculo do salário diário',
      'Salário Base ÷ 30',
      { salario_base: salarioBase.toNumber(), divisor: 30 },
      salarioDia,
      'Art. 457, CLT'
    );
    
    const saldo = salarioDia.times(diaRescisao);
    
    this.registrarPasso(
      'Saldo de salário',
      'Salário Diário × Dias Trabalhados',
      { salario_dia: salarioDia.toNumber(), dias: diaRescisao },
      saldo,
      'Art. 477, CLT'
    );
    
    const valorFinal = this.arredondar(saldo);
    
    return [this.criarResultItem({
      id: `${this.codigo}-${competencia}`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia,
      periodo_inicio: new Date(dataDemissao.getFullYear(), dataDemissao.getMonth(), 1),
      periodo_fim: dataDemissao,
      base_calculo: salarioDia,
      quantidade: toDecimal(diaRescisao),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: [],
      lineage: this.criarLineage(
        [
          { campo: 'salario_base', valor: salarioBase.toNumber(), tipo: 'money' },
          { campo: 'dias_trabalhados', valor: diaRescisao, tipo: 'number' },
        ],
        `(${salarioBase} ÷ 30) × ${diaRescisao}`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// RUBRICA: AVISO PRÉVIO INDENIZADO
// =====================================================

export class AvisoPrevio extends Rubrica {
  codigo = 'AVISO_PREVIO';
  nome = 'Aviso Prévio Indenizado';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const tipoDemissao = this.ctx.contrato.tipo_demissao;
    
    if (!['sem_justa_causa', 'rescisao_indireta'].includes(tipoDemissao)) {
      return [];
    }
    
    const dataAdmissao = this.ctx.contrato.data_admissao;
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataAdmissao || !dataDemissao) return [];
    
    const diffMs = dataDemissao.getTime() - dataAdmissao.getTime();
    const anosServico = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
    
    const diasBase = 30;
    const diasAdicionais = Math.min(anosServico * this.ctx.perfil.parametros.dias_aviso_por_ano, 60);
    let diasAviso = diasBase + diasAdicionais;
    
    const parametros = this.ctx.perfil.parametros;
    const fatorAcordo = 'fator_aviso_acordo' in parametros 
      ? (parametros as unknown as Record<string, number>).fator_aviso_acordo 
      : undefined;
    if (tipoDemissao === 'acordo' && fatorAcordo) {
      diasAviso = Math.ceil(diasAviso * fatorAcordo);
    }
    
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const remuneracao = this.getRemuneracaoBase(competencia);
    
    this.registrarPasso(
      'Dias de aviso prévio',
      '30 dias + (Anos de Serviço × 3 dias)',
      { dias_base: diasBase, anos_servico: anosServico, dias_adicionais: diasAdicionais },
      toDecimal(diasAviso),
      'Art. 487, §1º, CLT + Art. 1º, Lei 12.506/11'
    );
    
    const valor = remuneracao.times(diasAviso).div(30);
    
    this.registrarPasso(
      'Valor do aviso prévio',
      'Remuneração × (Dias Aviso ÷ 30)',
      { remuneracao: remuneracao.toNumber(), dias_aviso: diasAviso },
      valor,
      'Art. 487, §1º, CLT'
    );
    
    const valorFinal = this.arredondar(valor);
    
    return [this.criarResultItem({
      id: `${this.codigo}-total`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia,
      base_calculo: remuneracao,
      quantidade: toDecimal(diasAviso),
      fator: toDecimal(diasAviso).div(30),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: [],
      lineage: this.criarLineage(
        [
          { campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' },
          { campo: 'anos_servico', valor: anosServico, tipo: 'number' },
          { campo: 'dias_aviso', valor: diasAviso, tipo: 'number' },
        ],
        `${remuneracao} × (${diasAviso} ÷ 30)`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// RUBRICA: FÉRIAS VENCIDAS + 1/3
// =====================================================

export class FeriasVencidas extends Rubrica {
  codigo = 'FERIAS_VENC';
  nome = 'Férias Vencidas + 1/3';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const dataAdmissao = this.ctx.contrato.data_admissao;
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataAdmissao || !dataDemissao) return [];
    
    const resultados: CalcResultItem[] = [];
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const remuneracao = this.getRemuneracaoBase(competencia);
    
    let periodoInicio = new Date(dataAdmissao);
    let periodoNum = 0;
    
    while (true) {
      const periodoFim = new Date(periodoInicio);
      periodoFim.setFullYear(periodoFim.getFullYear() + 1);
      
      const limiteGozo = new Date(periodoFim);
      limiteGozo.setFullYear(limiteGozo.getFullYear() + 1);
      
      if (limiteGozo <= dataDemissao) {
        periodoNum++;
        
        const ferias = remuneracao;
        const terco = ferias.div(3);
        const total = ferias.plus(terco);
        
        this.registrarPasso(
          `Férias vencidas - Período ${periodoNum}`,
          'Remuneração + 1/3 Constitucional',
          { remuneracao: remuneracao.toNumber(), terco: terco.toNumber() },
          total,
          'Art. 137, CLT + Art. 7º, XVII, CF/88'
        );
        
        const valorFinal = this.arredondar(total);
        
        resultados.push(this.criarResultItem({
          id: `${this.codigo}-${periodoNum}`,
          rubrica_codigo: this.codigo,
          rubrica_nome: `${this.nome} (${periodoNum}º Período)`,
          competencia,
          periodo_inicio: periodoInicio,
          periodo_fim: new Date(periodoFim.getTime() - 1),
          base_calculo: remuneracao,
          quantidade: new Decimal(1),
          fator: new Decimal(4).div(3),
          valor_bruto: valorFinal,
          memoria: [...this.memorias],
          dependencias: [],
          lineage: this.criarLineage(
            [
              { campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' },
              { campo: 'periodo', valor: periodoNum, tipo: 'number' },
            ],
            `${remuneracao} + (${remuneracao} ÷ 3)`,
            valorFinal
          ),
        }));
        
        this.memorias = [];
        periodoInicio = new Date(periodoFim);
      } else {
        break;
      }
      
      if (periodoNum > 10) break;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: FÉRIAS PROPORCIONAIS + 1/3
// =====================================================

export class FeriasProporcionais extends Rubrica {
  codigo = 'FERIAS_PROP';
  nome = 'Férias Proporcionais + 1/3';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const tipoDemissao = this.ctx.contrato.tipo_demissao;
    
    if (tipoDemissao === 'justa_causa') {
      return [];
    }
    
    const dataAdmissao = this.ctx.contrato.data_admissao;
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataAdmissao || !dataDemissao) return [];
    
    let inicioPerAq = new Date(dataAdmissao);
    while (true) {
      const proxAno = new Date(inicioPerAq);
      proxAno.setFullYear(proxAno.getFullYear() + 1);
      if (proxAno > dataDemissao) break;
      inicioPerAq = proxAno;
    }
    
    const diffMs = dataDemissao.getTime() - inicioPerAq.getTime();
    const mesesTrabalhados = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
    
    const diasRestantes = Math.floor((diffMs % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    const avos = mesesTrabalhados + (diasRestantes >= 15 ? 1 : 0);
    
    if (avos === 0) return [];
    
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const remuneracao = this.getRemuneracaoBase(competencia);
    
    const feriasBase = remuneracao.times(avos).div(12);
    const terco = feriasBase.div(3);
    const total = feriasBase.plus(terco);
    
    this.registrarPasso(
      'Férias proporcionais base',
      'Remuneração × (Avos ÷ 12)',
      { remuneracao: remuneracao.toNumber(), avos, divisor: 12 },
      feriasBase,
      'Art. 146, parágrafo único, CLT'
    );
    
    this.registrarPasso(
      '1/3 constitucional',
      'Férias Proporcionais ÷ 3',
      { ferias_prop: feriasBase.toNumber() },
      terco,
      'Art. 7º, XVII, CF/88'
    );
    
    const valorFinal = this.arredondar(total);
    
    return [this.criarResultItem({
      id: `${this.codigo}-total`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia,
      periodo_inicio: inicioPerAq,
      periodo_fim: dataDemissao,
      base_calculo: remuneracao,
      quantidade: toDecimal(avos),
      fator: new Decimal(4).div(3).times(avos).div(12),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: [],
      lineage: this.criarLineage(
        [
          { campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' },
          { campo: 'avos', valor: avos, tipo: 'number' },
        ],
        `(${remuneracao} × ${avos}/12) + 1/3`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// RUBRICA: 13º SALÁRIO PROPORCIONAL
// =====================================================

export class DecimoTerceiroProporcional extends Rubrica {
  codigo = 'DECIMO_PROP';
  nome = '13º Salário Proporcional';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const tipoDemissao = this.ctx.contrato.tipo_demissao;
    
    if (tipoDemissao === 'justa_causa') {
      return [];
    }
    
    const dataAdmissao = this.ctx.contrato.data_admissao;
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataAdmissao || !dataDemissao) return [];
    
    const anoDemissao = dataDemissao.getFullYear();
    let inicioAno = new Date(anoDemissao, 0, 1);
    
    if (dataAdmissao.getFullYear() === anoDemissao) {
      inicioAno = dataAdmissao;
    }
    
    const diffMs = dataDemissao.getTime() - inicioAno.getTime();
    const mesesNoAno = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
    
    const diasRestantes = Math.floor((diffMs % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    const avos = Math.min(mesesNoAno + (diasRestantes >= 15 ? 1 : 0), 12);
    
    if (avos === 0) return [];
    
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const remuneracao = this.getRemuneracaoBase(competencia);
    
    const decimo = remuneracao.times(avos).div(12);
    
    this.registrarPasso(
      '13º salário proporcional',
      'Remuneração × (Avos ÷ 12)',
      { remuneracao: remuneracao.toNumber(), avos, divisor: 12 },
      decimo,
      'Art. 1º, Lei 4.090/62'
    );
    
    const valorFinal = this.arredondar(decimo);
    
    return [this.criarResultItem({
      id: `${this.codigo}-${anoDemissao}`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia: `${anoDemissao}-13`,
      periodo_inicio: inicioAno,
      periodo_fim: dataDemissao,
      base_calculo: remuneracao,
      quantidade: toDecimal(avos),
      fator: toDecimal(avos).div(12),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: [],
      lineage: this.criarLineage(
        [
          { campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' },
          { campo: 'avos', valor: avos, tipo: 'number' },
          { campo: 'ano', valor: anoDemissao, tipo: 'number' },
        ],
        `${remuneracao} × ${avos}/12`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// EXPORTAR RUBRICAS PARA REGISTRY
// =====================================================

export const RUBRICAS_RESCISAO = {
  SALDO_SAL: SaldoSalario,
  AVISO_PREVIO: AvisoPrevio,
  FERIAS_VENC: FeriasVencidas,
  FERIAS_PROP: FeriasProporcionais,
  DECIMO_PROP: DecimoTerceiroProporcional,
};
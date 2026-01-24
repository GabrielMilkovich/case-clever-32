// =====================================================
// ENGINE DE RUBRICAS - CÁLCULO DETERMINÍSTICO AUDITÁVEL
// =====================================================

import Decimal from 'decimal.js';
import {
  CalcProfile,
  CalcRule,
  CalcResultItem,
  MemoriaCalculo,
  CalcLineage,
  LineageInput,
  MonthlyData,
  ContractData,
  ValidatedInput,
  toDecimal,
  hashObject,
} from '../types/index';

// Configuração de precisão
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =====================================================
// CONTEXTO DE EXECUÇÃO
// =====================================================

export interface ExecutionContext {
  contrato: ContractData;
  perfil: CalcProfile;
  dadosMensais: Map<string, MonthlyData>;
  validacoes: Map<string, ValidatedInput>;
  resultados: Map<string, CalcResultItem[]>; // resultados por rubrica
  regras: Map<string, CalcRule>;
}

// =====================================================
// RUBRICA BASE (CLASSE ABSTRATA)
// =====================================================

export abstract class Rubrica {
  abstract codigo: string;
  abstract nome: string;
  abstract categoria: string;
  abstract dependencias: string[];
  
  protected ctx!: ExecutionContext;
  protected memorias: MemoriaCalculo[] = [];
  protected passoAtual: number = 0;
  
  // Inicializa o contexto
  setContext(ctx: ExecutionContext): void {
    this.ctx = ctx;
    this.memorias = [];
    this.passoAtual = 0;
  }
  
  // Registra um passo na memória de cálculo
  protected registrarPasso(
    descricao: string,
    formula: string,
    variaveis: Record<string, string | number>,
    resultado: Decimal
  ): Decimal {
    this.passoAtual++;
    this.memorias.push({
      passo: this.passoAtual,
      descricao,
      formula,
      variaveis,
      resultado,
    });
    return resultado;
  }
  
  // Obtém salário base para uma competência
  protected getSalarioBase(competencia: string): Decimal {
    const dados = this.ctx.dadosMensais.get(competencia);
    if (dados) return dados.salario_base;
    
    // Fallback para histórico salarial
    const compDate = new Date(competencia + '-01');
    for (const hist of this.ctx.contrato.historico_salarial) {
      if (compDate >= hist.data_inicio && compDate <= hist.data_fim) {
        return hist.salario_base;
      }
    }
    return this.ctx.contrato.salario_inicial;
  }
  
  // Obtém remuneração total (salário + adicionais integráveis)
  protected getRemuneracaoBase(competencia: string): Decimal {
    const salario = this.getSalarioBase(competencia);
    const dados = this.ctx.dadosMensais.get(competencia);
    
    if (!dados) return salario;
    
    let total = salario;
    for (const [, valor] of Object.entries(dados.adicionais)) {
      total = total.plus(valor);
    }
    return total;
  }
  
  // Obtém salário-hora
  protected getSalarioHora(competencia: string): Decimal {
    const remuneracao = this.getRemuneracaoBase(competencia);
    const divisor = this.ctx.perfil.parametros.divisor;
    return remuneracao.div(divisor);
  }
  
  // Obtém resultado de outra rubrica (para dependências)
  protected getResultadoRubrica(codigo: string, competencia?: string): Decimal {
    const resultados = this.ctx.resultados.get(codigo);
    if (!resultados) return new Decimal(0);
    
    if (competencia) {
      const item = resultados.find(r => r.competencia === competencia);
      return item?.valor_bruto ?? new Decimal(0);
    }
    
    // Soma todos os resultados
    return resultados.reduce((sum, r) => sum.plus(r.valor_bruto), new Decimal(0));
  }
  
  // Arredonda conforme configuração do perfil
  protected arredondar(valor: Decimal): Decimal {
    const casas = this.ctx.perfil.parametros.casas_decimais;
    switch (this.ctx.perfil.parametros.arredondamento) {
      case 'truncar':
        return valor.toDecimalPlaces(casas, Decimal.ROUND_DOWN);
      case 'ceiling':
        return valor.toDecimalPlaces(casas, Decimal.ROUND_UP);
      default:
        return valor.toDecimalPlaces(casas, Decimal.ROUND_HALF_UP);
    }
  }
  
  // Cria lineage para rastreabilidade
  protected criarLineage(
    inputs: LineageInput[],
    formulaAplicada: string,
    outputValor: Decimal
  ): CalcLineage {
    const regra = this.ctx.regras.get(this.codigo);
    return {
      rule_codigo: this.codigo,
      rule_versao: regra?.versao ?? 'v1',
      inputs,
      parametros: this.ctx.perfil.parametros as unknown as Record<string, string | number>,
      formula_aplicada: formulaAplicada,
      output_valor: outputValor,
      hash_reproducao: hashObject({ inputs, formulaAplicada, outputValor: outputValor.toString() }),
    };
  }
  
  // Método abstrato que cada rubrica implementa
  abstract calcular(): CalcResultItem[];
}

// =====================================================
// RUBRICA: HORAS EXTRAS 50%
// =====================================================

export class HorasExtras50 extends Rubrica {
  codigo = 'HE50';
  nome = 'Horas Extras 50%';
  categoria = 'horas_extras';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const resultados: CalcResultItem[] = [];
    const adicional = this.ctx.perfil.parametros.adicional_he_50;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      if (dados.horas_extras_50.isZero()) continue;
      
      const salarioHora = this.getSalarioHora(competencia);
      const horas = dados.horas_extras_50;
      const fator = new Decimal(1).plus(adicional);
      
      // Passo 1: Calcular salário-hora
      this.registrarPasso(
        'Cálculo do salário-hora',
        'Remuneração Base ÷ Divisor',
        { 
          remuneracao: this.getRemuneracaoBase(competencia).toNumber(),
          divisor: this.ctx.perfil.parametros.divisor 
        },
        salarioHora
      );
      
      // Passo 2: Aplicar adicional
      const valor = salarioHora.times(horas).times(fator);
      this.registrarPasso(
        'Cálculo das horas extras 50%',
        'Salário-hora × Quantidade × (1 + Adicional)',
        { 
          salario_hora: salarioHora.toNumber(),
          horas: horas.toNumber(),
          adicional: adicional,
          fator: fator.toNumber()
        },
        valor
      );
      
      const valorFinal = this.arredondar(valor);
      
      resultados.push({
        id: `${this.codigo}-${competencia}`,
        rubrica_codigo: this.codigo,
        rubrica_nome: this.nome,
        competencia,
        base_calculo: salarioHora,
        quantidade: horas,
        percentual: toDecimal(adicional),
        fator,
        valor_bruto: valorFinal,
        memoria: [...this.memorias],
        dependencias: [],
        lineage: this.criarLineage(
          [
            { campo: 'salario_hora', valor: salarioHora.toNumber(), tipo: 'money' },
            { campo: 'horas_extras_50', valor: horas.toNumber(), tipo: 'number' },
          ],
          `${salarioHora} × ${horas} × ${fator}`,
          valorFinal
        ),
      });
      
      this.memorias = [];
      this.passoAtual = 0;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: HORAS EXTRAS 100%
// =====================================================

export class HorasExtras100 extends Rubrica {
  codigo = 'HE100';
  nome = 'Horas Extras 100%';
  categoria = 'horas_extras';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const resultados: CalcResultItem[] = [];
    const adicional = this.ctx.perfil.parametros.adicional_he_100;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      if (dados.horas_extras_100.isZero()) continue;
      
      const salarioHora = this.getSalarioHora(competencia);
      const horas = dados.horas_extras_100;
      const fator = new Decimal(1).plus(adicional);
      
      this.registrarPasso(
        'Cálculo do salário-hora',
        'Remuneração Base ÷ Divisor',
        { 
          remuneracao: this.getRemuneracaoBase(competencia).toNumber(),
          divisor: this.ctx.perfil.parametros.divisor 
        },
        salarioHora
      );
      
      const valor = salarioHora.times(horas).times(fator);
      this.registrarPasso(
        'Cálculo das horas extras 100%',
        'Salário-hora × Quantidade × (1 + Adicional)',
        { 
          salario_hora: salarioHora.toNumber(),
          horas: horas.toNumber(),
          adicional: adicional,
          fator: fator.toNumber()
        },
        valor
      );
      
      const valorFinal = this.arredondar(valor);
      
      resultados.push({
        id: `${this.codigo}-${competencia}`,
        rubrica_codigo: this.codigo,
        rubrica_nome: this.nome,
        competencia,
        base_calculo: salarioHora,
        quantidade: horas,
        percentual: toDecimal(adicional),
        fator,
        valor_bruto: valorFinal,
        memoria: [...this.memorias],
        dependencias: [],
        lineage: this.criarLineage(
          [
            { campo: 'salario_hora', valor: salarioHora.toNumber(), tipo: 'money' },
            { campo: 'horas_extras_100', valor: horas.toNumber(), tipo: 'number' },
          ],
          `${salarioHora} × ${horas} × ${fator}`,
          valorFinal
        ),
      });
      
      this.memorias = [];
      this.passoAtual = 0;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: DSR SOBRE HORAS EXTRAS
// =====================================================

export class DSRHorasExtras extends Rubrica {
  codigo = 'DSR_HE';
  nome = 'DSR sobre Horas Extras';
  categoria = 'horas_extras';
  dependencias = ['HE50', 'HE100'];
  
  calcular(): CalcResultItem[] {
    const resultados: CalcResultItem[] = [];
    const metodo = this.ctx.perfil.parametros.metodo_dsr;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      const he50 = this.getResultadoRubrica('HE50', competencia);
      const he100 = this.getResultadoRubrica('HE100', competencia);
      const totalHE = he50.plus(he100);
      
      if (totalHE.isZero()) continue;
      
      let dsr: Decimal;
      
      if (metodo === 'fator_fixo') {
        // Método B: Fator fixo (ex: 1/6)
        const fator = new Decimal(this.ctx.perfil.parametros.fator_dsr ?? 1/6);
        dsr = totalHE.times(fator);
        
        this.registrarPasso(
          'DSR por fator fixo',
          'Total HE × Fator',
          { total_he: totalHE.toNumber(), fator: fator.toNumber() },
          dsr
        );
      } else {
        // Método A: Clássico semanal
        const diasUteis = dados.dias_uteis || 26;
        const diasDSR = dados.dias_dsr || 4;
        
        dsr = totalHE.div(diasUteis).times(diasDSR);
        
        this.registrarPasso(
          'DSR método clássico',
          '(Total HE ÷ Dias Úteis) × Dias DSR',
          { 
            total_he: totalHE.toNumber(), 
            dias_uteis: diasUteis, 
            dias_dsr: diasDSR 
          },
          dsr
        );
      }
      
      const valorFinal = this.arredondar(dsr);
      
      resultados.push({
        id: `${this.codigo}-${competencia}`,
        rubrica_codigo: this.codigo,
        rubrica_nome: this.nome,
        competencia,
        base_calculo: totalHE,
        quantidade: new Decimal(1),
        valor_bruto: valorFinal,
        memoria: [...this.memorias],
        dependencias: this.dependencias,
        lineage: this.criarLineage(
          [
            { campo: 'total_he', valor: totalHE.toNumber(), tipo: 'money' },
            { campo: 'metodo', valor: metodo, tipo: 'string' },
          ],
          `Método ${metodo}: ${valorFinal}`,
          valorFinal
        ),
      });
      
      this.memorias = [];
      this.passoAtual = 0;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: ADICIONAL NOTURNO
// =====================================================

export class AdicionalNoturno extends Rubrica {
  codigo = 'ADIC_NOT';
  nome = 'Adicional Noturno';
  categoria = 'adicionais';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const resultados: CalcResultItem[] = [];
    const percentual = this.ctx.perfil.parametros.percentual_noturno;
    const reducao = this.ctx.perfil.parametros.reducao_hora_noturna;
    const fatorReducao = this.ctx.perfil.parametros.fator_reducao_noturna;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      if (dados.horas_noturnas.isZero()) continue;
      
      const salarioHora = this.getSalarioHora(competencia);
      let horasCalculadas = dados.horas_noturnas;
      
      // Aplicar redução da hora noturna se configurado
      if (reducao) {
        horasCalculadas = horasCalculadas.div(fatorReducao);
        this.registrarPasso(
          'Conversão hora noturna (52\'30" → 60\')',
          'Horas Noturnas ÷ Fator Redução',
          { 
            horas_originais: dados.horas_noturnas.toNumber(),
            fator_reducao: fatorReducao
          },
          horasCalculadas
        );
      }
      
      const valor = salarioHora.times(horasCalculadas).times(percentual);
      
      this.registrarPasso(
        'Cálculo do adicional noturno',
        'Salário-hora × Horas × Percentual',
        { 
          salario_hora: salarioHora.toNumber(),
          horas: horasCalculadas.toNumber(),
          percentual: percentual
        },
        valor
      );
      
      const valorFinal = this.arredondar(valor);
      
      resultados.push({
        id: `${this.codigo}-${competencia}`,
        rubrica_codigo: this.codigo,
        rubrica_nome: this.nome,
        competencia,
        base_calculo: salarioHora,
        quantidade: horasCalculadas,
        percentual: toDecimal(percentual),
        valor_bruto: valorFinal,
        memoria: [...this.memorias],
        dependencias: [],
        lineage: this.criarLineage(
          [
            { campo: 'salario_hora', valor: salarioHora.toNumber(), tipo: 'money' },
            { campo: 'horas_noturnas', valor: dados.horas_noturnas.toNumber(), tipo: 'number' },
            { campo: 'reducao_aplicada', valor: reducao ? 'sim' : 'nao', tipo: 'string' },
          ],
          `${salarioHora} × ${horasCalculadas} × ${percentual}`,
          valorFinal
        ),
      });
      
      this.memorias = [];
      this.passoAtual = 0;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: REFLEXOS EM FÉRIAS
// =====================================================

export class ReflexoFerias extends Rubrica {
  codigo = 'REFL_FERIAS';
  nome = 'Reflexos em Férias + 1/3';
  categoria = 'reflexos';
  dependencias = ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT'];
  
  calcular(): CalcResultItem[] {
    const resultados: CalcResultItem[] = [];
    
    // Calcular média mensal dos integráveis
    let totalIntegravel = new Decimal(0);
    let mesesTrabalhados = 0;
    
    for (const [competencia] of this.ctx.dadosMensais) {
      let integravelMes = new Decimal(0);
      
      for (const dep of this.dependencias) {
        integravelMes = integravelMes.plus(this.getResultadoRubrica(dep, competencia));
      }
      
      if (integravelMes.greaterThan(0)) {
        totalIntegravel = totalIntegravel.plus(integravelMes);
        mesesTrabalhados++;
      }
    }
    
    if (mesesTrabalhados === 0) return [];
    
    const media = totalIntegravel.div(mesesTrabalhados);
    
    this.registrarPasso(
      'Cálculo da média mensal integrável',
      'Total Integráveis ÷ Meses',
      { total: totalIntegravel.toNumber(), meses: mesesTrabalhados },
      media
    );
    
    // Férias = média
    const ferias = media;
    this.registrarPasso(
      'Base de férias',
      'Média Mensal',
      { media: media.toNumber() },
      ferias
    );
    
    // 1/3 constitucional
    const terco = ferias.div(3);
    this.registrarPasso(
      '1/3 constitucional',
      'Férias ÷ 3',
      { ferias: ferias.toNumber() },
      terco
    );
    
    const total = ferias.plus(terco);
    const valorFinal = this.arredondar(total);
    
    resultados.push({
      id: `${this.codigo}-total`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      base_calculo: media,
      quantidade: new Decimal(1),
      fator: new Decimal(4).div(3), // 1 + 1/3
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: this.dependencias,
      lineage: this.criarLineage(
        [{ campo: 'media_integravel', valor: media.toNumber(), tipo: 'money' }],
        `${media} + (${media} ÷ 3) = ${valorFinal}`,
        valorFinal
      ),
    });
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: REFLEXOS EM 13º SALÁRIO
// =====================================================

export class Reflexo13 extends Rubrica {
  codigo = 'REFL_13';
  nome = 'Reflexos em 13º Salário';
  categoria = 'reflexos';
  dependencias = ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT'];
  
  calcular(): CalcResultItem[] {
    const resultados: CalcResultItem[] = [];
    
    // Agrupar por ano
    const porAno = new Map<number, { total: Decimal; meses: number }>();
    
    for (const [competencia] of this.ctx.dadosMensais) {
      const ano = parseInt(competencia.split('-')[0]);
      let integravelMes = new Decimal(0);
      
      for (const dep of this.dependencias) {
        integravelMes = integravelMes.plus(this.getResultadoRubrica(dep, competencia));
      }
      
      if (integravelMes.greaterThan(0)) {
        const atual = porAno.get(ano) || { total: new Decimal(0), meses: 0 };
        atual.total = atual.total.plus(integravelMes);
        atual.meses++;
        porAno.set(ano, atual);
      }
    }
    
    for (const [ano, dados] of porAno) {
      if (dados.meses === 0) continue;
      
      const media = dados.total.div(dados.meses);
      const avos = Math.min(dados.meses, 12);
      const decimo = media.times(avos).div(12);
      
      this.registrarPasso(
        `Média integrável ${ano}`,
        'Total ÷ Meses trabalhados',
        { total: dados.total.toNumber(), meses: dados.meses },
        media
      );
      
      this.registrarPasso(
        `13º proporcional ${ano}`,
        'Média × (Avos ÷ 12)',
        { media: media.toNumber(), avos, divisor: 12 },
        decimo
      );
      
      const valorFinal = this.arredondar(decimo);
      
      resultados.push({
        id: `${this.codigo}-${ano}`,
        rubrica_codigo: this.codigo,
        rubrica_nome: this.nome,
        competencia: `${ano}-13`,
        base_calculo: media,
        quantidade: toDecimal(avos),
        fator: new Decimal(avos).div(12),
        valor_bruto: valorFinal,
        memoria: [...this.memorias],
        dependencias: this.dependencias,
        lineage: this.criarLineage(
          [
            { campo: 'media', valor: media.toNumber(), tipo: 'money' },
            { campo: 'avos', valor: avos, tipo: 'number' },
          ],
          `${media} × ${avos}/12`,
          valorFinal
        ),
      });
      
      this.memorias = [];
      this.passoAtual = 0;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: FGTS
// =====================================================

export class FGTS extends Rubrica {
  codigo = 'FGTS';
  nome = 'FGTS Não Depositado';
  categoria = 'reflexos';
  dependencias = ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT', 'REFL_FERIAS', 'REFL_13'];
  
  calcular(): CalcResultItem[] {
    const resultados: CalcResultItem[] = [];
    const aliquota = this.ctx.perfil.parametros.aliquota_fgts;
    
    // FGTS mensal sobre remuneração + integráveis
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      let baseCalculo = dados.salario_base;
      
      // Adicionar integráveis do mês
      for (const dep of ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT']) {
        baseCalculo = baseCalculo.plus(this.getResultadoRubrica(dep, competencia));
      }
      
      if (baseCalculo.isZero()) continue;
      
      const fgts = baseCalculo.times(aliquota);
      
      this.registrarPasso(
        'FGTS mensal',
        'Base × Alíquota',
        { base: baseCalculo.toNumber(), aliquota },
        fgts
      );
      
      const valorFinal = this.arredondar(fgts);
      
      resultados.push({
        id: `${this.codigo}-${competencia}`,
        rubrica_codigo: this.codigo,
        rubrica_nome: this.nome,
        competencia,
        base_calculo: baseCalculo,
        quantidade: new Decimal(1),
        percentual: toDecimal(aliquota),
        valor_bruto: valorFinal,
        memoria: [...this.memorias],
        dependencias: this.dependencias.filter(d => 
          ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT'].includes(d)
        ),
        lineage: this.criarLineage(
          [{ campo: 'base_fgts', valor: baseCalculo.toNumber(), tipo: 'money' }],
          `${baseCalculo} × ${aliquota}`,
          valorFinal
        ),
      });
      
      this.memorias = [];
      this.passoAtual = 0;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: MULTA 40% FGTS
// =====================================================

export class MultaFGTS extends Rubrica {
  codigo = 'MULTA_FGTS';
  nome = 'Multa 40% FGTS';
  categoria = 'rescisao';
  dependencias = ['FGTS'];
  
  calcular(): CalcResultItem[] {
    const tipoDemissao = this.ctx.contrato.tipo_demissao;
    
    // Só aplica multa em demissão sem justa causa ou rescisão indireta
    if (!['sem_justa_causa', 'rescisao_indireta'].includes(tipoDemissao)) {
      return [];
    }
    
    const totalFGTS = this.getResultadoRubrica('FGTS');
    if (totalFGTS.isZero()) return [];
    
    let percentualMulta = this.ctx.perfil.parametros.multa_fgts;
    
    // Acordo: multa de 20%
    if (tipoDemissao === 'acordo') {
      percentualMulta = 0.2;
    }
    
    const multa = totalFGTS.times(percentualMulta);
    
    this.registrarPasso(
      'Multa FGTS',
      'Total FGTS × Percentual',
      { total_fgts: totalFGTS.toNumber(), percentual: percentualMulta },
      multa
    );
    
    const valorFinal = this.arredondar(multa);
    
    return [{
      id: `${this.codigo}-total`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      base_calculo: totalFGTS,
      quantidade: new Decimal(1),
      percentual: toDecimal(percentualMulta),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: this.dependencias,
      lineage: this.criarLineage(
        [
          { campo: 'total_fgts', valor: totalFGTS.toNumber(), tipo: 'money' },
          { campo: 'tipo_demissao', valor: tipoDemissao, tipo: 'string' },
        ],
        `${totalFGTS} × ${percentualMulta}`,
        valorFinal
      ),
    }];
  }
}

// =====================================================
// REGISTRY DE RUBRICAS
// =====================================================

import {
  SaldoSalario,
  AvisoPrevio,
  FeriasVencidas,
  FeriasProporcionais,
  DecimoTerceiroProporcional,
} from './RubricasRescisao';

export const RUBRICAS_REGISTRY: Map<string, new () => Rubrica> = new Map([
  // Horas Extras
  ['HE50', HorasExtras50],
  ['HE100', HorasExtras100],
  ['DSR_HE', DSRHorasExtras],
  // Adicionais
  ['ADIC_NOT', AdicionalNoturno],
  // Reflexos
  ['REFL_FERIAS', ReflexoFerias],
  ['REFL_13', Reflexo13],
  ['FGTS', FGTS],
  ['MULTA_FGTS', MultaFGTS],
  // Rescisórias
  ['SALDO_SAL', SaldoSalario],
  ['AVISO_PREVIO', AvisoPrevio],
  ['FERIAS_VENC', FeriasVencidas],
  ['FERIAS_PROP', FeriasProporcionais],
  ['DECIMO_PROP', DecimoTerceiroProporcional],
]);

// Ordem de execução (respeita dependências)
export const ORDEM_EXECUCAO = [
  // Horas extras primeiro
  'HE50',
  'HE100',
  'DSR_HE',
  // Adicionais
  'ADIC_NOT',
  // Reflexos
  'REFL_FERIAS',
  'REFL_13',
  'FGTS',
  'MULTA_FGTS',
  // Rescisórias por último
  'SALDO_SAL',
  'AVISO_PREVIO',
  'FERIAS_VENC',
  'FERIAS_PROP',
  'DECIMO_PROP',
];

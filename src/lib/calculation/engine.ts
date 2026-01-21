// =====================================================
// MOTOR DE CÁLCULO - ENGINE PRINCIPAL
// =====================================================

import {
  CalcContext,
  CalcResult,
  CalculationProfile,
  CalculationRunResult,
  Calculator,
  CalculatorInputs,
  CalculatorRules,
  CalculatorUsed,
  ConsolidatedResult,
  FactMap,
  IndexSeries,
  TaxTable,
  Warning,
  AuditLine,
  arredondarMoeda,
} from './types';
import { createHorasExtrasCalculator } from './calculators/horas-extras';
import { createReflexos13Calculator } from './calculators/reflexos-13';
import { createReflexosFeriasCalculator } from './calculators/reflexos-ferias';
import { createFGTSCalculator } from './calculators/fgts';
import { createINSSCalculator } from './calculators/inss';
import { createAtualizacaoMonetariaCalculator } from './calculators/atualizacao-monetaria';

// Registry de calculadoras disponíveis
const calculatorRegistry: Map<string, (rules: CalculatorRules) => Calculator> = new Map([
  ['horas_extras', createHorasExtrasCalculator],
  ['reflexos_13', createReflexos13Calculator],
  ['reflexos_ferias', createReflexosFeriasCalculator],
  ['fgts', createFGTSCalculator],
  ['inss', createINSSCalculator],
  ['atualizacao_monetaria', createAtualizacaoMonetariaCalculator],
]);

// Registrar uma nova calculadora
export function registerCalculator(
  nome: string,
  factory: (rules: CalculatorRules) => Calculator
): void {
  calculatorRegistry.set(nome, factory);
}

// Obter lista de calculadoras disponíveis
export function getAvailableCalculators(): string[] {
  return Array.from(calculatorRegistry.keys());
}

// Criar instância de calculadora a partir de regras
export function createCalculator(
  nome: string,
  rules: CalculatorRules
): Calculator | null {
  const factory = calculatorRegistry.get(nome);
  if (!factory) {
    console.warn(`Calculadora "${nome}" não encontrada no registry`);
    return null;
  }
  return factory(rules);
}

// Classe principal do motor de cálculo
export class CalculationEngine {
  private profile: CalculationProfile;
  private indices: IndexSeries[];
  private taxTables: TaxTable[];
  private facts: FactMap;
  private dataReferencia: Date;
  private calculators: Map<string, Calculator> = new Map();
  private allAuditLines: AuditLine[] = [];
  private allWarnings: Warning[] = [];

  constructor(
    profile: CalculationProfile,
    indices: IndexSeries[],
    taxTables: TaxTable[],
    facts: FactMap,
    dataReferencia?: Date
  ) {
    this.profile = profile;
    this.indices = indices;
    this.taxTables = taxTables;
    this.facts = facts;
    this.dataReferencia = dataReferencia || new Date();
  }

  // Carregar calculadoras com suas versões/regras
  loadCalculators(calculatorsWithRules: { nome: string; rules: CalculatorRules }[]): void {
    for (const { nome, rules } of calculatorsWithRules) {
      const calculator = createCalculator(nome, rules);
      if (calculator) {
        this.calculators.set(nome, calculator);
      } else {
        this.allWarnings.push({
          tipo: 'atencao',
          codigo: 'CALC_NAO_ENCONTRADA',
          mensagem: `Calculadora "${nome}" não foi encontrada no sistema`,
          sugestao: 'Verifique se o nome está correto ou se a calculadora está implementada',
        });
      }
    }
  }

  // Criar contexto de cálculo
  private createContext(): CalcContext {
    return {
      profile: this.profile,
      indices: this.indices,
      taxTables: this.taxTables,
      facts: this.facts,
      dataReferencia: this.dataReferencia,
    };
  }

  // Executar uma calculadora específica
  executeCalculator(nome: string, inputs?: CalculatorInputs): CalcResult | null {
    const calculator = this.calculators.get(nome);
    if (!calculator) {
      this.allWarnings.push({
        tipo: 'erro',
        codigo: 'CALC_NAO_CARREGADA',
        mensagem: `Calculadora "${nome}" não está carregada`,
      });
      return null;
    }

    const ctx = this.createContext();
    const result = calculator.execute(ctx, inputs || {});

    // Numerar linhas de auditoria sequencialmente
    const startLine = this.allAuditLines.length + 1;
    result.auditLines.forEach((line, i) => {
      line.linha = startLine + i;
    });

    this.allAuditLines.push(...result.auditLines);
    this.allWarnings.push(...result.warnings);

    return result;
  }

  // Executar todas as calculadoras na ordem correta
  executeAll(): CalculationRunResult {
    const results: CalcResult[] = [];
    const calculatorsUsed: CalculatorUsed[] = [];

    // Ordem de execução (verbas base primeiro, depois reflexos)
    const executionOrder = [
      'horas_extras',
      'reflexos_13',
      'reflexos_ferias',
      'fgts',
      'inss',
      'atualizacao_monetaria',
    ];

    // Executar na ordem
    for (const nome of executionOrder) {
      if (this.calculators.has(nome)) {
        const calculator = this.calculators.get(nome)!;
        const result = this.executeCalculator(nome);
        if (result) {
          results.push(result);
          calculatorsUsed.push({
            calculator_id: calculator.id,
            nome: calculator.nome,
            versao: calculator.version,
            vigencia: this.dataReferencia.toISOString().split('T')[0],
          });
        }
      }
    }

    // Calcular totais consolidados
    const resultado_bruto = this.consolidateResults(results, 'bruto');
    const resultado_liquido = this.consolidateResults(results, 'liquido');

    // Aplicar arredondamento conforme perfil
    if (this.profile.config.arredondamento === 'final') {
      resultado_bruto.total = arredondarMoeda(resultado_bruto.total);
      resultado_liquido.total = arredondarMoeda(resultado_liquido.total);
    }

    return {
      case_id: '', // será preenchido pelo caller
      profile_id: this.profile.id,
      facts_snapshot: this.facts,
      calculators_used: calculatorsUsed,
      resultado_bruto,
      resultado_liquido,
      auditLines: this.allAuditLines,
      warnings: this.allWarnings,
      executado_em: new Date(),
    };
  }

  // Consolidar resultados de múltiplas calculadoras
  private consolidateResults(
    results: CalcResult[],
    tipo: 'bruto' | 'liquido'
  ): ConsolidatedResult {
    const por_verba: ConsolidatedResult['por_verba'] = {};
    const por_competencia: { [competencia: string]: number } = {};
    let total = 0;

    for (const result of results) {
      for (const verba of result.outputs.verbas) {
        const valor = tipo === 'bruto' ? verba.valor_bruto : (verba.valor_liquido ?? verba.valor_bruto);
        
        if (!por_verba[verba.codigo]) {
          por_verba[verba.codigo] = {
            descricao: verba.descricao,
            valor: 0,
          };
        }
        por_verba[verba.codigo].valor += valor;
        total += valor;

        // Agregar por competência
        if (verba.competencias) {
          for (const comp of verba.competencias) {
            const compValor = tipo === 'bruto' ? comp.valor_bruto : (comp.valor_liquido ?? comp.valor_bruto);
            por_competencia[comp.competencia] = (por_competencia[comp.competencia] || 0) + compValor;
          }
        }
      }
    }

    return { total, por_verba, por_competencia };
  }

  // Getters
  getAuditLines(): AuditLine[] {
    return this.allAuditLines;
  }

  getWarnings(): Warning[] {
    return this.allWarnings;
  }
}

// Helper para buscar índice de atualização
export function getIndexValue(
  indices: IndexSeries[],
  nome: string,
  competencia: Date
): number | null {
  const compStr = `${competencia.getFullYear()}-${String(competencia.getMonth() + 1).padStart(2, '0')}`;
  const index = indices.find(
    (i) => i.nome === nome && formatCompetencia(i.competencia) === compStr
  );
  return index ? index.valor : null;
}

function formatCompetencia(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Helper para buscar tabela de imposto vigente
export function getTaxTable(
  taxTables: TaxTable[],
  tipo: 'inss' | 'irrf',
  data: Date
): TaxTable | null {
  return taxTables.find(
    (t) =>
      t.tipo === tipo &&
      t.vigencia_inicio <= data &&
      (!t.vigencia_fim || t.vigencia_fim >= data)
  ) || null;
}

// Calcular imposto com base na tabela
export function calcularImposto(
  base: number,
  tabela: TaxTable
): { valor: number; aliquota_efetiva: number } {
  if (tabela.tipo === 'inss') {
    // INSS progressivo (pós-reforma 2020)
    let imposto = 0;
    let baseRestante = base;
    let faixaAnterior = 0;

    for (const faixa of tabela.faixas) {
      const limiteAteFaixa = faixa.ate - faixaAnterior;
      const baseNaFaixa = Math.min(baseRestante, limiteAteFaixa);
      
      if (baseNaFaixa > 0) {
        imposto += baseNaFaixa * faixa.aliquota;
        baseRestante -= baseNaFaixa;
      }
      
      if (baseRestante <= 0) break;
      faixaAnterior = faixa.ate;
    }

    return {
      valor: arredondarMoeda(imposto),
      aliquota_efetiva: base > 0 ? imposto / base : 0,
    };
  } else {
    // IRRF por faixa única
    for (const faixa of tabela.faixas) {
      if (base <= faixa.ate || faixa.ate === 0) {
        const imposto = base * faixa.aliquota - (faixa.deducao || 0);
        return {
          valor: arredondarMoeda(Math.max(0, imposto)),
          aliquota_efetiva: base > 0 ? Math.max(0, imposto) / base : 0,
        };
      }
    }
    
    // Última faixa (sem limite)
    const ultimaFaixa = tabela.faixas[tabela.faixas.length - 1];
    const imposto = base * ultimaFaixa.aliquota - (ultimaFaixa.deducao || 0);
    return {
      valor: arredondarMoeda(Math.max(0, imposto)),
      aliquota_efetiva: base > 0 ? Math.max(0, imposto) / base : 0,
    };
  }
}

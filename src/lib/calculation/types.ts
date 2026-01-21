// =====================================================
// MOTOR DE CÁLCULO TRABALHISTA - TIPOS E INTERFACES
// =====================================================

// Interface base de uma calculadora
export interface Calculator {
  id: string;
  nome: string;
  version: string;
  execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult;
}

// Contexto compartilhado entre calculadoras
export interface CalcContext {
  profile: CalculationProfile;
  indices: IndexSeries[];
  taxTables: TaxTable[];
  facts: FactMap;
  dataReferencia: Date;
}

// Perfil de cálculo com configurações
export interface CalculationProfile {
  id: string;
  nome: string;
  config: ProfileConfig;
  calculadoras_incluidas: string[];
}

export interface ProfileConfig {
  atualizacao: 'ipca_e' | 'inpc' | 'tr' | 'selic' | 'nenhum';
  juros: 'selic' | '1_am' | '0.5_am' | 'nenhum';
  arredondamento: 'competencia' | 'final' | 'nenhum';
}

// Série de índices econômicos
export interface IndexSeries {
  nome: string;
  competencia: Date;
  valor: number;
  fonte?: string;
}

// Tabela de impostos (INSS/IRRF)
export interface TaxTable {
  id: string;
  tipo: 'inss' | 'irrf';
  vigencia_inicio: Date;
  vigencia_fim?: Date;
  faixas: TaxBracket[];
}

export interface TaxBracket {
  ate: number;
  aliquota: number;
  deducao?: number;
}

// Mapa de fatos do caso
export interface FactMap {
  [chave: string]: FactValue;
}

export interface FactValue {
  valor: string | number | boolean | Date;
  tipo: 'texto' | 'numero' | 'data' | 'moeda' | 'booleano';
  confianca?: number;
  confirmado: boolean;
}

// Inputs para uma calculadora específica
export interface CalculatorInputs {
  [key: string]: unknown;
}

// Regras JSON de uma calculadora
export interface CalculatorRules {
  versao: string;
  vigencia_inicio: string;
  vigencia_fim?: string;
  regras: {
    [key: string]: unknown;
  };
  formula?: string;
}

// Resultado de uma calculadora
export interface CalcResult {
  calculadoraId: string;
  calculadoraNome: string;
  versao: string;
  outputs: CalculatorOutputs;
  auditLines: AuditLine[];
  warnings: Warning[];
}

export interface CalculatorOutputs {
  total_bruto: number;
  total_liquido?: number;
  verbas: VerbaOutput[];
}

export interface VerbaOutput {
  codigo: string;
  descricao: string;
  valor_bruto: number;
  valor_liquido?: number;
  competencias?: CompetenciaOutput[];
}

export interface CompetenciaOutput {
  competencia: string; // "2023-01" format
  valor_bruto: number;
  valor_liquido?: number;
  detalhes?: { [key: string]: unknown };
}

// Linha de auditoria (memória de cálculo)
export interface AuditLine {
  linha: number;
  calculadora: string;
  competencia?: string;
  descricao: string;
  formula?: string;
  valor_bruto?: number;
  valor_liquido?: number;
  metadata?: { [key: string]: unknown };
}

// Alertas e warnings
export interface Warning {
  tipo: 'info' | 'atencao' | 'erro';
  codigo: string;
  mensagem: string;
  sugestao?: string;
  campo?: string;
}

// Resultado consolidado de uma execução completa
export interface CalculationRunResult {
  run_id?: string;
  case_id: string;
  profile_id: string;
  facts_snapshot: FactMap;
  calculators_used: CalculatorUsed[];
  resultado_bruto: ConsolidatedResult;
  resultado_liquido: ConsolidatedResult;
  auditLines: AuditLine[];
  warnings: Warning[];
  executado_em: Date;
}

export interface CalculatorUsed {
  calculator_id: string;
  nome: string;
  versao: string;
  vigencia: string;
}

export interface ConsolidatedResult {
  total: number;
  por_verba: {
    [codigo: string]: {
      descricao: string;
      valor: number;
    };
  };
  por_competencia?: {
    [competencia: string]: number;
  };
}

// Utilitários para parsing de fatos
export function parseFactAsNumber(fact: FactValue | undefined): number {
  if (!fact) return 0;
  if (typeof fact.valor === 'number') return fact.valor;
  if (typeof fact.valor === 'string') {
    const cleaned = fact.valor.replace(/[^\d.,\-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

export function parseFactAsDate(fact: FactValue | undefined): Date | null {
  if (!fact) return null;
  if (fact.valor instanceof Date) return fact.valor;
  if (typeof fact.valor === 'string') {
    const date = new Date(fact.valor);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function parseFactAsString(fact: FactValue | undefined): string {
  if (!fact) return '';
  return String(fact.valor);
}

export function parseFactAsBoolean(fact: FactValue | undefined): boolean {
  if (!fact) return false;
  if (typeof fact.valor === 'boolean') return fact.valor;
  if (typeof fact.valor === 'string') {
    return ['sim', 'true', '1', 'yes'].includes(fact.valor.toLowerCase());
  }
  return Boolean(fact.valor);
}

// Utilitários de data
export function formatCompetencia(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function parseCompetencia(competencia: string): Date {
  const [year, month] = competencia.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function getMonthsBetween(start: Date, end: Date): string[] {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (current <= endMonth) {
    months.push(formatCompetencia(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

// Arredondamento monetário
export function arredondarMoeda(valor: number, casas: number = 2): number {
  const fator = Math.pow(10, casas);
  return Math.round(valor * fator) / fator;
}

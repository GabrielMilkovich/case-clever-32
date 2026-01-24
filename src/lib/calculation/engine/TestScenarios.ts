/**
 * Regression Test Suite for Calculation Engine
 * 3 Test Scenarios with automated pass/fail comparison
 */

import Decimal from "decimal.js";

// Configure Decimal for precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Local types for test scenarios (simplified for test isolation)
interface ContractData {
  data_admissao: Date;
  data_demissao: Date;
  salario_base: Decimal;
  jornada_semanal: number;
  divisor: number;
  tipo_demissao: string;
}

interface MonthlyData {
  competencia: Date;
  salario: Decimal;
  horas_extras_50?: number;
  horas_extras_100?: number;
  horas_noturnas?: number;
  dias_uteis: number;
  dias_dsr: number;
}

interface ValidatedInput {
  campo: string;
  valor: string;
  tipo: string;
  confirmado: boolean;
}

interface CalcProfile {
  id: string;
  nome: string;
  config: Record<string, any>;
}

interface CalcRule {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  versao: string;
  versao_numero: number;
  formula: Record<string, any>;
  parametros_requeridos: string[];
  ativo: boolean;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  category: "simples" | "complexo" | "sem_ponto";
  inputs: {
    contrato: ContractData;
    dadosMensais: MonthlyData[];
    validacoes: ValidatedInput[];
    perfil: CalcProfile;
    regras: CalcRule[];
  };
  expectedResults: {
    totalBruto: number;
    byRubrica: Record<string, number>;
    tolerance?: number; // Default 0.01 (1 centavo)
  };
}

export interface TestResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  executedAt: string;
  engineVersion: string;
  results: {
    totalBruto: { expected: number; actual: number; passed: boolean; diff: number };
    byRubrica: Record<string, { expected: number; actual: number; passed: boolean; diff: number }>;
  };
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
}

// Helper to create date
const d = (str: string) => new Date(str);

// Standard calc rules for testing
const standardRules: CalcRule[] = [
  {
    id: "rule-he50",
    codigo: "HE50",
    nome: "Hora Extra 50%",
    categoria: "hora_extra",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "multiplicacao", base: "salario_hora", fator: 1.5 },
    parametros_requeridos: ["salario_hora", "horas_extras_50"],
    ativo: true,
  },
  {
    id: "rule-he100",
    codigo: "HE100",
    nome: "Hora Extra 100%",
    categoria: "hora_extra",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "multiplicacao", base: "salario_hora", fator: 2.0 },
    parametros_requeridos: ["salario_hora", "horas_extras_100"],
    ativo: true,
  },
  {
    id: "rule-dsr",
    codigo: "DSR_HE",
    nome: "DSR sobre HE",
    categoria: "dsr",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "proporcional", base: "total_he", fator_dsr: 1 / 6 },
    parametros_requeridos: ["total_he"],
    ativo: true,
  },
  {
    id: "rule-adic-not",
    codigo: "ADIC_NOT",
    nome: "Adicional Noturno",
    categoria: "adicional",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "multiplicacao", base: "salario_hora", fator: 0.2 },
    parametros_requeridos: ["salario_hora", "horas_noturnas"],
    ativo: true,
  },
  {
    id: "rule-ferias",
    codigo: "REFL_FERIAS",
    nome: "Reflexo Férias + 1/3",
    categoria: "reflexo",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "reflexo", base: "total_integraveis", percentual: 1 / 12, terco: true },
    parametros_requeridos: ["total_integraveis"],
    ativo: true,
  },
  {
    id: "rule-13",
    codigo: "REFL_13",
    nome: "Reflexo 13º",
    categoria: "reflexo",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "reflexo", base: "total_integraveis", percentual: 1 / 12 },
    parametros_requeridos: ["total_integraveis"],
    ativo: true,
  },
  {
    id: "rule-fgts",
    codigo: "FGTS",
    nome: "FGTS 8%",
    categoria: "encargo",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "percentual", base: "total_integravel_fgts", percentual: 0.08 },
    parametros_requeridos: ["total_integravel_fgts"],
    ativo: true,
  },
  {
    id: "rule-multa-fgts",
    codigo: "MULTA_FGTS",
    nome: "Multa FGTS 40%",
    categoria: "rescisao",
    versao: "1.0.0",
    versao_numero: 1,
    formula: { tipo: "percentual", base: "total_fgts", percentual: 0.40 },
    parametros_requeridos: ["total_fgts"],
    ativo: true,
  },
];

const standardProfile: CalcProfile = {
  id: "profile-padrao",
  nome: "TRT-3 Padrão",
  config: {
    divisor: 220,
    percentual_he_50: 0.5,
    percentual_he_100: 1.0,
    percentual_dsr: 1 / 6,
    percentual_noturno: 0.2,
    reflexos: {
      ferias: true,
      terco_ferias: true,
      decimo_terceiro: true,
      fgts: true,
      multa_fgts: true,
    },
    fgts_aliquota: 0.08,
    multa_fgts_percentual: 0.40,
  },
};

// ============================================
// SCENARIO 1: Simple Case
// Fixed salary + HE 50% for 6 months + DSR + Reflexos
// ============================================
export const scenario1Simples: TestScenario = {
  id: "cenario-1-simples",
  name: "Cenário 1 - Simples",
  description: "Salário fixo R$ 3.000 + HE 50% (20h/mês) por 6 meses + DSR + reflexos completos",
  category: "simples",
  inputs: {
    contrato: {
      data_admissao: d("2024-01-01"),
      data_demissao: d("2024-06-30"),
      salario_base: new Decimal(3000),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      { competencia: d("2024-01-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-02-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2024-03-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 21, dias_dsr: 5 },
      { competencia: d("2024-04-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-05-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-06-01"), salario: new Decimal(3000), horas_extras_50: 20, dias_uteis: 20, dias_dsr: 5 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "3000", tipo: "moeda", confirmado: true },
      { campo: "data_admissao", valor: "2024-01-01", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-06-30", tipo: "data", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    // salario_hora = 3000 / 220 = 13.636363...
    // HE 50% mensal = 20 * 13.636363 * 1.5 = 409.09 (aprox)
    // HE 50% total 6 meses = 409.09 * 6 = 2454.54
    // DSR sobre HE = 2454.54 * (1/6) = 409.09
    // Total HE + DSR = 2863.63
    // Reflexo Férias + 1/3 = 2863.63 * (1/12) * (4/3) = 318.18
    // Reflexo 13º = 2863.63 * (1/12) = 238.64
    // Base FGTS = 2863.63 + 318.18 + 238.64 = 3420.45
    // FGTS = 3420.45 * 0.08 = 273.64
    // Multa 40% FGTS = 273.64 * 0.40 = 109.46
    totalBruto: 4122.91,
    byRubrica: {
      HE50: 2454.54,
      DSR_HE: 409.09,
      REFL_FERIAS: 318.18,
      REFL_13: 238.64,
      FGTS: 273.64,
      MULTA_FGTS: 109.46,
    },
    tolerance: 1.0, // R$ 1.00 tolerance for rounding differences
  },
};

// ============================================
// SCENARIO 2: Complex Case
// Salary change mid-period + HE + Noturno + reflexos
// ============================================
export const scenario2Complexo: TestScenario = {
  id: "cenario-2-complexo",
  name: "Cenário 2 - Complexo",
  description: "Mudança salarial no período + HE 50%/100% + Adicional Noturno + reflexos",
  category: "complexo",
  inputs: {
    contrato: {
      data_admissao: d("2024-01-01"),
      data_demissao: d("2024-06-30"),
      salario_base: new Decimal(3000),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      // Jan-Mar: R$ 3.000
      { competencia: d("2024-01-01"), salario: new Decimal(3000), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-02-01"), salario: new Decimal(3000), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2024-03-01"), salario: new Decimal(3000), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 21, dias_dsr: 5 },
      // Abr-Jun: R$ 3.500 (aumento)
      { competencia: d("2024-04-01"), salario: new Decimal(3500), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-05-01"), salario: new Decimal(3500), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-06-01"), salario: new Decimal(3500), horas_extras_50: 15, horas_extras_100: 5, horas_noturnas: 20, dias_uteis: 20, dias_dsr: 5 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "3000", tipo: "moeda", confirmado: true },
      { campo: "data_admissao", valor: "2024-01-01", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-06-30", tipo: "data", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    // More complex calculation with salary change
    // Jan-Mar (3000): salario_hora = 13.636, Abr-Jun (3500): salario_hora = 15.909
    // Calculations would vary based on actual engine implementation
    totalBruto: 6847.32, // Estimated
    byRubrica: {
      HE50: 2318.18,
      HE100: 1636.36,
      ADIC_NOT: 545.45,
      DSR_HE: 750.00,
      REFL_FERIAS: 583.33,
      REFL_13: 437.50,
      FGTS: 502.50,
      MULTA_FGTS: 201.00,
    },
    tolerance: 5.0, // Higher tolerance for complex scenario
  },
};

// ============================================
// SCENARIO 3: No Timecard (Arbitrated)
// Estimated hours, parametrized intervals
// ============================================
export const scenario3SemPonto: TestScenario = {
  id: "cenario-3-sem-ponto",
  name: "Cenário 3 - Sem Ponto (Arbitrado)",
  description: "Jornada arbitrada 10h/dia + intervalos parametrizados + HE estimada",
  category: "sem_ponto",
  inputs: {
    contrato: {
      data_admissao: d("2024-01-01"),
      data_demissao: d("2024-06-30"),
      salario_base: new Decimal(2500),
      jornada_semanal: 44,
      divisor: 220,
      tipo_demissao: "sem_justa_causa",
    },
    dadosMensais: [
      // Jornada arbitrada: 10h/dia (2h extras/dia) x 22 dias = 44h extras/mês
      { competencia: d("2024-01-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-02-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 21, dias_dsr: 4 },
      { competencia: d("2024-03-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 21, dias_dsr: 5 },
      { competencia: d("2024-04-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-05-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 22, dias_dsr: 4 },
      { competencia: d("2024-06-01"), salario: new Decimal(2500), horas_extras_50: 44, dias_uteis: 20, dias_dsr: 5 },
    ],
    validacoes: [
      { campo: "salario_base", valor: "2500", tipo: "moeda", confirmado: true },
      { campo: "jornada_arbitrada", valor: "10", tipo: "numero", confirmado: true },
      { campo: "intervalo_intrajornada", valor: "30", tipo: "numero", confirmado: true }, // 30 min concedido (deveria ser 1h)
      { campo: "data_admissao", valor: "2024-01-01", tipo: "data", confirmado: true },
      { campo: "data_demissao", valor: "2024-06-30", tipo: "data", confirmado: true },
    ],
    perfil: standardProfile,
    regras: standardRules,
  },
  expectedResults: {
    // salario_hora = 2500 / 220 = 11.3636
    // HE 50% mensal = 44 * 11.3636 * 1.5 = 750.00 (aprox)
    // HE 50% total 6 meses = 750 * 6 = 4500
    // DSR = 4500 * (1/6) = 750
    // Total base = 5250
    // Reflexo Férias + 1/3 = 5250 * (1/12) * (4/3) = 583.33
    // Reflexo 13º = 5250 * (1/12) = 437.50
    // FGTS = (5250 + 583.33 + 437.50) * 0.08 = 501.67
    // Multa FGTS = 501.67 * 0.40 = 200.67
    totalBruto: 7722.17,
    byRubrica: {
      HE50: 4500.00,
      DSR_HE: 750.00,
      REFL_FERIAS: 583.33,
      REFL_13: 437.50,
      FGTS: 501.67,
      MULTA_FGTS: 200.67,
    },
    tolerance: 2.0,
  },
};

// All scenarios
export const allScenarios: TestScenario[] = [
  scenario1Simples,
  scenario2Complexo,
  scenario3SemPonto,
];

/**
 * Compare actual vs expected with tolerance
 */
export function compareWithTolerance(
  expected: number,
  actual: number,
  tolerance: number = 0.01
): { passed: boolean; diff: number } {
  const diff = Math.abs(expected - actual);
  return {
    passed: diff <= tolerance,
    diff,
  };
}

/**
 * Run a single test scenario
 */
export async function runTestScenario(
  scenario: TestScenario,
  engineExecutor: (inputs: TestScenario["inputs"]) => Promise<{
    totalBruto: number;
    byRubrica: Record<string, number>;
    warnings: string[];
  }>
): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const result = await engineExecutor(scenario.inputs);
    const tolerance = scenario.expectedResults.tolerance ?? 0.01;
    
    // Compare total
    const totalComparison = compareWithTolerance(
      scenario.expectedResults.totalBruto,
      result.totalBruto,
      tolerance
    );
    
    // Compare by rubrica
    const rubricaResults: Record<string, { expected: number; actual: number; passed: boolean; diff: number }> = {};
    let allRubricasPassed = true;
    
    for (const [codigo, expectedValue] of Object.entries(scenario.expectedResults.byRubrica)) {
      const actualValue = result.byRubrica[codigo] ?? 0;
      const comparison = compareWithTolerance(expectedValue, actualValue, tolerance);
      rubricaResults[codigo] = {
        expected: expectedValue,
        actual: actualValue,
        passed: comparison.passed,
        diff: comparison.diff,
      };
      if (!comparison.passed) {
        allRubricasPassed = false;
      }
    }
    
    const passed = totalComparison.passed && allRubricasPassed;
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed,
      executedAt: new Date().toISOString(),
      engineVersion: "2.0.0",
      results: {
        totalBruto: {
          expected: scenario.expectedResults.totalBruto,
          actual: result.totalBruto,
          passed: totalComparison.passed,
          diff: totalComparison.diff,
        },
        byRubrica: rubricaResults,
      },
      warnings: result.warnings,
      errors,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      passed: false,
      executedAt: new Date().toISOString(),
      engineVersion: "2.0.0",
      results: {
        totalBruto: {
          expected: scenario.expectedResults.totalBruto,
          actual: 0,
          passed: false,
          diff: scenario.expectedResults.totalBruto,
        },
        byRubrica: {},
      },
      warnings: [],
      errors,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

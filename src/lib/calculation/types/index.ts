// =====================================================
// MOTOR DE CÁLCULO TRABALHISTA V2 - TIPOS AUDITÁVEIS
// =====================================================

import Decimal from 'decimal.js';

// Configuração de precisão decimal
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =====================================================
// TIPOS DE ENTRADA
// =====================================================

export interface ContractData {
  data_admissao: Date;
  data_demissao: Date;
  tipo_demissao: 'sem_justa_causa' | 'justa_causa' | 'pedido_demissao' | 'rescisao_indireta' | 'acordo';
  funcao?: string;
  local_trabalho?: string;
  sindicato?: string;
  salario_inicial: Decimal;
  historico_salarial: SalaryHistory[];
  jornada: JornadaConfig;
}

export interface SalaryHistory {
  data_inicio: Date;
  data_fim: Date;
  salario_base: Decimal;
  adicionais_fixos: AdicionalFixo[];
}

export interface AdicionalFixo {
  nome: string;
  valor: Decimal;
  tipo: 'valor' | 'percentual';
}

export interface JornadaConfig {
  horas_semanais: number;
  divisor: number;
  intervalo_intrajornada?: number;
  dias_semana?: number;
}

// =====================================================
// DADOS MENSAIS (EXTRAÇÃO)
// =====================================================

export interface MonthlyData {
  competencia: string; // "2024-01"
  salario_base: Decimal;
  adicionais: Record<string, Decimal>;
  horas_extras_50: Decimal;
  horas_extras_100: Decimal;
  horas_noturnas: Decimal;
  faltas_dias: Decimal;
  faltas_horas: Decimal;
  dias_uteis: number;
  dias_dsr: number;
  feriados: number;
}

// =====================================================
// VALIDAÇÃO E PROVENIÊNCIA
// =====================================================

export interface ValidatedInput {
  campo: string;
  valor: string | number | Date;
  tipo: 'money' | 'number' | 'date' | 'string' | 'duration';
  fonte: InputSource;
  validacao?: ValidationRecord;
}

export interface InputSource {
  document_id?: string;
  pagina?: number;
  trecho?: string;
  linha?: number;
  metodo: 'ocr' | 'manual' | 'calculado' | 'regra';
  confianca?: number;
}

export interface ValidationRecord {
  id: string;
  usuario_id: string;
  acao: 'aprovar' | 'editar' | 'rejeitar';
  valor_anterior?: string;
  valor_validado: string;
  justificativa?: string;
  timestamp: Date;
}

// =====================================================
// PERFIL DE CÁLCULO
// =====================================================

export interface CalcProfile {
  id: string;
  nome: string;
  versao: string;
  parametros: ProfileParameters;
  rubricas_ativas: string[];
  created_at: Date;
}

export interface ProfileParameters {
  // Jornada
  divisor: number;
  horas_semanais: number;
  
  // Horas extras
  adicional_he_50: number; // 0.5 = 50%
  adicional_he_100: number; // 1.0 = 100%
  
  // DSR
  metodo_dsr: 'classico' | 'fator_fixo';
  fator_dsr?: number; // para método fator_fixo (ex: 1/6)
  
  // Noturno
  percentual_noturno: number; // 0.2 = 20%
  reducao_hora_noturna: boolean;
  fator_reducao_noturna: number; // 52.5/60 = 0.875
  
  // Adicionais
  percentual_periculosidade: number; // 0.3 = 30%
  base_periculosidade: 'salario_base' | 'remuneracao';
  percentual_insalubridade: number;
  base_insalubridade: 'salario_minimo' | 'salario_base';
  
  // Reflexos (on/off)
  reflexo_he_dsr: boolean;
  reflexo_dsr_ferias: boolean;
  reflexo_dsr_13: boolean;
  reflexo_dsr_fgts: boolean;
  reflexo_ferias_fgts: boolean;
  reflexo_13_fgts: boolean;
  
  // FGTS
  aliquota_fgts: number; // 0.08 = 8%
  multa_fgts: number; // 0.4 = 40%
  
  // Rescisão
  aviso_previo_proporcional: boolean;
  dias_aviso_por_ano: number; // 3 dias por ano de serviço
  
  // Atualização monetária
  indice_atualizacao: 'ipca_e' | 'inpc' | 'tr' | 'selic' | 'nenhum';
  juros: 'selic' | '1_am' | '0.5_am' | 'nenhum';
  
  // Arredondamento
  casas_decimais: number;
  arredondamento: 'half_up' | 'truncar' | 'ceiling';
}

// =====================================================
// REGRAS DE CÁLCULO (RUBRICAS)
// =====================================================

export interface CalcRule {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  categoria: 'horas_extras' | 'reflexos' | 'rescisao' | 'tributos' | 'adicionais';
  formula: FormulaDefinition;
  parametros_requeridos: string[];
  versao: string;
  vigencia_inicio?: Date;
  vigencia_fim?: Date;
}

export interface FormulaDefinition {
  expressao: string; // "base * quantidade * (1 + percentual)"
  variaveis: FormulaVariable[];
  descricao_humana: string; // "Salário-hora × Horas × (1 + Adicional)"
}

export interface FormulaVariable {
  nome: string;
  tipo: 'input' | 'parametro' | 'calculado' | 'constante';
  descricao: string;
  origem?: string; // campo de input ou rubrica dependente
}

// =====================================================
// RESULTADO DE CÁLCULO
// =====================================================

export interface CalcResultItem {
  id: string;
  rubrica_codigo: string;
  rubrica_nome: string;
  competencia?: string;
  periodo_inicio?: Date;
  periodo_fim?: Date;
  
  // Valores
  base_calculo: Decimal;
  quantidade: Decimal;
  percentual?: Decimal;
  fator?: Decimal;
  valor_bruto: Decimal;
  valor_liquido?: Decimal;
  
  // Memória detalhada
  memoria: MemoriaCalculo[];
  
  // Dependências
  dependencias: string[]; // códigos de outras rubricas
  
  // Lineage
  lineage: CalcLineage;
}

export interface MemoriaCalculo {
  passo: number;
  descricao: string;
  formula: string;
  variaveis: Record<string, string | number>;
  resultado: Decimal;
}

export interface CalcLineage {
  rule_codigo: string;
  rule_versao: string;
  inputs: LineageInput[];
  parametros: Record<string, string | number>;
  formula_aplicada: string;
  output_valor: Decimal;
  hash_reproducao: string;
}

export interface LineageInput {
  campo: string;
  valor: string | number;
  tipo: string;
  fonte_documento_id?: string;
  fonte_pagina?: number;
  fonte_trecho?: string;
  validacao_id?: string;
}

// =====================================================
// SNAPSHOT DE CÁLCULO
// =====================================================

export interface CalcSnapshot {
  id: string;
  case_id: string;
  profile_id: string;
  versao: number;
  engine_version: string;
  ruleset_hash: string;
  status: 'gerado' | 'revisao' | 'aprovado';
  
  // Snapshot de inputs
  inputs_snapshot: {
    contrato: ContractData;
    dados_mensais: MonthlyData[];
    validacoes: ValidatedInput[];
    perfil: CalcProfile;
  };
  
  // Resultados
  items: CalcResultItem[];
  resultado_bruto: ConsolidatedResult;
  resultado_liquido?: ConsolidatedResult;
  total_bruto: Decimal;
  total_liquido?: Decimal;
  total_descontos?: Decimal;
  
  // Alertas
  warnings: CalcWarning[];
  alertas_consistencia: ConsistencyAlert[];
  
  // Auditoria
  created_by: string;
  created_at: Date;
  aprovado_por?: string;
  aprovado_em?: Date;
  observacoes?: string;
}

export interface ConsolidatedResult {
  total: Decimal;
  por_rubrica: Record<string, {
    codigo: string;
    nome: string;
    valor: Decimal;
    competencias?: Record<string, Decimal>;
  }>;
  por_competencia: Record<string, Decimal>;
}

export interface CalcWarning {
  tipo: 'info' | 'atencao' | 'erro';
  codigo: string;
  mensagem: string;
  rubrica?: string;
  competencia?: string;
  sugestao?: string;
}

export interface ConsistencyAlert {
  tipo: 'data_invalida' | 'lacuna_competencia' | 'valor_fora_faixa' | 'divergencia' | 'conflito';
  campo: string;
  descricao: string;
  valor_encontrado?: string;
  valor_esperado?: string;
  severidade: 'baixa' | 'media' | 'alta' | 'critica';
}

// =====================================================
// UTILITÁRIOS
// =====================================================

export function toDecimal(value: number | string | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

export function formatCurrency(value: Decimal | number): string {
  const num = value instanceof Decimal ? value.toNumber() : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatCompetencia(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function parseCompetencia(comp: string): Date {
  const [year, month] = comp.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function getMonthsBetween(start: Date, end: Date): string[] {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (current <= endDate) {
    months.push(formatCompetencia(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

export function hashObject(obj: unknown): string {
  const str = JSON.stringify(obj, (_, v) => 
    v instanceof Decimal ? v.toString() : v
  );
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

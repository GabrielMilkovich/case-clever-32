// =====================================================
// TIPOS DO MÓDULO JURÍDICO (Fontes, Regras, Tabelas)
// =====================================================

export interface LegalSource {
  id: string;
  orgao: string;
  nome: string;
  url: string | null;
  tipo: 'lei' | 'decreto' | 'portaria' | 'sumula' | 'oj' | 'tema_stf' | 'decisao' | 'nr' | 'cct' | 'act' | 'tabela' | 'instrucao_normativa';
  publicado_em: string | null;
  observado_em: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  notas: string | null;
  ativo: boolean;
}

export interface LegalRule {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  formula_texto: string | null;
  parametros_json: Record<string, unknown>;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  prioridade: number;
  jurisdicao: 'lei' | 'jurisprudencia' | 'instrumento_coletivo' | 'administrativo';
  source_id: string | null;
  referencia: string | null;
  link_ref: string | null;
  flag_controversia: boolean;
  tese_opcoes: unknown[];
  categoria: string | null;
  ativo: boolean;
  versao: number;
}

export interface ReferenceTable {
  id: string;
  nome: string;
  competencia: string;
  dados_json: unknown;
  source_id: string | null;
  coletado_em: string | null;
  hash_integridade: string | null;
  ativo: boolean;
  notas: string | null;
}

export interface LegalBasisEntry {
  rule_id?: string;
  codigo: string;
  titulo: string;
  referencia: string;
  link_ref?: string;
  jurisdicao: string;
  descricao?: string;
  formula_texto?: string;
  source?: {
    orgao: string;
    nome: string;
    url?: string;
  };
}

export interface CalculationCaseData {
  case_id: string;
  tipo_contrato: string;
  categoria: string;
  uf: string | null;
  cidade: string | null;
  cct_act: string | null;
  ajuizamento_data: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  observacoes: string | null;
}

export interface CaseInput {
  id: string;
  case_id: string;
  tipo_evento: string;
  data_inicio: string;
  data_fim: string | null;
  valor: number | null;
  quantidade: number | null;
  metadata_json: Record<string, unknown>;
  observacoes: string | null;
  source_document_id: string | null;
}

export interface CaseOutput {
  id: string;
  case_id: string;
  snapshot_id: string | null;
  verba_codigo: string;
  verba_nome: string | null;
  periodo_ref: string | null;
  base_calculo: number | null;
  formula_aplicada: string | null;
  valor_bruto: number;
  reflexos_json: unknown[];
  descontos_json: unknown[];
  valor_liquido: number | null;
  legal_basis_json: LegalBasisEntry[];
  memoria_json: unknown[];
  ordem: number;
}

// Wizard Step Types
export interface WizardContractStep {
  tipo_contrato: string;
  categoria: string;
  uf: string;
  cidade: string;
  cct_act: string;
}

export interface WizardPeriodStep {
  data_admissao: string;
  data_demissao: string;
  tipo_demissao: string;
  ajuizamento_data: string;
  salario_inicial: number;
  mudancas_salariais: { data: string; valor: number }[];
}

export interface WizardJornadaStep {
  divisor: number;
  horas_semanais: number;
  escala: string;
  intervalo_intrajornada: number;
  eventos_extras: {
    competencia: string;
    horas_50: number;
    horas_100: number;
    horas_noturnas: number;
  }[];
}

export interface WizardAdicionaisStep {
  periculosidade: boolean;
  periculosidade_periodo_inicio?: string;
  periculosidade_periodo_fim?: string;
  insalubridade: boolean;
  insalubridade_grau?: 'minimo' | 'medio' | 'maximo';
  insalubridade_base?: 'salario_minimo' | 'salario_base';
  insalubridade_periodo_inicio?: string;
  insalubridade_periodo_fim?: string;
}

export interface WizardTesesStep {
  indice_correcao: 'selic' | 'ipca_e' | 'tr';
  juros: 'selic' | '1_am' | 'nenhum';
  base_insalubridade: 'salario_minimo' | 'salario_base' | 'instrumento_coletivo';
  multa_467: boolean;
  multa_477: boolean;
}

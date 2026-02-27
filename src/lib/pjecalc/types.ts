// =====================================================
// PJE-CALC TYPES - Réplica exata do modelo PJe-Calc CSJT
// =====================================================

// ---- PARÂMETROS DO CÁLCULO ----

export type RegimeTrabalho = 'tempo_integral' | 'tempo_parcial';

export type PrazoAvisoPrevio = 'nao_apurar' | 'calculado' | 'informado';

export interface ParametrosCalculo {
  case_id: string;
  // Dados obrigatórios
  estado: string;
  municipio: string;
  data_admissao: string; // ISO date
  data_demissao?: string;
  data_ajuizamento: string;
  // Período do cálculo
  data_inicial?: string;
  data_final?: string;
  // Prescrição
  prescricao_quinquenal: boolean;
  prescricao_fgts: boolean;
  data_prescricao_quinquenal?: string;
  // Regime
  regime_trabalho: RegimeTrabalho;
  // Remunerações globais
  maior_remuneracao?: number;
  ultima_remuneracao?: number;
  // Aviso prévio
  prazo_aviso_previo: PrazoAvisoPrevio;
  prazo_aviso_dias?: number; // se 'informado'
  projetar_aviso_indenizado: boolean;
  limitar_avos_periodo: boolean;
  zerar_valor_negativo: boolean;
  // Feriados
  considerar_feriado_estadual: boolean;
  considerar_feriado_municipal: boolean;
  pontos_facultativos: string[]; // IDs
  // Carga horária
  carga_horaria_padrao: number; // default 220
  excecoes_carga_horaria: { inicio: string; fim: string; carga: number }[];
  // Sábado
  sabado_dia_util: boolean;
  excecoes_sabado: { inicio: string; fim: string }[];
  // Comentários
  comentarios?: string;
}

// ---- HISTÓRICO SALARIAL ----

export type TipoValorBase = 'informado' | 'calculado';

export interface HistoricoSalarial {
  id: string;
  case_id: string;
  nome: string;
  tipo_valor: TipoValorBase;
  incidencia_fgts: boolean;
  incidencia_cs: boolean;
  periodo_inicio: string;
  periodo_fim: string;
  // Se tipo_valor = 'informado'
  valor_informado?: number;
  // Se tipo_valor = 'calculado'
  quantidade?: number;
  base_referencia?: 'salario_minimo' | 'piso_salarial';
  categoria_piso?: string;
  // Flags de recolhimento
  fgts_recolhido: boolean;
  cs_recolhida: boolean;
}

export interface OcorrenciaHistorico {
  id: string;
  historico_id: string;
  competencia: string; // YYYY-MM
  valor: number;
  tipo: 'calculado' | 'informado'; // se editado pelo usuário
}

// ---- FALTAS ----

export interface Falta {
  id: string;
  case_id: string;
  data_inicial: string;
  data_final: string;
  justificada: boolean;
  justificativa?: string;
}

// ---- FÉRIAS ----

export type SituacaoFerias = 'gozadas' | 'indenizadas' | 'gozadas_parcialmente' | 'perdidas';

export interface PeriodoFerias {
  id: string;
  case_id: string;
  relativas: string; // "2020/2021"
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_concessivo_inicio: string;
  periodo_concessivo_fim: string;
  prazo_dias: number; // 30, 24, 18, 12, 0
  situacao: SituacaoFerias;
  dobra: boolean;
  abono: boolean;
  periodos_gozo: { inicio: string; fim: string }[];
}

// ---- VERBAS (CORE DO PJE-CALC) ----

export type TipoVerba = 'principal' | 'reflexa';
export type ValorVerba = 'calculado' | 'informado';
export type CaracteristicaVerba = 'comum' | '13_salario' | 'aviso_previo' | 'ferias';
export type OcorrenciaPagamento = 'mensal' | 'dezembro' | 'desligamento' | 'periodo_aquisitivo';
export type TipoDivisor = 'carga_horaria' | 'dias_uteis' | 'cartao_ponto' | 'informado';
export type TipoQuantidade = 'informada' | 'avos' | 'calendario' | 'cartao_ponto' | 'apurada';
export type ComportamentoReflexo = 'valor_mensal' | 'media_valor_absoluto' | 'media_valor_corrigido' | 'media_quantidade';
export type GerarVerbaBase = 'devido' | 'diferenca';
export type JurosAPartirAjuizamento = 'ocorrencias_vencidas' | 'ocorrencias_vencidas_vincendas';
export type TipoCalendarioQtd = 'dias_uteis' | 'repousos' | 'feriados_pontos' | 'repousos_feriados_pontos';

export interface IncidenciasVerba {
  fgts: boolean;
  irpf: boolean;
  contribuicao_social: boolean;
  previdencia_privada: boolean;
  pensao_alimenticia: boolean;
}

export interface ExclusoesVerba {
  faltas_justificadas: boolean;
  faltas_nao_justificadas: boolean;
  ferias_gozadas: boolean;
}

export interface BaseCalculoVerba {
  // Bases do histórico salarial (IDs)
  historicos: string[];
  // Bases de tabelas (salário mínimo, piso, etc.)
  tabelas: string[];
  // Bases de outras verbas (IDs)
  verbas: string[];
  // Proporcionalizar?
  proporcionalizar: boolean;
  // Integralizar? (só para reflexas baseadas em verbas)
  integralizar: boolean;
}

export interface VerbaPjeCalc {
  id: string;
  case_id: string;
  nome: string;
  assunto_cnj?: string;
  
  // Tipo e classificação
  tipo: TipoVerba;
  valor: ValorVerba;
  caracteristica: CaracteristicaVerba;
  ocorrencia_pagamento: OcorrenciaPagamento;
  
  // Incidências
  incidencias: IncidenciasVerba;
  
  // Juros
  juros_ajuizamento: JurosAPartirAjuizamento;
  
  // Geração de base para outras
  gerar_verba_reflexa: GerarVerbaBase;
  gerar_verba_principal: GerarVerbaBase;
  compor_principal: boolean;
  zerar_valor_negativo: boolean;
  
  // Período
  periodo_inicio: string;
  periodo_fim: string;
  
  // Exclusões
  exclusoes: ExclusoesVerba;
  dobrar_valor_devido: boolean;
  
  // ---- VALOR CALCULADO ----
  base_calculo: BaseCalculoVerba;
  
  // Divisor
  tipo_divisor: TipoDivisor;
  divisor_informado?: number;
  divisor_cartao_colunas?: string[];
  
  // Multiplicador
  multiplicador: number; // até 8 casas decimais
  
  // Quantidade
  tipo_quantidade: TipoQuantidade;
  quantidade_informada?: number;
  quantidade_calendario_tipo?: TipoCalendarioQtd;
  quantidade_cartao_colunas?: string[];
  quantidade_proporcionalizar: boolean;
  
  // ---- VALOR INFORMADO ----
  valor_informado_devido?: number;
  valor_informado_pago?: number;
  
  // ---- REFLEXA ----
  verba_principal_id?: string; // ID da verba principal (se tipo = 'reflexa')
  verbas_reflexas_base?: string[]; // IDs de reflexas que também servem de base
  comportamento_reflexo?: ComportamentoReflexo;
  
  // Comentários
  comentarios?: string;
  
  // Ordem de exibição
  ordem: number;
}

// ---- OCORRÊNCIAS DA VERBA ----

export interface OcorrenciaVerba {
  id: string;
  verba_id: string;
  competencia: string; // YYYY-MM
  data_inicial: string; // primeiro dia do mês (ou admissão)
  data_final: string;   // último dia do mês (ou demissão)
  ativa: boolean;
  
  // Campos para valor CALCULADO
  valor_base: number;
  divisor: number;
  multiplicador: number;
  quantidade: number;
  dobra: number; // 1 ou 2
  
  // Campos para valor INFORMADO ou resultado
  devido: number;
  pago: number;
  diferenca: number; // devido - pago
  
  // Tipo de preenchimento
  tipo_valor: 'calculado' | 'informado';
  tipo_divisor: 'calculado' | 'informado';
  tipo_quantidade: 'calculado' | 'informado';
  tipo_pago: 'calculado' | 'informado';
}

// ---- RESULTADO DO CÁLCULO ----

export interface ResultadoVerba {
  verba_id: string;
  verba_nome: string;
  tipo: TipoVerba;
  caracteristica: CaracteristicaVerba;
  total_devido: number;
  total_pago: number;
  total_diferenca: number;
  ocorrencias: OcorrenciaVerba[];
  compoe_principal: boolean;
  incidencias: IncidenciasVerba;
}

export interface ResumoPjeCalc {
  // Verbas
  verbas_principais: ResultadoVerba[];
  verbas_reflexas: ResultadoVerba[];
  
  // Totais
  total_principal_bruto: number;
  total_principal_pago: number;
  total_principal_diferenca: number;
  
  // Metadata
  data_calculo: string;
  parametros: ParametrosCalculo;
}

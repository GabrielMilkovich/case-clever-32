// =====================================================
// PJe-CALC ENGINE - MOTOR DE CÁLCULO OFICIAL
// Fórmula: Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra
// Diferença = Devido - Pago
// =====================================================

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =====================================================
// TIPOS
// =====================================================

export interface PjeParametros {
  case_id: string;
  data_admissao: string;
  data_demissao?: string;
  data_ajuizamento: string;
  data_citacao?: string;
  data_inicial?: string;
  data_final?: string;
  estado: string;
  municipio: string;
  regime_trabalho: 'tempo_integral' | 'tempo_parcial';
  carga_horaria_padrao: number;
  prescricao_quinquenal: boolean;
  prescricao_fgts: boolean;
  data_prescricao_quinquenal?: string;
  maior_remuneracao?: number;
  ultima_remuneracao?: number;
  prazo_aviso_previo: 'nao_apurar' | 'calculado' | 'informado';
  prazo_aviso_dias?: number;
  projetar_aviso_indenizado: boolean;
  limitar_avos_periodo: boolean;
  zerar_valor_negativo: boolean;
  sabado_dia_util: boolean;
  considerar_feriado_estadual: boolean;
  considerar_feriado_municipal: boolean;
}

export interface PjeHistoricoSalarial {
  id: string;
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  tipo_valor: 'informado' | 'calculado';
  valor_informado?: number;
  quantidade?: number;
  base_referencia?: string;
  incidencia_fgts: boolean;
  incidencia_cs: boolean;
  fgts_recolhido: boolean;
  cs_recolhida: boolean;
  ocorrencias: PjeHistoricoOcorrencia[];
}

export interface PjeHistoricoOcorrencia {
  id: string;
  historico_id: string;
  competencia: string;
  valor: number;
  tipo: 'calculado' | 'informado';
}

export interface PjeFalta {
  id: string;
  data_inicial: string;
  data_final: string;
  justificada: boolean;
  justificativa?: string;
}

export interface PjeFerias {
  id: string;
  relativas: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_concessivo_inicio: string;
  periodo_concessivo_fim: string;
  prazo_dias: number;
  situacao: 'gozadas' | 'indenizadas' | 'perdidas' | 'gozadas_parcialmente';
  dobra: boolean;
  abono: boolean;
  periodos_gozo?: { inicio: string; fim: string }[];
}

export interface PjeExcecaoCargaHoraria {
  data_inicial: string;
  data_final: string;
  carga_horaria: number;
  observacao?: string;
}

export interface PjeVerba {
  id: string;
  nome: string;
  tipo: 'principal' | 'reflexa';
  valor: 'calculado' | 'informado';
  caracteristica: 'comum' | '13_salario' | 'aviso_previo' | 'ferias';
  ocorrencia_pagamento: 'mensal' | 'dezembro' | 'periodo_aquisitivo' | 'desligamento';
  compor_principal: boolean;
  zerar_valor_negativo: boolean;
  dobrar_valor_devido: boolean;
  periodo_inicio: string;
  periodo_fim: string;
  
  base_calculo: {
    historicos: string[];
    verbas: string[];
    tabelas: string[];
    proporcionalizar: boolean;
    integralizar: boolean;
  };
  
  tipo_divisor: 'informado' | 'carga_horaria' | 'dias_uteis' | 'cartao_ponto';
  divisor_informado: number;
  divisor_cartao_colunas?: string[];
  multiplicador: number;
  tipo_quantidade: 'informada' | 'avos' | 'apurada' | 'calendario' | 'cartao_ponto';
  quantidade_informada: number;
  quantidade_cartao_colunas?: string[];
  quantidade_proporcionalizar: boolean;
  
  exclusoes: {
    faltas_justificadas: boolean;
    faltas_nao_justificadas: boolean;
    ferias_gozadas: boolean;
  };
  
  valor_informado_devido?: number;
  valor_informado_pago?: number;
  
  // Valor Pago Calculado (Fase 2)
  valor_pago_tipo?: 'informado' | 'calculado';
  pago_base?: number;
  pago_divisor?: number;
  pago_multiplicador?: number;
  pago_quantidade?: number;
  
  incidencias: {
    fgts: boolean;
    irpf: boolean;
    contribuicao_social: boolean;
    previdencia_privada: boolean;
    pensao_alimenticia: boolean;
  };
  
  juros_ajuizamento: 'ocorrencias_vencidas' | 'ocorrencias_vencidas_vincendas';
  
  verba_principal_id?: string;
  comportamento_reflexo?: 'valor_mensal' | 'media_valor_absoluto' | 'media_valor_corrigido' | 'media_quantidade';
  gerar_verba_reflexa: 'devido' | 'diferenca';
  gerar_verba_principal: 'devido' | 'diferenca';
  
  ordem: number;
  reflexas?: PjeVerba[];
}

export interface PjeOcorrencia {
  id: string;
  verba_id: string;
  competencia: string;
  data_inicial: string;
  data_final: string;
  ativa: boolean;
  valor_base: number;
  divisor: number;
  multiplicador: number;
  quantidade: number;
  dobra: number;
  devido: number;
  pago: number;
  diferenca: number;
}

export interface PjeCartaoPonto {
  competencia: string;
  dias_uteis: number;
  dias_trabalhados: number;
  horas_extras_50: number;
  horas_extras_100: number;
  horas_noturnas: number;
  intervalo_suprimido: number;
  dsr_horas: number;
  sobreaviso: number;
  dados_extras?: Record<string, number>;
  [key: string]: any;
}

export interface PjeFeriadoDB {
  data: string;
  nome: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'facultativo';
  uf?: string;
  municipio?: string;
}

export interface PjePrevidenciaPrivadaConfig {
  apurar: boolean;
  percentual: number;
  base_calculo: 'diferenca' | 'devido' | 'corrigido';
  deduzir_ir: boolean;
}

export interface PjeFGTSConfig {
  apurar: boolean;
  destino: 'pagar_reclamante' | 'recolher_conta';
  compor_principal: boolean;
  multa_apurar: boolean;
  multa_tipo: 'calculada' | 'informada';
  multa_percentual: number;
  multa_base: 'devido' | 'diferenca' | 'saldo_saque' | 'devido_menos_saldo' | 'devido_mais_saldo';
  multa_valor_informado?: number;
  saldos_saques: { data: string; valor: number }[];
  deduzir_saldo: boolean;
  lc110_10: boolean;
  lc110_05: boolean;
}

export interface PjeCSConfig {
  apurar_segurado: boolean;
  cobrar_reclamante: boolean;
  cs_sobre_salarios_pagos: boolean;
  aliquota_segurado_tipo: 'empregado' | 'domestico' | 'fixa';
  aliquota_segurado_fixa?: number;
  limitar_teto: boolean;
  apurar_empresa: boolean;
  apurar_sat: boolean;
  apurar_terceiros: boolean;
  aliquota_empregador_tipo: 'atividade' | 'periodo' | 'fixa';
  aliquota_empresa_fixa?: number;
  aliquota_sat_fixa?: number;
  aliquota_terceiros_fixa?: number;
  periodos_simples: { inicio: string; fim: string }[];
}

export interface PjeIRConfig {
  apurar: boolean;
  incidir_sobre_juros: boolean;
  cobrar_reclamado: boolean;
  tributacao_exclusiva_13: boolean;
  tributacao_separada_ferias: boolean;
  deduzir_cs: boolean;
  deduzir_prev_privada: boolean;
  deduzir_pensao: boolean;
  deduzir_honorarios: boolean;
  aposentado_65: boolean;
  dependentes: number;
}

export interface PjeCorrecaoConfig {
  indice: string;
  epoca: 'mensal' | 'fixo';
  data_fixa?: string;
  juros_tipo: 'simples_mensal' | 'selic' | 'nenhum';
  juros_percentual: number;
  juros_inicio: 'ajuizamento' | 'citacao' | 'vencimento';
  multa_523: boolean;
  multa_523_percentual: number;
  data_liquidacao: string;
}

export interface PjeHonorariosConfig {
  apurar_sucumbenciais: boolean;
  percentual_sucumbenciais: number;
  base_sucumbenciais: 'condenacao' | 'causa' | 'proveito';
  apurar_contratuais: boolean;
  percentual_contratuais: number;
  valor_fixo?: number;
}

export interface PjeCustasConfig {
  apurar: boolean;
  percentual: number;
  valor_minimo: number;
  valor_maximo?: number;
  isento: boolean;
  assistencia_judiciaria: boolean;
}

export interface PjeSeguroConfig {
  apurar: boolean;
  parcelas: number;
  valor_parcela?: number;
  recebeu: boolean;
}

// =====================================================
// RESULTADO DA LIQUIDAÇÃO
// =====================================================

export interface PjePrevidenciaPrivadaResult {
  apurado: boolean;
  base: number;
  percentual: number;
  valor: number;
}

export interface PjeLiquidacaoResult {
  data_liquidacao: string;
  verbas: PjeVerbaResult[];
  fgts: PjeFGTSResult;
  contribuicao_social: PjeCSResult;
  imposto_renda: PjeIRResult;
  seguro_desemprego: PjeSeguroResult;
  previdencia_privada: PjePrevidenciaPrivadaResult;
  resumo: PjeResumo;
  validacao?: PjeValidationResult;
}

export interface PjeVerbaResult {
  verba_id: string;
  nome: string;
  tipo: string;
  caracteristica: string;
  ocorrencias: PjeOcorrenciaResult[];
  total_devido: number;
  total_pago: number;
  total_diferenca: number;
  total_corrigido: number;
  total_juros: number;
  total_final: number;
}

export interface PjeOcorrenciaResult {
  competencia: string;
  base: number;
  divisor: number;
  multiplicador: number;
  quantidade: number;
  dobra: number;
  devido: number;
  pago: number;
  diferenca: number;
  indice_correcao: number;
  valor_corrigido: number;
  juros: number;
  valor_final: number;
  formula: string;
}

export interface PjeFGTSResult {
  depositos: { competencia: string; base: number; aliquota: number; valor: number }[];
  total_depositos: number;
  multa_valor: number;
  lc110_10: number;
  lc110_05: number;
  saldo_deduzido: number;
  total_fgts: number;
}

export interface PjeCSResult {
  segurado: { competencia: string; base: number; aliquota: number; valor: number; recolhido: number; diferenca: number }[];
  empregador: { competencia: string; empresa: number; sat: number; terceiros: number }[];
  total_segurado: number;
  total_empregador: number;
}

export interface PjeIRResult {
  base_calculo: number;
  deducoes: number;
  base_tributavel: number;
  imposto_devido: number;
  meses_rra: number;
  metodo: 'tabela_mensal' | 'art_12a_rra';
}

export interface PjeSeguroResult {
  apurado: boolean;
  parcelas: number;
  valor_parcela: number;
  total: number;
}

export interface PjeResumo {
  principal_bruto: number;
  principal_corrigido: number;
  juros_mora: number;
  fgts_total: number;
  cs_segurado: number;
  cs_empregador: number;
  ir_retido: number;
  seguro_desemprego: number;
  previdencia_privada: number;
  multa_523: number;
  honorarios_sucumbenciais: number;
  honorarios_contratuais: number;
  custas: number;
  liquido_reclamante: number;
  total_reclamada: number;
}

// =====================================================
// TIPOS PARA DADOS DO BANCO (séries históricas e tabelas versionadas)
// =====================================================

export interface PjeIndiceRow {
  indice: string;
  competencia: string; // YYYY-MM-DD
  valor: number;
  acumulado: number;
}

export interface PjeINSSFaixaRow {
  competencia_inicio: string;
  competencia_fim?: string | null;
  faixa: number;
  valor_ate: number;
  aliquota: number;
}

export interface PjeIRFaixaRow {
  competencia_inicio: string;
  competencia_fim?: string | null;
  faixa: number;
  valor_ate: number;
  aliquota: number;
  deducao: number;
  deducao_dependente: number;
}

export interface PjeValidationItem {
  tipo: 'erro' | 'alerta' | 'observacao';
  modulo: string;
  mensagem: string;
  detalhe?: string;
}

export interface PjeValidationResult {
  valido: boolean;
  itens: PjeValidationItem[];
  erros: number;
  alertas: number;
  observacoes: number;
}

// =====================================================
// TABELAS PADRÃO (fallback quando não há dados do banco)
// =====================================================

// INSS Progressivo 2025 (Portaria MPS/MF nº 6/2025)
const DEFAULT_FAIXAS_INSS = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 5839.45, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

// IRRF 2025 - Tabela mensal
const DEFAULT_FAIXAS_IR = [
  { ate: 2259.20, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
];

const DEFAULT_DEDUCAO_DEPENDENTE = 189.59;

// Seguro-Desemprego 2025 (Resolução CODEFAT)
const SEGURO_DESEMP_2025 = {
  faixa1_ate: 2041.39,
  faixa1_mult: 0.8,
  faixa2_ate: 3402.65,
  faixa2_base: 1633.12,
  faixa2_mult: 0.5,
  teto: 2313.74,
};

// =====================================================
// MOTOR DE CÁLCULO
// =====================================================

export class PjeCalcEngine {
  private params: PjeParametros;
  private historicos: PjeHistoricoSalarial[];
  private faltas: PjeFalta[];
  private ferias: PjeFerias[];
  private verbas: PjeVerba[];
  private cartaoPonto: PjeCartaoPonto[];
  private fgtsConfig: PjeFGTSConfig;
  private csConfig: PjeCSConfig;
  private irConfig: PjeIRConfig;
  private correcaoConfig: PjeCorrecaoConfig;
  private honorariosConfig: PjeHonorariosConfig;
  private custasConfig: PjeCustasConfig;
  private seguroConfig: PjeSeguroConfig;
  private indicesDB: PjeIndiceRow[];
  private faixasINSSDB: PjeINSSFaixaRow[];
  private faixasIRDB: PjeIRFaixaRow[];
  private excecoesCargas: PjeExcecaoCargaHoraria[];
  private feriadosDB: PjeFeriadoDB[];
  private prevPrivadaConfig: PjePrevidenciaPrivadaConfig;
  // Map of verba results by verba_id for reflexa resolution
  private verbaResultsMap: Map<string, PjeVerbaResult> = new Map();

  constructor(
    params: PjeParametros,
    historicos: PjeHistoricoSalarial[],
    faltas: PjeFalta[],
    ferias: PjeFerias[],
    verbas: PjeVerba[],
    cartaoPonto: PjeCartaoPonto[],
    fgtsConfig: PjeFGTSConfig,
    csConfig: PjeCSConfig,
    irConfig: PjeIRConfig,
    correcaoConfig: PjeCorrecaoConfig,
    honorariosConfig: PjeHonorariosConfig,
    custasConfig: PjeCustasConfig,
    seguroConfig: PjeSeguroConfig,
    indicesDB: PjeIndiceRow[] = [],
    faixasINSSDB: PjeINSSFaixaRow[] = [],
    faixasIRDB: PjeIRFaixaRow[] = [],
    excecoesCargas: PjeExcecaoCargaHoraria[] = [],
    feriadosDB: PjeFeriadoDB[] = [],
    prevPrivadaConfig: PjePrevidenciaPrivadaConfig = { apurar: false, percentual: 0, base_calculo: 'diferenca', deduzir_ir: false },
  ) {
    this.params = params;
    this.historicos = historicos;
    this.faltas = faltas;
    this.ferias = ferias;
    this.verbas = verbas;
    this.cartaoPonto = cartaoPonto;
    this.fgtsConfig = fgtsConfig;
    this.csConfig = csConfig;
    this.irConfig = irConfig;
    this.correcaoConfig = correcaoConfig;
    this.honorariosConfig = honorariosConfig;
    this.custasConfig = custasConfig;
    this.seguroConfig = seguroConfig;
    this.indicesDB = indicesDB;
    this.faixasINSSDB = faixasINSSDB;
    this.faixasIRDB = faixasIRDB;
    this.excecoesCargas = excecoesCargas;
    this.feriadosDB = feriadosDB;
    this.prevPrivadaConfig = prevPrivadaConfig;
  }

  // =====================================================
  // PERÍODO DE CÁLCULO
  // =====================================================
  
  getPeriodoCalculo(): { inicio: string; fim: string } {
    const datas = [this.params.data_admissao];
    if (this.params.prescricao_quinquenal && this.params.data_prescricao_quinquenal) {
      datas.push(this.params.data_prescricao_quinquenal);
    }
    if (this.params.data_inicial) datas.push(this.params.data_inicial);
    const inicio = datas.sort().pop()!;
    
    const fimCandidatos: string[] = [];
    if (this.params.data_demissao) fimCandidatos.push(this.params.data_demissao);
    if (this.params.data_final) fimCandidatos.push(this.params.data_final);
    const fim = fimCandidatos.sort()[0] || new Date().toISOString().slice(0, 10);

    return { inicio, fim };
  }

  // =====================================================
  // GERAÇÃO DE COMPETÊNCIAS
  // =====================================================

  getCompetencias(inicio: string, fim: string): string[] {
    const comps: string[] = [];
    const start = new Date(inicio + 'T00:00:00');
    const end = new Date(fim + 'T00:00:00');
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      comps.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return comps;
  }

  // =====================================================
  // CÁLCULO DE AVOS (13º e Férias) — com Limitar Avos
  // =====================================================
  
  calcularAvos(competencia: string, caracteristica: string): number {
    const admDate = new Date(this.params.data_admissao);
    const demDate = this.params.data_demissao 
      ? new Date(this.params.data_demissao)
      : new Date();
    const [ano, mes] = competencia.split('-').map(Number);
    
    if (caracteristica === '13_salario') {
      const inicioAno = new Date(ano, 0, 1);
      const fimAno = new Date(ano, 11, 31);
      let efetInicio = admDate > inicioAno ? admDate : inicioAno;
      let efetFim = demDate < fimAno ? demDate : fimAno;
      
      // Limitar avos ao período do cálculo quando ativado
      if (this.params.limitar_avos_periodo) {
        const periodo = this.getPeriodoCalculo();
        const periodoInicio = new Date(periodo.inicio);
        const periodoFim = new Date(periodo.fim);
        if (periodoInicio > efetInicio) efetInicio = periodoInicio;
        if (periodoFim < efetFim) efetFim = periodoFim;
      }
      
      if (efetInicio > efetFim) return 0;
      let avos = 0;
      for (let m = efetInicio.getMonth(); m <= efetFim.getMonth(); m++) {
        const diaInicio = (m === efetInicio.getMonth()) ? efetInicio.getDate() : 1;
        const diaFim = (m === efetFim.getMonth()) ? efetFim.getDate() : new Date(ano, m + 1, 0).getDate();
        if (diaFim - diaInicio + 1 >= 15) avos++;
      }
      return avos;
    }
    if (caracteristica === 'ferias') {
      // Limitar avos de férias ao período do cálculo
      if (this.params.limitar_avos_periodo) {
        const periodo = this.getPeriodoCalculo();
        const periodoInicio = new Date(periodo.inicio);
        const periodoFim = new Date(periodo.fim);
        let efetInicio = admDate > periodoInicio ? admDate : periodoInicio;
        let efetFim = demDate < periodoFim ? demDate : periodoFim;
        if (efetInicio > efetFim) return 0;
        let avos = 0;
        for (let m = efetInicio.getMonth(); m <= efetFim.getMonth(); m++) {
          const diaInicio = (m === efetInicio.getMonth()) ? efetInicio.getDate() : 1;
          const diaFim = (m === efetFim.getMonth()) ? efetFim.getDate() : new Date(efetFim.getFullYear(), m + 1, 0).getDate();
          if (diaFim - diaInicio + 1 >= 15) avos++;
        }
        return Math.min(avos, 12);
      }
      return 12;
    }
    return 1;
  }

  // =====================================================
  // CARGA HORÁRIA POR COMPETÊNCIA (com exceções)
  // =====================================================

  getCargaHorariaParaCompetencia(competencia: string): number {
    if (this.excecoesCargas.length === 0) return this.params.carga_horaria_padrao || 220;
    const compDate = new Date(competencia + '-01');
    for (const exc of this.excecoesCargas) {
      const inicio = new Date(exc.data_inicial);
      const fim = new Date(exc.data_final);
      if (compDate >= inicio && compDate <= fim) return Number(exc.carga_horaria);
    }
    return this.params.carga_horaria_padrao || 220;
  }

  // =====================================================
  // QUANTIDADE CALENDÁRIO (Dias Úteis / Repousos / Feriados)
  // =====================================================

  calcularQuantidadeCalendario(competencia: string, tipo: 'dias_uteis' | 'repousos' | 'feriados'): number {
    const [ano, mes] = competencia.split('-').map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    
    // Contar feriados no mês para o estado/município do cálculo
    const feriadosNoMes = this.feriadosDB.filter(f => {
      const fd = new Date(f.data);
      if (fd.getFullYear() !== ano || fd.getMonth() + 1 !== mes) return false;
      if (f.tipo === 'nacional') return true;
      if (f.tipo === 'estadual' && this.params.considerar_feriado_estadual && f.uf === this.params.estado) return true;
      if (f.tipo === 'municipal' && this.params.considerar_feriado_municipal && f.municipio === this.params.municipio) return true;
      return false;
    });

    let diasUteis = 0;
    let repousos = 0;
    
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(ano, mes - 1, d);
      const dow = date.getDay(); // 0=Sun, 6=Sat
      const isSunday = dow === 0;
      const isSaturday = dow === 6;
      const isFeriado = feriadosNoMes.some(f => new Date(f.data).getDate() === d);
      
      if (isSunday || isFeriado) {
        repousos++;
      } else if (isSaturday && !this.params.sabado_dia_util) {
        repousos++;
      } else {
        diasUteis++;
      }
    }

    switch (tipo) {
      case 'dias_uteis': return diasUteis;
      case 'repousos': return repousos;
      case 'feriados': return feriadosNoMes.length;
    }
  }

  // Divisor com feriados integrados
  getDivisorComFeriados(competencia: string): number {
    return this.calcularQuantidadeCalendario(competencia, 'dias_uteis');
  }

  // =====================================================
  // PRAZO DO AVISO PRÉVIO (Lei 12.506/2011)
  // =====================================================

  calcularPrazoAviso(): number {
    if (this.params.prazo_aviso_previo === 'nao_apurar') return 30;
    if (this.params.prazo_aviso_previo === 'informado') return this.params.prazo_aviso_dias || 30;
    const adm = new Date(this.params.data_admissao);
    const dem = this.params.data_demissao ? new Date(this.params.data_demissao) : new Date();
    const anosServico = Math.floor((dem.getTime() - adm.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return Math.min(90, 30 + (anosServico * 3));
  }

  // =====================================================
  // CARTÃO DE PONTO - RESOLUÇÃO DE QUANTIDADE
  // =====================================================

  getCartaoPontoQuantidade(competencia: string, colunas?: string[]): number {
    const reg = this.cartaoPonto.find(r => r.competencia === competencia);
    if (!reg) return 0;
    if (!colunas || colunas.length === 0) {
      return (reg.horas_extras_50 || 0) + (reg.horas_extras_100 || 0);
    }
    let total = 0;
    for (const col of colunas) {
      total += (reg as any)[col] || 0;
    }
    return total;
  }

  getCartaoPontoDivisor(competencia: string, colunas?: string[]): number {
    const reg = this.cartaoPonto.find(r => r.competencia === competencia);
    if (!reg) return 30;
    if (!colunas || colunas.length === 0) return reg.dias_uteis || 22;
    let total = 0;
    for (const col of colunas) {
      total += (reg as any)[col] || 0;
    }
    return total || 30;
  }

  // =====================================================
  // FÓRMULA OFICIAL DE CÁLCULO DE VERBA
  // Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra
  // =====================================================

  calcularOcorrencia(
    verba: PjeVerba,
    competencia: string,
    valorBase: number,
  ): PjeOcorrenciaResult {
    const base = new Decimal(valorBase);
    const mult = new Decimal(verba.multiplicador);
    
    // Divisor resolution (uses carga horária por competência with exceções + feriados)
    let div: Decimal;
    if (verba.tipo_divisor === 'cartao_ponto') {
      div = new Decimal(this.getCartaoPontoDivisor(competencia, verba.divisor_cartao_colunas) || 30);
    } else if (verba.tipo_divisor === 'carga_horaria') {
      div = new Decimal(this.getCargaHorariaParaCompetencia(competencia));
    } else if (verba.tipo_divisor === 'dias_uteis') {
      div = new Decimal(this.getDivisorComFeriados(competencia));
    } else {
      div = new Decimal(verba.divisor_informado || 30);
    }

    // Quantidade resolution (with calendario support)
    let qtd: Decimal;
    if (verba.tipo_quantidade === 'cartao_ponto') {
      qtd = new Decimal(this.getCartaoPontoQuantidade(competencia, verba.quantidade_cartao_colunas) || 0);
    } else if (verba.tipo_quantidade === 'avos') {
      qtd = new Decimal(this.calcularAvos(competencia, verba.caracteristica));
    } else if (verba.tipo_quantidade === 'calendario') {
      // Quantidade Calendário: usa dias úteis do período conforme feriados cadastrados
      qtd = new Decimal(this.calcularQuantidadeCalendario(competencia, 'dias_uteis'));
    } else {
      qtd = new Decimal(verba.quantidade_informada || 1);
    }

    const dobra = new Decimal(verba.dobrar_valor_devido ? 2 : 1);

    // Aviso prévio quantity
    if (verba.caracteristica === 'aviso_previo') {
      qtd = new Decimal(this.calcularPrazoAviso());
    }

    // Proporcionalizar meses incompletos
    if (verba.quantidade_proporcionalizar) {
      const [ano, mes] = competencia.split('-').map(Number);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(this.params.data_admissao);
      const demDate = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicio = 1, diaFim = diasNoMes;
      if (admDate.getFullYear() === ano && admDate.getMonth() + 1 === mes) diaInicio = admDate.getDate();
      if (demDate && demDate.getFullYear() === ano && demDate.getMonth() + 1 === mes) diaFim = demDate.getDate();
      const diasTrabalhados = diaFim - diaInicio + 1;
      if (diasTrabalhados < diasNoMes) {
        qtd = qtd.times(diasTrabalhados).div(diasNoMes);
      }
    }

    // Fórmula oficial PJe-Calc
    let devido: Decimal;
    if (verba.valor === 'informado') {
      devido = new Decimal(verba.valor_informado_devido || 0);
    } else {
      devido = base.times(mult).div(div).times(qtd).times(dobra);
    }

    if (verba.zerar_valor_negativo && devido.isNegative()) {
      devido = new Decimal(0);
    }

    // Valor Pago: informado ou calculado (Fase 2)
    let pago: Decimal;
    if (verba.valor_pago_tipo === 'calculado' && verba.pago_base !== undefined) {
      const pagoBase = new Decimal(verba.pago_base || 0);
      const pagoDiv = new Decimal(verba.pago_divisor || 30);
      const pagoMult = new Decimal(verba.pago_multiplicador || 1);
      const pagoQtd = new Decimal(verba.pago_quantidade || 1);
      pago = pagoBase.times(pagoMult).div(pagoDiv).times(pagoQtd);
    } else {
      pago = new Decimal(verba.valor_informado_pago || 0);
    }
    const diferenca = devido.minus(pago);

    const formula = verba.valor === 'calculado'
      ? `(${base.toFixed(2)} × ${mult.toFixed(4)} / ${div.toFixed(2)}) × ${qtd.toFixed(4)} × ${dobra.toFixed(0)}`
      : `Valor Informado: ${devido.toFixed(2)}`;

    return {
      competencia,
      base: base.toDP(2).toNumber(),
      divisor: div.toDP(2).toNumber(),
      multiplicador: mult.toDP(8).toNumber(),
      quantidade: qtd.toDP(4).toNumber(),
      dobra: dobra.toNumber(),
      devido: devido.toDP(2).toNumber(),
      pago: pago.toDP(2).toNumber(),
      diferenca: diferenca.toDP(2).toNumber(),
      indice_correcao: 1,
      valor_corrigido: diferenca.toDP(2).toNumber(),
      juros: 0,
      valor_final: diferenca.toDP(2).toNumber(),
      formula,
    };
  }

  // =====================================================
  // OBTER BASE PARA UMA COMPETÊNCIA
  // =====================================================

  getBaseParaCompetencia(verba: PjeVerba, competencia: string): number {
    let base = 0;

    // Bases do histórico salarial
    if (verba.base_calculo.historicos.length > 0) {
      for (const histId of verba.base_calculo.historicos) {
        const hist = this.historicos.find(h => h.id === histId);
        if (!hist) continue;
        const oc = hist.ocorrencias.find(o => o.competencia === competencia);
        if (oc) base += oc.valor;
      }
    }

    // Se não tem histórico específico, buscar qualquer histórico que cubra a competência
    if (base === 0 && verba.base_calculo.historicos.length === 0) {
      for (const hist of this.historicos) {
        const compDate = new Date(competencia + '-01');
        const hInicio = new Date(hist.periodo_inicio);
        const hFim = new Date(hist.periodo_fim);
        if (compDate >= hInicio && compDate <= hFim) {
          const oc = hist.ocorrencias.find(o => o.competencia === competencia);
          if (oc) {
            base += oc.valor;
          } else if (hist.valor_informado) {
            base += hist.valor_informado;
          }
        }
      }
    }

    // Fallback: usar maior/última remuneração
    if (base === 0) {
      if (verba.base_calculo.tabelas.includes('maior_remuneracao') && this.params.maior_remuneracao) {
        base = this.params.maior_remuneracao;
      } else if (verba.base_calculo.tabelas.includes('ultima_remuneracao') && this.params.ultima_remuneracao) {
        base = this.params.ultima_remuneracao;
      } else if (this.params.ultima_remuneracao) {
        base = this.params.ultima_remuneracao;
      }
    }

    // Somar bases de verbas principais já calculadas (para reflexas)
    for (const verbaBaseId of verba.base_calculo.verbas) {
      const vbResult = this.verbaResultsMap.get(verbaBaseId);
      if (vbResult) {
        const oc = vbResult.ocorrencias.find(o => o.competencia === competencia);
        if (oc) base += oc.diferenca;
      }
    }

    return base;
  }

  // =====================================================
  // EXCLUSÃO DE FALTAS E FÉRIAS (Fase 1 - CLT Art. 130)
  // =====================================================

  private getDiasExcluidosCompetencia(competencia: string, exclusoes: PjeVerba['exclusoes']): number {
    const [ano, mes] = competencia.split('-').map(Number);
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0);
    let diasExcluidos = 0;

    // Faltas
    for (const falta of this.faltas) {
      if (falta.justificada && !exclusoes.faltas_justificadas) continue;
      if (!falta.justificada && !exclusoes.faltas_nao_justificadas) continue;
      
      const inicioFalta = new Date(falta.data_inicial);
      const fimFalta = new Date(falta.data_final);
      const overlapInicio = inicioFalta > inicioMes ? inicioFalta : inicioMes;
      const overlapFim = fimFalta < fimMes ? fimFalta : fimMes;
      if (overlapInicio <= overlapFim) {
        diasExcluidos += Math.floor((overlapFim.getTime() - overlapInicio.getTime()) / 86400000) + 1;
      }
    }

    // Férias gozadas
    if (exclusoes.ferias_gozadas) {
      for (const fer of this.ferias) {
        if (fer.situacao !== 'gozadas' && fer.situacao !== 'gozadas_parcialmente') continue;
        const periodos = fer.periodos_gozo?.length 
          ? fer.periodos_gozo 
          : [{ inicio: fer.periodo_concessivo_inicio, fim: fer.periodo_concessivo_fim }];
        for (const p of periodos) {
          const inicioGozo = new Date(p.inicio);
          const fimGozo = new Date(p.fim);
          const overlapInicio = inicioGozo > inicioMes ? inicioGozo : inicioMes;
          const overlapFim = fimGozo < fimMes ? fimGozo : fimMes;
          if (overlapInicio <= overlapFim) {
            diasExcluidos += Math.floor((overlapFim.getTime() - overlapInicio.getTime()) / 86400000) + 1;
          }
        }
      }
    }

    return diasExcluidos;
  }

  // =====================================================
  // HELPERS: TABELAS VERSIONADAS POR COMPETÊNCIA
  // =====================================================

  private getFaixasINSSParaCompetencia(competencia: string): { ate: number; aliquota: number }[] {
    if (this.faixasINSSDB.length === 0) return DEFAULT_FAIXAS_INSS;

    const compDate = new Date(competencia + '-01');
    // Buscar faixas cuja vigência cobre a competência
    const faixas = this.faixasINSSDB
      .filter(f => {
        const inicio = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= inicio && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({ ate: Number(f.valor_ate), aliquota: Number(f.aliquota) }));

    return faixas.length > 0 ? faixas : DEFAULT_FAIXAS_INSS;
  }

  private getFaixasIRParaCompetencia(competencia: string): { faixas: { ate: number; aliquota: number; deducao: number }[]; deducao_dependente: number } {
    if (this.faixasIRDB.length === 0) return { faixas: DEFAULT_FAIXAS_IR, deducao_dependente: DEFAULT_DEDUCAO_DEPENDENTE };

    const compDate = new Date(competencia + '-01');
    const faixas = this.faixasIRDB
      .filter(f => {
        const inicio = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= inicio && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({ ate: Number(f.valor_ate), aliquota: Number(f.aliquota), deducao: Number(f.deducao) }));

    if (faixas.length === 0) return { faixas: DEFAULT_FAIXAS_IR, deducao_dependente: DEFAULT_DEDUCAO_DEPENDENTE };

    // Usar deducao_dependente da primeira faixa encontrada
    const matchedRow = this.faixasIRDB.find(f => {
      const inicio = new Date(f.competencia_inicio);
      const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
      return compDate >= inicio && compDate <= fim;
    });
    const deducao_dependente = matchedRow ? Number(matchedRow.deducao_dependente) : DEFAULT_DEDUCAO_DEPENDENTE;

    return { faixas, deducao_dependente };
  }

  // =====================================================
  // HELPER: ÍNDICE DE CORREÇÃO DO BANCO
  // Retorna fator acumulado entre competência e liquidação
  // =====================================================

  private getIndiceCorrecaoDB(nomeIndice: string, compOrigem: string, compDestino: string): number | null {
    if (this.indicesDB.length === 0) return null;

    // Filtrar por índice
    const indices = this.indicesDB
      .filter(i => i.indice === nomeIndice)
      .sort((a, b) => a.competencia.localeCompare(b.competencia));

    if (indices.length === 0) return null;

    // Buscar acumulado na competência de origem
    const origemDate = compOrigem + '-01';
    const destinoDate = compDestino + '-01';

    const idxOrigem = indices.find(i => i.competencia.slice(0, 7) >= compOrigem) 
      || indices[0];
    const idxDestinoArr = indices.filter(i => i.competencia.slice(0, 7) <= compDestino);
    const idxDestino = idxDestinoArr.length > 0 ? idxDestinoArr[idxDestinoArr.length - 1] : indices[indices.length - 1];

    if (!idxOrigem || !idxDestino || !idxOrigem.acumulado || !idxDestino.acumulado) return null;
    if (Number(idxOrigem.acumulado) === 0) return null;

    return Number(idxDestino.acumulado) / Number(idxOrigem.acumulado);
  }

  // =====================================================
  // CALCULAR VERBA COMPLETA (com exclusões de faltas/férias)
  // =====================================================

  calcularVerba(verba: PjeVerba): PjeVerbaResult {
    const periodo = { inicio: verba.periodo_inicio, fim: verba.periodo_fim };
    let competencias: string[];

    switch (verba.ocorrencia_pagamento) {
      case 'mensal':
        competencias = this.getCompetencias(periodo.inicio, periodo.fim);
        break;
      case 'dezembro': {
        const todas = this.getCompetencias(periodo.inicio, periodo.fim);
        competencias = todas.filter(c => c.endsWith('-12'));
        const lastComp = todas[todas.length - 1];
        if (lastComp && !lastComp.endsWith('-12') && !competencias.includes(lastComp)) {
          competencias.push(lastComp);
        }
        break;
      }
      case 'desligamento':
        competencias = [this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7)];
        break;
      case 'periodo_aquisitivo':
        competencias = this.ferias.map(f => f.periodo_aquisitivo_fim.slice(0, 7));
        if (competencias.length === 0) {
          competencias = [this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7)];
        }
        break;
      default:
        competencias = this.getCompetencias(periodo.inicio, periodo.fim);
    }

    const ocorrencias: PjeOcorrenciaResult[] = [];
    let totalDevido = 0, totalPago = 0, totalDiferenca = 0;

    for (const comp of competencias) {
      // ── Aplicar exclusões de faltas e férias (CLT Art. 130) ──
      const [anoC, mesC] = comp.split('-').map(Number);
      const diasNoMes = new Date(anoC, mesC, 0).getDate();
      const diasExcluidos = this.getDiasExcluidosCompetencia(comp, verba.exclusoes);
      
      if (diasExcluidos >= diasNoMes) continue; // Mês totalmente excluído
      
      let base = this.getBaseParaCompetencia(verba, comp);
      
      // Reduzir base proporcionalmente aos dias excluídos
      if (diasExcluidos > 0 && base > 0) {
        const fator = (diasNoMes - diasExcluidos) / diasNoMes;
        base = Number(new Decimal(base).times(fator).toDP(2));
      }

      const oc = this.calcularOcorrencia(verba, comp, base);
      ocorrencias.push(oc);
      totalDevido += oc.devido;
      totalPago += oc.pago;
      totalDiferenca += oc.diferenca;
    }

    return {
      verba_id: verba.id,
      nome: verba.nome,
      tipo: verba.tipo,
      caracteristica: verba.caracteristica,
      ocorrencias,
      total_devido: Number(new Decimal(totalDevido).toDP(2)),
      total_pago: Number(new Decimal(totalPago).toDP(2)),
      total_diferenca: Number(new Decimal(totalDiferenca).toDP(2)),
      total_corrigido: Number(new Decimal(totalDiferenca).toDP(2)),
      total_juros: 0,
      total_final: Number(new Decimal(totalDiferenca).toDP(2)),
    };
  }

  // =====================================================
  // CORREÇÃO MONETÁRIA + JUROS DE MORA
  // ADC 58/59 STF: IPCA-E pré-judicial + SELIC pós-citação
  // Com séries históricas reais do banco
  // =====================================================

  aplicarCorrecaoJuros(verbaResults: PjeVerbaResult[]): void {
    if (this.correcaoConfig.juros_tipo === 'nenhum' && this.correcaoConfig.indice === 'nenhum') return;

    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const dataAjuiz = this.params.data_ajuizamento ? new Date(this.params.data_ajuizamento) : null;
    const dataCitacao = this.params.data_citacao 
      ? new Date(this.params.data_citacao) 
      : dataAjuiz ? new Date(dataAjuiz.getTime() + 60 * 24 * 60 * 60 * 1000) : null;

    // Determinar se usamos ADC 58/59 (transição automática)
    const usarADC5859 = this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC';

    for (const vr of verbaResults) {
      let totalCorrigido = 0;
      let totalJuros = 0;
      let totalFinal = 0;

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

        const [ano, mes] = oc.competencia.split('-').map(Number);
        const dataComp = new Date(ano, mes - 1, 1);
        
        let indiceCorrecao = 1;
        let juros = 0;

        if (usarADC5859 && dataCitacao) {
          // ═══ ADC 58/59: Transição automática IPCA-E → SELIC ═══
          if (dataComp >= dataCitacao) {
            // Período pós-citação: SELIC (engloba correção + juros)
            const fatorDB = this.getIndiceCorrecaoDB('SELIC', oc.competencia, compLiq);
            if (fatorDB !== null) {
              indiceCorrecao = fatorDB;
            } else {
              // Fallback: ~1% a.m.
              const meses = this.mesesEntre(dataComp, dataLiq);
              indiceCorrecao = Math.pow(1.01, meses);
            }
            // SELIC já engloba juros, não aplicar separadamente
          } else {
            // Período pré-judicial: IPCA-E até citação + SELIC da citação à liquidação
            const compCitacao = dataCitacao.toISOString().slice(0, 7);
            
            // Trecho 1: competência → citação com IPCA-E
            const fatorIPCA = this.getIndiceCorrecaoDB('IPCA-E', oc.competencia, compCitacao);
            let fator1: number;
            if (fatorIPCA !== null) {
              fator1 = fatorIPCA;
            } else {
              const meses1 = this.mesesEntre(dataComp, dataCitacao);
              fator1 = Math.pow(1.0045, meses1);
            }

            // Trecho 2: citação → liquidação com SELIC
            const fatorSELIC = this.getIndiceCorrecaoDB('SELIC', compCitacao, compLiq);
            let fator2: number;
            if (fatorSELIC !== null) {
              fator2 = fatorSELIC;
            } else {
              const meses2 = this.mesesEntre(dataCitacao, dataLiq);
              fator2 = Math.pow(1.01, meses2);
            }

            indiceCorrecao = fator1 * fator2;

            // Juros de mora entre ajuizamento e citação (1% a.m. pro rata die - Art. 39 Lei 8.177/91)
            if (dataAjuiz && dataCitacao > dataAjuiz) {
              const mesesJurosPreCitacao = this.mesesEntre(dataAjuiz, dataCitacao);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              const valorCorrigidoParc = Number(new Decimal(oc.diferenca).times(fator1).toDP(2));
              juros = Number(new Decimal(valorCorrigidoParc).times(taxaMensal).times(mesesJurosPreCitacao).toDP(2));
            }
          }
        } else {
          // ═══ Modo manual (índice escolhido pelo usuário) ═══
          const mesesCorrecao = this.mesesEntre(dataComp, dataLiq);
          
          // Tentar buscar do banco primeiro
          const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, oc.competencia, compLiq);
          if (fatorDB !== null) {
            indiceCorrecao = fatorDB;
          } else {
            // Fallback com taxas aproximadas
            const taxas: Record<string, number> = {
              'IPCA-E': 1.0045,
              'SELIC': 1.01,
              'TR': 1.0001,
              'INPC': 1.004,
              'IGP-M': 1.005,
            };
            const taxaMensal = taxas[this.correcaoConfig.indice] || 1.004;
            indiceCorrecao = Math.pow(taxaMensal, mesesCorrecao);
          }

          // Juros de mora (quando índice não é SELIC)
          if (this.correcaoConfig.indice !== 'SELIC') {
            const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));
            
            if (this.correcaoConfig.juros_tipo === 'simples_mensal') {
              let dataInicioJuros: Date;
              if (this.correcaoConfig.juros_inicio === 'vencimento') {
                dataInicioJuros = dataComp;
              } else if (this.correcaoConfig.juros_inicio === 'citacao' && dataCitacao) {
                dataInicioJuros = dataCitacao;
              } else if (dataAjuiz) {
                dataInicioJuros = dataAjuiz;
              } else {
                dataInicioJuros = dataComp;
              }
              const mesesJuros = this.mesesEntre(dataInicioJuros, dataLiq);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              juros = Number(new Decimal(valorCorrigido).times(taxaMensal).times(mesesJuros).toDP(2));
            } else if (this.correcaoConfig.juros_tipo === 'selic') {
              const mesesJuros = this.mesesEntre(dataAjuiz || dataComp, dataLiq);
              juros = Number(new Decimal(valorCorrigido).times(0.01).times(mesesJuros).toDP(2));
            }
          }
        }

        const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));

        oc.indice_correcao = Number(new Decimal(indiceCorrecao).toDP(6));
        oc.valor_corrigido = valorCorrigido;
        oc.juros = juros;
        oc.valor_final = Number(new Decimal(valorCorrigido + juros).toDP(2));
        
        totalCorrigido += valorCorrigido;
        totalJuros += juros;
        totalFinal += valorCorrigido + juros;
      }

      vr.total_corrigido = Number(new Decimal(totalCorrigido).toDP(2));
      vr.total_juros = Number(new Decimal(totalJuros).toDP(2));
      vr.total_final = Number(new Decimal(totalFinal).toDP(2));
    }
  }

  private mesesEntre(d1: Date, d2: Date): number {
    return Math.max(0, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
  }

  // =====================================================
  // CALCULAR FGTS
  // =====================================================

  calcularFGTS(verbaResults: PjeVerbaResult[]): PjeFGTSResult {
    if (!this.fgtsConfig.apurar) {
      return { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 };
    }

    const depositos: PjeFGTSResult['depositos'] = [];
    
    // Prescrição FGTS diferenciada
    let dataPrescricaoFGTS: Date | null = null;
    if (this.params.prescricao_fgts && this.params.data_ajuizamento) {
      // ARE 709.212/DF STF: prazo quinquenal a partir do ajuizamento
      // (alinhamento com prescrição comum, mas calculado separadamente)
      const ajuiz = new Date(this.params.data_ajuizamento);
      dataPrescricaoFGTS = new Date(ajuiz.getFullYear() - 5, ajuiz.getMonth(), ajuiz.getDate());
    }
    
    const basesPorComp: Record<string, number> = {};
    const bases13PorComp: Record<string, number> = {};
    
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.fgts) continue;

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        // Aplicar prescrição FGTS diferenciada
        if (dataPrescricaoFGTS) {
          const [a, m] = oc.competencia.split('-').map(Number);
          const compDate = new Date(a, m - 1, 1);
          if (compDate < dataPrescricaoFGTS) continue;
        }
        const target = verba.caracteristica === '13_salario' ? bases13PorComp : basesPorComp;
        target[oc.competencia] = (target[oc.competencia] || 0) + oc.diferenca;
      }
    }

    for (const hist of this.historicos) {
      if (!hist.incidencia_fgts || hist.fgts_recolhido) continue;
      for (const oc of hist.ocorrencias) {
        // Aplicar prescrição FGTS no histórico também
        if (dataPrescricaoFGTS) {
          const [a, m] = oc.competencia.split('-').map(Number);
          const compDate = new Date(a, m - 1, 1);
          if (compDate < dataPrescricaoFGTS) continue;
        }
        basesPorComp[oc.competencia] = (basesPorComp[oc.competencia] || 0) + oc.valor;
      }
    }

    for (const [comp, base] of Object.entries(basesPorComp)) {
      const valor = Number(new Decimal(base).times(0.08).toDP(2));
      depositos.push({ competencia: comp, base, aliquota: 0.08, valor });
    }
    for (const [comp, base] of Object.entries(bases13PorComp)) {
      const valor = Number(new Decimal(base).times(0.08).toDP(2));
      depositos.push({ competencia: comp + '-13', base, aliquota: 0.08, valor });
    }

    const totalDepositos = depositos.reduce((s, d) => s + d.valor, 0);

    let multaValor = 0;
    if (this.fgtsConfig.multa_apurar) {
      if (this.fgtsConfig.multa_tipo === 'informada') {
        multaValor = this.fgtsConfig.multa_valor_informado || 0;
      } else {
        let baseMulita = totalDepositos;
        if (this.fgtsConfig.multa_base === 'diferenca') baseMulita = totalDepositos;
        multaValor = Number(new Decimal(baseMulita).times(this.fgtsConfig.multa_percentual / 100).toDP(2));
      }
    }

    const lc110_10 = this.fgtsConfig.lc110_10 ? Number(new Decimal(totalDepositos).times(0.10).toDP(2)) : 0;
    const lc110_05 = this.fgtsConfig.lc110_05 ? Number(new Decimal(totalDepositos).times(0.005).toDP(2)) : 0;

    const saldoDeduzido = this.fgtsConfig.deduzir_saldo 
      ? this.fgtsConfig.saldos_saques.reduce((s, v) => s + v.valor, 0) : 0;

    return {
      depositos,
      total_depositos: Number(new Decimal(totalDepositos).toDP(2)),
      multa_valor: multaValor,
      lc110_10,
      lc110_05,
      saldo_deduzido: Number(new Decimal(saldoDeduzido).toDP(2)),
      total_fgts: Number(new Decimal(totalDepositos + multaValor + lc110_10 + lc110_05 - saldoDeduzido).toDP(2)),
    };
  }

  // =====================================================
  // CALCULAR CONTRIBUIÇÃO SOCIAL (Tabelas Versionadas por Competência)
  // =====================================================

  calcularCS(verbaResults: PjeVerbaResult[]): PjeCSResult {
    const segurado: PjeCSResult['segurado'] = [];
    const empregador: PjeCSResult['empregador'] = [];

    if (!this.csConfig.apurar_segurado && !this.csConfig.apurar_empresa) {
      return { segurado, empregador, total_segurado: 0, total_empregador: 0 };
    }

    // Agrupar por competência
    const basesPorComp: Record<string, number> = {};
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.contribuicao_social) continue;
      if (verba.caracteristica === 'ferias') continue;
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        basesPorComp[oc.competencia] = (basesPorComp[oc.competencia] || 0) + oc.diferenca;
      }
    }

    // CS sobre salários pagos (Fase 2): adicionar salários pagos à base
    if (this.csConfig.cs_sobre_salarios_pagos) {
      for (const hist of this.historicos) {
        if (!hist.incidencia_cs || hist.cs_recolhida) continue;
        for (const oc of hist.ocorrencias) {
          basesPorComp[oc.competencia] = (basesPorComp[oc.competencia] || 0) + oc.valor;
        }
      }
    }

    // Segurado progressivo (tabela versionada por competência)
    if (this.csConfig.apurar_segurado) {
      for (const [comp, base] of Object.entries(basesPorComp)) {
        let imposto = 0;
        if (this.csConfig.aliquota_segurado_tipo === 'fixa' && this.csConfig.aliquota_segurado_fixa) {
          imposto = base * (this.csConfig.aliquota_segurado_fixa / 100);
        } else {
          // Buscar tabela vigente para a competência
          const faixas = this.getFaixasINSSParaCompetencia(comp);
          const teto = faixas[faixas.length - 1].ate;
          let baseRestante = this.csConfig.limitar_teto ? Math.min(base, teto) : base;
          let faixaAnterior = 0;
          for (const faixa of faixas) {
            const limiteNaFaixa = faixa.ate - faixaAnterior;
            const baseNaFaixa = Math.min(baseRestante, limiteNaFaixa);
            if (baseNaFaixa > 0) {
              imposto += baseNaFaixa * faixa.aliquota;
              baseRestante -= baseNaFaixa;
            }
            if (baseRestante <= 0) break;
            faixaAnterior = faixa.ate;
          }
        }
        segurado.push({
          competencia: comp, base,
          aliquota: base > 0 ? imposto / base : 0,
          valor: Number(new Decimal(imposto).toDP(2)),
          recolhido: 0,
          diferenca: Number(new Decimal(imposto).toDP(2)),
        });
      }
    }

    // Empregador (alíquotas fixas, com Simples Nacional)
    if (this.csConfig.apurar_empresa || this.csConfig.apurar_sat || this.csConfig.apurar_terceiros) {
      for (const [comp, base] of Object.entries(basesPorComp)) {
        if (base <= 0) continue;
        
        // Verificar se a competência está em período de Simples Nacional
        const compDate = new Date(comp + '-01');
        const isSimples = this.csConfig.periodos_simples?.some(p => {
          const pInicio = new Date(p.inicio);
          const pFim = new Date(p.fim);
          return compDate >= pInicio && compDate <= pFim;
        }) || false;
        
        if (isSimples) {
          // Simples Nacional: sem CS patronal separada (já incluída no DAS)
          empregador.push({ competencia: comp, empresa: 0, sat: 0, terceiros: 0 });
        } else {
          const aliqEmp = (this.csConfig.aliquota_empresa_fixa ?? 20) / 100;
          const aliqSat = (this.csConfig.aliquota_sat_fixa ?? 2) / 100;
          const aliqTerc = (this.csConfig.aliquota_terceiros_fixa ?? 5.8) / 100;
          empregador.push({
            competencia: comp,
            empresa: this.csConfig.apurar_empresa ? Number(new Decimal(base).times(aliqEmp).toDP(2)) : 0,
            sat: this.csConfig.apurar_sat ? Number(new Decimal(base).times(aliqSat).toDP(2)) : 0,
            terceiros: this.csConfig.apurar_terceiros ? Number(new Decimal(base).times(aliqTerc).toDP(2)) : 0,
          });
        }
      }
    }

    return {
      segurado, empregador,
      total_segurado: segurado.reduce((s, x) => s + x.diferenca, 0),
      total_empregador: empregador.reduce((s, x) => s + x.empresa + x.sat + x.terceiros, 0),
    };
  }

  // =====================================================
  // CALCULAR IR (Tabelas Versionadas + Art. 12-A RRA)
  // =====================================================

  calcularIR(verbaResults: PjeVerbaResult[], csResult: PjeCSResult): PjeIRResult {
    if (!this.irConfig.apurar) {
      return { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'tabela_mensal' };
    }

    let baseBruta = 0;
    let base13 = 0;
    let baseFerias = 0;
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.irpf) continue;
      if (verba.caracteristica === 'ferias') {
        // Tributação separada de férias (Fase 3)
        if (this.irConfig.tributacao_separada_ferias) {
          baseFerias += vr.total_diferenca;
        }
        // Se não separar, não entra na base (férias são isentas por natureza)
        continue;
      }
      if (verba.caracteristica === '13_salario' && this.irConfig.tributacao_exclusiva_13) {
        base13 += vr.total_diferenca;
      } else {
        baseBruta += vr.total_diferenca;
      }
    }

    let deducoes = 0;
    if (this.irConfig.deduzir_cs && this.csConfig.cobrar_reclamante) {
      deducoes += csResult.total_segurado;
    }

    const periodo = this.getPeriodoCalculo();
    const meses = Math.max(1, this.getCompetencias(periodo.inicio, periodo.fim).length);
    
    // Buscar tabela IR vigente para a competência de liquidação
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const tabelaIR = this.getFaixasIRParaCompetencia(compLiq);
    
    const deducaoDependentes = this.irConfig.dependentes * tabelaIR.deducao_dependente * meses;
    const baseTributavel = Math.max(0, baseBruta - deducoes - deducaoDependentes);
    
    // Tabela progressiva acumulada (Art. 12-A, Lei 7.713/88)
    let imposto = 0;
    for (const faixa of tabelaIR.faixas) {
      if (baseTributavel <= faixa.ate * meses) {
        imposto = baseTributavel * faixa.aliquota - faixa.deducao * meses;
        break;
      }
    }
    if (imposto < 0) imposto = 0;

    // 13º tributação exclusiva
    if (this.irConfig.tributacao_exclusiva_13 && base13 > 0) {
      let imposto13 = 0;
      for (const faixa of tabelaIR.faixas) {
        if (base13 <= faixa.ate) {
          imposto13 = base13 * faixa.aliquota - faixa.deducao;
          break;
        }
      }
      if (imposto13 > 0) imposto += imposto13;
    }

    // Tributação separada de férias (Fase 3)
    if (this.irConfig.tributacao_separada_ferias && baseFerias > 0) {
      let impostoFerias = 0;
      for (const faixa of tabelaIR.faixas) {
        if (baseFerias <= faixa.ate * meses) {
          impostoFerias = baseFerias * faixa.aliquota - faixa.deducao * meses;
          break;
        }
      }
      if (impostoFerias > 0) imposto += impostoFerias;
    }

    return {
      base_calculo: Number(new Decimal(baseBruta + base13 + baseFerias).toDP(2)),
      deducoes: Number(new Decimal(deducoes + deducaoDependentes).toDP(2)),
      base_tributavel: Number(new Decimal(baseTributavel + base13 + baseFerias).toDP(2)),
      imposto_devido: Number(new Decimal(imposto).toDP(2)),
      meses_rra: meses,
      metodo: meses > 1 ? 'art_12a_rra' : 'tabela_mensal',
    };
  }

  // =====================================================
  // CALCULAR SEGURO-DESEMPREGO
  // =====================================================

  calcularSeguroDesemprego(): PjeSeguroResult {
    if (!this.seguroConfig.apurar) {
      return { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 };
    }

    let valorParcela = this.seguroConfig.valor_parcela || 0;
    
    if (!valorParcela && this.params.ultima_remuneracao) {
      const salMedio = this.params.ultima_remuneracao;
      if (salMedio <= SEGURO_DESEMP_2025.faixa1_ate) {
        valorParcela = salMedio * SEGURO_DESEMP_2025.faixa1_mult;
      } else if (salMedio <= SEGURO_DESEMP_2025.faixa2_ate) {
        valorParcela = SEGURO_DESEMP_2025.faixa2_base + (salMedio - SEGURO_DESEMP_2025.faixa1_ate) * SEGURO_DESEMP_2025.faixa2_mult;
      } else {
        valorParcela = SEGURO_DESEMP_2025.teto;
      }
    }

    valorParcela = Math.min(valorParcela, SEGURO_DESEMP_2025.teto);
    const total = valorParcela * this.seguroConfig.parcelas;

    return {
      apurado: true,
      parcelas: this.seguroConfig.parcelas,
      valor_parcela: Number(new Decimal(valorParcela).toDP(2)),
      total: Number(new Decimal(total).toDP(2)),
    };
  }

  // =====================================================
  // CALCULAR HONORÁRIOS
  // =====================================================

  calcularHonorarios(principalCorrigido: number, juros: number, fgts: number): { sucumbenciais: number; contratuais: number } {
    let sucumbenciais = 0;
    let contratuais = 0;

    if (this.honorariosConfig.apurar_sucumbenciais) {
      const baseHon = principalCorrigido + juros + fgts;
      sucumbenciais = Number(new Decimal(baseHon).times(this.honorariosConfig.percentual_sucumbenciais / 100).toDP(2));
    }

    if (this.honorariosConfig.apurar_contratuais) {
      if (this.honorariosConfig.valor_fixo) {
        contratuais = this.honorariosConfig.valor_fixo;
      } else {
        const baseHon = principalCorrigido + juros + fgts;
        contratuais = Number(new Decimal(baseHon).times(this.honorariosConfig.percentual_contratuais / 100).toDP(2));
      }
    }

    return { sucumbenciais, contratuais };
  }

  // =====================================================
  // CALCULAR CUSTAS (Art. 789 CLT)
  // =====================================================

  calcularCustas(valorCondenacao: number): number {
    if (!this.custasConfig.apurar || this.custasConfig.isento) return 0;
    let custas = Number(new Decimal(valorCondenacao).times(this.custasConfig.percentual / 100).toDP(2));
    custas = Math.max(custas, this.custasConfig.valor_minimo);
    if (this.custasConfig.valor_maximo) {
      custas = Math.min(custas, this.custasConfig.valor_maximo);
    }
    return Number(new Decimal(custas).toDP(2));
  }

  // =====================================================
  // MULTA ART. 523, §1º CPC
  // =====================================================

  calcularMulta523(valorCondenacao: number): number {
    if (!this.correcaoConfig.multa_523) return 0;
    return Number(new Decimal(valorCondenacao).times(this.correcaoConfig.multa_523_percentual / 100).toDP(2));
  }

  // =====================================================
  // VALIDAÇÃO PRÉ-LIQUIDAÇÃO
  // Checklist automático de consistência
  // =====================================================

  validarPreLiquidacao(): PjeValidationResult {
    const itens: PjeValidationItem[] = [];

    // ── Parâmetros obrigatórios ──
    if (!this.params.data_admissao) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de admissão não informada' });
    }
    if (!this.params.data_ajuizamento) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de ajuizamento não informada' });
    }
    if (!this.params.estado || !this.params.municipio) {
      itens.push({ tipo: 'alerta', modulo: 'Parâmetros', mensagem: 'Estado ou município não informado' });
    }

    // ── Datas incoerentes ──
    if (this.params.data_admissao && this.params.data_demissao) {
      if (new Date(this.params.data_demissao) <= new Date(this.params.data_admissao)) {
        itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de demissão anterior ou igual à admissão' });
      }
    }
    if (this.params.data_ajuizamento && this.params.data_admissao) {
      if (new Date(this.params.data_ajuizamento) < new Date(this.params.data_admissao)) {
        itens.push({ tipo: 'alerta', modulo: 'Parâmetros', mensagem: 'Data de ajuizamento anterior à admissão' });
      }
    }

    // ── Verbas ──
    if (this.verbas.length === 0) {
      itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: 'Nenhuma verba cadastrada para liquidação' });
    }
    for (const v of this.verbas) {
      if (!v.periodo_inicio || !v.periodo_fim) {
        itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba "${v.nome}" sem período definido` });
      }
      if (v.periodo_inicio && v.periodo_fim && new Date(v.periodo_fim) < new Date(v.periodo_inicio)) {
        itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba "${v.nome}" com período inválido (fim < início)` });
      }
      if (v.tipo === 'reflexa' && !v.verba_principal_id && v.base_calculo.verbas.length === 0) {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba reflexa "${v.nome}" sem verba principal vinculada` });
      }
      if (v.valor === 'calculado' && v.base_calculo.historicos.length === 0 && v.base_calculo.verbas.length === 0 && !this.params.ultima_remuneracao && !this.params.maior_remuneracao) {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba "${v.nome}" sem base de cálculo identificável` });
      }
    }

    // ── Histórico salarial ──
    if (this.historicos.length === 0 && !this.params.ultima_remuneracao && !this.params.maior_remuneracao) {
      itens.push({ tipo: 'alerta', modulo: 'Histórico', mensagem: 'Sem histórico salarial e sem remuneração informada nos parâmetros', detalhe: 'As verbas podem resultar em valor zero' });
    }

    // ── Férias ──
    for (const f of this.ferias) {
      if (new Date(f.periodo_aquisitivo_fim) < new Date(f.periodo_aquisitivo_inicio)) {
        itens.push({ tipo: 'erro', modulo: 'Férias', mensagem: `Férias "${f.relativas}" com período aquisitivo inválido` });
      }
      if (f.prazo_dias <= 0 || f.prazo_dias > 30) {
        itens.push({ tipo: 'alerta', modulo: 'Férias', mensagem: `Férias "${f.relativas}" com prazo de ${f.prazo_dias} dias (esperado 1-30)` });
      }
    }

    // ── Correção monetária ──
    if (!this.correcaoConfig.data_liquidacao) {
      itens.push({ tipo: 'erro', modulo: 'Correção', mensagem: 'Data de liquidação não informada' });
    }
    if (this.indicesDB.length === 0) {
      itens.push({ tipo: 'alerta', modulo: 'Correção', mensagem: 'Sem séries históricas de índices no banco — usando taxas aproximadas', detalhe: 'Popule a tabela de índices para resultados precisos' });
    }

    // ── Tabelas INSS/IR ──
    if (this.faixasINSSDB.length === 0) {
      itens.push({ tipo: 'observacao', modulo: 'Contrib. Social', mensagem: 'Usando tabela INSS padrão 2025 — sem dados versionados por competência' });
    }
    if (this.faixasIRDB.length === 0) {
      itens.push({ tipo: 'observacao', modulo: 'Imposto de Renda', mensagem: 'Usando tabela IR padrão 2025 — sem dados versionados por competência' });
    }

    // ── Competências sem cobertura ──
    if (this.params.data_admissao && this.correcaoConfig.data_liquidacao) {
      const periodo = this.getPeriodoCalculo();
      const comps = this.getCompetencias(periodo.inicio, periodo.fim);
      if (comps.length > 120) {
        itens.push({ tipo: 'alerta', modulo: 'Geral', mensagem: `Período de cálculo muito extenso: ${comps.length} competências`, detalhe: 'Verifique se as datas estão corretas' });
      }
    }

    // ── Configurações de FGTS ──
    if (this.fgtsConfig.apurar && this.fgtsConfig.multa_apurar && this.fgtsConfig.multa_tipo === 'informada' && !this.fgtsConfig.multa_valor_informado) {
      itens.push({ tipo: 'alerta', modulo: 'FGTS', mensagem: 'Multa FGTS definida como informada mas sem valor' });
    }

    const erros = itens.filter(i => i.tipo === 'erro').length;
    const alertas = itens.filter(i => i.tipo === 'alerta').length;
    const observacoes = itens.filter(i => i.tipo === 'observacao').length;

    return {
      valido: erros === 0,
      itens,
      erros,
      alertas,
      observacoes,
    };
  }

  // =====================================================
  // LIQUIDAR - FLUXO PRINCIPAL
  // =====================================================

  liquidar(): PjeLiquidacaoResult {
    // ── 0. Validação pré-liquidação ──
    const validacao = this.validarPreLiquidacao();

    // ── 1. Separar principais e reflexas ──
    const verbasPrincipais = this.verbas
      .filter(v => v.tipo === 'principal')
      .sort((a, b) => a.ordem - b.ordem);

    const verbasReflexas = this.verbas
      .filter(v => v.tipo === 'reflexa')
      .sort((a, b) => a.ordem - b.ordem);

    const verbaResults: PjeVerbaResult[] = [];
    
    // ── 2. Calcular principais ──
    for (const verba of verbasPrincipais) {
      const result = this.calcularVerba(verba);
      verbaResults.push(result);
      this.verbaResultsMap.set(verba.id, result);
    }

    // ── 3. Calcular reflexas (vinculadas via verba_principal_id) ──
    for (const reflexa of verbasReflexas) {
      if (reflexa.verba_principal_id) {
        const principalResult = this.verbaResultsMap.get(reflexa.verba_principal_id);
        if (principalResult) {
          const refResult = this.calcularVerbaReflexa(reflexa, principalResult);
          verbaResults.push(refResult);
          this.verbaResultsMap.set(reflexa.id, refResult);
          continue;
        }
      }
      const result = this.calcularVerba(reflexa);
      verbaResults.push(result);
      this.verbaResultsMap.set(reflexa.id, result);
    }

    // ── 4. Correção Monetária + Juros ──
    this.aplicarCorrecaoJuros(verbaResults);

    // ── 5. FGTS ──
    const fgts = this.calcularFGTS(verbaResults);

    // ── 6. Contribuição Social ──
    const cs = this.calcularCS(verbaResults);

    // ── 7. IR ──
    const ir = this.calcularIR(verbaResults, cs);

    // ── 8. Seguro-Desemprego ──
    const seguro = this.calcularSeguroDesemprego();

    // ── 8b. Previdência Privada ──
    let prevPrivada: PjePrevidenciaPrivadaResult = { apurado: false, base: 0, percentual: 0, valor: 0 };
    if (this.prevPrivadaConfig.apurar && this.prevPrivadaConfig.percentual > 0) {
      let basePP = 0;
      for (const vr of verbaResults) {
        const verba = this.verbas.find(vb => vb.id === vr.verba_id);
        if (!verba?.incidencias.previdencia_privada) continue;
        if (this.prevPrivadaConfig.base_calculo === 'devido') basePP += vr.total_devido;
        else if (this.prevPrivadaConfig.base_calculo === 'corrigido') basePP += vr.total_corrigido;
        else basePP += vr.total_diferenca;
      }
      const valorPP = Number(new Decimal(basePP).times(this.prevPrivadaConfig.percentual / 100).toDP(2));
      prevPrivada = { apurado: true, base: basePP, percentual: this.prevPrivadaConfig.percentual, valor: valorPP };
    }

    // ── 9. Composição do Resumo ──
    const principalBruto = verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s + v.total_diferenca, 0);
    const principalCorrigido = verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s + v.total_corrigido, 0);
    const jurosMora = verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s + v.total_juros, 0);

    const honorarios = this.calcularHonorarios(principalCorrigido, jurosMora, fgts.total_fgts);
    const valorCondenacao = principalCorrigido + jurosMora + fgts.total_fgts;
    const multa523 = this.calcularMulta523(valorCondenacao);
    const custas = this.calcularCustas(valorCondenacao);
    const csDescontado = this.csConfig.cobrar_reclamante ? cs.total_segurado : 0;

    const liquido = Number(new Decimal(
      principalCorrigido + jurosMora + fgts.total_fgts + seguro.total + multa523
      - csDescontado - ir.imposto_devido - prevPrivada.valor
    ).toDP(2));

    const totalReclamada = Number(new Decimal(
      principalCorrigido + jurosMora + fgts.total_fgts + cs.total_empregador 
      + seguro.total + honorarios.sucumbenciais + custas + multa523
    ).toDP(2));

    const resumo: PjeResumo = {
      principal_bruto: Number(new Decimal(principalBruto).toDP(2)),
      principal_corrigido: Number(new Decimal(principalCorrigido).toDP(2)),
      juros_mora: Number(new Decimal(jurosMora).toDP(2)),
      fgts_total: fgts.total_fgts, cs_segurado: csDescontado, cs_empregador: cs.total_empregador,
      ir_retido: ir.imposto_devido, seguro_desemprego: seguro.total, previdencia_privada: prevPrivada.valor,
      multa_523: multa523, honorarios_sucumbenciais: honorarios.sucumbenciais,
      honorarios_contratuais: honorarios.contratuais, custas, liquido_reclamante: liquido, total_reclamada: totalReclamada,
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults, fgts, contribuicao_social: cs, imposto_renda: ir,
      seguro_desemprego: seguro, previdencia_privada: prevPrivada, resumo, validacao,
    };
  }

  // =====================================================
  // CALCULAR VERBA REFLEXA
  // =====================================================

  private calcularVerbaReflexa(reflexa: PjeVerba, principalResult: PjeVerbaResult): PjeVerbaResult {
    const comportamento = reflexa.comportamento_reflexo || 'valor_mensal';
    const ocorrencias: PjeOcorrenciaResult[] = [];
    let totalDevido = 0, totalPago = 0, totalDiferenca = 0;

    switch (comportamento) {
      case 'valor_mensal': {
        for (const oc of principalResult.ocorrencias) {
          const baseValor = reflexa.gerar_verba_reflexa === 'devido' ? oc.devido : oc.diferenca;
          const result = this.calcularOcorrencia(reflexa, oc.competencia, baseValor);
          ocorrencias.push(result);
          totalDevido += result.devido;
          totalPago += result.pago;
          totalDiferenca += result.diferenca;
        }
        break;
      }
      case 'media_valor_absoluto': {
        const valores = principalResult.ocorrencias
          .filter(o => (reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca) > 0)
          .map(o => reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca);
        const media = valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const result = this.calcularOcorrencia(reflexa, comp, media);
        ocorrencias.push(result);
        totalDevido += result.devido;
        totalPago += result.pago;
        totalDiferenca += result.diferenca;
        break;
      }
      case 'media_quantidade': {
        const qtds = principalResult.ocorrencias.filter(o => o.quantidade > 0).map(o => o.quantidade);
        const mediaQtd = qtds.length > 0 ? qtds.reduce((s, v) => s + v, 0) / qtds.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const baseUnitaria = this.getBaseParaCompetencia(reflexa, comp);
        const result = this.calcularOcorrencia(
          { ...reflexa, quantidade_informada: mediaQtd, tipo_quantidade: 'informada' },
          comp, baseUnitaria
        );
        ocorrencias.push(result);
        totalDevido += result.devido;
        totalPago += result.pago;
        totalDiferenca += result.diferenca;
        break;
      }
      default: {
        const valores = principalResult.ocorrencias.filter(o => o.diferenca > 0).map(o => o.diferenca);
        const media = valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const result = this.calcularOcorrencia(reflexa, comp, media);
        ocorrencias.push(result);
        totalDevido += result.devido;
        totalPago += result.pago;
        totalDiferenca += result.diferenca;
      }
    }

    return {
      verba_id: reflexa.id,
      nome: reflexa.nome,
      tipo: 'reflexa',
      caracteristica: reflexa.caracteristica,
      ocorrencias,
      total_devido: Number(new Decimal(totalDevido).toDP(2)),
      total_pago: Number(new Decimal(totalPago).toDP(2)),
      total_diferenca: Number(new Decimal(totalDiferenca).toDP(2)),
      total_corrigido: Number(new Decimal(totalDiferenca).toDP(2)),
      total_juros: 0,
      total_final: Number(new Decimal(totalDiferenca).toDP(2)),
    };
  }
}

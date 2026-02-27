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

export interface PjeLiquidacaoResult {
  data_liquidacao: string;
  verbas: PjeVerbaResult[];
  fgts: PjeFGTSResult;
  contribuicao_social: PjeCSResult;
  imposto_renda: PjeIRResult;
  seguro_desemprego: PjeSeguroResult;
  resumo: PjeResumo;
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
  multa_523: number;
  honorarios_sucumbenciais: number;
  honorarios_contratuais: number;
  custas: number;
  liquido_reclamante: number;
  total_reclamada: number;
}

// =====================================================
// TABELAS PROGRESSIVAS EMBUTIDAS
// =====================================================

// INSS Progressivo 2025 (Portaria MPS/MF nº 6/2025)
const FAIXAS_INSS_2025 = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 5839.45, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

// IRRF 2025 - Tabela mensal
const FAIXAS_IR_2025 = [
  { ate: 2259.20, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
];

const DEDUCAO_DEPENDENTE_2025 = 189.59;

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
  // CÁLCULO DE AVOS (13º e Férias)
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
      const efetInicio = admDate > inicioAno ? admDate : inicioAno;
      const efetFim = demDate < fimAno ? demDate : fimAno;
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
      return 12;
    }
    return 1;
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
      // Default: soma de todas as horas extras
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
    
    // Divisor resolution
    let div: Decimal;
    if (verba.tipo_divisor === 'cartao_ponto') {
      div = new Decimal(this.getCartaoPontoDivisor(competencia, verba.divisor_cartao_colunas) || 30);
    } else if (verba.tipo_divisor === 'carga_horaria') {
      div = new Decimal(this.params.carga_horaria_padrao || 220);
    } else {
      div = new Decimal(verba.divisor_informado || 30);
    }

    // Quantidade resolution
    let qtd: Decimal;
    if (verba.tipo_quantidade === 'cartao_ponto') {
      qtd = new Decimal(this.getCartaoPontoQuantidade(competencia, verba.quantidade_cartao_colunas) || 0);
    } else if (verba.tipo_quantidade === 'avos') {
      qtd = new Decimal(this.calcularAvos(competencia, verba.caracteristica));
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

    const pago = new Decimal(verba.valor_informado_pago || 0);
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
          // Check ocorrencias first
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
  // CALCULAR VERBA COMPLETA
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
        // Add last competencia if not December (proporcional)
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
      const base = this.getBaseParaCompetencia(verba, comp);
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
  // =====================================================

  aplicarCorrecaoJuros(verbaResults: PjeVerbaResult[]): void {
    if (this.correcaoConfig.juros_tipo === 'nenhum' && this.correcaoConfig.indice === 'nenhum') return;

    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    const dataAjuiz = this.params.data_ajuizamento ? new Date(this.params.data_ajuizamento) : null;
    const dataCitacao = this.params.data_citacao 
      ? new Date(this.params.data_citacao) 
      : dataAjuiz ? new Date(dataAjuiz.getTime() + 60 * 24 * 60 * 60 * 1000) : null; // citação ~60 dias após ajuizamento

    for (const vr of verbaResults) {
      let totalCorrigido = 0;
      let totalJuros = 0;
      let totalFinal = 0;

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

        const [ano, mes] = oc.competencia.split('-').map(Number);
        const dataComp = new Date(ano, mes - 1, 1); // 1st day of competência
        
        // ── Correção Monetária ──
        // Meses entre competência e liquidação
        const mesesCorrecao = this.mesesEntre(dataComp, dataLiq);
        
        let indiceCorrecao = 1;
        if (this.correcaoConfig.indice === 'SELIC') {
          // SELIC pós-citação engloba correção + juros (não aplicar juros separados)
          // Média SELIC mensal ~1% a.m. (simplificação quando não temos série histórica)
          indiceCorrecao = Math.pow(1.01, mesesCorrecao);
        } else if (this.correcaoConfig.indice === 'IPCA-E') {
          // IPCA-E médio ~0.45% a.m.
          indiceCorrecao = Math.pow(1.0045, mesesCorrecao);
        } else if (this.correcaoConfig.indice === 'TR') {
          // TR praticamente zero pós-2017
          indiceCorrecao = Math.pow(1.0001, mesesCorrecao);
        } else if (this.correcaoConfig.indice === 'INPC') {
          indiceCorrecao = Math.pow(1.004, mesesCorrecao);
        } else if (this.correcaoConfig.indice === 'IGP-M') {
          indiceCorrecao = Math.pow(1.005, mesesCorrecao);
        }

        const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));

        // ── Juros de Mora ──
        let juros = 0;
        if (this.correcaoConfig.juros_tipo === 'simples_mensal' && this.correcaoConfig.indice !== 'SELIC') {
          // 1% a.m. pro rata die (Art. 39, §1º, Lei 8.177/91)
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
        } else if (this.correcaoConfig.juros_tipo === 'selic' && this.correcaoConfig.indice !== 'SELIC') {
          // SELIC como juros (quando o índice de correção não é SELIC)
          const mesesJuros = this.mesesEntre(dataAjuiz || dataComp, dataLiq);
          juros = Number(new Decimal(valorCorrigido).times(0.01).times(mesesJuros).toDP(2));
        }
        // Se indice = SELIC, juros já estão embutidos na correção

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
    
    // Verbas com incidência FGTS - agrupar por competência
    const basesPorComp: Record<string, number> = {};
    const bases13PorComp: Record<string, number> = {};
    
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.fgts) continue;

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        const target = verba.caracteristica === '13_salario' ? bases13PorComp : basesPorComp;
        target[oc.competencia] = (target[oc.competencia] || 0) + oc.diferenca;
      }
    }

    // Bases do histórico com incidência FGTS não recolhido
    for (const hist of this.historicos) {
      if (!hist.incidencia_fgts || hist.fgts_recolhido) continue;
      for (const oc of hist.ocorrencias) {
        basesPorComp[oc.competencia] = (basesPorComp[oc.competencia] || 0) + oc.valor;
      }
    }

    // Gerar depósitos 8%
    for (const [comp, base] of Object.entries(basesPorComp)) {
      const valor = Number(new Decimal(base).times(0.08).toDP(2));
      depositos.push({ competencia: comp, base, aliquota: 0.08, valor });
    }
    // 13º separado
    for (const [comp, base] of Object.entries(bases13PorComp)) {
      const valor = Number(new Decimal(base).times(0.08).toDP(2));
      depositos.push({ competencia: comp + '-13', base, aliquota: 0.08, valor });
    }

    const totalDepositos = depositos.reduce((s, d) => s + d.valor, 0);

    // Multa rescisória
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

    // LC 110/2001
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
  // CALCULAR CONTRIBUIÇÃO SOCIAL (Progressiva EC 103/2019)
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
      // Férias indenizadas são isentas de CS
      if (verba.caracteristica === 'ferias') continue;
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        basesPorComp[oc.competencia] = (basesPorComp[oc.competencia] || 0) + oc.diferenca;
      }
    }

    // Segurado progressivo
    if (this.csConfig.apurar_segurado) {
      for (const [comp, base] of Object.entries(basesPorComp)) {
        let imposto = 0;
        if (this.csConfig.aliquota_segurado_tipo === 'fixa' && this.csConfig.aliquota_segurado_fixa) {
          imposto = base * (this.csConfig.aliquota_segurado_fixa / 100);
        } else {
          // Progressiva
          let baseRestante = this.csConfig.limitar_teto ? Math.min(base, FAIXAS_INSS_2025[FAIXAS_INSS_2025.length - 1].ate) : base;
          let faixaAnterior = 0;
          for (const faixa of FAIXAS_INSS_2025) {
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

    // Empregador (alíquotas fixas)
    if (this.csConfig.apurar_empresa || this.csConfig.apurar_sat || this.csConfig.apurar_terceiros) {
      for (const [comp, base] of Object.entries(basesPorComp)) {
        if (base <= 0) continue;
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

    return {
      segurado, empregador,
      total_segurado: segurado.reduce((s, x) => s + x.diferenca, 0),
      total_empregador: empregador.reduce((s, x) => s + x.empresa + x.sat + x.terceiros, 0),
    };
  }

  // =====================================================
  // CALCULAR IR (Art. 12-A - RRA)
  // =====================================================

  calcularIR(verbaResults: PjeVerbaResult[], csResult: PjeCSResult): PjeIRResult {
    if (!this.irConfig.apurar) {
      return { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'tabela_mensal' };
    }

    // Base = verbas com incidência IRPF (excluir férias indenizadas - isentas)
    let baseBruta = 0;
    let base13 = 0;
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.irpf) continue;
      if (verba.caracteristica === 'ferias') continue; // Férias indenizadas isentas
      if (verba.caracteristica === '13_salario' && this.irConfig.tributacao_exclusiva_13) {
        base13 += vr.total_diferenca;
      } else {
        baseBruta += vr.total_diferenca;
      }
    }

    // Juros de mora (OJ 400 SDI-I TST - isentos de IR)
    // Não incluir juros na base

    // Deduções
    let deducoes = 0;
    if (this.irConfig.deduzir_cs && this.csConfig.cobrar_reclamante) {
      deducoes += csResult.total_segurado;
    }

    // Meses RRA
    const periodo = this.getPeriodoCalculo();
    const meses = Math.max(1, this.getCompetencias(periodo.inicio, periodo.fim).length);
    
    const deducaoDependentes = this.irConfig.dependentes * DEDUCAO_DEPENDENTE_2025 * meses;
    const baseTributavel = Math.max(0, baseBruta - deducoes - deducaoDependentes);
    
    // Tabela progressiva acumulada (Art. 12-A, Lei 7.713/88)
    let imposto = 0;
    for (const faixa of FAIXAS_IR_2025) {
      if (baseTributavel <= faixa.ate * meses) {
        imposto = baseTributavel * faixa.aliquota - faixa.deducao * meses;
        break;
      }
    }
    if (imposto < 0) imposto = 0;

    // 13º tributação exclusiva
    if (this.irConfig.tributacao_exclusiva_13 && base13 > 0) {
      let imposto13 = 0;
      for (const faixa of FAIXAS_IR_2025) {
        if (base13 <= faixa.ate) {
          imposto13 = base13 * faixa.aliquota - faixa.deducao;
          break;
        }
      }
      if (imposto13 > 0) imposto += imposto13;
    }

    return {
      base_calculo: Number(new Decimal(baseBruta + base13).toDP(2)),
      deducoes: Number(new Decimal(deducoes + deducaoDependentes).toDP(2)),
      base_tributavel: Number(new Decimal(baseTributavel + base13).toDP(2)),
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
    
    // Calcular valor se não informado
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
      const baseHon = principalCorrigido + juros + fgts; // valor da condenação
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
  // LIQUIDAR - FLUXO PRINCIPAL
  // =====================================================

  liquidar(): PjeLiquidacaoResult {
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
      // Reflexa sem principal vinculada - calcular como verba normal
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

    // ── 9. Composição do Resumo ──
    const principalBruto = verbaResults
      .filter(v => {
        const verba = this.verbas.find(vb => vb.id === v.verba_id);
        return verba?.compor_principal !== false;
      })
      .reduce((s, v) => s + v.total_diferenca, 0);

    const principalCorrigido = verbaResults
      .filter(v => {
        const verba = this.verbas.find(vb => vb.id === v.verba_id);
        return verba?.compor_principal !== false;
      })
      .reduce((s, v) => s + v.total_corrigido, 0);

    const jurosMora = verbaResults
      .filter(v => {
        const verba = this.verbas.find(vb => vb.id === v.verba_id);
        return verba?.compor_principal !== false;
      })
      .reduce((s, v) => s + v.total_juros, 0);

    // ── 10. Honorários ──
    const honorarios = this.calcularHonorarios(principalCorrigido, jurosMora, fgts.total_fgts);

    // ── 11. Multa 523 ──
    const valorCondenacao = principalCorrigido + jurosMora + fgts.total_fgts;
    const multa523 = this.calcularMulta523(valorCondenacao);

    // ── 12. Custas ──
    const custas = this.calcularCustas(valorCondenacao);

    const csDescontado = this.csConfig.cobrar_reclamante ? cs.total_segurado : 0;

    const liquido = Number(new Decimal(
      principalCorrigido + jurosMora + fgts.total_fgts + seguro.total + multa523
      - csDescontado - ir.imposto_devido
    ).toDP(2));

    const totalReclamada = Number(new Decimal(
      principalCorrigido + jurosMora + fgts.total_fgts + cs.total_empregador 
      + seguro.total + honorarios.sucumbenciais + custas + multa523
    ).toDP(2));

    const resumo: PjeResumo = {
      principal_bruto: Number(new Decimal(principalBruto).toDP(2)),
      principal_corrigido: Number(new Decimal(principalCorrigido).toDP(2)),
      juros_mora: Number(new Decimal(jurosMora).toDP(2)),
      fgts_total: fgts.total_fgts,
      cs_segurado: csDescontado,
      cs_empregador: cs.total_empregador,
      ir_retido: ir.imposto_devido,
      seguro_desemprego: seguro.total,
      multa_523: multa523,
      honorarios_sucumbenciais: honorarios.sucumbenciais,
      honorarios_contratuais: honorarios.contratuais,
      custas,
      liquido_reclamante: liquido,
      total_reclamada: totalReclamada,
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults,
      fgts,
      contribuicao_social: cs,
      imposto_renda: ir,
      seguro_desemprego: seguro,
      resumo,
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
        // media_valor_corrigido
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

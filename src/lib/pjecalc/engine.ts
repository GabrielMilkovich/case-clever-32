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
  
  // Base de cálculo
  base_calculo: {
    historicos: string[];
    verbas: string[];
    tabelas: string[];
    proporcionalizar: boolean;
    integralizar: boolean;
  };
  
  // Divisor/Multiplicador/Quantidade
  tipo_divisor: 'informado' | 'carga_horaria' | 'dias_uteis' | 'cartao_ponto';
  divisor_informado: number;
  multiplicador: number;
  tipo_quantidade: 'informada' | 'avos' | 'apurada' | 'calendario';
  quantidade_informada: number;
  quantidade_proporcionalizar: boolean;
  
  // Exclusões
  exclusoes: {
    faltas_justificadas: boolean;
    faltas_nao_justificadas: boolean;
    ferias_gozadas: boolean;
  };
  
  // Valor pago
  valor_informado_devido?: number;
  valor_informado_pago?: number;
  
  // Incidências
  incidencias: {
    fgts: boolean;
    irpf: boolean;
    contribuicao_social: boolean;
    previdencia_privada: boolean;
    pensao_alimenticia: boolean;
  };
  
  // Juros
  juros_ajuizamento: 'ocorrencias_vencidas' | 'ocorrencias_vencidas_vincendas';
  
  // Reflexa
  verba_principal_id?: string;
  comportamento_reflexo?: 'valor_mensal' | 'media_valor_absoluto' | 'media_valor_corrigido' | 'media_quantidade';
  gerar_verba_reflexa: 'devido' | 'diferenca';
  gerar_verba_principal: 'devido' | 'diferenca';
  
  // Ordem de execução
  ordem: number;
  
  // Verbas reflexas dessa principal
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

export interface PjeFGTSConfig {
  apurar: boolean;
  destino: 'pagar_reclamante' | 'recolher_conta';
  compor_principal: boolean;
  multa_apurar: boolean;
  multa_tipo: 'calculada' | 'informada';
  multa_percentual: number; // 20 ou 40
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

// =====================================================
// RESULTADO DA LIQUIDAÇÃO
// =====================================================

export interface PjeLiquidacaoResult {
  data_liquidacao: string;
  verbas: PjeVerbaResult[];
  fgts: PjeFGTSResult;
  contribuicao_social: PjeCSResult;
  imposto_renda: PjeIRResult;
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

export interface PjeResumo {
  principal_bruto: number;
  principal_corrigido: number;
  juros_mora: number;
  fgts_total: number;
  cs_segurado: number;
  cs_empregador: number;
  ir_retido: number;
  multa_523: number;
  honorarios: number;
  custas: number;
  liquido_reclamante: number;
  total_reclamada: number;
}

// =====================================================
// MOTOR DE CÁLCULO
// =====================================================

export class PjeCalcEngine {
  private params: PjeParametros;
  private historicos: PjeHistoricoSalarial[];
  private faltas: PjeFalta[];
  private ferias: PjeFerias[];
  private verbas: PjeVerba[];
  private fgtsConfig: PjeFGTSConfig;
  private csConfig: PjeCSConfig;
  private irConfig: PjeIRConfig;
  private correcaoConfig: PjeCorrecaoConfig;

  constructor(
    params: PjeParametros,
    historicos: PjeHistoricoSalarial[],
    faltas: PjeFalta[],
    ferias: PjeFerias[],
    verbas: PjeVerba[],
    fgtsConfig: PjeFGTSConfig,
    csConfig: PjeCSConfig,
    irConfig: PjeIRConfig,
    correcaoConfig: PjeCorrecaoConfig,
  ) {
    this.params = params;
    this.historicos = historicos;
    this.faltas = faltas;
    this.ferias = ferias;
    this.verbas = verbas;
    this.fgtsConfig = fgtsConfig;
    this.csConfig = csConfig;
    this.irConfig = irConfig;
    this.correcaoConfig = correcaoConfig;
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
      // 13º: avos = meses trabalhados no ano (dia >= 15 conta como mês)
      const inicioAno = new Date(ano, 0, 1);
      const fimAno = new Date(ano, 11, 31);
      const efetInicio = admDate > inicioAno ? admDate : inicioAno;
      const efetFim = demDate < fimAno ? demDate : fimAno;
      
      if (efetInicio > efetFim) return 0;
      
      let avos = 0;
      for (let m = efetInicio.getMonth(); m <= efetFim.getMonth(); m++) {
        const diaInicio = (m === efetInicio.getMonth()) ? efetInicio.getDate() : 1;
        const diaFim = (m === efetFim.getMonth()) ? efetFim.getDate() : 
          new Date(ano, m + 1, 0).getDate();
        const diasMes = diaFim - diaInicio + 1;
        if (diasMes >= 15) avos++;
      }
      return avos;
    }
    
    if (caracteristica === 'ferias') {
      // Férias: avos do período aquisitivo em questão
      // Simplificado: 12 avos por ano completo
      return 12; // será ajustado na ocorrência
    }
    
    return 1;
  }

  // =====================================================
  // PRAZO DO AVISO PRÉVIO (Lei 12.506/2011)
  // =====================================================

  calcularPrazoAviso(): number {
    if (this.params.prazo_aviso_previo === 'nao_apurar') return 30;
    if (this.params.prazo_aviso_previo === 'informado') return this.params.prazo_aviso_dias || 30;
    
    // Calculado: 30 + 3 por ano, max 90
    const adm = new Date(this.params.data_admissao);
    const dem = this.params.data_demissao ? new Date(this.params.data_demissao) : new Date();
    const anosServico = Math.floor((dem.getTime() - adm.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return Math.min(90, 30 + (anosServico * 3));
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
    let div = new Decimal(verba.divisor_informado || 30);
    let qtd = new Decimal(verba.quantidade_informada || 1);
    const dobra = new Decimal(verba.dobrar_valor_devido ? 2 : 1);

    // Quantidade por avos
    if (verba.tipo_quantidade === 'avos') {
      qtd = new Decimal(this.calcularAvos(competencia, verba.caracteristica));
    }

    // Quantidade para aviso prévio
    if (verba.caracteristica === 'aviso_previo') {
      qtd = new Decimal(this.calcularPrazoAviso());
    }

    // Proporcionalizar quantidade para meses incompletos
    if (verba.quantidade_proporcionalizar) {
      const [ano, mes] = competencia.split('-').map(Number);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(this.params.data_admissao);
      const demDate = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      
      let diaInicio = 1;
      let diaFim = diasNoMes;
      
      if (admDate.getFullYear() === ano && admDate.getMonth() + 1 === mes) {
        diaInicio = admDate.getDate();
      }
      if (demDate && demDate.getFullYear() === ano && demDate.getMonth() + 1 === mes) {
        diaFim = demDate.getDate();
      }
      
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

    // Zerar valor negativo
    if (verba.zerar_valor_negativo && devido.isNegative()) {
      devido = new Decimal(0);
    }

    const pago = new Decimal(verba.valor_informado_pago || 0);
    const diferenca = devido.minus(pago);

    const formula = verba.valor === 'calculado'
      ? `(${base.toFixed(2)} × ${mult.toFixed(8)} / ${div.toFixed(2)}) × ${qtd.toFixed(4)} × ${dobra.toFixed(0)}`
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

    // Somar bases do histórico salarial
    for (const histId of verba.base_calculo.historicos) {
      const hist = this.historicos.find(h => h.id === histId);
      if (!hist) continue;
      
      const oc = hist.ocorrencias.find(o => o.competencia === competencia);
      if (oc) base += oc.valor;
    }

    // Se não encontrou no histórico, usar maior remuneração ou última
    if (base === 0) {
      if (verba.base_calculo.tabelas.includes('maior_remuneracao') && this.params.maior_remuneracao) {
        base = this.params.maior_remuneracao;
      } else if (verba.base_calculo.tabelas.includes('ultima_remuneracao') && this.params.ultima_remuneracao) {
        base = this.params.ultima_remuneracao;
      }
    }

    // Somar bases de outras verbas (para reflexas)
    for (const verbaBaseId of verba.base_calculo.verbas) {
      // A base de outras verbas será resolvida na fase de execução
      // por enquanto retorna o que temos
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
      case 'dezembro':
        // Uma ocorrência por ano (dezembro)
        competencias = this.getCompetencias(periodo.inicio, periodo.fim)
          .filter(c => c.endsWith('-12') || c === this.getCompetencias(periodo.inicio, periodo.fim).pop());
        break;
      case 'desligamento':
        // Uma única ocorrência na data da demissão
        competencias = [this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7)];
        break;
      case 'periodo_aquisitivo':
        // Uma ocorrência por período aquisitivo de férias
        competencias = this.ferias.map(f => f.periodo_aquisitivo_fim.slice(0, 7));
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
  // CALCULAR FGTS
  // =====================================================

  calcularFGTS(verbaResults: PjeVerbaResult[]): PjeFGTSResult {
    if (!this.fgtsConfig.apurar) {
      return { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 };
    }

    const depositos: PjeFGTSResult['depositos'] = [];
    
    // Verbas com incidência FGTS
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.fgts) continue;

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        const valor = Number(new Decimal(oc.diferenca).times(0.08).toDP(2));
        depositos.push({
          competencia: oc.competencia,
          base: oc.diferenca,
          aliquota: 0.08,
          valor,
        });
      }
    }

    // Bases do histórico com incidência FGTS
    for (const hist of this.historicos) {
      if (!hist.incidencia_fgts || hist.fgts_recolhido) continue;
      for (const oc of hist.ocorrencias) {
        const valor = Number(new Decimal(oc.valor).times(0.08).toDP(2));
        depositos.push({
          competencia: oc.competencia,
          base: oc.valor,
          aliquota: 0.08,
          valor,
        });
      }
    }

    const totalDepositos = depositos.reduce((s, d) => s + d.valor, 0);

    // Multa rescisória
    let multaValor = 0;
    if (this.fgtsConfig.multa_apurar) {
      if (this.fgtsConfig.multa_tipo === 'informada') {
        multaValor = this.fgtsConfig.multa_valor_informado || 0;
      } else {
        let base = totalDepositos;
        if (this.fgtsConfig.multa_base === 'diferenca') base = totalDepositos;
        multaValor = Number(new Decimal(base).times(this.fgtsConfig.multa_percentual / 100).toDP(2));
      }
    }

    // LC 110/2001
    const lc110_10 = this.fgtsConfig.lc110_10 ? Number(new Decimal(totalDepositos).times(0.10).toDP(2)) : 0;
    const lc110_05 = this.fgtsConfig.lc110_05 ? Number(new Decimal(totalDepositos).times(0.005).toDP(2)) : 0;

    // Dedução de saldo
    const saldoDeduzido = this.fgtsConfig.deduzir_saldo 
      ? this.fgtsConfig.saldos_saques.reduce((s, v) => s + v.valor, 0) 
      : 0;

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
  // CALCULAR CONTRIBUIÇÃO SOCIAL
  // =====================================================

  calcularCS(verbaResults: PjeVerbaResult[]): PjeCSResult {
    const segurado: PjeCSResult['segurado'] = [];
    const empregador: PjeCSResult['empregador'] = [];

    if (!this.csConfig.apurar_segurado) {
      return { segurado, empregador, total_segurado: 0, total_empregador: 0 };
    }

    // Agrupar por competência
    const basesPorComp: Record<string, number> = {};
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.contribuicao_social) continue;
      for (const oc of vr.ocorrencias) {
        basesPorComp[oc.competencia] = (basesPorComp[oc.competencia] || 0) + oc.diferenca;
      }
    }

    // Calcular segurado com tabela progressiva (pós EC 103/2019)
    const FAIXAS_INSS_2025 = [
      { ate: 1518.00, aliquota: 0.075 },
      { ate: 2793.88, aliquota: 0.09 },
      { ate: 5839.45, aliquota: 0.12 },
      { ate: 8157.41, aliquota: 0.14 },
    ];

    for (const [comp, base] of Object.entries(basesPorComp)) {
      if (base <= 0) continue;
      
      let imposto = 0;
      let baseRestante = base;
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

      segurado.push({
        competencia: comp,
        base,
        aliquota: base > 0 ? imposto / base : 0,
        valor: Number(new Decimal(imposto).toDP(2)),
        recolhido: 0,
        diferenca: Number(new Decimal(imposto).toDP(2)),
      });
    }

    // Empregador
    if (this.csConfig.apurar_empresa || this.csConfig.apurar_sat || this.csConfig.apurar_terceiros) {
      for (const [comp, base] of Object.entries(basesPorComp)) {
        if (base <= 0) continue;
        empregador.push({
          competencia: comp,
          empresa: this.csConfig.apurar_empresa ? Number(new Decimal(base).times(0.20).toDP(2)) : 0,
          sat: this.csConfig.apurar_sat ? Number(new Decimal(base).times(0.02).toDP(2)) : 0,
          terceiros: this.csConfig.apurar_terceiros ? Number(new Decimal(base).times(0.058).toDP(2)) : 0,
        });
      }
    }

    return {
      segurado,
      empregador,
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

    // Base = verbas com incidência IRPF
    let baseBruta = 0;
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.irpf) continue;
      baseBruta += vr.total_diferenca;
    }

    // Deduções
    let deducoes = 0;
    if (this.irConfig.deduzir_cs && this.csConfig.cobrar_reclamante) {
      deducoes += csResult.total_segurado;
    }

    // Dependentes (R$ 189,59/mês em 2025)
    const dedPorDep = 189.59;
    
    // Meses RRA
    const periodo = this.getPeriodoCalculo();
    const meses = this.getCompetencias(periodo.inicio, periodo.fim).length;
    
    const baseTributavel = Math.max(0, baseBruta - deducoes);
    
    // Tabela progressiva acumulada (Art. 12-A, Lei 7.713/88)
    // Faixas mensais 2025 × meses
    const FAIXA_MENSAL = [
      { ate: 2259.20, aliquota: 0, deducao: 0 },
      { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
      { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
      { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
      { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
    ];

    const deducaoDependentes = this.irConfig.dependentes * dedPorDep * meses;
    const baseAjustada = Math.max(0, baseTributavel - deducaoDependentes);

    // Aplicar tabela acumulada
    let imposto = 0;
    for (const faixa of FAIXA_MENSAL) {
      if (baseAjustada <= faixa.ate * meses) {
        imposto = baseAjustada * faixa.aliquota - faixa.deducao * meses;
        break;
      }
    }
    if (imposto < 0) imposto = 0;

    return {
      base_calculo: Number(new Decimal(baseBruta).toDP(2)),
      deducoes: Number(new Decimal(deducoes + deducaoDependentes).toDP(2)),
      base_tributavel: Number(new Decimal(baseAjustada).toDP(2)),
      imposto_devido: Number(new Decimal(imposto).toDP(2)),
      meses_rra: meses,
      metodo: meses > 1 ? 'art_12a_rra' : 'tabela_mensal',
    };
  }

  // =====================================================
  // LIQUIDAR
  // =====================================================

  liquidar(): PjeLiquidacaoResult {
    // 1. Calcular verbas principais (na ordem definida)
    const verbasPrincipais = this.verbas
      .filter(v => v.tipo === 'principal')
      .sort((a, b) => a.ordem - b.ordem);

    const verbaResults: PjeVerbaResult[] = [];
    
    for (const verba of verbasPrincipais) {
      const result = this.calcularVerba(verba);
      verbaResults.push(result);

      // Calcular reflexas dessa principal
      if (verba.reflexas) {
        for (const reflexa of verba.reflexas) {
          const refResult = this.calcularVerbaReflexa(reflexa, result);
          verbaResults.push(refResult);
        }
      }
    }

    // 2. FGTS
    const fgts = this.calcularFGTS(verbaResults);

    // 3. Contribuição Social
    const cs = this.calcularCS(verbaResults);

    // 4. IR
    const ir = this.calcularIR(verbaResults, cs);

    // 5. Resumo
    const principalBruto = verbaResults
      .filter(v => {
        const verba = this.verbas.find(vb => vb.id === v.verba_id);
        return verba?.compor_principal !== false;
      })
      .reduce((s, v) => s + v.total_diferenca, 0);

    const resumo: PjeResumo = {
      principal_bruto: Number(new Decimal(principalBruto).toDP(2)),
      principal_corrigido: Number(new Decimal(principalBruto).toDP(2)), // TODO: correção
      juros_mora: 0, // TODO: juros
      fgts_total: fgts.total_fgts,
      cs_segurado: this.csConfig.cobrar_reclamante ? cs.total_segurado : 0,
      cs_empregador: cs.total_empregador,
      ir_retido: ir.imposto_devido,
      multa_523: 0, // TODO
      honorarios: 0, // TODO
      custas: 0, // TODO
      liquido_reclamante: Number(new Decimal(principalBruto + fgts.total_fgts - (this.csConfig.cobrar_reclamante ? cs.total_segurado : 0) - ir.imposto_devido).toDP(2)),
      total_reclamada: Number(new Decimal(principalBruto + fgts.total_fgts + cs.total_empregador).toDP(2)),
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults,
      fgts,
      contribuicao_social: cs,
      imposto_renda: ir,
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
        // Base = valor da principal no mesmo mês
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
        // Base = média dos valores absolutos
        const valores = principalResult.ocorrencias
          .filter(o => (reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca) > 0)
          .map(o => reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca);
        const media = valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
        
        // Uma ocorrência de reflexo com a média
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const result = this.calcularOcorrencia(reflexa, comp, media);
        ocorrencias.push(result);
        totalDevido += result.devido;
        totalPago += result.pago;
        totalDiferenca += result.diferenca;
        break;
      }
      case 'media_quantidade': {
        // Base = média convertida em quantidade
        const qtds = principalResult.ocorrencias
          .filter(o => o.quantidade > 0)
          .map(o => o.quantidade);
        const mediaQtd = qtds.length > 0 ? qtds.reduce((s, v) => s + v, 0) / qtds.length : 0;
        
        // Usar quantidade média como base
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const baseUnitaria = this.getBaseParaCompetencia(reflexa, comp);
        const result = this.calcularOcorrencia(
          { ...reflexa, quantidade_informada: mediaQtd, tipo_quantidade: 'informada' },
          comp,
          baseUnitaria
        );
        ocorrencias.push(result);
        totalDevido += result.devido;
        totalPago += result.pago;
        totalDiferenca += result.diferenca;
        break;
      }
      default: {
        // media_valor_corrigido - similar a absoluto mas com correção
        const valores = principalResult.ocorrencias
          .filter(o => o.diferenca > 0)
          .map(o => o.diferenca);
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

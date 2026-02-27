// =====================================================
// PJE-CALC ENGINE: VERBAS - Réplica exata da lógica PJe-Calc
// =====================================================
// Fórmula PJe-Calc: Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra

import {
  ParametrosCalculo,
  VerbaPjeCalc,
  OcorrenciaVerba,
  OcorrenciaHistorico,
  ResultadoVerba,
  Falta,
  PeriodoFerias,
} from './types';
import { Decimal } from 'decimal.js';

// ---- HELPERS ----

/** Gera lista de competências (YYYY-MM) entre duas datas */
export function gerarCompetencias(inicio: string, fim: string): string[] {
  const competencias: string[] = [];
  const dInicio = new Date(inicio + 'T00:00:00');
  const dFim = new Date(fim + 'T00:00:00');
  
  let current = new Date(dInicio.getFullYear(), dInicio.getMonth(), 1);
  const last = new Date(dFim.getFullYear(), dFim.getMonth(), 1);
  
  while (current <= last) {
    const y = current.getFullYear();
    const m = (current.getMonth() + 1).toString().padStart(2, '0');
    competencias.push(`${y}-${m}`);
    current.setMonth(current.getMonth() + 1);
  }
  return competencias;
}

/** Dias no mês */
function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

/** Dias trabalhados no mês (considerando admissão/demissão) */
function diasTrabalhadosNoMes(
  competencia: string,
  admissao: string,
  demissao?: string
): { dataInicial: string; dataFinal: string; dias: number; totalDiasMes: number } {
  const [ano, mes] = competencia.split('-').map(Number);
  const totalDiasMes = diasNoMes(ano, mes);
  
  let dataInicial = new Date(ano, mes - 1, 1);
  let dataFinal = new Date(ano, mes - 1, totalDiasMes);
  
  const dAdmissao = new Date(admissao + 'T00:00:00');
  const dDemissao = demissao ? new Date(demissao + 'T00:00:00') : null;
  
  if (dAdmissao > dataInicial) dataInicial = dAdmissao;
  if (dDemissao && dDemissao < dataFinal) dataFinal = dDemissao;
  
  const dias = Math.max(0, Math.floor((dataFinal.getTime() - dataInicial.getTime()) / 86400000) + 1);
  
  return {
    dataInicial: dataInicial.toISOString().split('T')[0],
    dataFinal: dataFinal.toISOString().split('T')[0],
    dias,
    totalDiasMes,
  };
}

/** Calcula dias de falta em um mês */
function diasFaltaNoMes(
  competencia: string,
  faltas: Falta[],
  incluirJustificadas: boolean,
  incluirNaoJustificadas: boolean
): number {
  if (!incluirJustificadas && !incluirNaoJustificadas) return 0;
  
  const [ano, mes] = competencia.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes - 1, diasNoMes(ano, mes));
  
  let totalDias = 0;
  for (const falta of faltas) {
    if (falta.justificada && !incluirJustificadas) continue;
    if (!falta.justificada && !incluirNaoJustificadas) continue;
    
    const fi = new Date(falta.data_inicial + 'T00:00:00');
    const ff = new Date(falta.data_final + 'T00:00:00');
    
    const overlapStart = fi > inicioMes ? fi : inicioMes;
    const overlapEnd = ff < fimMes ? ff : fimMes;
    
    if (overlapStart <= overlapEnd) {
      totalDias += Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
    }
  }
  return totalDias;
}

/** Calcula dias de férias gozadas no mês */
function diasFeriasGozadasNoMes(
  competencia: string,
  periodos: PeriodoFerias[]
): number {
  const [ano, mes] = competencia.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes - 1, diasNoMes(ano, mes));
  
  let totalDias = 0;
  for (const pf of periodos) {
    if (pf.situacao !== 'gozadas' && pf.situacao !== 'gozadas_parcialmente') continue;
    for (const gozo of pf.periodos_gozo) {
      const gi = new Date(gozo.inicio + 'T00:00:00');
      const gf = new Date(gozo.fim + 'T00:00:00');
      const overlapStart = gi > inicioMes ? gi : inicioMes;
      const overlapEnd = gf < fimMes ? gf : fimMes;
      if (overlapStart <= overlapEnd) {
        totalDias += Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
      }
    }
  }
  return totalDias;
}

/** Calcula avos de 13º ou férias */
function calcularAvos(
  competencia: string,
  admissao: string,
  demissao?: string,
  caracteristica: 'ferias' | '13_salario' = '13_salario'
): number {
  const [ano, mes] = competencia.split('-').map(Number);
  
  const dAdm = new Date(admissao + 'T00:00:00');
  const dDem = demissao ? new Date(demissao + 'T00:00:00') : null;
  
  if (caracteristica === '13_salario') {
    // 13º: avos no ano da competência
    const inicioAno = new Date(ano, 0, 1);
    const fimAno = new Date(ano, 11, 31);
    
    const efetInicio = dAdm > inicioAno ? dAdm : inicioAno;
    const efetFim = dDem && dDem < fimAno ? dDem : fimAno;
    
    if (efetInicio > efetFim) return 0;
    
    const mesInicio = efetInicio.getMonth();
    const mesFim = efetFim.getMonth();
    // Cada mês com 15+ dias trabalhados = 1 avo
    let avos = 0;
    for (let m = mesInicio; m <= mesFim; m++) {
      const diasMes = diasNoMes(ano, m + 1);
      const di = m === mesInicio ? efetInicio.getDate() : 1;
      const df = m === mesFim ? efetFim.getDate() : diasMes;
      const diasTrabalhados = df - di + 1;
      if (diasTrabalhados >= 15) avos++;
    }
    return avos;
  }
  
  // Férias: avos no período aquisitivo
  // Simplificado: retorna avos proporcionais
  return 12; // placeholder - férias usa dados do período aquisitivo
}

/** Calcula dias úteis no mês */
function diasUteisNoMes(
  competencia: string,
  sabadoUtil: boolean,
  feriados: string[] = []
): number {
  const [ano, mes] = competencia.split('-').map(Number);
  const totalDias = diasNoMes(ano, mes);
  let uteis = 0;
  
  for (let d = 1; d <= totalDias; d++) {
    const data = new Date(ano, mes - 1, d);
    const dow = data.getDay(); // 0=dom, 6=sab
    if (dow === 0) continue; // domingo nunca é útil
    if (dow === 6 && !sabadoUtil) continue;
    
    const dataStr = data.toISOString().split('T')[0];
    if (feriados.includes(dataStr)) continue;
    
    uteis++;
  }
  return uteis;
}

/** Calcula repousos no mês (domingos + feriados) */
function repousosNoMes(
  competencia: string,
  sabadoUtil: boolean,
  feriados: string[] = []
): number {
  const [ano, mes] = competencia.split('-').map(Number);
  const totalDias = diasNoMes(ano, mes);
  let repousos = 0;
  
  for (let d = 1; d <= totalDias; d++) {
    const data = new Date(ano, mes - 1, d);
    const dow = data.getDay();
    const dataStr = data.toISOString().split('T')[0];
    
    if (dow === 0) { repousos++; continue; }
    if (feriados.includes(dataStr)) { repousos++; continue; }
  }
  return repousos;
}

// ---- GERADOR DE OCORRÊNCIAS (CORE DO PJE-CALC) ----

export interface ContextoCalculo {
  parametros: ParametrosCalculo;
  historicos: { id: string; ocorrencias: OcorrenciaHistorico[] }[];
  faltas: Falta[];
  ferias: PeriodoFerias[];
  feriados: string[];
  todasVerbas: VerbaPjeCalc[];
  resultadosVerbas: Map<string, OcorrenciaVerba[]>; // verba_id -> ocorrências calculadas
}

/**
 * Gera ocorrências para uma verba, seguindo EXATAMENTE a lógica PJe-Calc:
 * - Cria uma ocorrência por mês no período
 * - Preenche Base, Divisor, Multiplicador, Quantidade, Dobra
 * - Calcula Devido = (Base × Mult / Div) × Qtd × Dobra
 */
export function gerarOcorrencias(
  verba: VerbaPjeCalc,
  ctx: ContextoCalculo
): OcorrenciaVerba[] {
  const { parametros } = ctx;
  const competencias = gerarCompetencias(verba.periodo_inicio, verba.periodo_fim);
  const ocorrencias: OcorrenciaVerba[] = [];
  
  for (const comp of competencias) {
    const info = diasTrabalhadosNoMes(
      comp,
      parametros.data_admissao,
      parametros.data_demissao
    );
    
    if (info.dias <= 0) continue;
    
    // Exclusões: calcular dias a excluir
    let diasExcluidos = 0;
    if (verba.exclusoes.faltas_justificadas || verba.exclusoes.faltas_nao_justificadas) {
      diasExcluidos += diasFaltaNoMes(
        comp, ctx.faltas,
        verba.exclusoes.faltas_justificadas,
        verba.exclusoes.faltas_nao_justificadas
      );
    }
    if (verba.exclusoes.ferias_gozadas) {
      diasExcluidos += diasFeriasGozadasNoMes(comp, ctx.ferias);
    }
    
    const diasEfetivos = Math.max(0, info.dias - diasExcluidos);
    
    // ---- CALCULAR CADA CAMPO ----
    
    // 1. BASE
    const valorBase = calcularBase(verba, comp, ctx);
    
    // 2. DIVISOR
    const divisor = calcularDivisor(verba, comp, ctx);
    
    // 3. MULTIPLICADOR
    const multiplicador = verba.multiplicador || 1;
    
    // 4. QUANTIDADE
    const quantidade = calcularQuantidade(verba, comp, info, diasEfetivos, ctx);
    
    // 5. DOBRA
    const dobra = verba.dobrar_valor_devido ? 2 : 1;
    
    // ---- CALCULAR DEVIDO ----
    let devido: number;
    let pago = 0;
    
    if (verba.valor === 'calculado') {
      // Fórmula PJe-Calc: Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra
      const d = new Decimal(valorBase)
        .times(multiplicador)
        .div(divisor || 1)
        .times(quantidade)
        .times(dobra);
      
      devido = d.toDecimalPlaces(2).toNumber();
    } else {
      // Valor informado
      devido = verba.valor_informado_devido || 0;
      pago = verba.valor_informado_pago || 0;
    }
    
    // Zerar valor negativo
    if (verba.zerar_valor_negativo && devido < 0) {
      devido = 0;
    }
    
    const diferenca = new Decimal(devido).minus(pago).toDecimalPlaces(2).toNumber();
    
    ocorrencias.push({
      id: `${verba.id}_${comp}`,
      verba_id: verba.id,
      competencia: comp,
      data_inicial: info.dataInicial,
      data_final: info.dataFinal,
      ativa: true,
      valor_base: valorBase,
      divisor,
      multiplicador,
      quantidade,
      dobra,
      devido,
      pago,
      diferenca,
      tipo_valor: verba.valor === 'calculado' ? 'calculado' : 'informado',
      tipo_divisor: verba.tipo_divisor === 'informado' ? 'informado' : 'calculado',
      tipo_quantidade: verba.tipo_quantidade === 'informada' ? 'informado' : 'calculado',
      tipo_pago: 'informado',
    });
  }
  
  return ocorrencias;
}

// ---- CÁLCULO DA BASE ----

function calcularBase(
  verba: VerbaPjeCalc,
  competencia: string,
  ctx: ContextoCalculo
): number {
  if (verba.valor === 'informado') return 0;
  
  let base = new Decimal(0);
  
  // 1. Bases do histórico salarial
  for (const histId of verba.base_calculo.historicos) {
    const hist = ctx.historicos.find(h => h.id === histId);
    if (!hist) continue;
    
    const ocHist = hist.ocorrencias.find(o => o.competencia === competencia);
    if (ocHist) {
      let valor = new Decimal(ocHist.valor);
      
      // Proporcionalizar se necessário
      if (verba.base_calculo.proporcionalizar) {
        const info = diasTrabalhadosNoMes(competencia, ctx.parametros.data_admissao, ctx.parametros.data_demissao);
        if (info.dias < info.totalDiasMes) {
          valor = valor.times(info.dias).div(info.totalDiasMes);
        }
      }
      
      base = base.plus(valor);
    }
  }
  
  // 2. Bases de outras verbas
  for (const verbaBaseId of verba.base_calculo.verbas) {
    const ocorrenciasBase = ctx.resultadosVerbas.get(verbaBaseId);
    if (!ocorrenciasBase) continue;
    
    if (verba.tipo === 'reflexa' && verba.comportamento_reflexo) {
      // Reflexa: usar comportamento especial
      base = base.plus(calcularBaseReflexo(verba, competencia, ocorrenciasBase, ctx));
    } else {
      // Principal: soma mensal simples
      const ocBase = ocorrenciasBase.find(o => o.competencia === competencia);
      if (ocBase) {
        // Usar "devido" ou "diferença" conforme config da verba base
        const verbaBase = ctx.todasVerbas.find(v => v.id === verbaBaseId);
        const useVal = verbaBase?.gerar_verba_principal === 'diferenca'
          ? ocBase.diferenca
          : ocBase.devido;
        
        let val = new Decimal(useVal);
        
        // Integralizar (converter proporcional -> mensal) se necessário
        if (verba.base_calculo.integralizar && ocBase.quantidade > 0) {
          const info = diasTrabalhadosNoMes(competencia, ctx.parametros.data_admissao, ctx.parametros.data_demissao);
          if (info.dias < info.totalDiasMes && info.dias > 0) {
            val = val.times(info.totalDiasMes).div(info.dias);
          }
        }
        
        base = base.plus(val);
      }
    }
  }
  
  // 3. Maior/última remuneração (se configurado)
  // Implementado via históricos
  
  return base.toDecimalPlaces(2).toNumber();
}

// ---- CÁLCULO DA BASE PARA REFLEXOS ----

function calcularBaseReflexo(
  verba: VerbaPjeCalc,
  competencia: string,
  ocorrenciasBase: OcorrenciaVerba[],
  ctx: ContextoCalculo
): Decimal {
  const comportamento = verba.comportamento_reflexo || 'valor_mensal';
  
  switch (comportamento) {
    case 'valor_mensal': {
      // Usa o valor da mesma competência
      const oc = ocorrenciasBase.find(o => o.competencia === competencia);
      const verbaBase = ctx.todasVerbas.find(v => v.id === verba.verba_principal_id);
      const useVal = verbaBase?.gerar_verba_reflexa === 'diferenca'
        ? (oc?.diferenca || 0)
        : (oc?.devido || 0);
      return new Decimal(useVal);
    }
    
    case 'media_valor_absoluto': {
      // Média aritmética dos valores absolutos do período
      const ativos = ocorrenciasBase.filter(o => o.ativa && o.devido !== 0);
      if (ativos.length === 0) return new Decimal(0);
      const soma = ativos.reduce((acc, o) => acc.plus(Math.abs(o.devido)), new Decimal(0));
      return soma.div(ativos.length);
    }
    
    case 'media_valor_corrigido': {
      // Média dos valores corrigidos monetariamente (simplificado: mesmo que absoluto por agora)
      const ativos = ocorrenciasBase.filter(o => o.ativa && o.devido !== 0);
      if (ativos.length === 0) return new Decimal(0);
      const soma = ativos.reduce((acc, o) => acc.plus(Math.abs(o.devido)), new Decimal(0));
      return soma.div(ativos.length);
    }
    
    case 'media_quantidade': {
      // Média das quantidades × base
      const ativos = ocorrenciasBase.filter(o => o.ativa && o.quantidade > 0);
      if (ativos.length === 0) return new Decimal(0);
      const somaQtd = ativos.reduce((acc, o) => acc + o.quantidade, 0);
      const mediaQtd = somaQtd / ativos.length;
      // Usa a base do mês corrente com a quantidade média
      const oc = ocorrenciasBase.find(o => o.competencia === competencia);
      if (!oc) return new Decimal(0);
      return new Decimal(oc.valor_base).times(mediaQtd).div(oc.quantidade || 1);
    }
  }
  
  return new Decimal(0);
}

// ---- CÁLCULO DO DIVISOR ----

function calcularDivisor(
  verba: VerbaPjeCalc,
  competencia: string,
  ctx: ContextoCalculo
): number {
  switch (verba.tipo_divisor) {
    case 'informado':
      return verba.divisor_informado || 30;
    
    case 'carga_horaria': {
      // Verificar exceções de carga horária
      const [ano, mes] = competencia.split('-').map(Number);
      const compDate = new Date(ano, mes - 1, 15); // meio do mês
      
      for (const exc of ctx.parametros.excecoes_carga_horaria) {
        const excInicio = new Date(exc.inicio + 'T00:00:00');
        const excFim = new Date(exc.fim + 'T00:00:00');
        if (compDate >= excInicio && compDate <= excFim) {
          return exc.carga;
        }
      }
      return ctx.parametros.carga_horaria_padrao;
    }
    
    case 'dias_uteis':
      return diasUteisNoMes(competencia, ctx.parametros.sabado_dia_util, ctx.feriados);
    
    case 'cartao_ponto':
      // TODO: implementar importação de cartão de ponto
      return 1;
    
    default:
      return 30;
  }
}

// ---- CÁLCULO DA QUANTIDADE ----

function calcularQuantidade(
  verba: VerbaPjeCalc,
  competencia: string,
  infoMes: { dias: number; totalDiasMes: number },
  diasEfetivos: number,
  ctx: ContextoCalculo
): number {
  switch (verba.tipo_quantidade) {
    case 'informada':
      let qtd = verba.quantidade_informada || 0;
      // Proporcionalizar em meses incompletos
      if (verba.quantidade_proporcionalizar && infoMes.dias < infoMes.totalDiasMes) {
        qtd = qtd * infoMes.dias / infoMes.totalDiasMes;
      }
      return qtd;
    
    case 'avos':
      return calcularAvos(
        competencia,
        ctx.parametros.data_admissao,
        ctx.parametros.data_demissao,
        verba.caracteristica === 'ferias' ? 'ferias' : '13_salario'
      );
    
    case 'apurada': {
      // Aviso prévio: calculado pela Lei 12.506/2011
      if (verba.caracteristica === 'aviso_previo') {
        const admissao = new Date(ctx.parametros.data_admissao + 'T00:00:00');
        const demissao = ctx.parametros.data_demissao
          ? new Date(ctx.parametros.data_demissao + 'T00:00:00')
          : new Date();
        const anosServico = Math.floor(
          (demissao.getTime() - admissao.getTime()) / (365.25 * 86400000)
        );
        // 30 dias + 3 por ano, máximo 90
        return Math.min(90, 30 + Math.max(0, anosServico) * 3);
      }
      return diasEfetivos;
    }
    
    case 'calendario': {
      const tipo = verba.quantidade_calendario_tipo || 'dias_uteis';
      switch (tipo) {
        case 'dias_uteis':
          return diasUteisNoMes(competencia, ctx.parametros.sabado_dia_util, ctx.feriados);
        case 'repousos':
          return repousosNoMes(competencia, ctx.parametros.sabado_dia_util, ctx.feriados);
        case 'feriados_pontos':
          // Contar feriados no mês
          const [a, m] = competencia.split('-').map(Number);
          return ctx.feriados.filter(f => {
            const d = new Date(f);
            return d.getFullYear() === a && d.getMonth() === m - 1;
          }).length;
        case 'repousos_feriados_pontos':
          return repousosNoMes(competencia, ctx.parametros.sabado_dia_util, ctx.feriados);
        default:
          return 0;
      }
    }
    
    case 'cartao_ponto':
      // TODO: implementar
      return 0;
    
    default:
      return 1;
  }
}

// ---- CALCULAR TODAS AS VERBAS ----

/**
 * Calcula todas as verbas na ordem correta:
 * 1. Verbas Principais (na ordem definida pelo usuário)
 * 2. Verbas Reflexas (após suas respectivas principais)
 */
export function calcularTodasVerbas(
  verbas: VerbaPjeCalc[],
  ctx: ContextoCalculo
): ResultadoVerba[] {
  const resultados: ResultadoVerba[] = [];
  ctx.resultadosVerbas = new Map();
  
  // Separar principais e reflexas
  const principais = verbas
    .filter(v => v.tipo === 'principal')
    .sort((a, b) => a.ordem - b.ordem);
  
  const reflexas = verbas
    .filter(v => v.tipo === 'reflexa')
    .sort((a, b) => a.ordem - b.ordem);
  
  // 1. Calcular principais primeiro
  for (const verba of principais) {
    const ocorrencias = gerarOcorrencias(verba, ctx);
    ctx.resultadosVerbas.set(verba.id, ocorrencias);
    
    const ativas = ocorrencias.filter(o => o.ativa);
    const totalDevido = ativas.reduce((s, o) => s + o.devido, 0);
    const totalPago = ativas.reduce((s, o) => s + o.pago, 0);
    
    resultados.push({
      verba_id: verba.id,
      verba_nome: verba.nome,
      tipo: 'principal',
      caracteristica: verba.caracteristica,
      total_devido: Number(totalDevido.toFixed(2)),
      total_pago: Number(totalPago.toFixed(2)),
      total_diferenca: Number((totalDevido - totalPago).toFixed(2)),
      ocorrencias,
      compoe_principal: verba.compor_principal,
      incidencias: verba.incidencias,
    });
  }
  
  // 2. Calcular reflexas (dependem das principais)
  for (const verba of reflexas) {
    const ocorrencias = gerarOcorrencias(verba, ctx);
    ctx.resultadosVerbas.set(verba.id, ocorrencias);
    
    const ativas = ocorrencias.filter(o => o.ativa);
    const totalDevido = ativas.reduce((s, o) => s + o.devido, 0);
    const totalPago = ativas.reduce((s, o) => s + o.pago, 0);
    
    resultados.push({
      verba_id: verba.id,
      verba_nome: verba.nome,
      tipo: 'reflexa',
      caracteristica: verba.caracteristica,
      total_devido: Number(totalDevido.toFixed(2)),
      total_pago: Number(totalPago.toFixed(2)),
      total_diferenca: Number((totalDevido - totalPago).toFixed(2)),
      ocorrencias,
      compoe_principal: verba.compor_principal,
      incidencias: verba.incidencias,
    });
  }
  
  return resultados;
}

// ---- RESUMO ----

export function gerarResumo(
  resultados: ResultadoVerba[],
  parametros: ParametrosCalculo
): {
  total_principal_bruto: number;
  total_principal_pago: number;
  total_principal_diferenca: number;
} {
  let bruto = 0;
  let pago = 0;
  
  for (const r of resultados) {
    if (r.compoe_principal) {
      bruto += r.total_devido;
      pago += r.total_pago;
    }
  }
  
  return {
    total_principal_bruto: Number(bruto.toFixed(2)),
    total_principal_pago: Number(pago.toFixed(2)),
    total_principal_diferenca: Number((bruto - pago).toFixed(2)),
  };
}

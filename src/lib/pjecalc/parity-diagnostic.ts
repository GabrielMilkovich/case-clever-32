/**
 * ═══════════════════════════════════════════════════════════════
 * COMPARADOR DE PARIDADE PJe-Calc × MRDcalc
 * Caso: Maria Madalena vs Grupo Casas Bahia S.A.
 * Processo: 1001211-76.2025.5.02.0461
 * ═══════════════════════════════════════════════════════════════
 *
 * Este módulo compara rubrica por rubrica o resultado do PJe-Calc
 * (ground truth) com o resultado do MRDcalc e aponta a causa
 * provável de cada divergência.
 */

export interface ParityLine {
  rubrica: string;
  tipo: 'PRINCIPAL' | 'REFLEXO' | 'FGTS' | 'MULTA_FGTS';
  pje_corrigido: number;
  pje_juros: number;
  pje_total: number;
  mrd_corrigido: number;
  mrd_juros: number;
  mrd_total: number;
  delta_corrigido: number;
  delta_juros: number;
  delta_total: number;
  pct_corrigido: number;
  pct_juros: number;
  pct_total: number;
  causa_provavel: string[];
}

export interface ParityReport {
  caso: string;
  data_analise: string;
  linhas: ParityLine[];
  resumo: {
    pje_bruto: number;
    mrd_bruto: number;
    delta_bruto: number;
    pje_liquido: number;
    mrd_liquido: number;
    delta_liquido: number;
    pje_total_reclamado: number;
    mrd_total_reclamado: number;
    delta_total_reclamado: number;
  };
  diagnostico: string[];
  root_causes: RootCause[];
}

export interface RootCause {
  id: string;
  severidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  descricao: string;
  impacto_estimado: string;
  correcao: string;
  modulos_afetados: string[];
}

// ═══ PJe-Calc Ground Truth (extraído do PDF/PJC) ═══
const PJE_VERBAS = [
  { rubrica: 'COMISSÕES ESTORNADAS', tipo: 'PRINCIPAL' as const, corrigido: 659.98, juros: 250.43, total: 910.41 },
  { rubrica: '13º SALÁRIO SOBRE COMISSÕES ESTORNADAS', tipo: 'REFLEXO' as const, corrigido: 56.03, juros: 21.22, total: 77.25 },
  { rubrica: 'AVISO PRÉVIO SOBRE COMISSÕES ESTORNADAS', tipo: 'REFLEXO' as const, corrigido: 34.01, juros: 13.83, total: 47.84 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE COMISSÕES ESTORNADAS', tipo: 'REFLEXO' as const, corrigido: 104.78, juros: 41.10, total: 145.88 },
  { rubrica: 'RSR SOBRE COMISSÕES ESTORNADAS', tipo: 'REFLEXO' as const, corrigido: 132.01, juros: 50.09, total: 182.10 },

  { rubrica: 'VENDAS A PRAZO', tipo: 'PRINCIPAL' as const, corrigido: 4310.33, juros: 1640.01, total: 5950.34 },
  { rubrica: '13º SALÁRIO SOBRE VENDAS A PRAZO', tipo: 'REFLEXO' as const, corrigido: 366.05, juros: 138.85, total: 504.90 },
  { rubrica: 'AVISO PRÉVIO SOBRE VENDAS A PRAZO', tipo: 'REFLEXO' as const, corrigido: 71.97, juros: 29.27, total: 101.24 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE VENDAS A PRAZO', tipo: 'REFLEXO' as const, corrigido: 623.82, juros: 240.90, total: 864.72 },
  { rubrica: 'RSR SOBRE VENDAS A PRAZO', tipo: 'REFLEXO' as const, corrigido: 877.60, juros: 334.11, total: 1211.71 },

  { rubrica: 'PRÊMIO ESTÍMULO', tipo: 'PRINCIPAL' as const, corrigido: 2639.05, juros: 1016.81, total: 3655.86 },
  { rubrica: '13º SALÁRIO SOBRE PRÊMIO ESTÍMULO', tipo: 'REFLEXO' as const, corrigido: 223.06, juros: 85.00, total: 308.06 },
  { rubrica: 'AVISO PRÉVIO SOBRE PRÊMIO ESTÍMULO', tipo: 'REFLEXO' as const, corrigido: 42.39, juros: 17.24, total: 59.63 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE PRÊMIO ESTÍMULO', tipo: 'REFLEXO' as const, corrigido: 363.78, juros: 141.01, total: 504.79 },
  { rubrica: 'RSR SOBRE PRÊMIO ESTÍMULO', tipo: 'REFLEXO' as const, corrigido: 566.55, juros: 218.79, total: 785.34 },

  { rubrica: 'ARTIGO 384 DA CLT', tipo: 'PRINCIPAL' as const, corrigido: 94.99, juros: 36.31, total: 131.30 },
  { rubrica: '13º SALÁRIO SOBRE ARTIGO 384', tipo: 'REFLEXO' as const, corrigido: 7.12, juros: 2.71, total: 9.83 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE ARTIGO 384', tipo: 'REFLEXO' as const, corrigido: 9.64, juros: 3.66, total: 13.30 },
  { rubrica: 'RSR SOBRE ARTIGO 384', tipo: 'REFLEXO' as const, corrigido: 19.50, juros: 7.44, total: 26.94 },

  { rubrica: 'DOMINGOS E FERIADOS', tipo: 'PRINCIPAL' as const, corrigido: 7194.16, juros: 2731.45, total: 9925.61 },
  { rubrica: '13º SALÁRIO SOBRE DOMINGOS E FERIADOS', tipo: 'REFLEXO' as const, corrigido: 596.01, juros: 225.82, total: 821.83 },
  { rubrica: 'AVISO PRÉVIO SOBRE DOMINGOS E FERIADOS', tipo: 'REFLEXO' as const, corrigido: 77.08, juros: 31.34, total: 108.42 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE DOMINGOS E FERIADOS', tipo: 'REFLEXO' as const, corrigido: 903.94, juros: 348.67, total: 1252.61 },

  { rubrica: 'HORAS EXTRAS', tipo: 'PRINCIPAL' as const, corrigido: 5662.99, juros: 2150.11, total: 7813.10 },
  { rubrica: '13º SALÁRIO SOBRE HORAS EXTRAS', tipo: 'REFLEXO' as const, corrigido: 469.37, juros: 177.85, total: 647.22 },
  { rubrica: 'AVISO PRÉVIO SOBRE HORAS EXTRAS', tipo: 'REFLEXO' as const, corrigido: 57.70, juros: 23.46, total: 81.16 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS', tipo: 'REFLEXO' as const, corrigido: 709.39, juros: 273.54, total: 982.93 },
  { rubrica: 'RSR SOBRE HORAS EXTRAS', tipo: 'REFLEXO' as const, corrigido: 1178.42, juros: 447.46, total: 1625.88 },

  { rubrica: 'INTERVALO INTERJORNADAS', tipo: 'PRINCIPAL' as const, corrigido: 815.63, juros: 309.19, total: 1124.82 },
  { rubrica: '13º SALÁRIO SOBRE INTERJORNADAS', tipo: 'REFLEXO' as const, corrigido: 10.92, juros: 4.15, total: 15.07 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE INTERJORNADAS', tipo: 'REFLEXO' as const, corrigido: 3.42, juros: 1.30, total: 4.72 },
  { rubrica: 'RSR SOBRE INTERJORNADAS', tipo: 'REFLEXO' as const, corrigido: 26.78, juros: 10.22, total: 37.00 },

  { rubrica: 'RSR COMISSIONISTA', tipo: 'PRINCIPAL' as const, corrigido: 2875.10, juros: 1092.95, total: 3968.05 },
  { rubrica: '13º SALÁRIO SOBRE RSR COMISSIONISTA', tipo: 'REFLEXO' as const, corrigido: 235.26, juros: 89.21, total: 324.47 },
  { rubrica: 'AVISO PRÉVIO SOBRE RSR COMISSIONISTA', tipo: 'REFLEXO' as const, corrigido: 7.57, juros: 3.08, total: 10.65 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE RSR COMISSIONISTA', tipo: 'REFLEXO' as const, corrigido: 347.71, juros: 133.01, total: 480.72 },

  { rubrica: 'FGTS 8%', tipo: 'FGTS' as const, corrigido: 1940.79, juros: 791.72, total: 2732.51 },
  { rubrica: 'MULTA SOBRE FGTS 40%', tipo: 'MULTA_FGTS' as const, corrigido: 776.07, juros: 315.58, total: 1091.65 },
];

// ═══ MRDcalc Current Values (from latest HTML report) ═══
const MRD_VERBAS = [
  { rubrica: 'COMISSÕES ESTORNADAS', tipo: 'PRINCIPAL' as const, corrigido: 597.44, juros: 502.14, total: 1099.62 },
  { rubrica: 'RSR E FERIADO SOBRE COMISSÕES ESTORNADAS', tipo: 'REFLEXO' as const, corrigido: 22.74, juros: 19.09, total: 41.83 },
  { rubrica: '13º SALÁRIO SOBRE COMISSÕES ESTORNADAS', tipo: 'REFLEXO' as const, corrigido: 49.87, juros: 41.87, total: 91.76 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE COMISSÕES ESTORNADAS', tipo: 'REFLEXO' as const, corrigido: 66.73, juros: 56.05, total: 122.85 },
  { rubrica: 'AVISO PRÉVIO SOBRE COMISSÕES ESTORNADAS', tipo: 'REFLEXO' as const, corrigido: 49.87, juros: 41.87, total: 91.76 },

  { rubrica: 'VENDAS A PRAZO', tipo: 'PRINCIPAL' as const, corrigido: 3901.49, juros: 3279.04, total: 7180.54 },
  { rubrica: 'RSR E FERIADO SOBRE VENDAS A PRAZO', tipo: 'REFLEXO' as const, corrigido: 150.33, juros: 126.37, total: 276.61 },
  { rubrica: '13º SALÁRIO SOBRE VENDAS A PRAZO', tipo: 'REFLEXO' as const, corrigido: 325.49, juros: 273.54, total: 599.02 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE VENDAS A PRAZO', tipo: 'REFLEXO' as const, corrigido: 433.31, juros: 364.11, total: 797.37 },
  { rubrica: 'AVISO PRÉVIO SOBRE VENDAS A PRAZO', tipo: 'REFLEXO' as const, corrigido: 325.49, juros: 273.54, total: 599.02 },

  { rubrica: 'PRÊMIO ESTÍMULO', tipo: 'PRINCIPAL' as const, corrigido: 2388.40, juros: 2007.31, total: 4395.79 },
  { rubrica: 'RSR E FERIADO SOBRE PRÊMIO ESTÍMULO', tipo: 'REFLEXO' as const, corrigido: 91.65, juros: 77.03, total: 168.63 },
  { rubrica: '13º SALÁRIO SOBRE PRÊMIO ESTÍMULO', tipo: 'REFLEXO' as const, corrigido: 199.41, juros: 167.62, total: 366.99 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE PRÊMIO ESTÍMULO', tipo: 'REFLEXO' as const, corrigido: 265.35, juros: 223.03, total: 488.40 },
  { rubrica: 'AVISO PRÉVIO SOBRE PRÊMIO ESTÍMULO', tipo: 'REFLEXO' as const, corrigido: 199.41, juros: 167.62, total: 366.99 },

  { rubrica: 'ARTIGO 384 DA CLT', tipo: 'PRINCIPAL' as const, corrigido: 85.77, juros: 72.11, total: 157.90 },
  { rubrica: 'RSR E FERIADO SOBRE ARTIGO 384', tipo: 'REFLEXO' as const, corrigido: 3.69, juros: 3.09, total: 6.74 },
  { rubrica: '13º SALÁRIO SOBRE ARTIGO 384', tipo: 'REFLEXO' as const, corrigido: 7.34, juros: 6.15, total: 13.48 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE ARTIGO 384', tipo: 'REFLEXO' as const, corrigido: 9.54, juros: 8.01, total: 17.53 },

  { rubrica: 'DOMINGOS E FERIADOS', tipo: 'PRINCIPAL' as const, corrigido: 6511.34, juros: 5472.43, total: 11983.75 },
  { rubrica: '13º SALÁRIO SOBRE DOMINGOS E FERIADOS', tipo: 'REFLEXO' as const, corrigido: 542.46, juros: 455.95, total: 998.41 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE DOMINGOS E FERIADOS', tipo: 'REFLEXO' as const, corrigido: 723.54, juros: 608.11, total: 1331.72 },
  { rubrica: 'AVISO PRÉVIO SOBRE DOMINGOS E FERIADOS', tipo: 'REFLEXO' as const, corrigido: 542.46, juros: 455.95, total: 998.41 },

  { rubrica: 'HORAS EXTRAS', tipo: 'PRINCIPAL' as const, corrigido: 5125.04, juros: 4307.30, total: 9432.37 },
  { rubrica: 'RSR E FERIADO SOBRE HORAS EXTRAS', tipo: 'REFLEXO' as const, corrigido: 197.19, juros: 165.74, total: 362.95 },
  { rubrica: '13º SALÁRIO SOBRE HORAS EXTRAS', tipo: 'REFLEXO' as const, corrigido: 427.40, juros: 359.21, total: 786.58 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE HORAS EXTRAS', tipo: 'REFLEXO' as const, corrigido: 569.63, juros: 478.70, total: 1048.35 },
  { rubrica: 'AVISO PRÉVIO SOBRE HORAS EXTRAS', tipo: 'REFLEXO' as const, corrigido: 427.40, juros: 359.21, total: 786.58 },

  { rubrica: 'INTERVALO INTERJORNADAS', tipo: 'PRINCIPAL' as const, corrigido: 738.21, juros: 620.42, total: 1358.64 },
  { rubrica: 'RSR E FERIADO SOBRE INTERJORNADAS', tipo: 'REFLEXO' as const, corrigido: 28.61, juros: 24.04, total: 52.63 },
  { rubrica: '13º SALÁRIO SOBRE INTERJORNADAS', tipo: 'REFLEXO' as const, corrigido: 61.57, juros: 51.75, total: 113.32 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE INTERJORNADAS', tipo: 'REFLEXO' as const, corrigido: 82.13, juros: 69.01, total: 151.12 },

  { rubrica: 'RSR COMISSIONISTA', tipo: 'PRINCIPAL' as const, corrigido: 2601.75, juros: 2186.64, total: 4788.38 },
  { rubrica: '13º SALÁRIO SOBRE RSR COMISSIONISTA', tipo: 'REFLEXO' as const, corrigido: 217.00, juros: 182.40, total: 399.33 },
  { rubrica: 'FÉRIAS + 1/3 SOBRE RSR COMISSIONISTA', tipo: 'REFLEXO' as const, corrigido: 288.87, juros: 242.79, total: 531.57 },
  { rubrica: 'AVISO PRÉVIO SOBRE RSR COMISSIONISTA', tipo: 'REFLEXO' as const, corrigido: 217.00, juros: 182.40, total: 399.33 },

  // FGTS and MULTA missing from MRDcalc report
];

/**
 * Generates the full parity diagnostic report
 */
export function gerarDiagnosticoParidade(): ParityReport {
  const linhas: ParityLine[] = [];

  // Match PJe verbas with MRDcalc verbas by normalized name
  const normalize = (s: string) => s.toUpperCase()
    .replace(/REPOUSO SEMANAL REMUNERADO E FERIADO/g, 'RSR')
    .replace(/RSR E FERIADO/g, 'RSR')
    .replace(/\(COMISSIONISTA\)/g, 'COMISSIONISTA')
    .replace(/ DA CLT/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const pje of PJE_VERBAS) {
    const pjeNorm = normalize(pje.rubrica);
    const mrd = MRD_VERBAS.find(m => {
      const mNorm = normalize(m.rubrica);
      return mNorm === pjeNorm || mNorm.includes(pjeNorm) || pjeNorm.includes(mNorm);
    });

    const mrdCorr = mrd?.corrigido ?? 0;
    const mrdJuros = mrd?.juros ?? 0;
    const mrdTotal = mrd?.total ?? 0;

    const deltaCorr = mrdCorr - pje.corrigido;
    const deltaJuros = mrdJuros - pje.juros;
    const deltaTotal = mrdTotal - pje.total;

    const causas: string[] = [];

    // Diagnose causes
    if (!mrd) {
      causas.push('RUBRICA AUSENTE NO MRDCALC');
    } else {
      const pctCorr = pje.corrigido > 0 ? (deltaCorr / pje.corrigido) * 100 : 0;
      const pctJuros = pje.juros > 0 ? (deltaJuros / pje.juros) * 100 : 0;

      if (Math.abs(pctCorr) > 5) {
        if (pctCorr < 0) causas.push('ÍNDICE CORREÇÃO BAIXO (sem séries históricas reais no DB → fallback com taxas aprox.)');
        else causas.push('ÍNDICE CORREÇÃO ALTO');
      }
      if (Math.abs(pctJuros) > 20) {
        if (pctJuros > 0) causas.push('JUROS INFLADOS (~2x: fallback TRD/SELIC/Taxa Legal usando taxas fixas em vez de séries reais)');
        else causas.push('JUROS INSUFICIENTES');
      }
      if (Math.abs(deltaCorr) > 1 && Math.abs(deltaJuros) < 1) {
        causas.push('DIFERENÇA NOMINAL (base/quantidade/divisor da verba)');
      }
    }

    linhas.push({
      rubrica: pje.rubrica,
      tipo: pje.tipo,
      pje_corrigido: pje.corrigido,
      pje_juros: pje.juros,
      pje_total: pje.total,
      mrd_corrigido: mrdCorr,
      mrd_juros: mrdJuros,
      mrd_total: mrdTotal,
      delta_corrigido: Number(deltaCorr.toFixed(2)),
      delta_juros: Number(deltaJuros.toFixed(2)),
      delta_total: Number(deltaTotal.toFixed(2)),
      pct_corrigido: pje.corrigido > 0 ? Number(((deltaCorr / pje.corrigido) * 100).toFixed(1)) : 0,
      pct_juros: pje.juros > 0 ? Number(((deltaJuros / pje.juros) * 100).toFixed(1)) : 0,
      pct_total: pje.total > 0 ? Number(((deltaTotal / pje.total) * 100).toFixed(1)) : 0,
      causa_provavel: causas,
    });
  }

  const pjeBruto = 48539.86;
  const mrdBruto = 52406.27;
  const pjeLiquido = 46426.51;
  const mrdLiquido = 52406.56; // BUG: > bruto
  const pjeTotalReclamado = 63731.39;
  const mrdTotalReclamado = 61315.67;

  const root_causes: RootCause[] = [
    {
      id: 'RC1',
      severidade: 'CRITICA',
      descricao: 'Sem séries históricas de índices (IPCA-E, IPCA, SELIC, TRD, Taxa Legal) no banco de dados',
      impacto_estimado: 'Valor corrigido ~9.5% abaixo do PJe em TODAS as rubricas. O engine cai no fallback com taxas fixas aproximadas (0.45%/mês IPCA-E, 1%/mês SELIC) em vez de usar os fatores acumulados reais.',
      correcao: 'Popular tabela index_series com séries históricas oficiais do BCB/IBGE para IPCA-E, IPCA, SELIC, TRD e Taxa Legal, cobrindo 2016-01 até 2025-10.',
      modulos_afetados: ['engine.ts:aplicarCorrecaoCombinacao', 'engine.ts:getIndiceCorrecaoDB', 'correction-by-date.ts'],
    },
    {
      id: 'RC2',
      severidade: 'CRITICA',
      descricao: 'Juros calculados com taxas de fallback incorretas (~2x o valor correto)',
      impacto_estimado: 'Total de juros R$ 23.931,64 no MRDcalc vs R$ 13.448,89 no PJe (78% acima). O fallback aplica TRD=1%/mês e SELIC=1%/mês, quando as taxas reais são muito menores.',
      correcao: 'Mesmo fix de RC1: popular index_series. Adicionalmente, verificar que o cálculo por faixas usa as taxas corretas (TRD simples ~0.01-0.03%/mês, SELIC mensal real ~0.8-1.1%/mês, Taxa Legal ~0.8%/mês).',
      modulos_afetados: ['engine.ts:aplicarCorrecaoCombinacao', 'engine.ts:mesesEntre'],
    },
    {
      id: 'RC3',
      severidade: 'CRITICA',
      descricao: 'FGTS (8% + Multa 40%) ausente do resumo do relatório',
      impacto_estimado: 'PJe inclui FGTS 8% = R$ 2.732,51 e Multa 40% = R$ 1.091,65 no bruto. MRDcalc não materializa estas linhas no relatório, apesar de ter a lógica implementada.',
      correcao: 'Verificar que pjecalc_fgts_config tem habilitado=true e que o engine retorna fgts.total_fgts > 0. O relatório já tem lógica para exibir FGTS quando total > 0.',
      modulos_afetados: ['seed-golden-maria-madalena.ts', 'orchestrator.ts:toEngineFgtsConfig', 'pdf-report-completo.ts'],
    },
    {
      id: 'RC4',
      severidade: 'CRITICA',
      descricao: 'Contribuição Social do reclamante não deduzida no fechamento',
      impacto_estimado: 'PJe deduz R$ 2.113,35 do reclamante e cobra R$ 12.450,89 do reclamado. MRDcalc mostra descontos = R$ 0,00.',
      correcao: 'Verificar que pjecalc_cs_config tem habilitado=true, cobrar_reclamante=true e aliquota_empresa=20%. Garantir que o engine retorna cs.total_segurado > 0.',
      modulos_afetados: ['seed-golden-maria-madalena.ts', 'orchestrator.ts:toEngineCsConfig', 'engine.ts:calcularCS'],
    },
    {
      id: 'RC5',
      severidade: 'ALTA',
      descricao: 'Bug: Líquido (R$ 52.406,56) > Bruto (R$ 52.406,27) com descontos = 0',
      impacto_estimado: 'Matematicamente impossível. Erro de acumulação floating-point na soma do relatório vs engine.',
      correcao: 'Na pdf-report-completo.ts, calcular grandTotalFinal usando Decimal.js em vez de reduce com float. Ou usar result.resumo.liquido_reclamante diretamente.',
      modulos_afetados: ['pdf-report-completo.ts:buildRelatorioCompletoHTML'],
    },
    {
      id: 'RC6',
      severidade: 'ALTA',
      descricao: 'Parâmetros divergentes do PJe: projetar_aviso_indenizado=false (PJe=true), considerar_feriado_estadual=false (PJe=true)',
      impacto_estimado: 'Afeta cálculo de avos de 13º/férias e contagem de dias úteis/feriados por competência.',
      correcao: 'Na seed e no orchestrator:toEngineParams, garantir que projetar_aviso_indenizado e considerar_feriado_estadual recebem o valor correto do banco.',
      modulos_afetados: ['orchestrator.ts:toEngineParams', 'seed-golden-maria-madalena.ts'],
    },
    {
      id: 'RC7',
      severidade: 'ALTA',
      descricao: 'Honorários calculados como 15% sobre bruto (R$ 7.860,98) em vez do valor real do PJe (R$ 4.853,99)',
      impacto_estimado: 'O PJe usa 10% sobre condenação (bruto - INSS + FGTS). O seed insere percentual=10 mas o orchestrator pode estar usando 15% default.',
      correcao: 'Verificar orchestrator:toEngineHonorariosConfig e a leitura da tabela pjecalc_honorarios.',
      modulos_afetados: ['orchestrator.ts:toEngineHonorariosConfig', 'engine.ts:calcularHonorarios'],
    },
    {
      id: 'RC8',
      severidade: 'MEDIA',
      descricao: 'Custas = R$ 1.048,13 no MRDcalc, mas PJe tem custas = R$ 0,00',
      impacto_estimado: 'O PJe não calcula custas neste caso. O seed insere custas com 2%, mas deveria respeitar o PJe.',
      correcao: 'Ajustar seed para não inserir custas quando o PJe não as calcula, ou marcar como isento.',
      modulos_afetados: ['seed-golden-maria-madalena.ts'],
    },
    {
      id: 'RC9',
      severidade: 'MEDIA',
      descricao: 'Reflexos gerados com fórmula simplificada (divisor fixo /12, /26) em vez de MEDIA_PELA_QUANTIDADE real do PJC',
      impacto_estimado: 'Os valores de 13º, férias, aviso prévio e RSR divergem do PJe porque usam regra genérica em vez da sistemática real do caso.',
      correcao: 'Implementar comportamento MEDIA_PELA_QUANTIDADE com agrupamento por ANO_CIVIL (13º) e PERIODO_AQUISITIVO (férias), conforme extraído do PJC XML.',
      modulos_afetados: ['engine.ts:calcularVerbaReflexa', 'reflexo-engine.ts', 'seed-golden-maria-madalena.ts'],
    },
  ];

  return {
    caso: 'Maria Madalena vs Grupo Casas Bahia S.A. (1001211-76.2025.5.02.0461)',
    data_analise: new Date().toISOString(),
    linhas,
    resumo: {
      pje_bruto: pjeBruto,
      mrd_bruto: mrdBruto,
      delta_bruto: Number((mrdBruto - pjeBruto).toFixed(2)),
      pje_liquido: pjeLiquido,
      mrd_liquido: mrdLiquido,
      delta_liquido: Number((mrdLiquido - pjeLiquido).toFixed(2)),
      pje_total_reclamado: pjeTotalReclamado,
      mrd_total_reclamado: mrdTotalReclamado,
      delta_total_reclamado: Number((mrdTotalReclamado - pjeTotalReclamado).toFixed(2)),
    },
    diagnostico: [
      '1. VALOR CORRIGIDO: MRDcalc ~9.5% abaixo do PJe em TODAS as 8 verbas principais → CAUSA: sem index_series no DB, engine usa fallback com taxas fixas',
      '2. JUROS: MRDcalc ~78% acima do PJe → CAUSA: fallback TRD/SELIC/Taxa Legal com taxas fixas muito altas',
      '3. FGTS AUSENTE: PJe inclui FGTS 8% (R$ 2.732,51) + Multa 40% (R$ 1.091,65) → CAUSA: config FGTS não materializada',
      '4. INSS AUSENTE: PJe deduz R$ 2.113,35 do reclamante → CAUSA: config CS não materializada',
      '5. CS PATRONAL AUSENTE: PJe cobra R$ 12.450,89 do reclamado → CAUSA: mesma que item 4',
      '6. BUG LÍQUIDO > BRUTO: R$ 52.406,56 > R$ 52.406,27 → CAUSA: floating-point accumulation na soma do relatório',
      '7. PARÂMETROS ERRADOS: projetar_aviso=false (PJe=true), feriados_estaduais=false (PJe=true)',
      '8. HONORÁRIOS ERRADOS: R$ 7.860,98 vs PJe R$ 4.853,99 → CAUSA: percentual ou base de cálculo divergente',
      '9. CUSTAS INDEVIDAS: R$ 1.048,13 vs PJe R$ 0,00 → CAUSA: seed insere custas que PJe não calcula',
      '10. REFLEXOS SIMPLIFICADOS: divisores fixos /12 e /26 vs MEDIA_PELA_QUANTIDADE real do PJC',
    ],
    root_causes,
  };
}

/**
 * Imprime o diagnóstico no console para depuração
 */
export function imprimirDiagnostico(): void {
  const report = gerarDiagnosticoParidade();

  console.log('═══════════════════════════════════════════════════════');
  console.log('COMPARADOR DE PARIDADE PJe-Calc × MRDcalc');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Caso: ${report.caso}`);
  console.log(`Data: ${report.data_analise}`);
  console.log('');

  console.log('── RESUMO CONSOLIDADO ──');
  console.log(`Bruto:          PJe R$ ${report.resumo.pje_bruto.toFixed(2)} | MRD R$ ${report.resumo.mrd_bruto.toFixed(2)} | Δ R$ ${report.resumo.delta_bruto.toFixed(2)}`);
  console.log(`Líquido:        PJe R$ ${report.resumo.pje_liquido.toFixed(2)} | MRD R$ ${report.resumo.mrd_liquido.toFixed(2)} | Δ R$ ${report.resumo.delta_liquido.toFixed(2)}`);
  console.log(`Total Reclamado: PJe R$ ${report.resumo.pje_total_reclamado.toFixed(2)} | MRD R$ ${report.resumo.mrd_total_reclamado.toFixed(2)} | Δ R$ ${report.resumo.delta_total_reclamado.toFixed(2)}`);
  console.log('');

  console.log('── ROOT CAUSES ──');
  for (const rc of report.root_causes) {
    console.log(`[${rc.id}] ${rc.severidade}: ${rc.descricao}`);
    console.log(`   Impacto: ${rc.impacto_estimado}`);
    console.log(`   Correção: ${rc.correcao}`);
    console.log('');
  }

  console.log('── DIAGNÓSTICO ──');
  for (const d of report.diagnostico) {
    console.log(d);
  }
}

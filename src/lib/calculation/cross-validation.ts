// =====================================================
// VALIDAÇÃO CRUZADA DE FATOS — CROSS-REFERENCE ENGINE
// =====================================================
// Detecta inconsistências entre fatos extraídos de diferentes
// documentos, usando regras baseadas em códigos oficiais
// (eSocial, CEF/FGTS, INSS) para corrigir ou alertar.

import { FactMap, Warning } from './types';

// =====================================================
// CÓDIGOS DE MOVIMENTAÇÃO FGTS / eSocial
// Fonte: Manual de Orientações Recolhimentos FGTS (CEF)
// https://www.fgts.gov.br/
// =====================================================
export const FGTS_MOVEMENT_CODES: Record<string, {
  tipo_demissao: string;
  descricao: string;
  multa_fgts: number; // 0, 0.20 ou 0.40
  aviso_previo: boolean;
  ferias_proporcionais: boolean;
  decimo_terceiro: boolean;
}> = {
  // Iniciativa do Empregador
  'I1': {
    tipo_demissao: 'sem_justa_causa',
    descricao: 'Rescisão sem Justa Causa — por iniciativa do empregador',
    multa_fgts: 0.40,
    aviso_previo: true,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },
  'I2': {
    tipo_demissao: 'justa_causa',
    descricao: 'Rescisão por Justa Causa — por iniciativa do empregador',
    multa_fgts: 0,
    aviso_previo: false,
    ferias_proporcionais: false,
    decimo_terceiro: false,
  },
  'I3': {
    tipo_demissao: 'sem_justa_causa',
    descricao: 'Rescisão antecipada de contrato a termo — por iniciativa do empregador',
    multa_fgts: 0.40,
    aviso_previo: false,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },
  'I4': {
    tipo_demissao: 'sem_justa_causa',
    descricao: 'Rescisão sem Justa Causa — durante período de experiência',
    multa_fgts: 0.40,
    aviso_previo: true,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },

  // Iniciativa do Empregado
  'J': {
    tipo_demissao: 'pedido_demissao',
    descricao: 'Pedido de Demissão — por iniciativa do empregado',
    multa_fgts: 0,
    aviso_previo: false,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },
  'J1': {
    tipo_demissao: 'pedido_demissao',
    descricao: 'Rescisão antecipada de contrato a termo — por iniciativa do empregado',
    multa_fgts: 0,
    aviso_previo: false,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },

  // Rescisão Indireta
  'K': {
    tipo_demissao: 'rescisao_indireta',
    descricao: 'Rescisão Indireta — falta grave do empregador (Art. 483 CLT)',
    multa_fgts: 0.40,
    aviso_previo: true,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },

  // Acordo Mútuo (Reforma Trabalhista)
  'I5': {
    tipo_demissao: 'acordo',
    descricao: 'Rescisão por Acordo Mútuo (Art. 484-A CLT)',
    multa_fgts: 0.20,
    aviso_previo: true, // 50%
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },

  // Término de contrato
  'L': {
    tipo_demissao: 'termino_contrato',
    descricao: 'Término normal de contrato a termo',
    multa_fgts: 0,
    aviso_previo: false,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },

  // Falecimento
  'M': {
    tipo_demissao: 'falecimento',
    descricao: 'Rescisão por falecimento do empregado',
    multa_fgts: 0,
    aviso_previo: false,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },

  // Culpa recíproca
  'N1': {
    tipo_demissao: 'culpa_reciproca',
    descricao: 'Rescisão por culpa recíproca',
    multa_fgts: 0.20,
    aviso_previo: false,
    ferias_proporcionais: true,
    decimo_terceiro: true,
  },
};

// =====================================================
// INTERFACE DE RESULTADO DA VALIDAÇÃO CRUZADA
// =====================================================
export interface CrossValidationResult {
  /** Fatos que devem ser corrigidos automaticamente */
  corrections: CrossValidationCorrection[];
  /** Alertas de inconsistência para revisão humana */
  alerts: CrossValidationAlert[];
  /** Warnings para injetar no engine */
  warnings: Warning[];
}

export interface CrossValidationCorrection {
  campo: string;
  valor_original: string;
  valor_corrigido: string;
  motivo: string;
  fonte: string;
  confianca: number;
}

export interface CrossValidationAlert {
  tipo: 'conflito_documentos' | 'codigo_fgts_divergente' | 'dado_inconsistente';
  severidade: 'critica' | 'alta' | 'media';
  titulo: string;
  descricao: string;
  campo_afetado: string;
  valor_documento_a: string;
  valor_documento_b: string;
  recomendacao: string;
}

// =====================================================
// EXTRAIR CÓDIGO DE MOVIMENTAÇÃO DO EXTRATO FGTS
// =====================================================
function extractFGTSCode(facts: FactMap): string | null {
  // Procurar em vários campos possíveis
  const possibleKeys = [
    'codigo_afastamento_fgts',
    'codigo_movimentacao_fgts',
    'codigo_afastamento',
    'codigo_movimentacao',
    'cod_afastamento',
    'cod_movimentacao',
  ];

  for (const key of possibleKeys) {
    if (facts[key]) {
      const val = String(facts[key].valor).trim().toUpperCase();
      if (FGTS_MOVEMENT_CODES[val]) return val;
    }
  }

  // Tentar extrair de campos compostos (ex: "01/02/2025-J")
  for (const [key, fact] of Object.entries(facts)) {
    const val = String(fact.valor);
    // Padrão: data seguida de hífen e código (DD/MM/YYYY-X ou YYYY-MM-DD-X)
    const match = val.match(/\d{2}\/\d{2}\/\d{4}-([A-Z]\d?)/i) ||
                  val.match(/\d{4}-\d{2}-\d{2}-([A-Z]\d?)/i) ||
                  val.match(/código\s*(?:de\s*)?(?:afastamento|movimentação)\s*[:\-]?\s*([A-Z]\d?)/i);
    if (match) {
      const code = match[1].toUpperCase();
      if (FGTS_MOVEMENT_CODES[code]) return code;
    }
  }

  return null;
}

// =====================================================
// VALIDAÇÃO CRUZADA PRINCIPAL
// =====================================================
export function runCrossValidation(facts: FactMap): CrossValidationResult {
  const corrections: CrossValidationCorrection[] = [];
  const alerts: CrossValidationAlert[] = [];
  const warnings: Warning[] = [];

  // ─── REGRA 1: CÓDIGO FGTS vs TIPO DE DEMISSÃO ───
  const fgtsCode = extractFGTSCode(facts);
  const tipoDemissaoFact = facts['tipo_demissao'] || facts['motivo_demissao'];

  if (fgtsCode && tipoDemissaoFact) {
    const fgtsInfo = FGTS_MOVEMENT_CODES[fgtsCode];
    const tipoDemissaoAtual = normalizeTipoDemissao(String(tipoDemissaoFact.valor));

    if (fgtsInfo && tipoDemissaoAtual !== fgtsInfo.tipo_demissao) {
      // CONFLITO DETECTADO!
      corrections.push({
        campo: 'tipo_demissao',
        valor_original: tipoDemissaoAtual,
        valor_corrigido: fgtsInfo.tipo_demissao,
        motivo: `O extrato FGTS registra código "${fgtsCode}" (${fgtsInfo.descricao}), que diverge do tipo de demissão extraído "${tipoDemissaoAtual}". O código FGTS é considerado fonte oficial e prevalece.`,
        fonte: `Extrato FGTS — Código de Movimentação ${fgtsCode} (CEF/eSocial)`,
        confianca: 0.95,
      });

      alerts.push({
        tipo: 'codigo_fgts_divergente',
        severidade: 'critica',
        titulo: `Tipo de Demissão Divergente — Código FGTS "${fgtsCode}"`,
        descricao: `O OCR extraiu "${formatTipoDemissao(tipoDemissaoAtual)}", mas o extrato FGTS/CEF registra código "${fgtsCode}" que corresponde a "${fgtsInfo.descricao}". O código oficial do sistema CEF/eSocial prevalece sobre a interpretação do OCR.`,
        campo_afetado: 'tipo_demissao',
        valor_documento_a: formatTipoDemissao(tipoDemissaoAtual) + ' (OCR)',
        valor_documento_b: fgtsInfo.descricao + ` (Código ${fgtsCode} — CEF)`,
        recomendacao: `Corrigir tipo de demissão para "${fgtsInfo.tipo_demissao}" conforme código oficial. Isso afeta: aviso prévio (${fgtsInfo.aviso_previo ? 'devido' : 'não devido'}), multa FGTS (${(fgtsInfo.multa_fgts * 100).toFixed(0)}%), férias proporcionais (${fgtsInfo.ferias_proporcionais ? 'devidas' : 'não devidas'}).`,
      });

      warnings.push({
        tipo: 'erro',
        codigo: 'TIPO_DEMISSAO_DIVERGENTE',
        mensagem: `ATENÇÃO: Tipo de demissão corrigido de "${formatTipoDemissao(tipoDemissaoAtual)}" para "${fgtsInfo.descricao}" com base no código FGTS "${fgtsCode}" do extrato CEF.`,
        sugestao: 'Verifique o extrato FGTS e o TRCT para confirmar o motivo da rescisão.',
      });
    }
  }

  // ─── REGRA 2: SALÁRIO BASE vs SALÁRIO MENSAL (divergência > 20%) ───
  const salBase = facts['salario_base'];
  const salMensal = facts['salario_mensal'];
  if (salBase && salMensal) {
    const vBase = parseNumber(String(salBase.valor));
    const vMensal = parseNumber(String(salMensal.valor));
    if (vBase > 0 && vMensal > 0) {
      const diff = Math.abs(vBase - vMensal) / Math.max(vBase, vMensal);
      if (diff > 0.20 && vBase !== vMensal) {
        alerts.push({
          tipo: 'dado_inconsistente',
          severidade: 'alta',
          titulo: 'Divergência entre Salário Base e Salário Mensal',
          descricao: `Salário Base (R$ ${vBase.toFixed(2)}) difere em ${(diff * 100).toFixed(0)}% do Salário Mensal (R$ ${vMensal.toFixed(2)}). Pode indicar comissões, gratificações ou erro de extração.`,
          campo_afetado: 'salario_base',
          valor_documento_a: `R$ ${vBase.toFixed(2)} (salario_base)`,
          valor_documento_b: `R$ ${vMensal.toFixed(2)} (salario_mensal)`,
          recomendacao: 'Confirme qual valor deve ser usado como base de cálculo. Se há remuneração variável, considere usar a média.',
        });
      }
    }
  }

  // ─── REGRA 3: DATAS LÓGICAS ───
  const admFact = facts['data_admissao'];
  const demFact = facts['data_demissao'];
  if (admFact && demFact) {
    const adm = new Date(String(admFact.valor));
    const dem = new Date(String(demFact.valor));
    if (!isNaN(adm.getTime()) && !isNaN(dem.getTime())) {
      if (dem < adm) {
        alerts.push({
          tipo: 'dado_inconsistente',
          severidade: 'critica',
          titulo: 'Data de Demissão anterior à Admissão',
          descricao: `Data de demissão (${dem.toLocaleDateString('pt-BR')}) é anterior à admissão (${adm.toLocaleDateString('pt-BR')}). Isso invalida o cálculo.`,
          campo_afetado: 'data_demissao',
          valor_documento_a: adm.toLocaleDateString('pt-BR'),
          valor_documento_b: dem.toLocaleDateString('pt-BR'),
          recomendacao: 'Verifique os documentos originais e corrija as datas.',
        });
      }
      // Contrato > 35 anos é suspeito
      const diffAnos = (dem.getTime() - adm.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (diffAnos > 35) {
        alerts.push({
          tipo: 'dado_inconsistente',
          severidade: 'media',
          titulo: 'Duração do contrato excepcionalmente longa',
          descricao: `Contrato de ${Math.round(diffAnos)} anos. Verifique se as datas estão corretas.`,
          campo_afetado: 'data_admissao',
          valor_documento_a: adm.toLocaleDateString('pt-BR'),
          valor_documento_b: dem.toLocaleDateString('pt-BR'),
          recomendacao: 'Confirme admissão e demissão nos documentos originais.',
        });
      }
    }
  }

  return { corrections, alerts, warnings };
}

// =====================================================
// APLICAR CORREÇÕES AO FACTMAP
// =====================================================
export function applyCorrections(facts: FactMap, corrections: CrossValidationCorrection[]): FactMap {
  const corrected = { ...facts };
  for (const c of corrections) {
    if (corrected[c.campo]) {
      corrected[c.campo] = {
        ...corrected[c.campo],
        valor: c.valor_corrigido,
        confianca: c.confianca,
      };
    }
  }
  return corrected;
}

// =====================================================
// HELPERS
// =====================================================
function parseNumber(val: string): number {
  return parseFloat(val.replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
}

function normalizeTipoDemissao(value: string): string {
  const norm = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (norm.includes('sem_justa_causa') || (norm.includes('sem') && norm.includes('justa')) || norm.includes('imotivada')) return 'sem_justa_causa';
  if (norm.includes('rescisao_indireta') || norm.includes('indireta')) return 'rescisao_indireta';
  if (norm.includes('pedido_demissao') || norm.includes('pedido')) return 'pedido_demissao';
  if (norm.includes('acordo')) return 'acordo';
  if (norm.includes('justa')) return 'justa_causa';
  return value;
}

function formatTipoDemissao(tipo: string): string {
  const labels: Record<string, string> = {
    sem_justa_causa: 'Dispensa sem Justa Causa',
    justa_causa: 'Dispensa por Justa Causa',
    pedido_demissao: 'Pedido de Demissão',
    rescisao_indireta: 'Rescisão Indireta',
    acordo: 'Acordo Mútuo (Art. 484-A CLT)',
  };
  return labels[tipo] || tipo;
}

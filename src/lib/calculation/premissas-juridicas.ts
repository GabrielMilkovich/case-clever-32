// =====================================================
// MÓDULO DE PREMISSAS JURÍDICAS
// =====================================================
// Define todas as premissas configuráveis para cálculos trabalhistas
// Nenhuma premissa pode ter valor "default silencioso"

import { z } from "zod";

// =====================================================
// SCHEMAS DE VALIDAÇÃO
// =====================================================

export const DivisorSchema = z.enum(["220", "200", "180", "150", "custom"]);
export const MetodoHESchema = z.enum(["diaria", "semanal", "hibrida"]);
export const MetodoDSRSchema = z.enum(["calendario", "fator_fixo"]);
export const MetodoMediaSchema = z.enum(["ultimos_12_meses", "periodo_imprescrito", "todo_contrato"]);
export const TipoMediaSchema = z.enum(["simples", "ponderada"]);
export const BasePericulosidadeSchema = z.enum(["salario_base", "remuneracao"]);
export const BaseInsalubridadeSchema = z.enum(["salario_minimo", "salario_base", "piso_categoria"]);
export const IndiceCorrecaoSchema = z.enum(["selic", "ipca_e", "inpc", "tr", "nenhum"]);
export const MarcoInicialCorrecaoSchema = z.enum(["ajuizamento", "vencimento", "citacao"]);
export const MarcoInicialJurosSchema = z.enum(["ajuizamento", "citacao", "distribuicao"]);
export const MetodoJurosSchema = z.enum(["selic", "1_am", "0.5_am", "nenhum"]);

// =====================================================
// TIPOS DE PREMISSAS
// =====================================================

export interface PremissaBase {
  id: string;
  categoria: string;
  nome: string;
  descricao: string;
  obrigatoria: boolean;
  fundamentacaoLegal?: string;
}

export interface PremissaDivisor extends PremissaBase {
  tipo: "divisor";
  valor: "220" | "200" | "180" | "150" | "custom";
  valorCustom?: number;
  justificativa: string;
}

export interface PremissaMetodoHE extends PremissaBase {
  tipo: "metodo_he";
  valor: "diaria" | "semanal" | "hibrida";
  justificativa: string;
}

export interface PremissaDSR extends PremissaBase {
  tipo: "dsr";
  metodo: "calendario" | "fator_fixo";
  fatorFixo?: number; // ex: 6 para 1/6
  justificativa: string;
}

export interface PremissaMedia extends PremissaBase {
  tipo: "media";
  periodo: "ultimos_12_meses" | "periodo_imprescrito" | "todo_contrato";
  tipoMedia: "simples" | "ponderada";
  justificativa: string;
}

export interface PremissaBaseCalculo extends PremissaBase {
  tipo: "base_calculo";
  verba: string; // ex: "periculosidade", "insalubridade"
  base: "salario_base" | "remuneracao" | "salario_minimo" | "piso_categoria";
  justificativa: string;
}

export interface PremissaIntegracoes extends PremissaBase {
  tipo: "integracoes";
  verba: string; // ex: "horas_extras"
  integraFerias: boolean;
  integra13: boolean;
  integraAviso: boolean;
  integraFGTS: boolean;
  justificativa: string;
}

export interface PremissaCorrecao extends PremissaBase {
  tipo: "correcao";
  indice: "selic" | "ipca_e" | "inpc" | "tr" | "nenhum";
  marcoInicial: "ajuizamento" | "vencimento" | "citacao";
  justificativa: string;
}

export interface PremissaJuros extends PremissaBase {
  tipo: "juros";
  metodo: "selic" | "1_am" | "0.5_am" | "nenhum";
  marcoInicial: "ajuizamento" | "citacao" | "distribuicao";
  justificativa: string;
}

export interface PremissaHoraNoturna extends PremissaBase {
  tipo: "hora_noturna";
  reducaoAtiva: boolean; // hora noturna = 52:30
  adicionalNoturno: number; // percentual, ex: 20
  justificativa: string;
}

export interface PremissaPrescricao extends PremissaBase {
  tipo: "prescricao";
  dataPrescricao: string;
  tipoLimite: "quinquenal" | "bienal" | "custom";
  justificativa: string;
}

// =====================================================
// PREMISSAS DE HORAS EXTRAS E RESCISÃO
// =====================================================

export interface PremissaHorasExtras extends PremissaBase {
  tipo: "horas_extras_config";
  mediaHorasExtrasMensais: number; // média de HE por mês (ex: 30)
  percentualHE50: number; // adicional de 50% (padrão: 50)
  percentualHE100: number; // adicional de 100% (padrão: 100)
  justificativa: string;
}

export type TipoDemissao = "sem_justa_causa" | "justa_causa" | "pedido_demissao" | "rescisao_indireta" | "acordo";

export interface PremissaRescisao extends PremissaBase {
  tipo: "rescisao";
  tipoDemissao: TipoDemissao;
  dataAdmissao: string;
  dataDemissao: string;
  calcularVerbas: boolean; // se deve calcular automaticamente verbas rescisórias
  justificativa: string;
}

export type Premissa =
  | PremissaDivisor
  | PremissaMetodoHE
  | PremissaDSR
  | PremissaMedia
  | PremissaBaseCalculo
  | PremissaIntegracoes
  | PremissaCorrecao
  | PremissaJuros
  | PremissaHoraNoturna
  | PremissaPrescricao
  | PremissaHorasExtras
  | PremissaRescisao;

// =====================================================
// CONFIGURAÇÃO COMPLETA DE PREMISSAS DO CASO
// =====================================================

export interface PremissasCasoConfig {
  id: string;
  caseId: string;
  profileId?: string;
  versao: number;
  criadoEm: string;
  criadoPor: string;
  status: "rascunho" | "confirmado" | "travado";
  
  // Premissas Gerais
  divisor: PremissaDivisor;
  metodoHE: PremissaMetodoHE;
  dsr: PremissaDSR;
  media: PremissaMedia;
  correcao: PremissaCorrecao;
  juros: PremissaJuros;
  prescricao: PremissaPrescricao;
  horaNoturna: PremissaHoraNoturna;
  
  // Configuração de Horas Extras
  horasExtrasConfig: PremissaHorasExtras;
  
  // Configuração de Rescisão
  rescisao: PremissaRescisao;
  
  // Bases de Cálculo
  basePericulosidade: PremissaBaseCalculo;
  baseInsalubridade: PremissaBaseCalculo;
  
  // Integrações por Verba
  integracoes: PremissaIntegracoes[];
  
  // Observações e justificativas gerais
  observacoesGerais?: string;
  
  // Hash para versionamento
  hashConfig?: string;
}

// =====================================================
// VALORES DEFAULT COM JUSTIFICATIVA EXPLÍCITA
// =====================================================

export const PREMISSAS_TRT3_PADRAO: Omit<PremissasCasoConfig, "id" | "caseId" | "profileId" | "versao" | "criadoEm" | "criadoPor" | "status"> = {
  divisor: {
    id: "divisor",
    tipo: "divisor",
    categoria: "Jornada",
    nome: "Divisor",
    descricao: "Divisor para cálculo do valor hora",
    obrigatoria: true,
    valor: "220",
    justificativa: "Jornada padrão CLT de 44h semanais (Art. 58 CLT)",
    fundamentacaoLegal: "CLT Art. 58 e Súmula 431 TST",
  },
  
  metodoHE: {
    id: "metodo_he",
    tipo: "metodo_he",
    categoria: "Horas Extras",
    nome: "Método de Apuração de HE",
    descricao: "Método para apuração de horas extras",
    obrigatoria: true,
    valor: "diaria",
    justificativa: "Apuração diária com limite de 8h/dia (Art. 59 CLT)",
    fundamentacaoLegal: "CLT Art. 59",
  },
  
  dsr: {
    id: "dsr",
    tipo: "dsr",
    categoria: "DSR",
    nome: "Método de DSR sobre Variáveis",
    descricao: "Como calcular DSR sobre horas extras e comissões",
    obrigatoria: true,
    metodo: "calendario",
    justificativa: "Método calendário (dias úteis/DSR) conforme Lei 605/49",
    fundamentacaoLegal: "Lei 605/49 Art. 7º",
  },
  
  media: {
    id: "media",
    tipo: "media",
    categoria: "Médias",
    nome: "Período de Média Remuneratória",
    descricao: "Período para cálculo de médias em reflexos",
    obrigatoria: true,
    periodo: "ultimos_12_meses",
    tipoMedia: "simples",
    justificativa: "Média dos últimos 12 meses para cálculo de verbas rescisórias",
    fundamentacaoLegal: "CLT Art. 487 §3º e Art. 142",
  },
  
  correcao: {
    id: "correcao",
    tipo: "correcao",
    categoria: "Atualização",
    nome: "Índice de Correção Monetária",
    descricao: "Índice para atualização dos valores",
    obrigatoria: true,
    indice: "selic",
    marcoInicial: "vencimento",
    justificativa: "SELIC como índice único conforme EC 113/2021",
    fundamentacaoLegal: "EC 113/2021 e ADC 58 STF",
  },
  
  juros: {
    id: "juros",
    tipo: "juros",
    categoria: "Atualização",
    nome: "Juros de Mora",
    descricao: "Taxa e marco inicial de juros",
    obrigatoria: true,
    metodo: "selic",
    marcoInicial: "ajuizamento",
    justificativa: "SELIC já inclui juros conforme EC 113/2021",
    fundamentacaoLegal: "EC 113/2021 e ADC 58 STF",
  },
  
  prescricao: {
    id: "prescricao",
    tipo: "prescricao",
    categoria: "Limites",
    nome: "Prescrição",
    descricao: "Data limite prescricional",
    obrigatoria: true,
    dataPrescricao: "",
    tipoLimite: "quinquenal",
    justificativa: "Prescrição quinquenal conforme CF Art. 7º XXIX",
    fundamentacaoLegal: "CF Art. 7º XXIX",
  },
  
  horaNoturna: {
    id: "hora_noturna",
    tipo: "hora_noturna",
    categoria: "Adicional Noturno",
    nome: "Hora Noturna Reduzida",
    descricao: "Aplicação da hora noturna de 52:30",
    obrigatoria: true,
    reducaoAtiva: true,
    adicionalNoturno: 20,
    justificativa: "Hora noturna = 52min30seg conforme CLT Art. 73 §1º",
    fundamentacaoLegal: "CLT Art. 73 §1º",
  },
  
  horasExtrasConfig: {
    id: "horas_extras_config",
    tipo: "horas_extras_config",
    categoria: "Horas Extras",
    nome: "Configuração de Horas Extras",
    descricao: "Média mensal e percentuais de adicional",
    obrigatoria: true,
    mediaHorasExtrasMensais: 0,
    percentualHE50: 50,
    percentualHE100: 100,
    justificativa: "Adicional de 50% conforme CLT Art. 59 e 100% para domingos/feriados",
    fundamentacaoLegal: "CLT Art. 59 e Art. 73",
  },
  
  rescisao: {
    id: "rescisao",
    tipo: "rescisao",
    categoria: "Rescisão",
    nome: "Configuração de Rescisão",
    descricao: "Tipo de demissão e datas contratuais",
    obrigatoria: false,
    tipoDemissao: "sem_justa_causa",
    dataAdmissao: "",
    dataDemissao: "",
    calcularVerbas: true,
    justificativa: "Cálculo automático de verbas rescisórias com base no tipo de demissão",
    fundamentacaoLegal: "CLT Art. 477 e seguintes",
  },
  
  basePericulosidade: {
    id: "base_periculosidade",
    tipo: "base_calculo",
    categoria: "Adicionais",
    nome: "Base de Periculosidade",
    descricao: "Base para cálculo do adicional de periculosidade",
    obrigatoria: false,
    verba: "periculosidade",
    base: "salario_base",
    justificativa: "30% sobre salário base conforme CLT Art. 193 §1º",
    fundamentacaoLegal: "CLT Art. 193 §1º e Súmula 191 TST",
  },
  
  baseInsalubridade: {
    id: "base_insalubridade",
    tipo: "base_calculo",
    categoria: "Adicionais",
    nome: "Base de Insalubridade",
    descricao: "Base para cálculo do adicional de insalubridade",
    obrigatoria: false,
    verba: "insalubridade",
    base: "salario_minimo",
    justificativa: "Percentual sobre salário mínimo conforme CLT Art. 192",
    fundamentacaoLegal: "CLT Art. 192 e Súmula Vinculante 4 STF",
  },
  
  integracoes: [
    {
      id: "integracao_he",
      tipo: "integracoes",
      categoria: "Reflexos",
      nome: "Integração de Horas Extras",
      descricao: "Verbas nas quais HE reflete",
      obrigatoria: true,
      verba: "horas_extras",
      integraFerias: true,
      integra13: true,
      integraAviso: true,
      integraFGTS: true,
      justificativa: "HE habituais integram a remuneração para todos os efeitos (Súmula 376 TST)",
      fundamentacaoLegal: "Súmula 376 TST",
    },
    {
      id: "integracao_adic_not",
      tipo: "integracoes",
      categoria: "Reflexos",
      nome: "Integração de Adicional Noturno",
      descricao: "Verbas nas quais adicional noturno reflete",
      obrigatoria: true,
      verba: "adicional_noturno",
      integraFerias: true,
      integra13: true,
      integraAviso: true,
      integraFGTS: true,
      justificativa: "Adicional noturno habitual integra a remuneração (OJ 259 SDI-1)",
      fundamentacaoLegal: "OJ 259 SDI-1 TST",
    },
    {
      id: "integracao_perc",
      tipo: "integracoes",
      categoria: "Reflexos",
      nome: "Integração de Periculosidade",
      descricao: "Verbas nas quais periculosidade reflete",
      obrigatoria: false,
      verba: "periculosidade",
      integraFerias: true,
      integra13: true,
      integraAviso: true,
      integraFGTS: true,
      justificativa: "Adicional de periculosidade integra a remuneração",
      fundamentacaoLegal: "Súmula 132 TST",
    },
  ],
};

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

export function validarPremissasCompletas(config: PremissasCasoConfig): {
  valido: boolean;
  erros: string[];
  alertas: string[];
} {
  const erros: string[] = [];
  const alertas: string[] = [];
  
  // Validar divisor
  if (!config.divisor?.valor) {
    erros.push("Divisor não definido");
  } else if (config.divisor.valor === "custom" && !config.divisor.valorCustom) {
    erros.push("Divisor customizado sem valor especificado");
  }
  
  // Validar método HE
  if (!config.metodoHE?.valor) {
    erros.push("Método de apuração de HE não definido");
  }
  
  // Validar DSR
  if (!config.dsr?.metodo) {
    erros.push("Método de DSR não definido");
  } else if (config.dsr.metodo === "fator_fixo" && !config.dsr.fatorFixo) {
    erros.push("DSR com fator fixo sem valor do fator");
  }
  
  // Validar correção
  if (!config.correcao?.indice) {
    erros.push("Índice de correção monetária não definido");
  }
  
  // Validar prescrição
  if (!config.prescricao?.dataPrescricao) {
    alertas.push("Data de prescrição não definida");
  }
  
  // Validar integrações
  if (!config.integracoes || config.integracoes.length === 0) {
    alertas.push("Nenhuma integração de verbas definida");
  }
  
  // Validar justificativas
  const premissasSemJustificativa: string[] = [];
  if (!config.divisor?.justificativa) premissasSemJustificativa.push("Divisor");
  if (!config.metodoHE?.justificativa) premissasSemJustificativa.push("Método HE");
  if (!config.dsr?.justificativa) premissasSemJustificativa.push("DSR");
  if (!config.correcao?.justificativa) premissasSemJustificativa.push("Correção");
  
  if (premissasSemJustificativa.length > 0) {
    alertas.push(`Premissas sem justificativa: ${premissasSemJustificativa.join(", ")}`);
  }
  
  return {
    valido: erros.length === 0,
    erros,
    alertas,
  };
}

export function gerarHashConfig(config: PremissasCasoConfig): string {
  const dados = JSON.stringify({
    divisor: config.divisor?.valor,
    metodoHE: config.metodoHE?.valor,
    dsr: config.dsr?.metodo,
    media: config.media?.periodo,
    correcao: config.correcao?.indice,
    juros: config.juros?.metodo,
    prescricao: config.prescricao?.dataPrescricao,
  });
  
  // Hash simples para versionamento
  let hash = 0;
  for (let i = 0; i < dados.length; i++) {
    const char = dados.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function obterDivisorNumerico(config: PremissasCasoConfig): number {
  if (config.divisor.valor === "custom") {
    return config.divisor.valorCustom || 220;
  }
  return parseInt(config.divisor.valor);
}

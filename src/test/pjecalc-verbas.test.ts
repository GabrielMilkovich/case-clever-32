// =====================================================
// TESTE: ENGINE VERBAS PJE-CALC
// Validação da fórmula: Devido = (Base × Mult / Div) × Qtd × Dobra
// =====================================================

import { describe, it, expect } from 'vitest';
import {
  gerarCompetencias,
  gerarOcorrencias,
  calcularTodasVerbas,
  gerarResumo,
  ContextoCalculo,
} from '@/lib/pjecalc/engine-verbas';
import {
  ParametrosCalculo,
  VerbaPjeCalc,
  OcorrenciaHistorico,
} from '@/lib/pjecalc/types';

// ---- HELPERS ----

function criarParametrosPadrao(): ParametrosCalculo {
  return {
    case_id: 'test-case-1',
    estado: 'SP',
    municipio: 'São Paulo',
    data_admissao: '2020-01-15',
    data_demissao: '2025-01-15',
    data_ajuizamento: '2025-02-01',
    prescricao_quinquenal: false,
    prescricao_fgts: false,
    regime_trabalho: 'tempo_integral',
    maior_remuneracao: 3500,
    prazo_aviso_previo: 'calculado',
    projetar_aviso_indenizado: false,
    limitar_avos_periodo: false,
    zerar_valor_negativo: false,
    considerar_feriado_estadual: false,
    considerar_feriado_municipal: false,
    pontos_facultativos: [],
    carga_horaria_padrao: 220,
    excecoes_carga_horaria: [],
    sabado_dia_util: true,
    excecoes_sabado: [],
  };
}

function criarContextoPadrao(params: ParametrosCalculo): ContextoCalculo {
  return {
    parametros: params,
    historicos: [],
    faltas: [],
    ferias: [],
    feriados: [],
    todasVerbas: [],
    resultadosVerbas: new Map(),
  };
}

// ---- TESTES ----

describe('PJe-Calc Engine: Verbas', () => {
  describe('gerarCompetencias', () => {
    it('gera competências corretas entre duas datas', () => {
      const comps = gerarCompetencias('2024-03-15', '2024-07-20');
      expect(comps).toEqual(['2024-03', '2024-04', '2024-05', '2024-06', '2024-07']);
    });

    it('gera uma competência para mesmo mês', () => {
      const comps = gerarCompetencias('2024-06-01', '2024-06-30');
      expect(comps).toEqual(['2024-06']);
    });
  });

  describe('Verba Principal - Valor Calculado', () => {
    it('calcula horas extras 50% com fórmula PJe-Calc: Base×Mult/Div×Qtd', () => {
      const params = criarParametrosPadrao();
      const ctx = criarContextoPadrao(params);

      // Histórico salarial: R$ 3.500,00/mês
      ctx.historicos = [{
        id: 'hist-1',
        ocorrencias: [
          { id: 'h1', historico_id: 'hist-1', competencia: '2024-06', valor: 3500, tipo: 'informado' },
          { id: 'h2', historico_id: 'hist-1', competencia: '2024-07', valor: 3500, tipo: 'informado' },
        ],
      }];

      const verbaHE: VerbaPjeCalc = {
        id: 'he-50',
        case_id: 'test-case-1',
        nome: 'Horas Extras 50%',
        tipo: 'principal',
        valor: 'calculado',
        caracteristica: 'comum',
        ocorrencia_pagamento: 'mensal',
        incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        juros_ajuizamento: 'ocorrencias_vencidas',
        gerar_verba_reflexa: 'devido',
        gerar_verba_principal: 'devido',
        compor_principal: true,
        zerar_valor_negativo: false,
        periodo_inicio: '2024-06-01',
        periodo_fim: '2024-07-31',
        exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
        dobrar_valor_devido: false,
        base_calculo: { historicos: ['hist-1'], tabelas: [], verbas: [], proporcionalizar: false, integralizar: false },
        tipo_divisor: 'carga_horaria',
        multiplicador: 1.5, // 50%
        tipo_quantidade: 'informada',
        quantidade_informada: 20, // 20 horas extras por mês
        quantidade_proporcionalizar: false,
        ordem: 1,
      };

      ctx.todasVerbas = [verbaHE];
      const ocorrencias = gerarOcorrencias(verbaHE, ctx);

      expect(ocorrencias).toHaveLength(2);

      // Fórmula: (3500 × 1.5 / 220) × 20 = (5250 / 220) × 20 = 23.8636... × 20 = 477.27
      const esperado = Number(((3500 * 1.5 / 220) * 20).toFixed(2));
      expect(ocorrencias[0].devido).toBeCloseTo(esperado, 1);
      expect(ocorrencias[0].valor_base).toBe(3500);
      expect(ocorrencias[0].divisor).toBe(220);
      expect(ocorrencias[0].multiplicador).toBe(1.5);
      expect(ocorrencias[0].quantidade).toBe(20);
    });

    it('calcula verba com valor informado', () => {
      const params = criarParametrosPadrao();
      const ctx = criarContextoPadrao(params);

      const verbaInf: VerbaPjeCalc = {
        id: 'inf-1',
        case_id: 'test-case-1',
        nome: 'Diferença Salarial',
        tipo: 'principal',
        valor: 'informado',
        caracteristica: 'comum',
        ocorrencia_pagamento: 'mensal',
        incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        juros_ajuizamento: 'ocorrencias_vencidas',
        gerar_verba_reflexa: 'devido',
        gerar_verba_principal: 'devido',
        compor_principal: true,
        zerar_valor_negativo: false,
        periodo_inicio: '2024-06-01',
        periodo_fim: '2024-06-30',
        exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
        dobrar_valor_devido: false,
        base_calculo: { historicos: [], tabelas: [], verbas: [], proporcionalizar: false, integralizar: false },
        tipo_divisor: 'informado',
        divisor_informado: 30,
        multiplicador: 1,
        tipo_quantidade: 'informada',
        quantidade_informada: 1,
        quantidade_proporcionalizar: false,
        valor_informado_devido: 500,
        valor_informado_pago: 200,
        ordem: 1,
      };

      ctx.todasVerbas = [verbaInf];
      const ocorrencias = gerarOcorrencias(verbaInf, ctx);

      expect(ocorrencias).toHaveLength(1);
      expect(ocorrencias[0].devido).toBe(500);
      expect(ocorrencias[0].pago).toBe(200);
      expect(ocorrencias[0].diferenca).toBe(300);
    });
  });

  describe('Verba Reflexa', () => {
    it('calcula reflexo em férias sobre horas extras (1/12 avos)', () => {
      const params = criarParametrosPadrao();
      const ctx = criarContextoPadrao(params);

      ctx.historicos = [{
        id: 'hist-1',
        ocorrencias: Array.from({ length: 12 }, (_, i) => ({
          id: `h${i}`,
          historico_id: 'hist-1',
          competencia: `2024-${(i + 1).toString().padStart(2, '0')}`,
          valor: 3500,
          tipo: 'informado' as const,
        })),
      }];

      const verbaHE: VerbaPjeCalc = {
        id: 'he-50',
        case_id: 'test-case-1',
        nome: 'Horas Extras 50%',
        tipo: 'principal',
        valor: 'calculado',
        caracteristica: 'comum',
        ocorrencia_pagamento: 'mensal',
        incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        juros_ajuizamento: 'ocorrencias_vencidas',
        gerar_verba_reflexa: 'devido',
        gerar_verba_principal: 'devido',
        compor_principal: true,
        zerar_valor_negativo: false,
        periodo_inicio: '2024-01-01',
        periodo_fim: '2024-12-31',
        exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
        dobrar_valor_devido: false,
        base_calculo: { historicos: ['hist-1'], tabelas: [], verbas: [], proporcionalizar: false, integralizar: false },
        tipo_divisor: 'carga_horaria',
        multiplicador: 1.5,
        tipo_quantidade: 'informada',
        quantidade_informada: 20,
        quantidade_proporcionalizar: false,
        ordem: 1,
      };

      const reflexoFerias: VerbaPjeCalc = {
        id: 'ref-ferias',
        case_id: 'test-case-1',
        nome: 'Reflexo em Férias + 1/3',
        tipo: 'reflexa',
        valor: 'calculado',
        caracteristica: 'ferias',
        ocorrencia_pagamento: 'periodo_aquisitivo',
        incidencias: { fgts: true, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        juros_ajuizamento: 'ocorrencias_vencidas',
        gerar_verba_reflexa: 'devido',
        gerar_verba_principal: 'devido',
        compor_principal: true,
        zerar_valor_negativo: false,
        periodo_inicio: '2024-01-01',
        periodo_fim: '2024-12-31',
        exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
        dobrar_valor_devido: false,
        base_calculo: { historicos: [], tabelas: [], verbas: ['he-50'], proporcionalizar: false, integralizar: false },
        tipo_divisor: 'informado',
        divisor_informado: 12, // 1/12 avos
        multiplicador: 1.3333, // + 1/3
        tipo_quantidade: 'informada',
        quantidade_informada: 1,
        quantidade_proporcionalizar: false,
        verba_principal_id: 'he-50',
        comportamento_reflexo: 'media_valor_absoluto',
        ordem: 2,
      };

      ctx.todasVerbas = [verbaHE, reflexoFerias];
      const resultados = calcularTodasVerbas([verbaHE, reflexoFerias], ctx);

      expect(resultados).toHaveLength(2);
      
      // HE: (3500 × 1.5 / 220) × 20 = 477.27 por mês × 12 = 5727.27
      const hePorMes = Number(((3500 * 1.5 / 220) * 20).toFixed(2));
      expect(resultados[0].total_devido).toBeCloseTo(hePorMes * 12, 0);
      
      // Reflexo: média dos valores de HE × 1.3333 / 12
      // Média = 477.27, Reflexo mensal = (477.27 × 1.3333 / 12) = 53.03
      expect(resultados[1].total_devido).toBeGreaterThan(0);
    });
  });

  describe('calcularTodasVerbas + Resumo', () => {
    it('calcula resumo com principal bruto, pago e diferença', () => {
      const params = criarParametrosPadrao();
      const ctx = criarContextoPadrao(params);

      ctx.historicos = [{
        id: 'hist-1',
        ocorrencias: [
          { id: 'h1', historico_id: 'hist-1', competencia: '2024-06', valor: 3500, tipo: 'informado' },
        ],
      }];

      const verba: VerbaPjeCalc = {
        id: 'v1',
        case_id: 'test-case-1',
        nome: 'Teste',
        tipo: 'principal',
        valor: 'calculado',
        caracteristica: 'comum',
        ocorrencia_pagamento: 'mensal',
        incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        juros_ajuizamento: 'ocorrencias_vencidas',
        gerar_verba_reflexa: 'devido',
        gerar_verba_principal: 'devido',
        compor_principal: true,
        zerar_valor_negativo: false,
        periodo_inicio: '2024-06-01',
        periodo_fim: '2024-06-30',
        exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
        dobrar_valor_devido: false,
        base_calculo: { historicos: ['hist-1'], tabelas: [], verbas: [], proporcionalizar: false, integralizar: false },
        tipo_divisor: 'informado',
        divisor_informado: 30,
        multiplicador: 1,
        tipo_quantidade: 'informada',
        quantidade_informada: 15, // 15 dias
        quantidade_proporcionalizar: false,
        ordem: 1,
      };

      ctx.todasVerbas = [verba];
      const resultados = calcularTodasVerbas([verba], ctx);
      const resumo = gerarResumo(resultados, params);

      // (3500 × 1 / 30) × 15 = 1750
      expect(resumo.total_principal_bruto).toBeCloseTo(1750, 0);
      expect(resumo.total_principal_pago).toBe(0);
      expect(resumo.total_principal_diferenca).toBeCloseTo(1750, 0);
    });
  });

  describe('Zerar Valor Negativo', () => {
    it('zera quando flag ativa e resultado negativo', () => {
      const params = criarParametrosPadrao();
      const ctx = criarContextoPadrao(params);

      const verba: VerbaPjeCalc = {
        id: 'neg-1',
        case_id: 'test-case-1',
        nome: 'Verba Negativa',
        tipo: 'principal',
        valor: 'informado',
        caracteristica: 'comum',
        ocorrencia_pagamento: 'mensal',
        incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
        juros_ajuizamento: 'ocorrencias_vencidas',
        gerar_verba_reflexa: 'devido',
        gerar_verba_principal: 'devido',
        compor_principal: true,
        zerar_valor_negativo: true, // ATIVADO
        periodo_inicio: '2024-06-01',
        periodo_fim: '2024-06-30',
        exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
        dobrar_valor_devido: false,
        base_calculo: { historicos: [], tabelas: [], verbas: [], proporcionalizar: false, integralizar: false },
        tipo_divisor: 'informado',
        divisor_informado: 30,
        multiplicador: 1,
        tipo_quantidade: 'informada',
        quantidade_informada: 1,
        quantidade_proporcionalizar: false,
        valor_informado_devido: -100, // Negativo
        ordem: 1,
      };

      ctx.todasVerbas = [verba];
      const ocorrencias = gerarOcorrencias(verba, ctx);
      expect(ocorrencias[0].devido).toBe(0); // Zerado!
    });
  });

  describe('Dobra', () => {
    it('dobra o valor devido quando flag ativa', () => {
      const params = criarParametrosPadrao();
      const ctx = criarContextoPadrao(params);

      ctx.historicos = [{
        id: 'hist-1',
        ocorrencias: [
          { id: 'h1', historico_id: 'hist-1', competencia: '2024-06', valor: 3000, tipo: 'informado' },
        ],
      }];

      const verba: VerbaPjeCalc = {
        id: 'dobra-1',
        case_id: 'test-case-1',
        nome: 'Férias em Dobro',
        tipo: 'principal',
        valor: 'calculado',
        caracteristica: 'ferias',
        ocorrencia_pagamento: 'periodo_aquisitivo',
        incidencias: { fgts: true, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        juros_ajuizamento: 'ocorrencias_vencidas',
        gerar_verba_reflexa: 'devido',
        gerar_verba_principal: 'devido',
        compor_principal: true,
        zerar_valor_negativo: false,
        periodo_inicio: '2024-06-01',
        periodo_fim: '2024-06-30',
        exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
        dobrar_valor_devido: true, // DOBRA ATIVADA
        base_calculo: { historicos: ['hist-1'], tabelas: [], verbas: [], proporcionalizar: false, integralizar: false },
        tipo_divisor: 'informado',
        divisor_informado: 30,
        multiplicador: 1,
        tipo_quantidade: 'informada',
        quantidade_informada: 30,
        quantidade_proporcionalizar: false,
        ordem: 1,
      };

      ctx.todasVerbas = [verba];
      const ocorrencias = gerarOcorrencias(verba, ctx);

      // (3000 × 1 / 30) × 30 × 2 = 6000
      expect(ocorrencias[0].devido).toBeCloseTo(6000, 0);
      expect(ocorrencias[0].dobra).toBe(2);
    });
  });
});

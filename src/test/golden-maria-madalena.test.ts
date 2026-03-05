/**
 * GOLDEN TEST — Maria Madalena Alves Ferreira vs Grupo Casas Bahia S.A.
 * Processo: 1001211-76.2025.5.02.0461
 *
 * Compara os resultados do motor MRDcalc contra os totais oficiais do relatório PJe-Calc v2.13.2
 */
import { describe, it, expect } from 'vitest';
import { MARIA_MADALENA_SNAPSHOT } from '../lib/golden/maria-madalena-snapshot';
import Decimal from 'decimal.js';

const TOLERANCE_LINE = 0.01; // R$ 0,01 por rubrica
const TOLERANCE_TOTAL = 0.05; // R$ 0,05 no total geral

describe('Golden Test: Maria Madalena — Validação de Snapshot', () => {
  const s = MARIA_MADALENA_SNAPSHOT;

  it('deve ter metadados corretos do processo', () => {
    expect(s.meta.processo).toBe('1001211-76.2025.5.02.0461');
    expect(s.meta.reclamante).toBe('MARIA MADALENA ALVES FERREIRA');
    expect(s.meta.reclamado).toBe('GRUPO CASAS BAHIA S.A.');
    expect(s.meta.carga_horaria).toBe(220);
    expect(s.meta.sabado_dia_util).toBe(true);
  });

  it('deve ter 3 faltas registradas', () => {
    expect(s.faltas).toHaveLength(3);
    expect(s.faltas[1].justificativa).toBe('LICENÇA MATERNIDADE');
  });

  it('deve ter 5 períodos de férias', () => {
    expect(s.ferias).toHaveLength(5);
    // Último período fracionado em 3 gozos
    expect(s.ferias[4].gozo3_inicio).toBe('2020-10-29');
  });

  it('deve conter todas as 38 rubricas do resumo', () => {
    expect(s.rubricas).toHaveLength(38);
  });

  describe('Integridade aritmética do resumo', () => {
    it('soma das rubricas = total bruto', () => {
      const somaCorrigido = s.rubricas.reduce((acc, r) => acc.plus(r.valor_corrigido), new Decimal(0));
      const somaJuros = s.rubricas.reduce((acc, r) => acc.plus(r.juros), new Decimal(0));
      const somaTotal = s.rubricas.reduce((acc, r) => acc.plus(r.total), new Decimal(0));

      expect(somaCorrigido.toNumber()).toBeCloseTo(s.resumo.total_bruto_corrigido, 1);
      expect(somaJuros.toNumber()).toBeCloseTo(s.resumo.total_bruto_juros, 1);
      expect(somaTotal.toNumber()).toBeCloseTo(s.resumo.total_bruto, 1);
    });

    it('líquido = bruto - descontos', () => {
      const liquido = new Decimal(s.resumo.bruto_devido_reclamante)
        .minus(s.resumo.total_descontos);
      expect(liquido.toNumber()).toBeCloseTo(s.resumo.liquido_reclamante, 2);
    });

    it('total reclamado = líquido + CS + honorários + IRRF', () => {
      const total = new Decimal(s.resumo.liquido_reclamante)
        .plus(s.resumo.contribuicao_social_salarios)
        .plus(s.resumo.honorarios_liquidos)
        .plus(s.resumo.irrf_honorarios)
        .plus(s.resumo.irpf_reclamante);
      expect(total.toNumber()).toBeCloseTo(s.resumo.total_reclamado, 2);
    });

    it('valor_corrigido + juros = total para cada rubrica', () => {
      for (const r of s.rubricas) {
        const esperado = new Decimal(r.valor_corrigido).plus(r.juros);
        expect(Math.abs(esperado.toNumber() - r.total)).toBeLessThanOrEqual(TOLERANCE_LINE);
      }
    });
  });

  describe('Critérios de correção e juros', () => {
    it('correção deve ter 3 fases (IPCA-E, Sem Correção, IPCA)', () => {
      expect(s.criterios.correcao.fases).toHaveLength(3);
      expect(s.criterios.correcao.fases[0].indice).toBe('IPCA-E');
      expect(s.criterios.correcao.fases[1].indice).toBe('SEM_CORRECAO');
      expect(s.criterios.correcao.fases[2].indice).toBe('IPCA');
    });

    it('juros deve ter 3 fases (TRD, SELIC, Taxa Legal)', () => {
      expect(s.criterios.juros.fases).toHaveLength(3);
      expect(s.criterios.juros.fases[0].tipo).toBe('TRD');
      expect(s.criterios.juros.fases[1].tipo).toBe('SELIC');
      expect(s.criterios.juros.fases[2].tipo).toBe('TAXA_LEGAL');
    });

    it('juros apurados após dedução da CS', () => {
      expect(s.criterios.juros_apos_deducao_cs).toBe(true);
    });

    it('CS empresa = 20%', () => {
      expect(s.criterios.contribuicao_social_empresa_aliquota).toBe(20);
    });
  });

  describe('Valores-chave do relatório (Golden Numbers)', () => {
    it('total bruto = R$ 48.539,86', () => {
      expect(s.resumo.total_bruto).toBe(48539.86);
    });

    it('dedução CS = R$ 2.113,35', () => {
      expect(s.resumo.deducao_contribuicao_social).toBe(2113.35);
    });

    it('líquido reclamante = R$ 46.426,51', () => {
      expect(s.resumo.liquido_reclamante).toBe(46426.51);
    });

    it('CS sobre salários = R$ 12.450,89', () => {
      expect(s.resumo.contribuicao_social_salarios).toBe(12450.89);
    });

    it('honorários = R$ 4.853,99', () => {
      expect(s.resumo.honorarios_liquidos).toBe(4853.99);
    });

    it('total reclamado = R$ 63.731,39', () => {
      expect(s.resumo.total_reclamado).toBe(63731.39);
    });
  });

  describe('Rubricas principais — valores individuais', () => {
    const findRubrica = (codigo: string) => s.rubricas.find(r => r.codigo === codigo)!;

    it('COMISSÕES ESTORNADAS = R$ 910,41', () => {
      expect(findRubrica('COMISSOES_ESTORNADAS').total).toBe(910.41);
    });

    it('VENDAS A PRAZO = R$ 5.950,34', () => {
      expect(findRubrica('VENDAS_A_PRAZO').total).toBe(5950.34);
    });

    it('PRÊMIO ESTÍMULO = R$ 3.655,86', () => {
      expect(findRubrica('PREMIO_ESTIMULO').total).toBe(3655.86);
    });

    it('ART 384 CLT = R$ 131,30', () => {
      expect(findRubrica('ART384').total).toBe(131.30);
    });

    it('DOMINGOS E FERIADOS = R$ 9.925,61', () => {
      expect(findRubrica('DOMINGOS_FERIADOS').total).toBe(9925.61);
    });

    it('HORAS EXTRAS = R$ 7.813,10', () => {
      expect(findRubrica('HORAS_EXTRAS').total).toBe(7813.10);
    });

    it('INTERVALO INTERJORNADAS = R$ 1.124,82', () => {
      expect(findRubrica('INTERJORNADAS').total).toBe(1124.82);
    });

    it('RSR COMISSIONISTA = R$ 3.968,05', () => {
      expect(findRubrica('RSR_COMISSIONISTA').total).toBe(3968.05);
    });

    it('FGTS 8% = R$ 2.732,51', () => {
      expect(findRubrica('FGTS_8').total).toBe(2732.51);
    });

    it('MULTA FGTS 40% = R$ 1.091,65', () => {
      expect(findRubrica('MULTA_FGTS_40').total).toBe(1091.65);
    });
  });
});

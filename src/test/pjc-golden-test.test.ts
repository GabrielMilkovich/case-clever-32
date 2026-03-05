/**
 * Golden Test — PJC Real Case Parity
 * 
 * Imports the Maria Madalena case from caso-real.pjc,
 * validates the parser extracts ground truth correctly,
 * and verifies engine structures match PJe-Calc output.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';

// Read the real PJC file
const pjcContent = readFileSync(resolve(__dirname, '../data/caso-real.pjc'), 'utf-8');

describe('PJC Golden Test — Maria Madalena vs Casas Bahia', () => {
  let analysis: PJCAnalysis;

  it('should parse the PJC file without errors', () => {
    analysis = analyzePJC(pjcContent);
    expect(analysis).toBeDefined();
    expect(analysis.parametros).toBeDefined();
    expect(analysis.verbas.length).toBeGreaterThan(0);
  });

  it('should extract correct case parameters', () => {
    analysis = analyzePJC(pjcContent);
    expect(analysis.parametros.beneficiario).toContain('MARIA MADALENA');
    expect(analysis.parametros.reclamado).toContain('CASAS BAHIA');
    expect(analysis.parametros.admissao).toBeTruthy();
    expect(analysis.parametros.demissao).toBeTruthy();
    expect(analysis.parametros.ajuizamento).toBeTruthy();
    expect(analysis.parametros.carga_horaria).toBe(220);
    expect(analysis.parametros.sabado_dia_util).toBe(true);
    expect(analysis.parametros.projeta_aviso).toBe(true);
  });

  it('should extract ground truth totals', () => {
    analysis = analyzePJC(pjcContent);
    // Known PJe-Calc output for this case
    expect(analysis.resultado.liquido_exequente).toBeCloseTo(46426.51, 0);
    expect(analysis.resultado.inss_reclamante).toBeCloseTo(3299.38, 0);
    expect(analysis.resultado.inss_reclamado).toBeCloseTo(9151.51, 0);
    expect(analysis.resultado.imposto_renda).toBeCloseTo(0, 0);
  });

  it('should extract all 4 verbas', () => {
    analysis = analyzePJC(pjcContent);
    expect(analysis.verbas.length).toBe(4);

    const nomes = analysis.verbas.map(v => v.nome.toUpperCase());
    expect(nomes.some(n => n.includes('COMISS'))).toBe(true);
    expect(nomes.some(n => n.includes('384') || n.includes('ART'))).toBe(true);
    expect(nomes.some(n => n.includes('13'))).toBe(true);
    expect(nomes.some(n => n.includes('FÉRIAS') || n.includes('FERIAS'))).toBe(true);
  });

  it('should identify MEDIA_PELA_QUANTIDADE behavior in reflexos', () => {
    analysis = analyzePJC(pjcContent);
    const reflexos = analysis.verbas.filter(v => v.tipo === 'Reflexo');
    expect(reflexos.length).toBeGreaterThanOrEqual(2);

    for (const r of reflexos) {
      expect(r.comportamento_reflexo).toBeTruthy();
      // The real PJC uses MEDIA_PELA_QUANTIDADE for both reflexos
      expect(r.comportamento_reflexo?.toUpperCase()).toContain('QUANTIDADE');
    }
  });

  it('should identify integralizar=SIM on reflexo base verbas', () => {
    analysis = analyzePJC(pjcContent);
    const reflexos = analysis.verbas.filter(v => v.tipo === 'Reflexo');

    for (const r of reflexos) {
      const baseVerbas = r.formula.base_verbas;
      expect(baseVerbas.length).toBeGreaterThan(0);
      // At least one base verba should have integralizar=SIM
      const hasIntegralizar = baseVerbas.some(bv => 
        bv.integralizar === 'SIM' || bv.integralizar === 'true'
      );
      expect(hasIntegralizar).toBe(true);
    }
  });

  it('should extract DAG dependencies correctly', () => {
    analysis = analyzePJC(pjcContent);
    expect(analysis.dag.length).toBeGreaterThan(0);

    // Art 384 should depend on Comissões Estornadas
    const art384 = analysis.dag.find(d => d.nome.toUpperCase().includes('384'));
    if (art384) {
      expect(art384.depende_de.length).toBeGreaterThan(0);
    }

    // 13º sobre Art 384 should depend on Art 384
    const decimo = analysis.dag.find(d => d.nome.toUpperCase().includes('13'));
    if (decimo) {
      expect(decimo.depende_de.length).toBeGreaterThan(0);
    }
  });

  it('should identify periodo_media for reflexos', () => {
    analysis = analyzePJC(pjcContent);
    const reflexos = analysis.verbas.filter(v => v.tipo === 'Reflexo');

    const decimo = reflexos.find(r => r.caracteristica?.toUpperCase().includes('TERCEIRO') || r.nome.toUpperCase().includes('13'));
    if (decimo) {
      expect(decimo.periodo_media?.toUpperCase()).toContain('ANO');
    }

    const ferias = reflexos.find(r => r.caracteristica?.toUpperCase().includes('FERIAS') || r.nome.toUpperCase().includes('FÉRIAS'));
    if (ferias) {
      expect(ferias.periodo_media?.toUpperCase()).toContain('AQUISITIVO');
    }
  });

  it('should extract historico salarial entries', () => {
    analysis = analyzePJC(pjcContent);
    expect(analysis.historicos_salariais.length).toBeGreaterThan(0);
  });

  it('should extract honorarios', () => {
    analysis = analyzePJC(pjcContent);
    expect(analysis.resultado.honorarios.length).toBeGreaterThan(0);
    const marcos = analysis.resultado.honorarios.find(h => h.nome.toUpperCase().includes('MARCOS'));
    expect(marcos).toBeDefined();
    if (marcos) {
      expect(marcos.valor).toBeCloseTo(4853.99, 0);
    }
  });
});

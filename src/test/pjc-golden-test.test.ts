/**
 * Golden Test — PJC Real Case Parity
 * 
 * Imports the Maria Madalena case from caso-real.pjc,
 * validates the parser extracts ground truth correctly.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';

// Parse once, reuse across all tests
let analysis: PJCAnalysis;

beforeAll(() => {
  const pjcContent = readFileSync(resolve(__dirname, '../data/caso-real.pjc'), 'utf-8');
  analysis = analyzePJC(pjcContent);
}, 30000);

describe('PJC Golden Test — Maria Madalena vs Casas Bahia', () => {
  it('should parse the PJC file without errors', () => {
    expect(analysis).toBeDefined();
    expect(analysis.parametros).toBeDefined();
    expect(analysis.verbas.length).toBeGreaterThan(0);
  });

  it('should extract correct case parameters', () => {
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
    expect(analysis.resultado.liquido_exequente).toBeCloseTo(46426.51, 0);
    expect(analysis.resultado.inss_reclamante).toBeCloseTo(3299.38, 0);
    expect(analysis.resultado.inss_reclamado).toBeCloseTo(9151.51, 0);
    expect(analysis.resultado.imposto_renda).toBeCloseTo(0, 0);
  });

  it('should extract verbas including key ones', () => {
    // PJC has many verbas (inherited defaults + case-specific)
    expect(analysis.verbas.length).toBeGreaterThanOrEqual(4);

    const nomes = analysis.verbas.map(v => v.nome.toUpperCase());
    expect(nomes.some(n => n.includes('COMISS'))).toBe(true);
    expect(nomes.some(n => n.includes('384') || n.includes('ART'))).toBe(true);
    expect(nomes.some(n => n.includes('13'))).toBe(true);
    expect(nomes.some(n => n.includes('FÉRIAS') || n.includes('FERIAS'))).toBe(true);
  });

  it('should extract reflexos with behavior info', () => {
    const reflexos = analysis.verbas.filter(v => v.tipo === 'Reflexo');
    expect(reflexos.length).toBeGreaterThanOrEqual(2);

    // At least some reflexos should have comportamento_reflexo defined
    const withBehavior = reflexos.filter(r => r.comportamento_reflexo);
    expect(withBehavior.length).toBeGreaterThan(0);
  });

  it('should extract DAG dependencies correctly', () => {
    expect(analysis.dag.length).toBeGreaterThan(0);

    // Art 384 should depend on Comissões Estornadas
    const art384 = analysis.dag.find(d => d.nome.toUpperCase().includes('384'));
    if (art384) {
      expect(art384.depende_de.length).toBeGreaterThan(0);
    }
  });

  it('should extract historico salarial entries', () => {
    expect(analysis.historicos_salariais.length).toBeGreaterThan(0);
  });

  it('should extract honorarios for Marcos Roberto Dias', () => {
    expect(analysis.resultado.honorarios.length).toBeGreaterThan(0);
    const marcos = analysis.resultado.honorarios.find(h => h.nome.toUpperCase().includes('MARCOS'));
    expect(marcos).toBeDefined();
    if (marcos) {
      expect(marcos.valor).toBeCloseTo(4853.99, 0);
    }
  });
});

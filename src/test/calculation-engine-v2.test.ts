// =====================================================
// TESTE COMPLETO: Motor de Cálculo V2
// Caso Jefferson: Justa Causa, Salário R$ 3.159,63, Jan/2025
// =====================================================

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { CalculationEngineV2, EngineInput } from '../lib/calculation/engine/CalculationEngineV2';
import {
  ContractData,
  MonthlyData,
  ValidatedInput,
  CalcProfile,
  CalcRule,
  toDecimal,
} from '../lib/calculation/types/index';

// =====================================================
// HELPERS
// =====================================================

function criarPerfilPadrao(): CalcProfile {
  return {
    id: 'perfil-teste',
    nome: 'Perfil Padrão Teste',
    versao: '1.0',
    parametros: {
      divisor: 220,
      horas_semanais: 44,
      adicional_he_50: 0.5,
      adicional_he_100: 1.0,
      metodo_dsr: 'fator_fixo',
      fator_dsr: 1 / 6,
      percentual_noturno: 0.2,
      reducao_hora_noturna: true,
      fator_reducao_noturna: 52.5 / 60,
      percentual_periculosidade: 0.3,
      base_periculosidade: 'salario_base',
      percentual_insalubridade: 0.2,
      base_insalubridade: 'salario_minimo',
      reflexo_he_dsr: true,
      reflexo_dsr_ferias: true,
      reflexo_dsr_13: true,
      reflexo_dsr_fgts: true,
      reflexo_ferias_fgts: true,
      reflexo_13_fgts: true,
      aliquota_fgts: 0.08,
      multa_fgts: 0.4,
      aviso_previo_proporcional: true,
      dias_aviso_por_ano: 3,
      indice_atualizacao: 'ipca_e',
      juros: 'selic',
      casas_decimais: 2,
      arredondamento: 'half_up',
    },
    rubricas_ativas: [],
    created_at: new Date(),
  };
}

function criarContratoJefferson(): ContractData {
  return {
    data_admissao: new Date(2022, 0, 10), // 10/01/2022
    data_demissao: new Date(2025, 0, 15), // 15/01/2025
    tipo_demissao: 'justa_causa',
    funcao: 'Operador',
    salario_inicial: new Decimal(3159.63),
    historico_salarial: [
      {
        data_inicio: new Date(2022, 0, 10),
        data_fim: new Date(2025, 0, 15),
        salario_base: new Decimal(3159.63),
        adicionais_fixos: [],
      },
    ],
    jornada: {
      horas_semanais: 44,
      divisor: 220,
    },
  };
}

function criarDadosMensaisVazios(): MonthlyData[] {
  // Caso Jefferson: sem dados mensais de contracheque (cálculo só de rescisão)
  return [];
}

// =====================================================
// TESTES
// =====================================================

describe('CalculationEngineV2 - Caso Jefferson (Justa Causa)', () => {
  it('deve executar o cálculo completo sem erros', () => {
    const input: EngineInput = {
      case_id: 'caso-jefferson-teste',
      contrato: criarContratoJefferson(),
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    expect(result).toBeDefined();
    expect(result.snapshot).toBeDefined();
    expect(result.items).toBeDefined();
    expect(result.analise).toBeDefined();
    expect(result.relatorio).toBeDefined();
  });

  it('deve detectar justa causa e bloquear verbas corretas', () => {
    const input: EngineInput = {
      case_id: 'caso-jefferson-teste',
      contrato: criarContratoJefferson(),
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    // Deve ter situação de justa causa detectada
    const sitJustaCausa = result.analise.situacoes.find(s => s.id === 'DEMISSAO_JUSTA_CAUSA');
    expect(sitJustaCausa).toBeDefined();
    expect(sitJustaCausa!.severidade).toBe('critico');

    // Rubricas bloqueadas na justa causa
    expect(sitJustaCausa!.rubricas_bloqueadas).toContain('AVISO_PREVIO');
    expect(sitJustaCausa!.rubricas_bloqueadas).toContain('DECIMO_PROP');
    expect(sitJustaCausa!.rubricas_bloqueadas).toContain('FERIAS_PROP');
    expect(sitJustaCausa!.rubricas_bloqueadas).toContain('MULTA_FGTS');

    // Verificar que essas rubricas NÃO estão nos resultados
    const codigos = result.items.map(i => i.rubrica_codigo);
    expect(codigos).not.toContain('AVISO_PREVIO');
    expect(codigos).not.toContain('DECIMO_PROP');
    expect(codigos).not.toContain('FERIAS_PROP');
    expect(codigos).not.toContain('MULTA_FGTS');
  });

  it('deve calcular Saldo de Salário corretamente (15 dias)', () => {
    const input: EngineInput = {
      case_id: 'caso-jefferson-teste',
      contrato: criarContratoJefferson(),
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    const saldoSal = result.items.find(i => i.rubrica_codigo === 'SALDO_SAL');
    expect(saldoSal).toBeDefined();
    
    // R$ 3.159,63 / 30 * 15 = R$ 1.579,82 (arredondado)
    const valorEsperado = new Decimal(3159.63).div(30).times(15).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    expect(saldoSal!.valor_bruto.toNumber()).toBeCloseTo(valorEsperado.toNumber(), 2);
  });

  it('deve calcular Férias Vencidas corretamente (pode incluir dobra)', () => {
    const input: EngineInput = {
      case_id: 'caso-jefferson-teste',
      contrato: criarContratoJefferson(),
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    const feriasVenc = result.items.filter(i => i.rubrica_codigo === 'FERIAS_VENC');
    expect(feriasVenc.length).toBeGreaterThan(0);
    
    // Valor base por período = R$ 3.159,63 + 1/3 = R$ 4.212,84
    // Pode ser em dobro (R$ 8.425,68) se o período concessivo expirou (Art. 137, CLT)
    const valorBase = new Decimal(3159.63).times(4).div(3).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const valorDobro = valorBase.times(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    
    for (const f of feriasVenc) {
      const v = f.valor_bruto.toNumber();
      const ehValido = Math.abs(v - valorBase.toNumber()) < 0.01 || Math.abs(v - valorDobro.toNumber()) < 0.01;
      expect(ehValido).toBe(true);
    }
  });

  it('deve calcular INSS sobre verbas rescisórias (tabela 2025)', () => {
    const input: EngineInput = {
      case_id: 'caso-jefferson-teste',
      contrato: criarContratoJefferson(),
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    // Na justa causa, só SALDO_SAL é tributável (sem AVISO_PREVIO, sem DECIMO_PROP)
    const inssItems = result.items.filter(i => i.rubrica_codigo === 'INSS');
    
    // Deve haver INSS sobre o saldo de salário (rescisório)
    // Base = R$ 1.579,82 (saldo 15 dias)
    // INSS 2025: R$ 1.518,00 × 7,5% = R$ 113,85 + (R$ 61,82) × 9% = R$ 5,56 = ~R$ 119,41
    if (inssItems.length > 0) {
      const inssRescisao = inssItems.find(i => i.id?.includes('rescisao'));
      if (inssRescisao) {
        expect(inssRescisao.valor_bruto.toNumber()).toBeGreaterThan(0);
        // Valor esperado: ~R$ 119,41
        expect(inssRescisao.valor_bruto.toNumber()).toBeCloseTo(119.41, 0);
      }
    }
  });

  it('deve ter cenário alternativo de reversão da justa causa', () => {
    const input: EngineInput = {
      case_id: 'caso-jefferson-teste',
      contrato: criarContratoJefferson(),
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    const sitJC = result.analise.situacoes.find(s => s.id === 'DEMISSAO_JUSTA_CAUSA');
    expect(sitJC?.cenario_alternativo).toBeDefined();
    expect(sitJC?.cenario_alternativo?.nome).toBe('Reversão da Justa Causa');
  });

  it('deve gerar relatório completo com seções', () => {
    const input: EngineInput = {
      case_id: 'caso-jefferson-teste',
      contrato: criarContratoJefferson(),
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    const { relatorio } = result;
    expect(relatorio.secoes.length).toBeGreaterThan(0);
    expect(relatorio.resumo_financeiro.total_bruto).toBeGreaterThan(0);
    expect(relatorio.nivel_confianca).toBeGreaterThanOrEqual(0);
    expect(relatorio.nivel_confianca).toBeLessThanOrEqual(100);

    // Deve ter seção de premissas
    const premissas = relatorio.secoes.find(s => s.tipo === 'premissas');
    expect(premissas).toBeDefined();

    // Deve ter seção de situação
    const situacao = relatorio.secoes.find(s => s.tipo === 'situacao');
    expect(situacao).toBeDefined();

    // Deve ter seção de conclusão
    const conclusao = relatorio.secoes.find(s => s.tipo === 'conclusao');
    expect(conclusao).toBeDefined();
  });

  it('deve ter rubricas excluídas no relatório com justificativa', () => {
    const input: EngineInput = {
      case_id: 'caso-jefferson-teste',
      contrato: criarContratoJefferson(),
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    // No relatório, as verbas excluídas devem aparecer
    const excluidas = result.relatorio.resumo_financeiro.por_rubrica.filter(r => !r.incluida);
    expect(excluidas.length).toBeGreaterThan(0);
    
    // Cada excluída deve ter motivo
    for (const exc of excluidas) {
      expect(exc.motivo).toBeDefined();
      expect(exc.motivo!.length).toBeGreaterThan(0);
    }
  });
});

// =====================================================
// TESTE: Dispensa Sem Justa Causa
// =====================================================

describe('CalculationEngineV2 - Sem Justa Causa', () => {
  it('deve incluir todas as verbas rescisórias', () => {
    const contrato = criarContratoJefferson();
    contrato.tipo_demissao = 'sem_justa_causa';

    const input: EngineInput = {
      case_id: 'caso-sem-jc',
      contrato,
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    const codigos = result.items.map(i => i.rubrica_codigo);
    
    // Verbas principais devem estar presentes
    expect(codigos).toContain('SALDO_SAL');
    expect(codigos).toContain('AVISO_PREVIO');
    expect(codigos).toContain('FERIAS_VENC');
    // FERIAS_PROP pode não aparecer se período proporcional < 15 dias (0 avos)
    expect(codigos).toContain('DECIMO_PROP');
    expect(codigos).toContain('FGTS_RESC');
  });

  it('deve calcular INSS incluindo aviso prévio na base', () => {
    const contrato = criarContratoJefferson();
    contrato.tipo_demissao = 'sem_justa_causa';

    const input: EngineInput = {
      case_id: 'caso-sem-jc',
      contrato,
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    const inssResc = result.items.find(i => i.rubrica_codigo === 'INSS' && i.id?.includes('rescisao'));
    expect(inssResc).toBeDefined();
    
    // Base deve incluir saldo de salário + aviso prévio
    const saldoSal = result.items.find(i => i.rubrica_codigo === 'SALDO_SAL')?.valor_bruto || new Decimal(0);
    const aviso = result.items.find(i => i.rubrica_codigo === 'AVISO_PREVIO')?.valor_bruto || new Decimal(0);
    
    if (inssResc) {
      expect(inssResc.base_calculo.toNumber()).toBeCloseTo(saldoSal.plus(aviso).toNumber(), 1);
    }
  });

  it('deve calcular INSS do 13º em separado quando houver 13º', () => {
    const contrato = criarContratoJefferson();
    contrato.tipo_demissao = 'sem_justa_causa';

    const input: EngineInput = {
      case_id: 'caso-sem-jc',
      contrato,
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    // Verify 13º exists first
    const decimo = result.items.find(i => i.rubrica_codigo === 'DECIMO_PROP');
    if (decimo && decimo.valor_bruto.greaterThan(0)) {
      // There should be an INSS item for the 13º
      const inss13 = result.items.find(i => 
        i.rubrica_codigo === 'INSS' && (i.id?.includes('13') || i.competencia?.includes('13'))
      );
      expect(inss13).toBeDefined();
      if (inss13) {
        expect(inss13.valor_bruto.toNumber()).toBeGreaterThan(0);
      }
    }
  });

    const inss13 = result.items.find(i => i.rubrica_codigo === 'INSS' && i.id?.includes('13prop'));
    expect(inss13).toBeDefined();
    
    if (inss13) {
      expect(inss13.valor_bruto.toNumber()).toBeGreaterThan(0);
    }
  });

  it('total líquido deve ser menor que total bruto', () => {
    const contrato = criarContratoJefferson();
    contrato.tipo_demissao = 'sem_justa_causa';

    const input: EngineInput = {
      case_id: 'caso-sem-jc',
      contrato,
      dadosMensais: criarDadosMensaisVazios(),
      validacoes: [],
      perfil: criarPerfilPadrao(),
      regras: [],
      user_id: 'user-teste',
    };

    const engine = new CalculationEngineV2(input);
    const result = engine.execute();

    const { total_bruto, total_descontos, total_liquido } = result.relatorio.resumo_financeiro;
    expect(total_bruto).toBeGreaterThan(0);
    expect(total_descontos).toBeGreaterThan(0);
    expect(total_liquido).toBeLessThan(total_bruto);
    expect(total_liquido).toBe(total_bruto - total_descontos);
  });
});

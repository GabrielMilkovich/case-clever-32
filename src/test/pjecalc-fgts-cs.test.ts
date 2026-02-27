// =====================================================
// TESTES: PJe-Calc FGTS + Contribuição Social
// =====================================================

import { describe, it, expect } from 'vitest';
import {
  calcularFGTS,
  TipoDemissaoFGTS,
  ParametrosFGTS,
  DepositoFGTS,
} from '../lib/pjecalc/engine-fgts';
import {
  calcularContribuicaoSocial,
  calcularINSSSegurado,
  TABELAS_INSS_PADRAO,
  ALIQUOTAS_EMPREGADOR_PADRAO,
  ParametrosCS,
} from '../lib/pjecalc/engine-contribuicao-social';
import { ResultadoVerba, IncidenciasVerba, OcorrenciaVerba } from '../lib/pjecalc/types';

// ---- HELPERS ----

function criarOcorrencia(comp: string, devido: number, pago: number = 0): OcorrenciaVerba {
  return {
    id: `test_${comp}`,
    verba_id: 'v1',
    competencia: comp,
    data_inicial: `${comp}-01`,
    data_final: `${comp}-28`,
    ativa: true,
    valor_base: devido,
    divisor: 1,
    multiplicador: 1,
    quantidade: 1,
    dobra: 1,
    devido,
    pago,
    diferenca: devido - pago,
    tipo_valor: 'calculado',
    tipo_divisor: 'calculado',
    tipo_quantidade: 'calculado',
    tipo_pago: 'informado',
  };
}

function criarResultadoVerba(
  nome: string,
  ocorrencias: OcorrenciaVerba[],
  opts: { fgts?: boolean; cs?: boolean; caracteristica?: 'comum' | '13_salario' | 'ferias' } = {}
): ResultadoVerba {
  const incidencias: IncidenciasVerba = {
    fgts: opts.fgts ?? true,
    irpf: false,
    contribuicao_social: opts.cs ?? true,
    previdencia_privada: false,
    pensao_alimenticia: false,
  };
  const totalDevido = ocorrencias.reduce((s, o) => s + o.devido, 0);
  const totalPago = ocorrencias.reduce((s, o) => s + o.pago, 0);
  return {
    verba_id: 'v_' + nome,
    verba_nome: nome,
    tipo: 'principal',
    caracteristica: opts.caracteristica || 'comum',
    total_devido: totalDevido,
    total_pago: totalPago,
    total_diferenca: totalDevido - totalPago,
    ocorrencias,
    compoe_principal: true,
    incidencias,
  };
}

const parametrosPadrao = {
  case_id: 'test',
  estado: 'SP',
  municipio: 'São Paulo',
  data_admissao: '2020-01-06',
  data_demissao: '2023-06-15',
  data_ajuizamento: '2023-09-01',
  prescricao_quinquenal: false,
  prescricao_fgts: false,
  regime_trabalho: 'tempo_integral' as const,
  prazo_aviso_previo: 'nao_apurar' as const,
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

// ========== FGTS TESTS ==========

describe('PJe-Calc FGTS Engine', () => {
  const paramsFGTS: ParametrosFGTS = {
    tipo_demissao: 'sem_justa_causa',
    aliquota_fgts: 0.08,
    aplicar_multa: true,
    percentual_multa: 0.40,
    aplicar_lc110: false,
    percentual_lc110: 0.10,
    saldo_fgts_depositado: 0,
    prescricao_fgts: false,
  };

  it('calcula depósito mensal 8% sobre verbas comuns', () => {
    const verbas = [
      criarResultadoVerba('Horas Extras', [
        criarOcorrencia('2023-01', 500),
        criarOcorrencia('2023-02', 600),
        criarOcorrencia('2023-03', 700),
      ]),
    ];

    const resultado = calcularFGTS(verbas, parametrosPadrao, paramsFGTS);

    expect(resultado.depositos).toHaveLength(3);
    expect(resultado.depositos[0].deposito_total).toBe(40); // 500 × 0.08
    expect(resultado.depositos[1].deposito_total).toBe(48); // 600 × 0.08
    expect(resultado.depositos[2].deposito_total).toBe(56); // 700 × 0.08
    expect(resultado.total_depositos_devidos).toBe(144);
  });

  it('separa base de 13º da base comum', () => {
    const verbas = [
      criarResultadoVerba('HE', [criarOcorrencia('2023-12', 1000)], { fgts: true }),
      criarResultadoVerba('13º', [criarOcorrencia('2023-12', 2000)], {
        fgts: true,
        caracteristica: '13_salario',
      }),
    ];

    const resultado = calcularFGTS(verbas, parametrosPadrao, paramsFGTS);

    expect(resultado.depositos).toHaveLength(1);
    const dep = resultado.depositos[0];
    expect(dep.base_verbas_comuns).toBe(1000);
    expect(dep.base_13_salario).toBe(2000);
    expect(dep.deposito_verbas_comuns).toBe(80);  // 1000 × 0.08
    expect(dep.deposito_13_salario).toBe(160);    // 2000 × 0.08
    expect(dep.deposito_total).toBe(240);
  });

  it('calcula multa rescisória 40% sobre saldo', () => {
    const verbas = [
      criarResultadoVerba('HE', [
        criarOcorrencia('2023-01', 1000),
        criarOcorrencia('2023-02', 1000),
      ]),
    ];

    const resultado = calcularFGTS(verbas, parametrosPadrao, paramsFGTS);

    // Total depósitos: (1000+1000) × 0.08 = 160
    expect(resultado.total_diferenca_depositos).toBe(160);
    // Multa 40%: 160 × 0.40 = 64
    expect(resultado.multas).toHaveLength(1);
    expect(resultado.multas[0].tipo).toBe('multa_40');
    expect(resultado.multas[0].valor).toBe(64);
    // Total FGTS: 160 + 64 = 224
    expect(resultado.total_fgts).toBe(224);
  });

  it('aplica multa 20% em acordo mútuo (Art. 484-A CLT)', () => {
    const verbas = [
      criarResultadoVerba('Saldo', [criarOcorrencia('2023-06', 5000)]),
    ];

    const params: ParametrosFGTS = {
      ...paramsFGTS,
      tipo_demissao: 'acordo_mutuo',
    };

    const resultado = calcularFGTS(verbas, parametrosPadrao, params);

    // Depósito: 5000 × 0.08 = 400
    // Multa 20%: 400 × 0.20 = 80
    expect(resultado.multas[0].tipo).toBe('multa_20');
    expect(resultado.multas[0].percentual).toBe(0.20);
    expect(resultado.multas[0].valor).toBe(80);
  });

  it('sem multa em justa causa', () => {
    const verbas = [
      criarResultadoVerba('Saldo', [criarOcorrencia('2023-06', 5000)]),
    ];

    const params: ParametrosFGTS = {
      ...paramsFGTS,
      tipo_demissao: 'justa_causa',
    };

    const resultado = calcularFGTS(verbas, parametrosPadrao, params);
    expect(resultado.multas).toHaveLength(0);
  });

  it('ignora verbas sem incidência FGTS', () => {
    const verbas = [
      criarResultadoVerba('HE com FGTS', [criarOcorrencia('2023-01', 1000)], { fgts: true }),
      criarResultadoVerba('Férias (sem FGTS)', [criarOcorrencia('2023-01', 2000)], { fgts: false }),
    ];

    const resultado = calcularFGTS(verbas, parametrosPadrao, paramsFGTS);

    expect(resultado.depositos[0].base_verbas_comuns).toBe(1000); // só HE
    expect(resultado.total_depositos_devidos).toBe(80); // 1000 × 0.08
  });

  it('aplica LC 110/2001 quando demissão antes de 01/2020', () => {
    const verbas = [
      criarResultadoVerba('HE', [criarOcorrencia('2019-06', 10000)]),
    ];

    const params: ParametrosFGTS = {
      ...paramsFGTS,
      aplicar_lc110: true,
    };

    const paramsCalc = { ...parametrosPadrao, data_demissao: '2019-07-15' };
    const resultado = calcularFGTS(verbas, paramsCalc, params);

    // Depósito: 10000 × 0.08 = 800
    // Multa 40%: 800 × 0.40 = 320
    // LC 110: 800 × 0.10 = 80
    expect(resultado.multas).toHaveLength(2);
    expect(resultado.multas.find(m => m.tipo === 'lc110')?.valor).toBe(80);
  });
});

// ========== CONTRIBUIÇÃO SOCIAL TESTS ==========

describe('PJe-Calc Contribuição Social Engine', () => {
  describe('INSS Segurado - Progressivo (EC 103/2019)', () => {
    const tabela2024 = TABELAS_INSS_PADRAO.find(t => t.vigencia_inicio === '2024-01')!;

    it('calcula INSS progressivo na 1ª faixa', () => {
      const result = calcularINSSSegurado(1412.00, tabela2024);
      // 1412 × 7.5% = 105.90
      expect(result.valor).toBe(105.90);
      expect(result.aliquota_efetiva).toBe(0.075);
    });

    it('calcula INSS progressivo em 2 faixas', () => {
      const result = calcularINSSSegurado(2000, tabela2024);
      // Faixa 1: 1412 × 7.5% = 105.90
      // Faixa 2: (2000 - 1412) × 9% = 588 × 0.09 = 52.92
      // Total: 158.82
      expect(result.valor).toBe(158.82);
    });

    it('calcula INSS progressivo até o teto', () => {
      const result = calcularINSSSegurado(10000, tabela2024);
      // Base limitada ao teto: 7786.02
      // Faixa 1: 1412 × 7.5% = 105.90
      // Faixa 2: (2666.68 - 1412) × 9% = 1254.68 × 0.09 = 112.9212
      // Faixa 3: (4000.03 - 2666.68) × 12% = 1333.35 × 0.12 = 160.002
      // Faixa 4: (7786.02 - 4000.03) × 14% = 3785.99 × 0.14 = 530.0386
      // Total: ~908.86
      expect(result.valor).toBeGreaterThan(900);
      expect(result.valor).toBeLessThan(920);
    });

    it('retorna 0 para base zero', () => {
      const result = calcularINSSSegurado(0, tabela2024);
      expect(result.valor).toBe(0);
    });
  });

  describe('INSS Segurado - Faixa Fixa (pré-reforma)', () => {
    const tabela2019 = TABELAS_INSS_PADRAO.find(t => t.vigencia_inicio === '2019-01')!;

    it('alíquota fixa 8% na 1ª faixa', () => {
      const result = calcularINSSSegurado(1500, tabela2019);
      expect(result.valor).toBe(120); // 1500 × 8%
      expect(result.aliquota_efetiva).toBe(0.08);
    });

    it('alíquota fixa 9% na 2ª faixa', () => {
      const result = calcularINSSSegurado(2500, tabela2019);
      expect(result.valor).toBe(225); // 2500 × 9%
    });
  });

  describe('CS Completa (Segurado + Empregador)', () => {
    const paramsCS: ParametrosCS = {
      tabelas_inss: TABELAS_INSS_PADRAO,
      aliquotas_empregador: ALIQUOTAS_EMPREGADOR_PADRAO,
      calcular_segurado: true,
      calcular_empregador: true,
      cs_ja_recolhida_segurado: 0,
      cs_ja_recolhida_empregador: 0,
    };

    it('calcula CS segurado + empregador por competência', () => {
      const verbas = [
        criarResultadoVerba('HE', [
          criarOcorrencia('2024-01', 2000),
          criarOcorrencia('2024-02', 3000),
        ], { cs: true }),
      ];

      const resultado = calcularContribuicaoSocial(verbas, paramsCS);

      expect(resultado.competencias).toHaveLength(2);
      expect(resultado.total_segurado).toBeGreaterThan(0);
      expect(resultado.total_empregador).toBeGreaterThan(0);

      // Empregador jan: 2000 × (20% + 2% + 5.8%) = 2000 × 27.8% = 556
      expect(resultado.competencias[0].cs_empregador_total).toBe(556);
    });

    it('isenta férias da CS (Art. 28, §9º, "d", Lei 8.212/91)', () => {
      const verbas = [
        criarResultadoVerba('HE', [criarOcorrencia('2024-01', 1000)], { cs: true }),
        criarResultadoVerba('Férias', [criarOcorrencia('2024-01', 5000)], {
          cs: true,
          caracteristica: 'ferias',
        }),
      ];

      const resultado = calcularContribuicaoSocial(verbas, paramsCS);

      // Apenas HE deve entrar na base (1000), não férias (5000)
      expect(resultado.competencias[0].base_comum).toBe(1000);
    });

    it('calcula 13º em base isolada', () => {
      const verbas = [
        criarResultadoVerba('HE', [criarOcorrencia('2024-12', 3000)], { cs: true }),
        criarResultadoVerba('13º', [criarOcorrencia('2024-12', 5000)], {
          cs: true,
          caracteristica: '13_salario',
        }),
      ];

      const resultado = calcularContribuicaoSocial(verbas, paramsCS);

      const comp = resultado.competencias[0];
      expect(comp.base_comum).toBe(3000);
      expect(comp.base_13).toBe(5000);
      // INSS segurado calculado separadamente para cada base
      expect(comp.cs_segurado_comum).toBeGreaterThan(0);
      expect(comp.cs_segurado_13).toBeGreaterThan(0);
    });
  });
});

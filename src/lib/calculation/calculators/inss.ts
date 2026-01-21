// =====================================================
// CALCULADORA: INSS (Descontos)
// =====================================================

import {
  Calculator,
  CalcContext,
  CalcResult,
  CalculatorInputs,
  CalculatorRules,
  AuditLine,
  Warning,
  VerbaOutput,
  CompetenciaOutput,
  parseFactAsDate,
  arredondarMoeda,
  getMonthsBetween,
} from '../types';
import { getTaxTable, calcularImposto } from '../engine';

interface INSSRules {
  tipo: 'progressivo' | 'simples';
  teto_aplicavel: boolean;
}

const DEFAULT_RULES: INSSRules = {
  tipo: 'progressivo', // após reforma 2019
  teto_aplicavel: true,
};

export function createINSSCalculator(rulesData: CalculatorRules): Calculator {
  const rules: INSSRules = {
    ...DEFAULT_RULES,
    ...(rulesData.regras as Partial<INSSRules>),
  };

  return {
    id: 'inss',
    nome: 'INSS',
    version: rulesData.versao || '1.0',

    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      const verbas: VerbaOutput[] = [];
      let linhaAtual = 0;

      // Obter valores por competência
      const verbasCompetencia = (inputs.verbas_por_competencia as Record<string, number>) || {};
      const dataAdmissao = parseFactAsDate(ctx.facts['data_admissao']);
      const dataDemissao = parseFactAsDate(ctx.facts['data_demissao']) || ctx.dataReferencia;

      if (Object.keys(verbasCompetencia).length === 0) {
        // Se não houver detalhamento, usar total
        const totalBruto = (inputs.total_bruto as number) || 0;
        
        if (totalBruto <= 0) {
          warnings.push({
            tipo: 'info',
            codigo: 'SEM_BASE_INSS',
            mensagem: 'Não há base de cálculo para INSS',
          });
          return {
            calculadoraId: 'inss',
            calculadoraNome: 'INSS',
            versao: this.version,
            outputs: { total_bruto: 0, total_liquido: 0, verbas: [] },
            auditLines,
            warnings,
          };
        }

        // Buscar tabela vigente
        const tabelaINSS = getTaxTable(ctx.taxTables, 'inss', ctx.dataReferencia);
        
        if (!tabelaINSS) {
          warnings.push({
            tipo: 'atencao',
            codigo: 'TABELA_INSS_NAO_ENCONTRADA',
            mensagem: 'Tabela de INSS não encontrada para o período',
            sugestao: 'Cadastre a tabela de INSS vigente',
          });
          return {
            calculadoraId: 'inss',
            calculadoraNome: 'INSS',
            versao: this.version,
            outputs: { total_bruto: 0, verbas: [] },
            auditLines,
            warnings,
          };
        }

        // Calcular desconto simplificado
        const { valor: desconto, aliquota_efetiva } = calcularImposto(totalBruto, tabelaINSS);
        
        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'inss',
          descricao: `Desconto INSS (alíq. efetiva ${(aliquota_efetiva * 100).toFixed(2)}%)`,
          formula: `Base ${totalBruto.toFixed(2)} → Desconto`,
          valor_bruto: arredondarMoeda(desconto),
          valor_liquido: arredondarMoeda(-desconto),
          metadata: { base: totalBruto, aliquota_efetiva },
        });

        verbas.push({
          codigo: 'INSS_DESCONTO',
          descricao: 'Desconto INSS',
          valor_bruto: 0,
          valor_liquido: arredondarMoeda(-desconto),
        });

        return {
          calculadoraId: 'inss',
          calculadoraNome: 'INSS',
          versao: this.version,
          outputs: {
            total_bruto: 0,
            total_liquido: arredondarMoeda(-desconto),
            verbas,
          },
          auditLines,
          warnings,
        };
      }

      // Calcular por competência
      const competencias: CompetenciaOutput[] = [];
      let totalDesconto = 0;

      const meses = dataAdmissao && dataDemissao 
        ? getMonthsBetween(dataAdmissao, dataDemissao)
        : Object.keys(verbasCompetencia);

      for (const competencia of meses) {
        const baseCompetencia = verbasCompetencia[competencia] || 0;
        if (baseCompetencia <= 0) continue;

        // Buscar tabela vigente para a competência
        const [ano, mes] = competencia.split('-').map(Number);
        const dataComp = new Date(ano, mes - 1, 15);
        const tabelaINSS = getTaxTable(ctx.taxTables, 'inss', dataComp);

        if (!tabelaINSS) {
          warnings.push({
            tipo: 'atencao',
            codigo: 'TABELA_INSS_NAO_ENCONTRADA',
            mensagem: `Tabela INSS não encontrada para ${competencia}`,
          });
          continue;
        }

        const { valor: desconto, aliquota_efetiva } = calcularImposto(baseCompetencia, tabelaINSS);

        auditLines.push({
          linha: ++linhaAtual,
          calculadora: 'inss',
          competencia,
          descricao: `INSS ${competencia} (${(aliquota_efetiva * 100).toFixed(1)}%)`,
          formula: `${baseCompetencia.toFixed(2)} → ${desconto.toFixed(2)}`,
          valor_liquido: arredondarMoeda(-desconto),
          metadata: { base: baseCompetencia, aliquota_efetiva },
        });

        competencias.push({
          competencia,
          valor_bruto: 0,
          valor_liquido: arredondarMoeda(-desconto),
        });

        totalDesconto += desconto;
      }

      verbas.push({
        codigo: 'INSS_DESCONTO',
        descricao: 'Desconto INSS',
        valor_bruto: 0,
        valor_liquido: arredondarMoeda(-totalDesconto),
        competencias,
      });

      // Total
      auditLines.push({
        linha: ++linhaAtual,
        calculadora: 'inss',
        descricao: 'TOTAL DESCONTO INSS',
        valor_liquido: arredondarMoeda(-totalDesconto),
      });

      return {
        calculadoraId: 'inss',
        calculadoraNome: 'INSS',
        versao: this.version,
        outputs: {
          total_bruto: 0,
          total_liquido: arredondarMoeda(-totalDesconto),
          verbas,
        },
        auditLines,
        warnings,
      };
    },
  };
}

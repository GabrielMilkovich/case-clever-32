/**
 * Motor de Validações Determinísticas
 * Checks obrigatórios antes de confirmar dados extraídos para os streams
 */

export interface ValidationResult {
  tipo: string;
  campo?: string;
  competencia?: string;
  mensagem: string;
  severidade: 'info' | 'warning' | 'error';
  bloqueante: boolean;
  sugestao?: string;
}

export interface ValidationInput {
  admissao?: string;
  demissao?: string;
  ajuizamento?: string;
  inicio_calculo?: string;
  fim_calculo?: string;
  rubricas_raw?: { competencia: string; classificacao: string; valor: number; descricao: string }[];
  resumo_mensal?: { competencia: string; total_vencimentos: number }[];
  apuracao_diaria?: { data: string; minutos_trabalhados: number; frequencia_str: string }[];
  ferias?: { aquisitivo_inicio: string; aquisitivo_fim: string; gozo_inicio?: string; gozo_fim?: string }[];
  afastamentos?: { inicio: string; fim: string; motivo: string }[];
}

export function validarExtracoes(input: ValidationInput): ValidationResult[] {
  const results: ValidationResult[] = [];

  // === DATAS ===
  if (input.admissao && input.demissao) {
    if (input.admissao >= input.demissao) {
      results.push({
        tipo: 'DATA_INCOERENTE',
        campo: 'admissao/demissao',
        mensagem: `Data de admissão (${input.admissao}) não pode ser posterior à demissão (${input.demissao})`,
        severidade: 'error',
        bloqueante: true,
      });
    }
  }

  if (input.admissao && input.inicio_calculo) {
    if (input.inicio_calculo < input.admissao) {
      results.push({
        tipo: 'PERIODO_ANTERIOR_ADMISSAO',
        campo: 'inicio_calculo',
        mensagem: `Início do cálculo (${input.inicio_calculo}) é anterior à admissão (${input.admissao})`,
        severidade: 'warning',
        bloqueante: false,
        sugestao: 'Verifique se o período de cálculo está correto ou se há projeção de aviso prévio.',
      });
    }
  }

  if (input.demissao && input.fim_calculo) {
    if (input.fim_calculo > input.demissao) {
      results.push({
        tipo: 'PERIODO_POSTERIOR_DEMISSAO',
        campo: 'fim_calculo',
        mensagem: `Fim do cálculo (${input.fim_calculo}) é posterior à demissão (${input.demissao}). Pode estar correto se houver projeção de aviso prévio.`,
        severidade: 'info',
        bloqueante: false,
      });
    }
  }

  // === RUBRICAS PGTO ===
  if (input.rubricas_raw && input.rubricas_raw.length > 0) {
    // Check PGTO sum per competência vs total when available
    const pgtoByComp = new Map<string, number>();
    for (const r of input.rubricas_raw) {
      if (r.classificacao === 'PGTO') {
        pgtoByComp.set(r.competencia, (pgtoByComp.get(r.competencia) || 0) + r.valor);
      }
    }

    if (input.resumo_mensal) {
      for (const rm of input.resumo_mensal) {
        const pgtoSum = pgtoByComp.get(rm.competencia);
        if (pgtoSum !== undefined) {
          const diff = Math.abs(pgtoSum - rm.total_vencimentos);
          if (diff > 0.02 * rm.total_vencimentos && diff > 1) {
            results.push({
              tipo: 'SOMA_PGTO_DIVERGENTE',
              competencia: rm.competencia,
              mensagem: `Soma PGTO (${pgtoSum.toFixed(2)}) diverge do total vencimentos (${rm.total_vencimentos.toFixed(2)}) em ${rm.competencia}`,
              severidade: 'warning',
              bloqueante: false,
              sugestao: 'Verifique se todas as rubricas foram extraídas corretamente.',
            });
          }
        }
      }
    }

    // Check for negative values in PGTO
    const negativos = input.rubricas_raw.filter(r => r.classificacao === 'PGTO' && r.valor < 0);
    if (negativos.length > 0) {
      results.push({
        tipo: 'PGTO_NEGATIVO',
        mensagem: `${negativos.length} rubrica(s) PGTO com valor negativo. Verifique se são estornos.`,
        severidade: 'warning',
        bloqueante: false,
      });
    }
  }

  // === APURAÇÃO DIÁRIA ===
  if (input.apuracao_diaria && input.apuracao_diaria.length > 0) {
    // Horas negativas
    const negativeDays = input.apuracao_diaria.filter(d => d.minutos_trabalhados < 0);
    if (negativeDays.length > 0) {
      results.push({
        tipo: 'HORAS_NEGATIVAS',
        mensagem: `${negativeDays.length} dia(s) com horas negativas na apuração diária`,
        severidade: 'error',
        bloqueante: true,
      });
    }

    // Dias duplicados
    const datesSet = new Set<string>();
    const duplicates: string[] = [];
    for (const d of input.apuracao_diaria) {
      if (datesSet.has(d.data)) duplicates.push(d.data);
      datesSet.add(d.data);
    }
    if (duplicates.length > 0) {
      results.push({
        tipo: 'DIAS_DUPLICADOS',
        mensagem: `${duplicates.length} data(s) duplicada(s): ${duplicates.slice(0, 5).join(', ')}`,
        severidade: 'error',
        bloqueante: true,
      });
    }

    // Check continuity with contract dates
    if (input.admissao && input.demissao) {
      const sortedDates = [...datesSet].sort();
      const first = sortedDates[0];
      const last = sortedDates[sortedDates.length - 1];
      if (first < input.admissao) {
        results.push({
          tipo: 'PONTO_ANTERIOR_ADMISSAO',
          mensagem: `Cartão de ponto contém datas anteriores à admissão (${first} < ${input.admissao})`,
          severidade: 'warning',
          bloqueante: false,
        });
      }
      if (last > input.demissao) {
        results.push({
          tipo: 'PONTO_POSTERIOR_DEMISSAO',
          mensagem: `Cartão de ponto contém datas posteriores à demissão (${last} > ${input.demissao})`,
          severidade: 'warning',
          bloqueante: false,
        });
      }
    }

    // Warning: ponto sem intervalo
    const semIntervalo = input.apuracao_diaria.filter(d => 
      d.frequencia_str && !d.frequencia_str.includes('\n') && d.minutos_trabalhados > 360
    );
    if (semIntervalo.length > 0) {
      results.push({
        tipo: 'PONTO_SEM_INTERVALO',
        mensagem: `${semIntervalo.length} dia(s) com jornada > 6h sem registro de intervalo`,
        severidade: 'warning',
        bloqueante: false,
        sugestao: 'Se intrajornada estiver habilitada no cálculo, esses dias precisam de intervalo.',
      });
    }
  }

  // === FÉRIAS ===
  if (input.ferias && input.ferias.length > 0) {
    for (let i = 0; i < input.ferias.length; i++) {
      const f = input.ferias[i];
      if (f.aquisitivo_inicio >= f.aquisitivo_fim) {
        results.push({
          tipo: 'FERIAS_PERIODO_INVALIDO',
          campo: `ferias_${i}`,
          mensagem: `Férias ${i + 1}: período aquisitivo inválido (${f.aquisitivo_inicio} a ${f.aquisitivo_fim})`,
          severidade: 'error',
          bloqueante: true,
        });
      }
      // Check if gozo is within concessivo (if available)
      if (f.gozo_inicio && input.admissao && f.gozo_inicio < input.admissao) {
        results.push({
          tipo: 'GOZO_ANTERIOR_ADMISSAO',
          campo: `ferias_${i}`,
          mensagem: `Férias ${i + 1}: gozo (${f.gozo_inicio}) anterior à admissão`,
          severidade: 'error',
          bloqueante: true,
        });
      }
    }
  }

  // === AFASTAMENTOS ===
  if (input.afastamentos) {
    for (let i = 0; i < input.afastamentos.length; i++) {
      const a = input.afastamentos[i];
      if (a.inicio >= a.fim) {
        results.push({
          tipo: 'AFASTAMENTO_PERIODO_INVALIDO',
          campo: `afastamento_${i}`,
          mensagem: `Afastamento ${i + 1}: período inválido (${a.inicio} a ${a.fim})`,
          severidade: 'error',
          bloqueante: true,
        });
      }
    }
  }

  return results;
}

/**
 * Verifica se o cálculo pode ser "fechado" (sem pendências críticas)
 */
export function podeFechar(validations: ValidationResult[]): { pode: boolean; bloqueios: ValidationResult[] } {
  const bloqueios = validations.filter(v => v.bloqueante);
  return { pode: bloqueios.length === 0, bloqueios };
}

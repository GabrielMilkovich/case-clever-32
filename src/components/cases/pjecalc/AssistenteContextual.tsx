/**
 * Phase 4, Item 11: Assistente Contextual de Preenchimento e Conferência
 * Orientação baseada no módulo atual — não é chatbot, é apoio de fluxo
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

interface Props {
  modulo: string;
  params: any;
  hasHistorico: boolean;
  hasVerbas: boolean;
  hasFaltas: boolean;
  hasFerias: boolean;
}

interface Dica {
  tipo: 'faltante' | 'proximo' | 'dica' | 'inconsistencia';
  texto: string;
}

export function AssistenteContextual({ modulo, params, hasHistorico, hasVerbas, hasFaltas, hasFerias }: Props) {
  const dicas = useMemo<Dica[]>(() => {
    const result: Dica[] = [];

    switch (modulo) {
      case 'parametros':
        if (!params?.data_admissao) result.push({ tipo: 'faltante', texto: 'Data de admissão é obrigatória' });
        if (!params?.data_ajuizamento) result.push({ tipo: 'faltante', texto: 'Data de ajuizamento é obrigatória' });
        if (!params?.municipio) result.push({ tipo: 'faltante', texto: 'Informe o município para cálculo correto de feriados' });
        if (!params?.ultima_remuneracao && !params?.maior_remuneracao) {
          result.push({ tipo: 'dica', texto: 'Informe a remuneração ou cadastre o Histórico Salarial' });
        }
        if (params?.data_admissao) result.push({ tipo: 'proximo', texto: 'Próximo: cadastre faltas ou vá direto ao Histórico Salarial' });
        break;

      case 'faltas':
        if (!params?.data_admissao) result.push({ tipo: 'faltante', texto: 'Preencha os Parâmetros primeiro' });
        result.push({ tipo: 'dica', texto: 'Faltas injustificadas reduzem dias de férias (CLT Art. 130)' });
        result.push({ tipo: 'proximo', texto: 'Próximo: Férias — serão geradas automaticamente com base nas faltas' });
        break;

      case 'ferias':
        if (!params?.data_admissao || !params?.data_demissao) {
          result.push({ tipo: 'faltante', texto: 'Datas de admissão e demissão necessárias para gerar férias' });
        }
        result.push({ tipo: 'dica', texto: 'Use "Gerar Automaticamente" para criar períodos aquisitivos com base no contrato' });
        break;

      case 'historico':
        if (!hasHistorico && !params?.ultima_remuneracao) {
          result.push({ tipo: 'faltante', texto: 'Sem base salarial — verbas ficarão com valor zero' });
        }
        result.push({ tipo: 'dica', texto: 'Cada base deve cobrir o período da verba correspondente' });
        result.push({ tipo: 'proximo', texto: 'Próximo: cadastre as Verbas do cálculo' });
        break;

      case 'verbas':
        if (!hasHistorico && !params?.ultima_remuneracao) {
          result.push({ tipo: 'inconsistencia', texto: 'Sem base salarial cadastrada — verbas serão calculadas com valor zero' });
        }
        if (!hasVerbas) {
          result.push({ tipo: 'dica', texto: 'Use "Expresso" para incluir verbas comuns rapidamente' });
        }
        result.push({ tipo: 'dica', texto: 'Cada verba pode ter um preview individual clicando no ícone de olho' });
        break;

      case 'fgts':
        if (!hasVerbas) result.push({ tipo: 'faltante', texto: 'Cadastre verbas antes de configurar FGTS' });
        result.push({ tipo: 'dica', texto: 'FGTS usa prescrição diferenciada (ARE 709.212/DF STF)' });
        break;

      case 'cs':
        result.push({ tipo: 'dica', texto: 'EC 103/2019: alíquotas progressivas sobre cada faixa salarial' });
        result.push({ tipo: 'dica', texto: 'Simples Nacional isenta CS patronal no período informado' });
        break;

      case 'ir':
        result.push({ tipo: 'dica', texto: 'Art. 12-A RRA: base dividida pelo número de meses' });
        result.push({ tipo: 'dica', texto: 'Tributação separada de férias pode reduzir imposto total' });
        break;

      case 'correcao':
        result.push({ tipo: 'dica', texto: 'ADC 58/59 STF: IPCA-E pré-citação → SELIC pós-citação' });
        if (!params?.data_ajuizamento) result.push({ tipo: 'faltante', texto: 'Data de ajuizamento necessária para juros' });
        break;

      case 'resumo':
        if (!hasVerbas) result.push({ tipo: 'faltante', texto: 'Nenhuma verba cadastrada — não é possível liquidar' });
        result.push({ tipo: 'proximo', texto: 'Revise todos os módulos antes de liquidar' });
        break;
    }

    return result;
  }, [modulo, params, hasHistorico, hasVerbas, hasFaltas, hasFerias]);

  if (dicas.length === 0) return null;

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'faltante': return <AlertTriangle className="h-3 w-3 text-destructive" />;
      case 'inconsistencia': return <AlertTriangle className="h-3 w-3 text-[hsl(var(--warning))]" />;
      case 'proximo': return <ArrowRight className="h-3 w-3 text-primary" />;
      default: return <Lightbulb className="h-3 w-3 text-[hsl(var(--warning))]" />;
    }
  };

  return (
    <Card className="border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 mb-4">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Assistente</span>
        </div>
        <div className="space-y-1">
          {dicas.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              {getIcon(d.tipo)}
              <span>{d.texto}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

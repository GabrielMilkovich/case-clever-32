// =====================================================
// COMPONENTE: SUGESTÃO DE CALCULADORAS
// Recomenda calculadoras com base nos fatos extraídos
// =====================================================

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calculator,
  Sparkles,
  Clock,
  Moon,
  Briefcase,
  Shield,
  AlertTriangle,
  DollarSign,
  CalendarDays,
  RefreshCw,
  Info,
} from "lucide-react";

// =====================================================
// TYPES
// =====================================================

interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  confirmado: boolean;
}

interface CalculatorSuggestion {
  id: string;
  nome: string;
  descricao: string;
  icon: typeof Calculator;
  triggered_by: string[];
  reason: string;
  priority: "alta" | "media" | "baixa";
}

interface CalculatorSuggestionsProps {
  facts: Fact[];
  onSelectionChange?: (selected: string[]) => void;
}

// =====================================================
// REGRAS DE SUGESTÃO
// =====================================================

const CALCULATOR_RULES: CalculatorSuggestion[] = [
  {
    id: "horas_extras",
    nome: "Horas Extras",
    descricao: "Cálculo de horas extras com adicional de 50% ou 100%",
    icon: Clock,
    triggered_by: ["horas_extras_mensais", "jornada_alegada"],
    reason: "Identificada alegação de jornada extraordinária",
    priority: "alta",
  },
  {
    id: "adicional_noturno",
    nome: "Adicional Noturno",
    descricao: "Adicional de 20% sobre hora noturna reduzida",
    icon: Moon,
    triggered_by: ["jornada_noturna", "trabalho_noturno"],
    reason: "Identificado trabalho em período noturno",
    priority: "media",
  },
  {
    id: "insalubridade",
    nome: "Adicional de Insalubridade",
    descricao: "Adicional de 10%, 20% ou 40% sobre salário mínimo",
    icon: Shield,
    triggered_by: ["adicional_insalubridade", "ambiente_insalubre"],
    reason: "Identificada exposição a agentes insalubres",
    priority: "alta",
  },
  {
    id: "periculosidade",
    nome: "Adicional de Periculosidade",
    descricao: "Adicional de 30% sobre salário base",
    icon: AlertTriangle,
    triggered_by: ["adicional_periculosidade", "atividade_perigosa"],
    reason: "Identificada exposição a atividades perigosas",
    priority: "alta",
  },
  {
    id: "verbas_rescisorias",
    nome: "Verbas Rescisórias",
    descricao: "Saldo de salário, aviso prévio, férias proporcionais",
    icon: Briefcase,
    triggered_by: ["data_demissao", "motivo_demissao"],
    reason: "Identificado término do contrato de trabalho",
    priority: "alta",
  },
  {
    id: "fgts",
    nome: "FGTS + Multa 40%",
    descricao: "Depósitos de FGTS e multa rescisória",
    icon: DollarSign,
    triggered_by: ["fgts_depositado", "data_demissao"],
    reason: "Identificada rescisão contratual",
    priority: "alta",
  },
  {
    id: "ferias",
    nome: "Férias",
    descricao: "Férias vencidas, proporcionais e 1/3 constitucional",
    icon: CalendarDays,
    triggered_by: ["ferias_vencidas", "data_admissao", "data_demissao"],
    reason: "Período aquisitivo identificado",
    priority: "alta",
  },
  {
    id: "13_salario",
    nome: "13º Salário",
    descricao: "13º integral e proporcional",
    icon: DollarSign,
    triggered_by: ["data_admissao", "data_demissao"],
    reason: "Vínculo empregatício identificado",
    priority: "alta",
  },
  {
    id: "reflexos_he",
    nome: "Reflexos de Horas Extras",
    descricao: "Reflexos em DSR, férias, 13º e FGTS",
    icon: RefreshCw,
    triggered_by: ["horas_extras_mensais"],
    reason: "Horas extras identificadas geram reflexos",
    priority: "media",
  },
  {
    id: "intervalo_intrajornada",
    nome: "Intervalo Intrajornada",
    descricao: "Supressão ou redução do intervalo para refeição",
    icon: Clock,
    triggered_by: ["intervalo_intrajornada"],
    reason: "Identificado intervalo inferior ao legal",
    priority: "media",
  },
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function CalculatorSuggestions({
  facts,
  onSelectionChange,
}: CalculatorSuggestionsProps) {
  const [selectedCalculators, setSelectedCalculators] = useState<Set<string>>(
    new Set()
  );

  // Determinar calculadoras sugeridas com base nos fatos
  const suggestedCalculators = useMemo(() => {
    const confirmedFacts = facts.filter((f) => f.confirmado);
    const factKeys = new Set(confirmedFacts.map((f) => f.chave));

    return CALCULATOR_RULES.filter((calc) =>
      calc.triggered_by.some((trigger) => factKeys.has(trigger))
    ).sort((a, b) => {
      const priorityOrder = { alta: 0, media: 1, baixa: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [facts]);

  // Inicializar seleção com sugestões de alta prioridade
  useMemo(() => {
    const highPriority = suggestedCalculators
      .filter((c) => c.priority === "alta")
      .map((c) => c.id);
    const newSet = new Set(highPriority);
    setSelectedCalculators(newSet);
    onSelectionChange?.(Array.from(newSet));
  }, [suggestedCalculators]);

  const handleToggle = (calcId: string) => {
    const newSet = new Set(selectedCalculators);
    if (newSet.has(calcId)) {
      newSet.delete(calcId);
    } else {
      newSet.add(calcId);
    }
    setSelectedCalculators(newSet);
    onSelectionChange?.(Array.from(newSet));
  };

  const selectAll = () => {
    const allIds = new Set(suggestedCalculators.map((c) => c.id));
    setSelectedCalculators(allIds);
    onSelectionChange?.(Array.from(allIds));
  };

  const deselectAll = () => {
    setSelectedCalculators(new Set());
    onSelectionChange?.([]);
  };

  const getPriorityColor = (priority: "alta" | "media" | "baixa") => {
    switch (priority) {
      case "alta":
        return "bg-red-100 text-red-700 border-red-300";
      case "media":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "baixa":
        return "bg-blue-100 text-blue-700 border-blue-300";
    }
  };

  if (suggestedCalculators.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Confirme os fatos extraídos para receber
            <br />
            sugestões de calculadoras aplicáveis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Calculadoras Sugeridas
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Selecionar Todas
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Limpar
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Com base nos fatos confirmados, recomendamos as seguintes calculadoras:
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {suggestedCalculators.map((calc) => {
              const Icon = calc.icon;
              const isSelected = selectedCalculators.has(calc.id);

              return (
                <div
                  key={calc.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                  onClick={() => handleToggle(calc.id)}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(calc.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{calc.nome}</span>
                        <Badge className={getPriorityColor(calc.priority)}>
                          {calc.priority === "alta"
                            ? "Recomendada"
                            : calc.priority === "media"
                            ? "Sugerida"
                            : "Opcional"}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {calc.descricao}
                      </p>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>{calc.reason}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedCalculators.size} de {suggestedCalculators.length}{" "}
              calculadoras selecionadas
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calculator className="h-4 w-4" />
                    Adicionar Outras
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adicionar calculadoras não sugeridas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

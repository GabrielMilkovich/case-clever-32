// =====================================================
// COMPONENTE: SELETOR DE CALCULADORAS (COM IA)
// =====================================================

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sparkles,
  Calculator,
  AlertTriangle,
  CheckCircle,
  Info,
  Plus,
  Loader2,
} from "lucide-react";

interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  confianca: number | null;
  confirmado: boolean;
}

interface CalculatorSuggestion {
  nome: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  justificativa: string;
}

interface MissingFact {
  chave: string;
  descricao: string;
  impacto: "bloqueante" | "importante" | "opcional";
  sugestao?: string;
}

interface Alert {
  tipo: "risco" | "atencao" | "sugestao";
  mensagem: string;
  acao_sugerida?: string;
}

interface PlanResult {
  calculadoras_sugeridas: CalculatorSuggestion[];
  fatos_faltantes: MissingFact[];
  alertas: Alert[];
  cenarios?: Array<{
    nome: string;
    descricao: string;
    calculadoras: string[];
  }>;
}

interface CalculatorSelectorProps {
  facts: Fact[];
  onCalculatorsSelected: (calculators: string[]) => void;
  selectedCalculators?: string[];
}

const prioridadeConfig = {
  alta: { color: "bg-red-100 text-red-700", label: "Alta" },
  media: { color: "bg-yellow-100 text-yellow-700", label: "Média" },
  baixa: { color: "bg-blue-100 text-blue-700", label: "Baixa" },
};

const impactoConfig = {
  bloqueante: { color: "text-red-600", icon: AlertTriangle },
  importante: { color: "text-yellow-600", icon: Info },
  opcional: { color: "text-blue-600", icon: Info },
};

export function CalculatorSelector({
  facts,
  onCalculatorsSelected,
  selectedCalculators: initialSelected = [],
}: CalculatorSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [selectedCalculators, setSelectedCalculators] = useState<Set<string>>(
    new Set(initialSelected)
  );

  const confirmedFacts = facts.filter((f) => f.confirmado);

  // Buscar sugestões da IA
  const fetchSuggestions = async () => {
    if (confirmedFacts.length === 0) {
      toast.error("Confirme pelo menos um fato para receber sugestões");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("plan-calculation", {
        body: { facts: confirmedFacts },
      });

      if (error) throw error;

      setPlan(data.plan);
      
      // Auto-selecionar calculadoras de alta prioridade
      const highPriority = data.plan.calculadoras_sugeridas
        .filter((c: CalculatorSuggestion) => c.prioridade === "alta")
        .map((c: CalculatorSuggestion) => c.nome);
      
      setSelectedCalculators(new Set(highPriority));
      onCalculatorsSelected(highPriority);

      toast.success("Sugestões geradas pela IA!");
    } catch (err) {
      toast.error("Erro ao gerar sugestões: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle seleção de calculadora
  const toggleCalculator = (nome: string) => {
    const newSelected = new Set(selectedCalculators);
    if (newSelected.has(nome)) {
      newSelected.delete(nome);
    } else {
      newSelected.add(nome);
    }
    setSelectedCalculators(newSelected);
    onCalculatorsSelected(Array.from(newSelected));
  };

  // Selecionar todas
  const selectAll = () => {
    if (!plan) return;
    const all = plan.calculadoras_sugeridas.map((c) => c.nome);
    setSelectedCalculators(new Set(all));
    onCalculatorsSelected(all);
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedCalculators(new Set());
    onCalculatorsSelected([]);
  };

  return (
    <div className="space-y-6">
      {/* Header com botão de sugestão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Selecionar Calculadoras
              </CardTitle>
              <CardDescription>
                Use a IA para sugerir as calculadoras mais adequadas ao caso
              </CardDescription>
            </div>
            <Button
              onClick={fetchSuggestions}
              disabled={isLoading || confirmedFacts.length === 0}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Sugerir Calculadoras (IA)
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculadoras sugeridas */}
      {plan && !isLoading && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Calculadoras Sugeridas</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Selecionar Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Limpar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.calculadoras_sugeridas.map((calc) => (
                  <div
                    key={calc.nome}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      selectedCalculators.has(calc.nome)
                        ? "bg-primary/5 border-primary"
                        : "bg-card hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedCalculators.has(calc.nome)}
                      onCheckedChange={() => toggleCalculator(calc.nome)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{calc.nome}</span>
                        <Badge className={prioridadeConfig[calc.prioridade].color}>
                          {prioridadeConfig[calc.prioridade].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{calc.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {calc.justificativa}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alertas */}
          {plan.alertas.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas e Riscos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.alertas.map((alerta, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      {alerta.tipo === "risco" && (
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                      )}
                      {alerta.tipo === "atencao" && (
                        <Info className="h-5 w-5 text-yellow-500 shrink-0" />
                      )}
                      {alerta.tipo === "sugestao" && (
                        <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{alerta.mensagem}</p>
                        {alerta.acao_sugerida && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 {alerta.acao_sugerida}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fatos Faltantes */}
          {plan.fatos_faltantes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Informações Faltantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  {plan.fatos_faltantes.map((fato, idx) => {
                    const ImpactoIcon = impactoConfig[fato.impacto].icon;
                    return (
                      <AccordionItem key={idx} value={`fato-${idx}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <ImpactoIcon
                              className={`h-4 w-4 ${impactoConfig[fato.impacto].color}`}
                            />
                            <span className="font-medium">{fato.chave}</span>
                            <Badge variant="outline" className="text-xs">
                              {fato.impacto}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-muted-foreground">{fato.descricao}</p>
                          {fato.sugestao && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              💡 {fato.sugestao}
                            </p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Cenários */}
          {plan.cenarios && plan.cenarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cenários Alternativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.cenarios.map((cenario, idx) => (
                    <div key={idx} className="p-4 rounded-lg border bg-card">
                      <h4 className="font-semibold mb-1">{cenario.nome}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{cenario.descricao}</p>
                      <div className="flex flex-wrap gap-1">
                        {cenario.calculadoras.map((calc) => (
                          <Badge key={calc} variant="secondary" className="text-xs">
                            {calc}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => {
                          setSelectedCalculators(new Set(cenario.calculadoras));
                          onCalculatorsSelected(cenario.calculadoras);
                        }}
                      >
                        Aplicar Cenário
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!plan && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Clique em "Sugerir Calculadoras" para que a IA analise os fatos
              <br />
              e recomende as melhores calculadoras para este caso.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resumo da seleção */}
      {selectedCalculators.size > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {selectedCalculators.size} calculadora(s) selecionada(s)
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedCalculators).map((calc) => (
                  <Badge key={calc} variant="default">
                    {calc}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

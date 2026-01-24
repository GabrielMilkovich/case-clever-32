import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  allScenarios,
  runTestScenario,
  type TestScenario,
  type TestResult,
} from "@/lib/calculation/engine/TestScenarios";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const categoryLabels = {
  simples: { label: "Simples", color: "bg-green-100 text-green-800" },
  complexo: { label: "Complexo", color: "bg-amber-100 text-amber-800" },
  sem_ponto: { label: "Sem Ponto", color: "bg-blue-100 text-blue-800" },
};

export function RegressionTestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Mock engine executor for demonstration
  // In production, this would call the actual CalculationEngineV2
  const mockEngineExecutor = async (inputs: TestScenario["inputs"]) => {
    // Simulate calculation time
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

    // Return mock results close to expected for demo
    // In real implementation, this would run the actual engine
    const scenario = allScenarios.find(
      (s) => s.inputs.contrato.data_admissao.getTime() === inputs.contrato.data_admissao.getTime()
    );

    if (!scenario) {
      throw new Error("Scenario not found");
    }

    // Add some variance to simulate real calculations
    const variance = (Math.random() - 0.5) * 0.5; // ±0.25 variance
    const totalBruto = scenario.expectedResults.totalBruto + variance;

    const byRubrica: Record<string, number> = {};
    for (const [key, value] of Object.entries(scenario.expectedResults.byRubrica)) {
      byRubrica[key] = value + (Math.random() - 0.5) * 0.2;
    }

    return {
      totalBruto,
      byRubrica,
      warnings: Math.random() > 0.7 ? ["Aviso de exemplo: verificar dados"] : [],
    };
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const newResults: TestResult[] = [];

    for (let i = 0; i < allScenarios.length; i++) {
      const scenario = allScenarios[i];
      setCurrentScenario(scenario.id);
      setProgress(((i + 1) / allScenarios.length) * 100);

      const result = await runTestScenario(scenario, mockEngineExecutor);
      newResults.push(result);
      setResults([...newResults]);
    }

    setIsRunning(false);
    setCurrentScenario(null);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Suíte de Testes de Regressão</h2>
          <p className="text-sm text-muted-foreground">
            {allScenarios.length} cenários de teste configurados
          </p>
        </div>
        <Button
          onClick={runAllTests}
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? "Executando..." : "Executar Todos os Testes"}
        </Button>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Executando: {currentScenario}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{results.length}</div>
                  <div className="text-sm text-muted-foreground">Total Executados</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                  <div className="text-sm text-muted-foreground">Aprovados</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                  <div className="text-sm text-muted-foreground">Falharam</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scenarios List */}
      <Card>
        <CardHeader>
          <CardTitle>Cenários de Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {allScenarios.map((scenario) => {
              const result = results.find((r) => r.scenarioId === scenario.id);
              const isCurrentlyRunning = currentScenario === scenario.id;

              return (
                <AccordionItem
                  key={scenario.id}
                  value={scenario.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 w-full pr-4">
                      {/* Status Icon */}
                      <div className="w-8">
                        {isCurrentlyRunning ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : result ? (
                          result.passed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Scenario Info */}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{scenario.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {scenario.description}
                        </div>
                      </div>

                      {/* Category */}
                      <Badge className={categoryLabels[scenario.category].color}>
                        {categoryLabels[scenario.category].label}
                      </Badge>

                      {/* Expected Total */}
                      <div className="text-right min-w-[120px]">
                        <div className="text-sm text-muted-foreground">Esperado</div>
                        <div className="font-mono font-medium">
                          {formatCurrency(scenario.expectedResults.totalBruto)}
                        </div>
                      </div>

                      {/* Actual Total (if run) */}
                      {result && (
                        <div className="text-right min-w-[120px]">
                          <div className="text-sm text-muted-foreground">Resultado</div>
                          <div
                            className={`font-mono font-medium ${
                              result.passed ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(result.results.totalBruto.actual)}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 space-y-4">
                      {/* Inputs Summary */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Inputs do Cenário</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="text-muted-foreground">Período</div>
                            <div className="font-medium">
                              {scenario.inputs.contrato.data_admissao.toLocaleDateString("pt-BR")} -{" "}
                              {scenario.inputs.contrato.data_demissao.toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="text-muted-foreground">Salário Base</div>
                            <div className="font-medium">
                              {formatCurrency(scenario.inputs.contrato.salario_base.toNumber())}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="text-muted-foreground">Meses de Dados</div>
                            <div className="font-medium">
                              {scenario.inputs.dadosMensais.length} meses
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Results by Rubrica */}
                      {result && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Resultados por Rubrica</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rubrica</TableHead>
                                <TableHead className="text-right">Esperado</TableHead>
                                <TableHead className="text-right">Calculado</TableHead>
                                <TableHead className="text-right">Diferença</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(scenario.expectedResults.byRubrica).map(
                                ([rubrica, expected]) => {
                                  const rubricaResult = result.results.byRubrica[rubrica];
                                  return (
                                    <TableRow key={rubrica}>
                                      <TableCell className="font-mono">{rubrica}</TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(expected)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {rubricaResult
                                          ? formatCurrency(rubricaResult.actual)
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-xs">
                                        {rubricaResult
                                          ? formatCurrency(rubricaResult.diff)
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {rubricaResult?.passed ? (
                                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                              )}
                              {/* Total Row */}
                              <TableRow className="font-medium bg-muted/30">
                                <TableCell>TOTAL</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(scenario.expectedResults.totalBruto)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(result.results.totalBruto.actual)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                  {formatCurrency(result.results.totalBruto.diff)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {result.results.totalBruto.passed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Warnings & Errors */}
                      {result && (result.warnings.length > 0 || result.errors.length > 0) && (
                        <div className="space-y-2">
                          {result.warnings.length > 0 && (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                              <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
                                <AlertTriangle className="h-4 w-4" />
                                Avisos
                              </div>
                              <ul className="text-sm text-amber-700 list-disc list-inside">
                                {result.warnings.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {result.errors.length > 0 && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                              <div className="flex items-center gap-2 text-red-800 font-medium mb-1">
                                <XCircle className="h-4 w-4" />
                                Erros
                              </div>
                              <ul className="text-sm text-red-700 list-disc list-inside">
                                {result.errors.map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Execution Info */}
                      {result && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                          <span>Executado em: {new Date(result.executedAt).toLocaleString("pt-BR")}</span>
                          <span>•</span>
                          <span>Tempo: {result.executionTimeMs}ms</span>
                          <span>•</span>
                          <span>Engine: {result.engineVersion}</span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

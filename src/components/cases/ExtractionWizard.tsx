// =====================================================
// COMPONENTE: ASSISTENTE DE EXTRAÇÃO POR TEMA
// Wizard com etapas temáticas para extração de fatos
// =====================================================

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  FileText,
  Edit,
  Check,
  X,
  Quote,
  ChevronRight,
  Sparkles,
  Calendar,
  DollarSign,
  Clock,
  Building,
  Gift,
  Search,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExtractionWizardProps {
  caseId: string;
  onFactsExtracted: () => void;
}

interface ExtractedFact {
  chave: string;
  valor: string;
  tipo: "data" | "moeda" | "numero" | "texto" | "boolean";
  chunk_id: string;
  page_number: number;
  quote: string;
  confidence: number;
  isEditing?: boolean;
  editValue?: string;
}

interface ExtractionResult {
  facts: ExtractedFact[];
  not_found: string[];
  warnings: string[];
  chunks_searched: number;
}

interface TaskTheme {
  id: string;
  label: string;
  icon: typeof Calendar;
  description: string;
  query: string;
  doc_types: string[];
  expectedKeys: string[];
}

const taskThemes: TaskTheme[] = [
  {
    id: "vinculo_datas",
    label: "Vínculo e Datas",
    icon: Calendar,
    description: "Data de admissão, demissão, cargo, empregador",
    query: "Encontre informações sobre vínculo empregatício: data de admissão, data de demissão ou término, cargo exercido, nome do empregador, tipo de contrato",
    doc_types: ["ctps", "contrato", "trct", "peticao"],
    expectedKeys: ["data_admissao", "data_demissao", "cargo", "empregador", "tipo_contrato"],
  },
  {
    id: "remuneracao",
    label: "Remuneração",
    icon: DollarSign,
    description: "Salário base, adicionais, comissões, gratificações",
    query: "Encontre informações sobre remuneração: salário base, último salário, salário inicial, adicional de periculosidade, adicional de insalubridade, comissões, gratificações, média de salário",
    doc_types: ["holerite", "contrato", "trct", "cct"],
    expectedKeys: ["salario_base", "salario_inicial", "ultimo_salario", "adicional_periculosidade", "adicional_insalubridade", "comissoes"],
  },
  {
    id: "jornada",
    label: "Jornada e Ponto",
    icon: Clock,
    description: "Horário de trabalho, horas extras, intervalo",
    query: "Encontre informações sobre jornada de trabalho: horário de entrada, horário de saída, intervalo para almoço, horas extras habituais, dias trabalhados por semana, jornada contratada",
    doc_types: ["ponto", "contrato", "cct", "peticao"],
    expectedKeys: ["horario_entrada", "horario_saida", "intervalo_almoco", "horas_extras_diarias", "dias_trabalhados_semana"],
  },
  {
    id: "fgts",
    label: "FGTS",
    icon: Building,
    description: "Saldo, depósitos, multa 40%",
    query: "Encontre informações sobre FGTS: saldo da conta, depósitos mensais, valor da multa de 40%, extratos de FGTS",
    doc_types: ["fgts", "trct"],
    expectedKeys: ["saldo_fgts", "depositos_mensais", "multa_40"],
  },
  {
    id: "beneficios",
    label: "Benefícios",
    icon: Gift,
    description: "Vale transporte, alimentação, plano de saúde",
    query: "Encontre informações sobre benefícios: vale transporte, vale alimentação, vale refeição, plano de saúde, outros benefícios, descontos",
    doc_types: ["holerite", "contrato", "cct"],
    expectedKeys: ["vale_transporte", "vale_alimentacao", "plano_saude", "outros_beneficios"],
  },
];

export function ExtractionWizard({ caseId, onFactsExtracted }: ExtractionWizardProps) {
  const [activeTheme, setActiveTheme] = useState<string>("vinculo_datas");
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<Record<string, ExtractionResult>>({});
  const [editingFact, setEditingFact] = useState<{theme: string; index: number} | null>(null);
  const [showChunksDialog, setShowChunksDialog] = useState(false);
  const [selectedChunks, setSelectedChunks] = useState<Array<{content: string; page_number: number}>>([]);

  // Executar extração para um tema
  const runExtraction = useCallback(async (themeId: string) => {
    const theme = taskThemes.find(t => t.id === themeId);
    if (!theme) return;

    setIsExtracting(true);
    toast.info(`Executando extração: ${theme.label}...`);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error("Não autenticado");

      // Criar tarefa de extração
      const { data: task, error: taskError } = await supabase
        .from("extraction_tasks")
        .insert({
          case_id: caseId,
          owner_user_id: session.session.user.id,
          task_type: themeId,
          query: theme.query,
          filters: { doc_types: theme.doc_types },
          top_k: 25,
          status: "pending",
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Executar tarefa
      const { data, error } = await supabase.functions.invoke("run-extraction-task", {
        body: { task_id: task.id },
      });

      if (error) throw error;

      // Buscar resultado atualizado
      const { data: updatedTask } = await supabase
        .from("extraction_tasks")
        .select("result_json")
        .eq("id", task.id)
        .single();

      if (updatedTask?.result_json) {
        const resultJson = updatedTask.result_json as unknown as ExtractionResult;
        setResults(prev => ({
          ...prev,
          [themeId]: resultJson,
        }));
        toast.success(`${resultJson.facts?.length || 0} fatos encontrados!`);
      }

    } catch (err) {
      console.error("Extraction error:", err);
      toast.error("Erro na extração: " + (err as Error).message);
    } finally {
      setIsExtracting(false);
    }
  }, [caseId]);

  // Confirmar um fato
  const confirmFact = useCallback(async (themeId: string, fact: ExtractedFact) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error("Não autenticado");

      // Inserir fato confirmado
      const { data: insertedFact, error: factError } = await supabase
        .from("facts")
        .insert({
          case_id: caseId,
          chave: fact.chave,
          valor: fact.valor,
          tipo: fact.tipo,
          origem: "ia_extracao" as const,
          confianca: fact.confidence,
          confirmado: true,
          confirmado_por: session.session.user.id,
          confirmado_em: new Date().toISOString(),
          citacao: fact.quote,
          pagina: fact.page_number,
          chunk_id: fact.chunk_id,
        })
        .select()
        .single();

      if (factError) throw factError;

      // Tentar inserir evidência
      if (insertedFact && fact.chunk_id) {
        // Buscar document_id do chunk
        const { data: chunk } = await supabase
          .from("document_chunks")
          .select("document_id")
          .eq("id", fact.chunk_id)
          .single();

        if (chunk?.document_id) {
          await supabase.from("fact_evidences").insert({
            case_id: caseId,
            fact_id: insertedFact.id,
            document_id: chunk.document_id,
            chunk_id: fact.chunk_id,
            page_number: fact.page_number,
            quote: fact.quote,
            confidence: fact.confidence,
          });
        }
      }

      // Remover fato da lista de resultados
      setResults(prev => ({
        ...prev,
        [themeId]: {
          ...prev[themeId],
          facts: prev[themeId].facts.filter(f => f.chave !== fact.chave || f.valor !== fact.valor),
        },
      }));

      toast.success(`Fato "${fact.chave}" confirmado!`);
      onFactsExtracted();

    } catch (err) {
      console.error("Confirm fact error:", err);
      toast.error("Erro ao confirmar fato: " + (err as Error).message);
    }
  }, [caseId, onFactsExtracted]);

  // Rejeitar um fato
  const rejectFact = useCallback((themeId: string, factIndex: number) => {
    setResults(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        facts: prev[themeId].facts.filter((_, i) => i !== factIndex),
      },
    }));
    toast.info("Fato rejeitado");
  }, []);

  // Editar valor do fato
  const startEditFact = useCallback((themeId: string, index: number) => {
    setEditingFact({ theme: themeId, index });
    setResults(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        facts: prev[themeId].facts.map((f, i) => 
          i === index ? { ...f, isEditing: true, editValue: f.valor } : f
        ),
      },
    }));
  }, []);

  const saveEditFact = useCallback((themeId: string, index: number, newValue: string) => {
    setEditingFact(null);
    setResults(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        facts: prev[themeId].facts.map((f, i) => 
          i === index ? { ...f, isEditing: false, valor: newValue, editValue: undefined } : f
        ),
      },
    }));
    toast.success("Valor atualizado");
  }, []);

  const cancelEditFact = useCallback((themeId: string, index: number) => {
    setEditingFact(null);
    setResults(prev => ({
      ...prev,
      [themeId]: {
        ...prev[themeId],
        facts: prev[themeId].facts.map((f, i) => 
          i === index ? { ...f, isEditing: false, editValue: undefined } : f
        ),
      },
    }));
  }, []);

  // Confirmar todos os fatos de um tema
  const confirmAllFacts = useCallback(async (themeId: string) => {
    const themeFacts = results[themeId]?.facts || [];
    if (themeFacts.length === 0) return;

    toast.info(`Confirmando ${themeFacts.length} fatos...`);
    
    for (const fact of themeFacts) {
      await confirmFact(themeId, fact);
    }
  }, [results, confirmFact]);

  const currentTheme = taskThemes.find(t => t.id === activeTheme);
  const currentResult = results[activeTheme];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente de Extração de Fatos
          </CardTitle>
          <CardDescription>
            Execute a extração por tema para encontrar fatos nos documentos indexados.
            A IA buscará apenas nos trechos relevantes e sempre citará a origem.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Theme Tabs */}
      <Tabs value={activeTheme} onValueChange={setActiveTheme}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-2 p-2">
          {taskThemes.map((theme) => {
            const ThemeIcon = theme.icon;
            const themeResult = results[theme.id];
            const factCount = themeResult?.facts?.length || 0;
            
            return (
              <TabsTrigger
                key={theme.id}
                value={theme.id}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ThemeIcon className="h-4 w-4" />
                {theme.label}
                {factCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {factCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {taskThemes.map((theme) => (
          <TabsContent key={theme.id} value={theme.id} className="space-y-4">
            {/* Theme Info Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <theme.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{theme.label}</h3>
                      <p className="text-muted-foreground">{theme.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {theme.doc_types.map(dt => (
                          <Badge key={dt} variant="outline" className="text-xs">
                            {dt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => runExtraction(theme.id)}
                    disabled={isExtracting}
                    className="gap-2"
                  >
                    {isExtracting && activeTheme === theme.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extraindo...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Executar Extração
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results[theme.id] && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex gap-4">
                  <Card className="flex-1">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{results[theme.id].facts.length}</p>
                          <p className="text-sm text-muted-foreground">Fatos encontrados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="flex-1">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Search className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{results[theme.id].chunks_searched || 0}</p>
                          <p className="text-sm text-muted-foreground">Trechos analisados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {results[theme.id].not_found.length > 0 && (
                    <Card className="flex-1">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="text-2xl font-bold">{results[theme.id].not_found.length}</p>
                            <p className="text-sm text-muted-foreground">Não encontrados</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Warnings */}
                {results[theme.id].warnings.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">Avisos</p>
                          <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                            {results[theme.id].warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Not Found */}
                {results[theme.id].not_found.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="not-found">
                      <AccordionTrigger className="text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Dados não encontrados ({results[theme.id].not_found.length})
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {results[theme.id].not_found.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-muted-foreground">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Facts Table */}
                {results[theme.id].facts.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-base">Fatos Extraídos</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => confirmAllFacts(theme.id)}
                        className="gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Confirmar Todos
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chave</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="text-center">Confiança</TableHead>
                            <TableHead>Citação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results[theme.id].facts.map((fact, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                                  {fact.chave}
                                </code>
                              </TableCell>
                              <TableCell>
                                {fact.isEditing ? (
                                  <div className="flex gap-2">
                                    <Input
                                      value={fact.editValue || fact.valor}
                                      onChange={(e) => {
                                        setResults(prev => ({
                                          ...prev,
                                          [theme.id]: {
                                            ...prev[theme.id],
                                            facts: prev[theme.id].facts.map((f, i) => 
                                              i === index ? { ...f, editValue: e.target.value } : f
                                            ),
                                          },
                                        }));
                                      }}
                                      className="h-8 w-[200px]"
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => saveEditFact(theme.id, index, fact.editValue || fact.valor)}
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => cancelEditFact(theme.id, index)}
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="font-medium">{fact.valor}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    fact.confidence >= 0.9 ? "text-green-600 border-green-200 bg-green-50" :
                                    fact.confidence >= 0.7 ? "text-yellow-600 border-yellow-200 bg-yellow-50" :
                                    "text-destructive border-destructive/20 bg-destructive/5"
                                  }
                                >
                                  {Math.round(fact.confidence * 100)}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-pointer hover:text-primary">
                                      <Quote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                        {fact.quote}
                                      </span>
                                      {fact.page_number && (
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                          p.{fact.page_number}
                                        </Badge>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[400px]">
                                    <p className="text-sm">{fact.quote}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {!fact.isEditing && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => startEditFact(theme.id, index)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Editar valor</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => confirmFact(theme.id, fact)}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Confirmar</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => rejectFact(theme.id, index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Rejeitar</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {results[theme.id].facts.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        Nenhum fato encontrado para este tema nos documentos indexados.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Verifique se os documentos foram processados corretamente.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Empty state */}
            {!results[theme.id] && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <theme.icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Extração não executada</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Executar Extração" para buscar fatos nos documentos
                  </p>
                  <Button onClick={() => runExtraction(theme.id)} disabled={isExtracting}>
                    <Play className="h-4 w-4 mr-2" />
                    Executar Extração
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

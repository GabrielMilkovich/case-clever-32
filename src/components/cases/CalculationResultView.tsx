// =====================================================
// COMPONENTE: RESULTADO DO CÁLCULO COM MEMÓRIA + BASE LEGAL + PROVAS
// Nenhuma rubrica exibida sem rastreabilidade completa
// =====================================================

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DollarSign,
  TrendingDown,
  FileText,
  AlertTriangle,
  Download,
  GitCompare,
  Calculator,
  Info,
  Scale,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileSearch,
  BookOpen,
} from "lucide-react";

// =====================================================
// TIPOS
// =====================================================

interface FundamentoLegal {
  dispositivo: string;
  descricao: string;
  norma: string;
  status?: 'vigente' | 'cancelada' | 'modulada' | 'historica' | 'controversa';
  url_oficial?: string;
  vigencia_inicio?: string;
  vigencia_fim?: string;
}

interface MemoriaPasso {
  passo: number;
  descricao: string;
  formula: string;
  variaveis: Record<string, string | number>;
  resultado: number | string;
  fundamento_legal?: string;
}

interface RubricaRisco {
  nivel: 'baixo' | 'medio' | 'alto';
  motivo: string;
  impacto: string;
  recomendacao: string;
}

interface RubricaResult {
  id: string;
  rubrica_codigo: string;
  rubrica_nome: string;
  competencia?: string;
  base_calculo?: number;
  quantidade?: number;
  percentual?: number;
  fator?: number;
  valor_bruto: number;
  valor_liquido?: number;
  fundamento_legal: FundamentoLegal[];
  memoria: MemoriaPasso[];
  narrativa?: string;
  riscos?: RubricaRisco[];
  premissas?: Record<string, string | number>;
  dependencias?: string[];
}

interface AuditLine {
  linha: number;
  calculadora: string;
  competencia?: string;
  descricao: string;
  formula?: string;
  valor_bruto?: number;
  valor_liquido?: number;
  metadata?: Record<string, unknown>;
}

interface Warning {
  tipo: "info" | "atencao" | "erro";
  codigo: string;
  mensagem: string;
  sugestao?: string;
}

interface VerbaResult {
  descricao: string;
  valor: number;
}

interface CalculationResult {
  id?: string;
  resultado_bruto: {
    total: number;
    por_verba: Record<string, VerbaResult>;
    por_competencia?: Record<string, number>;
  };
  resultado_liquido: {
    total: number;
    por_verba: Record<string, VerbaResult>;
    por_competencia?: Record<string, number>;
  };
  auditLines: AuditLine[];
  warnings: Warning[];
  calculators_used: Array<{ nome: string; versao: string }>;
  executado_em: string;
  // V3: rubricas detalhadas com memória + base legal
  rubricas_detalhadas?: RubricaResult[];
}

interface CalculationResultViewProps {
  result: CalculationResult;
  onExportPDF?: () => void;
  onCompareScenarios?: () => void;
}

// =====================================================
// STATUS HELPERS
// =====================================================

function StatusIcon({ status }: { status?: string }) {
  switch (status) {
    case 'vigente': return <ShieldCheck className="h-4 w-4 text-green-600" />;
    case 'modulada':
    case 'controversa': return <ShieldAlert className="h-4 w-4 text-amber-500" />;
    case 'cancelada': return <ShieldX className="h-4 w-4 text-destructive" />;
    case 'historica': return <ShieldAlert className="h-4 w-4 text-muted-foreground" />;
    default: return <ShieldCheck className="h-4 w-4 text-green-600" />;
  }
}

function StatusBadge({ status }: { status?: string }) {
  const variants: Record<string, string> = {
    vigente: 'bg-green-100 text-green-800 border-green-200',
    modulada: 'bg-amber-100 text-amber-800 border-amber-200',
    controversa: 'bg-amber-100 text-amber-800 border-amber-200',
    cancelada: 'bg-red-100 text-red-800 border-red-200',
    historica: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={`text-xs ${variants[status || 'vigente'] || ''}`}>
      {status || 'vigente'}
    </Badge>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function CalculationResultView({
  result,
  onExportPDF,
  onCompareScenarios,
}: CalculationResultViewProps) {
  const [showMemory, setShowMemory] = useState(false);
  const [selectedRubrica, setSelectedRubrica] = useState<RubricaResult | null>(null);
  const [dialogType, setDialogType] = useState<'memoria' | 'base_legal' | 'provas' | null>(null);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const diferenca = result.resultado_bruto.total - result.resultado_liquido.total;
  const rubricas = result.rubricas_detalhadas || [];

  // Agrupar rubricas por código
  const grouped = rubricas.reduce((acc, r) => {
    if (!acc[r.rubrica_codigo]) {
      acc[r.rubrica_codigo] = { codigo: r.rubrica_codigo, nome: r.rubrica_nome, items: [], total: 0, fundamentos: r.fundamento_legal };
    }
    acc[r.rubrica_codigo].items.push(r);
    acc[r.rubrica_codigo].total += r.valor_bruto;
    return acc;
  }, {} as Record<string, { codigo: string; nome: string; items: RubricaResult[]; total: number; fundamentos: FundamentoLegal[] }>);

  const openDialog = (rubrica: RubricaResult, type: 'memoria' | 'base_legal' | 'provas') => {
    setSelectedRubrica(rubrica);
    setDialogType(type);
  };

  return (
    <div className="space-y-6">
      {/* Totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Resultado Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{formatCurrency(result.resultado_bruto.total)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {Object.keys(result.resultado_bruto.por_verba).length} verba(s) | {rubricas.length} item(ns)
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-green-600" />
              Resultado Líquido
            </CardTitle>
            <CardDescription>Descontos: {formatCurrency(diferenca)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">{formatCurrency(result.resultado_liquido.total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {result.warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Alertas ({result.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.warnings.map((warning, idx) => (
                <div key={idx} className={`flex items-start gap-2 p-2 rounded text-sm ${
                  warning.tipo === "erro" ? "bg-red-100 text-red-700"
                  : warning.tipo === "atencao" ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
                }`}>
                  {warning.tipo === "erro" ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> : <Info className="h-4 w-4 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-medium">{warning.mensagem}</p>
                    {warning.sugestao && <p className="text-xs mt-0.5 opacity-80">💡 {warning.sugestao}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento por Rubrica com botões de evidência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Rubricas com Memória de Cálculo + Base Legal
          </CardTitle>
          <CardDescription>
            Cada rubrica carrega fundamentação legal rastreável com links oficiais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(grouped).length > 0 ? (
            <Accordion type="multiple" className="space-y-2">
              {Object.values(grouped).map((group) => (
                <AccordionItem key={group.codigo} value={group.codigo} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">{group.codigo}</Badge>
                        <span className="font-medium text-sm">{group.nome}</span>
                        <div className="flex items-center gap-1">
                          {group.fundamentos.every(f => f.status === 'vigente' || !f.status) ? (
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                          ) : group.fundamentos.some(f => f.status === 'cancelada') ? (
                            <ShieldX className="h-4 w-4 text-destructive" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">{group.items.length} item(s)</Badge>
                        <span className="font-bold text-primary">{formatCurrency(group.total)}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    {/* Narrativa jurídica */}
                    {group.items[0]?.narrativa && (
                      <div className="p-3 bg-muted/50 rounded-lg border text-sm italic text-muted-foreground">
                        <BookOpen className="h-4 w-4 inline mr-2" />
                        {group.items[0].narrativa}
                      </div>
                    )}

                    {/* Tabela de items */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competência</TableHead>
                          <TableHead className="text-right">Base</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.competencia || "—"}</TableCell>
                            <TableCell className="text-right">{item.base_calculo ? formatCurrency(item.base_calculo) : "—"}</TableCell>
                            <TableCell className="text-right">{item.quantidade ?? "—"}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.valor_bruto)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
                                  onClick={() => openDialog(item, 'memoria')}>
                                  <Calculator className="h-3 w-3" /> Memória
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
                                  onClick={() => openDialog(item, 'base_legal')}>
                                  <Scale className="h-3 w-3" /> Base Legal
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Base legal resumida */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Scale className="h-4 w-4" /> Fundamentos Legais
                      </h4>
                      <div className="space-y-1">
                        {group.fundamentos.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                            <StatusIcon status={f.status} />
                            <span className="font-medium">{f.dispositivo}</span>
                            <span className="text-muted-foreground">— {f.descricao}</span>
                            <StatusBadge status={f.status} />
                            {f.url_oficial && (
                              <a href={f.url_oficial} target="_blank" rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1 ml-auto">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            /* Fallback para resultado legado sem rubricas detalhadas */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold mb-3">Verbas (Bruto)</h4>
                <div className="space-y-2">
                  {Object.entries(result.resultado_bruto.por_verba).map(([codigo, data]) => (
                    <div key={codigo} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{data.descricao || codigo}</p>
                        <p className="text-xs text-muted-foreground">{codigo}</p>
                      </div>
                      <p className="font-semibold text-primary">{formatCurrency(data.valor)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Verbas (Líquido)</h4>
                <div className="space-y-2">
                  {Object.entries(result.resultado_liquido.por_verba).map(([codigo, data]) => (
                    <div key={codigo} className={`flex items-center justify-between p-3 rounded-lg ${data.valor < 0 ? "bg-red-50" : "bg-muted/50"}`}>
                      <div>
                        <p className="font-medium text-sm">{data.descricao || codigo}</p>
                      </div>
                      <p className={`font-semibold ${data.valor < 0 ? "text-destructive" : "text-green-600"}`}>{formatCurrency(data.valor)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculadoras Usadas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            Calculadoras Utilizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.calculators_used.map((calc, idx) => (
              <Badge key={idx} variant="secondary" className="text-sm">
                {calc.nome} v{calc.versao}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2" onClick={() => setShowMemory(true)}>
          <FileText className="h-4 w-4" />
          Ver Memória Completa
        </Button>
        {onCompareScenarios && (
          <Button variant="outline" className="gap-2" onClick={onCompareScenarios}>
            <GitCompare className="h-4 w-4" />
            Comparar Cenários
          </Button>
        )}
        {onExportPDF && (
          <Button className="gap-2" onClick={onExportPDF}>
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        )}
      </div>

      {/* Dialog: Memória de Cálculo detalhada por rubrica */}
      <Dialog open={dialogType === 'memoria'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Memória de Cálculo — {selectedRubrica?.rubrica_nome}
              {selectedRubrica?.competencia && <Badge variant="outline" className="ml-2">{selectedRubrica.competencia}</Badge>}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {/* Premissas */}
              {selectedRubrica?.premissas && Object.keys(selectedRubrica.premissas).length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Premissas Utilizadas</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedRubrica.premissas).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground">{k}:</span>
                        <span className="font-mono">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passos */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fórmula / Substituição</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead>Fundamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedRubrica?.memoria || []).map((passo) => (
                    <TableRow key={passo.passo}>
                      <TableCell className="font-mono text-xs">{passo.passo}</TableCell>
                      <TableCell className="text-sm font-medium">{passo.descricao}</TableCell>
                      <TableCell>
                        <p className="text-sm font-mono">{passo.formula}</p>
                        {Object.keys(passo.variaveis).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {Object.entries(passo.variaveis).map(([k, v]) => `${k}=${v}`).join(', ')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {typeof passo.resultado === 'number' ? formatCurrency(passo.resultado) : String(passo.resultado)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {passo.fundamento_legal || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Narrativa */}
              {selectedRubrica?.narrativa && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Narrativa Jurídica
                  </h4>
                  <p className="text-sm">{selectedRubrica.narrativa}</p>
                </div>
              )}

              {/* Riscos */}
              {selectedRubrica?.riscos && selectedRubrica.riscos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Observações de Risco
                  </h4>
                  {selectedRubrica.riscos.map((r, i) => (
                    <div key={i} className={`p-2 rounded text-sm ${r.nivel === 'alto' ? 'bg-red-50 text-red-700' : r.nivel === 'medio' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      <p className="font-medium">{r.motivo}</p>
                      <p className="text-xs mt-1">Impacto: {r.impacto} | Recomendação: {r.recomendacao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: Base Legal */}
      <Dialog open={dialogType === 'base_legal'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Base Legal — {selectedRubrica?.rubrica_nome}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3">
              {(selectedRubrica?.fundamento_legal || []).map((f, i) => (
                <Card key={i} className={`${f.status === 'cancelada' ? 'border-destructive/50 bg-red-50/50' : f.status === 'modulada' || f.status === 'controversa' ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <StatusIcon status={f.status} />
                        <div>
                          <p className="font-semibold text-sm">{f.dispositivo}</p>
                          <p className="text-sm text-muted-foreground mt-1">{f.descricao}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{f.norma}</Badge>
                            <StatusBadge status={f.status} />
                            {f.vigencia_inicio && (
                              <span className="text-xs text-muted-foreground">
                                Vigência: {f.vigencia_inicio}{f.vigencia_fim ? ` até ${f.vigencia_fim}` : ' (atual)'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {f.url_oficial && (
                        <a href={f.url_oficial} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap">
                          <ExternalLink className="h-3 w-3" />
                          Fonte Oficial
                        </a>
                      )}
                    </div>
                    {f.status === 'cancelada' && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700 font-medium">
                        ⚠️ CANCELADA/SUPERADA — Este fundamento NÃO pode ser usado como default. Exige override explícito com justificativa.
                      </div>
                    )}
                    {(f.status === 'modulada' || f.status === 'controversa') && (
                      <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-700">
                        ⚡ Tese com modulação/controvérsia — verifique a tese selecionada e justificativa no cenário.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!selectedRubrica?.fundamento_legal || selectedRubrica.fundamento_legal.length === 0) && (
                <div className="text-center py-8 text-destructive">
                  <ShieldX className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-semibold">FUNDAMENTO LEGAL AUSENTE</p>
                  <p className="text-sm">Esta rubrica não possui base legal cadastrada. Cálculo deveria estar bloqueado.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal Memória Completa (legado) */}
      <Dialog open={showMemory} onOpenChange={setShowMemory}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Memória de Cálculo Completa</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Calculadora</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.auditLines.map((line) => (
                  <TableRow key={line.linha}>
                    <TableCell className="font-mono text-xs">{line.linha}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{line.calculadora}</Badge></TableCell>
                    <TableCell className="text-xs">{line.competencia || "—"}</TableCell>
                    <TableCell>
                      <p className="text-sm">{line.descricao}</p>
                      {line.formula && <p className="text-xs text-muted-foreground font-mono">{line.formula}</p>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{line.valor_bruto !== undefined ? formatCurrency(line.valor_bruto) : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{line.valor_liquido !== undefined ? formatCurrency(line.valor_liquido) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

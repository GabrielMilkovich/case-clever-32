// =====================================================
// COMPONENTE: RESULTADO DO CÁLCULO (BRUTO x LÍQUIDO)
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
  ChevronDown,
  ChevronUp,
  Calculator,
  Info,
} from "lucide-react";

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
  calculators_used: Array<{
    nome: string;
    versao: string;
  }>;
  executado_em: string;
}

interface CalculationResultViewProps {
  result: CalculationResult;
  onExportPDF?: () => void;
  onCompareScenarios?: () => void;
}

export function CalculationResultView({
  result,
  onExportPDF,
  onCompareScenarios,
}: CalculationResultViewProps) {
  const [showMemory, setShowMemory] = useState(false);
  const [expandedVerbas, setExpandedVerbas] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const toggleVerba = (codigo: string) => {
    const newExpanded = new Set(expandedVerbas);
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo);
    } else {
      newExpanded.add(codigo);
    }
    setExpandedVerbas(newExpanded);
  };

  const diferenca = result.resultado_bruto.total - result.resultado_liquido.total;

  return (
    <div className="space-y-6">
      {/* Totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bruto */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Resultado Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {formatCurrency(result.resultado_bruto.total)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {Object.keys(result.resultado_bruto.por_verba).length} verba(s)
            </p>
          </CardContent>
        </Card>

        {/* Líquido */}
        <Card className="border-2 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-green-600" />
              Resultado Líquido
            </CardTitle>
            <CardDescription>
              Descontos: {formatCurrency(diferenca)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">
              {formatCurrency(result.resultado_liquido.total)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Após INSS e IRRF
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {result.warnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              Alertas ({result.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded text-sm ${
                    warning.tipo === "erro"
                      ? "bg-red-100 text-red-700"
                      : warning.tipo === "atencao"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {warning.tipo === "erro" && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                  {warning.tipo === "atencao" && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                  {warning.tipo === "info" && <Info className="h-4 w-4 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-medium">{warning.mensagem}</p>
                    {warning.sugestao && (
                      <p className="text-xs mt-0.5 opacity-80">💡 {warning.sugestao}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento por Verba - Lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verbas Brutas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Verbas (Bruto)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(result.resultado_bruto.por_verba).map(([codigo, data]) => (
                <div
                  key={codigo}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{data.descricao || codigo}</p>
                    <p className="text-xs text-muted-foreground">{codigo}</p>
                  </div>
                  <p className="font-semibold text-primary">{formatCurrency(data.valor)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Verbas Líquidas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Verbas (Líquido)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(result.resultado_liquido.por_verba).map(([codigo, data]) => (
                <div
                  key={codigo}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    data.valor < 0
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">{data.descricao || codigo}</p>
                    <p className="text-xs text-muted-foreground">{codigo}</p>
                  </div>
                  <p className={`font-semibold ${data.valor < 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(data.valor)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
          Ver Memória de Cálculo
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

      {/* Modal Memória de Cálculo */}
      <Dialog open={showMemory} onOpenChange={setShowMemory}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Memória de Cálculo</DialogTitle>
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
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {line.calculadora}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{line.competencia || "—"}</TableCell>
                    <TableCell>
                      <p className="text-sm">{line.descricao}</p>
                      {line.formula && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {line.formula}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.valor_bruto !== undefined ? formatCurrency(line.valor_bruto) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.valor_liquido !== undefined ? formatCurrency(line.valor_liquido) : "—"}
                    </TableCell>
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

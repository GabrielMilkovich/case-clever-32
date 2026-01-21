// =====================================================
// COMPONENTE: COMPARAÇÃO DE CENÁRIOS
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  DollarSign,
} from "lucide-react";

interface VerbaResult {
  descricao: string;
  valor: number;
}

interface ScenarioResult {
  nome: string;
  perfil: string;
  resultado_bruto: {
    total: number;
    por_verba: Record<string, VerbaResult>;
  };
  resultado_liquido: {
    total: number;
    por_verba: Record<string, VerbaResult>;
  };
}

interface ScenarioComparisonProps {
  scenarioA: ScenarioResult;
  scenarioB: ScenarioResult;
  onExportComparison?: () => void;
}

export function ScenarioComparison({
  scenarioA,
  scenarioB,
  onExportComparison,
}: ScenarioComparisonProps) {
  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDiff = (a: number, b: number) => {
    const diff = b - a;
    const percent = a !== 0 ? ((diff / a) * 100).toFixed(1) : "—";
    return { diff, percent };
  };

  const getDiffIcon = (diff: number) => {
    if (diff > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (diff < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getDiffColor = (diff: number) => {
    if (diff > 0) return "text-green-600";
    if (diff < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  // Combinar todas as verbas de ambos os cenários
  const allVerbas = new Set([
    ...Object.keys(scenarioA.resultado_bruto.por_verba),
    ...Object.keys(scenarioB.resultado_bruto.por_verba),
  ]);

  const brutoDiff = formatDiff(
    scenarioA.resultado_bruto.total,
    scenarioB.resultado_bruto.total
  );
  const liquidoDiff = formatDiff(
    scenarioA.resultado_liquido.total,
    scenarioB.resultado_liquido.total
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Comparação de Cenários</h2>
          <p className="text-muted-foreground">
            {scenarioA.nome} vs {scenarioB.nome}
          </p>
        </div>
        {onExportComparison && (
          <Button onClick={onExportComparison} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Comparação
          </Button>
        )}
      </div>

      {/* Totais lado a lado */}
      <div className="grid grid-cols-3 gap-4">
        {/* Cenário A */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="secondary">A</Badge>
              {scenarioA.nome}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{scenarioA.perfil}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Bruto</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(scenarioA.resultado_bruto.total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Líquido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(scenarioA.resultado_liquido.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Diferença */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-center">Diferença</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Bruto</p>
              <div className="flex items-center justify-center gap-2">
                {getDiffIcon(brutoDiff.diff)}
                <p className={`text-2xl font-bold ${getDiffColor(brutoDiff.diff)}`}>
                  {formatCurrency(Math.abs(brutoDiff.diff))}
                </p>
              </div>
              <p className={`text-sm ${getDiffColor(brutoDiff.diff)}`}>
                ({brutoDiff.percent}%)
              </p>
            </div>
            <Separator />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Líquido</p>
              <div className="flex items-center justify-center gap-2">
                {getDiffIcon(liquidoDiff.diff)}
                <p className={`text-2xl font-bold ${getDiffColor(liquidoDiff.diff)}`}>
                  {formatCurrency(Math.abs(liquidoDiff.diff))}
                </p>
              </div>
              <p className={`text-sm ${getDiffColor(liquidoDiff.diff)}`}>
                ({liquidoDiff.percent}%)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cenário B */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="default">B</Badge>
              {scenarioB.nome}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{scenarioB.perfil}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Bruto</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(scenarioB.resultado_bruto.total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Líquido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(scenarioB.resultado_liquido.total)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparação por Verba */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação por Verba</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Verba</TableHead>
                <TableHead className="text-right">Cenário A</TableHead>
                <TableHead className="text-center">Diferença</TableHead>
                <TableHead className="text-right">Cenário B</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(allVerbas).map((codigo) => {
                const verbaA = scenarioA.resultado_bruto.por_verba[codigo];
                const verbaB = scenarioB.resultado_bruto.por_verba[codigo];
                const valorA = verbaA?.valor || 0;
                const valorB = verbaB?.valor || 0;
                const diff = valorB - valorA;

                return (
                  <TableRow key={codigo}>
                    <TableCell>
                      <p className="font-medium">{verbaA?.descricao || verbaB?.descricao || codigo}</p>
                      <p className="text-xs text-muted-foreground">{codigo}</p>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {valorA > 0 ? formatCurrency(valorA) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getDiffIcon(diff)}
                        <span className={`font-mono text-sm ${getDiffColor(diff)}`}>
                          {diff !== 0 ? formatCurrency(Math.abs(diff)) : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {valorB > 0 ? formatCurrency(valorB) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className={brutoDiff.diff > 0 ? "bg-green-50/50 border-green-200" : "bg-red-50/50 border-red-200"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4">
            <DollarSign className={`h-8 w-8 ${getDiffColor(brutoDiff.diff)}`} />
            <div className="text-center">
              <p className="text-lg font-medium">
                {brutoDiff.diff > 0 ? "Cenário B é mais vantajoso" : "Cenário A é mais vantajoso"}
              </p>
              <p className={`text-sm ${getDiffColor(brutoDiff.diff)}`}>
                Diferença de {formatCurrency(Math.abs(brutoDiff.diff))} no valor bruto
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

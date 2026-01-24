import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  GitCompare,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Snapshot {
  id: string;
  versao: number;
  total_bruto: number | null;
  total_liquido: number | null;
  total_descontos: number | null;
  inputs_snapshot: Record<string, unknown> | null;
  warnings: unknown[] | null;
  created_at: string;
  prescricao_aplicada?: string | null;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
}

interface ResultItem {
  rubrica_codigo: string;
  rubrica_nome: string | null;
  valor_bruto: number;
  valor_liquido: number | null;
}

interface SnapshotDiffProps {
  snapshotA: Snapshot;
  snapshotB: Snapshot;
  itemsA: ResultItem[];
  itemsB: ResultItem[];
}

interface DiffRow {
  rubrica: string;
  nome: string;
  valorA: number;
  valorB: number;
  diff: number;
  diffPercent: number;
  status: "aumentou" | "diminuiu" | "igual" | "novo" | "removido";
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function SnapshotDiff({ snapshotA, snapshotB, itemsA, itemsB }: SnapshotDiffProps) {
  // Aggregate items by rubrica
  const aggregateByRubrica = (items: ResultItem[]) => {
    const map = new Map<string, { nome: string; total: number }>();
    items.forEach((item) => {
      const existing = map.get(item.rubrica_codigo);
      if (existing) {
        existing.total += item.valor_bruto;
      } else {
        map.set(item.rubrica_codigo, {
          nome: item.rubrica_nome || item.rubrica_codigo,
          total: item.valor_bruto,
        });
      }
    });
    return map;
  };

  const diffRows = useMemo<DiffRow[]>(() => {
    const mapA = aggregateByRubrica(itemsA);
    const mapB = aggregateByRubrica(itemsB);
    const allRubricas = new Set([...mapA.keys(), ...mapB.keys()]);
    
    const rows: DiffRow[] = [];
    allRubricas.forEach((rubrica) => {
      const a = mapA.get(rubrica);
      const b = mapB.get(rubrica);
      const valorA = a?.total || 0;
      const valorB = b?.total || 0;
      const diff = valorB - valorA;
      const diffPercent = valorA !== 0 ? (diff / valorA) * 100 : valorB !== 0 ? 100 : 0;
      
      let status: DiffRow["status"] = "igual";
      if (!a && b) status = "novo";
      else if (a && !b) status = "removido";
      else if (diff > 0) status = "aumentou";
      else if (diff < 0) status = "diminuiu";
      
      rows.push({
        rubrica,
        nome: b?.nome || a?.nome || rubrica,
        valorA,
        valorB,
        diff,
        diffPercent,
        status,
      });
    });
    
    return rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [itemsA, itemsB]);

  // Calculate totals diff
  const totalsDiff = useMemo(() => {
    const brutoA = snapshotA.total_bruto || 0;
    const brutoB = snapshotB.total_bruto || 0;
    const liquidoA = snapshotA.total_liquido || 0;
    const liquidoB = snapshotB.total_liquido || 0;
    
    return {
      bruto: {
        valorA: brutoA,
        valorB: brutoB,
        diff: brutoB - brutoA,
        diffPercent: brutoA !== 0 ? ((brutoB - brutoA) / brutoA) * 100 : 0,
      },
      liquido: {
        valorA: liquidoA,
        valorB: liquidoB,
        diff: liquidoB - liquidoA,
        diffPercent: liquidoA !== 0 ? ((liquidoB - liquidoA) / liquidoA) * 100 : 0,
      },
    };
  }, [snapshotA, snapshotB]);

  // Detect input changes
  const inputChanges = useMemo(() => {
    const inputsA = (snapshotA.inputs_snapshot || {}) as Record<string, unknown>;
    const inputsB = (snapshotB.inputs_snapshot || {}) as Record<string, unknown>;
    const changes: Array<{ key: string; oldVal: string; newVal: string }> = [];
    
    const allKeys = new Set([...Object.keys(inputsA), ...Object.keys(inputsB)]);
    allKeys.forEach((key) => {
      const valA = JSON.stringify(inputsA[key] || "—");
      const valB = JSON.stringify(inputsB[key] || "—");
      if (valA !== valB) {
        changes.push({ key, oldVal: valA.slice(0, 50), newVal: valB.slice(0, 50) });
      }
    });
    
    return changes;
  }, [snapshotA.inputs_snapshot, snapshotB.inputs_snapshot]);

  const statusConfig = {
    aumentou: { icon: TrendingUp, className: "text-green-600", bg: "bg-green-50" },
    diminuiu: { icon: TrendingDown, className: "text-red-600", bg: "bg-red-50" },
    igual: { icon: Minus, className: "text-muted-foreground", bg: "" },
    novo: { icon: TrendingUp, className: "text-blue-600", bg: "bg-blue-50" },
    removido: { icon: TrendingDown, className: "text-orange-600", bg: "bg-orange-50" },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          Comparação: v{snapshotA.versao} → v{snapshotB.versao}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Totals Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Bruto</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{formatCurrency(totalsDiff.bruto.valorA)}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold">{formatCurrency(totalsDiff.bruto.valorB)}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "mt-2",
                totalsDiff.bruto.diff > 0 ? "text-green-600" : totalsDiff.bruto.diff < 0 ? "text-red-600" : ""
              )}
            >
              {totalsDiff.bruto.diff > 0 ? "+" : ""}
              {formatCurrency(totalsDiff.bruto.diff)} ({totalsDiff.bruto.diffPercent.toFixed(1)}%)
            </Badge>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Líquido</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{formatCurrency(totalsDiff.liquido.valorA)}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-bold">{formatCurrency(totalsDiff.liquido.valorB)}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "mt-2",
                totalsDiff.liquido.diff > 0 ? "text-green-600" : totalsDiff.liquido.diff < 0 ? "text-red-600" : ""
              )}
            >
              {totalsDiff.liquido.diff > 0 ? "+" : ""}
              {formatCurrency(totalsDiff.liquido.diff)} ({totalsDiff.liquido.diffPercent.toFixed(1)}%)
            </Badge>
          </div>
        </div>

        {/* Input Changes */}
        {inputChanges.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              {inputChanges.length} input(s) alterado(s)
            </div>
            <div className="space-y-1">
              {inputChanges.slice(0, 5).map((change, i) => (
                <div key={i} className="text-xs flex items-center gap-2">
                  <span className="font-medium">{change.key}:</span>
                  <span className="text-muted-foreground line-through">{change.oldVal}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{change.newVal}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Rubrica Diff Table */}
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rubrica</TableHead>
                <TableHead className="text-right">v{snapshotA.versao}</TableHead>
                <TableHead className="text-right">v{snapshotB.versao}</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diffRows.map((row) => {
                const config = statusConfig[row.status];
                const Icon = config.icon;
                return (
                  <TableRow key={row.rubrica} className={config.bg}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{row.rubrica}</span>
                        <p className="text-xs text-muted-foreground">{row.nome}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.valorA)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.valorB)}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono font-medium", config.className)}>
                      {row.diff > 0 ? "+" : ""}
                      {formatCurrency(row.diff)}
                      <span className="text-xs ml-1">
                        ({row.diffPercent > 0 ? "+" : ""}{row.diffPercent.toFixed(1)}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("gap-1", config.className)}>
                        <Icon className="h-3 w-3" />
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

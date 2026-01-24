import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FileDown,
  FileText,
  Calculator,
  Scale,
  Calendar,
  Hash,
  CheckCircle,
  User,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Snapshot {
  id: string;
  versao: number;
  engine_version: string;
  ruleset_hash: string | null;
  total_bruto: number | null;
  total_liquido: number | null;
  total_descontos: number | null;
  inputs_snapshot: Record<string, unknown> | null;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  prescricao_aplicada?: string | null;
  warnings: unknown[] | null;
  created_at: string;
  created_by: string;
  status: string;
}

interface ResultItem {
  id: string;
  rubrica_codigo: string;
  rubrica_nome: string | null;
  competencia: string | null;
  base_calculo: number | null;
  quantidade: number | null;
  percentual: number | null;
  valor_bruto: number;
  valor_liquido: number | null;
}

interface ImpugnationPackageProps {
  caseId: string;
  snapshot: Snapshot;
  resultItems: ResultItem[];
  onExport?: () => void;
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function ImpugnationPackage({ caseId, snapshot, resultItems, onExport }: ImpugnationPackageProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Fetch validations log
  const { data: validations = [] } = useQuery({
    queryKey: ["validations", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validations")
        .select("*")
        .eq("case_id", caseId)
        .order("validated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch facts used
  const { data: facts = [] } = useQuery({
    queryKey: ["facts", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facts")
        .select("*")
        .eq("case_id", caseId)
        .eq("confirmado", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch lineage
  const { data: lineage = [] } = useQuery({
    queryKey: ["calc_lineage", snapshot.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calc_lineage")
        .select("*")
        .eq("snapshot_id", snapshot.id);
      if (error) throw error;
      return data;
    },
  });

  // Group items by rubrica
  const groupedByRubrica = useMemo(() => {
    const groups: Record<string, { nome: string; items: ResultItem[]; total: number }> = {};
    resultItems.forEach((item) => {
      if (!groups[item.rubrica_codigo]) {
        groups[item.rubrica_codigo] = {
          nome: item.rubrica_nome || item.rubrica_codigo,
          items: [],
          total: 0,
        };
      }
      groups[item.rubrica_codigo].items.push(item);
      groups[item.rubrica_codigo].total += item.valor_bruto;
    });
    return groups;
  }, [resultItems]);

  // Generate export content
  const generateExportContent = () => {
    const lines: string[] = [];
    
    lines.push("=" .repeat(60));
    lines.push("PACOTE DE IMPUGNAÇÃO - MEMÓRIA DE CÁLCULO");
    lines.push("=" .repeat(60));
    lines.push("");
    
    // Metodologia
    lines.push("1. METODOLOGIA");
    lines.push("-".repeat(40));
    lines.push(`Engine: ${snapshot.engine_version}`);
    lines.push(`Hash do Ruleset: ${snapshot.ruleset_hash || "N/A"}`);
    lines.push(`Período: ${snapshot.periodo_inicio || "N/A"} a ${snapshot.periodo_fim || "N/A"}`);
    lines.push(`Prescrição: ${snapshot.prescricao_aplicada || "Não aplicada"}`);
    lines.push(`Gerado em: ${format(new Date(snapshot.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`);
    lines.push("");
    
    // Premissas
    lines.push("2. PREMISSAS UTILIZADAS");
    lines.push("-".repeat(40));
    const inputs = snapshot.inputs_snapshot || {};
    Object.entries(inputs).forEach(([key, val]) => {
      lines.push(`${key}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`);
    });
    lines.push("");
    
    // Totais
    lines.push("3. RESULTADO CONSOLIDADO");
    lines.push("-".repeat(40));
    lines.push(`Total Bruto: ${formatCurrency(snapshot.total_bruto)}`);
    lines.push(`Descontos: ${formatCurrency(snapshot.total_descontos)}`);
    lines.push(`Total Líquido: ${formatCurrency(snapshot.total_liquido)}`);
    lines.push("");
    
    // Memória por rubrica
    lines.push("4. MEMÓRIA POR RUBRICA E COMPETÊNCIA");
    lines.push("-".repeat(40));
    Object.entries(groupedByRubrica).forEach(([codigo, group]) => {
      lines.push(`\n${codigo} - ${group.nome} (Total: ${formatCurrency(group.total)})`);
      group.items.forEach((item) => {
        const base = item.base_calculo ? `Base: ${formatCurrency(item.base_calculo)}` : "";
        const qtd = item.quantidade ? `Qtd: ${item.quantidade}` : "";
        const pct = item.percentual ? `${(item.percentual * 100).toFixed(1)}%` : "";
        lines.push(`  ${item.competencia || "Geral"}: ${formatCurrency(item.valor_bruto)} (${[base, qtd, pct].filter(Boolean).join(", ")})`);
      });
    });
    lines.push("");
    
    // Fatos vinculados
    lines.push("5. FATOS VINCULADOS (CONFIRMADOS)");
    lines.push("-".repeat(40));
    facts.forEach((fact) => {
      lines.push(`${fact.chave}: ${fact.valor} (Confiança: ${Math.round((fact.confianca || 0) * 100)}%)`);
    });
    lines.push("");
    
    // Log de validações
    lines.push("6. LOG DE VALIDAÇÕES");
    lines.push("-".repeat(40));
    validations.slice(0, 20).forEach((v) => {
      const date = format(new Date(v.validated_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
      lines.push(`[${date}] ${v.campo}: ${v.acao} por ${v.usuario_id.slice(0, 8)}...`);
    });
    lines.push("");
    
    lines.push("=" .repeat(60));
    lines.push("FIM DO PACOTE DE IMPUGNAÇÃO");
    lines.push("=" .repeat(60));
    
    return lines.join("\n");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const content = generateExportContent();
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `impugnacao_snapshot_v${snapshot.versao}_${format(new Date(), "yyyyMMdd_HHmm")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onExport?.();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Pacote de Impugnação
        </CardTitle>
        <Button onClick={handleExport} disabled={isExporting} className="gap-2">
          <FileDown className="h-4 w-4" />
          {isExporting ? "Exportando..." : "Exportar TXT"}
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Accordion type="multiple" defaultValue={["metodologia", "premissas", "rubricas"]}>
            {/* Metodologia */}
            <AccordionItem value="metodologia">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Metodologia
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Engine Version</p>
                      <p className="font-mono font-medium">{snapshot.engine_version}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ruleset Hash</p>
                      <p className="font-mono font-medium">{snapshot.ruleset_hash?.slice(0, 16) || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Período Calculado</p>
                      <p className="font-medium">
                        {snapshot.periodo_inicio || "N/A"} a {snapshot.periodo_fim || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prescrição</p>
                      <p className="font-medium">{snapshot.prescricao_aplicada || "Não aplicada"}</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Premissas */}
            <AccordionItem value="premissas">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Premissas Travadas ({Object.keys(snapshot.inputs_snapshot || {}).length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {Object.entries(snapshot.inputs_snapshot || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-mono">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Memória por Rubrica */}
            <AccordionItem value="rubricas">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Memória por Rubrica ({Object.keys(groupedByRubrica).length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {Object.entries(groupedByRubrica).map(([codigo, group]) => (
                    <div key={codigo} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">{codigo}</Badge>
                          <span className="font-medium">{group.nome}</span>
                        </div>
                        <span className="font-bold text-primary">{formatCurrency(group.total)}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Competência</TableHead>
                            <TableHead className="text-xs text-right">Base</TableHead>
                            <TableHead className="text-xs text-right">Qtd</TableHead>
                            <TableHead className="text-xs text-right">%</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs font-mono">{item.competencia || "—"}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(item.base_calculo)}</TableCell>
                              <TableCell className="text-xs text-right">{item.quantidade ?? "—"}</TableCell>
                              <TableCell className="text-xs text-right">
                                {item.percentual ? `${(item.percentual * 100).toFixed(1)}%` : "—"}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium">{formatCurrency(item.valor_bruto)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Fatos */}
            <AccordionItem value="fatos">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Fatos Vinculados ({facts.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {facts.map((fact) => (
                    <div key={fact.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                      <span className="font-medium">{fact.chave}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{fact.valor}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round((fact.confianca || 0) * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Log de Validações */}
            <AccordionItem value="validacoes">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Log de Validações ({validations.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {validations.slice(0, 20).map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(new Date(v.validated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <span className="font-medium">{v.campo}</span>
                      <Badge variant={v.acao === "aprovar" ? "default" : "secondary"} className="text-xs">
                        {v.acao}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

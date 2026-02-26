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
  Hash,
  CheckCircle,
  User,
  Clock,
  CalendarDays,
  DollarSign,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// =====================================================
// LABELS HUMANIZADOS
// =====================================================
const FACT_LABELS: Record<string, { label: string; icon: any; category: string }> = {
  data_admissao: { label: "Data de Admissão", icon: CalendarDays, category: "Contrato" },
  data_demissao: { label: "Data de Demissão", icon: CalendarDays, category: "Contrato" },
  salario_base: { label: "Salário Base", icon: DollarSign, category: "Remuneração" },
  salario_mensal: { label: "Salário Mensal", icon: DollarSign, category: "Remuneração" },
  cargo: { label: "Cargo / Função", icon: Briefcase, category: "Contrato" },
  funcao: { label: "Função", icon: Briefcase, category: "Contrato" },
  jornada_contratual: { label: "Jornada Contratual", icon: Clock, category: "Jornada" },
  tipo_demissao: { label: "Motivo da Demissão", icon: Scale, category: "Rescisão" },
  motivo_demissao: { label: "Motivo da Demissão", icon: Scale, category: "Rescisão" },
  empregador: { label: "Empregador", icon: Briefcase, category: "Contrato" },
  nome_reclamante: { label: "Nome do Reclamante", icon: User, category: "Contrato" },
  horas_extras_mensais: { label: "Média de Horas Extras Mensais", icon: Clock, category: "Jornada" },
  media_horas_extras: { label: "Média de Horas Extras", icon: Clock, category: "Jornada" },
  percentual_domingos_feriados: { label: "% Domingos/Feriados", icon: CalendarDays, category: "Jornada" },
};

const DEMISSAO_LABELS: Record<string, string> = {
  sem_justa_causa: "Dispensa sem Justa Causa",
  justa_causa: "Dispensa por Justa Causa",
  pedido_demissao: "Pedido de Demissão",
  rescisao_indireta: "Rescisão Indireta",
  acordo: "Acordo Mútuo (Art. 484-A CLT)",
};

function formatFactValue(chave: string, valor: string): string {
  // Dates
  if (chave.includes("data_")) {
    try {
      const d = new Date(valor);
      return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch { return valor; }
  }
  // Money
  if (chave.includes("salario") || chave.includes("deposito")) {
    const num = parseFloat(valor.replace(/[^\d.,\-]/g, "").replace(",", "."));
    if (!isNaN(num)) return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  }
  // Demissão type
  if (chave.includes("demissao") || chave.includes("motivo")) {
    return DEMISSAO_LABELS[valor] || valor.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }
  // Percentage
  if (chave.includes("percentual")) {
    const num = parseFloat(valor);
    if (!isNaN(num)) return `${(num * 100).toFixed(0)}%`;
  }
  return valor;
}

function getFactLabel(chave: string): string {
  if (FACT_LABELS[chave]) return FACT_LABELS[chave].label;
  // Handle deposito_fgts_YYYY_MM pattern
  if (chave.startsWith("deposito_fgts_")) {
    const parts = chave.replace("deposito_fgts_", "").split("_");
    if (parts.length === 2) {
      const [year, month] = parts;
      try {
        const d = new Date(parseInt(year), parseInt(month) - 1);
        return `Depósito FGTS — ${format(d, "MMMM/yyyy", { locale: ptBR })}`;
      } catch { /* fall through */ }
    }
    return `Depósito FGTS — ${parts.join("/")}`;
  }
  return chave.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// =====================================================
// TYPES
// =====================================================
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
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

// =====================================================
// COMPONENT
// =====================================================
export function ImpugnationPackage({ caseId, snapshot, resultItems, onExport }: ImpugnationPackageProps) {
  const [isExporting, setIsExporting] = useState(false);

  const { data: validations = [] } = useQuery({
    queryKey: ["validations", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validations").select("*").eq("case_id", caseId)
        .order("validated_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: facts = [] } = useQuery({
    queryKey: ["facts_impugnation", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facts").select("*").eq("case_id", caseId).eq("confirmado", true);
      if (error) throw error;
      return data;
    },
  });

  const groupedByRubrica = useMemo(() => {
    const groups: Record<string, { nome: string; items: ResultItem[]; total: number }> = {};
    resultItems.forEach((item) => {
      if (!groups[item.rubrica_codigo]) {
        groups[item.rubrica_codigo] = { nome: item.rubrica_nome || item.rubrica_codigo, items: [], total: 0 };
      }
      groups[item.rubrica_codigo].items.push(item);
      groups[item.rubrica_codigo].total += item.valor_bruto;
    });
    return groups;
  }, [resultItems]);

  // Group facts by category
  const factsByCategory = useMemo(() => {
    const categories: Record<string, typeof facts> = {};
    const sorted = [...facts].sort((a, b) => {
      const catA = FACT_LABELS[a.chave]?.category || "Outros";
      const catB = FACT_LABELS[b.chave]?.category || "Outros";
      return catA.localeCompare(catB);
    });
    for (const fact of sorted) {
      const cat = FACT_LABELS[fact.chave]?.category || (fact.chave.startsWith("deposito_fgts") ? "FGTS" : "Outros");
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(fact);
    }
    return categories;
  }, [facts]);

  const generateExportContent = () => {
    const lines: string[] = [];
    lines.push("═".repeat(60));
    lines.push("  PACOTE DE IMPUGNAÇÃO — MEMÓRIA DE CÁLCULO");
    lines.push("═".repeat(60));
    lines.push("");

    lines.push("1. METODOLOGIA");
    lines.push("─".repeat(40));
    lines.push(`   Motor de Cálculo: versão ${snapshot.engine_version}`);
    lines.push(`   Hash de Integridade: ${snapshot.ruleset_hash || "N/A"}`);
    lines.push(`   Gerado em: ${format(new Date(snapshot.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`);
    lines.push("");

    lines.push("2. DADOS DO VÍNCULO EMPREGATÍCIO");
    lines.push("─".repeat(40));
    for (const [cat, catFacts] of Object.entries(factsByCategory)) {
      lines.push(`\n   ${cat.toUpperCase()}`);
      for (const fact of catFacts) {
        const label = getFactLabel(fact.chave);
        const value = formatFactValue(fact.chave, fact.valor);
        const conf = fact.confianca ? ` (${Math.round(fact.confianca * 100)}% confiança)` : "";
        lines.push(`   • ${label}: ${value}${conf}`);
      }
    }
    lines.push("");

    lines.push("3. RESULTADO CONSOLIDADO");
    lines.push("─".repeat(40));
    lines.push(`   Total Bruto:   ${formatCurrency(snapshot.total_bruto)}`);
    lines.push(`   Descontos:     ${formatCurrency(snapshot.total_descontos)}`);
    lines.push(`   Total Líquido: ${formatCurrency(snapshot.total_liquido)}`);
    lines.push("");

    lines.push("4. MEMÓRIA POR RUBRICA");
    lines.push("─".repeat(40));
    Object.entries(groupedByRubrica).forEach(([codigo, group]) => {
      lines.push(`\n   ${group.nome} — Total: ${formatCurrency(group.total)}`);
      group.items.forEach((item) => {
        const parts = [];
        if (item.base_calculo) parts.push(`Base: ${formatCurrency(item.base_calculo)}`);
        if (item.quantidade) parts.push(`Qtd: ${item.quantidade}`);
        if (item.percentual) parts.push(`${(item.percentual * 100).toFixed(1)}%`);
        lines.push(`     ${item.competencia || "Geral"}: ${formatCurrency(item.valor_bruto)}${parts.length ? ` (${parts.join(", ")})` : ""}`);
      });
    });
    lines.push("");

    lines.push("═".repeat(60));
    lines.push("  FIM DO PACOTE DE IMPUGNAÇÃO");
    lines.push("═".repeat(60));
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
      a.download = `impugnacao_v${snapshot.versao}_${format(new Date(), "yyyyMMdd_HHmm")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onExport?.();
    } finally {
      setIsExporting(false);
    }
  };

  const ACAO_LABELS: Record<string, string> = {
    aprovar: "Aprovado",
    editar: "Editado",
    rejeitar: "Rejeitado",
    criar: "Criado",
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
          <Accordion type="multiple" defaultValue={["premissas", "rubricas"]}>
            {/* Metodologia */}
            <AccordionItem value="metodologia">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Metodologia do Cálculo
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-0.5">Motor de Cálculo</p>
                      <p className="font-medium">Versão {snapshot.engine_version}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-0.5">Hash de Integridade</p>
                      <p className="font-mono text-sm">{snapshot.ruleset_hash?.slice(0, 16) || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-0.5">Gerado em</p>
                      <p className="font-medium">{format(new Date(snapshot.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-0.5">Status</p>
                      <Badge variant="outline">{snapshot.status === "gerado" ? "Gerado" : snapshot.status === "aprovado" ? "Aprovado" : "Em Revisão"}</Badge>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Dados do Vínculo (Premissas) — formatado humanizado */}
            <AccordionItem value="premissas">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dados do Vínculo Empregatício ({facts.length} fatos)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {Object.entries(factsByCategory).map(([category, catFacts]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3" />
                        {category}
                      </h4>
                      <div className="space-y-1.5">
                        {catFacts.map((fact) => (
                          <div key={fact.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{getFactLabel(fact.chave)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold">{formatFactValue(fact.chave, fact.valor)}</span>
                              {fact.confianca != null && (
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {Math.round(fact.confianca * 100)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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

            {/* Log de Validações */}
            <AccordionItem value="validacoes">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Histórico de Validações ({validations.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1.5">
                  {validations.slice(0, 20).map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(v.validated_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <span className="font-medium">{getFactLabel(v.campo)}</span>
                      <Badge variant={v.acao === "aprovar" ? "default" : "secondary"} className="text-xs">
                        {ACAO_LABELS[v.acao] || v.acao}
                      </Badge>
                    </div>
                  ))}
                  {validations.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma validação registrada.</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

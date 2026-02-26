import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Calculator,
  User,
  Briefcase,
  CalendarDays,
  DollarSign,
  Scale,
  FileText,
  Info,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

// =====================================================
// LEGAL BASIS MAP - Fundamentação jurídica por rubrica
// =====================================================
const FUNDAMENTOS_LEGAIS: Record<string, { artigos: string; tese: string }> = {
  horas_extras: {
    artigos: "Art. 59 e 71 da CLT; Súmula 85 do TST",
    tese: "As horas extras são devidas quando excedida a jornada contratual. O valor da hora extra é calculado com base no salário-hora acrescido do adicional mínimo de 50% (dias úteis) ou 100% (domingos e feriados), conforme Art. 7º, XVI da CF/88.",
  },
  HORAS_EXTRAS: {
    artigos: "Art. 59 e 71 da CLT; Súmula 85 do TST; Art. 7º, XVI da CF/88",
    tese: "Valor hora = salário ÷ divisor contratual. A hora extra corresponde ao valor hora acrescido do adicional de 50% em dias úteis e 100% em domingos/feriados.",
  },
  DSR_HORAS_EXTRAS: {
    artigos: "Súmula 172 do TST; Lei 605/1949, Art. 7º",
    tese: "O repouso semanal remunerado incide sobre as horas extras habitualmente prestadas, na proporção de 1/6 do total de horas extras (6 dias úteis para 1 DSR).",
  },
  SALDO_SAL: {
    artigos: "Art. 462 e 464 da CLT",
    tese: "O saldo de salário corresponde aos dias efetivamente trabalhados no mês da rescisão, calculado proporcionalmente (salário ÷ 30 × dias trabalhados).",
  },
  AVISO_PREVIO: {
    artigos: "Art. 487, §1º da CLT; Lei 12.506/2011",
    tese: "Aviso prévio indenizado de no mínimo 30 dias, acrescido de 3 dias por ano de serviço, limitado a 90 dias no total (Lei 12.506/2011).",
  },
  AVISO_PREVIO_ACORDO: {
    artigos: "Art. 484-A da CLT (Reforma Trabalhista)",
    tese: "Na rescisão por acordo mútuo, o aviso prévio é devido pela metade (50%), conforme Art. 484-A, I, 'a' da CLT.",
  },
  FERIAS_VENC: {
    artigos: "Art. 129, 130 e 137 da CLT; Art. 7º, XVII da CF/88",
    tese: "Férias vencidas são devidas integralmente acrescidas do terço constitucional (1/3), quando o período concessivo já expirou sem gozo pelo empregado.",
  },
  FERIAS_PROP: {
    artigos: "Art. 146, parágrafo único da CLT; Súmula 171 do TST",
    tese: "Férias proporcionais são calculadas à razão de 1/12 por mês trabalhado (ou fração ≥15 dias), acrescidas do terço constitucional. Devidas em qualquer modalidade de rescisão, exceto justa causa.",
  },
  DECIMO_PROP: {
    artigos: "Lei 4.090/1962; Art. 7º, VIII da CF/88",
    tese: "O 13º salário proporcional é calculado à razão de 1/12 por mês trabalhado no ano da rescisão. Devido em todas as modalidades, exceto justa causa.",
  },
  FGTS_8: {
    artigos: "Art. 15 da Lei 8.036/1990",
    tese: "O FGTS incide à alíquota de 8% sobre todas as verbas remuneratórias deferidas em juízo (horas extras, reflexos, etc.).",
  },
  FGTS_MULTA_40: {
    artigos: "Art. 18, §1º da Lei 8.036/1990; Art. 7º, I da CF/88",
    tese: "Na dispensa sem justa causa, é devida multa de 40% sobre o montante de FGTS depositado durante o contrato.",
  },
  MULTA_FGTS_40: {
    artigos: "Art. 18, §1º da Lei 8.036/1990",
    tese: "Multa rescisória de 40% incidente sobre os depósitos de FGTS relativos às verbas deferidas.",
  },
  MULTA_FGTS_20: {
    artigos: "Art. 484-A, I, 'b' da CLT",
    tese: "Na rescisão por acordo, a multa do FGTS é reduzida para 20% do saldo.",
  },
  REFLEXO_13: {
    artigos: "Súmula 45 do TST; Lei 4.090/1962",
    tese: "As horas extras habituais refletem no cálculo do 13º salário, integrando a base de cálculo pela média mensal.",
  },
  REFLEXO_FERIAS: {
    artigos: "Art. 142, §5º da CLT; Súmula 151 do TST",
    tese: "As horas extras habituais integram a remuneração para fins de férias, devendo ser considerada a média do período aquisitivo.",
  },
  atualizacao_monetaria: {
    artigos: "Art. 39, §1º da Lei 8.177/91; ADC 58 do STF",
    tese: "Atualização monetária pelo IPCA-E na fase pré-judicial e taxa SELIC na fase judicial, conforme decisão do STF na ADC 58.",
  },
  inss: {
    artigos: "Art. 195, I, 'a' da CF/88; Lei 8.212/1991",
    tese: "Desconto previdenciário incidente sobre as verbas de natureza remuneratória, conforme tabela progressiva vigente.",
  },
};

function getFundamento(codigo: string) {
  return FUNDAMENTOS_LEGAIS[codigo] || null;
}

// =====================================================
// FORMATTING HELPERS
// =====================================================
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
};

// =====================================================
// TYPES
// =====================================================
interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  confianca: number | null;
  confirmado: boolean;
}

interface AuditLineRow {
  id: string;
  linha: number;
  calculadora: string;
  competencia: string | null;
  descricao: string | null;
  formula: string | null;
  valor_bruto: number | null;
  valor_liquido: number | null;
  metadata: any;
}

interface CalculationDetailViewProps {
  caseId: string;
  facts: Fact[];
  onExecuteCalc?: () => void;
}

// =====================================================
// MAIN COMPONENT
// =====================================================
export function CalculationDetailView({ caseId, facts, onExecuteCalc }: CalculationDetailViewProps) {
  // Fetch latest calculation run
  const { data: latestRun } = useQuery({
    queryKey: ["latest_calc_run", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculation_runs")
        .select("*")
        .eq("case_id", caseId)
        .order("executado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch audit lines for the latest run
  const { data: auditLines = [] } = useQuery({
    queryKey: ["audit_lines_detail", latestRun?.id],
    queryFn: async () => {
      if (!latestRun?.id) return [];
      const { data, error } = await supabase
        .from("audit_lines")
        .select("*")
        .eq("run_id", latestRun.id)
        .order("linha", { ascending: true });
      if (error) throw error;
      return data as AuditLineRow[];
    },
    enabled: !!latestRun?.id,
  });

  if (!latestRun) {
    return (
      <div className="empty-state">
        <Calculator className="empty-state-icon" />
        <h3 className="empty-state-title">Nenhum cálculo executado</h3>
        <p className="empty-state-description">Execute um cálculo para ver os resultados detalhados.</p>
        {onExecuteCalc && (
          <Button onClick={onExecuteCalc} className="mt-4" size="lg">
            <Calculator className="mr-2 h-4 w-4" /> Executar Cálculo
          </Button>
        )}
      </div>
    );
  }

  // Parse resultado_bruto from the run
  const resultadoBruto = latestRun.resultado_bruto as any || {};
  const resultadoLiquido = latestRun.resultado_liquido as any || {};
  const warnings = (latestRun.warnings as any[]) || [];
  const porVerba = resultadoBruto.por_verba || {};

  // Extract client summary facts
  const clientFacts: { label: string; key: string; icon: any }[] = [
    { label: "Admissão", key: "data_admissao", icon: CalendarDays },
    { label: "Demissão", key: "data_demissao", icon: CalendarDays },
    { label: "Salário", key: "salario_mensal", icon: DollarSign },
    { label: "Salário Base", key: "salario_base", icon: DollarSign },
    { label: "Cargo/Função", key: "cargo", icon: Briefcase },
    { label: "Jornada", key: "jornada_contratual", icon: Briefcase },
    { label: "Tipo Demissão", key: "tipo_demissao", icon: Scale },
    { label: "HE Mensais", key: "horas_extras_mensais", icon: Calculator },
    { label: "Empregador", key: "empregador", icon: User },
    { label: "Nome", key: "nome_reclamante", icon: User },
  ];

  const availableClientFacts = clientFacts.filter(cf => facts.some(f => f.chave === cf.key));

  // Group audit lines by calculadora
  const auditByCalc: Record<string, AuditLineRow[]> = {};
  for (const line of auditLines) {
    const key = line.calculadora;
    if (!auditByCalc[key]) auditByCalc[key] = [];
    auditByCalc[key].push(line);
  }

  // Build structured verbas from por_verba + audit lines
  const verbaEntries = Object.entries(porVerba).map(([codigo, data]: [string, any]) => ({
    codigo,
    descricao: data.descricao || codigo,
    valor: data.valor || 0,
    fundamento: getFundamento(codigo),
    auditLines: auditLines.filter(l => {
      // Match audit lines to verbas by calculator name
      const calcName = l.calculadora;
      if (codigo.startsWith("HORAS_EXTRAS") || codigo === "DSR_HORAS_EXTRAS") return calcName === "horas_extras";
      if (codigo.startsWith("SALDO") || codigo.startsWith("AVISO") || codigo.startsWith("FERIAS") || codigo.startsWith("DECIMO") || codigo.startsWith("MULTA_FGTS")) return calcName === "verbas_rescisorias";
      if (codigo.startsWith("FGTS")) return calcName === "fgts";
      if (codigo.startsWith("REFLEXO_13")) return calcName === "reflexos_13";
      if (codigo.startsWith("REFLEXO_FERIAS")) return calcName === "reflexos_ferias";
      return calcName === codigo.toLowerCase();
    }),
  }));

  const totalBruto = resultadoBruto.total || 0;
  const totalLiquido = resultadoLiquido.total || totalBruto;

  const calcLabels: Record<string, string> = {
    horas_extras: "Horas Extras",
    verbas_rescisorias: "Verbas Rescisórias",
    reflexos_13: "Reflexos em 13º",
    reflexos_ferias: "Reflexos em Férias",
    fgts: "FGTS",
    inss: "INSS",
    atualizacao_monetaria: "Atualização Monetária",
  };

  return (
    <div className="space-y-6">
      {/* ========== DADOS DO CLIENTE ========== */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Dados do Vínculo (Extraídos via OCR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableClientFacts.map(cf => {
              const fact = facts.find(f => f.chave === cf.key);
              if (!fact) return null;
              const Icon = cf.icon;
              return (
                <div key={cf.key} className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] uppercase text-muted-foreground font-medium">{cf.label}</span>
                  </div>
                  <div className="text-sm font-semibold truncate" title={fact.valor}>
                    {cf.key.includes("data") ? formatDate(fact.valor) : fact.valor}
                  </div>
                  {fact.confianca != null && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">{Math.round(fact.confianca * 100)}% confiança</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ========== RESUMO TOTAL ========== */}
      <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-medium mb-1">Total Bruto</div>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalBruto)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-medium mb-1">Descontos</div>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalBruto - totalLiquido)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-medium mb-1">Total Líquido</div>
              <div className="text-2xl font-bold text-[hsl(var(--success))]">{formatCurrency(totalLiquido)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== WARNINGS ========== */}
      {warnings.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-accent font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Avisos do Motor ({warnings.length})
            </div>
            <ul className="space-y-1 text-sm text-accent/80">
              {warnings.map((w: any, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>{w.mensagem || (typeof w === "string" ? w : JSON.stringify(w))}</span>
                </li>
              ))}

            </ul>
          </CardContent>
        </Card>
      )}

      {/* ========== DETALHAMENTO POR RUBRICA ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Memória de Cálculo Detalhada
          </CardTitle>
        </CardHeader>
        <CardContent>
          {verbaEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma verba calculada.</p>
          ) : (
            <Accordion type="multiple" defaultValue={verbaEntries.map(v => v.codigo)} className="space-y-3">
              {verbaEntries.map(verba => (
                <AccordionItem key={verba.codigo} value={verba.codigo} className="border rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">{verba.codigo}</Badge>
                        <span className="font-medium text-sm">{verba.descricao}</span>
                      </div>
                      <span className="font-bold text-primary text-base">{formatCurrency(verba.valor)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    <div className="space-y-3">
                      {/* Fundamentação Jurídica */}
                      {verba.fundamento && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold text-primary uppercase">Fundamentação Jurídica</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1.5">
                            <strong>Base Legal:</strong> {verba.fundamento.artigos}
                          </div>
                          <div className="text-xs text-foreground/80 leading-relaxed">
                            {verba.fundamento.tese}
                          </div>
                        </div>
                      )}

                      {/* Audit lines = memória de cálculo */}
                      {verba.auditLines.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Competência</TableHead>
                              <TableHead className="text-xs">Descrição</TableHead>
                              <TableHead className="text-xs">Fórmula</TableHead>
                              <TableHead className="text-xs text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {verba.auditLines.map((line) => (
                              <TableRow key={line.id} className="text-xs">
                                <TableCell className="font-mono">{line.competencia || "—"}</TableCell>
                                <TableCell>{line.descricao || "—"}</TableCell>
                                <TableCell className="font-mono text-muted-foreground">{line.formula || "—"}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(line.valor_bruto)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      {verba.auditLines.length === 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
                          <Info className="h-3 w-3" />
                          Memória de cálculo resumida disponível no resultado consolidado.
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* ========== MEMÓRIA COMPLETA (por calculadora) ========== */}
      {Object.keys(auditByCalc).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Trilha de Auditoria Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {Object.entries(auditByCalc).map(([calc, lines]) => {
                const calcFundamento = getFundamento(calc);
                return (
                  <AccordionItem key={calc} value={calc} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline text-sm">
                      <div className="flex items-center gap-3 w-full pr-4">
                        <Badge variant="outline" className="font-mono text-xs">{calc}</Badge>
                        <span>{calcLabels[calc] || calc}</span>
                        <Badge variant="secondary" className="ml-auto">{lines.length} linhas</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-0">
                      {calcFundamento && (
                        <div className="p-2.5 rounded-md bg-muted/50 border border-border mb-3 text-xs">
                          <strong className="text-primary">{calcFundamento.artigos}</strong>
                          <p className="mt-1 text-muted-foreground">{calcFundamento.tese}</p>
                        </div>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs w-10">#</TableHead>
                            <TableHead className="text-xs">Comp.</TableHead>
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs">Fórmula</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((line) => (
                            <TableRow key={line.id} className="text-xs">
                              <TableCell className="text-muted-foreground">{line.linha}</TableCell>
                              <TableCell className="font-mono">{line.competencia || "—"}</TableCell>
                              <TableCell>{line.descricao}</TableCell>
                              <TableCell className="font-mono text-muted-foreground max-w-[200px] truncate" title={line.formula || undefined}>
                                {line.formula || "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(line.valor_bruto)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

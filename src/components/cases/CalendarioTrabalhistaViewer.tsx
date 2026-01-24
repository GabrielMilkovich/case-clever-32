import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Umbrella,
  Briefcase,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  gerarCalendariosPeriodo,
  calcularDSRSobreVariaveis,
  type CalendarioCompetencia,
} from "@/lib/calculation/calendario-trabalhista";

interface Fact {
  chave: string;
  valor: string;
}

interface CalendarioTrabalhistaViewerProps {
  caseId?: string;
  facts?: Fact[];
  dataInicio?: string; // "YYYY-MM-DD"
  dataFim?: string; // "YYYY-MM-DD"
  onCompetenciaSelect?: (competencia: CalendarioCompetencia) => void;
}

export function CalendarioTrabalhistaViewer({
  caseId,
  facts = [],
  dataInicio,
  dataFim,
  onCompetenciaSelect,
}: CalendarioTrabalhistaViewerProps) {
  // Extract dates from facts if available
  const factInicio = facts.find((f) => f.chave === "data_admissao")?.valor;
  const factFim = facts.find((f) => f.chave === "data_demissao")?.valor;
  const [inicio, setInicio] = useState(
    dataInicio ? dataInicio.slice(0, 7) : factInicio ? factInicio.slice(0, 7) : "2023-01"
  );
  const [fim, setFim] = useState(
    dataFim ? dataFim.slice(0, 7) : factFim ? factFim.slice(0, 7) : "2024-12"
  );
  const [valorTeste, setValorTeste] = useState<number>(1000);
  const [competenciaTeste, setCompetenciaTeste] = useState<string>("2024-01");

  const calendarios = useMemo(() => {
    try {
      return gerarCalendariosPeriodo(inicio, fim);
    } catch {
      return [];
    }
  }, [inicio, fim]);

  const dsrTeste = useMemo(() => {
    if (!valorTeste || !competenciaTeste) return null;
    return calcularDSRSobreVariaveis(valorTeste, competenciaTeste, "calendario");
  }, [valorTeste, competenciaTeste]);

  const totais = useMemo(() => {
    return calendarios.reduce(
      (acc, c) => ({
        diasUteis: acc.diasUteis + c.diasUteis,
        dsrs: acc.dsrs + c.dsrs,
        feriados: acc.feriados + c.feriados,
      }),
      { diasUteis: 0, dsrs: 0, feriados: 0 }
    );
  }, [calendarios]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Calendário Trabalhista</h2>
            <p className="text-sm text-muted-foreground">
              Dias úteis, DSRs e feriados por competência para cálculos precisos
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Competência Início</Label>
            <Input
              type="month"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Competência Fim</Label>
            <Input
              type="month"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor para Teste DSR</Label>
            <Input
              type="number"
              value={valorTeste}
              onChange={(e) => setValorTeste(Number(e.target.value))}
              placeholder="R$ 1.000,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Competência Teste</Label>
            <Input
              type="month"
              value={competenciaTeste}
              onChange={(e) => setCompetenciaTeste(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* DSR Test Result */}
      {dsrTeste && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-accent" />
              Simulação DSR sobre Variáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor Base</p>
                <p className="text-lg font-bold">
                  R$ {dsrTeste.valorBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">DSR Calculado</p>
                <p className="text-lg font-bold text-accent">
                  R$ {dsrTeste.valorDSR.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dias Úteis</p>
                <p className="text-lg font-bold">{dsrTeste.calendario.diasUteis}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">DSRs</p>
                <p className="text-lg font-bold">{dsrTeste.calendario.dsrs}</p>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-muted/50 font-mono text-sm">
              <span className="text-muted-foreground">Fórmula: </span>
              {dsrTeste.formula}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="card-interactive">
          <CardContent className="pt-6 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-primary/70" />
            <p className="text-3xl font-bold">{totais.diasUteis}</p>
            <p className="text-sm text-muted-foreground">Dias Úteis Total</p>
          </CardContent>
        </Card>
        <Card className="card-interactive">
          <CardContent className="pt-6 text-center">
            <Sun className="h-8 w-8 mx-auto mb-2 text-accent/70" />
            <p className="text-3xl font-bold">{totais.dsrs}</p>
            <p className="text-sm text-muted-foreground">DSRs Total</p>
          </CardContent>
        </Card>
        <Card className="card-interactive">
          <CardContent className="pt-6 text-center">
            <Umbrella className="h-8 w-8 mx-auto mb-2 text-green-500/70" />
            <p className="text-3xl font-bold">{totais.feriados}</p>
            <p className="text-sm text-muted-foreground">Feriados Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detalhamento por Competência</span>
            <Badge variant="outline">{calendarios.length} competências</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Competência</TableHead>
                  <TableHead className="text-center font-semibold">Dias do Mês</TableHead>
                  <TableHead className="text-center font-semibold">Dias Úteis</TableHead>
                  <TableHead className="text-center font-semibold">Domingos</TableHead>
                  <TableHead className="text-center font-semibold">Sábados</TableHead>
                  <TableHead className="text-center font-semibold">Feriados</TableHead>
                  <TableHead className="text-center font-semibold">DSRs</TableHead>
                  <TableHead>Feriados do Mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendarios.map((c, idx) => (
                  <TableRow 
                    key={c.competencia}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      idx % 2 === 0 && "bg-muted/20"
                    )}
                    onClick={() => onCompetenciaSelect?.(c)}
                  >
                    <TableCell className="font-medium font-mono">
                      {c.competencia}
                    </TableCell>
                    <TableCell className="text-center">{c.diasMes}</TableCell>
                    <TableCell className="text-center font-semibold text-primary">
                      {c.diasUteis}
                    </TableCell>
                    <TableCell className="text-center">{c.domingos}</TableCell>
                    <TableCell className="text-center">{c.sabados}</TableCell>
                    <TableCell className="text-center">
                      {c.feriados > 0 ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {c.feriados}
                        </Badge>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-accent">
                      {c.dsrs}
                    </TableCell>
                    <TableCell>
                      {c.diasFeriadosList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.diasFeriadosList.map((f) => (
                            <Badge key={f} variant="outline" className="text-xs font-mono">
                              {f.split("-")[2]}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

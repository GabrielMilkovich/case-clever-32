/**
 * Comparador de Paridade MRDcalc × PJe-Calc
 * Shows per-verba divergence analysis between engine results and PJC ground truth
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VerbaComparison {
  nome: string;
  tipo: string;
  pjecalc_devido: number;
  pjecalc_pago: number;
  pjecalc_diferenca: number;
  mrdcalc_diferenca: number | null; // null = not calculated yet
  divergencia_abs: number;
  divergencia_pct: number;
  origem_divergencia: string;
  status: 'ok' | 'warning' | 'error' | 'pending';
}

interface ParityData {
  verbas: VerbaComparison[];
  totals: {
    pjecalc_liquido: number;
    pjecalc_inss_reclamante: number;
    pjecalc_inss_reclamado: number;
    pjecalc_ir: number;
    pjecalc_honorarios: number;
    mrdcalc_liquido: number | null;
    mrdcalc_inss_reclamante: number | null;
  };
}

interface ComparadorParidadeProps {
  parityData: ParityData | null;
  loading?: boolean;
}

function formatBRL(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusIcon(status: string) {
  switch (status) {
    case 'ok': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Badge variant="outline" className="text-xs">Pendente</Badge>;
  }
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    ok: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    pending: 'bg-muted text-muted-foreground',
  };
  const labels: Record<string, string> = {
    ok: '✓ Paridade',
    warning: '⚠ Divergência',
    error: '✗ Erro',
    pending: '○ Pendente',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.pending}`}>{labels[status] || labels.pending}</span>;
}

export function ComparadorParidade({ parityData, loading }: ComparadorParidadeProps) {
  const [sortBy, setSortBy] = useState<'nome' | 'divergencia'>('divergencia');

  const sortedVerbas = useMemo(() => {
    if (!parityData) return [];
    const list = [...parityData.verbas];
    if (sortBy === 'divergencia') {
      list.sort((a, b) => Math.abs(b.divergencia_abs) - Math.abs(a.divergencia_abs));
    } else {
      list.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return list;
  }, [parityData, sortBy]);

  const stats = useMemo(() => {
    if (!parityData) return { ok: 0, warning: 0, error: 0, pending: 0, total: 0, parityPct: 0 };
    const ok = parityData.verbas.filter(v => v.status === 'ok').length;
    const warning = parityData.verbas.filter(v => v.status === 'warning').length;
    const error = parityData.verbas.filter(v => v.status === 'error').length;
    const pending = parityData.verbas.filter(v => v.status === 'pending').length;
    const total = parityData.verbas.length;
    const parityPct = total > 0 ? Math.round((ok / total) * 100) : 0;
    return { ok, warning, error, pending, total, parityPct };
  }, [parityData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Carregando dados de paridade...
        </CardContent>
      </Card>
    );
  }

  if (!parityData) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Comparador de Paridade</p>
          <p className="text-sm">Importe um arquivo .PJC e execute o motor de cálculo para visualizar a comparação.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
            <p className="text-xs text-muted-foreground">Paridade OK</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
            <p className="text-xs text-muted-foreground">Divergências</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.error}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.parityPct}%</p>
            <Progress value={stats.parityPct} className="mt-1 h-2" />
            <p className="text-xs text-muted-foreground mt-1">Índice de Paridade</p>
          </CardContent>
        </Card>
      </div>

      {/* Totals Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Totais — Ground Truth PJe-Calc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Líquido Exequente</p>
              <p className="font-mono font-bold">{formatBRL(parityData.totals.pjecalc_liquido)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">INSS Reclamante</p>
              <p className="font-mono">{formatBRL(parityData.totals.pjecalc_inss_reclamante)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">INSS Reclamado</p>
              <p className="font-mono">{formatBRL(parityData.totals.pjecalc_inss_reclamado)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Imposto de Renda</p>
              <p className="font-mono">{formatBRL(parityData.totals.pjecalc_ir)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Honorários</p>
              <p className="font-mono">{formatBRL(parityData.totals.pjecalc_honorarios)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Verba Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Verbas — Comparação Linha a Linha</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy(s => s === 'nome' ? 'divergencia' : 'nome')}
            >
              <ArrowUpDown className="h-3 w-3 mr-1" />
              {sortBy === 'nome' ? 'Ordenar por Δ' : 'Ordenar A-Z'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Verba</TableHead>
                  <TableHead className="text-right">PJe-Calc (Dif.)</TableHead>
                  <TableHead className="text-right">MRDcalc (Dif.)</TableHead>
                  <TableHead className="text-right">Δ Absoluto</TableHead>
                  <TableHead className="text-right">Δ %</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVerbas.map((v, i) => (
                  <TableRow key={i} className={v.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : v.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                    <TableCell>{statusIcon(v.status)}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{v.nome}</span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{v.tipo}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatBRL(v.pjecalc_diferenca)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatBRL(v.mrdcalc_diferenca)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${Math.abs(v.divergencia_abs) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatBRL(v.divergencia_abs)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {v.divergencia_pct !== 0 ? `${v.divergencia_pct.toFixed(2)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {v.origem_divergencia || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {statusBadge(v.status)}
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

/**
 * Builds parity data from a PJCAnalysis (ground truth) and MRDcalc results
 */
export function buildParityData(
  pjcAnalysis: PJCAnalysis,
  mrdResults?: Map<string, number>, // verba_nome → diferença calculada
): ParityData {
  const verbas: VerbaComparison[] = pjcAnalysis.verbas.map(v => {
    const mrdDif = mrdResults?.get(v.nome) ?? null;
    const pjcDif = v.total_diferenca ?? 0;
    const divAbs = mrdDif !== null ? Math.abs(mrdDif - pjcDif) : 0;
    const divPct = pjcDif !== 0 && mrdDif !== null ? ((mrdDif - pjcDif) / Math.abs(pjcDif)) * 100 : 0;

    let status: 'ok' | 'warning' | 'error' | 'pending' = 'pending';
    if (mrdDif !== null) {
      if (divAbs <= 0.01) status = 'ok';
      else if (divAbs <= 1.0) status = 'warning';
      else status = 'error';
    }

    let origem = '';
    if (mrdDif === null) origem = 'Motor não executado';
    else if (divAbs <= 0.01) origem = '';
    else origem = 'Verificar parâmetros do engine';

    return {
      nome: v.nome,
      tipo: v.tipo,
      pjecalc_devido: v.total_devido ?? 0,
      pjecalc_pago: v.total_pago ?? 0,
      pjecalc_diferenca: pjcDif,
      mrdcalc_diferenca: mrdDif,
      divergencia_abs: mrdDif !== null ? mrdDif - pjcDif : 0,
      divergencia_pct: divPct,
      origem_divergencia: origem,
      status,
    };
  });

  return {
    verbas,
    totals: {
      pjecalc_liquido: pjcAnalysis.resultado.liquido_exequente,
      pjecalc_inss_reclamante: pjcAnalysis.resultado.inss_reclamante,
      pjecalc_inss_reclamado: pjcAnalysis.resultado.inss_reclamado,
      pjecalc_ir: pjcAnalysis.resultado.imposto_renda,
      pjecalc_honorarios: pjcAnalysis.resultado.honorarios.reduce((s, h) => s + h.valor, 0),
      mrdcalc_liquido: null,
      mrdcalc_inss_reclamante: null,
    },
  };
}

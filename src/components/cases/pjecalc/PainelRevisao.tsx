/**
 * Phase 4, Item 7: Painel de Revisão Técnica
 * Consolidação para conferência antes de concluir o cálculo
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle, CheckCircle2, XCircle, Info, ClipboardCheck,
  FileText, Scale, Shield, Clock,
} from "lucide-react";
import type { PjeValidationResult, PjeLiquidacaoResult } from "@/lib/pjecalc/engine";

interface ReviewItem {
  id: string;
  modulo: string;
  descricao: string;
  tipo: 'erro' | 'alerta' | 'info' | 'sugestao';
  status: 'pendente' | 'revisado' | 'aprovado' | 'requer_validacao';
  nota?: string;
}

interface Props {
  caseId: string;
  validacao: PjeValidationResult | null;
  resultado: PjeLiquidacaoResult | null;
  modulosStatus: Record<string, string>;
}

export function PainelRevisao({ caseId, validacao, resultado, modulosStatus }: Props) {
  const [items, setItems] = useState<ReviewItem[]>(() => {
    const all: ReviewItem[] = [];

    // From validation
    if (validacao) {
      validacao.itens.forEach((v, i) => {
        all.push({
          id: `val-${i}`,
          modulo: v.modulo,
          descricao: v.mensagem,
          tipo: v.tipo === 'erro' ? 'erro' : v.tipo === 'alerta' ? 'alerta' : 'info',
          status: 'pendente',
        });
      });
    }

    // From incomplete modules
    Object.entries(modulosStatus).forEach(([mod, status]) => {
      if (status === 'nao_iniciado' || status === 'incompleto') {
        all.push({
          id: `mod-${mod}`,
          modulo: mod,
          descricao: `Módulo ${mod} está ${status === 'nao_iniciado' ? 'não iniciado' : 'incompleto'}`,
          tipo: 'alerta',
          status: 'pendente',
        });
      }
    });

    // From results
    if (resultado) {
      if (resultado.resumo.principal_bruto === 0) {
        all.push({ id: 'res-zero', modulo: 'Resumo', descricao: 'Principal bruto é R$ 0,00 — verificar base de cálculo', tipo: 'alerta', status: 'pendente' });
      }
      const verbasZero = resultado.verbas.filter(v => v.total_diferenca === 0);
      if (verbasZero.length > 0) {
        all.push({ id: 'res-verbas-zero', modulo: 'Verbas', descricao: `${verbasZero.length} verba(s) com diferença zero`, tipo: 'info', status: 'pendente' });
      }
    }

    return all;
  });

  const updateItemStatus = (id: string, status: ReviewItem['status']) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  const updateItemNota = (id: string, nota: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, nota } : item));
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'erro': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'alerta': return <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />;
      case 'sugestao': return <Scale className="h-3.5 w-3.5 text-primary" />;
      default: return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pendente: { label: 'Pendente', variant: 'secondary' },
      revisado: { label: 'Revisado', variant: 'outline' },
      aprovado: { label: 'Aprovado', variant: 'default' },
      requer_validacao: { label: 'Validação', variant: 'destructive' },
    };
    const m = map[s] || map.pendente;
    return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
  };

  const totalPendente = items.filter(i => i.status === 'pendente').length;
  const totalRevisado = items.filter(i => i.status !== 'pendente').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Painel de Revisão Técnica
        </h2>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs">{totalPendente} pendentes</Badge>
          <Badge variant="default" className="text-xs">{totalRevisado} revisados</Badge>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-[hsl(var(--success))]" />
            Nenhum item de revisão pendente. Execute a liquidação para gerar itens de revisão.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(item.tipo)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">{item.modulo}</span>
                      {statusBadge(item.status)}
                    </div>
                    <div className="text-xs">{item.descricao}</div>
                    {item.nota && (
                      <div className="text-[10px] text-muted-foreground mt-1 italic">Nota: {item.nota}</div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => updateItemStatus(item.id, 'revisado')}
                    >Revisado</Button>
                    <Button
                      variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                      onClick={() => updateItemStatus(item.id, 'aprovado')}
                    >OK</Button>
                    <Button
                      variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive"
                      onClick={() => updateItemStatus(item.id, 'requer_validacao')}
                    >!</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

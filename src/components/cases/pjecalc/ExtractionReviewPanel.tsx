/**
 * Painel de Revisão de Extrações
 * UI para revisar/confirmar/rejeitar itens extraídos com evidência
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check, X, Edit2, Eye, AlertTriangle, FileText,
  ChevronDown, ChevronUp, Filter, CheckCircle2,
  Clock, Loader2
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

interface Props {
  caseId: string;
  pipelineId?: string;
  onConfirmAll?: () => void;
}

type ExtractionStatus = Database["public"]["Enums"]["extracao_status"];

interface ExtractionItem {
  id: string;
  pipeline_id: string;
  field_key: string;
  valor: string | null;
  confidence: number | null;
  page: number | null;
  evidence_text: string | null;
  status: ExtractionStatus;
  target_table: string | null;
  target_field: string | null;
  competencia: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

interface PipelineRow {
  id: string;
  template_detectado: string | null;
  template_version: string | null;
  empresa_detectada: string | null;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  AUTO: { label: "Auto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  REVISAR: { label: "Revisar", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertTriangle },
  CONFIRMADO: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
  REJEITADO: { label: "Rejeitado", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: X },
};

const TARGET_LABELS: Record<string, string> = {
  pjecalc_rubrica_raw: "Rubrica",
  pjecalc_apuracao_diaria: "Ponto Diário",
  pjecalc_evento_intervalo: "Evento",
  pjecalc_calculos: "Dados Processo",
  pjecalc_hist_salarial: "Histórico",
};

export function ExtractionReviewPanel({ caseId, pipelineId, onConfirmAll }: Props) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ExtractionStatus | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Load extractions
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["extracao_items", caseId, pipelineId],
    queryFn: async () => {
      let query = supabase
        .from("extracao_item")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });

      if (pipelineId) query = query.eq("pipeline_id", pipelineId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ExtractionItem[];
    },
  });

  // Load pipeline info
  const { data: pipeline } = useQuery({
    queryKey: ["pipeline_info", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_pipeline")
        .select("*")
        .eq("id", pipelineId!)
        .single();
      return data as PipelineRow | null;
    },
  });

  // Update mutation
  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExtractionItem> }) => {
      const { error } = await supabase
        .from("extracao_item")
        .update({
          ...updates,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extracao_items", caseId] });
    },
  });

  const handleConfirm = (id: string) => {
    updateItem.mutate({ id, updates: { status: "CONFIRMADO" } });
  };

  const handleReject = (id: string) => {
    updateItem.mutate({ id, updates: { status: "REJEITADO" } });
  };

  const handleEdit = (item: ExtractionItem) => {
    setEditingId(item.id);
    setEditValue(item.valor || "");
  };

  const handleSaveEdit = (id: string) => {
    updateItem.mutate({
      id,
      updates: { valor: editValue, status: "CONFIRMADO", review_note: "Editado manualmente" },
    });
    setEditingId(null);
  };

  const handleConfirmAll = async () => {
    const pending = filteredItems.filter(i => i.status === "AUTO" || i.status === "REVISAR");
    for (const item of pending) {
      await supabase
        .from("extracao_item")
        .update({ status: "CONFIRMADO", reviewed_at: new Date().toISOString() })
        .eq("id", item.id);
    }
    qc.invalidateQueries({ queryKey: ["extracao_items", caseId] });
    toast.success(`${pending.length} item(ns) confirmado(s)`);
    onConfirmAll?.();
  };

  const filteredItems = filter === "ALL" ? items : items.filter(i => i.status === filter);

  const stats = {
    total: items.length,
    auto: items.filter(i => i.status === "AUTO").length,
    revisar: items.filter(i => i.status === "REVISAR").length,
    confirmado: items.filter(i => i.status === "CONFIRMADO").length,
    rejeitado: items.filter(i => i.status === "REJEITADO").length,
  };

  const fmtConf = (c: number | null) => c ? `${Math.round(c * 100)}%` : "—";

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">Carregando extrações...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma extração encontrada para este caso.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Faça upload de documentos e execute o detector de template para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pipeline header */}
      {pipeline && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline">{pipeline.template_detectado || "?"}</Badge>
          <Badge variant="secondary">{pipeline.template_version || "?"}</Badge>
          {pipeline.empresa_detectada && (
            <Badge variant="outline" className="font-mono">{pipeline.empresa_detectada}</Badge>
          )}
          <Badge className={
            pipeline.status === "extraido"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          }>
            {pipeline.status}
          </Badge>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px]">{stats.total} total</Badge>
        <button onClick={() => setFilter("AUTO")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "AUTO" ? "bg-blue-200 dark:bg-blue-800" : "bg-muted"}`}>
          {stats.auto} auto
        </button>
        <button onClick={() => setFilter("REVISAR")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "REVISAR" ? "bg-amber-200 dark:bg-amber-800" : "bg-muted"}`}>
          {stats.revisar} revisar
        </button>
        <button onClick={() => setFilter("CONFIRMADO")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "CONFIRMADO" ? "bg-emerald-200 dark:bg-emerald-800" : "bg-muted"}`}>
          {stats.confirmado} ✓
        </button>
        <button onClick={() => setFilter("REJEITADO")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "REJEITADO" ? "bg-red-200 dark:bg-red-800" : "bg-muted"}`}>
          {stats.rejeitado} ✗
        </button>
        <button onClick={() => setFilter("ALL")} className={`text-[10px] px-2 py-0.5 rounded ${filter === "ALL" ? "bg-primary/20" : "bg-muted"}`}>
          Todos
        </button>

        <div className="flex-1" />
        {stats.auto + stats.revisar > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleConfirmAll}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmar Todos ({stats.auto + stats.revisar})
          </Button>
        )}
      </div>

      {/* Items list */}
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-1.5">
          {filteredItems.map((item) => {
            const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.REVISAR;
            const StatusIcon = sc.icon;
            const isExpanded = expandedId === item.id;
            const isEditing = editingId === item.id;

            return (
              <Card key={item.id} className="border-border/50">
                <CardContent className="p-2.5 space-y-1.5">
                  {/* Main row */}
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] ${sc.color}`}>
                      <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                      {sc.label}
                    </Badge>

                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                      {item.field_key}
                    </span>

                    {item.competencia && (
                      <Badge variant="outline" className="text-[9px] font-mono">{item.competencia}</Badge>
                    )}

                    {item.target_table && (
                      <Badge variant="secondary" className="text-[9px]">
                        {TARGET_LABELS[item.target_table] || item.target_table}
                      </Badge>
                    )}

                    <span className="text-[10px] text-muted-foreground">
                      {fmtConf(item.confidence)}
                    </span>

                    <div className="flex-1" />

                    {/* Value */}
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-6 text-[10px] w-32"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleSaveEdit(item.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-mono font-medium truncate max-w-[200px] cursor-default">
                              {item.valor?.slice(0, 50) || "—"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent><p className="font-mono text-xs max-w-xs break-all">{item.valor}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Actions */}
                    {item.status !== "CONFIRMADO" && item.status !== "REJEITADO" && !isEditing && (
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-600" onClick={() => handleConfirm(item.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(item)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleReject(item.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>

                  {/* Expanded evidence */}
                  {isExpanded && (
                    <div className="pl-4 space-y-1">
                      <Separator />
                      {item.evidence_text && (
                        <div className="text-[10px] bg-muted/50 p-2 rounded font-mono whitespace-pre-wrap">
                          <Eye className="h-3 w-3 inline mr-1 text-muted-foreground" />
                          {item.evidence_text}
                        </div>
                      )}
                      {item.page && (
                        <p className="text-[10px] text-muted-foreground">Página: {item.page}</p>
                      )}
                      {item.review_note && (
                        <p className="text-[10px] text-muted-foreground italic">Nota: {item.review_note}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

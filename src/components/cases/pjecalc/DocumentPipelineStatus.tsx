/**
 * DocumentPipelineStatus — mostra status dos documentos processados pelo pipeline
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Loader2, XCircle
} from "lucide-react";

interface Props {
  caseId: string;
}

const STATUS_MAP: Record<string, { icon: any; color: string; label: string }> = {
  detectado: { icon: Clock, color: "text-blue-500", label: "Detectado" },
  extraindo: { icon: Loader2, color: "text-amber-500", label: "Extraindo" },
  extraido: { icon: CheckCircle2, color: "text-emerald-500", label: "Extraído" },
  erro: { icon: XCircle, color: "text-destructive", label: "Erro" },
  revisado: { icon: CheckCircle2, color: "text-primary", label: "Revisado" },
};

const TYPE_LABELS: Record<string, string> = {
  CTPS: "CTPS",
  CARTAO_PONTO: "Cartão de Ponto",
  FICHA_FINANCEIRA: "Ficha Financeira",
  CONTRACHEQUE: "Contracheque",
  PJC: "Arquivo PJC",
};

export function DocumentPipelineStatus({ caseId }: Props) {
  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["doc_pipelines", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_pipeline")
        .select("*, documents!document_pipeline_document_id_fkey(file_name)")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: extractionCounts = {} } = useQuery({
    queryKey: ["extraction_counts", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("extracao_item")
        .select("pipeline_id, status")
        .eq("case_id", caseId);
      
      const counts: Record<string, { total: number; confirmed: number; pending: number }> = {};
      for (const item of (data || []) as any[]) {
        if (!counts[item.pipeline_id]) counts[item.pipeline_id] = { total: 0, confirmed: 0, pending: 0 };
        counts[item.pipeline_id].total++;
        if (item.status === "CONFIRMADO") counts[item.pipeline_id].confirmed++;
        else if (item.status !== "REJEITADO") counts[item.pipeline_id].pending++;
      }
      return counts;
    },
  });

  if (isLoading) return null;
  if (pipelines.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Pipeline de Documentos
          <Badge variant="outline" className="text-[9px]">{pipelines.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {pipelines.map((p: any) => {
          const st = STATUS_MAP[p.status] || STATUS_MAP.detectado;
          const Icon = st.icon;
          const counts = extractionCounts[p.id];
          const fileName = p.documents?.file_name || "Documento";

          return (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded border border-border/30 text-xs">
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${st.color} ${p.status === 'extraindo' ? 'animate-spin' : ''}`} />
              <div className="flex-1 min-w-0">
                <span className="truncate block text-xs">{fileName}</span>
                <div className="flex gap-1 mt-0.5">
                  <Badge variant="secondary" className="text-[8px]">
                    {TYPE_LABELS[p.pipeline_type] || p.pipeline_type}
                  </Badge>
                  {p.template_detectado && (
                    <Badge variant="outline" className="text-[8px]">{p.template_detectado}</Badge>
                  )}
                  {p.empresa_detectada && (
                    <Badge variant="outline" className="text-[8px] font-mono">{p.empresa_detectada}</Badge>
                  )}
                </div>
              </div>
              {counts && (
                <div className="flex gap-1 text-[9px] flex-shrink-0">
                  {counts.confirmed > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[8px]">
                      {counts.confirmed}✓
                    </Badge>
                  )}
                  {counts.pending > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[8px]">
                      {counts.pending}⏳
                    </Badge>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

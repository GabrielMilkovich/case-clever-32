import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, Calendar, ChevronRight, Clock, CheckCircle2, 
  AlertCircle, FileStack, Sparkles, Calculator
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CaseCardProps {
  id: string;
  cliente: string;
  numeroProcesso?: string | null;
  tribunal?: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criadoEm: string;
  documentCount?: number;
  factCount?: number;
  confirmedFactCount?: number;
  snapshotCount?: number;
  totalBruto?: number | null;
}

const statusConfig = {
  rascunho: { label: "Rascunho", icon: Clock, step: 0 },
  em_analise: { label: "Em Análise", icon: Sparkles, step: 1 },
  calculado: { label: "Calculado", icon: Calculator, step: 2 },
  revisado: { label: "Revisado", icon: CheckCircle2, step: 3 },
};

export function CaseCard({ 
  id, cliente, numeroProcesso, tribunal, status, criadoEm,
  documentCount = 0, factCount = 0, confirmedFactCount = 0, 
  snapshotCount = 0, totalBruto 
}: CaseCardProps) {
  const cfg = statusConfig[status];
  const progressPercent = Math.min(100, ((cfg.step + 1) / 4) * 100);
  const StatusIcon = cfg.icon;

  return (
    <Link to={`/casos/${id}`} className="block group">
      <Card className="card-interactive overflow-hidden">
        {/* Progress bar top accent */}
        <div className="h-1 w-full bg-muted">
          <div 
            className={cn(
              "h-full transition-all duration-500 rounded-r-full",
              status === "rascunho" && "bg-muted-foreground/30",
              status === "em_analise" && "bg-accent",
              status === "calculado" && "bg-[hsl(var(--success))]",
              status === "revisado" && "bg-primary",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {cliente}
              </h3>
              {numeroProcesso && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                  {numeroProcesso}
                </p>
              )}
              {tribunal && !numeroProcesso && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {tribunal}
                </p>
              )}
            </div>
            <span className={`status-badge status-${status} flex-shrink-0 gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </span>
          </div>

          {/* Metrics Row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" title="Documentos">
              <FileStack className="h-3 w-3" />
              {documentCount}
            </span>
            <span className="flex items-center gap-1" title="Fatos extraídos">
              <Sparkles className="h-3 w-3" />
              {factCount}
            </span>
            {confirmedFactCount > 0 && (
              <span className="flex items-center gap-1 text-[hsl(var(--success))]" title="Fatos confirmados">
                <CheckCircle2 className="h-3 w-3" />
                {confirmedFactCount}
              </span>
            )}
            {snapshotCount > 0 && (
              <span className="flex items-center gap-1" title="Snapshots de cálculo">
                <Calculator className="h-3 w-3" />
                {snapshotCount}
              </span>
            )}
          </div>

          {/* Value + Date */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            {totalBruto && totalBruto > 0 ? (
              <span className="text-xs font-semibold text-foreground">
                R$ {totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic">Sem cálculo</span>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(criadoEm), { addSuffix: true, locale: ptBR })}
              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary ml-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

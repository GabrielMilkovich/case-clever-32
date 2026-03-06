import { useIndicesSync } from "@/hooks/useIndicesSync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export function IndexStatusBadge() {
  const { status, lastSync, error, syncing, triggerSync } = useIndicesSync();

  const statusConfig = {
    loading: {
      icon: Clock,
      label: "Verificando...",
      variant: "outline" as const,
      className: "text-muted-foreground border-border",
    },
    ok: {
      icon: CheckCircle2,
      label: "Índices OK",
      variant: "outline" as const,
      className: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800",
    },
    stale: {
      icon: Clock,
      label: "Atualizando...",
      variant: "outline" as const,
      className: "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800",
    },
    error: {
      icon: AlertCircle,
      label: "Erro Sync",
      variant: "destructive" as const,
      className: "",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const tooltipText =
    status === "ok"
      ? `Última sincronização: ${lastSync ? new Date(lastSync).toLocaleString("pt-BR") : "N/A"}`
      : status === "error"
      ? `Erro: ${error || "Falha na sincronização"}. Clique para tentar novamente.`
      : status === "stale"
      ? "Sincronizando índices com o Banco Central..."
      : "Verificando estado dos índices...";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={triggerSync}
            disabled={syncing || status === "loading"}
          >
            {syncing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant={config.variant} className={`text-[10px] gap-1 px-2 py-0 h-5 font-normal ${config.className}`}>
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <p>{tooltipText}</p>
          {status === "error" && (
            <p className="mt-1 font-medium">Clique para tentar novamente</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

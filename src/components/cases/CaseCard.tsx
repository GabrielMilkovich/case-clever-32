import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CaseCardProps {
  id: string;
  cliente: string;
  numeroProcesso?: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criadoEm: string;
  documentCount?: number;
}

const statusLabels = {
  rascunho: "Rascunho",
  em_analise: "Em Análise",
  calculado: "Calculado",
  revisado: "Revisado",
};

export function CaseCard({ id, cliente, numeroProcesso, status, criadoEm }: CaseCardProps) {
  return (
    <Link to={`/casos/${id}`}>
      <Card className="card-interactive group">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {cliente}
              </h3>
              {numeroProcesso && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                  {numeroProcesso}
                </p>
              )}
            </div>
            <span className={`status-badge status-${status} flex-shrink-0`}>
              {statusLabels[status]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(criadoEm), { addSuffix: true, locale: ptBR })}
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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

export function CaseCard({
  id,
  cliente,
  numeroProcesso,
  status,
  criadoEm,
  documentCount = 0,
}: CaseCardProps) {
  return (
    <Link to={`/casos/${id}`}>
      <Card className="group glass-card hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {cliente}
              </h3>
              {numeroProcesso && (
                <p className="text-sm text-muted-foreground font-mono">
                  {numeroProcesso}
                </p>
              )}
            </div>
            <span className={`status-badge status-${status}`}>
              {statusLabels[status]}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                {documentCount} docs
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(criadoEm), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

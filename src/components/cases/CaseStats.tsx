import { Briefcase, FileCheck, Clock, CheckCircle2 } from "lucide-react";

interface CaseStatsProps {
  total: number;
  emAnalise: number;
  calculados: number;
  revisados: number;
}

export function CaseStats({ total, emAnalise, calculados, revisados }: CaseStatsProps) {
  const stats = [
    {
      label: "Total de Casos",
      value: total,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Em Análise",
      value: emAnalise,
      icon: Clock,
      color: "text-status-analysis",
      bgColor: "bg-status-analysis/10",
    },
    {
      label: "Calculados",
      value: calculados,
      icon: FileCheck,
      color: "text-status-calculated",
      bgColor: "bg-status-calculated/10",
    },
    {
      label: "Revisados",
      value: revisados,
      icon: CheckCircle2,
      color: "text-status-reviewed",
      bgColor: "bg-status-reviewed/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass-card rounded-xl p-5 animate-fade-in"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

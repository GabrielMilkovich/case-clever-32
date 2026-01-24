import { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight } from "lucide-react";

interface WorkflowStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  completed?: boolean;
  active?: boolean;
  count?: number;
}

interface CaseWorkspaceProps {
  cliente: string;
  numeroProcesso?: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  activeTab: string;
  onTabChange: (tab: string) => void;
  workflowSteps: WorkflowStep[];
  children: ReactNode;
}

const statusConfig = {
  rascunho: { label: "Rascunho", className: "status-rascunho" },
  em_analise: { label: "Em Análise", className: "status-em_analise" },
  calculado: { label: "Calculado", className: "status-calculado" },
  revisado: { label: "Revisado", className: "status-revisado" },
};

export function CaseWorkspace({
  cliente,
  numeroProcesso,
  status,
  activeTab,
  onTabChange,
  workflowSteps,
  children,
}: CaseWorkspaceProps) {
  const { id } = useParams();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Case Header with Glass Effect */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-border/50 p-6 shadow-sm">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {cliente}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {numeroProcesso || "Sem número de processo"}
            </p>
          </div>
          <Badge 
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full shadow-sm transition-all duration-300 hover:scale-105",
              statusConfig[status].className
            )}
          >
            {statusConfig[status].label}
          </Badge>
        </div>
      </div>

      {/* Premium Workflow Stepper */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl" />
        <div className="relative glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-2">
            {workflowSteps.map((step, idx) => {
              const isLast = idx === workflowSteps.length - 1;
              
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  {/* Step Button */}
                  <button
                    onClick={() => onTabChange(step.id)}
                    className={cn(
                      "group flex flex-col items-center gap-3 transition-all duration-300",
                      step.active && "scale-105",
                      !step.active && "opacity-60 hover:opacity-100 hover:scale-102"
                    )}
                  >
                    {/* Step Circle with Animation */}
                    <div
                      className={cn(
                        "relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
                        "border-2 shadow-sm",
                        step.completed && "bg-primary border-primary text-primary-foreground shadow-primary/25",
                        step.active && !step.completed && "bg-accent/10 border-accent text-accent shadow-accent/20 ring-4 ring-accent/10",
                        !step.active && !step.completed && "bg-muted/50 border-border text-muted-foreground group-hover:border-primary/50 group-hover:text-primary"
                      )}
                    >
                      {step.completed ? (
                        <Check className="h-5 w-5 animate-scale-in" />
                      ) : (
                        <step.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                      )}
                      
                      {/* Count Badge */}
                      {step.count !== undefined && step.count > 0 && (
                        <span className={cn(
                          "absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold px-1.5",
                          step.active 
                            ? "bg-accent text-accent-foreground shadow-sm" 
                            : "bg-primary/80 text-primary-foreground"
                        )}>
                          {step.count}
                        </span>
                      )}
                    </div>
                    
                    {/* Step Label */}
                    <span className={cn(
                      "text-xs font-medium whitespace-nowrap transition-colors duration-200",
                      step.active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {step.label}
                    </span>
                  </button>

                  {/* Connector Line with Progress Effect */}
                  {!isLast && (
                    <div className="flex-1 mx-3 h-0.5 relative overflow-hidden rounded-full bg-border/50">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
                          step.completed 
                            ? "w-full bg-gradient-to-r from-primary to-primary/80" 
                            : "w-0 bg-primary"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content with Staggered Animation */}
      <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        {children}
      </div>
    </div>
  );
}

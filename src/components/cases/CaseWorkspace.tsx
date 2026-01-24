import { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Sparkles,
  ShieldCheck,
  Settings2,
  Calculator,
  FileStack,
  Scroll,
  ChevronRight,
  Check,
} from "lucide-react";

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
  rascunho: { label: "Rascunho", className: "status-draft" },
  em_analise: { label: "Em Análise", className: "status-analysis" },
  calculado: { label: "Calculado", className: "status-calculated" },
  revisado: { label: "Revisado", className: "status-reviewed" },
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
    <div className="space-y-6">
      {/* Case Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{cliente}</h1>
          <p className="text-sm text-muted-foreground">
            {numeroProcesso || "Sem número de processo"}
          </p>
        </div>
        <Badge className={cn("status-badge", statusConfig[status].className)}>
          {statusConfig[status].label}
        </Badge>
      </div>

      {/* Workflow Stepper */}
      <div className="card-interactive p-4">
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step */}
              <button
                onClick={() => onTabChange(step.id)}
                className={cn(
                  "stepper-item group cursor-pointer",
                  step.active && "opacity-100",
                  !step.active && "opacity-60 hover:opacity-80"
                )}
              >
                <div
                  className={cn(
                    "stepper-circle",
                    step.completed && "completed",
                    step.active && !step.completed && "active"
                  )}
                >
                  {step.completed ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs mt-2 font-medium whitespace-nowrap">
                  {step.label}
                  {step.count !== undefined && step.count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                      {step.count}
                    </Badge>
                  )}
                </span>
              </button>

              {/* Connector Line */}
              {idx < workflowSteps.length - 1 && (
                <div
                  className={cn(
                    "stepper-line mx-4",
                    step.completed && "completed"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation (Secondary) */}
      <div className="flex items-center gap-1 border-b border-border">
        {workflowSteps.map((step) => (
          <button
            key={step.id}
            onClick={() => onTabChange(step.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
              "border-b-2 -mb-px",
              step.active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <step.icon className="h-4 w-4" />
            {step.label}
            {step.count !== undefined && step.count > 0 && (
              <Badge variant="outline" className="text-xs px-1.5">
                {step.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {children}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import {
  FileText, Settings, DollarSign, CalendarOff, Palmtree, Clock,
  ListChecks, Landmark, ShieldCheck, Receipt, TrendingUp, BarChart3,
  ChevronLeft, ChevronRight
} from "lucide-react";

export type PjeCalcModule =
  | "dados-processo"
  | "parametros"
  | "historico-salarial"
  | "faltas"
  | "ferias"
  | "cartao-ponto"
  | "verbas"
  | "fgts"
  | "contribuicao-social"
  | "imposto-renda"
  | "correcao-juros"
  | "resumo";

interface ModuleItem {
  id: PjeCalcModule;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  group: "entrada" | "verbas" | "encargos" | "resultado";
}

export const MODULES: ModuleItem[] = [
  { id: "dados-processo", label: "Dados do Processo", shortLabel: "Processo", icon: FileText, group: "entrada" },
  { id: "parametros", label: "Parâmetros do Cálculo", shortLabel: "Parâmetros", icon: Settings, group: "entrada" },
  { id: "historico-salarial", label: "Histórico Salarial", shortLabel: "Salários", icon: DollarSign, group: "entrada" },
  { id: "faltas", label: "Faltas", shortLabel: "Faltas", icon: CalendarOff, group: "entrada" },
  { id: "ferias", label: "Férias", shortLabel: "Férias", icon: Palmtree, group: "entrada" },
  { id: "cartao-ponto", label: "Cartão de Ponto", shortLabel: "Ponto", icon: Clock, group: "entrada" },
  { id: "verbas", label: "Verbas", shortLabel: "Verbas", icon: ListChecks, group: "verbas" },
  { id: "fgts", label: "FGTS", shortLabel: "FGTS", icon: Landmark, group: "encargos" },
  { id: "contribuicao-social", label: "Contribuição Social", shortLabel: "CS", icon: ShieldCheck, group: "encargos" },
  { id: "imposto-renda", label: "Imposto de Renda", shortLabel: "IR", icon: Receipt, group: "encargos" },
  { id: "correcao-juros", label: "Correção Monetária", shortLabel: "Correção", icon: TrendingUp, group: "resultado" },
  { id: "resumo", label: "Resumo / Relatório", shortLabel: "Resumo", icon: BarChart3, group: "resultado" },
];

const GROUP_LABELS: Record<string, string> = {
  entrada: "Entrada de Dados",
  verbas: "Cálculo",
  encargos: "Encargos",
  resultado: "Resultado",
};

interface PjeCalcSidebarProps {
  activeModule: PjeCalcModule;
  onModuleChange: (mod: PjeCalcModule) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function PjeCalcSidebar({ activeModule, onModuleChange, collapsed, onToggleCollapse }: PjeCalcSidebarProps) {
  const groups = ["entrada", "verbas", "encargos", "resultado"] as const;

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border h-full transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-xs font-bold tracking-widest uppercase text-sidebar-foreground/60">
            PJe-Calc
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Modules */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-1">
        {groups.map((group) => {
          const items = MODULES.filter((m) => m.group === group);
          return (
            <div key={group}>
              {!collapsed && (
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/40">
                    {GROUP_LABELS[group]}
                  </span>
                </div>
              )}
              {items.map((mod, idx) => {
                const isActive = activeModule === mod.id;
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => onModuleChange(mod.id)}
                    title={collapsed ? mod.label : undefined}
                    className={cn(
                      "relative w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-all duration-150",
                      collapsed ? "justify-center" : "",
                      isActive
                        ? "text-sidebar-foreground bg-sidebar-accent font-medium"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-sidebar-primary" />
                    )}
                    <span className="flex items-center justify-center w-5 h-5 text-xs font-mono text-sidebar-foreground/40">
                      {String(idx + 1 + (group === "verbas" ? 6 : group === "encargos" ? 7 : group === "resultado" ? 10 : 0)).padStart(2, "0")}
                    </span>
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{mod.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Navigation */}
      <div className="border-t border-sidebar-border p-2 flex gap-1">
        <button
          onClick={() => {
            const idx = MODULES.findIndex((m) => m.id === activeModule);
            if (idx > 0) onModuleChange(MODULES[idx - 1].id);
          }}
          disabled={activeModule === MODULES[0].id}
          className="flex-1 text-xs py-1.5 rounded bg-sidebar-accent/60 text-sidebar-foreground/70 hover:bg-sidebar-accent disabled:opacity-30 transition-colors"
        >
          ← Anterior
        </button>
        <button
          onClick={() => {
            const idx = MODULES.findIndex((m) => m.id === activeModule);
            if (idx < MODULES.length - 1) onModuleChange(MODULES[idx + 1].id);
          }}
          disabled={activeModule === MODULES[MODULES.length - 1].id}
          className="flex-1 text-xs py-1.5 rounded bg-sidebar-accent/60 text-sidebar-foreground/70 hover:bg-sidebar-accent disabled:opacity-30 transition-colors"
        >
          Próximo →
        </button>
      </div>
    </aside>
  );
}

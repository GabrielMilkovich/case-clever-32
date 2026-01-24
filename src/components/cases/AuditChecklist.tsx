import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Lock,
  Unlock,
  Calculator,
  FileText,
  Scale,
  Table2,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  category: "campos" | "premissas" | "tabelas" | "divergencias" | "perfil";
  label: string;
  description: string;
  status: "passed" | "failed" | "warning" | "pending";
  autoChecked: boolean;
  manualOverride?: boolean;
}

interface AuditChecklistProps {
  // Dados do caso para validação automática
  facts: Array<{ chave: string; valor: string; confirmado: boolean }>;
  documents: Array<{ id: string; tipo: string; status?: string }>;
  selectedProfile: string | null;
  premissasConfirmadas: boolean;
  tabelasValidas: boolean;
  divergencias: Array<{ campo: string; valorA: string; valorB: string; justificativa?: string }>;
  
  // Callbacks
  onChecklistComplete: () => void;
  onCalculationAllowed: (allowed: boolean) => void;
}

const CRITICAL_FACTS = [
  "data_admissao",
  "data_demissao",
  "salario_base",
  "salario_mensal",
  "jornada_contratual",
];

const categoryConfig = {
  campos: { label: "Campos Críticos", icon: FileText, color: "text-blue-600" },
  premissas: { label: "Premissas Definidas", icon: Scale, color: "text-purple-600" },
  tabelas: { label: "Tabelas e Índices", icon: Table2, color: "text-green-600" },
  divergencias: { label: "Divergências", icon: AlertTriangle, color: "text-amber-600" },
  perfil: { label: "Perfil de Cálculo", icon: Settings2, color: "text-indigo-600" },
};

export function AuditChecklist({
  facts,
  documents,
  selectedProfile,
  premissasConfirmadas,
  tabelasValidas,
  divergencias,
  onChecklistComplete,
  onCalculationAllowed,
}: AuditChecklistProps) {
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});
  const [isLocked, setIsLocked] = useState(false);

  // Gerar itens do checklist automaticamente
  const checklistItems = useMemo(() => {
    const items: ChecklistItem[] = [];

    // 1. Campos críticos validados
    CRITICAL_FACTS.forEach((key) => {
      const fact = facts.find((f) => f.chave === key);
      const labelMap: Record<string, string> = {
        data_admissao: "Data de Admissão",
        data_demissao: "Data de Demissão",
        salario_base: "Salário Base",
        salario_mensal: "Salário Mensal",
        jornada_contratual: "Jornada Contratual",
      };

      items.push({
        id: `campo-${key}`,
        category: "campos",
        label: labelMap[key] || key,
        description: fact ? `Valor: ${fact.valor}` : "Campo não encontrado",
        status: fact?.confirmado ? "passed" : fact ? "warning" : "failed",
        autoChecked: !!fact?.confirmado,
      });
    });

    // 2. Premissas definidas e confirmadas
    items.push({
      id: "premissas-definidas",
      category: "premissas",
      label: "Premissas jurídicas definidas",
      description: "Divisor, método HE, DSR, média remuneratória e bases de cálculo",
      status: premissasConfirmadas ? "passed" : "warning",
      autoChecked: premissasConfirmadas,
    });

    // 3. Períodos e prescrição revisados
    const dataAdmissao = facts.find((f) => f.chave === "data_admissao");
    const dataDemissao = facts.find((f) => f.chave === "data_demissao");
    items.push({
      id: "periodos-prescrição",
      category: "campos",
      label: "Períodos e prescrição revisados",
      description: dataAdmissao && dataDemissao
        ? `${dataAdmissao.valor} a ${dataDemissao.valor}`
        : "Datas não definidas",
      status: dataAdmissao?.confirmado && dataDemissao?.confirmado ? "passed" : "warning",
      autoChecked: !!(dataAdmissao?.confirmado && dataDemissao?.confirmado),
    });

    // 4. Divergências justificadas
    const divergenciasNaoJustificadas = divergencias.filter((d) => !d.justificativa);
    items.push({
      id: "divergencias-justificadas",
      category: "divergencias",
      label: "Divergências justificadas",
      description: divergencias.length === 0
        ? "Nenhuma divergência detectada"
        : `${divergenciasNaoJustificadas.length} de ${divergencias.length} sem justificativa`,
      status: divergencias.length === 0 || divergenciasNaoJustificadas.length === 0
        ? "passed"
        : "warning",
      autoChecked: divergencias.length === 0 || divergenciasNaoJustificadas.length === 0,
    });

    // 5. Tabelas e índices válidos
    items.push({
      id: "tabelas-validas",
      category: "tabelas",
      label: "Tabelas de INSS/IRRF válidas",
      description: tabelasValidas ? "Tabelas configuradas e atualizadas" : "Tabelas ausentes ou desatualizadas",
      status: tabelasValidas ? "passed" : "warning",
      autoChecked: tabelasValidas,
    });

    items.push({
      id: "indices-validos",
      category: "tabelas",
      label: "Índices de correção monetária",
      description: tabelasValidas ? "Séries de índices configuradas" : "Índices não configurados",
      status: tabelasValidas ? "passed" : "warning",
      autoChecked: tabelasValidas,
    });

    // 6. Perfil de cálculo travado
    items.push({
      id: "perfil-travado",
      category: "perfil",
      label: "Perfil de cálculo selecionado",
      description: selectedProfile ? "Perfil configurado e travado" : "Nenhum perfil selecionado",
      status: selectedProfile ? "passed" : "failed",
      autoChecked: !!selectedProfile,
    });

    return items;
  }, [facts, documents, selectedProfile, premissasConfirmadas, tabelasValidas, divergencias]);

  // Calcular progresso
  const itemsChecked = checklistItems.filter(
    (item) => item.autoChecked || manualChecks[item.id]
  ).length;
  const progress = (itemsChecked / checklistItems.length) * 100;
  const allChecked = itemsChecked === checklistItems.length;

  // Atualizar status do cálculo
  const handleManualCheck = (itemId: string, checked: boolean) => {
    setManualChecks((prev) => ({ ...prev, [itemId]: checked }));
  };

  const handleFinalizar = () => {
    if (allChecked) {
      setIsLocked(true);
      onCalculationAllowed(true);
      onChecklistComplete();
    }
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    checklistItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [checklistItems]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Checklist de Auditoria
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={allChecked ? "default" : "secondary"} className="gap-1">
              {isLocked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
              {isLocked ? "Travado" : "Em Edição"}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {itemsChecked}/{checklistItems.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso do Checklist</span>
            <span className={cn(
              "font-medium",
              allChecked ? "text-green-600" : "text-amber-600"
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              "h-2",
              allChecked && "bg-green-100 [&>div]:bg-green-500"
            )} 
          />
        </div>

        {/* Grouped Checklist Items */}
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => {
            const config = categoryConfig[category as keyof typeof categoryConfig];
            const Icon = config.icon;
            const categoryPassed = items.every((i) => i.autoChecked || manualChecks[i.id]);

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className="text-sm font-semibold">{config.label}</span>
                  {categoryPassed && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  )}
                </div>

                <div className="space-y-2 pl-6">
                  {items.map((item) => {
                    const isChecked = item.autoChecked || manualChecks[item.id];
                    
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
                          isChecked
                            ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                            : item.status === "failed"
                            ? "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                            : "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
                          isLocked && "opacity-75"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleManualCheck(item.id, !!checked)}
                          disabled={item.autoChecked || isLocked}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.label}</span>
                            {item.status === "passed" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                            {item.status === "warning" && (
                              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            )}
                            {item.status === "failed" && (
                              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          {!allChecked && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Complete todos os itens para liberar o cálculo</span>
            </div>
          )}
          {allChecked && !isLocked && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Checklist completo! Pronto para finalizar.</span>
            </div>
          )}
          {isLocked && (
            <div className="flex items-center gap-2 text-primary">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Cálculo liberado. Checklist travado.</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsLocked(false);
                  onCalculationAllowed(false);
                }}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Destrava
              </Button>
            )}
            <Button
              onClick={handleFinalizar}
              disabled={!allChecked || isLocked}
              className="gap-2"
            >
              <Calculator className="h-4 w-4" />
              Finalizar e Liberar Cálculo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

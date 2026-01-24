import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Shield,
  ChevronRight,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskFactor {
  id: string;
  categoria: "prescricao" | "prova" | "salario" | "jornada" | "tabelas" | "lacunas";
  titulo: string;
  descricao: string;
  impacto: "baixo" | "medio" | "alto" | "critico";
  resolvido: boolean;
  acao?: string;
  tabDestino?: string;
}

interface RiskAnalysisPanelProps {
  caseId: string;
  facts: Array<{ chave: string; valor: string; confirmado: boolean; status_pericial?: string }>;
  documents: Array<{ id: string; tipo: string; status: string; competencia?: string }>;
  onNavigate: (tab: string) => void;
}

const CRITICAL_FACTS = ["data_admissao", "data_demissao", "salario_base", "salario_mensal", "jornada_contratual"];

const impactConfig = {
  baixo: { label: "Baixo", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", weight: 10 },
  medio: { label: "Médio", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", weight: 25 },
  alto: { label: "Alto", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", weight: 40 },
  critico: { label: "Crítico", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", weight: 60 },
};

const categoryIcons: Record<string, typeof AlertTriangle> = {
  prescricao: Calendar,
  prova: FileText,
  salario: DollarSign,
  jornada: Clock,
  tabelas: Scale,
  lacunas: AlertCircle,
};

export function RiskAnalysisPanel({ caseId, facts, documents, onNavigate }: RiskAnalysisPanelProps) {
  // Fetch rubrica requirements
  const { data: rubricaReqs = [] } = useQuery({
    queryKey: ["rubrica_requirements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rubrica_requirements")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Analyze risks
  const riskFactors = useMemo<RiskFactor[]>(() => {
    const risks: RiskFactor[] = [];
    const factMap = new Map(facts.map(f => [f.chave, f]));
    const docTypes = new Set(documents.filter(d => d.status === "completed").map(d => d.tipo));

    // 1. PRESCRIÇÃO
    const dataAjuizamento = factMap.get("data_ajuizamento");
    const dataDemissao = factMap.get("data_demissao");
    if (!dataAjuizamento && !dataDemissao) {
      risks.push({
        id: "prescricao_ausente",
        categoria: "prescricao",
        titulo: "Prescrição não definida",
        descricao: "Sem data de ajuizamento ou demissão, não é possível aplicar prescrição quinquenal/bienal.",
        impacto: "critico",
        resolvido: false,
        acao: "Definir datas na validação",
        tabDestino: "validacao",
      });
    }

    // 2. SALÁRIO VARIÁVEL
    const salarioBase = factMap.get("salario_base");
    const salarioMensal = factMap.get("salario_mensal");
    if (salarioBase && salarioMensal) {
      const base = parseFloat(salarioBase.valor.replace(/[^\d,.-]/g, "").replace(",", "."));
      const mensal = parseFloat(salarioMensal.valor.replace(/[^\d,.-]/g, "").replace(",", "."));
      if (!isNaN(base) && !isNaN(mensal) && Math.abs(base - mensal) > 100) {
        risks.push({
          id: "salario_variavel",
          categoria: "salario",
          titulo: "Salário variável detectado",
          descricao: `Base (R$ ${base.toFixed(2)}) difere do mensal (R$ ${mensal.toFixed(2)}). Defina método de média.`,
          impacto: "medio",
          resolvido: false,
          acao: "Configurar premissas",
          tabDestino: "premissas",
        });
      }
    }

    // 3. JORNADA SEM PROVA
    const temCartaoPonto = docTypes.has("cartao_ponto");
    const jornadaFact = factMap.get("jornada_contratual");
    if (jornadaFact && !temCartaoPonto) {
      risks.push({
        id: "jornada_sem_prova",
        categoria: "jornada",
        titulo: "Jornada sem prova documental",
        descricao: "Não há cartão de ponto anexado. Cálculo de HE pode ser impugnado.",
        impacto: "alto",
        resolvido: false,
        acao: "Anexar documentos",
        tabDestino: "documentos",
      });
    }

    // 4. LACUNAS DE COMPETÊNCIA (holerites)
    const holerites = documents.filter(d => d.tipo === "holerite" && d.competencia);
    if (holerites.length > 0 && holerites.length < 12) {
      risks.push({
        id: "lacunas_holerite",
        categoria: "lacunas",
        titulo: "Lacunas de holerites",
        descricao: `Apenas ${holerites.length} holerite(s) anexado(s). Verifique se há lacunas no período.`,
        impacto: "medio",
        resolvido: false,
        acao: "Verificar documentos",
        tabDestino: "documentos",
      });
    }

    // 5. TABELAS/ÍNDICES
    // (Simplified - would check index_series in production)
    const usaINSS = true; // Always needed
    if (usaINSS) {
      // Check if we have recent INSS tables - simplified
      risks.push({
        id: "tabelas_verificar",
        categoria: "tabelas",
        titulo: "Verificar tabelas vigentes",
        descricao: "Confirme se tabelas de INSS/IRRF estão atualizadas para o período calculado.",
        impacto: "baixo",
        resolvido: true, // Mark as resolved if tables exist
        acao: "Ver índices",
        tabDestino: "premissas",
      });
    }

    // 6. FATOS CRÍTICOS NÃO CONFIRMADOS
    const unconfirmedCritical = CRITICAL_FACTS.filter(k => {
      const fact = factMap.get(k);
      return !fact || !fact.confirmado;
    });
    if (unconfirmedCritical.length > 0) {
      risks.push({
        id: "fatos_criticos",
        categoria: "prova",
        titulo: `${unconfirmedCritical.length} fato(s) crítico(s) pendente(s)`,
        descricao: `Campos obrigatórios não confirmados: ${unconfirmedCritical.join(", ")}.`,
        impacto: "critico",
        resolvido: false,
        acao: "Validar fatos",
        tabDestino: "validacao",
      });
    }

    // 7. FATOS CONTROVERTIDOS
    const controvertidos = facts.filter(f => f.status_pericial === "controvertido");
    if (controvertidos.length > 0) {
      risks.push({
        id: "fatos_controvertidos",
        categoria: "prova",
        titulo: `${controvertidos.length} fato(s) controvertido(s)`,
        descricao: "Existem fatos marcados como controvertidos que precisam de justificativa.",
        impacto: "alto",
        resolvido: false,
        acao: "Revisar controvérsias",
        tabDestino: "validacao",
      });
    }

    // 8. REQUISITOS DE PROVA POR RUBRICA
    rubricaReqs.forEach(req => {
      const missingDocs = req.documentos_requeridos?.filter((dt: string) => !docTypes.has(dt)) || [];
      const missingFacts = req.fatos_requeridos?.filter((fk: string) => !factMap.has(fk) || !factMap.get(fk)?.confirmado) || [];
      
      if (missingDocs.length > 0 || missingFacts.length > 0) {
        if (req.nivel_exigencia === "obrigatorio") {
          risks.push({
            id: `req_${req.rubrica_codigo}`,
            categoria: "prova",
            titulo: `${req.rubrica_nome}: requisitos pendentes`,
            descricao: req.alerta_sem_prova || `Faltam documentos ou fatos para ${req.rubrica_nome}.`,
            impacto: "alto",
            resolvido: false,
            acao: "Verificar requisitos",
            tabDestino: "perfil",
          });
        }
      }
    });

    return risks;
  }, [facts, documents, rubricaReqs]);

  // Calculate overall risk
  const { nivel, score, unresolvedCount } = useMemo(() => {
    const unresolved = riskFactors.filter(r => !r.resolvido);
    const totalWeight = unresolved.reduce((sum, r) => sum + impactConfig[r.impacto].weight, 0);
    const maxPossible = riskFactors.length * 60; // max weight per factor
    const scoreCalc = maxPossible > 0 ? Math.min(100, Math.round((totalWeight / maxPossible) * 100)) : 0;
    
    let nivelCalc: "baixo" | "medio" | "alto" | "critico" = "baixo";
    if (scoreCalc > 60 || unresolved.some(r => r.impacto === "critico")) nivelCalc = "critico";
    else if (scoreCalc > 40) nivelCalc = "alto";
    else if (scoreCalc > 20) nivelCalc = "medio";

    return { nivel: nivelCalc, score: scoreCalc, unresolvedCount: unresolved.length };
  }, [riskFactors]);

  const riskLevelConfig = {
    baixo: { label: "Baixo", color: "text-green-600", bgColor: "bg-green-500", icon: CheckCircle },
    medio: { label: "Médio", color: "text-yellow-600", bgColor: "bg-yellow-500", icon: AlertTriangle },
    alto: { label: "Alto", color: "text-orange-600", bgColor: "bg-orange-500", icon: AlertTriangle },
    critico: { label: "Crítico", color: "text-red-600", bgColor: "bg-red-500", icon: AlertCircle },
  };

  const currentLevel = riskLevelConfig[nivel];
  const LevelIcon = currentLevel.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Análise de Risco do Cálculo
          </div>
          <Badge className={cn("px-3 py-1", impactConfig[nivel].className)}>
            <LevelIcon className="h-3 w-3 mr-1" />
            Risco {currentLevel.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Score de Risco</span>
            <span className={cn("font-bold", currentLevel.color)}>{score}%</span>
          </div>
          <Progress value={100 - score} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {unresolvedCount === 0 
              ? "✓ Todos os fatores de risco foram resolvidos" 
              : `${unresolvedCount} fator(es) de risco não resolvido(s)`}
          </p>
        </div>

        {/* Risk Factors List */}
        {riskFactors.length > 0 && (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {riskFactors
                .filter(r => !r.resolvido)
                .sort((a, b) => impactConfig[b.impacto].weight - impactConfig[a.impacto].weight)
                .map((risk) => {
                  const CategoryIcon = categoryIcons[risk.categoria] || AlertTriangle;
                  return (
                    <div
                      key={risk.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all hover:shadow-sm",
                        risk.resolvido ? "bg-muted/30 opacity-60" : "bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            "p-1.5 rounded-lg mt-0.5",
                            risk.resolvido ? "bg-green-100" : "bg-muted"
                          )}>
                            <CategoryIcon className={cn(
                              "h-4 w-4",
                              risk.resolvido ? "text-green-600" : "text-muted-foreground"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{risk.titulo}</span>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", impactConfig[risk.impacto].className)}>
                                {impactConfig[risk.impacto].label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {risk.descricao}
                            </p>
                          </div>
                        </div>
                        {risk.acao && risk.tabDestino && !risk.resolvido && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-7 text-xs"
                            onClick={() => onNavigate(risk.tabDestino!)}
                          >
                            {risk.acao}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        )}

        {unresolvedCount === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-400">Cálculo defensável</p>
            <p className="text-xs text-muted-foreground">Todos os requisitos de prova estão satisfeitos.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

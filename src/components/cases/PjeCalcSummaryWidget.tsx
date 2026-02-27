import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import {
  Calculator, ExternalLink, DollarSign, Building2, Receipt,
  Percent, TrendingUp, FileBarChart, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PjeCalcSummaryWidgetProps {
  caseId: string;
}

const fmt = (v: number | null | undefined) =>
  v != null
    ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

export function PjeCalcSummaryWidget({ caseId }: PjeCalcSummaryWidgetProps) {
  const navigate = useNavigate();

  const { data: params, isLoading: paramsLoading } = useQuery({
    queryKey: ["pjecalc_parametros", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pjecalc_parametros")
        .select("*")
        .eq("case_id", caseId)
        .maybeSingle();
      return data;
    },
  });

  const { data: verbas = [] } = useQuery({
    queryKey: ["pjecalc_verbas", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pjecalc_verbas")
        .select("id, nome, tipo, caracteristica")
        .eq("case_id", caseId)
        .order("ordem");
      return data || [];
    },
  });

  const { data: historicos = [] } = useQuery({
    queryKey: ["pjecalc_historico_count", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pjecalc_historico_salarial")
        .select("id")
        .eq("case_id", caseId);
      return data || [];
    },
  });

  const { data: faltas = [] } = useQuery({
    queryKey: ["pjecalc_faltas_count", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pjecalc_faltas")
        .select("id")
        .eq("case_id", caseId);
      return data || [];
    },
  });

  const hasConfig = !!params;
  const verbasPrincipais = verbas.filter((v: any) => v.tipo === "principal");
  const verbasReflexas = verbas.filter((v: any) => v.tipo === "reflexa");

  const modules = [
    { label: "Parâmetros", done: hasConfig, icon: Calculator },
    { label: "Histórico", done: historicos.length > 0, icon: DollarSign, count: historicos.length },
    { label: "Faltas", done: faltas.length > 0, icon: Receipt, count: faltas.length },
    { label: "Verbas", done: verbas.length > 0, icon: FileBarChart, count: verbas.length },
  ];

  if (paramsLoading) {
    return (
      <Card className="bg-card/80">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            PJe-Calc — Liquidação Oficial
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1.5"
            onClick={() => navigate(`/pjecalc/${caseId}`)}
          >
            <ExternalLink className="h-3 w-3" />
            Abrir PJe-Calc
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Module progress */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {modules.map((m) => (
            <div
              key={m.label}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border text-xs",
                m.done
                  ? "bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20 text-foreground"
                  : "bg-muted/30 border-border text-muted-foreground"
              )}
            >
              <m.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{m.label}</span>
              {m.count != null && m.count > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto">
                  {m.count}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Key info from params */}
        {hasConfig && (
          <>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Admissão</span>
                <div className="font-medium">{params.data_admissao || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Demissão</span>
                <div className="font-medium">{params.data_demissao || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Ajuizamento</span>
                <div className="font-medium">{params.data_ajuizamento || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Carga Horária</span>
                <div className="font-medium">{params.carga_horaria_padrao}h</div>
              </div>
            </div>
          </>
        )}

        {/* Verbas summary */}
        {verbas.length > 0 && (
          <>
            <Separator />
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verbas Principais</span>
                <span className="font-medium">{verbasPrincipais.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verbas Reflexas</span>
                <span className="font-medium">{verbasReflexas.length}</span>
              </div>
            </div>
          </>
        )}

        {/* CTA when empty */}
        {!hasConfig && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-3">
              Configure o PJe-Calc para gerar a liquidação oficial com fórmula homologada.
            </p>
            <Button
              size="sm"
              onClick={() => navigate(`/pjecalc/${caseId}`)}
              className="gap-1.5"
            >
              <Calculator className="h-4 w-4" />
              Configurar PJe-Calc
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

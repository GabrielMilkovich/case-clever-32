import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Layers,
  Plus,
  Shield,
  Flame,
  Scale,
  Settings,
  Check,
  Copy,
  Trash2,
  Lock,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CalcScenario {
  id: string;
  case_id: string;
  nome: string;
  tipo: "conservador" | "tese_forte" | "sentenca" | "custom";
  descricao?: string;
  prescricao_tipo?: "quinquenal" | "bienal" | "nenhuma" | "custom";
  prescricao_data_limite?: string;
  divisor: number;
  metodo_he: "diaria" | "semanal" | "hibrida";
  metodo_dsr: "calendario" | "fator_fixo";
  dsr_fator?: number;
  media_variaveis_metodo?: string;
  indice_correcao: string;
  taxa_juros: number;
  premissas_completas?: Record<string, unknown>;
  hash_config?: string;
  ativo: boolean;
  created_at: string;
}

interface ScenarioManagerProps {
  caseId: string;
  onSelectScenario?: (scenario: CalcScenario) => void;
  selectedScenarioId?: string;
}

const scenarioTypeConfig = {
  conservador: {
    label: "Conservador",
    description: "Premissas mais restritivas, menor valor total",
    icon: Shield,
    className: "border-blue-200 bg-blue-50 dark:bg-blue-950/30",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  tese_forte: {
    label: "Tese Forte",
    description: "Premissas favoráveis ao reclamante",
    icon: Flame,
    className: "border-orange-200 bg-orange-50 dark:bg-orange-950/30",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  sentenca: {
    label: "Sentença",
    description: "Conforme determinado na sentença",
    icon: Scale,
    className: "border-purple-200 bg-purple-50 dark:bg-purple-950/30",
    badgeClass: "bg-purple-100 text-purple-800",
  },
  custom: {
    label: "Customizado",
    description: "Premissas personalizadas",
    icon: Settings,
    className: "border-slate-200 bg-slate-50 dark:bg-slate-950/30",
    badgeClass: "bg-slate-100 text-slate-800",
  },
};

const SCENARIO_PRESETS: Record<string, Partial<CalcScenario>> = {
  conservador: {
    prescricao_tipo: "quinquenal",
    divisor: 220,
    metodo_he: "diaria",
    metodo_dsr: "fator_fixo",
    dsr_fator: 6,
    indice_correcao: "IPCA-E",
    taxa_juros: 1.0,
  },
  tese_forte: {
    prescricao_tipo: "nenhuma",
    divisor: 200,
    metodo_he: "hibrida",
    metodo_dsr: "calendario",
    indice_correcao: "IPCA-E",
    taxa_juros: 1.0,
  },
  sentenca: {
    prescricao_tipo: "custom",
    divisor: 220,
    metodo_he: "diaria",
    metodo_dsr: "calendario",
    indice_correcao: "TR",
    taxa_juros: 1.0,
  },
};

export function ScenarioManager({ caseId, onSelectScenario, selectedScenarioId }: ScenarioManagerProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CalcScenario>>({
    tipo: "conservador",
    divisor: 220,
    metodo_he: "diaria",
    metodo_dsr: "calendario",
    indice_correcao: "IPCA-E",
    taxa_juros: 1.0,
    ativo: true,
  });

  // Fetch scenarios
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["calc_scenarios", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calc_scenarios")
        .select("*")
        .eq("case_id", caseId)
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CalcScenario[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<CalcScenario>) => {
      const hash = `${data.tipo}_${data.divisor}_${data.metodo_he}_${Date.now()}`.slice(0, 12);
      const { error } = await supabase
        .from("calc_scenarios")
        .insert([{
          case_id: caseId,
          nome: data.nome!,
          tipo: data.tipo!,
          descricao: data.descricao,
          prescricao_tipo: data.prescricao_tipo,
          prescricao_data_limite: data.prescricao_data_limite,
          divisor: data.divisor || 220,
          metodo_he: data.metodo_he || "diaria",
          metodo_dsr: data.metodo_dsr || "calendario",
          dsr_fator: data.dsr_fator,
          indice_correcao: data.indice_correcao || "IPCA-E",
          taxa_juros: data.taxa_juros || 1.0,
          ativo: true,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calc_scenarios", caseId] });
      toast.success("Cenário criado!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e) => {
      toast.error("Erro: " + (e as Error).message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calc_scenarios")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calc_scenarios", caseId] });
      toast.success("Cenário removido!");
    },
  });

  const resetForm = () => {
    setFormData({
      tipo: "conservador",
      divisor: 220,
      metodo_he: "diaria",
      metodo_dsr: "calendario",
      indice_correcao: "IPCA-E",
      taxa_juros: 1.0,
      ativo: true,
    });
  };

  const applyPreset = (tipo: string) => {
    const preset = SCENARIO_PRESETS[tipo] || {};
    setFormData({
      ...formData,
      tipo: tipo as CalcScenario["tipo"],
      ...preset,
    });
  };

  const duplicateScenario = (scenario: CalcScenario) => {
    setFormData({
      ...scenario,
      nome: `${scenario.nome} (cópia)`,
      tipo: "custom",
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Cenários de Cálculo
          </CardTitle>
          <CardDescription className="mt-1">
            Defina diferentes teses com premissas travadas para comparação
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo Cenário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Cenário de Cálculo</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Tipo de Cenário */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Cenário</Label>
                <RadioGroup
                  value={formData.tipo}
                  onValueChange={(v) => applyPreset(v)}
                  className="grid grid-cols-2 gap-3"
                >
                  {Object.entries(scenarioTypeConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <Label
                        key={key}
                        htmlFor={key}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          formData.tipo === key
                            ? config.className + " ring-2 ring-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <RadioGroupItem value={key} id={key} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{config.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {config.description}
                          </p>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome do Cenário</Label>
                <Input
                  placeholder="Ex: Cenário TRT-3 Padrão"
                  value={formData.nome || ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              {/* Prescrição */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prescrição</Label>
                  <Select
                    value={formData.prescricao_tipo || "quinquenal"}
                    onValueChange={(v) => setFormData({ ...formData, prescricao_tipo: v as CalcScenario["prescricao_tipo"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quinquenal">Quinquenal (5 anos)</SelectItem>
                      <SelectItem value="bienal">Bienal (2 anos)</SelectItem>
                      <SelectItem value="nenhuma">Não aplicar</SelectItem>
                      <SelectItem value="custom">Data customizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.prescricao_tipo === "custom" && (
                  <div className="space-y-2">
                    <Label>Data Limite</Label>
                    <Input
                      type="date"
                      value={formData.prescricao_data_limite || ""}
                      onChange={(e) => setFormData({ ...formData, prescricao_data_limite: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Parâmetros de Cálculo */}
              <Accordion type="single" collapsible defaultValue="params">
                <AccordionItem value="params" className="border rounded-lg">
                  <AccordionTrigger className="px-4">
                    Parâmetros de Cálculo
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Divisor</Label>
                        <Select
                          value={String(formData.divisor)}
                          onValueChange={(v) => setFormData({ ...formData, divisor: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="220">220 (44h/semana)</SelectItem>
                            <SelectItem value="200">200 (40h/semana)</SelectItem>
                            <SelectItem value="180">180 (36h/semana)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Método HE</Label>
                        <Select
                          value={formData.metodo_he}
                          onValueChange={(v) => setFormData({ ...formData, metodo_he: v as CalcScenario["metodo_he"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="diaria">Diária ({">"} 8h/dia)</SelectItem>
                            <SelectItem value="semanal">Semanal ({">"} 44h/sem)</SelectItem>
                            <SelectItem value="hibrida">Híbrida</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Método DSR</Label>
                        <Select
                          value={formData.metodo_dsr}
                          onValueChange={(v) => setFormData({ ...formData, metodo_dsr: v as CalcScenario["metodo_dsr"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="calendario">Calendário</SelectItem>
                            <SelectItem value="fator_fixo">Fator Fixo (1/6)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Índice de Correção</Label>
                        <Select
                          value={formData.indice_correcao}
                          onValueChange={(v) => setFormData({ ...formData, indice_correcao: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IPCA-E">IPCA-E</SelectItem>
                            <SelectItem value="TR">TR</SelectItem>
                            <SelectItem value="INPC">INPC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Taxa de Juros (%/mês)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.taxa_juros}
                          onChange={(e) => setFormData({ ...formData, taxa_juros: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Descrição */}
              <div className="space-y-2">
                <Label>Descrição / Notas</Label>
                <Textarea
                  placeholder="Observações sobre este cenário..."
                  value={formData.descricao || ""}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.nome || createMutation.isPending}
                >
                  <Lock className="h-4 w-4 mr-1" />
                  {createMutation.isPending ? "Salvando..." : "Criar e Travar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="skeleton-shimmer h-24 rounded-lg" />
            <div className="skeleton-shimmer h-24 rounded-lg" />
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum cenário criado.</p>
            <p className="text-xs mt-1">Crie cenários para comparar diferentes teses.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((scenario) => {
              const config = scenarioTypeConfig[scenario.tipo];
              const Icon = config.icon;
              const isSelected = selectedScenarioId === scenario.id;

              return (
                <div
                  key={scenario.id}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all cursor-pointer",
                    isSelected
                      ? "ring-2 ring-primary " + config.className
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => onSelectScenario?.(scenario)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", config.className)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{scenario.nome}</span>
                          <Badge variant="outline" className={config.badgeClass}>
                            {config.label}
                          </Badge>
                          {scenario.hash_config && (
                            <Badge variant="outline" className="font-mono text-xs">
                              #{scenario.hash_config}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Divisor: {scenario.divisor} | HE: {scenario.metodo_he} | DSR: {scenario.metodo_dsr} | {scenario.indice_correcao}
                        </p>
                        {scenario.prescricao_tipo && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            Prescrição: {scenario.prescricao_tipo}
                            {scenario.prescricao_data_limite && ` até ${scenario.prescricao_data_limite}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateScenario(scenario);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Remover este cenário?")) {
                            deleteMutation.mutate(scenario.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isSelected && (
                        <Badge variant="default" className="ml-2">
                          <Check className="h-3 w-3 mr-1" />
                          Selecionado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// EDITOR DE PERFIL DE CÁLCULO - CENÁRIOS CONFIGURÁVEIS
// =====================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Loader2, Save, DollarSign, Percent, FileText, Settings } from "lucide-react";

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  config: z.object({
    atualizacao: z.string(),
    juros: z.string(),
    arredondamento: z.string(),
    exibir_liquido: z.boolean().default(true),
    incluir_juros_mora: z.boolean().default(true),
    aplicar_teto_inss: z.boolean().default(true),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface Calculator {
  id: string;
  nome: string;
  categoria: string;
  versions: Array<{
    id: string;
    versao: string;
    vigencia_inicio: string;
  }>;
}

interface ProfileEditorProps {
  calculators: Calculator[];
  initialData?: {
    nome: string;
    descricao?: string;
    config: {
      atualizacao: string;
      juros: string;
      arredondamento: string;
      exibir_liquido?: boolean;
      incluir_juros_mora?: boolean;
      aplicar_teto_inss?: boolean;
    };
    calculadoras_incluidas: string[];
  };
  onSubmit: (data: {
    nome: string;
    descricao?: string;
    config: object;
    calculadoras_incluidas: string[];
  }) => Promise<void>;
  isLoading?: boolean;
}

// Opções de índice de correção
const atualizacaoOptions = [
  { 
    value: "ipca_e", 
    label: "IPCA-E", 
    description: "Índice de Preços ao Consumidor Amplo Especial (STF - ADC 58)"
  },
  { 
    value: "inpc", 
    label: "INPC", 
    description: "Índice Nacional de Preços ao Consumidor"
  },
  { 
    value: "tr", 
    label: "TR", 
    description: "Taxa Referencial (anterior à EC 113/2021)"
  },
  { 
    value: "selic", 
    label: "SELIC", 
    description: "Taxa SELIC (inclui correção + juros)"
  },
];

// Opções de juros
const jurosOptions = [
  { 
    value: "1_pct_mes", 
    label: "1% ao mês", 
    description: "Juros simples de 1% a.m. (Súmula 200 TST)"
  },
  { 
    value: "selic", 
    label: "Taxa SELIC", 
    description: "Quando não usar IPCA-E (EC 113/2021)"
  },
  { 
    value: "0_5_pct_mes", 
    label: "0,5% ao mês", 
    description: "Juros da caderneta de poupança"
  },
  { 
    value: "sem_juros", 
    label: "Sem juros", 
    description: "Apenas correção monetária"
  },
];

// Opções de arredondamento
const arredondamentoOptions = [
  { 
    value: "competencia", 
    label: "Por competência", 
    description: "Arredonda cada mês individualmente"
  },
  { 
    value: "final", 
    label: "Só no final", 
    description: "Arredonda apenas o total consolidado"
  },
  { 
    value: "nenhum", 
    label: "Nenhum", 
    description: "Mantém todas as casas decimais"
  },
];

// Templates de perfil pré-definidos
const perfilTemplates = [
  {
    nome: "TRT-3 Padrão",
    config: { atualizacao: "ipca_e", juros: "selic", arredondamento: "competencia" },
  },
  {
    nome: "Cenário Conservador",
    config: { atualizacao: "tr", juros: "0_5_pct_mes", arredondamento: "final" },
  },
  {
    nome: "Cenário Máximo",
    config: { atualizacao: "ipca_e", juros: "1_pct_mes", arredondamento: "competencia" },
  },
];

const categoryLabels: Record<string, string> = {
  jornada: "Jornada de Trabalho",
  reflexos: "Reflexos",
  descontos: "Descontos",
  atualizacao: "Atualização Monetária",
  rescisoria: "Verbas Rescisórias",
};

export function ProfileEditor({
  calculators,
  initialData,
  onSubmit,
  isLoading = false,
}: ProfileEditorProps) {
  const [selectedCalculators, setSelectedCalculators] = useState<string[]>(
    initialData?.calculadoras_incluidas || []
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      descricao: initialData?.descricao || "",
      config: {
        atualizacao: initialData?.config?.atualizacao || "ipca_e",
        juros: initialData?.config?.juros || "selic",
        arredondamento: initialData?.config?.arredondamento || "competencia",
        exibir_liquido: initialData?.config?.exibir_liquido ?? true,
        incluir_juros_mora: initialData?.config?.incluir_juros_mora ?? true,
        aplicar_teto_inss: initialData?.config?.aplicar_teto_inss ?? true,
      },
    },
  });

  const handleSubmit = async (values: FormData) => {
    await onSubmit({
      nome: values.nome,
      descricao: values.descricao || undefined,
      config: values.config,
      calculadoras_incluidas: selectedCalculators,
    });
  };

  const toggleCalculator = (versionId: string) => {
    setSelectedCalculators((prev) =>
      prev.includes(versionId)
        ? prev.filter((id) => id !== versionId)
        : [...prev, versionId]
    );
  };

  const applyTemplate = (template: typeof perfilTemplates[0]) => {
    form.setValue("config.atualizacao", template.config.atualizacao);
    form.setValue("config.juros", template.config.juros);
    form.setValue("config.arredondamento", template.config.arredondamento);
  };

  // Group calculators by category
  const groupedCalculators = calculators.reduce((acc, calc) => {
    if (!acc[calc.categoria]) {
      acc[calc.categoria] = [];
    }
    acc[calc.categoria].push(calc);
    return acc;
  }, {} as Record<string, Calculator[]>);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informações básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações do Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Perfil *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Tese Reclamante - Máxima" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva quando usar este perfil e suas características..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Templates rápidos */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Aplicar template:</p>
              <div className="flex flex-wrap gap-2">
                {perfilTemplates.map((template) => (
                  <Button
                    key={template.nome}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.nome}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Cálculo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Cálculo
            </CardTitle>
            <CardDescription>
              Defina os parâmetros globais que serão aplicados a todos os cálculos deste perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Índice de Correção */}
            <FormField
              control={form.control}
              name="config.atualizacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Índice de Correção Monetária
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {atualizacaoOptions.map((opt) => (
                      <div
                        key={opt.value}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          field.value === opt.value
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => field.onChange(opt.value)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            field.value === opt.value ? "bg-primary border-primary" : "border-muted-foreground"
                          }`} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-5">
                          {opt.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Tipo de Juros */}
            <FormField
              control={form.control}
              name="config.juros"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Taxa de Juros
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {jurosOptions.map((opt) => (
                      <div
                        key={opt.value}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          field.value === opt.value
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => field.onChange(opt.value)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            field.value === opt.value ? "bg-primary border-primary" : "border-muted-foreground"
                          }`} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-5">
                          {opt.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Arredondamento */}
            <FormField
              control={form.control}
              name="config.arredondamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arredondamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {arredondamentoOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div>
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              - {opt.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Switches de configuração */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Opções do Relatório
              </h4>

              <FormField
                control={form.control}
                name="config.exibir_liquido"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <FormLabel className="cursor-pointer">Destacar Valor Líquido</FormLabel>
                      <FormDescription className="text-xs">
                        Exibe o valor líquido (após descontos) em destaque no relatório
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config.incluir_juros_mora"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <FormLabel className="cursor-pointer">Incluir Juros de Mora</FormLabel>
                      <FormDescription className="text-xs">
                        Aplica juros moratórios a partir do ajuizamento
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config.aplicar_teto_inss"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <FormLabel className="cursor-pointer">Aplicar Teto do INSS</FormLabel>
                      <FormDescription className="text-xs">
                        Limita a base de cálculo do INSS ao teto vigente
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seleção de Calculadoras */}
        <Card>
          <CardHeader>
            <CardTitle>Calculadoras Incluídas</CardTitle>
            <CardDescription>
              Selecione as versões das calculadoras que serão usadas neste perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(groupedCalculators).map(([categoria, calcs]) => (
              <div key={categoria}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {categoryLabels[categoria] || categoria}
                </h4>
                <div className="space-y-3">
                  {calcs.map((calc) => (
                    <div key={calc.id} className="p-3 rounded-lg border bg-card">
                      <p className="font-medium mb-2">{calc.nome}</p>
                      <div className="flex flex-wrap gap-2">
                        {calc.versions.length > 0 ? (
                          calc.versions.map((version) => (
                            <Badge
                              key={version.id}
                              variant={selectedCalculators.includes(version.id) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleCalculator(version.id)}
                            >
                              v{version.versao} ({version.vigencia_inicio})
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sem versões disponíveis
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {calculators.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma calculadora cadastrada.
              </p>
            )}

            {selectedCalculators.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium">
                  {selectedCalculators.length} calculadora(s) selecionada(s)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Perfil
          </Button>
        </div>
      </form>
    </Form>
  );
}

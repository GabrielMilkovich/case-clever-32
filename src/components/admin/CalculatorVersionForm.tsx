// =====================================================
// FORMULÁRIO DE VERSÃO DE CALCULADORA - CONFIGURAÇÃO DE REGRAS
// =====================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VersionCompare } from "./VersionCompare";
import { Loader2, Play, Save, CheckCircle, Calculator, Percent, Clock, AlertTriangle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Schema de validação
const formSchema = z.object({
  versao: z.string().min(1, "Versão é obrigatória"),
  vigencia_inicio: z.string().min(1, "Data de vigência é obrigatória"),
  vigencia_fim: z.string().optional(),
  changelog: z.string().optional(),
  codigo_ref: z.string().optional(),
  ativo: z.boolean().default(true),
  // Regras específicas
  divisor: z.number().min(1, "Divisor deve ser maior que 0").default(220),
  adicional_50: z.number().min(0).default(50),
  adicional_100: z.number().min(0).default(100),
  base_calculo: z.array(z.string()).min(1, "Selecione pelo menos uma base"),
  incide_inss: z.boolean().default(true),
  incide_irrf: z.boolean().default(true),
  incide_fgts: z.boolean().default(true),
  integra_dsr: z.boolean().default(true),
  integra_ferias: z.boolean().default(true),
  integra_13: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface CalculatorVersionFormProps {
  calculatorId: string;
  calculatorName: string;
  previousVersion?: {
    versao: string;
    regras: Record<string, unknown>;
    vigencia_inicio: string;
  };
  onSubmit: (data: {
    versao: string;
    vigencia_inicio: string;
    vigencia_fim?: string;
    regras: object;
    changelog?: string;
    codigo_ref?: string;
    ativo: boolean;
  }) => Promise<void>;
  onTest?: (regras: object) => Promise<{ success: boolean; message: string }>;
  isLoading?: boolean;
}

// Opções de base de cálculo
const baseCalculoOptions = [
  { value: "salario_base", label: "Salário Base", description: "Salário contratual mensal" },
  { value: "insalubridade", label: "Insalubridade", description: "Adicional de insalubridade" },
  { value: "periculosidade", label: "Periculosidade", description: "Adicional de periculosidade (30%)" },
  { value: "gratificacao", label: "Gratificação", description: "Gratificações habituais" },
  { value: "comissoes", label: "Comissões", description: "Comissões sobre vendas" },
  { value: "adicional_noturno", label: "Adicional Noturno", description: "Adicional por trabalho noturno" },
];

// Divisores comuns
const divisoresComuns = [
  { value: 220, label: "220h (CLT padrão)", description: "44h/semana × 5 dias" },
  { value: 200, label: "200h (Bancários)", description: "40h/semana" },
  { value: 180, label: "180h (6h/dia)", description: "Jornada reduzida" },
  { value: 150, label: "150h (Telemarketing)", description: "6h/dia × 5 dias" },
];

// Extrair valores do previousVersion.regras
function extractRulesFromPrevious(regras: Record<string, unknown> | undefined): Partial<FormData> {
  if (!regras) return {};
  return {
    divisor: typeof regras.divisor === 'number' ? regras.divisor : 220,
    adicional_50: typeof regras.adicional_50 === 'number' ? (regras.adicional_50 - 1) * 100 : 50,
    adicional_100: typeof regras.adicional_100 === 'number' ? (regras.adicional_100 - 1) * 100 : 100,
    base_calculo: Array.isArray(regras.base_calculo) ? regras.base_calculo : ["salario_base"],
    incide_inss: typeof regras.incide_inss === 'boolean' ? regras.incide_inss : true,
    incide_irrf: typeof regras.incide_irrf === 'boolean' ? regras.incide_irrf : true,
    incide_fgts: typeof regras.incide_fgts === 'boolean' ? regras.incide_fgts : true,
    integra_dsr: typeof regras.integra_dsr === 'boolean' ? regras.integra_dsr : true,
    integra_ferias: typeof regras.integra_ferias === 'boolean' ? regras.integra_ferias : true,
    integra_13: typeof regras.integra_13 === 'boolean' ? regras.integra_13 : true,
  };
}

export function CalculatorVersionForm({
  calculatorId,
  calculatorName,
  previousVersion,
  onSubmit,
  onTest,
  isLoading = false,
}: CalculatorVersionFormProps) {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  
  const previousRules = extractRulesFromPrevious(previousVersion?.regras);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      versao: "",
      vigencia_inicio: new Date().toISOString().split('T')[0],
      vigencia_fim: "",
      changelog: "",
      codigo_ref: "",
      ativo: true,
      divisor: previousRules.divisor ?? 220,
      adicional_50: previousRules.adicional_50 ?? 50,
      adicional_100: previousRules.adicional_100 ?? 100,
      base_calculo: previousRules.base_calculo ?? ["salario_base"],
      incide_inss: previousRules.incide_inss ?? true,
      incide_irrf: previousRules.incide_irrf ?? true,
      incide_fgts: previousRules.incide_fgts ?? true,
      integra_dsr: previousRules.integra_dsr ?? true,
      integra_ferias: previousRules.integra_ferias ?? true,
      integra_13: previousRules.integra_13 ?? true,
    },
  });

  // Construir objeto de regras para salvar
  const buildRegrasConfig = (values: FormData): object => ({
    divisor: values.divisor,
    adicional_50: 1 + values.adicional_50 / 100, // Converte 50% para 1.5
    adicional_100: 1 + values.adicional_100 / 100, // Converte 100% para 2.0
    base_calculo: values.base_calculo,
    incide_inss: values.incide_inss,
    incide_irrf: values.incide_irrf,
    incide_fgts: values.incide_fgts,
    integra_dsr: values.integra_dsr,
    integra_ferias: values.integra_ferias,
    integra_13: values.integra_13,
    formula: `(base_calculo / ${values.divisor}) × horas × adicional`,
  });

  const handleSubmit = async (values: FormData) => {
    const regras = buildRegrasConfig(values);
    await onSubmit({
      versao: values.versao,
      vigencia_inicio: values.vigencia_inicio,
      vigencia_fim: values.vigencia_fim || undefined,
      changelog: values.changelog || undefined,
      codigo_ref: values.codigo_ref || undefined,
      ativo: values.ativo,
      regras,
    });
  };

  const handleTest = async () => {
    if (!onTest) return;
    setIsTesting(true);
    try {
      const regras = buildRegrasConfig(form.getValues());
      const result = await onTest(regras);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: "Erro ao testar regras" });
    } finally {
      setIsTesting(false);
    }
  };

  // Preview das regras atuais
  const currentRegras = buildRegrasConfig(form.watch());

  return (
    <div className="space-y-6">
      {/* Comparação de versões */}
      {previousVersion && (
        <VersionCompare
          previousVersion={previousVersion}
          currentVersion={{
            versao: form.watch("versao") || "Nova",
            regras: currentRegras,
            vigencia_inicio: form.watch("vigencia_inicio"),
          }}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Informações básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Informações da Versão
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="versao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Versão *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 2024.1" {...field} />
                    </FormControl>
                    <FormDescription>
                      {previousVersion && `Anterior: v${previousVersion.versao}`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vigencia_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início da Vigência *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vigencia_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim da Vigência</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Deixe vazio se ainda vigente</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo_ref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referência Legal</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CLT Art. 59, Lei 13.467/2017" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Configuração do Cálculo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Configuração do Cálculo
              </CardTitle>
              <CardDescription>
                Defina os parâmetros para o cálculo de {calculatorName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Divisor */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="divisor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Divisor de Horas</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            type="number" 
                            className="w-32"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground self-center">horas/mês</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {divisoresComuns.map((div) => (
                          <Button
                            key={div.value}
                            type="button"
                            variant={field.value === div.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => field.onChange(div.value)}
                          >
                            {div.label}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Adicionais */}
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="adicional_50"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Adicional HE 50%
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            type="number" 
                            className="w-24"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground self-center">%</span>
                      </div>
                      <FormDescription>
                        Multiplicador: {(1 + field.value / 100).toFixed(2)}x
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adicional_100"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Adicional HE 100%
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            type="number" 
                            className="w-24"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground self-center">%</span>
                      </div>
                      <FormDescription>
                        Multiplicador: {(1 + field.value / 100).toFixed(2)}x
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Base de Cálculo */}
              <FormField
                control={form.control}
                name="base_calculo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base de Cálculo *</FormLabel>
                    <FormDescription>
                      Selecione os componentes que formam a base para o cálculo
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {baseCalculoOptions.map((option) => (
                        <div
                          key={option.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            field.value.includes(option.value)
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            const newValue = field.value.includes(option.value)
                              ? field.value.filter((v) => v !== option.value)
                              : [...field.value, option.value];
                            field.onChange(newValue);
                          }}
                        >
                          <Checkbox
                            checked={field.value.includes(option.value)}
                            onCheckedChange={() => {
                              const newValue = field.value.includes(option.value)
                                ? field.value.filter((v) => v !== option.value)
                                : [...field.value, option.value];
                              field.onChange(newValue);
                            }}
                          />
                          <div>
                            <p className="font-medium text-sm">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Incidências */}
          <Card>
            <CardHeader>
              <CardTitle>Incidências e Reflexos</CardTitle>
              <CardDescription>
                Configure como esta verba impacta outras verbas e descontos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Descontos */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Descontos
                  </h4>
                  
                  <FormField
                    control={form.control}
                    name="incide_inss"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <FormLabel className="cursor-pointer">Incidência de INSS</FormLabel>
                          <FormDescription className="text-xs">
                            Desconta contribuição previdenciária
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
                    name="incide_irrf"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <FormLabel className="cursor-pointer">Incidência de IRRF</FormLabel>
                          <FormDescription className="text-xs">
                            Desconta imposto de renda
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
                    name="incide_fgts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <FormLabel className="cursor-pointer">Incidência de FGTS</FormLabel>
                          <FormDescription className="text-xs">
                            Gera depósito de FGTS (8%)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reflexos */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Reflexos
                  </h4>
                  
                  <FormField
                    control={form.control}
                    name="integra_dsr"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <FormLabel className="cursor-pointer">Integra DSR</FormLabel>
                          <FormDescription className="text-xs">
                            Reflete no descanso semanal remunerado
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
                    name="integra_ferias"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <FormLabel className="cursor-pointer">Integra Férias</FormLabel>
                          <FormDescription className="text-xs">
                            Reflete nas férias + 1/3
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
                    name="integra_13"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <FormLabel className="cursor-pointer">Integra 13º Salário</FormLabel>
                          <FormDescription className="text-xs">
                            Reflete no décimo terceiro
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Changelog */}
          <Card>
            <CardHeader>
              <CardTitle>Registro de Alteração</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="changelog"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Atualização conforme Lei 14.611/2023 que alterou o divisor de 200 para 220 horas..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Documente o motivo da alteração para auditoria futura
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Preview das regras */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm">Preview do JSON (regras_config)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-background p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(currentRegras, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Resultado do teste */}
          {testResult && (
            <Card className={testResult.success ? "border-green-500 bg-green-50/50" : "border-destructive bg-destructive/10"}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  <span className={testResult.success ? "text-green-700" : "text-destructive"}>
                    {testResult.message}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between">
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Ativar imediatamente</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              {onTest && (
                <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting}>
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Testar com Gabarito
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Versão
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

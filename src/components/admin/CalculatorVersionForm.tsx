import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { JsonEditor } from "./JsonEditor";
import { VersionCompare } from "./VersionCompare";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Save, CheckCircle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  versao: z.string().min(1, "Versão é obrigatória"),
  vigencia_inicio: z.string().min(1, "Data de vigência é obrigatória"),
  vigencia_fim: z.string().optional(),
  changelog: z.string().optional(),
  codigo_ref: z.string().optional(),
  ativo: z.boolean().default(true),
});

interface CalculatorVersionFormProps {
  calculatorId: string;
  calculatorName: string;
  previousVersion?: {
    versao: string;
    regras: object;
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

const defaultRegras = {
  divisor: 220,
  adicional_50: 1.5,
  adicional_100: 2.0,
  integra_dsr: true,
  integra_ferias: true,
  integra_13: true,
  base_calculo: ["salario_base"],
  formula: "horas_mes * valor_hora * adicional"
};

export function CalculatorVersionForm({
  calculatorId,
  calculatorName,
  previousVersion,
  onSubmit,
  onTest,
  isLoading = false,
}: CalculatorVersionFormProps) {
  const [regras, setRegras] = useState<object>(previousVersion?.regras || defaultRegras);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      versao: "",
      vigencia_inicio: new Date().toISOString().split('T')[0],
      vigencia_fim: "",
      changelog: "",
      codigo_ref: "",
      ativo: true,
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
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
      const result = await onTest(regras);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: "Erro ao testar" });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version comparison */}
      <VersionCompare
        previousVersion={previousVersion}
        currentVersion={{
          versao: form.watch("versao") || "Nova",
          regras,
          vigencia_inicio: form.watch("vigencia_inicio"),
        }}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Versão</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="versao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Versão</FormLabel>
                    <FormControl>
                      <Input placeholder="2.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vigencia_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigência (início)</FormLabel>
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
                    <FormLabel>Vigência (fim)</FormLabel>
                    <FormControl>
                      <Input type="date" placeholder="Deixe vazio para vigente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo_ref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referência no código (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="calculators/horasExtras.ts" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Rules editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Regras (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonEditor
                value={regras}
                onChange={setRegras}
                placeholder="Digite as regras em formato JSON"
              />
            </CardContent>
          </Card>

          {/* Changelog */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Changelog</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="changelog"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Lei 14.611/2023 alterou divisor de 200 para 220"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Test result */}
          {testResult && (
            <Card className={testResult.success ? "border-green-500" : "border-destructive"}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="h-5 w-5 text-destructive">✕</span>
                  )}
                  <span className={testResult.success ? "text-green-700" : "text-destructive"}>
                    {testResult.message}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Ativar imediatamente</FormLabel>
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
                  Testar com gabarito
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar versão
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

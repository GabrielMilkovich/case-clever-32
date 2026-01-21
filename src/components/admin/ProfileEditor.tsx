import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Save } from "lucide-react";

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  config: z.object({
    atualizacao: z.string(),
    juros: z.string(),
    arredondamento: z.string(),
  }),
});

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

const atualizacaoOptions = [
  { value: "ipca_e", label: "IPCA-E" },
  { value: "inpc", label: "INPC" },
  { value: "tr", label: "TR" },
  { value: "selic", label: "SELIC" },
];

const jurosOptions = [
  { value: "1_pct_mes", label: "1% ao mês" },
  { value: "selic", label: "Taxa SELIC" },
  { value: "0_5_pct_mes", label: "0,5% ao mês" },
  { value: "sem_juros", label: "Sem juros" },
];

const arredondamentoOptions = [
  { value: "competencia", label: "Por competência" },
  { value: "final", label: "Só no final" },
  { value: "nenhum", label: "Nenhum" },
];

export function ProfileEditor({
  calculators,
  initialData,
  onSubmit,
  isLoading = false,
}: ProfileEditorProps) {
  const [selectedCalculators, setSelectedCalculators] = useState<string[]>(
    initialData?.calculadoras_incluidas || []
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      descricao: initialData?.descricao || "",
      config: initialData?.config || {
        atualizacao: "ipca_e",
        juros: "1_pct_mes",
        arredondamento: "competencia",
      },
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
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
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Perfil</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: TRT-3 Padrão" {...field} />
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
                      placeholder="Descreva quando usar este perfil..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações de Cálculo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="config.atualizacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Índice de Atualização</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {atualizacaoOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="config.juros"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa de Juros</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jurosOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Calculator selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calculadoras Incluídas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(groupedCalculators).map(([categoria, calcs]) => (
              <div key={categoria}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {categoria}
                </h4>
                <div className="space-y-2">
                  {calcs.map((calc) => (
                    <div key={calc.id} className="space-y-2">
                      <Label className="font-medium">{calc.nome}</Label>
                      <div className="flex flex-wrap gap-2 ml-4">
                        {calc.versions.map((version) => (
                          <div
                            key={version.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={version.id}
                              checked={selectedCalculators.includes(version.id)}
                              onCheckedChange={() => toggleCalculator(version.id)}
                            />
                            <label
                              htmlFor={version.id}
                              className="text-sm cursor-pointer"
                            >
                              v{version.versao} ({version.vigencia_inicio})
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {calculators.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma calculadora cadastrada.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
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

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

interface Faixa {
  ate: number;
  aliquota: number;
  deducao?: number;
}

const formSchema = z.object({
  tipo: z.string().min(1, "Tipo é obrigatório"),
  vigencia_inicio: z.string().min(1, "Data de início é obrigatória"),
  vigencia_fim: z.string().optional(),
});

interface TaxTableEditorProps {
  initialData?: {
    tipo: string;
    vigencia_inicio: string;
    vigencia_fim?: string;
    faixas: Faixa[];
  };
  onSubmit: (data: {
    tipo: string;
    vigencia_inicio: string;
    vigencia_fim?: string;
    faixas: Faixa[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export function TaxTableEditor({
  initialData,
  onSubmit,
  isLoading = false,
}: TaxTableEditorProps) {
  const [faixas, setFaixas] = useState<Faixa[]>(
    initialData?.faixas || [
      { ate: 1302.0, aliquota: 0.075, deducao: 0 },
      { ate: 2571.29, aliquota: 0.09, deducao: 19.53 },
      { ate: 3856.94, aliquota: 0.12, deducao: 96.67 },
      { ate: 7507.49, aliquota: 0.14, deducao: 173.79 },
    ]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: initialData?.tipo || "inss",
      vigencia_inicio: initialData?.vigencia_inicio || new Date().toISOString().split("T")[0],
      vigencia_fim: initialData?.vigencia_fim || "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit({
      tipo: values.tipo,
      vigencia_inicio: values.vigencia_inicio,
      vigencia_fim: values.vigencia_fim || undefined,
      faixas,
    });
  };

  const addFaixa = () => {
    const lastFaixa = faixas[faixas.length - 1];
    setFaixas([
      ...faixas,
      {
        ate: lastFaixa ? lastFaixa.ate + 1000 : 1000,
        aliquota: 0,
        deducao: 0,
      },
    ]);
  };

  const removeFaixa = (index: number) => {
    setFaixas(faixas.filter((_, i) => i !== index));
  };

  const updateFaixa = (index: number, field: keyof Faixa, value: number) => {
    const newFaixas = [...faixas];
    newFaixas[index] = { ...newFaixas[index], [field]: value };
    setFaixas(newFaixas);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações da Tabela</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="inss">INSS</SelectItem>
                      <SelectItem value="irrf">IRRF</SelectItem>
                    </SelectContent>
                  </Select>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Faixas</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addFaixa}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Faixa
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Até (R$)</TableHead>
                  <TableHead>Alíquota (%)</TableHead>
                  <TableHead>Dedução (R$)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faixas.map((faixa, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={faixa.ate}
                        onChange={(e) => updateFaixa(index, "ate", parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.001"
                        value={(faixa.aliquota * 100).toFixed(1)}
                        onChange={(e) =>
                          updateFaixa(index, "aliquota", (parseFloat(e.target.value) || 0) / 100)
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={faixa.deducao || 0}
                        onChange={(e) =>
                          updateFaixa(index, "deducao", parseFloat(e.target.value) || 0)
                        }
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFaixa(index)}
                        disabled={faixas.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Tabela
          </Button>
        </div>
      </form>
    </Form>
  );
}

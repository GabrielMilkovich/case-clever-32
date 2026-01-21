import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvUploader } from "@/components/admin/CsvUploader";
import { TaxTableEditor } from "@/components/admin/TaxTableEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, TrendingUp, Percent, Loader2 } from "lucide-react";

interface IndexSeries {
  id: string;
  nome: string;
  competencia: string;
  valor: number;
  fonte: string;
  versao: number;
}

interface TaxTable {
  id: string;
  tipo: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  faixas: Array<{ ate: number; aliquota: number; deducao?: number }>;
}

export default function Indices() {
  const [isNewTaxTableOpen, setIsNewTaxTableOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: indices = [], isLoading: indicesLoading } = useQuery({
    queryKey: ["index_series"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("index_series")
        .select("*")
        .order("competencia", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as IndexSeries[];
    },
  });

  const { data: taxTables = [], isLoading: taxTablesLoading } = useQuery({
    queryKey: ["tax_tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_tables")
        .select("*")
        .order("vigencia_inicio", { ascending: false });

      if (error) throw error;
      return data as unknown as TaxTable[];
    },
  });

  const uploadIndicesMutation = useMutation({
    mutationFn: async ({
      nome,
      fonte,
      rows,
    }: {
      nome: string;
      fonte: string;
      rows: Array<{ competencia: string; valor: string }>;
    }) => {
      const records = rows.map((row) => ({
        nome,
        fonte,
        competencia: row.competencia.length === 7 ? `${row.competencia}-01` : row.competencia,
        valor: parseFloat(row.valor),
      }));

      const { error } = await supabase.from("index_series").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["index_series"] });
      toast.success("Índices importados com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao importar: " + error.message);
    },
  });

  const createTaxTableMutation = useMutation({
    mutationFn: async (data: {
      tipo: string;
      vigencia_inicio: string;
      vigencia_fim?: string;
      faixas: Array<{ ate: number; aliquota: number; deducao?: number }>;
    }) => {
      const { error } = await supabase.from("tax_tables").insert({
        tipo: data.tipo,
        vigencia_inicio: data.vigencia_inicio,
        vigencia_fim: data.vigencia_fim || null,
        faixas: data.faixas,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax_tables"] });
      toast.success("Tabela criada com sucesso!");
      setIsNewTaxTableOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar tabela: " + error.message);
    },
  });

  // Group indices by nome
  const groupedIndices = indices.reduce((acc, idx) => {
    if (!acc[idx.nome]) {
      acc[idx.nome] = [];
    }
    acc[idx.nome].push(idx);
    return acc;
  }, {} as Record<string, IndexSeries[]>);

  const indexLabels: Record<string, string> = {
    ipca_e: "IPCA-E",
    inpc: "INPC",
    tr: "TR",
    selic: "SELIC",
    igpm: "IGP-M",
  };

  const isLoading = indicesLoading || taxTablesLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Índices e Tabelas</h1>
          <p className="text-muted-foreground">
            Gerencie índices econômicos e tabelas de INSS/IRRF
          </p>
        </div>

        <Tabs defaultValue="indices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="indices" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Índices Econômicos
            </TabsTrigger>
            <TabsTrigger value="tabelas" className="gap-2">
              <Percent className="h-4 w-4" />
              Tabelas INSS/IRRF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="indices" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <CsvUploader
                onUpload={async (data) => {
                  await uploadIndicesMutation.mutateAsync(data);
                }}
                isLoading={uploadIndicesMutation.isPending}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Índices Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(groupedIndices).map(([nome, items]) => (
                      <div key={nome} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{indexLabels[nome] || nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {items.length} registros
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Último:</p>
                          <p className="font-mono text-sm">
                            {items[0]?.competencia} = {items[0]?.valor.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {Object.keys(groupedIndices).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum índice cadastrado. Use o upload de CSV para importar.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {Object.keys(groupedIndices).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico de Índices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Índice</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Fonte</TableHead>
                          <TableHead>Versão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indices.slice(0, 100).map((idx) => (
                          <TableRow key={idx.id}>
                            <TableCell>
                              <Badge variant="outline">{indexLabels[idx.nome] || idx.nome}</Badge>
                            </TableCell>
                            <TableCell>{idx.competencia}</TableCell>
                            <TableCell className="text-right font-mono">
                              {idx.valor.toFixed(6)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{idx.fonte}</TableCell>
                            <TableCell className="text-muted-foreground">v{idx.versao}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tabelas" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={isNewTaxTableOpen} onOpenChange={setIsNewTaxTableOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tabela
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Tabela de Alíquotas</DialogTitle>
                  </DialogHeader>
                  <TaxTableEditor
                    onSubmit={async (data) => {
                      await createTaxTableMutation.mutateAsync(data);
                    }}
                    isLoading={createTaxTableMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {taxTables.map((table) => (
                <Card key={table.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Percent className="h-5 w-5 text-primary" />
                        {table.tipo.toUpperCase()}
                      </CardTitle>
                      <Badge variant={table.vigencia_fim ? "secondary" : "default"}>
                        {table.vigencia_fim ? "Expirada" : "Vigente"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {table.vigencia_inicio}
                      {table.vigencia_fim && ` → ${table.vigencia_fim}`}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Até (R$)</TableHead>
                          <TableHead>Alíquota</TableHead>
                          <TableHead>Dedução</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.faixas.map((faixa, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">
                              {faixa.ate.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </TableCell>
                            <TableCell>{(faixa.aliquota * 100).toFixed(1)}%</TableCell>
                            <TableCell className="font-mono">
                              {(faixa.deducao || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>

            {taxTables.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Percent className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhuma tabela cadastrada.
                    <br />
                    Crie tabelas de INSS e IRRF para usar nos cálculos.
                  </p>
                  <Button className="mt-4" onClick={() => setIsNewTaxTableOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Tabela
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

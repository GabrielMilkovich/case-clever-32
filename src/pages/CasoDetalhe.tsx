import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileText,
  Sparkles,
  Calculator,
  Play,
  Download,
  Check,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FactValidationView } from "@/components/cases/FactValidationView";
import { CalculatorSuggestions } from "@/components/cases/CalculatorSuggestions";
import { DocumentProcessor } from "@/components/cases/DocumentProcessor";

// Types
interface CaseData {
  id: string;
  cliente: string;
  numero_processo: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criado_em: string;
}

interface Document {
  id: string;
  tipo: string;
  arquivo_url: string | null;
  uploaded_em: string;
  processing_status?: string;
  processing_error?: string;
  chunk_count?: number;
  page_count?: number;
}

interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  origem: string;
  confianca: number | null;
  confirmado: boolean;
  citacao?: string | null;
  pagina?: number | null;
}

interface CalculationProfile {
  id: string;
  nome: string;
  descricao: string | null;
  config: object;
}

interface CalculationRun {
  id: string;
  resultado_bruto: object;
  resultado_liquido: object;
  warnings: unknown[];
  executado_em: string;
}

const statusConfig = {
  rascunho: { label: "Rascunho", color: "bg-gray-500" },
  em_analise: { label: "Em Análise", color: "bg-yellow-500" },
  calculado: { label: "Calculado", color: "bg-blue-500" },
  revisado: { label: "Revisado", color: "bg-green-500" },
};

const docTypeLabels: Record<string, string> = {
  peticao: "Petição",
  trct: "TRCT",
  holerite: "Holerite",
  cartao_ponto: "Cartão de Ponto",
  sentenca: "Sentença",
  outro: "Outro",
};

export default function CasoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch case data
  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as CaseData;
    },
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("case_id", id)
        .order("uploaded_em", { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
  });

  // Fetch facts
  const { data: facts = [] } = useQuery({
    queryKey: ["facts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facts")
        .select("*")
        .eq("case_id", id)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Fact[];
    },
  });

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculation_profiles")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data as CalculationProfile[];
    },
  });

  // Fetch calculation runs
  const { data: runs = [] } = useQuery({
    queryKey: ["calculation_runs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculation_runs")
        .select("*")
        .eq("case_id", id)
        .order("executado_em", { ascending: false });
      if (error) throw error;
      return data as unknown as CalculationRun[];
    },
  });

  // Upload document
  const handleFileUpload = useCallback(async (files: FileList, tipo: string) => {
    if (!id || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("case-documents")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("case-documents")
          .getPublicUrl(fileName);

        // Create document record
        const { error: dbError } = await supabase
          .from("documents")
          .insert([{
            case_id: id,
            tipo: tipo as "peticao" | "trct" | "holerite" | "cartao_ponto" | "sentenca" | "outro",
            arquivo_url: publicUrl,
          }]);

        if (dbError) throw dbError;

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      queryClient.invalidateQueries({ queryKey: ["documents", id] });
      toast.success(`${files.length} documento(s) enviado(s)!`);
    } catch (error) {
      toast.error("Erro ao enviar documento: " + (error as Error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [id, queryClient]);

  // Confirm fact
  const confirmFactMutation = useMutation({
    mutationFn: async ({ factId, confirmed }: { factId: string; confirmed: boolean }) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("facts")
        .update({
          confirmado: confirmed,
          confirmado_por: confirmed ? session?.session?.user.id : null,
          confirmado_em: confirmed ? new Date().toISOString() : null,
        })
        .eq("id", factId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", id] });
    },
  });

  // Update case status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: "rascunho" | "em_analise" | "calculado" | "revisado") => {
      const { error } = await supabase
        .from("cases")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case", id] });
      toast.success("Status atualizado!");
    },
  });

  if (caseLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!caseData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Caso não encontrado.</p>
          <Button onClick={() => navigate("/casos")} className="mt-4">
            Voltar para Casos
          </Button>
        </div>
      </MainLayout>
    );
  }

  const confirmedFacts = facts.filter((f) => f.confirmado);
  const pendingFacts = facts.filter((f) => !f.confirmado);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/casos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{caseData.cliente}</h1>
              <p className="text-muted-foreground">
                {caseData.numero_processo || "Sem número de processo"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={caseData.status}
              onValueChange={(value) => updateStatusMutation.mutate(value as "rascunho" | "em_analise" | "calculado" | "revisado")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${config.color}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge className={statusConfig[caseData.status].color}>
              {statusConfig[caseData.status].label}
            </Badge>
          </div>
        </div>

        {/* Workflow Steps */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {[
                { step: 1, label: "Documentos", icon: Upload, done: documents.length > 0 },
                { step: 2, label: "Fatos Extraídos", icon: Sparkles, done: facts.length > 0 },
                { step: 3, label: "Fatos Confirmados", icon: Check, done: confirmedFacts.length > 0 },
                { step: 4, label: "Cálculo", icon: Calculator, done: runs.length > 0 },
                { step: 5, label: "Exportar", icon: Download, done: caseData.status === "revisado" },
              ].map((item, idx) => (
                <div key={item.step} className="flex items-center">
                  <div className={`flex flex-col items-center ${item.done ? "text-primary" : "text-muted-foreground"}`}>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        item.done ? "border-primary bg-primary/10" : "border-muted-foreground/30"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs mt-2">{item.label}</span>
                  </div>
                  {idx < 4 && (
                    <div className={`w-16 h-0.5 mx-2 ${item.done ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="documentos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documentos" className="gap-2">
              <FileText className="h-4 w-4" />
              Documentos ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="validacao" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Validação ({pendingFacts.length} pendentes)
            </TabsTrigger>
            <TabsTrigger value="calculadoras" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Sugestões
            </TabsTrigger>
            <TabsTrigger value="calculo" className="gap-2">
              <Calculator className="h-4 w-4" />
              Cálculo ({runs.length})
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab - New Document Processor */}
          <TabsContent value="documentos" className="space-y-4">
            <DocumentProcessor
              caseId={id!}
              documents={documents}
              onDocumentsChange={() => queryClient.invalidateQueries({ queryKey: ["documents", id] })}
            />
          </TabsContent>

          {/* Validation Tab - New Split View */}
          <TabsContent value="validacao" className="space-y-4">
            <FactValidationView
              caseId={id!}
              facts={facts}
              documents={documents}
              onFactsChange={() => queryClient.invalidateQueries({ queryKey: ["facts", id] })}
              onValidationComplete={() => {
                // Switch to calculation tab when validation is complete
                const calculoTab = document.querySelector('[value="calculo"]') as HTMLButtonElement;
                calculoTab?.click();
              }}
            />
          </TabsContent>

          {/* Calculator Suggestions Tab */}
          <TabsContent value="calculadoras" className="space-y-4">
            <CalculatorSuggestions
              facts={facts}
              onSelectionChange={(selected) => {
                console.log("Selected calculators:", selected);
              }}
            />
          </TabsContent>

          {/* Calculation Tab */}
          <TabsContent value="calculo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Executar Novo Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Perfil de Cálculo</Label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="lg"
                      disabled={!selectedProfile || confirmedFacts.length === 0}
                      className="gap-2"
                    >
                      <Play className="h-5 w-5" />
                      Executar Cálculo
                    </Button>
                  </div>
                </div>

                {confirmedFacts.length === 0 && (
                  <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Confirme pelo menos um fato antes de calcular.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {runs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Cálculos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {runs.map((run) => (
                      <div
                        key={run.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">
                            {new Date(run.executado_em).toLocaleString("pt-BR")}
                          </span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1">
                              <FileText className="h-4 w-4" />
                              Ver Memória
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Download className="h-4 w-4" />
                              Exportar PDF
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground">Resultado Bruto</p>
                            <p className="text-2xl font-bold text-primary">
                              {typeof run.resultado_bruto === "object" && 
                               "total" in (run.resultado_bruto as object)
                                ? (run.resultado_bruto as { total: number }).total.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                : "—"}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                            <p className="text-2xl font-bold text-green-600">
                              {typeof run.resultado_liquido === "object" && 
                               "total" in (run.resultado_liquido as object)
                                ? (run.resultado_liquido as { total: number }).total.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                : "—"}
                            </p>
                          </div>
                        </div>
                        {Array.isArray(run.warnings) && run.warnings.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-yellow-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">{run.warnings.length} alerta(s)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {runs.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhum cálculo executado ainda.
                    <br />
                    Selecione um perfil e execute o cálculo.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

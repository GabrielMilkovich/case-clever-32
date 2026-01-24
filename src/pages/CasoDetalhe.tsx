import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { CaseWorkspace } from "@/components/cases/CaseWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Loader2,
  AlertTriangle,
  Play,
  FileText,
  Sparkles,
  ShieldCheck,
  Settings2,
  Calculator,
  FileStack,
  Scroll,
  RefreshCw,
} from "lucide-react";

// Import new premium components
import { FactValidationView } from "@/components/cases/FactValidationView";
import { ValidationViewV2 } from "@/components/cases/ValidationViewV2";
import { CalculatorSuggestions } from "@/components/cases/CalculatorSuggestions";
import { DocumentsManager } from "@/components/cases/DocumentsManager";
import { ProcessingMonitorPanel } from "@/components/cases/ProcessingMonitorPanel";
import { SnapshotViewer } from "@/components/cases/SnapshotViewer";
import { ProfileSelector } from "@/components/cases/ProfileSelector";
import {
  CalculationEngine,
  type CalculatorRules,
  type FactMap,
  type IndexSeries,
  type TaxTable,
} from "@/lib/calculation";

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
  status?: string;
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
  config: any;
  calculadoras_incluidas?: string[] | null;
}

interface CalculationRun {
  id: string;
  resultado_bruto: object;
  resultado_liquido: object;
  warnings: unknown[];
  executado_em: string;
}

interface CaseProcessingStats {
  total_documents: number | null;
  indexed_documents: number | null;
  pending_documents: number | null;
  processing_documents: number | null;
  failed_documents: number | null;
  total_chunks: number | null;
  last_processed_at: string | null;
}

const CRITICAL_FACTS: string[] = [
  "data_admissao",
  "data_demissao",
  "salario_base",
  "salario_mensal",
  "jornada_contratual",
];

const criticalLabels: Record<string, string> = {
  data_admissao: "Data de Admissão",
  data_demissao: "Data de Demissão",
  salario_base: "Salário Base",
  salario_mensal: "Salário Mensal",
  jornada_contratual: "Jornada Contratual",
};

export default function CasoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("resumo");
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [isExtractingFacts, setIsExtractingFacts] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [createCriticalKeyRequest, setCreateCriticalKeyRequest] = useState<string | null>(null);
  const [createCriticalNonce, setCreateCriticalNonce] = useState(0);

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

  // Fetch snapshots count
  const { data: snapshotsCount = 0 } = useQuery({
    queryKey: ["calc_snapshots_count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("calc_snapshots")
        .select("id", { count: "exact" })
        .eq("case_id", id);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch extractions count for V2
  const { data: extractionsCount = 0 } = useQuery({
    queryKey: ["extractions_count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("extractions")
        .select("id", { count: "exact" })
        .eq("case_id", id)
        .eq("status", "pendente");
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch case processing stats
  const { data: processingStats = null } = useQuery({
    queryKey: ["case_processing_stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_processing_stats")
        .select("*")
        .eq("case_id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as CaseProcessingStats) ?? null;
    },
    enabled: !!id,
  });

  // Fallback: count chunks directly
  const { data: chunksCountDirect = null } = useQuery({
    queryKey: ["document_chunks_count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("document_chunks")
        .select("id", { count: "exact" })
        .eq("case_id", id);
      if (error) throw error;
      return typeof count === "number" ? count : 0;
    },
    enabled: !!id,
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

  // Loading state
  if (caseLoading) {
    return (
      <MainLayoutPremium
        breadcrumbs={[
          { label: "Casos", href: "/casos" },
          { label: "Carregando..." },
        ]}
      >
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayoutPremium>
    );
  }

  // Not found state
  if (!caseData) {
    return (
      <MainLayoutPremium
        breadcrumbs={[
          { label: "Casos", href: "/casos" },
          { label: "Não encontrado" },
        ]}
      >
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 className="empty-state-title">Caso não encontrado</h3>
          <p className="empty-state-description">
            O caso solicitado não existe ou você não tem permissão para acessá-lo.
          </p>
          <Button onClick={() => navigate("/casos")}>Voltar para Casos</Button>
        </div>
      </MainLayoutPremium>
    );
  }

  // Calculate workflow state
  const confirmedFacts = facts.filter((f) => f.confirmado);
  const pendingFacts = facts.filter((f) => !f.confirmado);
  const criticalFactsInCase = facts.filter((f) => CRITICAL_FACTS.includes(f.chave));
  const canCalculate = criticalFactsInCase.length > 0 && criticalFactsInCase.every((f) => f.confirmado);
  const missingCriticalKeys = CRITICAL_FACTS.filter((k) => !facts.some((f) => f.chave === k));
  const unconfirmedCriticalFacts = facts.filter((f) => CRITICAL_FACTS.includes(f.chave) && !f.confirmado);
  const chunksCount = Math.max(processingStats?.total_chunks ?? 0, chunksCountDirect ?? 0);

  // Workflow steps configuration
  const workflowSteps = [
    {
      id: "resumo",
      label: "Resumo",
      icon: FileText,
      completed: documents.length > 0,
      active: activeTab === "resumo",
    },
    {
      id: "documentos",
      label: "Documentos",
      icon: FileStack,
      completed: documents.length > 0,
      active: activeTab === "documentos",
      count: documents.length,
    },
    {
      id: "extracao",
      label: "Extração",
      icon: Sparkles,
      completed: facts.length > 0,
      active: activeTab === "extracao",
      count: facts.length,
    },
    {
      id: "validacao",
      label: "Validação",
      icon: ShieldCheck,
      completed: canCalculate,
      active: activeTab === "validacao",
      count: pendingFacts.length,
    },
    {
      id: "perfil",
      label: "Perfil",
      icon: Settings2,
      completed: !!selectedProfile,
      active: activeTab === "perfil",
    },
    {
      id: "calculo",
      label: "Snapshots",
      icon: Calculator,
      completed: snapshotsCount > 0,
      active: activeTab === "calculo",
      count: snapshotsCount,
    },
    {
      id: "peticao",
      label: "Petição",
      icon: Scroll,
      completed: caseData.status === "revisado",
      active: activeTab === "peticao",
    },
  ];

  // Helpers
  const mapFactsToEngine = (allFacts: Fact[]): FactMap => {
    const out: FactMap = {};
    for (const f of allFacts) {
      const tipo = ((): FactMap[string]["tipo"] => {
        if (f.tipo === "boolean") return "booleano";
        if (f.tipo === "numero") return "numero";
        if (f.tipo === "data") return "data";
        if (f.tipo === "moeda") return "moeda";
        return "texto";
      })();
      out[f.chave] = {
        valor: f.valor,
        tipo,
        confianca: f.confianca ?? undefined,
        confirmado: !!f.confirmado,
      };
    }
    return out;
  };

  const runFactExtraction = async () => {
    if (!id) return;
    setIsExtractingFacts(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-facts-rag", {
        body: { case_id: id },
      });
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["facts", id] });
      toast.success(
        `Extração concluída: ${data?.facts_valid ?? 0} fato(s) válido(s) (analisados ${data?.chunks_analyzed ?? "—"} chunks)`
      );
    } catch (e) {
      console.error(e);
      toast.error("Falha ao extrair fatos: " + (e as Error).message);
    } finally {
      setIsExtractingFacts(false);
    }
  };

  const restartFactExtraction = async () => {
    if (!id) return;
    if (!chunksCount || chunksCount === 0) {
      toast.error("Não há chunks para extrair. Rode a indexação/OCR primeiro.");
      return;
    }

    const ok = window.confirm(
      "Isso vai APAGAR todos os fatos deste caso e reexecutar a extração. Deseja continuar?"
    );
    if (!ok) return;

    setIsExtractingFacts(true);
    try {
      const { error: delErr } = await supabase.from("facts").delete().eq("case_id", id);
      if (delErr) throw delErr;

      await queryClient.invalidateQueries({ queryKey: ["facts", id] });

      const { data, error } = await supabase.functions.invoke("extract-facts-rag", {
        body: { case_id: id },
      });
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["facts", id] });
      toast.success(
        `Extração reiniciada: ${data?.facts_valid ?? 0} fato(s) válido(s)`
      );
    } catch (e) {
      console.error(e);
      toast.error("Falha ao reiniciar extração: " + (e as Error).message);
    } finally {
      setIsExtractingFacts(false);
    }
  };

  const executeCalculation = async () => {
    if (!id) return;
    if (!selectedProfile) {
      toast.error("Selecione um perfil de cálculo.");
      return;
    }
    if (!canCalculate) {
      toast.error("Confirme os fatos críticos antes de prosseguir com o cálculo.");
      return;
    }

    setIsCalculating(true);
    try {
      // 1) Load profile
      const { data: profile, error: profileErr } = await supabase
        .from("calculation_profiles")
        .select("*")
        .eq("id", selectedProfile)
        .single();
      if (profileErr || !profile) throw profileErr || new Error("Perfil não encontrado");

      // 2) Load calculators
      const { data: profileCalcs, error: pcErr } = await supabase
        .from("profile_calculators")
        .select(`
          calculator_version_id,
          calculator_versions:calculator_version_id (
            id,
            versao,
            vigencia_inicio,
            vigencia_fim,
            regras,
            calculators:calculator_id ( id, nome )
          )
        `)
        .eq("profile_id", selectedProfile);
      if (pcErr) throw pcErr;

      const calculatorsWithRules = (profileCalcs || [])
        .map((row: any) => {
          const cv = row.calculator_versions;
          const calc = cv?.calculators;
          if (!cv || !calc?.nome) return null;
          const rules: CalculatorRules = {
            versao: cv.versao,
            vigencia_inicio: cv.vigencia_inicio,
            vigencia_fim: cv.vigencia_fim ?? undefined,
            regras: (cv.regras?.regras ?? cv.regras ?? {}) as any,
            formula: cv.regras?.formula ?? undefined,
          };
          return { nome: String(calc.nome), rules };
        })
        .filter(Boolean) as { nome: string; rules: CalculatorRules }[];

      // 3) Load indices and tables
      const adm = facts.find((f) => f.chave === "data_admissao")?.valor;
      const dem = facts.find((f) => f.chave === "data_demissao")?.valor;
      const start = adm ? new Date(adm) : null;
      const end = dem ? new Date(dem) : null;

      const { data: indexRows, error: idxErr } = await supabase
        .from("index_series")
        .select("nome, competencia, valor, fonte")
        .order("competencia", { ascending: true })
        .gte("competencia", start && !isNaN(start.getTime()) ? start.toISOString().slice(0, 10) : "1900-01-01")
        .lte("competencia", end && !isNaN(end.getTime()) ? end.toISOString().slice(0, 10) : "2100-01-01");
      if (idxErr) throw idxErr;

      const indices: IndexSeries[] = (indexRows || []).map((r: any) => ({
        nome: r.nome,
        competencia: new Date(r.competencia),
        valor: Number(r.valor),
        fonte: r.fonte ?? undefined,
      }));

      const { data: taxRows, error: taxErr } = await supabase
        .from("tax_tables")
        .select("id, tipo, vigencia_inicio, vigencia_fim, faixas")
        .order("vigencia_inicio", { ascending: true });
      if (taxErr) throw taxErr;

      const taxTables: TaxTable[] = (taxRows || []).map((t: any) => ({
        id: t.id,
        tipo: t.tipo,
        vigencia_inicio: new Date(t.vigencia_inicio),
        vigencia_fim: t.vigencia_fim ? new Date(t.vigencia_fim) : undefined,
        faixas: Array.isArray(t.faixas) ? t.faixas : [],
      }));

      // 4) Execute engine
      const factsSnapshot = mapFactsToEngine(facts);
      const engineProfile = {
        id: profile.id,
        nome: profile.nome,
        config: (profile.config ?? {}) as any,
        calculadoras_incluidas: (profile.calculadoras_incluidas ?? []) as any,
      } as any;

      const engine = new CalculationEngine(
        engineProfile,
        indices,
        taxTables,
        factsSnapshot
      );
      engine.loadCalculators(calculatorsWithRules);
      const result = engine.executeAll();

      // 5) Persist run
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id ?? null;
      const { data: insertedRun, error: runErr } = await supabase
        .from("calculation_runs")
        .insert({
          case_id: id,
          profile_id: selectedProfile,
          executado_por: userId,
          facts_snapshot: result.facts_snapshot as any,
          calculators_used: result.calculators_used as any,
          resultado_bruto: result.resultado_bruto as any,
          resultado_liquido: result.resultado_liquido as any,
          warnings: result.warnings as any,
        })
        .select("id")
        .single();
      if (runErr || !insertedRun?.id) throw runErr || new Error("Falha ao salvar cálculo");

      // 6) Persist audit lines
      if (Array.isArray(result.auditLines) && result.auditLines.length > 0) {
        const payload = result.auditLines.map((l) => ({
          run_id: insertedRun.id,
          linha: l.linha,
          calculadora: l.calculadora,
          competencia: l.competencia ?? null,
          descricao: l.descricao,
          formula: l.formula ?? null,
          valor_bruto: l.valor_bruto ?? null,
          valor_liquido: l.valor_liquido ?? null,
          metadata: (l.metadata ?? null) as any,
        }));

        const { error: auditErr } = await supabase.from("audit_lines").insert(payload as any);
        if (auditErr) throw auditErr;
      }

      // 7) Update UI
      await queryClient.invalidateQueries({ queryKey: ["calculation_runs", id] });
      await queryClient.invalidateQueries({ queryKey: ["calc_snapshots_count", id] });
      toast.success("Cálculo executado com sucesso!");
      updateStatusMutation.mutate("calculado");
      
      // Navigate to snapshots tab
      setActiveTab("calculo");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao executar cálculo: " + (e as Error).message);
    } finally {
      setIsCalculating(false);
    }
  };

  const goToValidation = () => setActiveTab("validacao");
  const requestCreateCritical = (key: string) => {
    setCreateCriticalKeyRequest(key);
    setCreateCriticalNonce((n) => n + 1);
    goToValidation();
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "resumo":
        return (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="card-interactive">
                <CardContent className="pt-6">
                  <div className="stat-card-value">{documents.length}</div>
                  <div className="stat-card-label">Documentos</div>
                </CardContent>
              </Card>
              <Card className="card-interactive">
                <CardContent className="pt-6">
                  <div className="stat-card-value">{chunksCount}</div>
                  <div className="stat-card-label">Chunks Indexados</div>
                </CardContent>
              </Card>
              <Card className="card-interactive">
                <CardContent className="pt-6">
                  <div className="stat-card-value">{facts.length}</div>
                  <div className="stat-card-label">Fatos Extraídos</div>
                </CardContent>
              </Card>
              <Card className="card-interactive">
                <CardContent className="pt-6">
                  <div className="stat-card-value text-green-600">{confirmedFacts.length}</div>
                  <div className="stat-card-label">Fatos Confirmados</div>
                </CardContent>
              </Card>
            </div>

            {/* Next Action CTA */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Próxima Ação Recomendada</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Faça upload dos documentos do caso para começar.</p>
                    <Button onClick={() => setActiveTab("documentos")}>
                      <FileStack className="h-4 w-4 mr-2" />
                      Upload de Documentos
                    </Button>
                  </div>
                ) : facts.length === 0 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Execute a extração de fatos via IA.</p>
                    <Button onClick={() => setActiveTab("extracao")}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Iniciar Extração
                    </Button>
                  </div>
                ) : !canCalculate ? (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Valide os fatos críticos para liberar o cálculo.</p>
                    <Button onClick={goToValidation}>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Validar Fatos
                    </Button>
                  </div>
                ) : snapshotsCount === 0 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Execute o cálculo para gerar o primeiro snapshot.</p>
                    <Button onClick={() => setActiveTab("perfil")}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Selecionar Perfil
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">Revise os snapshots e gere a petição.</p>
                    <Button onClick={() => setActiveTab("peticao")}>
                      <Scroll className="h-4 w-4 mr-2" />
                      Gerar Petição
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Critical Facts Status */}
            {facts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Status dos Fatos Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {CRITICAL_FACTS.map((key) => {
                      const fact = facts.find((f) => f.chave === key);
                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-lg border ${
                            fact?.confirmado
                              ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                              : fact
                              ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                              : "bg-muted border-muted"
                          }`}
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {criticalLabels[key]}
                          </div>
                          <div className="font-medium text-sm truncate">
                            {fact?.valor || "—"}
                          </div>
                          <Badge
                            variant={fact?.confirmado ? "default" : fact ? "secondary" : "outline"}
                            className="mt-2 text-xs"
                          >
                            {fact?.confirmado ? "Confirmado" : fact ? "Pendente" : "Ausente"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "documentos":
        return (
          <div className="space-y-6">
            <ProcessingMonitorPanel
              documents={documents as any}
              stats={processingStats as any}
              totalChunks={chunksCount || undefined}
            />
            <DocumentsManager
              caseId={id!}
              documents={documents as any}
              onDocumentsChange={() => queryClient.invalidateQueries({ queryKey: ["documents", id] })}
            />
          </div>
        );

      case "extracao":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Extração de Fatos via IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  A IA analisa os chunks dos documentos e extrai fatos relevantes como datas, salários e jornadas.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={runFactExtraction}
                    disabled={isExtractingFacts || chunksCount === 0}
                  >
                    {isExtractingFacts ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {facts.length === 0 ? "Iniciar Extração" : "Executar Nova Extração"}
                  </Button>
                  {facts.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={restartFactExtraction}
                      disabled={isExtractingFacts || chunksCount === 0}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reiniciar do Zero
                    </Button>
                  )}
                  <Badge variant="outline">
                    {chunksCount} chunks disponíveis
                  </Badge>
                </div>
                {chunksCount === 0 && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">
                      Nenhum chunk indexado. Processe os documentos primeiro.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {facts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Fatos Extraídos ({facts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {facts.slice(0, 12).map((fact) => (
                      <div
                        key={fact.id}
                        className={`p-3 rounded-lg border ${
                          fact.confirmado
                            ? "bg-green-50/50 border-green-200"
                            : "bg-muted/50 border-muted"
                        }`}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {criticalLabels[fact.chave] || fact.chave}
                        </div>
                        <div className="font-medium text-sm truncate">{fact.valor}</div>
                      </div>
                    ))}
                    {facts.length > 12 && (
                      <div className="p-3 rounded-lg border bg-muted/50 flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">
                          +{facts.length - 12} mais
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => setActiveTab("validacao")}
                  >
                    Ir para Validação
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "validacao":
        return (
          <div className="space-y-6">
            {/* Show extraction-based ValidationViewV2 if there are extractions */}
            {extractionsCount > 0 && (
              <ValidationViewV2 
                caseId={id!}
                onValidationComplete={() => setActiveTab("perfil")}
              />
            )}
            
            {/* Always show FactValidationView for facts */}
            <FactValidationView
              caseId={id!}
              facts={facts}
              documents={documents}
              onFactsChange={() => queryClient.invalidateQueries({ queryKey: ["facts", id] })}
              onValidationComplete={() => setActiveTab("perfil")}
              createCriticalKeyRequest={createCriticalKeyRequest}
              createCriticalNonce={createCriticalNonce}
            />
          </div>
        );

      case "perfil":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Seleção de Perfil de Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Escolha o perfil que define as regras, divisores e calculadoras a serem usadas.
                </p>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Perfil de Cálculo</Label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil..." />
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
                  <Button
                    size="lg"
                    disabled={!selectedProfile || !canCalculate || isCalculating}
                    onClick={executeCalculation}
                  >
                    {isCalculating ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5 mr-2" />
                    )}
                    {isCalculating ? "Calculando..." : "Executar Cálculo"}
                  </Button>
                </div>

                {!canCalculate && (
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-amber-50/50 border-amber-200">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">
                        Validação pendente
                      </p>
                      <p className="text-sm text-amber-700">
                        Confirme os fatos críticos para liberar o cálculo.
                      </p>
                    </div>
                    <Button variant="outline" onClick={goToValidation}>
                      Ir para Validação
                    </Button>
                  </div>
                )}

                {missingCriticalKeys.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Fatos ausentes:</div>
                    <div className="flex flex-wrap gap-2">
                      {missingCriticalKeys.map((k) => (
                        <Button
                          key={k}
                          size="sm"
                          variant="outline"
                          onClick={() => requestCreateCritical(k)}
                        >
                          Adicionar: {criticalLabels[k]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calculator Suggestions */}
            <CalculatorSuggestions
              facts={facts}
              onSelectionChange={(selected) => {
                console.log("Selected calculators:", selected);
              }}
            />
          </div>
        );

      case "calculo":
        return <SnapshotViewer caseId={id!} />;

      case "peticao":
        return (
          <div className="empty-state">
            <Scroll className="empty-state-icon" />
            <h3 className="empty-state-title">Geração de Petição</h3>
            <p className="empty-state-description">
              Esta funcionalidade será implementada em breve. Aqui você poderá gerar petições
              automaticamente com base nos cálculos aprovados.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayoutPremium
      breadcrumbs={[
        { label: "Casos", href: "/casos" },
        { label: caseData.cliente },
      ]}
      title={caseData.cliente}
    >
      <CaseWorkspace
        cliente={caseData.cliente}
        numeroProcesso={caseData.numero_processo}
        status={caseData.status}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        workflowSteps={workflowSteps}
      >
        {renderTabContent()}
      </CaseWorkspace>
    </MainLayoutPremium>
  );
}

import { useState } from "react";
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
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FactValidationView } from "@/components/cases/FactValidationView";
import { CalculatorSuggestions } from "@/components/cases/CalculatorSuggestions";
import { DocumentsManager } from "@/components/cases/DocumentsManager";
import { ProcessingMonitorPanel } from "@/components/cases/ProcessingMonitorPanel";
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

  // Fetch case processing stats (OCR/chunks/indexing)
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

  // Fallback: count chunks directly from table when the stats view is empty
  const { data: chunksCountDirect = null } = useQuery({
    queryKey: ["document_chunks_count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("document_chunks")
        // Avoid `head: true` because some environments return `count=null`.
        // Limit payload while still getting an accurate count.
        .select("id", { count: "exact" })
        .eq("case_id", id);
      if (error) throw error;
      return typeof count === "number" ? count : 0;
    },
    enabled: !!id,
  });

  const refreshChunksCount = async () => {
    if (!id) return;
    try {
      const { count, error } = await supabase
        .from("document_chunks")
        .select("id", { count: "exact" })
        .eq("case_id", id);
      if (error) throw error;
      const next = typeof count === "number" ? count : 0;
      queryClient.setQueryData(["document_chunks_count", id], next);
      toast.success(`Recontagem concluída: ${next} chunks`);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao recontar chunks: " + (e as Error).message);
    }
  };

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

  const CRITICAL_FACTS: string[] = [
    "data_admissao",
    "data_demissao",
    "salario_base",
    "salario_mensal",
    "jornada_contratual",
  ];

  const criticalFactsInCase = facts.filter((f) => CRITICAL_FACTS.includes(f.chave));
  const canCalculate = criticalFactsInCase.length > 0 && criticalFactsInCase.every((f) => f.confirmado);

  const missingCriticalKeys = CRITICAL_FACTS.filter(
    (k) => !facts.some((f) => f.chave === k)
  );

  const unconfirmedCriticalFacts = facts.filter(
    (f) => CRITICAL_FACTS.includes(f.chave) && !f.confirmado
  );

  const criticalLabels: Record<string, string> = {
    data_admissao: "Data de Admissão",
    data_demissao: "Data de Demissão",
    salario_base: "Salário Base",
    salario_mensal: "Salário Mensal",
    jornada_contratual: "Jornada Contratual",
  };

  const goToValidation = () => {
    const validacaoTab = document.querySelector('[value="validacao"]') as HTMLButtonElement;
    validacaoTab?.click();
  };

  const requestCreateCritical = (key: string) => {
    setCreateCriticalKeyRequest(key);
    setCreateCriticalNonce((n) => n + 1);
    goToValidation();
  };

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
      // 1) Carregar perfil
      const { data: profile, error: profileErr } = await supabase
        .from("calculation_profiles")
        .select("*")
        .eq("id", selectedProfile)
        .single();
      if (profileErr || !profile) throw profileErr || new Error("Perfil não encontrado");

      // 2) Carregar calculadoras vinculadas ao perfil (profile_calculators -> calculator_versions -> calculators)
      const { data: profileCalcs, error: pcErr } = await supabase
        .from("profile_calculators")
        .select(
          `
          calculator_version_id,
          calculator_versions:calculator_version_id (
            id,
            versao,
            vigencia_inicio,
            vigencia_fim,
            regras,
            calculators:calculator_id ( id, nome )
          )
        `
        )
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

      // 3) Carregar índices e tabelas
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

      // 4) Executar engine
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

      // 5) Persistir run
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

      // 6) Persistir memória (audit_lines)
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

      // 7) Atualizar UI
      await queryClient.invalidateQueries({ queryKey: ["calculation_runs", id] });
      toast.success("Cálculo executado com sucesso!");

      // Opcional: marcar status como calculado
      updateStatusMutation.mutate("calculado");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao executar cálculo: " + (e as Error).message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Some environments keep the stats view stale (often `0`) even when chunks exist.
  // Prefer the most permissive/accurate number so users can proceed.
  const chunksCount = (() => {
    const fromStats = typeof processingStats?.total_chunks === "number" ? processingStats.total_chunks : null;
    const fromDirect = typeof chunksCountDirect === "number" ? chunksCountDirect : null;
    if (fromStats === null && fromDirect === null) return null;
    return Math.max(fromStats ?? 0, fromDirect ?? 0);
  })();

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
        `Processo reiniciado: ${data?.facts_valid ?? 0} fato(s) válido(s) (analisados ${data?.chunks_analyzed ?? "—"} chunks)`
      );
    } catch (e) {
      console.error(e);
      toast.error("Falha ao reiniciar extração: " + (e as Error).message);
    } finally {
      setIsExtractingFacts(false);
    }
  };

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
                  { step: 3, label: "Fatos Confirmados", icon: Check, done: canCalculate },
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
            <ProcessingMonitorPanel
              documents={documents as any}
              stats={processingStats as any}
              totalChunks={typeof chunksCount === "number" ? chunksCount : undefined}
            />
            <DocumentsManager
              caseId={id!}
              documents={documents as any}
              onDocumentsChange={() => queryClient.invalidateQueries({ queryKey: ["documents", id] })}
            />
          </TabsContent>

          {/* Validation Tab - New Split View */}
          <TabsContent value="validacao" className="space-y-4">
            {facts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Extração de fatos (IA)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Se você reenviou documentos ou quer recomeçar do zero, você pode reiniciar o processo.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={restartFactExtraction}
                      disabled={isExtractingFacts || !chunksCount || chunksCount === 0}
                      className="gap-2"
                      title="Apaga todos os fatos do caso e reexecuta a extração"
                    >
                      {isExtractingFacts ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Reiniciar extração
                    </Button>
                    <Badge variant="outline">
                      {typeof chunksCount === "number" ? `${chunksCount} chunks` : "chunks: —"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            {facts.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Extração de fatos (IA)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Seus documentos estão indexados, mas ainda não há fatos para validar.
                    A validação só aparece depois que a extração de fatos é executada.
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={runFactExtraction}
                      disabled={isExtractingFacts || !chunksCount || chunksCount === 0}
                      className="gap-2"
                    >
                      {isExtractingFacts ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Rodar extração agora
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={refreshChunksCount}
                      className="gap-2"
                      disabled={!id}
                      title="Força uma recontagem dos chunks para este caso"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Recontar
                    </Button>
                    <Badge variant="outline">
                      {typeof chunksCount === "number" ? `${chunksCount} chunks` : "chunks: —"}
                    </Badge>
                  </div>

                  {(!chunksCount || chunksCount === 0) && (
                    <div className="text-sm text-muted-foreground">
                      Ainda não existe texto indexado (chunks = 0). Se o monitor mostra 100% mas chunks = 0,
                      houve falha silenciosa na geração de texto.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
              createCriticalKeyRequest={createCriticalKeyRequest}
              createCriticalNonce={createCriticalNonce}
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
            {!canCalculate && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Validação pendente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Para liberar o cálculo, os fatos críticos precisam existir no caso e estar confirmados.
                  </p>

                  {missingCriticalKeys.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Faltando no caso</div>
                      <div className="flex flex-wrap gap-2">
                        {missingCriticalKeys.map((k) => (
                          <Button
                            key={k}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => requestCreateCritical(k)}
                          >
                            Adicionar: {criticalLabels[k] || k}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {unconfirmedCriticalFacts.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Ainda não confirmados</div>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        {unconfirmedCriticalFacts.map((f) => (
                          <li key={f.id}>{criticalLabels[f.chave] || f.chave}</li>
                        ))}
                      </ul>
                      <Button type="button" variant="outline" onClick={goToValidation}>
                        Ir confirmar agora
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                      disabled={!selectedProfile || !canCalculate}
                      className="gap-2"
                      onClick={executeCalculation}
                    >
                      {isCalculating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                      {isCalculating ? "Calculando…" : "Executar Cálculo"}
                    </Button>
                  </div>
                </div>

                {!canCalculate && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Confirme os fatos críticos na aba Validação para liberar o cálculo.</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={goToValidation}
                    >
                      Ir para Validação
                    </Button>
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

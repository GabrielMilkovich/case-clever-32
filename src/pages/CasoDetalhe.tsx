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
  ChevronRight,
  Check,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import new premium components
import { FactValidationView } from "@/components/cases/FactValidationView";
import { ValidationViewV2 } from "@/components/cases/ValidationViewV2";
import { CalculatorSuggestions } from "@/components/cases/CalculatorSuggestions";
import { DocumentsManager } from "@/components/cases/DocumentsManager";
import { ProcessingMonitorPanel } from "@/components/cases/ProcessingMonitorPanel";
import { SnapshotViewer } from "@/components/cases/SnapshotViewer";
import { ProfileSelector } from "@/components/cases/ProfileSelector";
import { PetitionGenerator } from "@/components/cases/PetitionGenerator";
import { PremissasEditor } from "@/components/cases/PremissasEditor";
import { CalendarioTrabalhistaViewer } from "@/components/cases/CalendarioTrabalhistaViewer";
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
      id: "premissas",
      label: "Premissas",
      icon: Settings2,
      completed: false,
      active: activeTab === "premissas",
    },
    {
      id: "calendario",
      label: "Calendário",
      icon: Calendar,
      completed: false,
      active: activeTab === "calendario",
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

      // 5) Persist run (legacy)
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

      // 6) Create calc_snapshot (new V2 model)
      // Calculate total values from result
      const calcTotalFromResult = (resultObj: unknown): number => {
        if (!resultObj || typeof resultObj !== 'object') return 0;
        let total = 0;
        for (const val of Object.values(resultObj as object)) {
          if (typeof val === 'number') {
            total += val;
          } else if (typeof val === 'object' && val !== null) {
            for (const innerVal of Object.values(val as object)) {
              if (typeof innerVal === 'number') {
                total += innerVal;
              }
            }
          }
        }
        return total;
      };
      
      const totalBruto = calcTotalFromResult(result.resultado_bruto);
      const totalLiquido = calcTotalFromResult(result.resultado_liquido);

      // Get next version number
      const { count: existingSnapshots } = await supabase
        .from("calc_snapshots")
        .select("id", { count: "exact" })
        .eq("case_id", id);
      const nextVersion = (existingSnapshots || 0) + 1;

      // Generate ruleset hash from calculators used
      const rulesetHash = Array.isArray(result.calculators_used) 
        ? result.calculators_used.map((c: any) => `${c.nome}:${c.versao}`).join('|').slice(0, 32)
        : null;

      const { data: insertedSnapshot, error: snapErr } = await supabase
        .from("calc_snapshots")
        .insert({
          case_id: id,
          profile_id: selectedProfile,
          created_by: userId,
          engine_version: "2.0.0",
          ruleset_hash: rulesetHash,
          versao: nextVersion,
          status: "gerado" as const,
          inputs_snapshot: result.facts_snapshot as any,
          resultado_bruto: result.resultado_bruto as any,
          resultado_liquido: result.resultado_liquido as any,
          total_bruto: totalBruto,
          total_liquido: totalLiquido,
          total_descontos: totalBruto - totalLiquido,
          warnings: result.warnings as any,
        })
        .select("id")
        .single();
      if (snapErr) {
        console.error("Snapshot creation error:", snapErr);
        // Continue even if snapshot fails - run was already saved
      }

      // 7) Persist calc_result_items for detailed breakdown
      if (insertedSnapshot?.id && Array.isArray(result.auditLines) && result.auditLines.length > 0) {
        const resultItems = result.auditLines
          .filter((l: any) => l.valor_bruto !== null && l.valor_bruto !== undefined)
          .map((l: any, idx: number) => ({
            snapshot_id: insertedSnapshot.id,
            rubrica_codigo: l.calculadora || "GERAL",
            rubrica_nome: l.descricao,
            competencia: l.competencia || null,
            ordem: idx + 1,
            valor_bruto: l.valor_bruto || 0,
            valor_liquido: l.valor_liquido || l.valor_bruto || 0,
            memoria_detalhada: l.metadata || null,
          }));

        if (resultItems.length > 0) {
          const { error: itemsErr } = await supabase
            .from("calc_result_items")
            .insert(resultItems as any);
          if (itemsErr) {
            console.error("Result items insertion error:", itemsErr);
          }
        }
      }

      // 8) Persist legacy audit lines
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

      // 9) Update UI
      await queryClient.invalidateQueries({ queryKey: ["calculation_runs", id] });
      await queryClient.invalidateQueries({ queryKey: ["calc_snapshots", id] });
      await queryClient.invalidateQueries({ queryKey: ["calc_snapshots_count", id] });
      toast.success(`Cálculo executado! Snapshot v${nextVersion} gerado.`);
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
              <Card className="card-interactive bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{documents.length}</div>
                  <div className="text-sm text-muted-foreground">Documentos</div>
                </CardContent>
              </Card>
              <Card className="card-interactive bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{chunksCount}</div>
                  <div className="text-sm text-muted-foreground">Chunks Indexados</div>
                </CardContent>
              </Card>
              <Card className="card-interactive bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{facts.length}</div>
                  <div className="text-sm text-muted-foreground">Fatos Extraídos</div>
                </CardContent>
              </Card>
              <Card className="card-interactive bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-green-600">{confirmedFacts.length}</div>
                  <div className="text-sm text-muted-foreground">Fatos Confirmados</div>
                </CardContent>
              </Card>
            </div>

            {/* Next Action CTA */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm">
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
              <Card className="bg-card/80 backdrop-blur-sm">
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
          <div className="space-y-6 animate-fade-in">
            {/* Extraction Header Card */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Extração de Fatos via IA</h3>
                  <p className="text-sm text-muted-foreground">
                    A IA analisa os chunks dos documentos e extrai fatos relevantes como datas, salários e jornadas.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={runFactExtraction}
                  disabled={isExtractingFacts || chunksCount === 0}
                  className="btn-premium shadow-sm"
                >
                  {isExtractingFacts ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {facts.length === 0 ? "Executar Nova Extração" : "Executar Nova Extração"}
                </Button>
                {facts.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={restartFactExtraction}
                    disabled={isExtractingFacts || chunksCount === 0}
                    className="transition-all duration-200 hover:border-primary/50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reiniciar do Zero
                  </Button>
                )}
                <Badge 
                  variant="outline" 
                  className="px-3 py-1.5 bg-muted/50 font-medium"
                >
                  {chunksCount} chunks disponíveis
                </Badge>
              </div>
              
              {chunksCount === 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    Nenhum chunk indexado. Processe os documentos primeiro.
                  </span>
                </div>
              )}
            </div>

            {/* Extracted Facts Grid */}
            {facts.length > 0 && (
              <div className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Fatos Extraídos ({facts.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("validacao")}
                    className="transition-all duration-200 hover:border-primary/50"
                  >
                    Ir para Validação
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
                  {facts.slice(0, 12).map((fact, idx) => (
                    <div
                      key={fact.id}
                      className={cn(
                        "fact-card group",
                        fact.confirmado && "bg-gradient-to-br from-green-50/80 to-emerald-50/50 border-green-200/80 dark:from-green-950/30 dark:to-emerald-950/20 dark:border-green-800/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {criticalLabels[fact.chave] || fact.chave.replace(/_/g, " ")}
                        </span>
                        {fact.confirmado && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-200">
                        {fact.valor}
                      </div>
                    </div>
                  ))}
                  {facts.length > 12 && (
                    <div className="fact-card flex items-center justify-center bg-muted/30">
                      <span className="text-muted-foreground text-sm font-medium">
                        +{facts.length - 12} mais
                      </span>
                    </div>
                  )}
                </div>
              </div>
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

      case "premissas":
        return <PremissasEditor caseId={id!} />;

      case "calendario":
        return <CalendarioTrabalhistaViewer caseId={id!} facts={facts} />;

      case "calculo":
        return <SnapshotViewer caseId={id!} />;

      case "peticao":
        return (
          <div className="space-y-6">
            {/* Prerequisites check */}
            {!canCalculate && (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                        Validação Pendente
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Confirme os fatos críticos antes de gerar a petição.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("validacao")}>
                      Ir para Validação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {runs.length === 0 && canCalculate && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <Calculator className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                        Cálculo Recomendado
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Execute um cálculo para que os valores sejam incluídos na petição.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("calculo")}>
                      Ir para Cálculo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Petition Generator */}
            <PetitionGenerator
              caseId={id!}
              calculationRunId={runs[0]?.id}
              onPetitionGenerated={(petitionId) => {
                toast.success("Petição gerada com sucesso!");
                updateStatusMutation.mutate("revisado");
              }}
            />
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

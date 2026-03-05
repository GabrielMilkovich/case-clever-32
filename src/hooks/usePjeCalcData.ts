/**
 * =====================================================
 * usePjeCalcData — Hook central para dados PJe-Calc
 * =====================================================
 * 
 * Substitui as ~15 queries individuais dispersas em PjeCalcPage.
 * Toda busca de dados pjecalc_* agora passa por aqui via service layer.
 */

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import * as svc from "@/lib/pjecalc/service";
import { executarLiquidacao, type OrchestratorResult } from "@/lib/pjecalc/orchestrator";
import { calcularCompletude } from "@/lib/pjecalc/completude";
import type {
  PjecalcParametrosInsert,
  PjecalcFaltaInsert,
  PjecalcFeriasInsert,
  PjecalcVerbaInsert,
  PjecalcHistoricoSalarialInsert,
} from "@/lib/pjecalc/types";

export function usePjeCalcData(caseId: string | undefined) {
  const queryClient = useQueryClient();
  const safeCaseId = caseId || '';

  // =====================================================
  // BATCH QUERY — Single query loads everything
  // =====================================================
  const {
    data: caseData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['pjecalc_case_data', safeCaseId],
    queryFn: () => svc.loadCaseData(safeCaseId),
    enabled: !!safeCaseId,
    staleTime: 30_000,
  });

  // Completude indicators
  const completude = caseData
    ? calcularCompletude(svc.toCompletionInput(caseData))
    : {};

  // =====================================================
  // INVALIDATION HELPER
  // =====================================================
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pjecalc_case_data', safeCaseId] });
  };

  // =====================================================
  // MUTATIONS
  // =====================================================

  const saveParams = useMutation({
    mutationFn: (payload: PjecalcParametrosInsert) => svc.upsertParametros(payload),
    onSuccess: () => { invalidate(); toast.success("Parâmetros salvos!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const addFalta = useMutation({
    mutationFn: (payload: PjecalcFaltaInsert) => svc.insertFalta(payload),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeFalta = useMutation({
    mutationFn: (id: string) => svc.deleteFalta(id),
    onSuccess: () => { invalidate(); },
  });

  const addFerias = useMutation({
    mutationFn: (payload: PjecalcFeriasInsert) => svc.insertFerias(payload),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeFerias = useMutation({
    mutationFn: (id: string) => svc.deleteFerias(id),
    onSuccess: () => { invalidate(); },
  });

  const addHistorico = useMutation({
    mutationFn: (payload: PjecalcHistoricoSalarialInsert) => svc.insertHistoricoSalarial(payload),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeHistorico = useMutation({
    mutationFn: (id: string) => svc.deleteHistoricoSalarial(id),
    onSuccess: () => { invalidate(); },
  });

  const addVerba = useMutation({
    mutationFn: (payload: PjecalcVerbaInsert) => svc.insertVerba(payload),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeVerba = useMutation({
    mutationFn: (id: string) => svc.deleteVerba(id),
    onSuccess: () => { invalidate(); },
  });

  // =====================================================
  // LIQUIDAÇÃO — executa via orchestrator
  // =====================================================

  const liquidar = useMutation({
    mutationFn: async (): Promise<OrchestratorResult> => {
      return executarLiquidacao(safeCaseId, 'manual');
    },
    onSuccess: (res) => {
      invalidate();
      toast.success(`Liquidação concluída! Total: R$ ${res.result.resumo.liquido_reclamante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    },
    onError: (e: Error) => toast.error("Erro na liquidação: " + e.message),
  });

  return {
    // Data
    caseData,
    params: caseData?.params ?? null,
    faltas: caseData?.faltas ?? [],
    ferias: caseData?.ferias ?? [],
    historicos: caseData?.historicos ?? [],
    verbas: caseData?.verbas ?? [],
    cartaoPonto: caseData?.cartaoPonto ?? [],
    resultado: caseData?.resultado ?? null,
    fgtsConfig: caseData?.fgtsConfig ?? null,
    csConfig: caseData?.csConfig ?? null,
    irConfig: caseData?.irConfig ?? null,
    correcaoConfig: caseData?.correcaoConfig ?? null,
    honorarios: caseData?.honorarios ?? null,
    custasConfig: caseData?.custasConfig ?? null,
    multasConfig: caseData?.multasConfig ?? null,
    
    // State
    isLoading,
    completude,

    // Actions
    refetch,
    invalidate,
    saveParams,
    addFalta,
    removeFalta,
    addFerias,
    removeFerias,
    addHistorico,
    removeHistorico,
    addVerba,
    removeVerba,
    liquidar,
  };
}

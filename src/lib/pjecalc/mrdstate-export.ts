/**
 * MRDSTATE Export/Import
 * Serialized calculation state with integrity hash for auditability and reimport.
 * Equivalent to the .PJC file in PJe-Calc.
 */

import { supabase } from "@/integrations/supabase/client";

export interface MRDState {
  version: string;
  exported_at: string;
  hash: string;
  meta: {
    processo_cnj?: string;
    reclamante?: string;
    reclamado?: string;
    engine_version: string;
  };
  parametros: Record<string, any>;
  eventos_intervalo: Record<string, any>[];
  apuracao_diaria: Record<string, any>[];
  historico_salarial: {
    rubricas: Record<string, any>[];
    meses: Record<string, any>[];
  };
  verbas: Record<string, any>[];
  ocorrencias: Record<string, any>[];
  atualizacao_config: Record<string, any> | null;
  resultado: Record<string, any> | null;
}

// Simple hash for integrity verification
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and pad
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // Add length-based component for extra uniqueness
  const lenComp = (data.length % 65536).toString(16).padStart(4, '0');
  return `mrd-${hex}-${lenComp}`;
}

export async function exportMRDState(caseId: string): Promise<MRDState> {
  // Fetch all data in parallel
  const [
    calcRes,
    eventosRes,
    pontoRes,
    histRes,
    histMesRes,
    verbasRes,
    ocorrRes,
    atualizRes,
    resultadoRes,
  ] = await Promise.all([
    supabase.from("pjecalc_calculos" as any).select("*").eq("case_id", caseId).maybeSingle(),
    supabase.from("pjecalc_evento_intervalo" as any).select("*").eq("calculo_id", caseId).order("data_inicio"),
    supabase.from("pjecalc_ponto_diario" as any).select("*").eq("case_id", caseId).order("data"),
    supabase.from("pjecalc_hist_salarial" as any).select("*").eq("calculo_id", caseId),
    supabase.from("pjecalc_hist_salarial_mes" as any).select("*").eq("calculo_id", caseId).order("competencia"),
    supabase.from("pjecalc_verbas" as any).select("*").eq("case_id", caseId).order("ordem"),
    supabase.from("pjecalc_ocorrencias" as any).select("*").eq("case_id", caseId).order("competencia"),
    supabase.from("pjecalc_atualizacao_config" as any).select("*").eq("case_id", caseId).maybeSingle(),
    supabase.from("pjecalc_liquidacao_resultado" as any).select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const calc = (calcRes as any).data;
  const eventos = ((eventosRes as any).data || []) as any[];
  
  // Handle ponto with pagination (may exceed 1000 rows)
  let ponto: any[] = [];
  const pontoData = (pontoRes as any).data || [];
  ponto = pontoData;
  if (pontoData.length === 1000) {
    // Fetch remaining pages
    let offset = 1000;
    let hasMore = true;
    while (hasMore) {
      const moreRes = await supabase
        .from("pjecalc_ponto_diario" as any)
        .select("*")
        .eq("case_id", caseId)
        .order("data")
        .range(offset, offset + 999);
      const moreData = (moreRes as any).data || [];
      ponto = [...ponto, ...moreData];
      hasMore = moreData.length === 1000;
      offset += 1000;
    }
  }

  const hist = ((histRes as any).data || []) as any[];
  const histMes = ((histMesRes as any).data || []) as any[];
  const verbas = ((verbasRes as any).data || []) as any[];
  const ocorr = ((ocorrRes as any).data || []) as any[];
  const atualiz = (atualizRes as any).data;
  const resultado = (resultadoRes as any).data;

  const stateWithoutHash: Omit<MRDState, 'hash'> = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    meta: {
      processo_cnj: calc?.processo_cnj,
      reclamante: calc?.reclamante_nome,
      reclamado: calc?.reclamado_nome,
      engine_version: '2.1.0',
    },
    parametros: calc || {},
    eventos_intervalo: eventos,
    apuracao_diaria: ponto,
    historico_salarial: { rubricas: hist, meses: histMes },
    verbas,
    ocorrencias: ocorr,
    atualizacao_config: atualiz,
    resultado,
  };

  const dataStr = JSON.stringify(stateWithoutHash);
  const hash = simpleHash(dataStr);

  return { ...stateWithoutHash, hash };
}

export function downloadMRDState(state: MRDState, filename?: string) {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `mrdstate_${state.meta.processo_cnj || 'calculo'}_${new Date().toISOString().slice(0, 10)}.mrdstate.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateMRDStateIntegrity(state: MRDState): boolean {
  const { hash, ...rest } = state;
  const dataStr = JSON.stringify(rest);
  return simpleHash(dataStr) === hash;
}

export async function parseMRDStateFile(file: File): Promise<MRDState> {
  const text = await file.text();
  const state = JSON.parse(text) as MRDState;
  if (!state.version || !state.hash) {
    throw new Error('Arquivo inválido: não é um MRDSTATE válido');
  }
  return state;
}

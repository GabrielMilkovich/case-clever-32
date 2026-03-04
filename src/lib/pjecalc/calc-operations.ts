/**
 * PJe-Calc Operations: Fechar, Reabrir, Duplicar
 * Implements calculation locking, unlocking and duplication.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CalcStatus {
  id: string;
  status: 'aberto' | 'fechado';
  fechado_em?: string;
  fechado_por?: string;
}

/**
 * Fechar (lock) a calculation - prevents further edits
 */
export async function fecharCalculo(calculoId: string): Promise<void> {
  const { error } = await supabase
    .from("pjecalc_liquidacao_resultado" as any)
    .update({
      status: 'fechado',
      fechado_em: new Date().toISOString(),
      fechado_por: 'usuario',
    } as any)
    .eq("id", calculoId);

  if (error) throw new Error(`Erro ao fechar cálculo: ${error.message}`);
}

/**
 * Reabrir (unlock) a calculation - allows edits again
 */
export async function reabrirCalculo(calculoId: string): Promise<void> {
  const { error } = await supabase
    .from("pjecalc_liquidacao_resultado" as any)
    .update({
      status: 'aberto',
      fechado_em: null,
      fechado_por: null,
    } as any)
    .eq("id", calculoId);

  if (error) throw new Error(`Erro ao reabrir cálculo: ${error.message}`);
}

/**
 * Duplicar a calculation - copies all module data to a new case
 */
export async function duplicarCalculo(caseId: string, novoCliente?: string): Promise<string> {
  // 1. Create new case
  const { data: originalCase } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .single();

  if (!originalCase) throw new Error("Caso original não encontrado");

  const { data: newCase, error: caseError } = await supabase
    .from("cases")
    .insert({
      cliente: novoCliente || `${originalCase.cliente} (cópia)`,
      numero_processo: originalCase.numero_processo,
      tribunal: originalCase.tribunal,
      status: 'rascunho',
      tags: [...(originalCase.tags || []), 'duplicado'],
    })
    .select()
    .single();

  if (caseError || !newCase) throw new Error(`Erro ao criar caso: ${caseError?.message}`);

  const newCaseId = newCase.id;

  // 2. Copy parametros
  const { data: params } = await supabase
    .from("pjecalc_parametros" as any)
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();

  if (params) {
    const { id, case_id, created_at, updated_at, ...paramsCopy } = params as any;
    await supabase.from("pjecalc_parametros" as any).insert({ ...paramsCopy, case_id: newCaseId });
  }

  // 3. Copy faltas
  const { data: faltas } = await supabase
    .from("pjecalc_faltas" as any)
    .select("*")
    .eq("case_id", caseId);

  if (faltas?.length) {
    const faltasCopy = (faltas as any[]).map((f: any) => {
      const { id, case_id, created_at, ...rest } = f;
      return { ...rest, case_id: newCaseId };
    });
    await supabase.from("pjecalc_faltas" as any).insert(faltasCopy);
  }

  // 4. Copy ferias
  const { data: ferias } = await supabase
    .from("pjecalc_ferias" as any)
    .select("*")
    .eq("case_id", caseId);

  if (ferias?.length) {
    const feriasCopy = (ferias as any[]).map((f: any) => {
      const { id, case_id, created_at, ...rest } = f;
      return { ...rest, case_id: newCaseId };
    });
    await supabase.from("pjecalc_ferias" as any).insert(feriasCopy);
  }

  // 5. Copy historico salarial
  const { data: historicos } = await supabase
    .from("pjecalc_historico_salarial" as any)
    .select("*")
    .eq("case_id", caseId);

  if (historicos?.length) {
    const histCopy = (historicos as any[]).map((h: any) => {
      const { id, case_id, created_at, ...rest } = h;
      return { ...rest, case_id: newCaseId };
    });
    await supabase.from("pjecalc_historico_salarial" as any).insert(histCopy);
  }

  // 6. Copy verbas
  const { data: verbas } = await supabase
    .from("pjecalc_verbas" as any)
    .select("*")
    .eq("case_id", caseId);

  if (verbas?.length) {
    const verbasCopy = (verbas as any[]).map((v: any) => {
      const { id, case_id, created_at, ...rest } = v;
      return { ...rest, case_id: newCaseId };
    });
    await supabase.from("pjecalc_verbas" as any).insert(verbasCopy);
  }

  // 7. Copy configs (FGTS, CS, IR, Correção, Honorários, Custas, Seguro)
  const configTables = [
    'pjecalc_fgts_config',
    'pjecalc_cs_config',
    'pjecalc_ir_config',
    'pjecalc_correcao_config',
    'pjecalc_honorarios',
    'pjecalc_custas_config',
    'pjecalc_seguro_config',
  ];

  for (const table of configTables) {
    const { data: config } = await supabase
      .from(table as any)
      .select("*")
      .eq("case_id", caseId)
      .maybeSingle();

    if (config) {
      const { id, case_id, created_at, updated_at, ...configCopy } = config as any;
      await supabase.from(table as any).insert({ ...configCopy, case_id: newCaseId });
    }
  }

  return newCaseId;
}

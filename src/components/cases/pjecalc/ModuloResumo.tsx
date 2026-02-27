import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Loader2, FileBarChart, Download } from "lucide-react";
import { PjeCalcEngine, type PjeParametros, type PjeHistoricoSalarial, type PjeFalta, type PjeFerias, type PjeVerba, type PjeFGTSConfig, type PjeCSConfig, type PjeIRConfig, type PjeCorrecaoConfig, type PjeLiquidacaoResult } from "@/lib/pjecalc/engine";

interface Props { caseId: string; }

export function ModuloResumo({ caseId }: Props) {
  const qc = useQueryClient();
  const [liquidando, setLiquidando] = useState(false);

  const { data: resultado } = useQuery({
    queryKey: ["pjecalc_liquidacao", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_liquidacao_resultado" as any).select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data as any;
    },
  });

  const executarLiquidacao = async () => {
    setLiquidando(true);
    try {
      // Load all module data
      const [paramsRes, histRes, faltasRes, feriasRes, verbasRes] = await Promise.all([
        supabase.from("pjecalc_parametros").select("*").eq("case_id", caseId).maybeSingle(),
        supabase.from("pjecalc_historico_salarial").select("*").eq("case_id", caseId).order("periodo_inicio"),
        supabase.from("pjecalc_faltas").select("*").eq("case_id", caseId),
        supabase.from("pjecalc_ferias").select("*").eq("case_id", caseId),
        supabase.from("pjecalc_verbas").select("*").eq("case_id", caseId).order("ordem"),
      ]);

      // These tables are new and not yet in generated types, so we use raw queries
      const fgtsData = await supabase.from("pjecalc_fgts_config" as any).select("*").eq("case_id", caseId).maybeSingle().then(r => (r.data || {}) as any);
      const csData = await supabase.from("pjecalc_cs_config" as any).select("*").eq("case_id", caseId).maybeSingle().then(r => (r.data || {}) as any);
      const irData = await supabase.from("pjecalc_ir_config" as any).select("*").eq("case_id", caseId).maybeSingle().then(r => (r.data || {}) as any);
      const correcaoData = await supabase.from("pjecalc_correcao_config" as any).select("*").eq("case_id", caseId).maybeSingle().then(r => (r.data || {}) as any);

      if (!paramsRes.data) throw new Error("Configure os Parâmetros primeiro.");
      if (!verbasRes.data?.length) throw new Error("Adicione pelo menos uma Verba.");

      const params = paramsRes.data as unknown as PjeParametros;
      params.case_id = caseId;

      const historicos: PjeHistoricoSalarial[] = (histRes.data || []).map((h: any) => ({
        ...h, ocorrencias: [],
      }));

      const faltas: PjeFalta[] = (faltasRes.data || []).map((f: any) => ({ ...f }));
      const ferias: PjeFerias[] = (feriasRes.data || []).map((f: any) => ({ ...f }));

      const verbas: PjeVerba[] = (verbasRes.data || []).map((v: any) => ({
        ...v,
        base_calculo: v.base_calculo || { historicos: [], verbas: [], tabelas: ['ultima_remuneracao'], proporcionalizar: false, integralizar: false },
        exclusoes: v.exclusoes || { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: false },
        incidencias: v.incidencias || { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
        juros_ajuizamento: v.juros_ajuizamento || 'ocorrencias_vencidas',
        gerar_verba_reflexa: v.gerar_verba_reflexa || 'diferenca',
        gerar_verba_principal: v.gerar_verba_principal || 'diferenca',
        valor: v.valor || 'calculado',
        tipo_divisor: v.tipo_divisor || 'informado',
        tipo_quantidade: v.tipo_quantidade || 'informada',
        quantidade_proporcionalizar: v.quantidade_proporcionalizar || false,
        dobrar_valor_devido: v.dobrar_valor_devido || false,
        zerar_valor_negativo: v.zerar_valor_negativo || false,
        compor_principal: v.compor_principal ?? true,
        divisor_informado: v.divisor_informado || 30,
        multiplicador: v.multiplicador || 1,
        quantidade_informada: v.quantidade_informada || 1,
      }));

      const fgtsConfig: PjeFGTSConfig = {
        apurar: fgtsData?.apurar ?? true,
        destino: fgtsData?.destino || 'pagar_reclamante',
        compor_principal: fgtsData?.compor_principal ?? true,
        multa_apurar: fgtsData?.multa_apurar ?? true,
        multa_tipo: fgtsData?.multa_tipo || 'calculada',
        multa_percentual: fgtsData?.multa_percentual ?? 40,
        multa_base: fgtsData?.multa_base || 'devido',
        multa_valor_informado: fgtsData?.multa_valor_informado,
        saldos_saques: fgtsData?.saldos_saques || [],
        deduzir_saldo: fgtsData?.deduzir_saldo ?? false,
        lc110_10: fgtsData?.lc110_10 ?? false,
        lc110_05: fgtsData?.lc110_05 ?? false,
      };

      const csConfig: PjeCSConfig = {
        apurar_segurado: csData?.apurar_segurado ?? true,
        cobrar_reclamante: csData?.cobrar_reclamante ?? true,
        cs_sobre_salarios_pagos: csData?.cs_sobre_salarios_pagos ?? false,
        aliquota_segurado_tipo: csData?.aliquota_segurado_tipo || 'empregado',
        aliquota_segurado_fixa: csData?.aliquota_segurado_fixa,
        limitar_teto: csData?.limitar_teto ?? true,
        apurar_empresa: csData?.apurar_empresa ?? true,
        apurar_sat: csData?.apurar_sat ?? true,
        apurar_terceiros: csData?.apurar_terceiros ?? true,
        aliquota_empregador_tipo: 'fixa',
        aliquota_empresa_fixa: csData?.aliquota_empresa_fixa ?? 20,
        aliquota_sat_fixa: csData?.aliquota_sat_fixa ?? 2,
        aliquota_terceiros_fixa: csData?.aliquota_terceiros_fixa ?? 5.8,
        periodos_simples: csData?.periodos_simples || [],
      };

      const irConfig: PjeIRConfig = {
        apurar: irData?.apurar ?? true,
        incidir_sobre_juros: irData?.incidir_sobre_juros ?? false,
        cobrar_reclamado: irData?.cobrar_reclamado ?? false,
        tributacao_exclusiva_13: irData?.tributacao_exclusiva_13 ?? true,
        tributacao_separada_ferias: irData?.tributacao_separada_ferias ?? false,
        deduzir_cs: irData?.deduzir_cs ?? true,
        deduzir_prev_privada: irData?.deduzir_prev_privada ?? false,
        deduzir_pensao: irData?.deduzir_pensao ?? false,
        deduzir_honorarios: irData?.deduzir_honorarios ?? false,
        aposentado_65: irData?.aposentado_65 ?? false,
        dependentes: irData?.dependentes ?? 0,
      };

      const correcaoConfig: PjeCorrecaoConfig = {
        indice: correcaoData?.indice || 'IPCA-E',
        epoca: correcaoData?.epoca || 'mensal',
        data_fixa: correcaoData?.data_fixa,
        juros_tipo: correcaoData?.juros_tipo || 'selic',
        juros_percentual: correcaoData?.juros_percentual ?? 1,
        juros_inicio: correcaoData?.juros_inicio || 'ajuizamento',
        multa_523: correcaoData?.multa_523 ?? false,
        multa_523_percentual: correcaoData?.multa_523_percentual ?? 10,
        data_liquidacao: correcaoData?.data_liquidacao || new Date().toISOString().slice(0, 10),
      };

      // Execute engine
      const engine = new PjeCalcEngine(params, historicos, faltas, ferias, verbas, fgtsConfig, csConfig, irConfig, correcaoConfig);
      const result = engine.liquidar();

      // Persist
      await supabase.from("pjecalc_liquidacao_resultado" as any).insert({
        case_id: caseId,
        resultado: result as any,
        engine_version: '1.0.0',
        data_liquidacao: correcaoConfig.data_liquidacao,
        total_bruto: result.resumo.principal_bruto,
        total_liquido: result.resumo.liquido_reclamante,
        total_reclamante: result.resumo.liquido_reclamante,
        total_reclamada: result.resumo.total_reclamada,
      });

      qc.invalidateQueries({ queryKey: ["pjecalc_liquidacao", caseId] });
      toast.success("Liquidação executada com sucesso!");
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setLiquidando(false);
    }
  };

  const res: PjeLiquidacaoResult | null = resultado?.resultado || null;
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Resumo da Liquidação</h2>
        <Button onClick={executarLiquidacao} disabled={liquidando} size="sm">
          {liquidando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          Liquidar
        </Button>
      </div>

      {!res ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          <FileBarChart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          Configure todos os módulos e clique em <strong>Liquidar</strong> para executar o cálculo completo.
        </CardContent></Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Principal Bruto', value: res.resumo.principal_bruto, color: 'text-primary' },
              { label: 'FGTS Total', value: res.resumo.fgts_total, color: 'text-primary' },
              { label: 'Líquido Reclamante', value: res.resumo.liquido_reclamante, color: 'text-[hsl(var(--success))]' },
              { label: 'Total Reclamada', value: res.resumo.total_reclamada, color: 'text-destructive' },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className={`text-lg font-bold ${item.color}`}>{fmt(item.value)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Composição</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-xs">
                <tbody>
                  {[
                    ['Principal Bruto', res.resumo.principal_bruto],
                    ['(+) Correção Monetária', res.resumo.principal_corrigido - res.resumo.principal_bruto],
                    ['(+) Juros de Mora', res.resumo.juros_mora],
                    ['(+) FGTS (depósitos + multa)', res.resumo.fgts_total],
                    ['(-) CS Segurado', -res.resumo.cs_segurado],
                    ['(-) IRRF', -res.resumo.ir_retido],
                    ['(+) Multa Art. 523 CPC', res.resumo.multa_523],
                    ['(+) Honorários', res.resumo.honorarios],
                    ['(+) Custas', res.resumo.custas],
                  ].map(([label, value]) => (
                    <tr key={label as string} className="border-b border-border/30">
                      <td className="py-2 text-muted-foreground">{label}</td>
                      <td className="py-2 text-right font-mono font-medium">{fmt(value as number)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-primary/30 font-bold">
                    <td className="py-2">LÍQUIDO RECLAMANTE</td>
                    <td className="py-2 text-right font-mono text-[hsl(var(--success))]">{fmt(res.resumo.liquido_reclamante)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2">CS EMPREGADOR</td>
                    <td className="py-2 text-right font-mono">{fmt(res.resumo.cs_empregador)}</td>
                  </tr>
                  <tr className="border-t-2 border-destructive/30 font-bold">
                    <td className="py-2">TOTAL RECLAMADA</td>
                    <td className="py-2 text-right font-mono text-destructive">{fmt(res.resumo.total_reclamada)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Verbas Detail */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Verbas ({res.verbas.length})</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left">Verba</th><th className="p-2 text-center">Tipo</th><th className="p-2 text-right">Devido</th><th className="p-2 text-right">Pago</th><th className="p-2 text-right">Diferença</th></tr></thead>
                <tbody>
                  {res.verbas.map(v => (
                    <tr key={v.verba_id} className="border-b border-border/30">
                      <td className="p-2 font-medium">{v.nome}</td>
                      <td className="p-2 text-center"><Badge variant={v.tipo === 'principal' ? 'default' : 'secondary'} className="text-[10px]">{v.tipo === 'principal' ? 'P' : 'R'}</Badge></td>
                      <td className="p-2 text-right font-mono">{fmt(v.total_devido)}</td>
                      <td className="p-2 text-right font-mono">{fmt(v.total_pago)}</td>
                      <td className="p-2 text-right font-mono font-medium">{fmt(v.total_diferenca)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="text-[10px] text-muted-foreground text-right">
            Liquidação em {resultado?.data_liquidacao || '—'} • Engine v{resultado?.engine_version}
          </div>
        </>
      )}
    </div>
  );
}

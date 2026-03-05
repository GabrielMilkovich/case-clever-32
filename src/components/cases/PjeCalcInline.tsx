import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Save, Play, FileText, Calendar, Clock,
  DollarSign, Building2, Receipt, Percent, TrendingUp, FileBarChart,
  Check, Plus, Trash2, Loader2, Briefcase, Calculator,
  Scale, Shield, Gavel, Users, Landmark, Zap,
} from "lucide-react";

// Module components
import { ModuloDadosProcesso } from "./pjecalc/ModuloDadosProcesso";
import { ModuloCartaoPonto } from "./pjecalc/ModuloCartaoPonto";
import { ModuloFGTS } from "./pjecalc/ModuloFGTS";
import { ModuloCS } from "./pjecalc/ModuloCS";
import { ModuloIR } from "./pjecalc/ModuloIR";
import { ModuloCorrecao } from "./pjecalc/ModuloCorrecao";
import { ModuloSeguroDesemprego } from "./pjecalc/ModuloSeguroDesemprego";
import { ModuloHonorarios } from "./pjecalc/ModuloHonorarios";
import { ModuloCustas } from "./pjecalc/ModuloCustas";
import { ModuloResumo } from "./pjecalc/ModuloResumo";
import { ModuloMultasCLT } from "./pjecalc/ModuloMultasCLT";
import { ModuloPensaoAlimenticia } from "./pjecalc/ModuloPensaoAlimenticia";
import { ModuloPrevidenciaPrivada } from "./pjecalc/ModuloPrevidenciaPrivada";
import { ModuloSalarioFamilia } from "./pjecalc/ModuloSalarioFamilia";
import { calcularCompletude, type ModuleStatus } from "@/lib/pjecalc/completude";

  // Module definitions with metadata
  const MODULOS = [
    { id: 'dados_processo', label: 'Dados do Processo', icon: Gavel, desc: 'Identificação e partes' },
    { id: 'parametros', label: 'Parâmetros', icon: Calendar, desc: 'Datas e configuração' },
    { id: 'historico', label: 'Histórico Salarial', icon: DollarSign, desc: 'Bases de cálculo' },
    { id: 'faltas', label: 'Faltas', icon: Clock, desc: 'Registros de ausência' },
    { id: 'ferias', label: 'Férias', icon: Calendar, desc: 'Períodos aquisitivos' },
    { id: 'cartao_ponto', label: 'Cartão de Ponto', icon: Clock, desc: 'Horas extras e noturnas' },
    { id: 'verbas', label: 'Verbas', icon: FileText, desc: 'Parcelas do cálculo' },
    { id: 'salario_familia', label: 'Salário-Família', icon: Users, desc: 'Cotas por dependente' },
    { id: 'seguro_desemprego', label: 'Seguro-Desemprego', icon: Shield, desc: 'Indenização substitutiva' },
    { id: 'fgts', label: 'FGTS', icon: Building2, desc: 'Depósitos e multa' },
    { id: 'cs', label: 'Contrib. Social', icon: Receipt, desc: 'Segurado e empregador' },
    { id: 'prev_privada', label: 'Previd. Privada', icon: Briefcase, desc: 'Complementar' },
    { id: 'pensao', label: 'Pensão Alimentícia', icon: Users, desc: 'Percentual sobre crédito' },
    { id: 'ir', label: 'Imposto de Renda', icon: Percent, desc: 'IRRF / RRA' },
    { id: 'correcao', label: 'Correção/Juros', icon: TrendingUp, desc: 'Atualização monetária' },
    { id: 'multas', label: 'Multas e Inden.', icon: Gavel, desc: 'CLT 467, 477, etc.' },
    { id: 'honorarios', label: 'Honorários', icon: Scale, desc: 'Sucumbenciais e contratuais' },
    { id: 'custas', label: 'Custas', icon: Landmark, desc: 'Custas e assistência' },
    { id: 'resumo', label: 'Resumo', icon: FileBarChart, desc: 'Resultado da liquidação' },
  ];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface PjeCalcInlineProps {
  caseId: string;
}

export function PjeCalcInline({ caseId }: PjeCalcInlineProps) {
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState('dados_processo');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncDone, setAutoSyncDone] = useState(false);

  // DATA
  const { data: params } = useQuery({
    queryKey: ["pjecalc_parametros", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_parametros" as any).select("*").eq("case_id", caseId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: contract } = useQuery({
    queryKey: ["employment_contract", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("employment_contracts" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const { data: faltas = [] } = useQuery({
    queryKey: ["pjecalc_faltas", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_faltas" as any).select("*").eq("case_id", caseId).order("data_inicial");
      return (data || []) as any[];
    },
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ["pjecalc_ferias", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_ferias" as any).select("*").eq("case_id", caseId).order("periodo_aquisitivo_inicio");
      return (data || []) as any[];
    },
  });

  const { data: historicos = [] } = useQuery({
    queryKey: ["pjecalc_historico", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_historico_salarial" as any).select("*").eq("case_id", caseId).order("periodo_inicio");
      return (data || []) as any[];
    },
  });

  const { data: verbas = [] } = useQuery({
    queryKey: ["pjecalc_verbas", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_verbas" as any).select("*").eq("case_id", caseId).order("ordem");
      return (data || []) as any[];
    },
  });

  const { data: dadosProcesso } = useQuery({
    queryKey: ["pjecalc_dados_processo", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_dados_processo" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const { data: resultado } = useQuery({
    queryKey: ["pjecalc_liquidacao", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_liquidacao_resultado" as any).select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data as any;
    },
  });

  // FORM STATE
  const [formParams, setFormParams] = useState({
    estado: 'SP', municipio: '', data_admissao: '', data_demissao: '',
    data_ajuizamento: '', data_inicial: '', data_final: '',
    prescricao_quinquenal: false, prescricao_fgts: false,
    regime_trabalho: 'tempo_integral', carga_horaria_padrao: 220,
    maior_remuneracao: '', ultima_remuneracao: '',
    prazo_aviso_previo: 'nao_apurar', prazo_aviso_dias: '',
    projetar_aviso_indenizado: false, limitar_avos_periodo: false,
    zerar_valor_negativo: false, sabado_dia_util: true,
    considerar_feriado_estadual: false, considerar_feriado_municipal: false,
    comentarios: '',
  });

  useEffect(() => {
    if (params) {
      setFormParams({
        estado: params.estado || 'SP', municipio: params.municipio || '',
        data_admissao: params.data_admissao || '', data_demissao: params.data_demissao || '',
        data_ajuizamento: params.data_ajuizamento || '',
        data_inicial: params.data_inicial || '', data_final: params.data_final || '',
        prescricao_quinquenal: params.prescricao_quinquenal || false,
        prescricao_fgts: params.prescricao_fgts || false,
        regime_trabalho: params.regime_trabalho || 'tempo_integral',
        carga_horaria_padrao: params.carga_horaria_padrao || 220,
        maior_remuneracao: params.maior_remuneracao?.toString() || '',
        ultima_remuneracao: params.ultima_remuneracao?.toString() || '',
        prazo_aviso_previo: params.prazo_aviso_previo || 'nao_apurar',
        prazo_aviso_dias: params.prazo_aviso_dias?.toString() || '',
        projetar_aviso_indenizado: params.projetar_aviso_indenizado || false,
        limitar_avos_periodo: params.limitar_avos_periodo || false,
        zerar_valor_negativo: params.zerar_valor_negativo || false,
        sabado_dia_util: params.sabado_dia_util ?? true,
        considerar_feriado_estadual: params.considerar_feriado_estadual || false,
        considerar_feriado_municipal: params.considerar_feriado_municipal || false,
        comentarios: params.comentarios || '',
      });
    } else if (contract) {
      setFormParams(prev => ({
        ...prev,
        data_admissao: contract.data_admissao || '',
        data_demissao: contract.data_demissao || '',
        carga_horaria_padrao: (contract.jornada_contratual as any)?.divisor || 220,
      }));
    }
  }, [params, contract]);

  // ── AUTO-SYNC: preencher módulos automaticamente ao abrir ──
  useEffect(() => {
    if (autoSyncDone) return;
    // Wait for queries to settle
    if (params !== undefined || contract !== undefined) {
      // If params already exist, skip auto-sync
      if (params?.id) {
        setAutoSyncDone(true);
        return;
      }
      // Run auto-sync
      (async () => {
        setSyncing(true);
        setAutoSyncDone(true);
        try {
          const { syncFromValidation } = await import('@/lib/pjecalc/sync-from-validation');
          const result = await syncFromValidation(caseId);
          if (result.syncedFields > 0) {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["pjecalc_parametros", caseId] }),
              queryClient.invalidateQueries({ queryKey: ["pjecalc_dados_processo", caseId] }),
              queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] }),
              queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] }),
              queryClient.invalidateQueries({ queryKey: ["employment_contract", caseId] }),
            ]);
            if (result.errors.length > 0) {
              toast.warning(`Auto-sync: ${result.syncedFields} campos, ${result.errors.length} aviso(s)`);
            } else {
              toast.success(`${result.syncedFields} campos preenchidos automaticamente!`);
            }
          }
        } catch (e) {
          console.warn("Auto-sync falhou:", e);
        } finally {
          setSyncing(false);
        }
      })();
    }
  }, [params, contract, autoSyncDone, caseId, queryClient]);

  // ── SINCRONIZAR DADOS ──
  const syncFromOCR = async () => {
    setSyncing(true);
    try {
      const { syncFromValidation } = await import('@/lib/pjecalc/sync-from-validation');
      const result = await syncFromValidation(caseId);

      if (result.syncedFields === 0) {
        toast.info("Nenhum dado encontrado para sincronizar. Faça upload e OCR de documentos primeiro.");
        return;
      }

      // Invalidate all queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pjecalc_parametros", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["pjecalc_dados_processo", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["employment_contract", caseId] }),
      ]);

      if (result.errors.length > 0) {
        toast.warning(`Sincronizado com ${result.errors.length} aviso(s): ${result.errors[0]}`);
        console.warn("Sync errors:", result.errors);
      } else {
        toast.success(`${result.syncedFields} campos sincronizados! Verifique cada módulo.`);
      }
    } catch (e) {
      toast.error("Erro ao sincronizar: " + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const saveParams = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, estado: formParams.estado, municipio: formParams.municipio,
        data_admissao: formParams.data_admissao, data_demissao: formParams.data_demissao || null,
        data_ajuizamento: formParams.data_ajuizamento,
        data_inicial: formParams.data_inicial || null, data_final: formParams.data_final || null,
        prescricao_quinquenal: formParams.prescricao_quinquenal,
        prescricao_fgts: formParams.prescricao_fgts,
        regime_trabalho: formParams.regime_trabalho,
        carga_horaria_padrao: formParams.carga_horaria_padrao,
        maior_remuneracao: formParams.maior_remuneracao ? parseFloat(formParams.maior_remuneracao) : null,
        ultima_remuneracao: formParams.ultima_remuneracao ? parseFloat(formParams.ultima_remuneracao) : null,
        prazo_aviso_previo: formParams.prazo_aviso_previo,
        prazo_aviso_dias: formParams.prazo_aviso_dias ? parseInt(formParams.prazo_aviso_dias) : null,
        projetar_aviso_indenizado: formParams.projetar_aviso_indenizado,
        limitar_avos_periodo: formParams.limitar_avos_periodo,
        zerar_valor_negativo: formParams.zerar_valor_negativo,
        sabado_dia_util: formParams.sabado_dia_util,
        considerar_feriado_estadual: formParams.considerar_feriado_estadual,
        considerar_feriado_municipal: formParams.considerar_feriado_municipal,
        comentarios: formParams.comentarios,
      };
      if (params?.id) {
        await supabase.from("pjecalc_parametros" as any).update(payload).eq("id", params.id);
      } else {
        await supabase.from("pjecalc_parametros" as any).insert(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["pjecalc_parametros", caseId] });
      toast.success("Parâmetros salvos!");
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const completude = useMemo(() => {
    return calcularCompletude({
      params: formParams,
      faltas,
      ferias,
      historicos,
      verbas,
      cartaoPonto: [], // TODO: load cartao ponto for check
      resultado
    });
  }, [formParams, faltas, ferias, historicos, verbas, resultado]);

  const getStatusColor = (status: ModuleStatus) => {
    switch (status) {
      case 'validado': return 'bg-[hsl(var(--success))]';
      case 'preenchido': return 'bg-primary';
      case 'alerta': return 'bg-yellow-500';
      case 'incompleto': return 'bg-destructive';
      default: return 'bg-muted-foreground/30';
    }
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'dados_processo': return <ModuloDadosProcesso caseId={caseId} />;
      case 'parametros': return renderParametros();
      case 'faltas': return renderFaltas();
      case 'ferias': return renderFerias();
      case 'historico': return renderHistorico();
      case 'cartao_ponto': return <ModuloCartaoPonto caseId={caseId} dataAdmissao={formParams.data_admissao} dataDemissao={formParams.data_demissao} />;
      case 'verbas': return renderVerbas();
      case 'salario_familia': return <ModuloSalarioFamilia caseId={caseId} />;
      case 'fgts': return <ModuloFGTS caseId={caseId} />;
      case 'cs': return <ModuloCS caseId={caseId} />;
      case 'prev_privada': return <ModuloPrevidenciaPrivada caseId={caseId} />;
      case 'pensao': return <ModuloPensaoAlimenticia caseId={caseId} />;
      case 'ir': return <ModuloIR caseId={caseId} />;
      case 'correcao': return <ModuloCorrecao caseId={caseId} />;
      case 'seguro_desemprego': return <ModuloSeguroDesemprego caseId={caseId} />;
      case 'multas': return <ModuloMultasCLT caseId={caseId} />;
      case 'honorarios': return <ModuloHonorarios caseId={caseId} />;
      case 'custas': return <ModuloCustas caseId={caseId} />;
      case 'resumo': return <ModuloResumo caseId={caseId} />;
      default: return null;
    }
  };

  // ── PARÂMETROS ──
  const renderParametros = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Parâmetros do Cálculo</h2>
        <Button onClick={saveParams} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Localização</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Estado *</Label>
            <Select value={formParams.estado} onValueChange={v => setFormParams(p => ({ ...p, estado: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Município *</Label>
            <Input value={formParams.municipio} onChange={e => setFormParams(p => ({ ...p, municipio: e.target.value }))} className="mt-1 h-8 text-xs" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Datas do Contrato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label className="text-xs">Admissão *</Label><Input type="date" value={formParams.data_admissao} onChange={e => setFormParams(p => ({ ...p, data_admissao: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          <div><Label className="text-xs">Demissão</Label><Input type="date" value={formParams.data_demissao} onChange={e => setFormParams(p => ({ ...p, data_demissao: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          <div><Label className="text-xs">Ajuizamento *</Label><Input type="date" value={formParams.data_ajuizamento} onChange={e => setFormParams(p => ({ ...p, data_ajuizamento: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          <div><Label className="text-xs">Data Inicial</Label><Input type="date" value={formParams.data_inicial} onChange={e => setFormParams(p => ({ ...p, data_inicial: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Prescrição</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={formParams.prescricao_quinquenal} onCheckedChange={v => setFormParams(p => ({ ...p, prescricao_quinquenal: !!v }))} /><Label className="text-xs">Aplicar Prescrição Quinquenal</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.prescricao_fgts} onCheckedChange={v => setFormParams(p => ({ ...p, prescricao_fgts: !!v }))} /><Label className="text-xs">Aplicar Prescrição FGTS</Label></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Regime e Jornada</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Regime de Trabalho</Label>
            <Select value={formParams.regime_trabalho} onValueChange={v => setFormParams(p => ({ ...p, regime_trabalho: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tempo_integral">Tempo Integral</SelectItem>
                <SelectItem value="tempo_parcial">Tempo Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Carga Horária Mensal</Label><Input type="number" value={formParams.carga_horaria_padrao} onChange={e => setFormParams(p => ({ ...p, carga_horaria_padrao: parseInt(e.target.value) || 220 }))} className="mt-1 h-8 text-xs" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Remunerações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs">Maior Remuneração (R$)</Label><Input type="number" step="0.01" value={formParams.maior_remuneracao} onChange={e => setFormParams(p => ({ ...p, maior_remuneracao: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="0,00" /></div>
          <div><Label className="text-xs">Última Remuneração (R$)</Label><Input type="number" step="0.01" value={formParams.ultima_remuneracao} onChange={e => setFormParams(p => ({ ...p, ultima_remuneracao: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="0,00" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Aviso Prévio</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Prazo do Aviso Prévio</Label>
            <Select value={formParams.prazo_aviso_previo} onValueChange={v => setFormParams(p => ({ ...p, prazo_aviso_previo: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_apurar">Não Apurar</SelectItem>
                <SelectItem value="calculado">Calculado (Lei 12.506/2011)</SelectItem>
                <SelectItem value="informado">Informado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formParams.prazo_aviso_previo === 'informado' && (
            <div><Label className="text-xs">Dias</Label><Input type="number" value={formParams.prazo_aviso_dias} onChange={e => setFormParams(p => ({ ...p, prazo_aviso_dias: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Opções</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={formParams.projetar_aviso_indenizado} onCheckedChange={v => setFormParams(p => ({ ...p, projetar_aviso_indenizado: !!v }))} /><Label className="text-xs">Projetar Aviso Prévio Indenizado</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.limitar_avos_periodo} onCheckedChange={v => setFormParams(p => ({ ...p, limitar_avos_periodo: !!v }))} /><Label className="text-xs">Limitar Avos ao Período do Cálculo</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.zerar_valor_negativo} onCheckedChange={v => setFormParams(p => ({ ...p, zerar_valor_negativo: !!v }))} /><Label className="text-xs">Zerar Valor Negativo</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.sabado_dia_util} onCheckedChange={v => setFormParams(p => ({ ...p, sabado_dia_util: !!v }))} /><Label className="text-xs">Sábado como Dia Útil</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.considerar_feriado_estadual} onCheckedChange={v => setFormParams(p => ({ ...p, considerar_feriado_estadual: !!v }))} /><Label className="text-xs">Considerar Feriado Estadual</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formParams.considerar_feriado_municipal} onCheckedChange={v => setFormParams(p => ({ ...p, considerar_feriado_municipal: !!v }))} /><Label className="text-xs">Considerar Feriado Municipal</Label></div>
        </CardContent>
      </Card>
    </div>
  );

  // ── FALTAS ──
  const renderFaltas = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Faltas</h2>
        <Button size="sm" onClick={async () => {
          await supabase.from("pjecalc_faltas" as any).insert({ case_id: caseId, data_inicial: new Date().toISOString().slice(0, 10), data_final: new Date().toISOString().slice(0, 10), justificada: false });
          queryClient.invalidateQueries({ queryKey: ["pjecalc_faltas", caseId] });
        }}><Plus className="h-4 w-4 mr-1" /> Nova Falta</Button>
      </div>
      {faltas.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma falta registrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {faltas.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <Input type="date" defaultValue={f.data_inicial} className="h-8 text-xs w-36" onBlur={e => supabase.from("pjecalc_faltas" as any).update({ data_inicial: e.target.value }).eq("id", f.id)} />
                <span className="text-xs text-muted-foreground">a</span>
                <Input type="date" defaultValue={f.data_final} className="h-8 text-xs w-36" onBlur={e => supabase.from("pjecalc_faltas" as any).update({ data_final: e.target.value }).eq("id", f.id)} />
                <div className="flex items-center gap-1"><Checkbox defaultChecked={f.justificada} onCheckedChange={v => supabase.from("pjecalc_faltas" as any).update({ justificada: !!v }).eq("id", f.id)} /><Label className="text-xs">Justificada</Label></div>
                <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={async () => { await supabase.from("pjecalc_faltas" as any).delete().eq("id", f.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_faltas", caseId] }); }}><Trash2 className="h-3 w-3" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ── FÉRIAS ──
  const renderFerias = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Férias</h2>
        <Button size="sm" variant="outline" onClick={async () => {
          if (!formParams.data_admissao || !formParams.data_demissao) { toast.error("Preencha as datas nos Parâmetros."); return; }
          await supabase.from("pjecalc_ferias" as any).delete().eq("case_id", caseId);
          const adm = new Date(formParams.data_admissao), dem = new Date(formParams.data_demissao);
          const periodos: any[] = [];
          let aqInicio = new Date(adm);
          while (aqInicio < dem) {
            const aqFim = new Date(aqInicio); aqFim.setFullYear(aqFim.getFullYear() + 1); aqFim.setDate(aqFim.getDate() - 1);
            const concInicio = new Date(aqFim); concInicio.setDate(concInicio.getDate() + 1);
            const concFim = new Date(concInicio); concFim.setFullYear(concFim.getFullYear() + 1); concFim.setDate(concFim.getDate() - 1);
            
            // Art. 130 CLT: Calcular prazo com base em faltas não justificadas no período aquisitivo
            let faltasNaoJustificadas = 0;
            for (const f of faltas) {
              if ((f as any).justificada) continue;
              const fInicio = new Date((f as any).data_inicial);
              const fFim = new Date((f as any).data_final);
              const overlapInicio = fInicio > aqInicio ? fInicio : aqInicio;
              const overlapFim = fFim < (aqFim > dem ? dem : aqFim) ? fFim : (aqFim > dem ? dem : aqFim);
              if (overlapInicio <= overlapFim) {
                faltasNaoJustificadas += Math.floor((overlapFim.getTime() - overlapInicio.getTime()) / 86400000) + 1;
              }
            }
            let prazoDias: number;
            if (formParams.regime_trabalho === 'tempo_parcial') {
              prazoDias = faltasNaoJustificadas > 7 ? 9 : 18;
            } else {
              if (faltasNaoJustificadas > 32) prazoDias = 0;
              else if (faltasNaoJustificadas > 23) prazoDias = 12;
              else if (faltasNaoJustificadas > 14) prazoDias = 18;
              else if (faltasNaoJustificadas > 5) prazoDias = 24;
              else prazoDias = 30;
            }
            
            const periodoAqFimEfetivo = aqFim > dem ? dem : aqFim;
            const situacao = prazoDias === 0 ? 'perdidas' : (concFim <= dem ? 'gozadas' : 'indenizadas');
            const dobra = situacao === 'gozadas' ? false : (situacao === 'indenizadas' && concFim > dem);
            
            periodos.push({
              case_id: caseId,
              relativas: `${aqInicio.getFullYear()}/${periodoAqFimEfetivo.getFullYear()}`,
              periodo_aquisitivo_inicio: aqInicio.toISOString().slice(0, 10),
              periodo_aquisitivo_fim: periodoAqFimEfetivo.toISOString().slice(0, 10),
              periodo_concessivo_inicio: concInicio.toISOString().slice(0, 10),
              periodo_concessivo_fim: concFim.toISOString().slice(0, 10),
              prazo_dias: prazoDias,
              situacao,
              dobra: !!dobra,
            });
            aqInicio = new Date(aqFim); aqInicio.setDate(aqInicio.getDate() + 1);
          }
          if (periodos.length > 0) await supabase.from("pjecalc_ferias" as any).insert(periodos);
          queryClient.invalidateQueries({ queryKey: ["pjecalc_ferias", caseId] });
          toast.success(`${periodos.length} período(s) gerado(s) com prazo Art. 130 CLT`);
        }}><Calculator className="h-4 w-4 mr-1" /> Gerar Automaticamente</Button>
      </div>
      {ferias.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Clique em "Gerar Automaticamente".</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-muted/50"><th className="p-2 text-left font-medium">Relativas</th><th className="p-2 text-left font-medium">P. Aquisitivo</th><th className="p-2 text-left font-medium">P. Concessivo</th><th className="p-2 text-center font-medium">Prazo</th><th className="p-2 text-center font-medium">Situação</th><th className="p-2 text-center font-medium">Dobra</th><th className="p-2 text-center font-medium">Abono</th></tr></thead>
            <tbody>
              {ferias.map((f: any) => (
                <tr key={f.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2">{f.relativas}</td>
                  <td className="p-2 font-mono">{f.periodo_aquisitivo_inicio} a {f.periodo_aquisitivo_fim}</td>
                  <td className="p-2 font-mono">{f.periodo_concessivo_inicio} a {f.periodo_concessivo_fim}</td>
                  <td className="p-2 text-center">{f.prazo_dias}d</td>
                  <td className="p-2 text-center">
                    <Select defaultValue={f.situacao} onValueChange={async v => { await supabase.from("pjecalc_ferias" as any).update({ situacao: v }).eq("id", f.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_ferias", caseId] }); }}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="gozadas">Gozadas</SelectItem><SelectItem value="indenizadas">Indenizadas</SelectItem><SelectItem value="perdidas">Perdidas</SelectItem><SelectItem value="gozadas_parcialmente">Goz. Parcial</SelectItem></SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-center"><Checkbox defaultChecked={f.dobra} onCheckedChange={v => supabase.from("pjecalc_ferias" as any).update({ dobra: !!v }).eq("id", f.id)} /></td>
                  <td className="p-2 text-center"><Checkbox defaultChecked={f.abono} onCheckedChange={v => supabase.from("pjecalc_ferias" as any).update({ abono: !!v }).eq("id", f.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── HISTÓRICO SALARIAL ──
  const [autoFilling, setAutoFilling] = useState(false);

  const autoPreencherHistorico = async () => {
    setAutoFilling(true);
    try {
      // Fetch all available sources in parallel
      const [factsRes, contractRes, extractionsRes, extItemsRes] = await Promise.all([
        supabase.from("facts").select("*").eq("case_id", caseId),
        supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle(),
        supabase.from("extractions").select("*").eq("case_id", caseId).in("status", ["validado", "pendente"]),
        supabase.from("extracao_item").select("*").eq("case_id", caseId).eq("target_table", "pjecalc_hist_salarial").in("status", ["AUTO", "APROVADO"]),
      ]);

      const facts = factsRes.data || [];
      const contract = contractRes.data;
      const extractions = extractionsRes.data || [];
      const extItems = (extItemsRes.data || []) as any[];

      // Build fact map
      const factMap: Record<string, string> = {};
      for (const f of facts) {
        if (!factMap[f.chave] || f.confirmado) factMap[f.chave] = f.valor;
      }
      for (const e of extractions) {
        const ext = e as any;
        if (ext.valor_proposto && ext.campo && !factMap[ext.campo]) factMap[ext.campo] = ext.valor_proposto;
      }

      const periodoInicio = formParams.data_admissao || contract?.data_admissao || factMap.data_admissao || new Date().toISOString().slice(0, 10);
      const periodoFim = formParams.data_demissao || contract?.data_demissao || factMap.data_demissao || new Date().toISOString().slice(0, 10);

      // Collect bases to create
      const basesToCreate: { nome: string; valor: number; tipo: string; fgts: boolean; cs: boolean; inicio?: string; fim?: string }[] = [];

      // 1. Salário Base from facts/contract
      const salStr = factMap.salario_base || factMap.salario_mensal || factMap.ultimo_salario;
      const salContrato = contract?.salario_inicial;
      const salVal = salStr ? parseFloat(salStr.replace(/[^\d.,]/g, '').replace(',', '.')) : salContrato;
      if (salVal && salVal > 0) {
        basesToCreate.push({ nome: 'Salário Base', valor: salVal, tipo: 'FIXO', fgts: true, cs: true });
      }

      // 2. From employment_contracts.historico_salarial JSON
      if (contract?.historico_salarial && Array.isArray(contract.historico_salarial)) {
        for (const entry of contract.historico_salarial as any[]) {
          const val = parseFloat(String(entry.valor || entry.salario || 0).replace(/[^\d.,]/g, '').replace(',', '.'));
          if (val > 0) {
            basesToCreate.push({
              nome: entry.nome || entry.descricao || `Salário ${entry.data_inicio || ''}`,
              valor: val, tipo: 'FIXO', fgts: true, cs: true,
              inicio: entry.data_inicio || entry.vigencia_inicio,
              fim: entry.data_fim || entry.vigencia_fim,
            });
          }
        }
      }

      // 3. Salary-related facts (comissão, adicional, gratificação, etc.)
      const salaryFactKeys = ['comissao', 'adicional_noturno', 'adicional_periculosidade', 'adicional_insalubridade', 'gratificacao', 'premio', 'dsr', 'media_comissoes', 'media_variaveis'];
      for (const key of salaryFactKeys) {
        if (factMap[key]) {
          const val = parseFloat(factMap[key].replace(/[^\d.,]/g, '').replace(',', '.'));
          if (val > 0) {
            const nomeMap: Record<string, string> = {
              comissao: 'Comissões', adicional_noturno: 'Adicional Noturno',
              adicional_periculosidade: 'Adicional Periculosidade', adicional_insalubridade: 'Adicional Insalubridade',
              gratificacao: 'Gratificação', premio: 'Prêmio', dsr: 'DSR',
              media_comissoes: 'Média Comissões', media_variaveis: 'Média Variáveis',
            };
            basesToCreate.push({ nome: nomeMap[key] || key, valor: val, tipo: 'VARIAVEL', fgts: true, cs: true });
          }
        }
      }

      // 4. From extraction items (pipeline-extracted rubrics grouped by target_field)
      const rubricaMap = new Map<string, { valores: { comp: string; val: number }[]; evidence: string }>();
      for (const item of extItems) {
        const cat = item.target_field || 'outros';
        const val = parseFloat(String(item.valor || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
        if (val <= 0) continue;
        if (!rubricaMap.has(cat)) rubricaMap.set(cat, { valores: [], evidence: item.evidence_text || cat });
        rubricaMap.get(cat)!.valores.push({ comp: item.competencia, val });
      }
      const catLabels: Record<string, string> = {
        comissao: 'Comissões (Extraído)', dsr: 'DSR (Extraído)', premio: 'Prêmio (Extraído)',
        adicional_noturno: 'Adic. Noturno (Extraído)', hora_extra: 'Hora Extra (Extraído)',
        salario_base: 'Salário Base (Extraído)', outros: 'Outros (Extraído)',
      };
      for (const [cat, data] of rubricaMap.entries()) {
        // Don't duplicate if we already have salario_base from facts
        if (cat === 'salario_base' && basesToCreate.some(b => b.nome === 'Salário Base')) continue;
        const avg = data.valores.reduce((s, v) => s + v.val, 0) / data.valores.length;
        basesToCreate.push({ nome: catLabels[cat] || data.evidence, valor: Math.round(avg * 100) / 100, tipo: 'VARIAVEL', fgts: true, cs: true });
      }

      if (basesToCreate.length === 0) {
        toast.warning("Nenhuma base salarial encontrada nas fontes disponíveis (fatos, contratos, extrações).");
        setAutoFilling(false);
        return;
      }

      // Deduplicate by name
      const seen = new Set<string>();
      const uniqueBases = basesToCreate.filter(b => {
        const key = b.nome.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Also skip bases that already exist
      const existingNames = new Set(historicos.map((h: any) => (h.nome || '').toLowerCase()));
      const newBases = uniqueBases.filter(b => !existingNames.has(b.nome.toLowerCase()));

      if (newBases.length === 0) {
        toast.info("Todas as bases já estão cadastradas.");
        setAutoFilling(false);
        return;
      }

      // Insert all bases
      let inserted = 0;
      for (const base of newBases) {
        const { error } = await supabase.from("pjecalc_historico_salarial" as any).insert({
          case_id: caseId,
          nome: base.nome,
          periodo_inicio: base.inicio || periodoInicio,
          periodo_fim: base.fim || periodoFim,
          tipo_valor: base.tipo,
          valor_informado: base.valor,
          incidencia_fgts: base.fgts,
          incidencia_cs: base.cs,
        });
        if (!error) inserted++;
      }

      // Also insert monthly occurrences for extraction-based rubrics
      for (const [cat, data] of rubricaMap.entries()) {
        if (cat === 'salario_base' && existingNames.has('salário base')) continue;
        // Find the newly inserted historico by name
        const nomeBusca = catLabels[cat] || data.evidence;
        const { data: histData } = await supabase.from("pjecalc_historico_salarial" as any)
          .select("id").eq("case_id", caseId).eq("nome", nomeBusca).maybeSingle();
        if (histData?.id && data.valores.length > 0) {
          const ocorrencias = data.valores.map(v => ({
            historico_id: histData.id, case_id: caseId,
            competencia: v.comp, valor: v.val, tipo: 'informado',
          }));
          await supabase.from("pjecalc_historico_ocorrencias" as any).insert(ocorrencias);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] });
      toast.success(`${inserted} base(s) salarial(is) preenchida(s) automaticamente!`);
    } catch (err) {
      toast.error("Erro ao preencher: " + (err as Error).message);
    } finally {
      setAutoFilling(false);
    }
  };

  const renderHistorico = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Histórico Salarial</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={autoPreencherHistorico} disabled={autoFilling}>
            {autoFilling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
            Auto-Preencher
          </Button>
          <Button size="sm" onClick={async () => {
            if (!formParams.data_admissao) { toast.error("Preencha a data de admissão."); return; }
            await supabase.from("pjecalc_historico_salarial" as any).insert({ case_id: caseId, nome: `Salário Base ${historicos.length + 1}`, periodo_inicio: formParams.data_admissao, periodo_fim: formParams.data_demissao || new Date().toISOString().slice(0, 10), tipo_valor: 'informado', incidencia_fgts: true, incidencia_cs: true });
            queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] });
          }}><Plus className="h-4 w-4 mr-1" /> Nova Base</Button>
        </div>
      </div>

      {historicos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <DollarSign className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma base cadastrada.</p>
            <p className="text-xs text-muted-foreground">Clique em <strong>"Auto-Preencher"</strong> para buscar automaticamente de fatos, contratos e fichas financeiras importadas.</p>
          </CardContent>
        </Card>
      ) : historicos.map((h: any) => (
        <Card key={h.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{h.nome}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-[10px]">{h.tipo_valor}</Badge>
                {h.incidencia_fgts && <Badge variant="outline" className="text-[10px]">FGTS</Badge>}
                {h.incidencia_cs && <Badge variant="outline" className="text-[10px]">CS</Badge>}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await supabase.from("pjecalc_historico_salarial" as any).delete().eq("id", h.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] }); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div><Label className="text-[10px]">Início</Label><div className="font-mono">{h.periodo_inicio}</div></div>
              <div><Label className="text-[10px]">Fim</Label><div className="font-mono">{h.periodo_fim}</div></div>
              <div><Label className="text-[10px]">Valor</Label><div className="font-mono">{h.valor_informado ? `R$ ${h.valor_informado.toFixed(2)}` : '—'}</div></div>
              <div><Label className="text-[10px]">Tipo</Label><div>{h.tipo_valor}</div></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ── VERBAS ──
  const renderVerbas = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Verbas</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => {
            const periodo = formParams.data_admissao && formParams.data_demissao ? { inicio: formParams.data_admissao, fim: formParams.data_demissao } : { inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10) };
            // 1. Insert principal first
            const { data: principalData } = await supabase.from("pjecalc_verbas" as any).insert({
              case_id: caseId, nome: 'Horas Extras 50%', caracteristica: 'comum', ocorrencia_pagamento: 'mensal',
              tipo: 'principal', multiplicador: 1.5, divisor_informado: formParams.carga_horaria_padrao || 220,
              periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: verbas.length,
            }).select("id").single();
            const principalId = (principalData as any)?.id || null;
            // 2. Insert reflexas linked to principal
            const reflexas = [
              { nome: 'RSR s/ Horas Extras', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 30 },
              { nome: '13º Salário', caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', multiplicador: 1, divisor_informado: 12 },
              { nome: 'Férias + 1/3', caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', multiplicador: 1.3333, divisor_informado: 12 },
            ];
            for (let i = 0; i < reflexas.length; i++) {
              await supabase.from("pjecalc_verbas" as any).insert({
                case_id: caseId, ...reflexas[i], tipo: 'reflexa',
                periodo_inicio: periodo.inicio, periodo_fim: periodo.fim,
                ordem: verbas.length + 1 + i,
                verba_principal_id: principalId,
                base_calculo: { historicos: [], verbas: principalId ? [principalId] : [], tabelas: [], proporcionalizar: false, integralizar: false },
              });
            }
            queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
            toast.success("Verbas expressas adicionadas com vinculação!");
          }}><Briefcase className="h-4 w-4 mr-1" /> Expresso</Button>
          <Button size="sm" onClick={async () => {
            const periodo = formParams.data_admissao && formParams.data_demissao ? { inicio: formParams.data_admissao, fim: formParams.data_demissao } : { inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10) };
            // Only allow creating reflexa if there's at least one principal
            await supabase.from("pjecalc_verbas" as any).insert({ case_id: caseId, nome: `Verba ${verbas.length + 1}`, tipo: 'principal', periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: verbas.length });
            queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
          }}><Plus className="h-4 w-4 mr-1" /> Manual</Button>
        </div>
      </div>
      {verbas.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Use "Expresso" para incluir verbas comuns ou "Manual" para criar uma verba personalizada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {/* Render verbas hierarchically: principals first, then their reflexas indented */}
          {verbas.filter((v: any) => v.tipo === 'principal').map((principal: any) => {
            const reflexas = verbas.filter((v: any) => v.tipo === 'reflexa' && v.verba_principal_id === principal.id);
            const orphanCount = reflexas.length;
            return (
              <div key={principal.id} className="space-y-1">
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="text-[10px]">P</Badge>
                        <div>
                          <div className="text-sm font-medium">{principal.nome}</div>
                          <div className="text-[10px] text-muted-foreground flex gap-2"><span>{principal.caracteristica}</span><span>•</span><span>{principal.ocorrencia_pagamento}</span><span>•</span><span>×{principal.multiplicador} ÷{principal.divisor_informado || 30}</span>{orphanCount > 0 && <span className="text-primary">• {orphanCount} reflexo(s)</span>}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">{principal.periodo_inicio?.slice(0, 7)} → {principal.periodo_fim?.slice(0, 7)}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await supabase.from("pjecalc_verbas" as any).delete().eq("id", principal.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] }); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Reflexas indented under principal */}
                {reflexas.map((ref: any) => (
                  <Card key={ref.id} className="ml-6 border-l-2 border-primary/20 hover:border-primary/40 transition-colors">
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-[10px]">└</span>
                          <Badge variant="secondary" className="text-[10px]">R</Badge>
                          <div>
                            <div className="text-sm font-medium">{ref.nome}</div>
                            <div className="text-[10px] text-muted-foreground flex gap-2"><span>{ref.caracteristica}</span><span>•</span><span>×{ref.multiplicador} ÷{ref.divisor_informado || 30}</span></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">{ref.periodo_inicio?.slice(0, 7)} → {ref.periodo_fim?.slice(0, 7)}</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await supabase.from("pjecalc_verbas").delete().eq("id", ref.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] }); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
          {/* Orphan reflexas (no verba_principal_id) */}
          {verbas.filter((v: any) => v.tipo === 'reflexa' && !v.verba_principal_id).map((v: any) => (
            <Card key={v.id} className="hover:border-destructive/30 transition-colors border-destructive/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-[10px]">R⚠</Badge>
                    <div>
                      <div className="text-sm font-medium">{v.nome}</div>
                      <div className="text-[10px] text-destructive">Sem verba principal vinculada</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">{v.periodo_inicio?.slice(0, 7)} → {v.periodo_fim?.slice(0, 7)}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await supabase.from("pjecalc_verbas").delete().eq("id", v.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] }); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* OCR Sync Bar */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Sincronização Automática de Dados</span>
          </div>
          <Button size="sm" variant="outline" onClick={syncFromOCR} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
            Sincronizar Dados
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 flex-shrink-0 space-y-1">
          {MODULOS.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-all",
                activeModule === m.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <m.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{m.label}</span>
              {/* Status Indicator */}
              <div className={cn("w-2 h-2 rounded-full", getStatusColor(completude[m.id] || 'nao_iniciado'))} />
            </button>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <ScrollArea className="h-[650px]">
            <div className="pr-4 pb-8">
              {renderModule()}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}

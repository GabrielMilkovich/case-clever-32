import { useState, useEffect } from "react";
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

const MODULOS = [
  { id: 'dados_processo', label: 'Dados do Processo', icon: Gavel, desc: 'Identificação e partes' },
  { id: 'parametros', label: 'Parâmetros', icon: Calendar, desc: 'Datas e configuração' },
  { id: 'historico', label: 'Histórico Salarial', icon: DollarSign, desc: 'Bases de cálculo' },
  { id: 'faltas', label: 'Faltas', icon: Clock, desc: 'Registros de ausência' },
  { id: 'ferias', label: 'Férias', icon: Calendar, desc: 'Períodos aquisitivos' },
  { id: 'cartao_ponto', label: 'Cartão de Ponto', icon: Clock, desc: 'Horas extras e noturnas' },
  { id: 'verbas', label: 'Verbas', icon: FileText, desc: 'Parcelas do cálculo' },
  { id: 'fgts', label: 'FGTS', icon: Building2, desc: 'Depósitos e multa' },
  { id: 'cs', label: 'Contrib. Social', icon: Receipt, desc: 'Segurado e empregador' },
  { id: 'ir', label: 'Imposto de Renda', icon: Percent, desc: 'IRRF / RRA' },
  { id: 'correcao', label: 'Correção/Juros', icon: TrendingUp, desc: 'Atualização monetária' },
  { id: 'seguro_desemprego', label: 'Seguro-Desemprego', icon: Shield, desc: 'Indenização substitutiva' },
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

  // DATA
  const { data: params } = useQuery({
    queryKey: ["pjecalc_parametros", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_parametros").select("*").eq("case_id", caseId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: contract } = useQuery({
    queryKey: ["employment_contract", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle();
      return data;
    },
  });

  const { data: faltas = [] } = useQuery({
    queryKey: ["pjecalc_faltas", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_faltas").select("*").eq("case_id", caseId).order("data_inicial");
      return data || [];
    },
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ["pjecalc_ferias", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_ferias").select("*").eq("case_id", caseId).order("periodo_aquisitivo_inicio");
      return data || [];
    },
  });

  const { data: historicos = [] } = useQuery({
    queryKey: ["pjecalc_historico", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_historico_salarial").select("*").eq("case_id", caseId).order("periodo_inicio");
      return data || [];
    },
  });

  const { data: verbas = [] } = useQuery({
    queryKey: ["pjecalc_verbas", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_verbas").select("*").eq("case_id", caseId).order("ordem");
      return data || [];
    },
  });

  const { data: dadosProcesso } = useQuery({
    queryKey: ["pjecalc_dados_processo", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_dados_processo" as any).select("*").eq("case_id", caseId).maybeSingle();
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

  // ── SINCRONIZAR DADOS ──
  const syncFromOCR = async () => {
    setSyncing(true);
    try {
      // Fetch facts AND case data AND employment contract in parallel
      const [factsRes, caseRes, contractRes] = await Promise.all([
        supabase.from("facts").select("*").eq("case_id", caseId),
        supabase.from("cases").select("*").eq("id", caseId).maybeSingle(),
        supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle(),
      ]);

      const facts = factsRes.data || [];
      const caseData = caseRes.data;
      const contractData = contractRes.data;

      // Build fact map (handle duplicate keys by preferring confirmed facts)
      const factMap: Record<string, string> = {};
      for (const f of facts) {
        if (!factMap[f.chave] || f.confirmado) {
          factMap[f.chave] = f.valor;
        }
      }

      // Also pull from case and contract tables directly
      if (!factMap.data_admissao && contractData?.data_admissao) factMap.data_admissao = contractData.data_admissao;
      if (!factMap.data_demissao && contractData?.data_demissao) factMap.data_demissao = contractData.data_demissao;
      if (!factMap.salario_base && contractData?.salario_inicial) factMap.salario_base = String(contractData.salario_inicial);
      if (!factMap.numero_processo && caseData?.numero_processo) factMap.numero_processo = caseData.numero_processo;
      if (!factMap.reclamante && caseData?.cliente) factMap.reclamante = caseData.cliente;
      if (contractData?.funcao && !factMap.cargo) factMap.cargo = contractData.funcao;

      const hasData = Object.keys(factMap).length > 0;
      if (!hasData) {
        toast.info("Nenhum dado encontrado para sincronizar. Faça upload e OCR de documentos primeiro.");
        return;
      }

      const errors: string[] = [];

      // ── Auto-populate Parâmetros ──
      const autoParams: any = { case_id: caseId };
      if (factMap.data_admissao) autoParams.data_admissao = factMap.data_admissao;
      if (factMap.data_demissao) autoParams.data_demissao = factMap.data_demissao;
      if (factMap.data_ajuizamento) autoParams.data_ajuizamento = factMap.data_ajuizamento;
      if (factMap.salario_base || factMap.salario_mensal || factMap.ultimo_salario) {
        const salVal = parseFloat((factMap.salario_base || factMap.salario_mensal || factMap.ultimo_salario).replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(salVal) && salVal > 0) {
          autoParams.ultima_remuneracao = salVal;
          autoParams.maior_remuneracao = salVal;
        }
      }
      if (factMap.jornada_contratual || factMap.carga_horaria) {
        const jornada = parseInt(factMap.jornada_contratual || factMap.carga_horaria);
        if (jornada && jornada > 0) autoParams.carga_horaria_padrao = jornada;
      }
      if (factMap.estado || factMap.uf) autoParams.estado = (factMap.estado || factMap.uf).toUpperCase().trim();
      if (factMap.municipio || factMap.cidade) autoParams.municipio = factMap.municipio || factMap.cidade;

      if (params?.id) {
        const { error } = await supabase.from("pjecalc_parametros").update(autoParams).eq("id", params.id);
        if (error) errors.push(`Parâmetros: ${error.message}`);
      } else {
        // Ensure NOT NULL columns have fallback values
        if (!autoParams.data_admissao) autoParams.data_admissao = new Date().toISOString().slice(0, 10);
        if (!autoParams.data_ajuizamento) autoParams.data_ajuizamento = new Date().toISOString().slice(0, 10);
        autoParams.regime_trabalho = 'tempo_integral';
        autoParams.sabado_dia_util = true;
        const { error } = await supabase.from("pjecalc_parametros").insert(autoParams);
        if (error) errors.push(`Parâmetros: ${error.message}`);
      }

      // ── Auto-populate Dados do Processo ──
      const processData: any = { case_id: caseId };
      if (factMap.numero_processo) processData.numero_processo = factMap.numero_processo;
      if (factMap.reclamante || factMap.nome_reclamante) processData.reclamante_nome = factMap.reclamante || factMap.nome_reclamante;
      if (factMap.cpf_reclamante || factMap.cpf) processData.reclamante_cpf = factMap.cpf_reclamante || factMap.cpf;
      if (factMap.reclamada || factMap.nome_reclamada || factMap.empregador) processData.reclamada_nome = factMap.reclamada || factMap.nome_reclamada || factMap.empregador;
      if (factMap.cnpj_reclamada || factMap.cnpj) processData.reclamada_cnpj = factMap.cnpj_reclamada || factMap.cnpj;
      if (factMap.vara) processData.vara = factMap.vara;
      if (factMap.comarca) processData.comarca = factMap.comarca;
      if (factMap.cargo || factMap.funcao) processData.objeto = factMap.cargo || factMap.funcao;

      if (Object.keys(processData).length > 1) {
        if (dadosProcesso?.id) {
          const { error } = await supabase.from("pjecalc_dados_processo" as any).update(processData).eq("id", dadosProcesso.id);
          if (error) errors.push(`Dados Processo: ${error.message}`);
        } else {
          const { error } = await supabase.from("pjecalc_dados_processo" as any).insert(processData);
          if (error) errors.push(`Dados Processo: ${error.message}`);
        }
      }

      // ── Auto-populate Histórico Salarial ──
      if (autoParams.data_admissao && autoParams.ultima_remuneracao) {
        const existing = await supabase.from("pjecalc_historico_salarial").select("id").eq("case_id", caseId);
        if (!existing.data?.length) {
          const { error } = await supabase.from("pjecalc_historico_salarial").insert({
            case_id: caseId,
            nome: 'Salário Base',
            periodo_inicio: autoParams.data_admissao,
            periodo_fim: autoParams.data_demissao || new Date().toISOString().slice(0, 10),
            tipo_valor: 'informado',
            valor_informado: autoParams.ultima_remuneracao,
            incidencia_fgts: true,
            incidencia_cs: true,
          });
          if (error) errors.push(`Histórico: ${error.message}`);
        }
      }

      // ── Auto-generate verbas if empty ──
      const existingVerbas = await supabase.from("pjecalc_verbas").select("id").eq("case_id", caseId);
      if (!existingVerbas.data?.length && autoParams.data_admissao) {
        const periodo = { inicio: autoParams.data_admissao, fim: autoParams.data_demissao || new Date().toISOString().slice(0, 10) };
        const verbasExpresso = [
          { nome: 'Horas Extras 50%', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', tipo: 'principal', multiplicador: 1.5, divisor_informado: autoParams.carga_horaria_padrao || 220 },
          { nome: 'RSR s/ Horas Extras', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', tipo: 'reflexa', multiplicador: 1, divisor_informado: 30 },
          { nome: '13º Salário', caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', tipo: 'reflexa', multiplicador: 1, divisor_informado: 12 },
          { nome: 'Férias + 1/3', caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', tipo: 'reflexa', multiplicador: 1.3333, divisor_informado: 12 },
        ];
        for (let i = 0; i < verbasExpresso.length; i++) {
          const { error } = await supabase.from("pjecalc_verbas").insert({ case_id: caseId, ...verbasExpresso[i], periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: i });
          if (error) errors.push(`Verba ${verbasExpresso[i].nome}: ${error.message}`);
        }
      }

      // Update local form state immediately
      if (autoParams.data_admissao) setFormParams(p => ({
        ...p,
        data_admissao: autoParams.data_admissao || p.data_admissao,
        data_demissao: autoParams.data_demissao || p.data_demissao,
        data_ajuizamento: autoParams.data_ajuizamento || p.data_ajuizamento,
        ultima_remuneracao: autoParams.ultima_remuneracao?.toString() || p.ultima_remuneracao,
        maior_remuneracao: autoParams.maior_remuneracao?.toString() || p.maior_remuneracao,
        estado: autoParams.estado || p.estado,
        municipio: autoParams.municipio || p.municipio,
        carga_horaria_padrao: autoParams.carga_horaria_padrao || p.carga_horaria_padrao,
      }));

      // Invalidate all queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pjecalc_parametros", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["pjecalc_dados_processo", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["employment_contract", caseId] }),
      ]);

      if (errors.length > 0) {
        toast.warning(`Sincronizado com ${errors.length} aviso(s): ${errors[0]}`);
        console.warn("Sync errors:", errors);
      } else {
        const syncedFields = Object.keys(factMap).length;
        toast.success(`${syncedFields} campos sincronizados! Verifique cada módulo.`);
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
        await supabase.from("pjecalc_parametros").update(payload).eq("id", params.id);
      } else {
        await supabase.from("pjecalc_parametros").insert(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["pjecalc_parametros", caseId] });
      toast.success("Parâmetros salvos!");
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const moduleStatus = (modId: string): 'done' | 'active' | 'pending' => {
    if (modId === activeModule) return 'active';
    switch (modId) {
      case 'dados_processo': return dadosProcesso ? 'done' : 'pending';
      case 'parametros': return params ? 'done' : 'pending';
      case 'faltas': return faltas.length > 0 ? 'done' : 'pending';
      case 'ferias': return ferias.length > 0 ? 'done' : 'pending';
      case 'historico': return historicos.length > 0 ? 'done' : 'pending';
      case 'verbas': return verbas.length > 0 ? 'done' : 'pending';
      default: return 'pending';
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
      case 'fgts': return <ModuloFGTS caseId={caseId} />;
      case 'cs': return <ModuloCS caseId={caseId} />;
      case 'ir': return <ModuloIR caseId={caseId} />;
      case 'correcao': return <ModuloCorrecao caseId={caseId} />;
      case 'seguro_desemprego': return <ModuloSeguroDesemprego caseId={caseId} />;
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
          await supabase.from("pjecalc_faltas").insert({ case_id: caseId, data_inicial: new Date().toISOString().slice(0, 10), data_final: new Date().toISOString().slice(0, 10), justificada: false });
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
                <Input type="date" defaultValue={f.data_inicial} className="h-8 text-xs w-36" onBlur={e => supabase.from("pjecalc_faltas").update({ data_inicial: e.target.value }).eq("id", f.id)} />
                <span className="text-xs text-muted-foreground">a</span>
                <Input type="date" defaultValue={f.data_final} className="h-8 text-xs w-36" onBlur={e => supabase.from("pjecalc_faltas").update({ data_final: e.target.value }).eq("id", f.id)} />
                <div className="flex items-center gap-1"><Checkbox defaultChecked={f.justificada} onCheckedChange={v => supabase.from("pjecalc_faltas").update({ justificada: !!v }).eq("id", f.id)} /><Label className="text-xs">Justificada</Label></div>
                <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={async () => { await supabase.from("pjecalc_faltas").delete().eq("id", f.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_faltas", caseId] }); }}><Trash2 className="h-3 w-3" /></Button>
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
          await supabase.from("pjecalc_ferias").delete().eq("case_id", caseId);
          const adm = new Date(formParams.data_admissao), dem = new Date(formParams.data_demissao);
          const periodos: any[] = [];
          let aqInicio = new Date(adm);
          while (aqInicio < dem) {
            const aqFim = new Date(aqInicio); aqFim.setFullYear(aqFim.getFullYear() + 1); aqFim.setDate(aqFim.getDate() - 1);
            const concInicio = new Date(aqFim); concInicio.setDate(concInicio.getDate() + 1);
            const concFim = new Date(concInicio); concFim.setFullYear(concFim.getFullYear() + 1); concFim.setDate(concFim.getDate() - 1);
            const situacao = concFim <= dem ? 'gozadas' : 'indenizadas';
            periodos.push({ case_id: caseId, relativas: `${aqInicio.getFullYear()}/${aqFim.getFullYear()}`, periodo_aquisitivo_inicio: aqInicio.toISOString().slice(0, 10), periodo_aquisitivo_fim: aqFim > dem ? dem.toISOString().slice(0, 10) : aqFim.toISOString().slice(0, 10), periodo_concessivo_inicio: concInicio.toISOString().slice(0, 10), periodo_concessivo_fim: concFim.toISOString().slice(0, 10), prazo_dias: formParams.regime_trabalho === 'tempo_integral' ? 30 : 18, situacao, dobra: situacao === 'indenizadas' ? false : (concFim > dem) });
            aqInicio = new Date(aqFim); aqInicio.setDate(aqInicio.getDate() + 1);
          }
          if (periodos.length > 0) await supabase.from("pjecalc_ferias").insert(periodos);
          queryClient.invalidateQueries({ queryKey: ["pjecalc_ferias", caseId] });
          toast.success(`${periodos.length} período(s) gerado(s)`);
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
                    <Select defaultValue={f.situacao} onValueChange={async v => { await supabase.from("pjecalc_ferias").update({ situacao: v }).eq("id", f.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_ferias", caseId] }); }}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="gozadas">Gozadas</SelectItem><SelectItem value="indenizadas">Indenizadas</SelectItem><SelectItem value="perdidas">Perdidas</SelectItem><SelectItem value="gozadas_parcialmente">Goz. Parcial</SelectItem></SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-center"><Checkbox defaultChecked={f.dobra} onCheckedChange={v => supabase.from("pjecalc_ferias").update({ dobra: !!v }).eq("id", f.id)} /></td>
                  <td className="p-2 text-center"><Checkbox defaultChecked={f.abono} onCheckedChange={v => supabase.from("pjecalc_ferias").update({ abono: !!v }).eq("id", f.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── HISTÓRICO SALARIAL ──
  const renderHistorico = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Histórico Salarial</h2>
        <Button size="sm" onClick={async () => {
          if (!formParams.data_admissao) { toast.error("Preencha a data de admissão."); return; }
          await supabase.from("pjecalc_historico_salarial").insert({ case_id: caseId, nome: `Salário Base ${historicos.length + 1}`, periodo_inicio: formParams.data_admissao, periodo_fim: formParams.data_demissao || new Date().toISOString().slice(0, 10), tipo_valor: 'informado', incidencia_fgts: true, incidencia_cs: true });
          queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] });
        }}><Plus className="h-4 w-4 mr-1" /> Nova Base</Button>
      </div>
      {historicos.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma base cadastrada.</CardContent></Card>
      ) : historicos.map((h: any) => (
        <Card key={h.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{h.nome}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-[10px]">{h.tipo_valor}</Badge>
                {h.incidencia_fgts && <Badge variant="outline" className="text-[10px]">FGTS</Badge>}
                {h.incidencia_cs && <Badge variant="outline" className="text-[10px]">CS</Badge>}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await supabase.from("pjecalc_historico_salarial").delete().eq("id", h.id); queryClient.invalidateQueries({ queryKey: ["pjecalc_historico", caseId] }); }}><Trash2 className="h-3 w-3" /></Button>
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
            const verbasExpresso = [
              { nome: 'Horas Extras 50%', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', tipo: 'principal', multiplicador: 1.5, divisor_informado: formParams.carga_horaria_padrao },
              { nome: 'RSR s/ Horas Extras', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', tipo: 'reflexa', multiplicador: 1 },
              { nome: '13º Salário', caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', tipo: 'reflexa', multiplicador: 1 },
              { nome: 'Férias + 1/3', caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', tipo: 'reflexa', multiplicador: 1.3333 },
            ];
            for (const ve of verbasExpresso) {
              await supabase.from("pjecalc_verbas").insert({ case_id: caseId, nome: ve.nome, tipo: ve.tipo, caracteristica: ve.caracteristica, ocorrencia_pagamento: ve.ocorrencia_pagamento, multiplicador: ve.multiplicador, divisor_informado: ve.divisor_informado || 30, periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: verbas.length });
            }
            queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
            toast.success("Verbas expressas adicionadas!");
          }}><Briefcase className="h-4 w-4 mr-1" /> Expresso</Button>
          <Button size="sm" onClick={async () => {
            const periodo = formParams.data_admissao && formParams.data_demissao ? { inicio: formParams.data_admissao, fim: formParams.data_demissao } : { inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10) };
            await supabase.from("pjecalc_verbas").insert({ case_id: caseId, nome: `Verba ${verbas.length + 1}`, tipo: 'principal', periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, ordem: verbas.length });
            queryClient.invalidateQueries({ queryKey: ["pjecalc_verbas", caseId] });
          }}><Plus className="h-4 w-4 mr-1" /> Manual</Button>
        </div>
      </div>
      {verbas.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Use "Expresso" para incluir verbas comuns ou "Manual" para criar uma verba personalizada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {verbas.map((v: any) => (
            <Card key={v.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={v.tipo === 'principal' ? 'default' : 'secondary'} className="text-[10px]">{v.tipo === 'principal' ? 'P' : 'R'}</Badge>
                    <div>
                      <div className="text-sm font-medium">{v.nome}</div>
                      <div className="text-[10px] text-muted-foreground flex gap-2"><span>{v.caracteristica}</span><span>•</span><span>{v.ocorrencia_pagamento}</span><span>•</span><span>×{v.multiplicador} ÷{v.divisor_informado || 30}</span></div>
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

      <div className="flex gap-4" style={{ minHeight: '500px' }}>
        {/* Module sidebar */}
        <div className="w-52 flex-shrink-0">
          <ScrollArea className="h-[650px]">
            <div className="space-y-1 pr-3">
              {MODULOS.map((mod) => {
                const status = moduleStatus(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(mod.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs",
                      status === 'active' && "bg-primary text-primary-foreground shadow-sm",
                      status === 'done' && "bg-[hsl(var(--success))]/10 text-foreground hover:bg-[hsl(var(--success))]/20",
                      status === 'pending' && "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {status === 'done' ? <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <mod.icon className="h-3.5 w-3.5" />}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{mod.label}</div>
                      <div className={cn("text-[10px] truncate", status === 'active' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{mod.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
        {/* Module content */}
        <div className="flex-1 min-w-0">
          <ScrollArea className="h-[650px]">
            <div className="pr-4 pb-8">
              {renderModule()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, Info, TrendingUp } from "lucide-react";

// =====================================================
// 11 ÍNDICES OFICIAIS DO PJe-CALC CSJT
// =====================================================
const INDICES_CORRECAO = [
  { value: 'IPCA-E', label: 'IPCA-E', desc: 'Índice Nacional de Preços ao Consumidor Amplo Especial (IBGE)', fundamento: 'ADC 58/59 STF — pré-citação' },
  { value: 'SELIC', label: 'SELIC', desc: 'Sistema Especial de Liquidação e Custódia (BCB)', fundamento: 'ADC 58/59 STF — pós-citação (engloba juros)' },
  { value: 'TR', label: 'TR', desc: 'Taxa Referencial (BCB)', fundamento: 'Lei 8.177/91, Art. 39 — débitos trabalhistas (antes ADC 58)' },
  { value: 'INPC', label: 'INPC', desc: 'Índice Nacional de Preços ao Consumidor (IBGE)', fundamento: 'Art. 41-A, Lei 8.213/91 — benefícios previdenciários' },
  { value: 'IGP-M', label: 'IGP-M', desc: 'Índice Geral de Preços do Mercado (FGV)', fundamento: 'Contratos e obrigações indexadas ao IGP-M' },
  { value: 'IGP-DI', label: 'IGP-DI', desc: 'Índice Geral de Preços — Disponibilidade Interna (FGV)', fundamento: 'Alternativa ao IGP-M para contratos civis' },
  { value: 'IPCA', label: 'IPCA', desc: 'Índice Nacional de Preços ao Consumidor Amplo (IBGE)', fundamento: 'Meta de inflação do CMN' },
  { value: 'IPC-FIPE', label: 'IPC-FIPE', desc: 'Índice de Preços ao Consumidor (FIPE/USP)', fundamento: 'Contratos na cidade de São Paulo' },
  { value: 'TJLP', label: 'TJLP', desc: 'Taxa de Juros de Longo Prazo (BCB/BNDES)', fundamento: 'Financiamentos BNDES e contratos correlatos' },
  { value: 'TLP', label: 'TLP', desc: 'Taxa de Longo Prazo (BCB)', fundamento: 'Substituta da TJLP desde 01/2018' },
  { value: 'FACDT', label: 'FACDT', desc: 'Fator de Atualização — Créditos Diferidos do Tesouro', fundamento: 'Precatórios e RPVs da União (EC 94/2016)' },
];

interface Props { caseId: string; }

export function ModuloCorrecao({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showIndexInfo, setShowIndexInfo] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_correcao_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_correcao_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    indice: 'IPCA-E', indice_pos_citacao: 'SELIC', transicao_adc58: true,
    data_citacao: '', epoca: 'mensal', data_fixa: '',
    juros_tipo: 'selic', juros_percentual: 1, juros_inicio: 'ajuizamento',
    juros_pro_rata: true,
    multa_523: false, multa_523_percentual: 10,
    multa_467: false, multa_467_percentual: 50,
    data_liquidacao: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (data) setForm({
      indice: data.indice || 'IPCA-E',
      indice_pos_citacao: data.indice_pos_citacao || 'SELIC',
      transicao_adc58: data.transicao_adc58 ?? true,
      data_citacao: data.data_citacao || '',
      epoca: data.epoca || 'mensal',
      data_fixa: data.data_fixa || '',
      juros_tipo: data.juros_tipo || 'selic',
      juros_percentual: data.juros_percentual ?? 1,
      juros_inicio: data.juros_inicio || 'ajuizamento',
      juros_pro_rata: data.juros_pro_rata ?? true,
      multa_523: data.multa_523 ?? false,
      multa_523_percentual: data.multa_523_percentual ?? 10,
      multa_467: data.multa_467 ?? false,
      multa_467_percentual: data.multa_467_percentual ?? 50,
      data_liquidacao: data.data_liquidacao || new Date().toISOString().slice(0, 10),
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, ...form,
        juros_percentual: Number(form.juros_percentual),
        multa_523_percentual: Number(form.multa_523_percentual),
        multa_467_percentual: Number(form.multa_467_percentual),
        data_fixa: form.data_fixa || null,
        data_citacao: form.data_citacao || null,
      };
      if (data?.id) await supabase.from("pjecalc_correcao_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_correcao_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_correcao_config", caseId] });
      toast.success("Correção/Juros configurados!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const selectedIndex = INDICES_CORRECAO.find(i => i.value === form.indice);
  const selectedIndexPos = INDICES_CORRECAO.find(i => i.value === form.indice_pos_citacao);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Correção, Juros e Multa</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowIndexInfo(!showIndexInfo)}>
            <Info className="h-4 w-4 mr-1" /> {showIndexInfo ? 'Ocultar' : 'Índices'}
          </Button>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
          </Button>
        </div>
      </div>

      {/* Reference table of all 11 indices */}
      {showIndexInfo && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> 11 Índices Oficiais — PJe-Calc CSJT</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">Sigla</th>
                    <th className="p-2 text-left font-medium">Descrição</th>
                    <th className="p-2 text-left font-medium">Fundamento</th>
                  </tr>
                </thead>
                <tbody>
                  {INDICES_CORRECAO.map(idx => (
                    <tr key={idx.value} className={`border-b border-border/30 hover:bg-muted/20 ${form.indice === idx.value || form.indice_pos_citacao === idx.value ? 'bg-primary/5' : ''}`}>
                      <td className="p-2 font-mono font-medium">
                        <Badge variant={form.indice === idx.value || form.indice_pos_citacao === idx.value ? 'default' : 'outline'} className="text-[9px]">{idx.value}</Badge>
                      </td>
                      <td className="p-2">{idx.desc}</td>
                      <td className="p-2 text-muted-foreground">{idx.fundamento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Correção Monetária</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox checked={form.transicao_adc58} onCheckedChange={v => setForm(p => ({ ...p, transicao_adc58: !!v }))} />
            <Label className="text-xs font-medium">Aplicar Transição ADC 58/59 STF (índice duplo)</Label>
          </div>
          {form.transicao_adc58 && (
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Pré-citação: <strong>{form.indice}</strong> + Juros 1% a.m. → Pós-citação: <strong>{form.indice_pos_citacao}</strong> (já engloba juros). Informe a data de citação para a transição.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{form.transicao_adc58 ? 'Índice Pré-Citação' : 'Índice de Correção'}</Label>
              <Select value={form.indice} onValueChange={v => setForm(p => ({ ...p, indice: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDICES_CORRECAO.map(idx => (
                    <SelectItem key={idx.value} value={idx.value}>{idx.label} — {idx.desc.split('(')[0].trim()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIndex && <p className="text-[9px] text-muted-foreground mt-1">{selectedIndex.fundamento}</p>}
            </div>
            {form.transicao_adc58 && (
              <div>
                <Label className="text-xs">Índice Pós-Citação</Label>
                <Select value={form.indice_pos_citacao} onValueChange={v => setForm(p => ({ ...p, indice_pos_citacao: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDICES_CORRECAO.map(idx => (
                      <SelectItem key={idx.value} value={idx.value}>{idx.label} — {idx.desc.split('(')[0].trim()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedIndexPos && <p className="text-[9px] text-muted-foreground mt-1">{selectedIndexPos.fundamento}</p>}
              </div>
            )}
          </div>
          {form.transicao_adc58 && (
            <div>
              <Label className="text-xs">Data de Citação (para transição)</Label>
              <Input type="date" value={form.data_citacao} onChange={e => setForm(p => ({ ...p, data_citacao: e.target.value }))} className="mt-1 h-8 text-xs w-48" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Época</Label>
              <Select value={form.epoca} onValueChange={v => setForm(p => ({ ...p, epoca: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal (competência)</SelectItem>
                  <SelectItem value="fixo">Data Fixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.epoca === 'fixo' && (
              <div><Label className="text-xs">Data Fixa</Label><Input type="date" value={form.data_fixa} onChange={e => setForm(p => ({ ...p, data_fixa: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
            )}
          </div>
          <div><Label className="text-xs">Data da Liquidação</Label><Input type="date" value={form.data_liquidacao} onChange={e => setForm(p => ({ ...p, data_liquidacao: e.target.value }))} className="mt-1 h-8 text-xs w-48" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Juros de Mora</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.juros_tipo} onValueChange={v => setForm(p => ({ ...p, juros_tipo: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="selic">SELIC (engloba correção)</SelectItem>
                  <SelectItem value="simples_mensal">Simples 1% a.m.</SelectItem>
                  <SelectItem value="composto">Composto</SelectItem>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Percentual (%)</Label>
              <Input type="number" step="0.01" value={form.juros_percentual} onChange={e => setForm(p => ({ ...p, juros_percentual: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Início</Label>
              <Select value={form.juros_inicio} onValueChange={v => setForm(p => ({ ...p, juros_inicio: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ajuizamento">Ajuizamento</SelectItem>
                  <SelectItem value="citacao">Citação</SelectItem>
                  <SelectItem value="vencimento">Vencimento de cada parcela</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={form.juros_pro_rata} onCheckedChange={v => setForm(p => ({ ...p, juros_pro_rata: !!v }))} />
            <Label className="text-xs">Pro rata die (Art. 39, §1º, Lei 8.177/91)</Label>
          </div>
          <p className="text-[10px] text-muted-foreground">ADC 58/59: IPCA-E pré-judicial + SELIC pós-citação. Art. 39, §1º, Lei 8.177/91: juros 1% a.m. pro rata die entre ajuizamento e citação.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Multas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.multa_523} onCheckedChange={v => setForm(p => ({ ...p, multa_523: !!v }))} /><Label className="text-xs">Multa Art. 523, §1º CPC (fase de cumprimento)</Label></div>
          {form.multa_523 && (
            <div className="pl-6"><Label className="text-xs">Percentual (%)</Label><Input type="number" value={form.multa_523_percentual} onChange={e => setForm(p => ({ ...p, multa_523_percentual: parseFloat(e.target.value) || 10 }))} className="mt-1 h-8 text-xs w-24" /></div>
          )}
          <div className="flex items-center gap-2"><Checkbox checked={form.multa_467} onCheckedChange={v => setForm(p => ({ ...p, multa_467: !!v }))} /><Label className="text-xs">Multa Art. 467 CLT (parcelas incontroversas)</Label></div>
          {form.multa_467 && (
            <div className="pl-6"><Label className="text-xs">Percentual (%)</Label><Input type="number" value={form.multa_467_percentual} onChange={e => setForm(p => ({ ...p, multa_467_percentual: parseFloat(e.target.value) || 50 }))} className="mt-1 h-8 text-xs w-24" /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

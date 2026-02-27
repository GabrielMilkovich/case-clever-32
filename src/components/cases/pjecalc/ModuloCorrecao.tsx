import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface Props { caseId: string; }

export function ModuloCorrecao({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_correcao_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_correcao_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    indice: 'IPCA-E', epoca: 'mensal', data_fixa: '',
    juros_tipo: 'selic', juros_percentual: 1, juros_inicio: 'ajuizamento',
    multa_523: false, multa_523_percentual: 10, data_liquidacao: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (data) setForm({
      indice: data.indice || 'IPCA-E', epoca: data.epoca || 'mensal', data_fixa: data.data_fixa || '',
      juros_tipo: data.juros_tipo || 'selic', juros_percentual: data.juros_percentual ?? 1,
      juros_inicio: data.juros_inicio || 'ajuizamento', multa_523: data.multa_523 ?? false,
      multa_523_percentual: data.multa_523_percentual ?? 10,
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
        data_fixa: form.data_fixa || null,
      };
      if (data?.id) await supabase.from("pjecalc_correcao_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_correcao_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_correcao_config", caseId] });
      toast.success("Correção/Juros configurados!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Correção, Juros e Multa</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Correção Monetária</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Índice de Correção</Label>
            <Select value={form.indice} onValueChange={v => setForm(p => ({ ...p, indice: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IPCA-E">IPCA-E (ADC 58/59 STF)</SelectItem>
                <SelectItem value="SELIC">SELIC (pós citação)</SelectItem>
                <SelectItem value="TR">TR</SelectItem>
                <SelectItem value="INPC">INPC</SelectItem>
                <SelectItem value="IGP-M">IGP-M</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div><Label className="text-xs">Data da Liquidação</Label><Input type="date" value={form.data_liquidacao} onChange={e => setForm(p => ({ ...p, data_liquidacao: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
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
          <p className="text-[10px] text-muted-foreground">ADC 58/59: IPCA-E pré-judicial + SELIC pós-citação. Art. 39, §1º, Lei 8.177/91: juros 1% a.m. pro rata die entre ajuizamento e citação.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Multa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.multa_523} onCheckedChange={v => setForm(p => ({ ...p, multa_523: !!v }))} /><Label className="text-xs">Multa Art. 523, §1º CPC</Label></div>
          {form.multa_523 && (
            <div><Label className="text-xs">Percentual (%)</Label><Input type="number" value={form.multa_523_percentual} onChange={e => setForm(p => ({ ...p, multa_523_percentual: parseFloat(e.target.value) || 10 }))} className="mt-1 h-8 text-xs w-24" /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

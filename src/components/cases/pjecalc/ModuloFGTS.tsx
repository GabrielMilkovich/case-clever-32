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
import { FGTSSaldosSaques } from "./FGTSSaldosSaques";

interface Props { caseId: string; }

export function ModuloFGTS({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_fgts_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_fgts_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    apurar: true, destino: 'pagar_reclamante', compor_principal: true,
    multa_apurar: true, multa_tipo: 'calculada', multa_percentual: 40,
    multa_base: 'devido', multa_valor_informado: '',
    deduzir_saldo: false, lc110_10: false, lc110_05: false,
  });

  useEffect(() => {
    if (data) setForm({
      apurar: data.apurar ?? true, destino: data.destino || 'pagar_reclamante',
      compor_principal: data.compor_principal ?? true, multa_apurar: data.multa_apurar ?? true,
      multa_tipo: data.multa_tipo || 'calculada', multa_percentual: data.multa_percentual ?? 40,
      multa_base: data.multa_base || 'devido', multa_valor_informado: data.multa_valor_informado?.toString() || '',
      deduzir_saldo: data.deduzir_saldo ?? false, lc110_10: data.lc110_10 ?? false, lc110_05: data.lc110_05 ?? false,
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, ...form,
        multa_percentual: Number(form.multa_percentual),
        multa_valor_informado: form.multa_valor_informado ? parseFloat(form.multa_valor_informado) : null,
      };
      if (data?.id) await supabase.from("pjecalc_fgts_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_fgts_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_fgts_config", caseId] });
      toast.success("FGTS configurado!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">FGTS</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Depósitos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} /><Label className="text-xs">Apurar FGTS (8%)</Label></div>
          <div>
            <Label className="text-xs">Destino</Label>
            <Select value={form.destino} onValueChange={v => setForm(p => ({ ...p, destino: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pagar_reclamante">Pagar ao Reclamante</SelectItem>
                <SelectItem value="recolher_conta">Recolher na Conta Vinculada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Checkbox checked={form.compor_principal} onCheckedChange={v => setForm(p => ({ ...p, compor_principal: !!v }))} /><Label className="text-xs">Compor Principal</Label></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Multa Rescisória</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.multa_apurar} onCheckedChange={v => setForm(p => ({ ...p, multa_apurar: !!v }))} /><Label className="text-xs">Apurar Multa</Label></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.multa_tipo} onValueChange={v => setForm(p => ({ ...p, multa_tipo: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="calculada">Calculada</SelectItem>
                  <SelectItem value="informada">Informada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Percentual (%)</Label>
              <Select value={form.multa_percentual.toString()} onValueChange={v => setForm(p => ({ ...p, multa_percentual: Number(v) }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="40">40%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Base</Label>
              <Select value={form.multa_base} onValueChange={v => setForm(p => ({ ...p, multa_base: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="devido">Devido</SelectItem>
                  <SelectItem value="diferenca">Diferença</SelectItem>
                  <SelectItem value="saldo_saque">Saldo p/ Saque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.multa_tipo === 'informada' && (
            <div><Label className="text-xs">Valor Informado (R$)</Label><Input type="number" step="0.01" value={form.multa_valor_informado} onChange={e => setForm(p => ({ ...p, multa_valor_informado: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Opções Adicionais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_saldo} onCheckedChange={v => setForm(p => ({ ...p, deduzir_saldo: !!v }))} /><Label className="text-xs">Deduzir Saldo/Saques</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.lc110_10} onCheckedChange={v => setForm(p => ({ ...p, lc110_10: !!v }))} /><Label className="text-xs">LC 110/2001 — 10% (empregador)</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.lc110_05} onCheckedChange={v => setForm(p => ({ ...p, lc110_05: !!v }))} /><Label className="text-xs">LC 110/2001 — 0,5% (empregador)</Label></div>
        </CardContent>
      </Card>
      <FGTSSaldosSaques caseId={caseId} />
    </div>
  );
}

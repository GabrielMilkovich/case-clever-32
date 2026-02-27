import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface Props { caseId: string; }

export function ModuloCustas({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_custas", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_custas" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    apurar: true, percentual: 2, valor_minimo: 10.64, valor_maximo: '',
    isento: false, assistencia_judiciaria: false,
  });

  useEffect(() => {
    if (data) setForm({
      apurar: data.apurar ?? true, percentual: data.percentual ?? 2,
      valor_minimo: data.valor_minimo ?? 10.64, valor_maximo: data.valor_maximo?.toString() || '',
      isento: data.isento ?? false, assistencia_judiciaria: data.assistencia_judiciaria ?? false,
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, ...form,
        percentual: Number(form.percentual), valor_minimo: Number(form.valor_minimo),
        valor_maximo: form.valor_maximo ? parseFloat(form.valor_maximo) : null,
      };
      if (data?.id) await supabase.from("pjecalc_custas" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_custas" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_custas", caseId] });
      toast.success("Custas salvas!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custas e Assistência Judiciária</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Custas Processuais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} /><Label className="text-xs">Apurar Custas (Art. 789 CLT)</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.isento} onCheckedChange={v => setForm(p => ({ ...p, isento: !!v }))} /><Label className="text-xs">Isento de Custas (beneficiário da justiça gratuita)</Label></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Percentual (%)</Label><Input type="number" step="0.1" value={form.percentual} onChange={e => setForm(p => ({ ...p, percentual: parseFloat(e.target.value) || 2 }))} className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Valor Mínimo (R$)</Label><Input type="number" step="0.01" value={form.valor_minimo} onChange={e => setForm(p => ({ ...p, valor_minimo: parseFloat(e.target.value) || 10.64 }))} className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Valor Máximo (R$)</Label><Input type="number" step="0.01" value={form.valor_maximo} onChange={e => setForm(p => ({ ...p, valor_maximo: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Sem limite" /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Assistência Judiciária</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2"><Checkbox checked={form.assistencia_judiciaria} onCheckedChange={v => setForm(p => ({ ...p, assistencia_judiciaria: !!v }))} /><Label className="text-xs">Deferir Assistência Judiciária Gratuita</Label></div>
          <p className="text-[10px] text-muted-foreground mt-2">Art. 790, §3º CLT — presunção de insuficiência econômica para salário ≤ 40% do teto RGPS.</p>
        </CardContent>
      </Card>
    </div>
  );
}

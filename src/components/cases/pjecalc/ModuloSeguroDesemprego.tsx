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

export function ModuloSeguroDesemprego({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_seguro_desemprego", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_seguro_desemprego" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({ apurar: false, parcelas: 5, valor_parcela: '', recebeu: false, observacoes: '' });

  useEffect(() => {
    if (data) setForm({
      apurar: data.apurar ?? false, parcelas: data.parcelas ?? 5,
      valor_parcela: data.valor_parcela?.toString() || '', recebeu: data.recebeu ?? false,
      observacoes: data.observacoes || '',
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { case_id: caseId, ...form, valor_parcela: form.valor_parcela ? parseFloat(form.valor_parcela) : null };
      if (data?.id) await supabase.from("pjecalc_seguro_desemprego" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_seguro_desemprego" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_seguro_desemprego", caseId] });
      toast.success("Seguro-desemprego salvo!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Seguro-Desemprego</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} /><Label className="text-xs">Apurar Indenização por Seguro-Desemprego não recebido</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.recebeu} onCheckedChange={v => setForm(p => ({ ...p, recebeu: !!v }))} /><Label className="text-xs">Reclamante recebeu Seguro-Desemprego</Label></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Nº de Parcelas</Label><Input type="number" min={3} max={5} value={form.parcelas} onChange={e => setForm(p => ({ ...p, parcelas: parseInt(e.target.value) || 5 }))} className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Valor por Parcela (R$)</Label><Input type="number" step="0.01" value={form.valor_parcela} onChange={e => setForm(p => ({ ...p, valor_parcela: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Calculado automaticamente" /></div>
          </div>
          <p className="text-[10px] text-muted-foreground">Se marcado "Apurar", o valor será calculado com base na tabela vigente do FAT e incluído na condenação como indenização substitutiva.</p>
        </CardContent>
      </Card>
    </div>
  );
}

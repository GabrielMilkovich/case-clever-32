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

export function ModuloHonorarios({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_honorarios", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_honorarios" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    apurar_sucumbenciais: true, percentual_sucumbenciais: 15, base_sucumbenciais: 'condenacao',
    apurar_contratuais: false, percentual_contratuais: 20, valor_fixo: '',
  });

  useEffect(() => {
    if (data) setForm({
      apurar_sucumbenciais: data.apurar_sucumbenciais ?? true, percentual_sucumbenciais: data.percentual_sucumbenciais ?? 15,
      base_sucumbenciais: data.base_sucumbenciais || 'condenacao', apurar_contratuais: data.apurar_contratuais ?? false,
      percentual_contratuais: data.percentual_contratuais ?? 20, valor_fixo: data.valor_fixo?.toString() || '',
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { case_id: caseId, ...form, valor_fixo: form.valor_fixo ? parseFloat(form.valor_fixo) : null };
      if (data?.id) await supabase.from("pjecalc_honorarios" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_honorarios" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_honorarios", caseId] });
      toast.success("Honorários salvos!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Honorários</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Honorários Sucumbenciais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar_sucumbenciais} onCheckedChange={v => setForm(p => ({ ...p, apurar_sucumbenciais: !!v }))} /><Label className="text-xs">Apurar Honorários Sucumbenciais (Art. 791-A CLT)</Label></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Percentual (%)</Label><Input type="number" step="0.1" min={5} max={15} value={form.percentual_sucumbenciais} onChange={e => setForm(p => ({ ...p, percentual_sucumbenciais: parseFloat(e.target.value) || 15 }))} className="mt-1 h-8 text-xs" /></div>
            <div>
              <Label className="text-xs">Base de Cálculo</Label>
              <Select value={form.base_sucumbenciais} onValueChange={v => setForm(p => ({ ...p, base_sucumbenciais: v }))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="condenacao">Valor da Condenação</SelectItem>
                  <SelectItem value="causa">Valor da Causa</SelectItem>
                  <SelectItem value="proveito">Proveito Econômico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Honorários Contratuais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar_contratuais} onCheckedChange={v => setForm(p => ({ ...p, apurar_contratuais: !!v }))} /><Label className="text-xs">Apurar Honorários Contratuais</Label></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Percentual (%)</Label><Input type="number" step="0.1" value={form.percentual_contratuais} onChange={e => setForm(p => ({ ...p, percentual_contratuais: parseFloat(e.target.value) || 20 }))} className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Valor Fixo (R$)</Label><Input type="number" step="0.01" value={form.valor_fixo} onChange={e => setForm(p => ({ ...p, valor_fixo: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Opcional" /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

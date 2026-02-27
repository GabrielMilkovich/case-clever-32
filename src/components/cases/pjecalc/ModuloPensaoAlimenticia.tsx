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

export function ModuloPensaoAlimenticia({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_pensao_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_pensao_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    apurar: false, percentual: '', valor_fixo: '', base: 'liquido', beneficiario: '', observacoes: '',
  });

  useEffect(() => {
    if (data) setForm({
      apurar: data.apurar ?? false, percentual: data.percentual?.toString() || '',
      valor_fixo: data.valor_fixo?.toString() || '', base: data.base || 'liquido',
      beneficiario: data.beneficiario || '', observacoes: data.observacoes || '',
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, apurar: form.apurar,
        percentual: form.percentual ? parseFloat(form.percentual) : 0,
        valor_fixo: form.valor_fixo ? parseFloat(form.valor_fixo) : null,
        base: form.base, beneficiario: form.beneficiario, observacoes: form.observacoes,
      };
      if (data?.id) await supabase.from("pjecalc_pensao_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_pensao_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_pensao_config", caseId] });
      toast.success("Pensão Alimentícia salva!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pensão Alimentícia</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configuração</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} />
            <Label className="text-xs">Apurar Pensão Alimentícia (desconto judicial)</Label>
          </div>
          {form.apurar && (
            <>
              <div>
                <Label className="text-xs">Beneficiário</Label>
                <Input value={form.beneficiario} onChange={e => setForm(p => ({ ...p, beneficiario: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Nome do alimentando" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Base de Cálculo</Label>
                  <Select value={form.base} onValueChange={v => setForm(p => ({ ...p, base: v }))}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liquido">Líquido</SelectItem>
                      <SelectItem value="bruto">Bruto</SelectItem>
                      <SelectItem value="bruto_menos_inss">Bruto - INSS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Percentual (%)</Label>
                  <Input type="number" step="0.01" value={form.percentual} onChange={e => setForm(p => ({ ...p, percentual: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Ex: 30" />
                </div>
                <div>
                  <Label className="text-xs">Valor Fixo (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_fixo} onChange={e => setForm(p => ({ ...p, valor_fixo: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Opcional" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Se informados percentual e valor fixo, prevalece o percentual. O desconto será aplicado sobre a base selecionada e retido na liquidação.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
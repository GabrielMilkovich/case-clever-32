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

export function ModuloPrevidenciaPrivada({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_prev_priv", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_previdencia_privada_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    apurar: false,
    percentual: '0',
    base_calculo: 'diferenca',
    deduzir_ir: true,
    observacao: '',
  });

  useEffect(() => {
    if (data) setForm({
      apurar: data.apurar ?? false,
      percentual: data.percentual?.toString() || '0',
      base_calculo: data.base_calculo || 'diferenca',
      deduzir_ir: data.deduzir_ir ?? true,
      observacao: data.observacao || '',
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId,
        apurar: form.apurar,
        percentual: parseFloat(form.percentual) || 0,
        base_calculo: form.base_calculo,
        deduzir_ir: form.deduzir_ir,
        observacao: form.observacao || null,
      };
      if (data?.id) await supabase.from("pjecalc_previdencia_privada_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_previdencia_privada_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_prev_priv", caseId] });
      toast.success("Previdência Privada configurada!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Previdência Privada</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configuração</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} />
            <Label className="text-xs">Apurar Previdência Privada</Label>
          </div>
          {form.apurar && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Percentual (%)</Label>
                  <Input type="number" step="0.01" value={form.percentual} onChange={e => setForm(p => ({ ...p, percentual: e.target.value }))} className="mt-1 h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Base de Cálculo</Label>
                  <Select value={form.base_calculo} onValueChange={v => setForm(p => ({ ...p, base_calculo: v }))}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diferenca">Diferença (Devido - Pago)</SelectItem>
                      <SelectItem value="devido">Valor Devido</SelectItem>
                      <SelectItem value="corrigido">Valor Corrigido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.deduzir_ir} onCheckedChange={v => setForm(p => ({ ...p, deduzir_ir: !!v }))} />
                <Label className="text-xs">Deduzir da Base de IR</Label>
              </div>
              <div>
                <Label className="text-xs">Observação</Label>
                <Input value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Plano, CNPB, etc." />
              </div>
            </>
          )}
          <p className="text-[10px] text-muted-foreground">
            A previdência privada complementar será apurada sobre as verbas com incidência marcada e poderá ser deduzida da base do IR conforme Art. 11 da Lei 9.532/97.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

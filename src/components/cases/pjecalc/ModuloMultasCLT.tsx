import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface Props { caseId: string; }

export function ModuloMultasCLT({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_multas_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_multas_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    apurar_467: false, valor_467: '',
    apurar_477: false, valor_477_tipo: 'salario', valor_477_informado: '',
    observacoes: '',
  });

  useEffect(() => {
    if (data) setForm({
      apurar_467: data.apurar_467 ?? false, valor_467: data.valor_467?.toString() || '',
      apurar_477: data.apurar_477 ?? false, valor_477_tipo: data.valor_477_tipo || 'salario',
      valor_477_informado: data.valor_477_informado?.toString() || '', observacoes: data.observacoes || '',
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, apurar_467: form.apurar_467,
        valor_467: form.valor_467 ? parseFloat(form.valor_467) : 0,
        apurar_477: form.apurar_477, valor_477_tipo: form.valor_477_tipo,
        valor_477_informado: form.valor_477_informado ? parseFloat(form.valor_477_informado) : null,
        observacoes: form.observacoes,
      };
      if (data?.id) await supabase.from("pjecalc_multas_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_multas_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_multas_config", caseId] });
      toast.success("Multas CLT salvas!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Multas CLT</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Art. 467 CLT — Verbas Incontroversas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={form.apurar_467} onCheckedChange={v => setForm(p => ({ ...p, apurar_467: !!v }))} />
            <Label className="text-xs">Apurar multa de 50% sobre verbas incontroversas não pagas na 1ª audiência</Label>
          </div>
          {form.apurar_467 && (
            <div>
              <Label className="text-xs">Valor das verbas incontroversas (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_467} onChange={e => setForm(p => ({ ...p, valor_467: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Será calculado 50% sobre este valor" />
              <p className="text-[10px] text-muted-foreground mt-1">Multa = 50% × Verbas Incontroversas. Aplica-se quando a reclamada não paga na 1ª audiência.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Art. 477, §8º CLT — Atraso na Rescisão</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={form.apurar_477} onCheckedChange={v => setForm(p => ({ ...p, apurar_477: !!v }))} />
            <Label className="text-xs">Apurar multa por atraso no pagamento das verbas rescisórias</Label>
          </div>
          {form.apurar_477 && (
            <>
              <div>
                <Label className="text-xs">Base da Multa</Label>
                <Select value={form.valor_477_tipo} onValueChange={v => setForm(p => ({ ...p, valor_477_tipo: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salario">Último Salário (Art. 477, §8º)</SelectItem>
                    <SelectItem value="informado">Valor Informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.valor_477_tipo === 'informado' && (
                <div>
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_477_informado} onChange={e => setForm(p => ({ ...p, valor_477_informado: e.target.value }))} className="mt-1 h-8 text-xs" />
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">Multa equivalente ao último salário quando as verbas rescisórias não são pagas no prazo legal (10 dias corridos).</p>
            </>
          )}
        </CardContent>
      </Card>

      {(form.apurar_467 || form.apurar_477) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="text-xs min-h-[60px]" placeholder="Justificativa ou fundamentação adicional..." />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
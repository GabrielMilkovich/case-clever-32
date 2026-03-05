import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

export function ModuloSeguroDesemprego({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_seguro_config", caseId],
    queryFn: () => svc.getSeguroConfig(caseId),
  });

  const [form, setForm] = useState({ apurar: false, parcelas: 5, valor_parcela: '', recebeu: false, observacoes: '' });

  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setForm({
        apurar: (d.apurar as boolean) ?? false, parcelas: (d.parcelas as number) ?? 5,
        valor_parcela: d.valor_parcela?.toString() || '', recebeu: (d.recebeu as boolean) ?? false,
        observacoes: (d.observacoes as string) || '',
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await svc.upsertSeguroConfig(caseId, { ...form, valor_parcela: form.valor_parcela ? parseFloat(form.valor_parcela) : null });
      qc.invalidateQueries({ queryKey: ["pjecalc_seguro_config", caseId] });
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
          <p className="text-[10px] text-muted-foreground">Se marcado "Apurar", o valor será calculado com base na tabela vigente do FAT/CODEFAT 2025 e incluído na condenação como indenização substitutiva. Se o valor por parcela não for informado, será calculado automaticamente com base na última remuneração.</p>
        </CardContent>
      </Card>
    </div>
  );
}

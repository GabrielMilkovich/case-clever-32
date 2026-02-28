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
import { Save, Loader2, Plus, Trash2 } from "lucide-react";

interface CustaItem {
  tipo: 'judiciais' | 'periciais' | 'emolumentos' | 'postais' | 'outras';
  descricao: string;
  apurar: boolean;
  percentual: number;
  valor_fixo: string;
  valor_minimo: number;
  valor_maximo: string;
  isento: boolean;
}

interface Props { caseId: string; }

const TIPOS_CUSTAS = [
  { value: 'periciais', label: 'Custas Periciais' },
  { value: 'emolumentos', label: 'Emolumentos' },
  { value: 'postais', label: 'Custas Postais' },
  { value: 'outras', label: 'Outras Custas' },
];

export function ModuloCustas({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_custas_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_custas_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    apurar: true, percentual: 2, valor_minimo: 10.64, valor_maximo: '',
    isento: false, assistencia_judiciaria: false,
  });

  const [itens, setItens] = useState<CustaItem[]>([]);

  useEffect(() => {
    if (data) {
      setForm({
        apurar: data.apurar ?? true, percentual: data.percentual ?? 2,
        valor_minimo: data.valor_minimo ?? 10.64, valor_maximo: data.valor_maximo?.toString() || '',
        isento: data.isento ?? false, assistencia_judiciaria: data.assistencia_judiciaria ?? false,
      });
      if (data.itens && Array.isArray(data.itens)) {
        setItens(data.itens.map((i: any) => ({
          ...i, valor_fixo: i.valor_fixo?.toString() || '', valor_maximo: i.valor_maximo?.toString() || '',
        })));
      }
    }
  }, [data]);

  const addItem = () => {
    setItens(prev => [...prev, {
      tipo: 'periciais', descricao: 'Custas Periciais', apurar: true,
      percentual: 0, valor_fixo: '', valor_minimo: 0, valor_maximo: '', isento: false,
    }]);
  };

  const removeItem = (idx: number) => setItens(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, changes: Partial<CustaItem>) => {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, ...changes } : item));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, ...form,
        percentual: Number(form.percentual), valor_minimo: Number(form.valor_minimo),
        valor_maximo: form.valor_maximo ? parseFloat(form.valor_maximo) : null,
        itens: itens.map(i => ({
          ...i, valor_fixo: i.valor_fixo ? parseFloat(i.valor_fixo) : null,
          valor_maximo: i.valor_maximo ? parseFloat(i.valor_maximo) : null,
        })),
      };
      if (data?.id) {
        const { error } = await supabase.from("pjecalc_custas_config" as any).update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pjecalc_custas_config" as any).insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["pjecalc_custas_config", caseId] });
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

      {/* Custas Judiciais (Art. 789 CLT) */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Custas Judiciais (Art. 789 CLT)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} /><Label className="text-xs">Apurar Custas Judiciais (2% sobre valor da condenação)</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.isento} onCheckedChange={v => setForm(p => ({ ...p, isento: !!v }))} /><Label className="text-xs">Isento de Custas (beneficiário da justiça gratuita)</Label></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Percentual (%)</Label><Input type="number" step="0.1" value={form.percentual} onChange={e => setForm(p => ({ ...p, percentual: parseFloat(e.target.value) || 2 }))} className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Valor Mínimo (R$)</Label><Input type="number" step="0.01" value={form.valor_minimo} onChange={e => setForm(p => ({ ...p, valor_minimo: parseFloat(e.target.value) || 10.64 }))} className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Valor Máximo (R$)</Label><Input type="number" step="0.01" value={form.valor_maximo} onChange={e => setForm(p => ({ ...p, valor_maximo: e.target.value }))} className="mt-1 h-8 text-xs" placeholder="Sem limite" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Custas Adicionais (Periciais, Emolumentos, Postais, Outras) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Custas Adicionais</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Nenhuma custa adicional configurada. Clique em "Adicionar" para incluir custas periciais, emolumentos, etc.
            </p>
          )}
          {itens.map((item, idx) => (
            <div key={idx} className="border border-border/50 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox checked={item.apurar} onCheckedChange={v => updateItem(idx, { apurar: !!v })} />
                  <Select value={item.tipo} onValueChange={v => updateItem(idx, { tipo: v as any, descricao: TIPOS_CUSTAS.find(t => t.value === v)?.label || v })}>
                    <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_CUSTAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-7 w-7 p-0">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[10px]">Valor Fixo (R$)</Label><Input type="number" step="0.01" value={item.valor_fixo} onChange={e => updateItem(idx, { valor_fixo: e.target.value })} className="mt-0.5 h-7 text-xs" placeholder="Calculado" /></div>
                <div><Label className="text-[10px]">% Condenação</Label><Input type="number" step="0.1" value={item.percentual} onChange={e => updateItem(idx, { percentual: parseFloat(e.target.value) || 0 })} className="mt-0.5 h-7 text-xs" disabled={!!item.valor_fixo} /></div>
                <div><Label className="text-[10px]">Mínimo (R$)</Label><Input type="number" step="0.01" value={item.valor_minimo} onChange={e => updateItem(idx, { valor_minimo: parseFloat(e.target.value) || 0 })} className="mt-0.5 h-7 text-xs" /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={item.isento} onCheckedChange={v => updateItem(idx, { isento: !!v })} />
                <Label className="text-[10px]">Isento</Label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Assistência Judiciária */}
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

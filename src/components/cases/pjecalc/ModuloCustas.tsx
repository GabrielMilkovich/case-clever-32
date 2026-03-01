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
  tipo: string;
  descricao: string;
  apurar: boolean;
  valor_tipo: 'calculado' | 'informado' | 'nao_aplica';
  percentual: number;
  valor_fixo: string;
  valor_minimo: number;
  valor_maximo: string;
  isento: boolean;
  vencimento: string;
}

interface Props { caseId: string; }

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
    base_custas: 'bruto_reclamante' as 'bruto_reclamante' | 'bruto_mais_debitos',
    // Reclamante
    rec_conhecimento: 'nao_aplica' as string,
    rec_conhecimento_valor: '',
    rec_conhecimento_vencimento: '',
    // Reclamado
    rdo_conhecimento: 'calculado_2' as string,
    rdo_conhecimento_valor: '',
    rdo_conhecimento_vencimento: '',
    rdo_liquidacao: 'nao_aplica' as string,
    rdo_liquidacao_valor: '',
    rdo_liquidacao_vencimento: '',
    rdo_fixas: false,
    rdo_fixas_valor: '',
    rdo_fixas_vencimento: '',
    rdo_autos: false,
    rdo_autos_valor: '',
    rdo_armazenamento: false,
    rdo_armazenamento_valor: '',
    // Recolhidas
    valor_minimo: 10.64,
    isento: false,
    assistencia_judiciaria: false,
  });

  const [itens, setItens] = useState<CustaItem[]>([]);
  const [recolhidas, setRecolhidas] = useState<{ descricao: string; valor: string; data: string }[]>([]);

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        ...prev,
        base_custas: data.base_custas || 'bruto_reclamante',
        rec_conhecimento: data.rec_conhecimento || 'nao_aplica',
        rec_conhecimento_valor: data.rec_conhecimento_valor?.toString() || '',
        rec_conhecimento_vencimento: data.rec_conhecimento_vencimento || '',
        rdo_conhecimento: data.rdo_conhecimento || 'calculado_2',
        rdo_conhecimento_valor: data.rdo_conhecimento_valor?.toString() || '',
        rdo_conhecimento_vencimento: data.rdo_conhecimento_vencimento || '',
        rdo_liquidacao: data.rdo_liquidacao || 'nao_aplica',
        rdo_liquidacao_valor: data.rdo_liquidacao_valor?.toString() || '',
        rdo_liquidacao_vencimento: data.rdo_liquidacao_vencimento || '',
        rdo_fixas: data.rdo_fixas ?? false,
        rdo_fixas_valor: data.rdo_fixas_valor?.toString() || '',
        rdo_fixas_vencimento: data.rdo_fixas_vencimento || '',
        rdo_autos: data.rdo_autos ?? false,
        rdo_autos_valor: data.rdo_autos_valor?.toString() || '',
        rdo_armazenamento: data.rdo_armazenamento ?? false,
        rdo_armazenamento_valor: data.rdo_armazenamento_valor?.toString() || '',
        valor_minimo: data.valor_minimo ?? 10.64,
        isento: data.isento ?? false,
        assistencia_judiciaria: data.assistencia_judiciaria ?? false,
      }));
      if (data.itens && Array.isArray(data.itens)) setItens(data.itens);
      if (data.recolhidas && Array.isArray(data.recolhidas)) setRecolhidas(data.recolhidas);
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        case_id: caseId, ...form,
        rec_conhecimento_valor: form.rec_conhecimento_valor ? parseFloat(form.rec_conhecimento_valor) : null,
        rdo_conhecimento_valor: form.rdo_conhecimento_valor ? parseFloat(form.rdo_conhecimento_valor) : null,
        rdo_liquidacao_valor: form.rdo_liquidacao_valor ? parseFloat(form.rdo_liquidacao_valor) : null,
        rdo_fixas_valor: form.rdo_fixas_valor ? parseFloat(form.rdo_fixas_valor) : null,
        rdo_autos_valor: form.rdo_autos_valor ? parseFloat(form.rdo_autos_valor) : null,
        rdo_armazenamento_valor: form.rdo_armazenamento_valor ? parseFloat(form.rdo_armazenamento_valor) : null,
        // Keep legacy compatibility
        apurar: true, percentual: 2,
        itens, recolhidas,
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

  const CustaSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="nao_aplica">Não se aplica</SelectItem>
          <SelectItem value="calculado_2">Calculada 2%</SelectItem>
          <SelectItem value="informado">Informada</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custas Judiciais</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      {/* Base das Custas */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Base das Custas de Conhecimento e Liquidação</CardTitle></CardHeader>
        <CardContent>
          <Select value={form.base_custas} onValueChange={v => setForm(p => ({ ...p, base_custas: v as any }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bruto_reclamante">Bruto Devido ao Reclamante</SelectItem>
              <SelectItem value="bruto_mais_debitos">Bruto Devido ao Reclamante + Outros Débitos da Reclamada</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Custas do Reclamante */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Custas do Reclamante</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <CustaSelect value={form.rec_conhecimento} onChange={v => setForm(p => ({ ...p, rec_conhecimento: v }))} label="Conhecimento" />
          {form.rec_conhecimento === 'informado' && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">Vencimento</Label><Input type="date" value={form.rec_conhecimento_vencimento} onChange={e => setForm(p => ({ ...p, rec_conhecimento_vencimento: e.target.value }))} className="mt-0.5 h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Valor (R$)</Label><Input type="number" step="0.01" value={form.rec_conhecimento_valor} onChange={e => setForm(p => ({ ...p, rec_conhecimento_valor: e.target.value }))} className="mt-0.5 h-7 text-xs" /></div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">Mínimo de R$ {form.valor_minimo.toFixed(2)} (Art. 789 CLT).</p>
        </CardContent>
      </Card>

      {/* Custas do Reclamado */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Custas do Reclamado</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <CustaSelect value={form.rdo_conhecimento} onChange={v => setForm(p => ({ ...p, rdo_conhecimento: v }))} label="Conhecimento" />
          {form.rdo_conhecimento === 'informado' && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">Vencimento</Label><Input type="date" value={form.rdo_conhecimento_vencimento} onChange={e => setForm(p => ({ ...p, rdo_conhecimento_vencimento: e.target.value }))} className="mt-0.5 h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Valor (R$)</Label><Input type="number" step="0.01" value={form.rdo_conhecimento_valor} onChange={e => setForm(p => ({ ...p, rdo_conhecimento_valor: e.target.value }))} className="mt-0.5 h-7 text-xs" /></div>
            </div>
          )}

          <CustaSelect value={form.rdo_liquidacao} onChange={v => setForm(p => ({ ...p, rdo_liquidacao: v }))} label="Liquidação" />
          {form.rdo_liquidacao === 'informado' && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">Vencimento</Label><Input type="date" value={form.rdo_liquidacao_vencimento} onChange={e => setForm(p => ({ ...p, rdo_liquidacao_vencimento: e.target.value }))} className="mt-0.5 h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Valor (R$)</Label><Input type="number" step="0.01" value={form.rdo_liquidacao_valor} onChange={e => setForm(p => ({ ...p, rdo_liquidacao_valor: e.target.value }))} className="mt-0.5 h-7 text-xs" /></div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.rdo_fixas} onCheckedChange={v => setForm(p => ({ ...p, rdo_fixas: !!v }))} />
              <Label className="text-xs">Custas Fixas</Label>
              {form.rdo_fixas && <Input type="number" step="0.01" value={form.rdo_fixas_valor} onChange={e => setForm(p => ({ ...p, rdo_fixas_valor: e.target.value }))} className="h-7 text-xs w-24" placeholder="R$" />}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.rdo_autos} onCheckedChange={v => setForm(p => ({ ...p, rdo_autos: !!v }))} />
              <Label className="text-xs">Custas de Autos</Label>
              {form.rdo_autos && <Input type="number" step="0.01" value={form.rdo_autos_valor} onChange={e => setForm(p => ({ ...p, rdo_autos_valor: e.target.value }))} className="h-7 text-xs w-24" placeholder="R$" />}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.rdo_armazenamento} onCheckedChange={v => setForm(p => ({ ...p, rdo_armazenamento: !!v }))} />
              <Label className="text-xs">Custas de Armazenamento</Label>
              {form.rdo_armazenamento && <Input type="number" step="0.01" value={form.rdo_armazenamento_valor} onChange={e => setForm(p => ({ ...p, rdo_armazenamento_valor: e.target.value }))} className="h-7 text-xs w-24" placeholder="R$" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custas Recolhidas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Custas Recolhidas (Dedução)</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setRecolhidas(p => [...p, { descricao: '', valor: '', data: '' }])} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recolhidas.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma custa recolhida.</p>}
          {recolhidas.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input value={r.descricao} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], descricao: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs flex-1" placeholder="Descrição" />
              <Input type="number" step="0.01" value={r.valor} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], valor: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs w-24" placeholder="R$" />
              <Input type="date" value={r.data} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], data: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs w-32" />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRecolhidas(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Isenção */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Isenção e Assistência</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2"><Checkbox checked={form.isento} onCheckedChange={v => setForm(p => ({ ...p, isento: !!v }))} /><Label className="text-xs">Isento de Custas (beneficiário da justiça gratuita)</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.assistencia_judiciaria} onCheckedChange={v => setForm(p => ({ ...p, assistencia_judiciaria: !!v }))} /><Label className="text-xs">Deferir Assistência Judiciária Gratuita (Art. 790, §3º CLT)</Label></div>
        </CardContent>
      </Card>
    </div>
  );
}

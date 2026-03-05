import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";

interface AutoItem { tipo: string; vencimento: string; valor_bem: string; }
interface ArmazenamentoItem { inicio: string; termino: string; valor_bem: string; }

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
    base_custas: 'bruto_mais_debitos',
    // Reclamante
    rec_conhecimento: 'nao_aplica',
    rec_conhecimento_valor: '',
    // Reclamado
    rdo_conhecimento: 'nao_aplica',
    rdo_conhecimento_valor: '',
    rdo_liquidacao: 'nao_aplica',
    rdo_liquidacao_valor: '',
    // Custas fixas
    custas_fixas_vencimento: '',
    custas_fixas: {
      oficiais_urbana: false, oficiais_rural: false,
      agravo_instrumento: false, agravo_peticao: false,
      impugnacao_sentenca: false, embargos_arrematacao: false,
      embargos_execucao: false, embargos_terceiros: false,
      recurso_revista: false,
    },
    // Autos
    autos: [] as AutoItem[],
    // Armazenamento
    armazenamento: [] as ArmazenamentoItem[],
  });

  const [recolhidas, setRecolhidas] = useState<{ descricao: string; valor: string; data: string }[]>([]);

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        ...prev,
        base_custas: data.base_custas || 'bruto_mais_debitos',
        rec_conhecimento: data.rec_conhecimento || 'nao_aplica',
        rec_conhecimento_valor: data.rec_conhecimento_valor?.toString() || '',
        rdo_conhecimento: data.rdo_conhecimento || 'nao_aplica',
        rdo_conhecimento_valor: data.rdo_conhecimento_valor?.toString() || '',
        rdo_liquidacao: data.rdo_liquidacao || 'nao_aplica',
        rdo_liquidacao_valor: data.rdo_liquidacao_valor?.toString() || '',
        custas_fixas_vencimento: (data as any).custas_fixas_vencimento || '',
        custas_fixas: (data as any).custas_fixas || prev.custas_fixas,
        autos: (data as any).autos || [],
        armazenamento: (data as any).armazenamento || [],
      }));
      if (data.recolhidas && Array.isArray(data.recolhidas)) setRecolhidas(data.recolhidas);
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        case_id: caseId,
        apurar: true,
        percentual: 2,
        base_custas: form.base_custas,
        rec_conhecimento: form.rec_conhecimento,
        rec_conhecimento_valor: form.rec_conhecimento_valor ? parseFloat(form.rec_conhecimento_valor) : null,
        rdo_conhecimento: form.rdo_conhecimento,
        rdo_conhecimento_valor: form.rdo_conhecimento_valor ? parseFloat(form.rdo_conhecimento_valor) : null,
        rdo_liquidacao: form.rdo_liquidacao,
        rdo_liquidacao_valor: form.rdo_liquidacao_valor ? parseFloat(form.rdo_liquidacao_valor) : null,
        custas_fixas_vencimento: form.custas_fixas_vencimento || null,
        custas_fixas: form.custas_fixas,
        autos: form.autos,
        armazenamento: form.armazenamento,
        recolhidas,
        itens: [],
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

  const RadioOption = ({ label, value, current, onChange }: { label: string; value: string; current: string; onChange: (v: string) => void }) => (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="radio" checked={current === value} onChange={() => onChange(value)} className="h-3 w-3 accent-primary" />
      <span className="text-xs">{label}</span>
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Custas Judiciais</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Dados de Custas Judiciais</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="devidas">
            <TabsList className="h-8 mb-3">
              <TabsTrigger value="devidas" className="text-xs h-7">Custas Devidas</TabsTrigger>
              <TabsTrigger value="recolhidas" className="text-xs h-7">Custas Recolhidas</TabsTrigger>
            </TabsList>

            <TabsContent value="devidas" className="space-y-4">
              {/* Base */}
              <div className="flex gap-6">
                <div className="flex-1 space-y-3">
                  <Label className="text-xs font-semibold">Base para Custas de Conhecimento e Liquidação</Label>
                  <Select value={form.base_custas} onValueChange={v => setForm(p => ({ ...p, base_custas: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bruto_reclamante">Bruto Devido ao Reclamante</SelectItem>
                      <SelectItem value="bruto_mais_debitos">Bruto Devido ao Reclamante + Outros Débitos do Reclamado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 space-y-2">
                      <Label className="text-xs font-semibold">Custas do Reclamante - Conhecimento</Label>
                      <div className="space-y-1">
                        <RadioOption label="Não se Aplica" value="nao_aplica" current={form.rec_conhecimento} onChange={v => setForm(p => ({ ...p, rec_conhecimento: v }))} />
                        <RadioOption label="Calculada 2%" value="calculado_2" current={form.rec_conhecimento} onChange={v => setForm(p => ({ ...p, rec_conhecimento: v }))} />
                        <RadioOption label="Informada" value="informado" current={form.rec_conhecimento} onChange={v => setForm(p => ({ ...p, rec_conhecimento: v }))} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Custas do Reclamado */}
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <Label className="text-xs font-semibold mb-2 block">Custas do Reclamado</Label>
                  <div className="flex gap-6">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium">Conhecimento</Label>
                      <RadioOption label="Não se Aplica" value="nao_aplica" current={form.rdo_conhecimento} onChange={v => setForm(p => ({ ...p, rdo_conhecimento: v }))} />
                      <RadioOption label="Calculada 2%" value="calculado_2" current={form.rdo_conhecimento} onChange={v => setForm(p => ({ ...p, rdo_conhecimento: v }))} />
                      <RadioOption label="Informada" value="informado" current={form.rdo_conhecimento} onChange={v => setForm(p => ({ ...p, rdo_conhecimento: v }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium">Liquidação</Label>
                      <RadioOption label="Não se Aplica" value="nao_aplica" current={form.rdo_liquidacao} onChange={v => setForm(p => ({ ...p, rdo_liquidacao: v }))} />
                      <RadioOption label="Calculada 0,5%" value="calculado_05" current={form.rdo_liquidacao} onChange={v => setForm(p => ({ ...p, rdo_liquidacao: v }))} />
                      <RadioOption label="Informada" value="informado" current={form.rdo_liquidacao} onChange={v => setForm(p => ({ ...p, rdo_liquidacao: v }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custas Fixas + Autos 5% side by side */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-semibold">Custas Fixas</Label>
                  <div>
                    <Label className="text-[10px]">Vencimento</Label>
                    <Input type="date" value={form.custas_fixas_vencimento} onChange={e => setForm(p => ({ ...p, custas_fixas_vencimento: e.target.value }))} className="h-7 text-xs mt-0.5 w-36" />
                  </div>
                  {Object.entries({
                    oficiais_urbana: 'Atos dos Oficiais de Justiça - Zona Urbana',
                    oficiais_rural: 'Atos dos Oficiais de Justiça - Zona Rural',
                    agravo_instrumento: 'Agravo de Instrumento',
                    agravo_peticao: 'Agravo de Petição',
                    impugnacao_sentenca: 'Impugnação à Sentença de Liquidação',
                    embargos_arrematacao: 'Embargos à Arrematação',
                    embargos_execucao: 'Embargos à Execução',
                    embargos_terceiros: 'Embargos de Terceiros',
                    recurso_revista: 'Recurso de Revista',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Label className="text-[10px] flex-1">{label}</Label>
                      <Checkbox
                        checked={(form.custas_fixas as any)[key] ?? false}
                        onCheckedChange={v => setForm(p => ({ ...p, custas_fixas: { ...p.custas_fixas, [key]: !!v } }))}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex-1 space-y-3">
                  {/* Autos 5% */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Autos 5%</Label>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setForm(p => ({ ...p, autos: [...p.autos, { tipo: '', vencimento: '', valor_bem: '' }] }))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {form.autos.length > 0 && (
                      <div className="border border-border rounded overflow-hidden">
                        <table className="w-full text-[10px]">
                          <thead><tr className="bg-muted/50 border-b"><th className="p-1.5 text-left">Tipo de Auto *</th><th className="p-1.5 text-left">Vencimento *</th><th className="p-1.5 text-left">Valor do Bem *</th><th className="p-1.5 w-6"></th></tr></thead>
                          <tbody>
                            {form.autos.map((a, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="p-1"><Input value={a.tipo} onChange={e => { const n = [...form.autos]; n[i] = { ...a, tipo: e.target.value }; setForm(p => ({ ...p, autos: n })); }} className="h-6 text-[10px]" /></td>
                                <td className="p-1"><Input type="date" value={a.vencimento} onChange={e => { const n = [...form.autos]; n[i] = { ...a, vencimento: e.target.value }; setForm(p => ({ ...p, autos: n })); }} className="h-6 text-[10px]" /></td>
                                <td className="p-1"><Input type="number" step="0.01" value={a.valor_bem} onChange={e => { const n = [...form.autos]; n[i] = { ...a, valor_bem: e.target.value }; setForm(p => ({ ...p, autos: n })); }} className="h-6 text-[10px]" /></td>
                                <td className="p-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setForm(p => ({ ...p, autos: p.autos.filter((_, j) => j !== i) }))}><Trash2 className="h-2.5 w-2.5 text-destructive" /></Button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Armazenamento 0,1% */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Armazenamento 0,1%</Label>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setForm(p => ({ ...p, armazenamento: [...p.armazenamento, { inicio: '', termino: '', valor_bem: '' }] }))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {form.armazenamento.length > 0 && (
                      <div className="border border-border rounded overflow-hidden">
                        <table className="w-full text-[10px]">
                          <thead><tr className="bg-muted/50 border-b"><th className="p-1.5 text-left">Início *</th><th className="p-1.5 text-left">Término *</th><th className="p-1.5 text-left">Valor do Bem *</th><th className="p-1.5 w-6"></th></tr></thead>
                          <tbody>
                            {form.armazenamento.map((a, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="p-1"><Input type="date" value={a.inicio} onChange={e => { const n = [...form.armazenamento]; n[i] = { ...a, inicio: e.target.value }; setForm(p => ({ ...p, armazenamento: n })); }} className="h-6 text-[10px]" /></td>
                                <td className="p-1"><Input type="date" value={a.termino} onChange={e => { const n = [...form.armazenamento]; n[i] = { ...a, termino: e.target.value }; setForm(p => ({ ...p, armazenamento: n })); }} className="h-6 text-[10px]" /></td>
                                <td className="p-1"><Input type="number" step="0.01" value={a.valor_bem} onChange={e => { const n = [...form.armazenamento]; n[i] = { ...a, valor_bem: e.target.value }; setForm(p => ({ ...p, armazenamento: n })); }} className="h-6 text-[10px]" /></td>
                                <td className="p-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setForm(p => ({ ...p, armazenamento: p.armazenamento.filter((_, j) => j !== i) }))}><Trash2 className="h-2.5 w-2.5 text-destructive" /></Button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recolhidas" className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Custas Recolhidas (Dedução)</Label>
                <Button variant="outline" size="sm" onClick={() => setRecolhidas(p => [...p, { descricao: '', valor: '', data: '' }])} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              {recolhidas.length === 0 && <p className="text-[10px] text-muted-foreground py-2">Nenhuma custa recolhida registrada.</p>}
              {recolhidas.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={r.descricao} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], descricao: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs flex-1" placeholder="Descrição" />
                  <Input type="number" step="0.01" value={r.valor} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], valor: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs w-24" placeholder="R$" />
                  <Input type="date" value={r.data} onChange={e => { const n = [...recolhidas]; n[idx] = { ...n[idx], data: e.target.value }; setRecolhidas(n); }} className="h-7 text-xs w-32" />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRecolhidas(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

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
import { Save, Loader2, Plus, Trash2 } from "lucide-react";

interface Props { caseId: string; }

interface MultaIndenizacao {
  descricao: string;
  credor: string;
  devedor: string;
  terceiro_nome: string;
  valor_tipo: 'calculado' | 'informado';
  base: 'principal' | 'principal_menos_cs' | 'principal_menos_cs_pp';
  aliquota: string;
  valor: string;
  vencimento: string;
  indice: 'trabalhista' | 'outro';
  indice_outro: string;
  aplicar_juros: boolean;
}

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

  const [multas, setMultas] = useState<MultaIndenizacao[]>([]);

  useEffect(() => {
    if (data) {
      setForm({
        apurar_467: data.apurar_467 ?? false, valor_467: data.valor_467?.toString() || '',
        apurar_477: data.apurar_477 ?? false, valor_477_tipo: data.valor_477_tipo || 'salario',
        valor_477_informado: data.valor_477_informado?.toString() || '', observacoes: data.observacoes || '',
      });
      if (data.multas_indenizacoes && Array.isArray(data.multas_indenizacoes)) setMultas(data.multas_indenizacoes);
    }
  }, [data]);

  const addMulta = () => setMultas(p => [...p, {
    descricao: '', credor: 'reclamante', devedor: 'reclamado', terceiro_nome: '',
    valor_tipo: 'calculado', base: 'principal', aliquota: '', valor: '', vencimento: '',
    indice: 'trabalhista', indice_outro: '', aplicar_juros: true,
  }]);

  const updateMulta = (idx: number, changes: Partial<MultaIndenizacao>) => {
    setMultas(p => p.map((m, i) => i === idx ? { ...m, ...changes } : m));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, ...form,
        valor_467: form.valor_467 ? parseFloat(form.valor_467) : 0,
        valor_477_informado: form.valor_477_informado ? parseFloat(form.valor_477_informado) : null,
        multas_indenizacoes: multas,
      };
      if (data?.id) await supabase.from("pjecalc_multas_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_multas_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_multas_config", caseId] });
      toast.success("Multas e Indenizações salvas!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Multas e Indenizações</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      {/* Art. 467 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Art. 467 CLT — Verbas Incontroversas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={form.apurar_467} onCheckedChange={v => setForm(p => ({ ...p, apurar_467: !!v }))} />
            <Label className="text-xs">Apurar multa de 50% sobre verbas incontroversas não pagas na 1ª audiência</Label>
          </div>
          {form.apurar_467 && (
            <div><Label className="text-xs">Valor das verbas incontroversas (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_467} onChange={e => setForm(p => ({ ...p, valor_467: e.target.value }))} className="mt-1 h-8 text-xs" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Art. 477 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Art. 477, §8º CLT — Atraso na Rescisão</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={form.apurar_477} onCheckedChange={v => setForm(p => ({ ...p, apurar_477: !!v }))} />
            <Label className="text-xs">Apurar multa por atraso no pagamento das verbas rescisórias</Label>
          </div>
          {form.apurar_477 && (
            <>
              <div><Label className="text-xs">Base da Multa</Label>
                <Select value={form.valor_477_tipo} onValueChange={v => setForm(p => ({ ...p, valor_477_tipo: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salario">Último Salário (Art. 477, §8º)</SelectItem>
                    <SelectItem value="informado">Valor Informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.valor_477_tipo === 'informado' && (
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={form.valor_477_informado} onChange={e => setForm(p => ({ ...p, valor_477_informado: e.target.value }))} className="mt-1 h-8 text-xs" /></div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Multas e Indenizações Genéricas (PJe-Calc) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Multas e Indenizações Adicionais</CardTitle>
            <Button variant="outline" size="sm" onClick={addMulta} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Novo</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {multas.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma multa ou indenização adicional. Clique em "Novo" para incluir.</p>}
          {multas.map((m, idx) => (
            <div key={idx} className="border border-border/50 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Input value={m.descricao} onChange={e => updateMulta(idx, { descricao: e.target.value })} className="h-7 text-xs flex-1 mr-2" placeholder="Descrição (ex: Multa do Art. 940 CC)" />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMultas(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Credor</Label>
                  <Select value={m.credor} onValueChange={v => updateMulta(idx, { credor: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reclamante">Reclamante</SelectItem>
                      <SelectItem value="reclamado">Reclamado</SelectItem>
                      <SelectItem value="terceiro">Terceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px]">Devedor</Label>
                  <Select value={m.devedor} onValueChange={v => updateMulta(idx, { devedor: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reclamante">Reclamante</SelectItem>
                      <SelectItem value="reclamado">Reclamado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {m.credor === 'terceiro' && (
                <div><Label className="text-[10px]">Nome do Terceiro</Label><Input value={m.terceiro_nome} onChange={e => updateMulta(idx, { terceiro_nome: e.target.value })} className="h-7 text-xs" /></div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Tipo de Valor</Label>
                  <Select value={m.valor_tipo} onValueChange={v => updateMulta(idx, { valor_tipo: v as any })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calculado">Calculado (% sobre condenação)</SelectItem>
                      <SelectItem value="informado">Informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {m.valor_tipo === 'calculado' ? (
                  <>
                    <div><Label className="text-[10px]">Base</Label>
                      <Select value={m.base} onValueChange={v => updateMulta(idx, { base: v as any })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="principal">Principal</SelectItem>
                          <SelectItem value="principal_menos_cs">Principal (-) Contrib. Social</SelectItem>
                          <SelectItem value="principal_menos_cs_pp">Principal (-) CS (-) Prev. Privada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div><Label className="text-[10px]">Valor (R$)</Label><Input type="number" step="0.01" value={m.valor} onChange={e => updateMulta(idx, { valor: e.target.value })} className="h-7 text-xs" /></div>
                )}
              </div>
              {m.valor_tipo === 'calculado' && (
                <div><Label className="text-[10px]">Alíquota (%)</Label><Input type="number" step="0.1" value={m.aliquota} onChange={e => updateMulta(idx, { aliquota: e.target.value })} className="h-7 text-xs w-24" /></div>
              )}
              {m.valor_tipo === 'informado' && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Vencimento</Label><Input type="date" value={m.vencimento} onChange={e => updateMulta(idx, { vencimento: e.target.value })} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Índice de Correção</Label>
                    <Select value={m.indice} onValueChange={v => updateMulta(idx, { indice: v as any })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trabalhista">Utilizar índice trabalhista</SelectItem>
                        <SelectItem value="outro">Utilizar outro índice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox checked={m.aplicar_juros} onCheckedChange={v => updateMulta(idx, { aplicar_juros: !!v })} />
                <Label className="text-[10px]">Aplicar Juros de Mora</Label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="text-xs min-h-[60px]" placeholder="Fundamentação ou justificativa..." />
        </CardContent>
      </Card>
    </div>
  );
}
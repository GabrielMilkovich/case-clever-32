import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2, Pencil, Eye } from "lucide-react";

interface Props { caseId: string; }

interface MultaIndenizacao {
  descricao: string;
  credor: string;
  devedor: string;
  terceiro_nome: string;
  valor_tipo: 'calculado' | 'informado';
  base: string;
  aliquota: string;
  valor: string;
  vencimento: string;
  indice: string;
  indice_outro: string;
  aplicar_juros: boolean;
  apurar_ir: boolean;
}

const EMPTY_MULTA: MultaIndenizacao = {
  descricao: '', credor: 'reclamante', devedor: 'reclamado', terceiro_nome: '',
  valor_tipo: 'calculado', base: 'principal', aliquota: '', valor: '', vencimento: '',
  indice: 'trabalhista', indice_outro: '', aplicar_juros: true, apurar_ir: false,
};

export function ModuloMultasCLT({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [multas, setMultas] = useState<MultaIndenizacao[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MultaIndenizacao>(EMPTY_MULTA);

  const { data } = useQuery({
    queryKey: ["pjecalc_multas_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_multas_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  useEffect(() => {
    if (data?.multas_indenizacoes && Array.isArray(data.multas_indenizacoes)) {
      setMultas(data.multas_indenizacoes);
    }
  }, [data]);

  const openNew = () => { setEditIdx(null); setEditForm(EMPTY_MULTA); setDialogOpen(true); };
  const openEdit = (idx: number) => { setEditIdx(idx); setEditForm({ ...multas[idx] }); setDialogOpen(true); };

  const saveItem = () => {
    if (editIdx !== null) {
      setMultas(p => p.map((m, i) => i === editIdx ? editForm : m));
    } else {
      setMultas(p => [...p, editForm]);
    }
    setDialogOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId,
        apurar_467: data?.apurar_467 ?? false,
        valor_467: data?.valor_467 ?? 0,
        apurar_477: data?.apurar_477 ?? false,
        valor_477_tipo: data?.valor_477_tipo || 'salario',
        valor_477_informado: data?.valor_477_informado ?? null,
        observacoes: data?.observacoes || '',
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Listar Multas e Indenizações</CardTitle>
            <Button onClick={openNew} size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {multas.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium py-4">Não existem resultados para a pesquisa solicitada.</p>
          ) : (
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-2 text-left font-medium w-20">Ação</th>
                    <th className="p-2 text-left font-medium">Descrição</th>
                    <th className="p-2 text-left font-medium">Devedor</th>
                    <th className="p-2 text-left font-medium">Credor</th>
                    <th className="p-2 text-left font-medium">Apurar Imposto de Renda</th>
                  </tr>
                </thead>
                <tbody>
                  {multas.map((m, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(idx)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMultas(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </td>
                      <td className="p-2 uppercase font-medium">{m.descricao || '—'}</td>
                      <td className="p-2 capitalize">{m.devedor}</td>
                      <td className="p-2 capitalize">{m.credor === 'terceiro' ? m.terceiro_nome : m.credor}</td>
                      <td className="p-2">{m.apurar_ir ? 'Sim' : 'Não'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {multas.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-right mt-1">Registros encontrados: {multas.length}</p>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editIdx !== null ? 'Editar' : 'Nova'} Multa / Indenização</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Descrição</Label><Input value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} className="h-8 text-xs mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Devedor</Label>
                <Select value={editForm.devedor} onValueChange={v => setEditForm(p => ({ ...p, devedor: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reclamante">Reclamante</SelectItem>
                    <SelectItem value="reclamado">Reclamado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Credor</Label>
                <Select value={editForm.credor} onValueChange={v => setEditForm(p => ({ ...p, credor: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reclamante">Reclamante</SelectItem>
                    <SelectItem value="reclamado">Reclamado</SelectItem>
                    <SelectItem value="terceiro">Terceiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editForm.credor === 'terceiro' && (
              <div><Label className="text-xs">Nome do Terceiro</Label><Input value={editForm.terceiro_nome} onChange={e => setEditForm(p => ({ ...p, terceiro_nome: e.target.value }))} className="h-8 text-xs mt-1" /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tipo de Valor</Label>
                <Select value={editForm.valor_tipo} onValueChange={v => setEditForm(p => ({ ...p, valor_tipo: v as any }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calculado">Calculado</SelectItem>
                    <SelectItem value="informado">Informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.valor_tipo === 'calculado' ? (
                <div><Label className="text-xs">Alíquota (%)</Label><Input type="number" step="0.1" value={editForm.aliquota} onChange={e => setEditForm(p => ({ ...p, aliquota: e.target.value }))} className="h-8 text-xs mt-1" /></div>
              ) : (
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={editForm.valor} onChange={e => setEditForm(p => ({ ...p, valor: e.target.value }))} className="h-8 text-xs mt-1" /></div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editForm.apurar_ir} onCheckedChange={v => setEditForm(p => ({ ...p, apurar_ir: !!v }))} />
              <Label className="text-xs">Apurar Imposto de Renda</Label>
            </div>
          </div>
          <DialogFooter><Button size="sm" onClick={saveItem}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

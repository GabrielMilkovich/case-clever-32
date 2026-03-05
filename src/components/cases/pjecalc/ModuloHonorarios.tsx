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

interface HonorarioItem {
  descricao: string;
  devedor: string;
  credor: string;
  tipo: 'percentual' | 'valor_fixo';
  percentual: string;
  valor_fixo: string;
  base: string;
  apurar_ir: boolean;
}

const EMPTY: HonorarioItem = {
  descricao: 'HONORÁRIOS DE SUCUMBÊNCIA', devedor: 'reclamado', credor: '',
  tipo: 'percentual', percentual: '15', valor_fixo: '', base: 'condenacao', apurar_ir: false,
};

export function ModuloHonorarios({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<HonorarioItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<HonorarioItem>(EMPTY);

  const { data } = useQuery({
    queryKey: ["pjecalc_honorarios", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_honorarios" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  useEffect(() => {
    if (data) {
      if (data.items && Array.isArray(data.items)) {
        setItems(data.items);
      } else if (data.apurar_sucumbenciais) {
        // Migrate from old format
        setItems([{
          descricao: 'HONORÁRIOS DE SUCUMBÊNCIA',
          devedor: 'reclamado',
          credor: '',
          tipo: 'percentual',
          percentual: data.percentual_sucumbenciais?.toString() || '15',
          valor_fixo: '',
          base: data.base_sucumbenciais || 'condenacao',
          apurar_ir: false,
        }]);
      }
    }
  }, [data]);

  const openNew = () => { setEditIdx(null); setEditForm({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (idx: number) => { setEditIdx(idx); setEditForm({ ...items[idx] }); setDialogOpen(true); };

  const saveItem = () => {
    if (editIdx !== null) {
      setItems(p => p.map((m, i) => i === editIdx ? editForm : m));
    } else {
      setItems(p => [...p, editForm]);
    }
    setDialogOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId,
        apurar_sucumbenciais: items.length > 0,
        percentual_sucumbenciais: items[0]?.percentual ? parseFloat(items[0].percentual) : 15,
        base_sucumbenciais: items[0]?.base || 'condenacao',
        apurar_contratuais: false,
        percentual_contratuais: 20,
        valor_fixo: null,
        items,
      };
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Listar Honorários</CardTitle>
            <Button onClick={openNew} size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground font-medium py-4">Não existem resultados para a pesquisa solicitada.</p>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground text-right mb-1">Registros encontrados: {items.length}</p>
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
                    {items.map((m, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(idx)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </td>
                        <td className="p-2 uppercase font-medium">{m.descricao}</td>
                        <td className="p-2 capitalize">{m.devedor}</td>
                        <td className="p-2 uppercase">{m.credor || '—'}</td>
                        <td className="p-2">{m.apurar_ir ? 'Sim' : 'Não'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editIdx !== null ? 'Editar' : 'Novo'} Honorário</DialogTitle></DialogHeader>
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
              <div><Label className="text-xs">Credor (nome)</Label><Input value={editForm.credor} onChange={e => setEditForm(p => ({ ...p, credor: e.target.value }))} className="h-8 text-xs mt-1" placeholder="Ex: MARCOS ROBERTO DIAS" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tipo</Label>
                <Select value={editForm.tipo} onValueChange={v => setEditForm(p => ({ ...p, tipo: v as any }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual</SelectItem>
                    <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.tipo === 'percentual' ? (
                <div><Label className="text-xs">Percentual (%)</Label><Input type="number" step="0.1" value={editForm.percentual} onChange={e => setEditForm(p => ({ ...p, percentual: e.target.value }))} className="h-8 text-xs mt-1" /></div>
              ) : (
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={editForm.valor_fixo} onChange={e => setEditForm(p => ({ ...p, valor_fixo: e.target.value }))} className="h-8 text-xs mt-1" /></div>
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

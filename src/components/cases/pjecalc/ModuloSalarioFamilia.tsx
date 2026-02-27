import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";

interface Props { caseId: string; }

interface FilhoDetalhe { nome: string; nascimento: string; ate_14: boolean; }

export function ModuloSalarioFamilia({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_salario_familia_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_salario_familia_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({ apurar: false, observacoes: '' });
  const [filhos, setFilhos] = useState<FilhoDetalhe[]>([]);

  useEffect(() => {
    if (data) {
      setForm({ apurar: data.apurar ?? false, observacoes: data.observacoes || '' });
      setFilhos(data.filhos_detalhes || []);
    }
  }, [data]);

  const addFilho = () => setFilhos(p => [...p, { nome: '', nascimento: '', ate_14: true }]);
  const removeFilho = (i: number) => setFilhos(p => p.filter((_, idx) => idx !== i));
  const updateFilho = (i: number, field: keyof FilhoDetalhe, value: any) => {
    setFilhos(p => p.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId, apurar: form.apurar, numero_filhos: filhos.length,
        filhos_detalhes: filhos, observacoes: form.observacoes,
      };
      if (data?.id) await supabase.from("pjecalc_salario_familia_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_salario_familia_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_salario_familia_config", caseId] });
      toast.success("Salário-Família salvo!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Salário-Família</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configuração</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} />
            <Label className="text-xs">Apurar Salário-Família (Art. 65 e ss., Lei 8.213/91)</Label>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Devido ao empregado de baixa renda por filho de até 14 anos ou inválido. Valor da cota conforme tabela vigente (Portaria MPS/MF).
            Em 2025: R$ 62,04 por filho para remuneração até R$ 1.819,26.
          </p>
        </CardContent>
      </Card>

      {form.apurar && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Filhos / Dependentes ({filhos.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={addFilho}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filhos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum dependente cadastrado.</p>
            ) : filhos.map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded border border-border/50">
                <Input value={f.nome} onChange={e => updateFilho(i, 'nome', e.target.value)} className="h-7 text-xs flex-1" placeholder="Nome" />
                <Input type="date" value={f.nascimento} onChange={e => updateFilho(i, 'nascimento', e.target.value)} className="h-7 text-xs w-36" />
                <div className="flex items-center gap-1">
                  <Checkbox checked={f.ate_14} onCheckedChange={v => updateFilho(i, 'ate_14', !!v)} />
                  <Label className="text-[10px]">≤14 anos</Label>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFilho(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
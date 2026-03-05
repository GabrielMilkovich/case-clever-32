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

interface AliquotaPeriodo {
  competencia_inicial: string;
  competencia_final: string;
  aliquota: string;
}

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

  const [apurar, setApurar] = useState(false);
  const [periodos, setPeriodos] = useState<AliquotaPeriodo[]>([
    { competencia_inicial: '', competencia_final: '', aliquota: '' }
  ]);

  useEffect(() => {
    if (data) {
      setApurar(data.apurar ?? false);
      if (data.periodos && Array.isArray(data.periodos) && data.periodos.length > 0) {
        setPeriodos(data.periodos);
      } else if (data.percentual) {
        setPeriodos([{ competencia_inicial: '', competencia_final: '', aliquota: data.percentual?.toString() || '' }]);
      }
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        case_id: caseId,
        apurar,
        percentual: periodos[0]?.aliquota ? parseFloat(periodos[0].aliquota) : 0,
        base_calculo: 'diferenca',
        deduzir_ir: true,
        periodos,
        observacao: null,
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
        <CardHeader className="pb-3"><CardTitle className="text-sm">Dados de Previdência Privada</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={apurar} onCheckedChange={v => setApurar(!!v)} />
            <Label className="text-xs font-medium">Apurar Previdência Privada</Label>
          </div>

          {apurar && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Alíquota por Período</Label>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPeriodos(p => [...p, { competencia_inicial: '', competencia_final: '', aliquota: '' }])}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="p-2 text-left font-medium">Competência Inicial *</th>
                      <th className="p-2 text-left font-medium">Competência Final *</th>
                      <th className="p-2 text-left font-medium">Alíquota (%) *</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodos.map((p, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-1.5">
                          <Input
                            value={p.competencia_inicial}
                            onChange={e => { const n = [...periodos]; n[idx] = { ...n[idx], competencia_inicial: e.target.value }; setPeriodos(n); }}
                            className="h-7 text-xs" placeholder="MM/AAAA"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            value={p.competencia_final}
                            onChange={e => { const n = [...periodos]; n[idx] = { ...n[idx], competencia_final: e.target.value }; setPeriodos(n); }}
                            className="h-7 text-xs" placeholder="MM/AAAA"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number" step="0.01"
                            value={p.aliquota}
                            onChange={e => { const n = [...periodos]; n[idx] = { ...n[idx], aliquota: e.target.value }; setPeriodos(n); }}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          {periodos.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPeriodos(p => p.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-muted-foreground">
                A previdência privada complementar será apurada sobre as verbas com incidência marcada e poderá ser deduzida da base do IR conforme Art. 11 da Lei 9.532/97.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

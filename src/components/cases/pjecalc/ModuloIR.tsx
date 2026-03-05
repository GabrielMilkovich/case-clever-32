import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface Props { caseId: string; }

export function ModuloIR({ caseId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["pjecalc_ir_config", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_ir_config" as any).select("*").eq("case_id", caseId).maybeSingle();
      return data as any;
    },
  });

  const [form, setForm] = useState({
    apurar: true,
    incidir_sobre_juros: false,
    cobrar_reclamado: false,
    tributacao_exclusiva_13: false,
    tributacao_separada_ferias: false,
    aplicar_regime_caixa: false,
    deduzir_cs: true,
    deduzir_prev_privada: true,
    deduzir_pensao: true,
    deduzir_honorarios: true,
    aposentado_65: false,
    dependentes: 0,
  });

  useEffect(() => {
    if (data) setForm({
      apurar: data.apurar ?? true,
      incidir_sobre_juros: data.incidir_sobre_juros ?? false,
      cobrar_reclamado: data.cobrar_reclamado ?? false,
      tributacao_exclusiva_13: data.tributacao_exclusiva_13 ?? false,
      tributacao_separada_ferias: data.tributacao_separada_ferias ?? false,
      aplicar_regime_caixa: (data as any).aplicar_regime_caixa ?? false,
      deduzir_cs: data.deduzir_cs ?? true,
      deduzir_prev_privada: data.deduzir_prev_privada ?? true,
      deduzir_pensao: data.deduzir_pensao ?? true,
      deduzir_honorarios: data.deduzir_honorarios ?? true,
      aposentado_65: data.aposentado_65 ?? false,
      dependentes: data.dependentes ?? 0,
    });
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { case_id: caseId, ...form };
      if (data?.id) await supabase.from("pjecalc_ir_config" as any).update(payload).eq("id", data.id);
      else await supabase.from("pjecalc_ir_config" as any).insert(payload);
      qc.invalidateQueries({ queryKey: ["pjecalc_ir_config", caseId] });
      toast.success("IR configurado!");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Imposto de Renda</h2>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Dados de Imposto de Renda do Reclamante</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} />
            <Label className="text-xs font-semibold">Apurar Imposto de Renda</Label>
          </div>

          {form.apurar && (
            <div className="flex gap-8">
              {/* Left column - checkboxes */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.incidir_sobre_juros} onCheckedChange={v => setForm(p => ({ ...p, incidir_sobre_juros: !!v }))} />
                  <Label className="text-xs">Incidir sobre Juros de Mora</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.cobrar_reclamado} onCheckedChange={v => setForm(p => ({ ...p, cobrar_reclamado: !!v }))} />
                  <Label className="text-xs">Cobrar do Reclamado</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.tributacao_exclusiva_13} onCheckedChange={v => setForm(p => ({ ...p, tributacao_exclusiva_13: !!v }))} />
                  <Label className="text-xs">Tributação Exclusiva</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.tributacao_separada_ferias} onCheckedChange={v => setForm(p => ({ ...p, tributacao_separada_ferias: !!v }))} />
                  <Label className="text-xs">Tributação em Separado</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.aplicar_regime_caixa} onCheckedChange={v => setForm(p => ({ ...p, aplicar_regime_caixa: !!v }))} />
                  <Label className="text-xs">Aplicar Regime de Caixa</Label>
                </div>
              </div>

              {/* Right column - deductions box */}
              <div className="flex-1">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs font-semibold">Deduzir da Base do Imposto de Renda</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.deduzir_cs} onCheckedChange={v => setForm(p => ({ ...p, deduzir_cs: !!v }))} />
                      <Label className="text-xs">Contribuição Social devida pelo Reclamante</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.deduzir_prev_privada} onCheckedChange={v => setForm(p => ({ ...p, deduzir_prev_privada: !!v }))} />
                      <Label className="text-xs">Previdência Privada</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.deduzir_pensao} onCheckedChange={v => setForm(p => ({ ...p, deduzir_pensao: !!v }))} />
                      <Label className="text-xs">Pensão Alimentícia</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.deduzir_honorarios} onCheckedChange={v => setForm(p => ({ ...p, deduzir_honorarios: !!v }))} />
                      <Label className="text-xs">Honorários devidos pelo Reclamante</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.aposentado_65} onCheckedChange={v => setForm(p => ({ ...p, aposentado_65: !!v }))} />
                      <Label className="text-xs">Aposentado maior de 65 Anos</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.dependentes > 0} onCheckedChange={v => setForm(p => ({ ...p, dependentes: v ? Math.max(p.dependentes, 1) : 0 }))} />
                      <Label className="text-xs">Dependentes</Label>
                      <Input
                        type="number" min={0}
                        value={form.dependentes}
                        onChange={e => setForm(p => ({ ...p, dependentes: parseInt(e.target.value) || 0 }))}
                        className="h-7 text-xs w-16"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

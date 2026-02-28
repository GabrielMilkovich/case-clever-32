import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, Info } from "lucide-react";

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
    apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false,
    tributacao_exclusiva_13: true, tributacao_separada_ferias: false,
    deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false,
    deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
  });

  useEffect(() => {
    if (data) setForm({
      apurar: data.apurar ?? true, incidir_sobre_juros: data.incidir_sobre_juros ?? false,
      cobrar_reclamado: data.cobrar_reclamado ?? false, tributacao_exclusiva_13: data.tributacao_exclusiva_13 ?? true,
      tributacao_separada_ferias: data.tributacao_separada_ferias ?? false, deduzir_cs: data.deduzir_cs ?? true,
      deduzir_prev_privada: data.deduzir_prev_privada ?? false, deduzir_pensao: data.deduzir_pensao ?? false,
      deduzir_honorarios: data.deduzir_honorarios ?? false, aposentado_65: data.aposentado_65 ?? false,
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
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configuração Geral</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.apurar} onCheckedChange={v => setForm(p => ({ ...p, apurar: !!v }))} /><Label className="text-xs">Apurar IRRF</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.incidir_sobre_juros} onCheckedChange={v => setForm(p => ({ ...p, incidir_sobre_juros: !!v }))} /><Label className="text-xs">Incidir sobre Juros de Mora</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.cobrar_reclamado} onCheckedChange={v => setForm(p => ({ ...p, cobrar_reclamado: !!v }))} /><Label className="text-xs">Cobrar do Reclamado (responsabilidade tributária)</Label></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Tributação Art. 12-A (RRA)
            <Badge variant="outline" className="text-[9px] font-normal">Lei 7.713/88</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 rounded p-2.5 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>Fase 8 — Separação por Ano:</strong> O cálculo agora separa automaticamente os rendimentos em duas faixas:
              </p>
            </div>
            <ul className="text-[10px] text-muted-foreground ml-5 space-y-0.5 list-disc">
              <li><strong>Anos anteriores ao da liquidação:</strong> Tabela progressiva acumulada (×N meses)</li>
              <li><strong>Ano da liquidação:</strong> Tabela mensal acumulada (×M meses do ano corrente)</li>
            </ul>
          </div>
          <div className="flex items-center gap-2"><Checkbox checked={form.tributacao_exclusiva_13} onCheckedChange={v => setForm(p => ({ ...p, tributacao_exclusiva_13: !!v }))} /><Label className="text-xs">Tributação Exclusiva do 13º Salário</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.tributacao_separada_ferias} onCheckedChange={v => setForm(p => ({ ...p, tributacao_separada_ferias: !!v }))} /><Label className="text-xs">Tributação Separada de Férias</Label></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Deduções</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_cs} onCheckedChange={v => setForm(p => ({ ...p, deduzir_cs: !!v }))} /><Label className="text-xs">Deduzir Contribuição Social</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_prev_privada} onCheckedChange={v => setForm(p => ({ ...p, deduzir_prev_privada: !!v }))} /><Label className="text-xs">Deduzir Previdência Privada</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_pensao} onCheckedChange={v => setForm(p => ({ ...p, deduzir_pensao: !!v }))} /><Label className="text-xs">Deduzir Pensão Alimentícia</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.deduzir_honorarios} onCheckedChange={v => setForm(p => ({ ...p, deduzir_honorarios: !!v }))} /><Label className="text-xs">Deduzir Honorários Advocatícios</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={form.aposentado_65} onCheckedChange={v => setForm(p => ({ ...p, aposentado_65: !!v }))} /><Label className="text-xs">Aposentado +65 (parcela isenta dupla)</Label></div>
          <div>
            <Label className="text-xs">Nº de Dependentes</Label>
            <Input type="number" min={0} value={form.dependentes} onChange={e => setForm(p => ({ ...p, dependentes: parseInt(e.target.value) || 0 }))} className="mt-1 h-8 text-xs w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

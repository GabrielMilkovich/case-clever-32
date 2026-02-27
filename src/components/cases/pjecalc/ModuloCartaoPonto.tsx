import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Calculator } from "lucide-react";

interface Props { caseId: string; dataAdmissao?: string; dataDemissao?: string; }

export function ModuloCartaoPonto({ caseId, dataAdmissao, dataDemissao }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: registros = [] } = useQuery({
    queryKey: ["pjecalc_cartao_ponto", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_cartao_ponto" as any).select("*").eq("case_id", caseId).order("competencia");
      return (data || []) as any[];
    },
  });

  const gerarCompetencias = async () => {
    if (!dataAdmissao || !dataDemissao) { toast.error("Preencha datas nos Parâmetros."); return; }
    setGenerating(true);
    try {
      await supabase.from("pjecalc_cartao_ponto" as any).delete().eq("case_id", caseId);
      const start = new Date(dataAdmissao + "T00:00:00");
      const end = new Date(dataDemissao + "T00:00:00");
      const rows: any[] = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        rows.push({
          case_id: caseId,
          competencia: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`,
          dias_uteis: 22, dias_trabalhados: 22,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      if (rows.length > 0) await supabase.from("pjecalc_cartao_ponto" as any).insert(rows);
      qc.invalidateQueries({ queryKey: ["pjecalc_cartao_ponto", caseId] });
      toast.success(`${rows.length} competências geradas`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  };

  const updateField = async (id: string, field: string, value: any) => {
    await supabase.from("pjecalc_cartao_ponto" as any).update({ [field]: value }).eq("id", id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cartão de Ponto</h2>
        <Button size="sm" variant="outline" onClick={gerarCompetencias} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
          Gerar Competências
        </Button>
      </div>
      {registros.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Clique em "Gerar Competências" para criar o cartão de ponto.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-2 text-left font-medium">Comp.</th>
                <th className="p-2 text-center font-medium">D.Úteis</th>
                <th className="p-2 text-center font-medium">D.Trab.</th>
                <th className="p-2 text-center font-medium">HE 50%</th>
                <th className="p-2 text-center font-medium">HE 100%</th>
                <th className="p-2 text-center font-medium">H.Not.</th>
                <th className="p-2 text-center font-medium">Int.Supr.</th>
                <th className="p-2 text-center font-medium">DSR</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 font-mono font-medium">{r.competencia}</td>
                  {["dias_uteis","dias_trabalhados","horas_extras_50","horas_extras_100","horas_noturnas","intervalo_suprimido","dsr_horas"].map(field => (
                    <td key={field} className="p-1 text-center">
                      <Input type="number" step="0.01" defaultValue={r[field] || 0} className="h-7 text-xs w-16 text-center mx-auto" onBlur={e => updateField(r.id, field, parseFloat(e.target.value) || 0)} />
                    </td>
                  ))}
                  <td className="p-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => { await supabase.from("pjecalc_cartao_ponto" as any).delete().eq("id", r.id); qc.invalidateQueries({ queryKey: ["pjecalc_cartao_ponto", caseId] }); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

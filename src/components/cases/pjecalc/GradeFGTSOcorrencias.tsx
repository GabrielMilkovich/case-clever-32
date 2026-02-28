import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";

interface Props { caseId: string; }

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function GradeFGTSOcorrencias({ caseId }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [showRegerar, setShowRegerar] = useState(false);
  const queryKey = ["pjecalc_fgts_ocorrencias", caseId];

  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_fgts_ocorrencias")
        .select("*").eq("calculo_id", caseId).order("competencia");
      return (data || []) as any[];
    },
  });

  const gerarOcorrencias = async (strategy: string) => {
    setGenerating(true);
    try {
      if (strategy === 'SOBRESCREVER_TUDO') {
        await supabase.from("pjecalc_fgts_ocorrencias").delete().eq("calculo_id", caseId);
      } else {
        await supabase.from("pjecalc_fgts_ocorrencias").delete().eq("calculo_id", caseId).eq("origem", "CALCULADA");
      }

      // Get params for period
      const { data: params } = await supabase.from("pjecalc_parametros").select("*").eq("case_id", caseId).maybeSingle();
      if (!params?.data_admissao) { toast.error("Preencha parâmetros primeiro."); setGenerating(false); return; }

      const start = new Date(params.data_admissao + "T00:00:00");
      const end = new Date((params.data_demissao || new Date().toISOString().slice(0, 10)) + "T00:00:00");
      const rows: any[] = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);

      const existingInformadas = strategy === 'MANTER_ALTERACOES_MANUAIS'
        ? ocorrencias.filter((o: any) => o.origem === 'INFORMADA').map((o: any) => o.competencia)
        : [];

      while (cur <= end) {
        const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        if (!existingInformadas.includes(comp)) {
          rows.push({
            calculo_id: caseId, competencia: comp, ativa: true, origem: 'CALCULADA',
            base_historico: 0, base_verbas: 0, base_total: 0,
            aliquota: 0.08, valor: 0, multa: 0, recolhido: 0,
          });
        }
        cur.setMonth(cur.getMonth() + 1);
      }

      if (rows.length > 0) await supabase.from("pjecalc_fgts_ocorrencias").insert(rows);
      qc.invalidateQueries({ queryKey });
      toast.success(`${rows.length} ocorrências FGTS geradas`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); setShowRegerar(false); }
  };

  const updateCell = async (id: string, field: string, value: number | boolean) => {
    const updates: any = { [field]: value, origem: 'INFORMADA', updated_at: new Date().toISOString() };
    const row = ocorrencias.find((o: any) => o.id === id);
    if (row && typeof value === 'number' && ['base_historico', 'base_verbas', 'aliquota'].includes(field)) {
      const newRow = { ...row, [field]: value };
      const baseTotal = (newRow.base_historico || 0) + (newRow.base_verbas || 0);
      updates.base_total = baseTotal;
      updates.valor = Math.round(baseTotal * (newRow.aliquota || 0.08) * 100) / 100;
    }
    await supabase.from("pjecalc_fgts_ocorrencias").update(updates).eq("id", id);
    qc.invalidateQueries({ queryKey });
  };

  const totalValor = ocorrencias.filter((o: any) => o.ativa).reduce((s: number, o: any) => s + (o.valor || 0), 0);
  const totalRecolhido = ocorrencias.filter((o: any) => o.ativa).reduce((s: number, o: any) => s + (o.recolhido || 0), 0);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Grade de Depósitos FGTS</h3>
        <Button size="sm" variant="outline" onClick={() => setShowRegerar(true)} disabled={generating}>
          <RefreshCw className="h-3 w-3 mr-1" /> Regerar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-3"><div className="text-[10px] text-muted-foreground">Total Depósitos</div><div className="font-mono font-bold text-sm">{fmt(totalValor)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] text-muted-foreground">Total Recolhido</div><div className="font-mono font-bold text-sm">{fmt(totalRecolhido)}</div></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : ocorrencias.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">Clique em "Regerar" para gerar ocorrências FGTS.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-muted/50">
              <th className="p-2 w-6">✓</th>
              <th className="p-2 text-left font-medium">Comp.</th>
              <th className="p-2 text-center font-medium w-14">Origem</th>
              <th className="p-2 text-center font-medium">Base Hist.</th>
              <th className="p-2 text-center font-medium">Base Verbas</th>
              <th className="p-2 text-right font-medium">Base Total</th>
              <th className="p-2 text-center font-medium">Alíq.</th>
              <th className="p-2 text-right font-medium">Valor</th>
              <th className="p-2 text-center font-medium">Recolhido</th>
            </tr></thead>
            <tbody>
              {ocorrencias.map((o: any) => (
                <tr key={o.id} className={`border-b border-border/30 hover:bg-muted/20 ${!o.ativa ? 'opacity-40' : ''}`}>
                  <td className="p-1 text-center"><Checkbox checked={o.ativa} onCheckedChange={v => updateCell(o.id, 'ativa', !!v)} /></td>
                  <td className="p-2 font-mono">{o.competencia}</td>
                  <td className="p-1 text-center"><Badge variant={o.origem === 'INFORMADA' ? 'default' : 'secondary'} className="text-[9px] px-1">{o.origem === 'INFORMADA' ? 'INF' : 'CALC'}</Badge></td>
                  <td className="p-1 text-center"><Input type="number" step="0.01" defaultValue={o.base_historico || 0} className="h-7 text-xs w-20 text-center mx-auto" onBlur={e => updateCell(o.id, 'base_historico', parseFloat(e.target.value) || 0)} /></td>
                  <td className="p-1 text-center"><Input type="number" step="0.01" defaultValue={o.base_verbas || 0} className="h-7 text-xs w-20 text-center mx-auto" onBlur={e => updateCell(o.id, 'base_verbas', parseFloat(e.target.value) || 0)} /></td>
                  <td className="p-2 text-right font-mono">{(o.base_total || 0).toFixed(2)}</td>
                  <td className="p-1 text-center"><Input type="number" step="0.01" defaultValue={(o.aliquota || 0.08) * 100} className="h-7 text-xs w-14 text-center mx-auto" onBlur={e => updateCell(o.id, 'aliquota', (parseFloat(e.target.value) || 8) / 100)} /></td>
                  <td className="p-2 text-right font-mono font-medium">{(o.valor || 0).toFixed(2)}</td>
                  <td className="p-1 text-center"><Input type="number" step="0.01" defaultValue={o.recolhido || 0} className="h-7 text-xs w-20 text-center mx-auto" onBlur={e => updateCell(o.id, 'recolhido', parseFloat(e.target.value) || 0)} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-muted/30 font-bold">
              <td colSpan={7} className="p-2 text-right">TOTAIS</td>
              <td className="p-2 text-right font-mono">{totalValor.toFixed(2)}</td>
              <td className="p-2 text-center font-mono">{totalRecolhido.toFixed(2)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}

      <Dialog open={showRegerar} onOpenChange={setShowRegerar}>
        <DialogContent>
          <DialogHeader><DialogTitle>Regerar Ocorrências FGTS</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => gerarOcorrencias('MANTER_ALTERACOES_MANUAIS')} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Manter manuais
            </Button>
            <Button className="w-full justify-start" variant="destructive" onClick={() => gerarOcorrencias('SOBRESCREVER_TUDO')} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Sobrescrever tudo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

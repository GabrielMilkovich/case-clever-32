import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Loader2, Copy } from "lucide-react";

interface Props { caseId: string; }

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function GradeCSOcorrencias({ caseId }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [showRegerar, setShowRegerar] = useState(false);
  const [regerarAba, setRegerarAba] = useState<'DEVIDOS' | 'PAGOS'>('DEVIDOS');

  const queryKeyD = ["pjecalc_cs_ocorrencias", caseId, "DEVIDOS"];
  const queryKeyP = ["pjecalc_cs_ocorrencias", caseId, "PAGOS"];

  const { data: devidos = [] } = useQuery({
    queryKey: queryKeyD,
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_cs_ocorrencias" as any)
        .select("*").eq("calculo_id", caseId).eq("aba", "DEVIDOS").order("competencia");
      return (data || []) as any[];
    },
  });

  const { data: pagos = [] } = useQuery({
    queryKey: queryKeyP,
    queryFn: async () => {
      const { data } = await supabase.from("pjecalc_cs_ocorrencias" as any)
        .select("*").eq("calculo_id", caseId).eq("aba", "PAGOS").order("competencia");
      return (data || []) as any[];
    },
  });

  const gerarOcorrencias = async (aba: 'DEVIDOS' | 'PAGOS', strategy: string) => {
    setGenerating(true);
    try {
      if (strategy === 'SOBRESCREVER_TUDO') {
        await supabase.from("pjecalc_cs_ocorrencias" as any).delete().eq("calculo_id", caseId).eq("aba", aba);
      } else {
        await supabase.from("pjecalc_cs_ocorrencias" as any).delete().eq("calculo_id", caseId).eq("aba", aba).eq("origem", "CALCULADA");
      }

      const { data: params } = await supabase.from("pjecalc_parametros" as any).select("*").eq("case_id", caseId).maybeSingle();
      if (!params?.data_admissao) { toast.error("Preencha parâmetros."); setGenerating(false); return; }

      const start = new Date(params.data_admissao + "T00:00:00");
      const end = new Date((params.data_demissao || new Date().toISOString().slice(0, 10)) + "T00:00:00");
      const existingOcs = aba === 'DEVIDOS' ? devidos : pagos;
      const existingInformadas = strategy === 'MANTER_ALTERACOES_MANUAIS'
        ? existingOcs.filter((o: any) => o.origem === 'INFORMADA').map((o: any) => o.competencia) : [];

      const rows: any[] = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        if (!existingInformadas.includes(comp)) {
          rows.push({
            calculo_id: caseId, competencia: comp, aba, ativa: true, origem: 'CALCULADA',
            base: 0, segurado: 0, empresa: 0, sat: 0, terceiros: 0, total: 0,
          });
        }
        cur.setMonth(cur.getMonth() + 1);
      }

      if (rows.length > 0) await supabase.from("pjecalc_cs_ocorrencias" as any).insert(rows);
      qc.invalidateQueries({ queryKey: aba === 'DEVIDOS' ? queryKeyD : queryKeyP });
      toast.success(`${rows.length} ocorrências CS (${aba}) geradas`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); setShowRegerar(false); }
  };

  const updateCell = async (id: string, field: string, value: number | boolean, aba: string) => {
    const updates: any = { [field]: value, origem: 'INFORMADA', updated_at: new Date().toISOString() };
    await supabase.from("pjecalc_cs_ocorrencias" as any).update(updates).eq("id", id);
    qc.invalidateQueries({ queryKey: aba === 'DEVIDOS' ? queryKeyD : queryKeyP });
  };

  const copiarDevidosParaPagos = async () => {
    await supabase.from("pjecalc_cs_ocorrencias" as any).delete().eq("calculo_id", caseId).eq("aba", "PAGOS");
    const rows = devidos.map((d: any) => ({
      calculo_id: caseId, competencia: d.competencia, aba: 'PAGOS', ativa: d.ativa, origem: 'CALCULADA',
      base: d.base, segurado: d.segurado, empresa: d.empresa, sat: d.sat, terceiros: d.terceiros, total: d.total,
    }));
    if (rows.length > 0) await supabase.from("pjecalc_cs_ocorrencias" as any).insert(rows);
    qc.invalidateQueries({ queryKey: queryKeyP });
    toast.success(`${rows.length} valores copiados Devidos → Pagos`);
  };

  const renderGrade = (data: any[], aba: 'DEVIDOS' | 'PAGOS') => {
    const totalBase = data.filter((o: any) => o.ativa).reduce((s: number, o: any) => s + (o.base || 0), 0);
    const totalSeg = data.filter((o: any) => o.ativa).reduce((s: number, o: any) => s + (o.segurado || 0), 0);
    const totalEmp = data.filter((o: any) => o.ativa).reduce((s: number, o: any) => s + (o.empresa || 0), 0);

    return data.length === 0 ? (
      <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">
        Clique em "Regerar" para gerar ocorrências CS ({aba}).
      </CardContent></Card>
    ) : (
      <>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Card><CardContent className="p-2"><div className="text-[10px] text-muted-foreground">Base Total</div><div className="font-mono font-bold text-xs">{fmt(totalBase)}</div></CardContent></Card>
          <Card><CardContent className="p-2"><div className="text-[10px] text-muted-foreground">Segurado</div><div className="font-mono font-bold text-xs">{fmt(totalSeg)}</div></CardContent></Card>
          <Card><CardContent className="p-2"><div className="text-[10px] text-muted-foreground">Empresa</div><div className="font-mono font-bold text-xs">{fmt(totalEmp)}</div></CardContent></Card>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-muted/50">
              <th className="p-2 w-6">✓</th>
              <th className="p-2 text-left font-medium">Comp.</th>
              <th className="p-2 text-center font-medium w-14">Orig.</th>
              <th className="p-2 text-center font-medium">Base</th>
              <th className="p-2 text-center font-medium">Segurado</th>
              <th className="p-2 text-center font-medium">Empresa</th>
              <th className="p-2 text-center font-medium">SAT</th>
              <th className="p-2 text-center font-medium">Terceiros</th>
            </tr></thead>
            <tbody>
              {data.map((o: any) => (
                <tr key={o.id} className={`border-b border-border/30 hover:bg-muted/20 ${!o.ativa ? 'opacity-40' : ''}`}>
                  <td className="p-1 text-center"><Checkbox checked={o.ativa} onCheckedChange={v => updateCell(o.id, 'ativa', !!v, aba)} /></td>
                  <td className="p-2 font-mono">{o.competencia}</td>
                  <td className="p-1 text-center"><Badge variant={o.origem === 'INFORMADA' ? 'default' : 'secondary'} className="text-[9px] px-1">{o.origem === 'INFORMADA' ? 'INF' : 'CALC'}</Badge></td>
                  {(['base', 'segurado', 'empresa', 'sat', 'terceiros'] as const).map(f => (
                    <td key={f} className="p-1 text-center">
                      <Input type="number" step="0.01" defaultValue={o[f] || 0} className="h-7 text-xs w-20 text-center mx-auto"
                        onBlur={e => updateCell(o.id, f, parseFloat(e.target.value) || 0, aba)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Grade de Contribuição Social</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copiarDevidosParaPagos} className="text-[10px] h-7">
            <Copy className="h-3 w-3 mr-1" /> Devidos → Pagos
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowRegerar(true)} disabled={generating}>
            <RefreshCw className="h-3 w-3 mr-1" /> Regerar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="DEVIDOS">
        <TabsList className="h-8">
          <TabsTrigger value="DEVIDOS" className="text-xs h-7">Salários Devidos</TabsTrigger>
          <TabsTrigger value="PAGOS" className="text-xs h-7">Salários Pagos</TabsTrigger>
        </TabsList>
        <TabsContent value="DEVIDOS">{renderGrade(devidos, 'DEVIDOS')}</TabsContent>
        <TabsContent value="PAGOS">{renderGrade(pagos, 'PAGOS')}</TabsContent>
      </Tabs>

      <Dialog open={showRegerar} onOpenChange={setShowRegerar}>
        <DialogContent>
          <DialogHeader><DialogTitle>Regerar CS Ocorrências</DialogTitle></DialogHeader>
          <div className="space-y-2 mb-3">
            <p className="text-xs text-muted-foreground">Para qual aba?</p>
            <div className="flex gap-2">
              <Button size="sm" variant={regerarAba === 'DEVIDOS' ? 'default' : 'outline'} onClick={() => setRegerarAba('DEVIDOS')}>Devidos</Button>
              <Button size="sm" variant={regerarAba === 'PAGOS' ? 'default' : 'outline'} onClick={() => setRegerarAba('PAGOS')}>Pagos</Button>
            </div>
          </div>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => gerarOcorrencias(regerarAba, 'MANTER_ALTERACOES_MANUAIS')} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Manter manuais
            </Button>
            <Button className="w-full justify-start" variant="destructive" onClick={() => gerarOcorrencias(regerarAba, 'SOBRESCREVER_TUDO')} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Sobrescrever tudo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

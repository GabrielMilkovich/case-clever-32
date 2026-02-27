import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

interface FaltaRow {
  id?: string;
  data_inicial: string;
  data_final: string;
  justificada: boolean;
  justificativa: string;
  _isNew?: boolean;
}

export default function Faltas({ caseId }: Props) {
  const [rows, setRows] = useState<FaltaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("pjecalc_faltas").select("*").eq("case_id", caseId).order("data_inicial").then(({ data }) => {
      setRows((data as FaltaRow[]) || []);
      setLoading(false);
    });
  }, [caseId]);

  const addRow = () => setRows([...rows, { data_inicial: "", data_final: "", justificada: false, justificativa: "", _isNew: true }]);

  const updateRow = (idx: number, key: string, val: any) => {
    const updated = [...rows];
    (updated[idx] as any)[key] = val;
    setRows(updated);
  };

  const removeRow = async (idx: number) => {
    if (rows[idx].id) await supabase.from("pjecalc_faltas").delete().eq("id", rows[idx].id);
    setRows(rows.filter((_, i) => i !== idx));
  };

  const diasFalta = (row: FaltaRow): number => {
    if (!row.data_inicial || !row.data_final) return 0;
    const d1 = new Date(row.data_inicial);
    const d2 = new Date(row.data_final);
    return Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1);
  };

  const handleSave = async () => {
    for (const row of rows) {
      const payload = { case_id: caseId, data_inicial: row.data_inicial, data_final: row.data_final, justificada: row.justificada, justificativa: row.justificativa };
      if (row.id && !row._isNew) {
        await supabase.from("pjecalc_faltas").update(payload).eq("id", row.id);
      } else {
        const { data } = await supabase.from("pjecalc_faltas").insert(payload).select().single();
        if (data) {
          const idx = rows.indexOf(row);
          const updated = [...rows];
          updated[idx] = { ...data, _isNew: false } as any;
          setRows(updated);
        }
      }
    }
    toast.success("Faltas salvas");
  };

  const totalDias = rows.reduce((sum, r) => sum + diasFalta(r), 0);
  const totalJustificadas = rows.filter(r => r.justificada).reduce((sum, r) => sum + diasFalta(r), 0);
  const totalNaoJust = totalDias - totalJustificadas;

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">04 — Faltas</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow} className="h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
          <Button size="sm" onClick={handleSave} className="h-7 text-xs"><Save className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded p-2 text-center">
          <div className="text-[10px] text-muted-foreground">Total Dias</div>
          <div className="text-sm font-bold">{totalDias}</div>
        </div>
        <div className="border rounded p-2 text-center">
          <div className="text-[10px] text-muted-foreground">Justificadas</div>
          <div className="text-sm font-bold text-green-600">{totalJustificadas}</div>
        </div>
        <div className="border rounded p-2 text-center">
          <div className="text-[10px] text-muted-foreground">Não Justificadas</div>
          <div className="text-sm font-bold text-destructive">{totalNaoJust}</div>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] h-7 py-0 w-8">#</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-32">Data Inicial</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-32">Data Final</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-14 text-center">Dias</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-16 text-center">Justif.</TableHead>
              <TableHead className="text-[10px] h-7 py-0">Justificativa</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Nenhuma falta registrada.</TableCell></TableRow>
            ) : rows.map((row, idx) => (
              <TableRow key={row.id || `new-${idx}`} className="hover:bg-muted/30">
                <TableCell className="py-1 text-[11px] text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="py-1"><Input type="date" value={row.data_inicial} onChange={(e) => updateRow(idx, "data_inicial", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                <TableCell className="py-1"><Input type="date" value={row.data_final} onChange={(e) => updateRow(idx, "data_final", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                <TableCell className="py-1 text-center text-[11px] font-medium">{diasFalta(row)}</TableCell>
                <TableCell className="py-1 text-center"><Switch checked={row.justificada} onCheckedChange={(v) => updateRow(idx, "justificada", v)} className="scale-[0.6]" /></TableCell>
                <TableCell className="py-1"><Input value={row.justificativa || ""} onChange={(e) => updateRow(idx, "justificativa", e.target.value)} className="h-6 text-[11px]" placeholder="Motivo..." /></TableCell>
                <TableCell className="py-1"><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeRow(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

export default function Faltas({ caseId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("pjecalc_faltas").select("*").eq("case_id", caseId).order("data_inicial").then(({ data }) => {
      setRows(data || []);
      setLoading(false);
    });
  }, [caseId]);

  const addRow = () => setRows([...rows, { data_inicial: "", data_final: "", justificada: false, justificativa: "", _isNew: true }]);

  const updateRow = (idx: number, key: string, val: any) => {
    const updated = [...rows];
    updated[idx][key] = val;
    setRows(updated);
  };

  const removeRow = async (idx: number) => {
    if (rows[idx].id) await supabase.from("pjecalc_faltas").delete().eq("id", rows[idx].id);
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    for (const row of rows) {
      const payload = { case_id: caseId, data_inicial: row.data_inicial, data_final: row.data_final, justificada: row.justificada, justificativa: row.justificativa };
      if (row.id && !row._isNew) {
        await supabase.from("pjecalc_faltas").update(payload).eq("id", row.id);
      } else {
        await supabase.from("pjecalc_faltas").insert(payload);
      }
    }
    toast.success("Faltas salvas");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">04 — Faltas</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-36">Data Inicial</TableHead>
              <TableHead className="text-xs w-36">Data Final</TableHead>
              <TableHead className="text-xs w-20 text-center">Justificada</TableHead>
              <TableHead className="text-xs">Justificativa</TableHead>
              <TableHead className="text-xs w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhuma falta registrada.</TableCell></TableRow>
            ) : rows.map((row, idx) => (
              <TableRow key={row.id || idx}>
                <TableCell><Input type="date" value={row.data_inicial} onChange={(e) => updateRow(idx, "data_inicial", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell><Input type="date" value={row.data_final} onChange={(e) => updateRow(idx, "data_final", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell className="text-center"><Switch checked={row.justificada} onCheckedChange={(v) => updateRow(idx, "justificada", v)} /></TableCell>
                <TableCell><Input value={row.justificativa || ""} onChange={(e) => updateRow(idx, "justificativa", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeRow(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

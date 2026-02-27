import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

export default function Ferias({ caseId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("pjecalc_ferias").select("*").eq("case_id", caseId).order("periodo_aquisitivo_inicio").then(({ data }) => {
      setRows(data || []);
      setLoading(false);
    });
  }, [caseId]);

  const addRow = () => setRows([...rows, {
    relativas: "", periodo_aquisitivo_inicio: "", periodo_aquisitivo_fim: "",
    periodo_concessivo_inicio: "", periodo_concessivo_fim: "",
    prazo_dias: 30, situacao: "gozadas", dobra: false, abono: false, _isNew: true,
  }]);

  const updateRow = (idx: number, key: string, val: any) => {
    const updated = [...rows];
    updated[idx][key] = val;
    setRows(updated);
  };

  const removeRow = async (idx: number) => {
    if (rows[idx].id) await supabase.from("pjecalc_ferias").delete().eq("id", rows[idx].id);
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    for (const row of rows) {
      const payload = {
        case_id: caseId, relativas: row.relativas,
        periodo_aquisitivo_inicio: row.periodo_aquisitivo_inicio,
        periodo_aquisitivo_fim: row.periodo_aquisitivo_fim,
        periodo_concessivo_inicio: row.periodo_concessivo_inicio,
        periodo_concessivo_fim: row.periodo_concessivo_fim,
        prazo_dias: row.prazo_dias, situacao: row.situacao,
        dobra: row.dobra, abono: row.abono,
      };
      if (row.id && !row._isNew) {
        await supabase.from("pjecalc_ferias").update(payload).eq("id", row.id);
      } else {
        await supabase.from("pjecalc_ferias").insert(payload);
      }
    }
    toast.success("Férias salvas");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">05 — Férias</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Relativas a</TableHead>
              <TableHead className="text-xs">Aquisitivo Início</TableHead>
              <TableHead className="text-xs">Aquisitivo Fim</TableHead>
              <TableHead className="text-xs">Concessivo Início</TableHead>
              <TableHead className="text-xs">Concessivo Fim</TableHead>
              <TableHead className="text-xs w-16">Dias</TableHead>
              <TableHead className="text-xs w-28">Situação</TableHead>
              <TableHead className="text-xs w-14 text-center">Dobra</TableHead>
              <TableHead className="text-xs w-14 text-center">Abono</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Nenhum período de férias.</TableCell></TableRow>
            ) : rows.map((row, idx) => (
              <TableRow key={row.id || idx}>
                <TableCell><Input value={row.relativas} onChange={(e) => updateRow(idx, "relativas", e.target.value)} className="h-7 text-xs" placeholder="2023/2024" /></TableCell>
                <TableCell><Input type="date" value={row.periodo_aquisitivo_inicio} onChange={(e) => updateRow(idx, "periodo_aquisitivo_inicio", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell><Input type="date" value={row.periodo_aquisitivo_fim} onChange={(e) => updateRow(idx, "periodo_aquisitivo_fim", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell><Input type="date" value={row.periodo_concessivo_inicio} onChange={(e) => updateRow(idx, "periodo_concessivo_inicio", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell><Input type="date" value={row.periodo_concessivo_fim} onChange={(e) => updateRow(idx, "periodo_concessivo_fim", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell><Input type="number" value={row.prazo_dias} onChange={(e) => updateRow(idx, "prazo_dias", parseInt(e.target.value))} className="h-7 text-xs w-14" /></TableCell>
                <TableCell>
                  <Select value={row.situacao} onValueChange={(v) => updateRow(idx, "situacao", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gozadas">Gozadas</SelectItem>
                      <SelectItem value="indenizadas">Indenizadas</SelectItem>
                      <SelectItem value="perdidas">Perdidas</SelectItem>
                      <SelectItem value="vencidas">Vencidas</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center"><Switch checked={row.dobra} onCheckedChange={(v) => updateRow(idx, "dobra", v)} /></TableCell>
                <TableCell className="text-center"><Switch checked={row.abono} onCheckedChange={(v) => updateRow(idx, "abono", v)} /></TableCell>
                <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeRow(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

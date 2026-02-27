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

interface HistoricoRow {
  id?: string;
  nome: string;
  tipo_valor: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_informado: number | null;
  incidencia_fgts: boolean;
  incidencia_cs: boolean;
  _isNew?: boolean;
}

export default function HistoricoSalarial({ caseId }: Props) {
  const [rows, setRows] = useState<HistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("pjecalc_historico_salarial").select("*").eq("case_id", caseId).order("periodo_inicio").then(({ data }) => {
      setRows((data as any[]) || []);
      setLoading(false);
    });
  }, [caseId]);

  const addRow = () => {
    setRows([...rows, {
      nome: "Salário Base",
      tipo_valor: "informado",
      periodo_inicio: "",
      periodo_fim: "",
      valor_informado: null,
      incidencia_fgts: true,
      incidencia_cs: true,
      _isNew: true,
    }]);
  };

  const updateRow = (idx: number, key: string, val: any) => {
    const updated = [...rows];
    (updated[idx] as any)[key] = val;
    setRows(updated);
  };

  const removeRow = async (idx: number) => {
    const row = rows[idx];
    if (row.id) await supabase.from("pjecalc_historico_salarial").delete().eq("id", row.id);
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    for (const row of rows) {
      const payload: any = {
        case_id: caseId,
        nome: row.nome,
        tipo_valor: row.tipo_valor,
        periodo_inicio: row.periodo_inicio,
        periodo_fim: row.periodo_fim,
        valor_informado: row.valor_informado,
        incidencia_fgts: row.incidencia_fgts,
        incidencia_cs: row.incidencia_cs,
      };
      if (row.id && !row._isNew) {
        await supabase.from("pjecalc_historico_salarial").update(payload).eq("id", row.id);
      } else {
        await supabase.from("pjecalc_historico_salarial").insert(payload);
      }
    }
    toast.success("Histórico salarial salvo");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">03 — Histórico Salarial</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-40">Nome</TableHead>
              <TableHead className="text-xs w-28">Tipo</TableHead>
              <TableHead className="text-xs w-32">Início</TableHead>
              <TableHead className="text-xs w-32">Fim</TableHead>
              <TableHead className="text-xs w-28 text-right">Valor (R$)</TableHead>
              <TableHead className="text-xs w-16 text-center">FGTS</TableHead>
              <TableHead className="text-xs w-16 text-center">CS</TableHead>
              <TableHead className="text-xs w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Nenhum registro. Clique em "Adicionar".</TableCell></TableRow>
            ) : rows.map((row, idx) => (
              <TableRow key={row.id || idx}>
                <TableCell><Input value={row.nome} onChange={(e) => updateRow(idx, "nome", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell>
                  <Select value={row.tipo_valor} onValueChange={(v) => updateRow(idx, "tipo_valor", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="informado">Informado</SelectItem>
                      <SelectItem value="salario_minimo">Salário Mínimo</SelectItem>
                      <SelectItem value="piso_categoria">Piso Categoria</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input type="date" value={row.periodo_inicio} onChange={(e) => updateRow(idx, "periodo_inicio", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell><Input type="date" value={row.periodo_fim} onChange={(e) => updateRow(idx, "periodo_fim", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell><Input type="number" step="0.01" value={row.valor_informado ?? ""} onChange={(e) => updateRow(idx, "valor_informado", parseFloat(e.target.value) || null)} className="h-7 text-xs text-right" /></TableCell>
                <TableCell className="text-center"><Switch checked={row.incidencia_fgts} onCheckedChange={(v) => updateRow(idx, "incidencia_fgts", v)} /></TableCell>
                <TableCell className="text-center"><Switch checked={row.incidencia_cs} onCheckedChange={(v) => updateRow(idx, "incidencia_cs", v)} /></TableCell>
                <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeRow(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

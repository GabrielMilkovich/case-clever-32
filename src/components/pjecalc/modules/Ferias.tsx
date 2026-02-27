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

interface FeriasRow {
  id?: string;
  relativas: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_concessivo_inicio: string;
  periodo_concessivo_fim: string;
  prazo_dias: number;
  situacao: string;
  dobra: boolean;
  abono: boolean;
  gozo_inicio?: string;
  gozo_fim?: string;
  _isNew?: boolean;
}

const SITUACOES = [
  { value: "gozadas", label: "Gozadas" },
  { value: "indenizadas", label: "Indenizadas" },
  { value: "perdidas", label: "Perdidas (Art. 130 CLT)" },
  { value: "vencidas", label: "Vencidas (dobra)" },
  { value: "proporcionais", label: "Proporcionais" },
];

export default function Ferias({ caseId }: Props) {
  const [rows, setRows] = useState<FeriasRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("pjecalc_ferias").select("*").eq("case_id", caseId).order("periodo_aquisitivo_inicio").then(({ data }) => {
      setRows((data as FeriasRow[]) || []);
      setLoading(false);
    });
  }, [caseId]);

  const addRow = () => setRows([...rows, {
    relativas: "", periodo_aquisitivo_inicio: "", periodo_aquisitivo_fim: "",
    periodo_concessivo_inicio: "", periodo_concessivo_fim: "",
    prazo_dias: 30, situacao: "gozadas", dobra: false, abono: false,
    gozo_inicio: "", gozo_fim: "", _isNew: true,
  }]);

  const updateRow = (idx: number, key: string, val: any) => {
    const updated = [...rows];
    (updated[idx] as any)[key] = val;
    // Auto-set dobra if vencidas
    if (key === "situacao" && val === "vencidas") updated[idx].dobra = true;
    setRows(updated);
  };

  const removeRow = async (idx: number) => {
    if (rows[idx].id) await supabase.from("pjecalc_ferias").delete().eq("id", rows[idx].id);
    setRows(rows.filter((_, i) => i !== idx));
  };

  const gerarPeriodos = async () => {
    // Fetch contract to auto-generate vacation periods
    const { data: params } = await supabase.from("pjecalc_parametros").select("data_admissao, data_demissao").eq("case_id", caseId).maybeSingle();
    if (!params?.data_admissao) { toast.error("Preencha a data de admissão nos Parâmetros"); return; }

    const admissao = new Date(params.data_admissao);
    const demissao = params.data_demissao ? new Date(params.data_demissao) : new Date();
    const newRows: FeriasRow[] = [];

    let aqInicio = new Date(admissao);
    let count = 0;
    while (aqInicio < demissao && count < 30) {
      const aqFim = new Date(aqInicio.getFullYear() + 1, aqInicio.getMonth(), aqInicio.getDate() - 1);
      const concInicio = new Date(aqFim.getFullYear(), aqFim.getMonth(), aqFim.getDate() + 1);
      const concFim = new Date(concInicio.getFullYear() + 1, concInicio.getMonth(), concInicio.getDate() - 1);

      const isProporcional = aqFim > demissao;
      newRows.push({
        relativas: `${aqInicio.getFullYear()}/${aqFim.getFullYear()}`,
        periodo_aquisitivo_inicio: aqInicio.toISOString().slice(0, 10),
        periodo_aquisitivo_fim: (isProporcional ? demissao : aqFim).toISOString().slice(0, 10),
        periodo_concessivo_inicio: isProporcional ? "" : concInicio.toISOString().slice(0, 10),
        periodo_concessivo_fim: isProporcional ? "" : concFim.toISOString().slice(0, 10),
        prazo_dias: isProporcional ? Math.floor(((demissao.getTime() - aqInicio.getTime()) / 86400000 / 365) * 30) : 30,
        situacao: isProporcional ? "proporcionais" : "gozadas",
        dobra: false, abono: false, _isNew: true,
      });

      aqInicio = new Date(aqInicio.getFullYear() + 1, aqInicio.getMonth(), aqInicio.getDate());
      count++;
    }

    setRows(newRows);
    toast.success(`${newRows.length} períodos gerados`);
  };

  const handleSave = async () => {
    for (const row of rows) {
      const payload: any = {
        case_id: caseId, relativas: row.relativas,
        periodo_aquisitivo_inicio: row.periodo_aquisitivo_inicio,
        periodo_aquisitivo_fim: row.periodo_aquisitivo_fim,
        periodo_concessivo_inicio: row.periodo_concessivo_inicio || null,
        periodo_concessivo_fim: row.periodo_concessivo_fim || null,
        prazo_dias: row.prazo_dias, situacao: row.situacao,
        dobra: row.dobra, abono: row.abono,
      };
      if (row.id && !row._isNew) {
        await supabase.from("pjecalc_ferias").update(payload).eq("id", row.id);
      } else {
        const { data } = await supabase.from("pjecalc_ferias").insert(payload).select().single();
        if (data) {
          const idx = rows.indexOf(row);
          const updated = [...rows];
          updated[idx] = { ...data, _isNew: false } as any;
          setRows(updated);
        }
      }
    }
    toast.success("Férias salvas");
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">05 — Férias</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={gerarPeriodos} className="h-7 text-xs">Gerar Períodos</Button>
          <Button size="sm" variant="outline" onClick={addRow} className="h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
          <Button size="sm" onClick={handleSave} className="h-7 text-xs"><Save className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] h-7 py-0 w-8">#</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-24">Relativas a</TableHead>
              <TableHead className="text-[10px] h-7 py-0">Aquisitivo Início</TableHead>
              <TableHead className="text-[10px] h-7 py-0">Aquisitivo Fim</TableHead>
              <TableHead className="text-[10px] h-7 py-0">Concessivo Início</TableHead>
              <TableHead className="text-[10px] h-7 py-0">Concessivo Fim</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-14">Dias</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-28">Situação</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-12 text-center">Dobra</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-12 text-center">Abono</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-6">Nenhum período. Use "Gerar Períodos" ou "Adicionar".</TableCell></TableRow>
            ) : rows.map((row, idx) => (
              <TableRow key={row.id || `new-${idx}`} className="hover:bg-muted/30">
                <TableCell className="py-1 text-[11px] text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="py-1"><Input value={row.relativas} onChange={(e) => updateRow(idx, "relativas", e.target.value)} className="h-6 text-[11px]" placeholder="2023/2024" /></TableCell>
                <TableCell className="py-1"><Input type="date" value={row.periodo_aquisitivo_inicio} onChange={(e) => updateRow(idx, "periodo_aquisitivo_inicio", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                <TableCell className="py-1"><Input type="date" value={row.periodo_aquisitivo_fim} onChange={(e) => updateRow(idx, "periodo_aquisitivo_fim", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                <TableCell className="py-1"><Input type="date" value={row.periodo_concessivo_inicio || ""} onChange={(e) => updateRow(idx, "periodo_concessivo_inicio", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                <TableCell className="py-1"><Input type="date" value={row.periodo_concessivo_fim || ""} onChange={(e) => updateRow(idx, "periodo_concessivo_fim", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                <TableCell className="py-1"><Input type="number" value={row.prazo_dias} onChange={(e) => updateRow(idx, "prazo_dias", parseInt(e.target.value) || 30)} className="h-6 text-[11px] w-12" /></TableCell>
                <TableCell className="py-1">
                  <Select value={row.situacao} onValueChange={(v) => updateRow(idx, "situacao", v)}>
                    <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SITUACOES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-1 text-center"><Switch checked={row.dobra} onCheckedChange={(v) => updateRow(idx, "dobra", v)} className="scale-[0.6]" /></TableCell>
                <TableCell className="py-1 text-center"><Switch checked={row.abono} onCheckedChange={(v) => updateRow(idx, "abono", v)} className="scale-[0.6]" /></TableCell>
                <TableCell className="py-1"><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeRow(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

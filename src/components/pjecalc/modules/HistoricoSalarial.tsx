import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

interface HistoricoRow {
  id?: string;
  nome: string;
  tipo_valor: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_informado: number | null;
  quantidade: number | null;
  base_referencia: string | null;
  categoria_piso: string | null;
  incidencia_fgts: boolean;
  incidencia_cs: boolean;
  fgts_recolhido: boolean;
  cs_recolhida: boolean;
  _isNew?: boolean;
}

interface OcorrenciaRow {
  id?: string;
  historico_id: string;
  competencia: string;
  valor: number;
  tipo: string;
}

export default function HistoricoSalarial({ caseId }: Props) {
  const [rows, setRows] = useState<HistoricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaRow[]>([]);

  useEffect(() => {
    supabase.from("pjecalc_historico_salarial").select("*").eq("case_id", caseId).order("periodo_inicio").then(({ data }) => {
      setRows((data as any[]) || []);
      setLoading(false);
    });
  }, [caseId]);

  const addRow = () => {
    setRows([...rows, {
      nome: "Salário Base", tipo_valor: "informado",
      periodo_inicio: "", periodo_fim: "",
      valor_informado: null, quantidade: null,
      base_referencia: null, categoria_piso: null,
      incidencia_fgts: true, incidencia_cs: true,
      fgts_recolhido: false, cs_recolhida: false,
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
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const toggleOcorrencias = async (idx: number) => {
    if (expandedIdx === idx) { setExpandedIdx(null); return; }
    const row = rows[idx];
    if (!row.id) { setExpandedIdx(idx); setOcorrencias([]); return; }
    const { data } = await supabase.from("pjecalc_historico_ocorrencias")
      .select("*").eq("historico_id", row.id).order("competencia");
    setOcorrencias((data as OcorrenciaRow[]) || []);
    setExpandedIdx(idx);
  };

  const gerarOcorrencias = async (idx: number) => {
    const row = rows[idx];
    if (!row.id || !row.periodo_inicio || !row.periodo_fim) {
      toast.error("Salve o registro e preencha início/fim antes de gerar ocorrências");
      return;
    }
    const start = new Date(row.periodo_inicio);
    const end = new Date(row.periodo_fim);
    const newOcs: OcorrenciaRow[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      const comp = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      newOcs.push({ historico_id: row.id, competencia: comp, valor: row.valor_informado || 0, tipo: "calculado" });
      current.setMonth(current.getMonth() + 1);
    }
    // Delete existing then insert
    await supabase.from("pjecalc_historico_ocorrencias").delete().eq("historico_id", row.id);
    if (newOcs.length > 0) {
      await supabase.from("pjecalc_historico_ocorrencias").insert(newOcs);
    }
    const { data } = await supabase.from("pjecalc_historico_ocorrencias")
      .select("*").eq("historico_id", row.id).order("competencia");
    setOcorrencias((data as OcorrenciaRow[]) || []);
    toast.success(`${newOcs.length} ocorrências geradas`);
  };

  const updateOcorrencia = (ocIdx: number, val: number) => {
    const updated = [...ocorrencias];
    updated[ocIdx] = { ...updated[ocIdx], valor: val, tipo: "manual" };
    setOcorrencias(updated);
  };

  const salvarOcorrencias = async () => {
    for (const oc of ocorrencias) {
      if (oc.id) {
        await supabase.from("pjecalc_historico_ocorrencias").update({ valor: oc.valor, tipo: oc.tipo }).eq("id", oc.id);
      }
    }
    toast.success("Ocorrências salvas");
  };

  const handleSave = async () => {
    for (const row of rows) {
      const payload: any = {
        case_id: caseId, nome: row.nome, tipo_valor: row.tipo_valor,
        periodo_inicio: row.periodo_inicio, periodo_fim: row.periodo_fim,
        valor_informado: row.valor_informado, quantidade: row.quantidade,
        base_referencia: row.base_referencia, categoria_piso: row.categoria_piso,
        incidencia_fgts: row.incidencia_fgts, incidencia_cs: row.incidencia_cs,
        fgts_recolhido: row.fgts_recolhido, cs_recolhida: row.cs_recolhida,
      };
      if (row.id && !row._isNew) {
        await supabase.from("pjecalc_historico_salarial").update(payload).eq("id", row.id);
      } else {
        const { data } = await supabase.from("pjecalc_historico_salarial").insert(payload).select().single();
        if (data) {
          const idx = rows.indexOf(row);
          const updated = [...rows];
          updated[idx] = { ...data, _isNew: false } as any;
          setRows(updated);
        }
      }
    }
    toast.success("Histórico salarial salvo");
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">03 — Histórico Salarial</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow} className="h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
          <Button size="sm" onClick={handleSave} className="h-7 text-xs"><Save className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] h-7 py-0 w-8"></TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-36">Nome</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-24">Tipo Valor</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-28">Início</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-28">Fim</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-24 text-right">Valor (R$)</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-14 text-center">FGTS</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-14 text-center">CS</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-14 text-center">FGTS Rec.</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-14 text-center">CS Rec.</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-6">Nenhum registro. Clique em "Adicionar".</TableCell></TableRow>
            ) : rows.map((row, idx) => (
              <>
                <TableRow key={row.id || `new-${idx}`} className="hover:bg-muted/30">
                  <TableCell className="py-1">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => toggleOcorrencias(idx)}>
                      {expandedIdx === idx ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </TableCell>
                  <TableCell className="py-1"><Input value={row.nome} onChange={(e) => updateRow(idx, "nome", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                  <TableCell className="py-1">
                    <Select value={row.tipo_valor} onValueChange={(v) => updateRow(idx, "tipo_valor", v)}>
                      <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="informado" className="text-xs">Informado</SelectItem>
                        <SelectItem value="salario_minimo" className="text-xs">Sal. Mínimo</SelectItem>
                        <SelectItem value="piso_categoria" className="text-xs">Piso Categ.</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1"><Input type="date" value={row.periodo_inicio} onChange={(e) => updateRow(idx, "periodo_inicio", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                  <TableCell className="py-1"><Input type="date" value={row.periodo_fim} onChange={(e) => updateRow(idx, "periodo_fim", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                  <TableCell className="py-1"><Input type="number" step="0.01" value={row.valor_informado ?? ""} onChange={(e) => updateRow(idx, "valor_informado", parseFloat(e.target.value) || null)} className="h-6 text-[11px] text-right" /></TableCell>
                  <TableCell className="py-1 text-center"><Switch checked={row.incidencia_fgts} onCheckedChange={(v) => updateRow(idx, "incidencia_fgts", v)} className="scale-[0.6]" /></TableCell>
                  <TableCell className="py-1 text-center"><Switch checked={row.incidencia_cs} onCheckedChange={(v) => updateRow(idx, "incidencia_cs", v)} className="scale-[0.6]" /></TableCell>
                  <TableCell className="py-1 text-center"><Switch checked={row.fgts_recolhido} onCheckedChange={(v) => updateRow(idx, "fgts_recolhido", v)} className="scale-[0.6]" /></TableCell>
                  <TableCell className="py-1 text-center"><Switch checked={row.cs_recolhida} onCheckedChange={(v) => updateRow(idx, "cs_recolhida", v)} className="scale-[0.6]" /></TableCell>
                  <TableCell className="py-1"><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeRow(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                </TableRow>
                {expandedIdx === idx && (
                  <TableRow key={`oc-${idx}`} className="bg-muted/20">
                    <TableCell colSpan={11} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground">Ocorrências Mensais</span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => gerarOcorrencias(idx)}>Gerar Automático</Button>
                            {ocorrencias.length > 0 && <Button size="sm" className="h-6 text-[10px]" onClick={salvarOcorrencias}><Save className="h-3 w-3 mr-1" />Salvar</Button>}
                          </div>
                        </div>
                        {ocorrencias.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">Sem ocorrências. Clique em "Gerar Automático".</p>
                        ) : (
                          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {ocorrencias.map((oc, ocIdx) => (
                              <div key={oc.id || ocIdx} className="flex items-center gap-1 border rounded px-1.5 py-0.5">
                                <span className="text-[10px] text-muted-foreground w-14">{oc.competencia}</span>
                                <Input type="number" step="0.01" value={oc.valor} onChange={(e) => updateOcorrencia(ocIdx, parseFloat(e.target.value) || 0)}
                                  className={`h-5 text-[10px] text-right w-20 ${oc.tipo === "manual" ? "border-accent" : ""}`} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

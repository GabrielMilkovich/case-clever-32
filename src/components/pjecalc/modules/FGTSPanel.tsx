import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Save } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

export default function FGTSPanel({ caseId }: Props) {
  const [config, setConfig] = useState({
    aliquota: 8,
    multa_rescisoria: 40,
    lc110: true,
    aliquota_lc110: 10,
    tipo_demissao: "sem_justa_causa",
    depositos_anteriores: 0,
    saldo_fgts: 0,
    incluir_13: true,
    incluir_aviso_previo: true,
  });
  const [resultado, setResultado] = useState<any>(null);

  const set = (key: string, val: any) => setConfig(p => ({ ...p, [key]: val }));

  const calcular = () => {
    // Placeholder — will connect to engine-fgts.ts
    toast.info("Conectar ao engine-fgts.ts para cálculo real");
  };

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">08 — FGTS</h2>
        <Button size="sm" onClick={calcular} className="h-7 text-xs">
          <Calculator className="h-3.5 w-3.5 mr-1" /> Calcular FGTS
        </Button>
      </div>

      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Parâmetros</legend>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Alíquota (%)</Label>
            <Input type="number" step="0.1" value={config.aliquota} onChange={(e) => set("aliquota", parseFloat(e.target.value))} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Multa Rescisória (%)</Label>
            <Select value={String(config.multa_rescisoria)} onValueChange={(v) => set("multa_rescisoria", parseInt(v))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="40" className="text-xs">40% (sem justa causa)</SelectItem>
                <SelectItem value="20" className="text-xs">20% (culpa recíproca / acordo)</SelectItem>
                <SelectItem value="0" className="text-xs">0% (justa causa / pedido)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Tipo Demissão</Label>
            <Select value={config.tipo_demissao} onValueChange={(v) => set("tipo_demissao", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sem_justa_causa" className="text-xs">Sem Justa Causa</SelectItem>
                <SelectItem value="justa_causa" className="text-xs">Justa Causa</SelectItem>
                <SelectItem value="pedido_demissao" className="text-xs">Pedido de Demissão</SelectItem>
                <SelectItem value="acordo_mutuo" className="text-xs">Acordo Mútuo (484-A)</SelectItem>
                <SelectItem value="culpa_reciproca" className="text-xs">Culpa Recíproca</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Saldo FGTS Anterior (R$)</Label>
            <Input type="number" step="0.01" value={config.saldo_fgts || ""} onChange={(e) => set("saldo_fgts", parseFloat(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="flex items-center gap-1.5">
            <Switch checked={config.lc110} onCheckedChange={(v) => set("lc110", v)} className="scale-[0.6]" />
            <Label className="text-[11px]">LC 110/2001 (10%)</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={config.incluir_13} onCheckedChange={(v) => set("incluir_13", v)} className="scale-[0.6]" />
            <Label className="text-[11px]">Incluir 13º na base</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={config.incluir_aviso_previo} onCheckedChange={(v) => set("incluir_aviso_previo", v)} className="scale-[0.6]" />
            <Label className="text-[11px]">Incluir aviso prévio</Label>
          </div>
        </div>
      </fieldset>

      {/* Resultado placeholder */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Resultado</legend>
        <div className="grid grid-cols-4 gap-3">
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Depósitos Devidos</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Depósitos Pagos</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Multa 40%</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">LC 110 (10%)</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
        </div>
        <div className="mt-3 border-t pt-2 flex justify-between items-center">
          <span className="text-xs font-semibold">Total FGTS</span>
          <span className="text-base font-bold text-primary">R$ —</span>
        </div>
      </fieldset>

      {/* Tabela por competência (placeholder) */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Depósitos por Competência</legend>
        <div className="border rounded overflow-auto max-h-60 custom-scrollbar">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] h-6 py-0">Competência</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Base</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Alíquota</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Devido</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Pago</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">Execute o cálculo para visualizar.</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </fieldset>
    </div>
  );
}

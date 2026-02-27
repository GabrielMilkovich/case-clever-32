import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

const REGIMES = [
  { value: "adc58_59", label: "ADC 58/59 (IPCA-E → SELIC)" },
  { value: "tr_juros_1pct", label: "TR + Juros 1% a.m." },
  { value: "ipca_e_juros_1pct", label: "IPCA-E + Juros 1% a.m." },
  { value: "selic_integral", label: "SELIC Integral" },
  { value: "personalizado", label: "Personalizado" },
];

export default function CorrecaoJuros({ caseId }: Props) {
  const [config, setConfig] = useState({
    regime: "adc58_59",
    data_citacao: "",
    data_atualizacao: new Date().toISOString().slice(0, 10),
    multa_523: true,
    percentual_multa_523: 10,
    honorarios: false,
    percentual_honorarios: 10,
    juros_pre_citacao: true,
    taxa_juros_manual: 1,
  });

  const set = (key: string, val: any) => setConfig(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">11 — Correção Monetária + Juros de Mora</h2>
        <Button size="sm" className="h-7 text-xs" onClick={() => toast.info("Conectar ao engine-correcao-juros.ts")}>
          <Calculator className="h-3.5 w-3.5 mr-1" /> Calcular
        </Button>
      </div>

      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Regime de Atualização</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Regime</Label>
            <Select value={config.regime} onValueChange={(v) => set("regime", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIMES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Data da Citação</Label>
            <Input type="date" value={config.data_citacao} onChange={(e) => set("data_citacao", e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Data de Atualização</Label>
            <Input type="date" value={config.data_atualizacao} onChange={(e) => set("data_atualizacao", e.target.value)} className="h-7 text-xs" />
          </div>
        </div>
      </fieldset>

      {/* Fases do regime */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Fases</legend>
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded p-2">
            <div className="text-[10px] text-muted-foreground">Fase Pré-Judicial</div>
            <div className="text-xs font-semibold">{config.regime === "adc58_59" ? "IPCA-E" : config.regime === "selic_integral" ? "SELIC" : "TR"}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Até ajuizamento</div>
          </div>
          <div className="border rounded p-2">
            <div className="text-[10px] text-muted-foreground">Fase Judicial (até citação)</div>
            <div className="text-xs font-semibold">{config.regime === "adc58_59" ? "IPCA-E + Juros 1%" : config.regime === "selic_integral" ? "SELIC" : "Índice + Juros 1%"}</div>
          </div>
          <div className="border rounded p-2">
            <div className="text-[10px] text-muted-foreground">Fase Judicial (pós citação)</div>
            <div className="text-xs font-semibold">{config.regime === "adc58_59" ? "SELIC (já inclui juros)" : "Índice + Juros"}</div>
          </div>
        </div>
      </fieldset>

      {/* Multa e Honorários */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Penalidades Pós-Cálculo</legend>
        <div className="grid grid-cols-4 gap-3">
          <div className="flex items-center gap-1.5">
            <Switch checked={config.multa_523} onCheckedChange={(v) => set("multa_523", v)} className="scale-[0.6]" />
            <Label className="text-[11px]">Multa Art. 523 CPC</Label>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">% Multa</Label>
            <Input type="number" step="0.1" value={config.percentual_multa_523} onChange={(e) => set("percentual_multa_523", parseFloat(e.target.value))} className="h-7 text-xs" disabled={!config.multa_523} />
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={config.honorarios} onCheckedChange={(v) => set("honorarios", v)} className="scale-[0.6]" />
            <Label className="text-[11px]">Honorários Sucumbenciais</Label>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">% Honorários</Label>
            <Input type="number" step="0.1" value={config.percentual_honorarios} onChange={(e) => set("percentual_honorarios", parseFloat(e.target.value))} className="h-7 text-xs" disabled={!config.honorarios} />
          </div>
        </div>
      </fieldset>

      {/* Tabela mês a mês */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Detalhamento Mensal</legend>
        <div className="border rounded overflow-auto max-h-60 custom-scrollbar">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] h-6 py-0">Competência</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Nominal</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Fator Correção</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Corrigido</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Juros</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">Execute o cálculo para visualizar.</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </fieldset>

      {/* Resultado */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Resultado</legend>
        <div className="grid grid-cols-4 gap-3">
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Total Nominal</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Correção Monetária</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Juros de Mora</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Total Atualizado</div>
            <div className="text-sm font-bold text-primary">R$ —</div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

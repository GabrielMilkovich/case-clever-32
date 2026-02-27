import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

export default function ContribuicaoSocial({ caseId }: Props) {
  const [config, setConfig] = useState({
    aliquota_empresa: 20,
    aliquota_sat: 2,
    aliquota_terceiros: 5.8,
    deduzir_segurado: true,
  });

  const set = (key: string, val: any) => setConfig(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">09 — Contribuição Social</h2>
        <Button size="sm" className="h-7 text-xs" onClick={() => toast.info("Conectar ao engine-contribuicao-social.ts")}>
          <Calculator className="h-3.5 w-3.5 mr-1" /> Calcular CS
        </Button>
      </div>

      <Tabs defaultValue="segurado">
        <TabsList className="h-7">
          <TabsTrigger value="segurado" className="text-[11px] h-6">Segurado (Empregado)</TabsTrigger>
          <TabsTrigger value="empregador" className="text-[11px] h-6">Empregador</TabsTrigger>
        </TabsList>

        <TabsContent value="segurado" className="mt-3 space-y-3">
          <fieldset className="border border-border rounded p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1">INSS Segurado — Tabela Progressiva</legend>
            <p className="text-[11px] text-muted-foreground mb-2">Faixas pré e pós EC 103/2019 aplicadas automaticamente por competência.</p>
            <div className="flex items-center gap-2">
              <Switch checked={config.deduzir_segurado} onCheckedChange={(v) => set("deduzir_segurado", v)} className="scale-[0.6]" />
              <Label className="text-[11px]">Deduzir INSS segurado do crédito líquido</Label>
            </div>
          </fieldset>

          <fieldset className="border border-border rounded p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1">Resultado por Competência</legend>
            <div className="border rounded overflow-auto max-h-60 custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] h-6 py-0">Competência</TableHead>
                    <TableHead className="text-[10px] h-6 py-0 text-right">Base SC</TableHead>
                    <TableHead className="text-[10px] h-6 py-0 text-right">Alíquota Efet.</TableHead>
                    <TableHead className="text-[10px] h-6 py-0 text-right">INSS Devido</TableHead>
                    <TableHead className="text-[10px] h-6 py-0 text-right">Teto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">Execute o cálculo para visualizar.</TableCell></TableRow>
                </TableBody>
              </Table>
            </div>
          </fieldset>
        </TabsContent>

        <TabsContent value="empregador" className="mt-3 space-y-3">
          <fieldset className="border border-border rounded p-3 space-y-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1">Alíquotas Patronais</legend>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Empresa (%)</Label>
                <Input type="number" step="0.1" value={config.aliquota_empresa} onChange={(e) => set("aliquota_empresa", parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">SAT/RAT (%)</Label>
                <Input type="number" step="0.1" value={config.aliquota_sat} onChange={(e) => set("aliquota_sat", parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Terceiros (%)</Label>
                <Input type="number" step="0.1" value={config.aliquota_terceiros} onChange={(e) => set("aliquota_terceiros", parseFloat(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">Total Patronal</span>
              <span className="text-xs font-bold">{(config.aliquota_empresa + config.aliquota_sat + config.aliquota_terceiros).toFixed(1)}%</span>
            </div>
          </fieldset>

          <fieldset className="border border-border rounded p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1">Resultado</legend>
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded p-2 text-center">
                <div className="text-[10px] text-muted-foreground">CS Segurado</div>
                <div className="text-sm font-bold">R$ —</div>
              </div>
              <div className="border rounded p-2 text-center">
                <div className="text-[10px] text-muted-foreground">CS Empregador</div>
                <div className="text-sm font-bold">R$ —</div>
              </div>
              <div className="border rounded p-2 text-center">
                <div className="text-[10px] text-muted-foreground">Total CS</div>
                <div className="text-sm font-bold text-primary">R$ —</div>
              </div>
            </div>
          </fieldset>
        </TabsContent>
      </Tabs>
    </div>
  );
}

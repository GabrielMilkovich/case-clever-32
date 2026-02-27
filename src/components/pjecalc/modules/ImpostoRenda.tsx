import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

export default function ImpostoRenda({ caseId }: Props) {
  const [config, setConfig] = useState({
    meses_acumulacao: 0,
    dependentes: 0,
    valor_dependente: 189.59,
    pensao_alimenticia: 0,
    deduzir_previdencia: true,
    tributar_13_separado: true,
  });

  const set = (key: string, val: any) => setConfig(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">10 — Imposto de Renda (Art. 12-A)</h2>
        <Button size="sm" className="h-7 text-xs" onClick={() => toast.info("Conectar ao engine-irrf.ts")}>
          <Calculator className="h-3.5 w-3.5 mr-1" /> Calcular IRRF
        </Button>
      </div>

      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">RRA — Rendimentos Recebidos Acumuladamente</legend>
        <p className="text-[11px] text-muted-foreground">Art. 12-A da Lei 7.713/88 — Tabela progressiva acumulada pelo número de meses.</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Meses de Acumulação</Label>
            <Input type="number" value={config.meses_acumulacao || ""} onChange={(e) => set("meses_acumulacao", parseInt(e.target.value) || 0)} className="h-7 text-xs" placeholder="Automático" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Nº Dependentes</Label>
            <Input type="number" value={config.dependentes} onChange={(e) => set("dependentes", parseInt(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Valor p/ Dependente (R$)</Label>
            <Input type="number" step="0.01" value={config.valor_dependente} onChange={(e) => set("valor_dependente", parseFloat(e.target.value))} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Pensão Alimentícia (R$)</Label>
            <Input type="number" step="0.01" value={config.pensao_alimenticia || ""} onChange={(e) => set("pensao_alimenticia", parseFloat(e.target.value) || 0)} className="h-7 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-1.5">
            <Switch checked={config.deduzir_previdencia} onCheckedChange={(v) => set("deduzir_previdencia", v)} className="scale-[0.6]" />
            <Label className="text-[11px]">Deduzir INSS da base</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={config.tributar_13_separado} onCheckedChange={(v) => set("tributar_13_separado", v)} className="scale-[0.6]" />
            <Label className="text-[11px]">13º com tributação exclusiva</Label>
          </div>
        </div>
      </fieldset>

      {/* Tabela Progressiva Acumulada */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Tabela Progressiva Acumulada ({config.meses_acumulacao || "N"} meses)</legend>
        <div className="border rounded overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] h-6 py-0">Faixa</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Base Mensal (R$)</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Base Acum. (R$)</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Alíquota</TableHead>
                <TableHead className="text-[10px] h-6 py-0 text-right">Parcela Deduzir (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { faixa: "1ª", mensal: "2.259,20", aliq: "Isento", parcela: "—" },
                { faixa: "2ª", mensal: "2.826,65", aliq: "7,5%", parcela: "169,44" },
                { faixa: "3ª", mensal: "3.751,05", aliq: "15%", parcela: "381,44" },
                { faixa: "4ª", mensal: "4.664,68", aliq: "22,5%", parcela: "662,77" },
                { faixa: "5ª", mensal: "Acima", aliq: "27,5%", parcela: "896,00" },
              ].map((f, i) => {
                const n = config.meses_acumulacao || 1;
                const mensal = parseFloat(f.mensal.replace(".", "").replace(",", ".")) || 0;
                return (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="py-0.5 text-[10px]">{f.faixa}</TableCell>
                    <TableCell className="py-0.5 text-[10px] text-right">{f.mensal}</TableCell>
                    <TableCell className="py-0.5 text-[10px] text-right">{mensal ? (mensal * n).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "Acima"}</TableCell>
                    <TableCell className="py-0.5 text-[10px] text-right">{f.aliq}</TableCell>
                    <TableCell className="py-0.5 text-[10px] text-right">{f.parcela !== "—" ? (parseFloat(f.parcela.replace(".", "").replace(",", ".")) * n).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </fieldset>

      {/* Resultado */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Resultado</legend>
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Base de Cálculo IR</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">IRRF Verbas Comuns</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">IRRF 13º Salário</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
        </div>
        <div className="mt-3 border-t pt-2 flex justify-between items-center">
          <span className="text-xs font-semibold">Total IRRF</span>
          <span className="text-base font-bold text-primary">R$ —</span>
        </div>
      </fieldset>
    </div>
  );
}

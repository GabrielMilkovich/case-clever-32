import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { useState } from "react";

interface Props { caseId: string; }

export default function CorrecaoJuros({ caseId }: Props) {
  const [regime, setRegime] = useState("adc58_59");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">11 — Correção Monetária + Juros de Mora</h2>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Regime de Atualização</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="w-64">
            <Label className="text-xs">Regime</Label>
            <Select value={regime} onValueChange={setRegime}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adc58_59">ADC 58/59 (IPCA-E → SELIC)</SelectItem>
                <SelectItem value="tr_juros_1pct">TR + Juros 1% a.m.</SelectItem>
                <SelectItem value="ipca_e_juros_1pct">IPCA-E + Juros 1% a.m.</SelectItem>
                <SelectItem value="selic_integral">SELIC Integral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Engine conectado: <code className="bg-muted px-1 rounded">engine-correcao-juros.ts</code></p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Fase Pré-Judicial</div><div className="font-semibold">{regime === "adc58_59" ? "IPCA-E" : regime.split("_")[0].toUpperCase()}</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Fase Judicial</div><div className="font-semibold">{regime === "adc58_59" ? "SELIC" : "Juros 1% a.m."}</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Multa Art. 523 CPC</div><div className="font-semibold">10%</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

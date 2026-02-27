import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface Props { caseId: string; }

export default function Resumo({ caseId }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">12 — Resumo / Relatório</h2>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Resumo Consolidado</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Verbas Principais</div><div className="font-semibold">R$ —</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Verbas Reflexas</div><div className="font-semibold">R$ —</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">FGTS + Multa</div><div className="font-semibold">R$ —</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Contribuição Social</div><div className="font-semibold">R$ —</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">IRRF</div><div className="font-semibold">R$ —</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Correção + Juros</div><div className="font-semibold">R$ —</div></div>
          </div>
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Total Líquido</span>
              <span className="text-xl font-bold text-primary">R$ —</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

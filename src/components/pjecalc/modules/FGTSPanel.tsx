import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark } from "lucide-react";

interface Props { caseId: string; }

export default function FGTSPanel({ caseId }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">08 — FGTS</h2>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4" /> Cálculo de FGTS</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">Configure os parâmetros e execute o cálculo de FGTS.</p>
          <p className="text-xs text-muted-foreground mt-2">Engine conectado: <code className="text-xs bg-muted px-1 rounded">engine-fgts.ts</code></p>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Alíquota</div><div className="font-semibold">8%</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Multa Rescisória</div><div className="font-semibold">40%</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">LC 110/2001</div><div className="font-semibold">10%</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

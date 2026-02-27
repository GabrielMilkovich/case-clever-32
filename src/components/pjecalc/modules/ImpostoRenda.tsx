import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";

interface Props { caseId: string; }

export default function ImpostoRenda({ caseId }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">10 — Imposto de Renda (Art. 12-A)</h2>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> IRRF — RRA</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground">Rendimentos Recebidos Acumuladamente (Art. 12-A, Lei 7.713/88).</p>
          <p className="text-xs text-muted-foreground mt-2">Engine a criar: <code className="text-xs bg-muted px-1 rounded">engine-irrf.ts</code></p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Meses de Acumulação</div><div className="font-semibold">—</div></div>
            <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Tabela Progressiva</div><div className="font-semibold">Acumulada</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

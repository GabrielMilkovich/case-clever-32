import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from "lucide-react";

interface Props { caseId: string; }

export default function ContribuicaoSocial({ caseId }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">09 — Contribuição Social</h2>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> INSS / Contribuição Social</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <Tabs defaultValue="segurado">
            <TabsList className="h-8">
              <TabsTrigger value="segurado" className="text-xs">Segurado (Empregado)</TabsTrigger>
              <TabsTrigger value="empregador" className="text-xs">Empregador</TabsTrigger>
            </TabsList>
            <TabsContent value="segurado" className="mt-3">
              <p className="text-sm text-muted-foreground">Tabela progressiva INSS por competência — faixas pré e pós EC 103/2019.</p>
              <p className="text-xs text-muted-foreground mt-2">Engine: <code className="text-xs bg-muted px-1 rounded">engine-contribuicao-social.ts</code></p>
            </TabsContent>
            <TabsContent value="empregador" className="mt-3">
              <p className="text-sm text-muted-foreground">Empresa (20%) + SAT/RAT (1-3%) + Terceiros (~5.8%).</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

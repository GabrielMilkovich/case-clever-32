import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface VersionCompareProps {
  previousVersion?: {
    versao: string;
    regras: object;
    vigencia_inicio: string;
  };
  currentVersion: {
    versao: string;
    regras: object;
    vigencia_inicio: string;
  };
}

export function VersionCompare({ previousVersion, currentVersion }: VersionCompareProps) {
  if (!previousVersion) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Primeira versão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Não há versão anterior para comparar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Badge variant="secondary">{previousVersion.versao}</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="default">{currentVersion.versao}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Versão Anterior</p>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[200px]">
              {JSON.stringify(previousVersion.regras, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Nova Versão</p>
            <pre className="text-xs bg-primary/5 p-3 rounded-lg overflow-auto max-h-[200px] border border-primary/20">
              {JSON.stringify(currentVersion.regras, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

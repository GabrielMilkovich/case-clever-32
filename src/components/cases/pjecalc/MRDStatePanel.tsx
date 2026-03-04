/**
 * MRDStatePanel — Export/Import do estado serializado do cálculo
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Upload, CheckCircle2, XCircle, Loader2, FileJson, Shield } from "lucide-react";
import {
  exportMRDState,
  downloadMRDState,
  parseMRDStateFile,
  validateMRDStateIntegrity,
} from "@/lib/pjecalc/mrdstate-export";

interface Props {
  caseId: string;
}

export function MRDStatePanel({ caseId }: Props) {
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    valid: boolean;
    meta?: any;
    counts?: Record<string, number>;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const state = await exportMRDState(caseId);
      downloadMRDState(state);
      toast.success(`MRDSTATE exportado (${state.apuracao_diaria.length} dias, ${state.verbas.length} verbas)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const state = await parseMRDStateFile(file);
      const valid = validateMRDStateIntegrity(state);
      setImportResult({
        valid,
        meta: state.meta,
        counts: {
          'Eventos': state.eventos_intervalo.length,
          'Apuração Diária': state.apuracao_diaria.length,
          'Hist. Rubricas': state.historico_salarial.rubricas.length,
          'Hist. Meses': state.historico_salarial.meses.length,
          'Verbas': state.verbas.length,
          'Ocorrências': state.ocorrencias.length,
        },
      });
      if (!valid) {
        toast.warning("Hash de integridade não confere — arquivo pode ter sido alterado");
      } else {
        toast.success("Arquivo MRDSTATE válido e íntegro");
      }
    } catch (err) {
      toast.error("Erro ao ler arquivo: " + (err as Error).message);
      setImportResult(null);
    }
    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileJson className="h-4 w-4" />
          Estado do Cálculo (MRDSTATE)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Exporte o estado completo do cálculo para auditoria, backup ou reimportação.
          Equivalente ao arquivo .PJC do PJe-Calc oficial.
        </p>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Download className="h-3 w-3 mr-1" />
            )}
            Exportar MRDSTATE
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3 w-3 mr-1" /> Verificar Arquivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.mrdstate.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        {importResult && (
          <div className={`border rounded-lg p-3 space-y-2 ${importResult.valid ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/20'}`}>
            <div className="flex items-center gap-2 text-xs">
              {importResult.valid ? (
                <>
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">Integridade verificada</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Hash divergente</span>
                </>
              )}
            </div>
            {importResult.meta && (
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Processo: {importResult.meta.processo_cnj || '-'}</div>
                <div>Reclamante: {importResult.meta.reclamante || '-'}</div>
                <div>Engine: v{importResult.meta.engine_version || '-'}</div>
              </div>
            )}
            {importResult.counts && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(importResult.counts).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="text-[9px]">
                    {k}: {v}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

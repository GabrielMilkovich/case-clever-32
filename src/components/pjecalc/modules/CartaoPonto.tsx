import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet } from "lucide-react";

interface Props { caseId: string; }

export default function CartaoPonto({ caseId }: Props) {
  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">06 — Cartão de Ponto</h2>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          <Upload className="h-3.5 w-3.5 mr-1" /> Importar CSV
        </Button>
      </div>

      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Registros de Ponto</legend>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-xs text-muted-foreground">Importe um arquivo CSV com os registros de ponto.</p>
          <p className="text-[10px] text-muted-foreground mt-1">Formato esperado: Data, Entrada 1, Saída 1, Entrada 2, Saída 2</p>
          <Button variant="outline" size="sm" className="mt-4 h-7 text-xs">
            <Upload className="h-3 w-3 mr-1" /> Selecionar Arquivo
          </Button>
        </div>
      </fieldset>

      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Colunas Definidas</legend>
        <div className="border rounded overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] h-6 py-0">Coluna</TableHead>
                <TableHead className="text-[10px] h-6 py-0">Tipo</TableHead>
                <TableHead className="text-[10px] h-6 py-0">Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">Importe um arquivo para definir as colunas.</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </fieldset>
    </div>
  );
}

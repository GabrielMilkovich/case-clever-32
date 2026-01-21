import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CsvRow {
  competencia: string;
  valor: string;
  [key: string]: string;
}

interface CsvUploaderProps {
  onUpload: (data: { nome: string; fonte: string; rows: CsvRow[] }) => Promise<void>;
  isLoading?: boolean;
}

export function CsvUploader({ onUpload, isLoading = false }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CsvRow[]>([]);
  const [nome, setNome] = useState("");
  const [fonte, setFonte] = useState("IBGE");
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((text: string): CsvRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("Arquivo CSV deve ter cabeçalho e pelo menos uma linha de dados");
    }

    const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
    
    if (!headers.includes("competencia") || !headers.includes("valor")) {
      throw new Error('CSV deve conter colunas "competencia" e "valor"');
    }

    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/[,;]/);
      const row: CsvRow = { competencia: "", valor: "" };
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });

      // Validate competencia format (YYYY-MM or YYYY-MM-DD)
      if (!/^\d{4}-\d{2}(-\d{2})?$/.test(row.competencia)) {
        throw new Error(`Linha ${i + 1}: competência inválida "${row.competencia}". Use formato YYYY-MM ou YYYY-MM-DD`);
      }

      // Validate valor is a number
      const valor = parseFloat(row.valor.replace(",", "."));
      if (isNaN(valor)) {
        throw new Error(`Linha ${i + 1}: valor inválido "${row.valor}"`);
      }
      row.valor = valor.toString();

      rows.push(row);
    }

    return rows;
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setError(null);

      try {
        const text = await selectedFile.text();
        const rows = parseCSV(text);
        setParsedData(rows);
      } catch (err) {
        setError((err as Error).message);
        setParsedData([]);
      }
    },
    [parseCSV]
  );

  const handleUpload = async () => {
    if (!nome) {
      setError("Selecione o tipo de índice");
      return;
    }
    if (parsedData.length === 0) {
      setError("Nenhum dado válido para importar");
      return;
    }

    await onUpload({ nome, fonte, rows: parsedData });
    setFile(null);
    setParsedData([]);
    setNome("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Índices (CSV)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Índice</Label>
            <Select value={nome} onValueChange={setNome}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ipca_e">IPCA-E</SelectItem>
                <SelectItem value="inpc">INPC</SelectItem>
                <SelectItem value="tr">TR</SelectItem>
                <SelectItem value="selic">SELIC</SelectItem>
                <SelectItem value="igpm">IGP-M</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fonte</Label>
            <Select value={fonte} onValueChange={setFonte}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IBGE">IBGE</SelectItem>
                <SelectItem value="BCB">Banco Central</SelectItem>
                <SelectItem value="FGV">FGV</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Arquivo CSV</Label>
          <Input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Formato: competencia (YYYY-MM), valor (número com ponto ou vírgula)
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parsedData.length > 0 && (
          <>
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                {parsedData.length} registros prontos para importação
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.competencia}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(row.valor).toFixed(6)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {parsedData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        ... e mais {parsedData.length - 10} registros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleUpload} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Importar {parsedData.length} registros
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

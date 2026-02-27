/**
 * CSV Import for Cartão de Ponto
 * Expected CSV format:
 * competencia;dias_uteis;dias_trabalhados;horas_extras_50;horas_extras_100;horas_noturnas;intervalo_suprimido;dsr_horas
 * 2023-01;22;22;10;2;0;0;0
 */

export interface CartaoPontoRow {
  competencia: string;
  dias_uteis: number;
  dias_trabalhados: number;
  horas_extras_50: number;
  horas_extras_100: number;
  horas_noturnas: number;
  intervalo_suprimido: number;
  dsr_horas: number;
}

export function parseCartaoPontoCSV(csvText: string): { rows: CartaoPontoRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: CartaoPontoRow[] = [];

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    errors.push("CSV deve ter pelo menos o cabeçalho e uma linha de dados.");
    return { rows, errors };
  }

  // Detect separator
  const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  
  // Map column indices
  const colMap: Record<string, number> = {};
  const expectedCols = ["competencia", "dias_uteis", "dias_trabalhados", "horas_extras_50", "horas_extras_100", "horas_noturnas", "intervalo_suprimido", "dsr_horas"];
  
  for (const col of expectedCols) {
    const idx = header.findIndex(h => 
      h === col || 
      h.replace(/[_\s]/g, "") === col.replace(/[_\s]/g, "") ||
      h === col.replace(/_/g, " ")
    );
    if (idx >= 0) colMap[col] = idx;
  }

  if (!("competencia" in colMap)) {
    errors.push("Coluna 'competencia' não encontrada no cabeçalho.");
    return { rows, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = line.split(sep).map(c => c.trim().replace(/['"]/g, ""));
    const comp = cells[colMap["competencia"]] || "";
    
    if (!/^\d{4}-\d{2}$/.test(comp)) {
      errors.push(`Linha ${i + 1}: competência inválida "${comp}" (esperado: AAAA-MM)`);
      continue;
    }

    const getNum = (col: string) => {
      if (!(col in colMap)) return 0;
      const val = cells[colMap[col]];
      if (!val) return 0;
      const num = parseFloat(val.replace(",", "."));
      return isNaN(num) ? 0 : num;
    };

    rows.push({
      competencia: comp,
      dias_uteis: getNum("dias_uteis") || 22,
      dias_trabalhados: getNum("dias_trabalhados") || 22,
      horas_extras_50: getNum("horas_extras_50"),
      horas_extras_100: getNum("horas_extras_100"),
      horas_noturnas: getNum("horas_noturnas"),
      intervalo_suprimido: getNum("intervalo_suprimido"),
      dsr_horas: getNum("dsr_horas"),
    });
  }

  return { rows, errors };
}

export function gerarCSVModelo(): string {
  const header = "competencia;dias_uteis;dias_trabalhados;horas_extras_50;horas_extras_100;horas_noturnas;intervalo_suprimido;dsr_horas";
  const example = "2024-01;22;22;10.5;2;0;0;0";
  return `${header}\n${example}\n`;
}

// =====================================================
// CALENDÁRIO TRABALHISTA - PRECISÃO POR COMPETÊNCIA
// =====================================================
// Módulo que calcula dias úteis, DSRs e feriados por competência
// para cálculos precisos de DSR sobre variáveis e proporcionais

export interface FeriadoNacional {
  data: string; // formato "MM-DD" ou "YYYY-MM-DD"
  nome: string;
  fixo: boolean; // true = mesmo dia todo ano, false = variável (páscoa)
}

export interface CalendarioCompetencia {
  competencia: string; // "YYYY-MM"
  ano: number;
  mes: number;
  diasMes: number;
  diasUteis: number;
  domingos: number;
  sabados: number;
  feriados: number;
  dsrs: number; // domingos + feriados que não caem em domingo
  diasFeriadosList: string[]; // datas dos feriados
  diasDomingos: number[];
  diasSabados: number[];
}

// Feriados nacionais fixos do Brasil
export const FERIADOS_NACIONAIS_FIXOS: FeriadoNacional[] = [
  { data: "01-01", nome: "Confraternização Universal", fixo: true },
  { data: "04-21", nome: "Tiradentes", fixo: true },
  { data: "05-01", nome: "Dia do Trabalho", fixo: true },
  { data: "09-07", nome: "Independência do Brasil", fixo: true },
  { data: "10-12", nome: "Nossa Senhora Aparecida", fixo: true },
  { data: "11-02", nome: "Finados", fixo: true },
  { data: "11-15", nome: "Proclamação da República", fixo: true },
  { data: "12-25", nome: "Natal", fixo: true },
];

// Fórmula de cálculo da Páscoa (Algoritmo de Meeus/Jones/Butcher)
export function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

// Calcula feriados móveis baseados na Páscoa
export function calcularFeriadosMoveis(ano: number): FeriadoNacional[] {
  const pascoa = calcularPascoa(ano);
  
  const carnaval = new Date(pascoa);
  carnaval.setDate(pascoa.getDate() - 47);
  
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  
  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(pascoa.getDate() + 60);
  
  const formatData = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mm}-${dd}`;
  };
  
  return [
    { data: formatData(carnaval), nome: "Carnaval", fixo: false },
    { data: formatData(sextaSanta), nome: "Sexta-feira Santa", fixo: false },
    { data: formatData(pascoa), nome: "Páscoa", fixo: false },
    { data: formatData(corpusChristi), nome: "Corpus Christi", fixo: false },
  ];
}

// Retorna todos os feriados de um ano
export function obterFeriadosDoAno(
  ano: number,
  feriadosCustom: FeriadoNacional[] = []
): { data: Date; nome: string }[] {
  const result: { data: Date; nome: string }[] = [];
  
  // Feriados fixos
  for (const f of FERIADOS_NACIONAIS_FIXOS) {
    const [mm, dd] = f.data.split("-");
    result.push({
      data: new Date(ano, parseInt(mm) - 1, parseInt(dd)),
      nome: f.nome,
    });
  }
  
  // Feriados móveis
  for (const f of calcularFeriadosMoveis(ano)) {
    const [, mm, dd] = f.data.split("-");
    result.push({
      data: new Date(ano, parseInt(mm) - 1, parseInt(dd)),
      nome: f.nome,
    });
  }
  
  // Feriados customizados (estaduais/municipais)
  for (const f of feriadosCustom) {
    if (f.fixo) {
      const [mm, dd] = f.data.split("-");
      result.push({
        data: new Date(ano, parseInt(mm) - 1, parseInt(dd)),
        nome: f.nome,
      });
    } else if (f.data.startsWith(String(ano))) {
      const [, mm, dd] = f.data.split("-");
      result.push({
        data: new Date(ano, parseInt(mm) - 1, parseInt(dd)),
        nome: f.nome,
      });
    }
  }
  
  return result;
}

// Calcula informações do calendário para uma competência
export function calcularCalendarioCompetencia(
  competencia: string, // "YYYY-MM"
  feriadosCustom: FeriadoNacional[] = []
): CalendarioCompetencia {
  const [anoStr, mesStr] = competencia.split("-");
  const ano = parseInt(anoStr);
  const mes = parseInt(mesStr);
  
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0); // último dia do mês
  const diasMes = ultimoDia.getDate();
  
  const feriados = obterFeriadosDoAno(ano, feriadosCustom);
  const feriadosDoMes = feriados.filter(
    (f) => f.data.getMonth() === mes - 1
  );
  
  let diasUteis = 0;
  let domingos = 0;
  let sabados = 0;
  let feriadosCount = 0;
  const diasDomingos: number[] = [];
  const diasSabados: number[] = [];
  const diasFeriadosList: string[] = [];
  
  for (let dia = 1; dia <= diasMes; dia++) {
    const data = new Date(ano, mes - 1, dia);
    const diaSemana = data.getDay(); // 0 = domingo, 6 = sábado
    
    const ehFeriado = feriadosDoMes.some(
      (f) => f.data.getDate() === dia
    );
    
    if (diaSemana === 0) {
      domingos++;
      diasDomingos.push(dia);
    } else if (diaSemana === 6) {
      sabados++;
      diasSabados.push(dia);
    }
    
    if (ehFeriado) {
      feriadosCount++;
      diasFeriadosList.push(
        `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
      );
      // Feriado que cai em domingo não conta como DSR adicional
      if (diaSemana !== 0) {
        // Será considerado no cálculo de DSR
      }
    }
    
    // Dia útil = não é sábado, domingo ou feriado
    if (diaSemana !== 0 && diaSemana !== 6 && !ehFeriado) {
      diasUteis++;
    }
  }
  
  // DSR = domingos + feriados que NÃO caem em domingo
  const feriadosNaoDomingo = feriadosDoMes.filter((f) => {
    const diaSemana = f.data.getDay();
    return diaSemana !== 0;
  }).length;
  
  const dsrs = domingos + feriadosNaoDomingo;
  
  return {
    competencia,
    ano,
    mes,
    diasMes,
    diasUteis,
    domingos,
    sabados,
    feriados: feriadosCount,
    dsrs,
    diasFeriadosList,
    diasDomingos,
    diasSabados,
  };
}

// Calcula DSR sobre variáveis usando o método correto
export interface CalculoDSR {
  valorBase: number;
  competencia: string;
  calendario: CalendarioCompetencia;
  valorDSR: number;
  formula: string;
  metodo: "calendario" | "fator_fixo";
}

export function calcularDSRSobreVariaveis(
  valorBase: number,
  competencia: string,
  metodo: "calendario" | "fator_fixo" = "calendario",
  fatorFixo: number = 6, // 1/6 é o padrão quando usa fator fixo
  feriadosCustom: FeriadoNacional[] = []
): CalculoDSR {
  const calendario = calcularCalendarioCompetencia(competencia, feriadosCustom);
  
  let valorDSR: number;
  let formula: string;
  
  if (metodo === "fator_fixo") {
    // Método simplificado: valorBase / fator
    valorDSR = valorBase / fatorFixo;
    formula = `${valorBase.toFixed(2)} / ${fatorFixo} = ${valorDSR.toFixed(2)}`;
  } else {
    // Método calendário: (valorBase / dias úteis) * DSRs
    if (calendario.diasUteis === 0) {
      valorDSR = 0;
      formula = "Sem dias úteis na competência";
    } else {
      const valorDiario = valorBase / calendario.diasUteis;
      valorDSR = valorDiario * calendario.dsrs;
      formula = `(${valorBase.toFixed(2)} / ${calendario.diasUteis}) × ${calendario.dsrs} = ${valorDSR.toFixed(2)}`;
    }
  }
  
  return {
    valorBase,
    competencia,
    calendario,
    valorDSR: Math.round(valorDSR * 100) / 100,
    formula,
    metodo,
  };
}

// Gera calendários para um período inteiro
export function gerarCalendariosPeriodo(
  inicio: string, // "YYYY-MM"
  fim: string, // "YYYY-MM"
  feriadosCustom: FeriadoNacional[] = []
): CalendarioCompetencia[] {
  const result: CalendarioCompetencia[] = [];
  
  const [anoIni, mesIni] = inicio.split("-").map(Number);
  const [anoFim, mesFim] = fim.split("-").map(Number);
  
  let ano = anoIni;
  let mes = mesIni;
  
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    const competencia = `${ano}-${String(mes).padStart(2, "0")}`;
    result.push(calcularCalendarioCompetencia(competencia, feriadosCustom));
    
    mes++;
    if (mes > 12) {
      mes = 1;
      ano++;
    }
  }
  
  return result;
}

// Tipo para exportação
export type { CalendarioCompetencia as CalendarioTrabalhista };

import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

const TRTS: Record<string, string> = {
  "TRT1": "Rio de Janeiro", "TRT2": "São Paulo (Capital)", "TRT3": "Minas Gerais",
  "TRT4": "Rio Grande do Sul", "TRT5": "Bahia", "TRT6": "Pernambuco",
  "TRT7": "Ceará", "TRT8": "Pará/Amapá", "TRT9": "Paraná",
  "TRT10": "Distrito Federal/Tocantins", "TRT11": "Amazonas/Roraima",
  "TRT12": "Santa Catarina", "TRT13": "Paraíba", "TRT14": "Rondônia/Acre",
  "TRT15": "Campinas (SP)", "TRT16": "Maranhão", "TRT17": "Espírito Santo",
  "TRT18": "Goiás", "TRT19": "Alagoas", "TRT20": "Sergipe",
  "TRT21": "Rio Grande do Norte", "TRT22": "Piauí", "TRT23": "Mato Grosso",
  "TRT24": "Mato Grosso do Sul",
};

const PAGE_SIZE = 24;

const TABELA_CONFIG: Record<string, { title: string; description: string }> = {
  "salario-minimo": { title: "Salário Mínimo", description: "Valores históricos do salário mínimo nacional" },
  "pisos-salariais": { title: "Pisos Salariais", description: "Pisos salariais por categoria profissional" },
  "salario-familia": { title: "Salário-família", description: "Tabela de cotas do salário-família" },
  "seguro-desemprego": { title: "Seguro-desemprego", description: "Faixas de cálculo do seguro-desemprego" },
  "vale-transporte": { title: "Vale-transporte", description: "Valores de passagens por linha/município" },
  "feriados": { title: "Feriados e Pontos Facultativos", description: "Calendário de feriados nacionais, estaduais e municipais" },
  "verbas": { title: "Verbas", description: "Cadastro de verbas trabalhistas padrão" },
  "contribuicao-social": { title: "Contribuição Social", description: "Tabelas de alíquotas do INSS (segurado e empregador)" },
  "imposto-renda": { title: "Imposto de Renda", description: "Tabela progressiva do IRRF e deduções" },
  "custas-judiciais": { title: "Custas Judiciais", description: "Tabelas de custas por tribunal" },
  "correcao-monetaria": { title: "Correção Monetária", description: "Índices IPCA-E, INPC, TR e SELIC" },
  "juros-mora": { title: "Juros de Mora", description: "Tabelas de juros conforme ADC 58/59 STF" },
  "atualizacao-indices": { title: "Atualização de Tabelas e Índices", description: "Gestão e importação de séries de índices" },
};

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtComp(d: string) {
  if (!d) return "—";
  const [y, m] = d.split("-");
  return `${m}/${y}`;
}
function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ============================================
// Pagination component
// ============================================
function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let i = Math.max(1, page - 5); i <= Math.min(totalPages, page + 5); i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(1)} disabled={page === 1}>
        <ChevronsLeft className="h-3 w-3" />
      </Button>
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        <ChevronLeft className="h-3 w-3" />
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="icon"
          className="h-7 w-7 text-xs"
          onClick={() => onPageChange(p)}
        >
          {p}
        </Button>
      ))}
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        <ChevronRight className="h-3 w-3" />
      </Button>
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>
        <ChevronsRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ============================================
// CSV Import component
// ============================================
function CsvImporter({ tipo, onImported }: { tipo: string; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("Arquivo CSV deve ter cabeçalho + dados");

      const headers = lines[0].split(";").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const rows = lines.slice(1).map(l => {
        const cols = l.split(";").map(c => c.trim().replace(/"/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
        return obj;
      });

      let inserted = 0;

      if (tipo === "salario-minimo") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"] || r["mes_ano"]),
          valor: parseNumBR(r["valor do salário"] || r["valor"] || r["valor_salario"]),
        })).filter(r => r.competencia && r.valor != null);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_salario_minimo" as any).upsert(rec as any, { onConflict: "competencia" });
          if (!error) inserted++;
        }
      } else if (tipo === "salario-familia") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          faixa: parseInt(r["faixa"] || "1"),
          valor_inicial: parseNumBR(r["vl. inicial"] || r["valor_inicial"] || "0"),
          valor_final: parseNumBR(r["vl. final"] || r["valor_final"]),
          valor_cota: parseNumBR(r["vl. do salário"] || r["valor_cota"] || r["valor"]),
        })).filter(r => r.competencia && r.valor_cota != null);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_salario_familia" as any).upsert(rec as any, { onConflict: "competencia,faixa" });
          if (!error) inserted++;
        }
      } else if (tipo === "contribuicao-social") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          tipo: r["tipo"] || "segurado_empregado",
          faixa: parseInt(r["faixa"] || "1"),
          valor_inicial: parseNumBR(r["vl. inicial"] || r["valor_inicial"] || "0"),
          valor_final: parseNumBR(r["vl. final"] || r["valor_final"]),
          aliquota: parseNumBR(r["%"] || r["aliquota"] || r["(%)"] || "0"),
          teto_maximo: parseNumBR(r["teto máx."] || r["teto_maximo"]),
          teto_beneficio: parseNumBR(r["teto ben."] || r["teto_beneficio"]),
        })).filter(r => r.competencia);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_contribuicao_social" as any).upsert(rec as any, { onConflict: "competencia,tipo,faixa" });
          if (!error) inserted++;
        }
      } else if (tipo === "imposto-renda") {
        // Import deductions
        const compMap = new Map<string, { dep: number; apos: number }>();
        rows.forEach(r => {
          const comp = parseCompetencia(r["mes/ano"] || r["competencia"]);
          if (comp) compMap.set(comp, {
            dep: parseNumBR(r["dedução por dependente"] || r["deducao_dependente"]) || 0,
            apos: parseNumBR(r["dedução por aposentado maior que 65 anos"] || r["deducao_aposentado_65"]) || 0,
          });
        });
        for (const [comp, vals] of compMap) {
          const { error } = await supabase.from("pjecalc_imposto_renda" as any).upsert({
            competencia: comp,
            deducao_dependente: vals.dep,
            deducao_aposentado_65: vals.apos,
          } as any, { onConflict: "competencia" });
          if (!error) inserted++;
        }
      } else if (tipo === "custas-judiciais") {
        const records = rows.map(r => ({
          vigencia_inicio: parseDate(r["início"] || r["inicio"] || r["vigencia_inicio"]),
          vigencia_fim: parseDate(r["fim"] || r["vigencia_fim"]) || null,
          atos_oficiais_urbana: parseNumBR(r["atos dos oficiais de justiça zona urbana"] || r["atos_oficiais_urbana"]),
          atos_oficiais_rural: parseNumBR(r["atos dos oficiais de justiça zona rural"] || r["atos_oficiais_rural"]),
          agravo_instrumento: parseNumBR(r["agravo de instrumento"] || r["agravo_instrumento"]),
          agravo_peticao: parseNumBR(r["agravo de petição"] || r["agravo_peticao"]),
          impugnacao_sentenca: parseNumBR(r["impugnação à sentença de liquidação"] || r["impugnacao_sentenca"]),
          recurso_revista: parseNumBR(r["recurso de revista"] || r["recurso_revista"]),
          embargos_arrematacao: parseNumBR(r["embargos à arrematação"] || r["embargos_arrematacao"]),
          embargos_execucao: parseNumBR(r["embargos à execução"] || r["embargos_execucao"]),
          embargos_terceiros: parseNumBR(r["embargos de terceiros"] || r["embargos_terceiros"]),
          piso_custas_conhecimento: parseNumBR(r["piso - custas conhecimento"] || r["piso_custas_conhecimento"]),
          teto_custas_liquidacao: parseNumBR(r["teto - custas liquidação"] || r["teto_custas_liquidacao"]),
          teto_custas_autos: parseNumBR(r["teto - custas de autos"] || r["teto_custas_autos"]),
        })).filter(r => r.vigencia_inicio);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_custas_judiciais" as any).upsert(rec as any, { onConflict: "vigencia_inicio" });
          if (!error) inserted++;
        }
      } else if (tipo === "correcao-monetaria") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          indice: r["índice"] || r["indice"] || r["nome"] || "IPCA-E",
          valor: parseNumBR(r["valor"] || r["indice_valor"]),
          acumulado: parseNumBR(r["acumulado"]),
          fonte: r["fonte"] || null,
        })).filter(r => r.competencia && r.valor != null);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_correcao_monetaria" as any).upsert(rec as any, { onConflict: "competencia,indice" });
          if (!error) inserted++;
        }
      } else if (tipo === "juros-mora") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          tipo: r["tipo"] || "trabalhista",
          taxa_mensal: parseNumBR(r["taxa"] || r["taxa_mensal"] || r["valor"]),
          acumulado: parseNumBR(r["acumulado"]),
        })).filter(r => r.competencia && r.taxa_mensal != null);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_juros_mora" as any).upsert(rec as any, { onConflict: "competencia,tipo" });
          if (!error) inserted++;
        }
      } else if (tipo === "seguro-desemprego") {
        const records = rows.map(r => ({
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          valor_piso: parseNumBR(r["vl. piso"] || r["valor_piso"]),
          faixa: parseInt(r["faixa"] || "1"),
          valor_inicial: parseNumBR(r["vl. inicial"] || r["valor_inicial"] || "0"),
          valor_final: parseNumBR(r["vl. final"] || r["valor_final"]),
          percentual: parseNumBR(r["percentual (%)"] || r["percentual"]),
          valor_soma: parseNumBR(r["vl. da soma"] || r["valor_soma"]),
          valor_teto: parseNumBR(r["vl. teto"] || r["valor_teto"]),
        })).filter(r => r.competencia);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_seguro_desemprego" as any).upsert(rec as any, { onConflict: "competencia,faixa" });
          if (!error) inserted++;
        }
      } else if (tipo === "pisos-salariais") {
        const records = rows.map(r => ({
          nome: r["nome"] || r["categoria"],
          uf: r["estado"] || r["uf"],
          competencia: parseCompetencia(r["mes/ano"] || r["competencia"]),
          valor: parseNumBR(r["valor"]),
          categoria: r["categoria"] || null,
          sindicato: r["sindicato"] || null,
        })).filter(r => r.competencia && r.nome && r.uf);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_pisos_salariais" as any).insert(rec as any);
          if (!error) inserted++;
        }
      } else if (tipo === "vale-transporte") {
        const records = rows.map(r => ({
          linha: r["linha"] || r["nome"],
          uf: r["estado"] || r["uf"],
          municipio: r["município"] || r["municipio"] || null,
          valor: parseNumBR(r["valor"]),
          vigencia_inicio: parseDate(r["início"] || r["vigencia_inicio"] || r["data"]),
          vigencia_fim: parseDate(r["fim"] || r["vigencia_fim"]) || null,
        })).filter(r => r.linha && r.uf && r.vigencia_inicio);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_vale_transporte" as any).insert(rec as any);
          if (!error) inserted++;
        }
      } else if (tipo === "verbas") {
        const records = rows.map(r => ({
          nome: r["nome"],
          tipo: r["tipo"] || "principal",
          valor_tipo: r["valor"] || "calculado",
          caracteristica: r["característica"] || r["caracteristica"] || "comum",
          ocorrencia_pagamento: r["ocorrência"] || r["ocorrencia_pagamento"] || "mensal",
          incidencia_fgts: r["fgts"]?.toLowerCase() === "sim",
          incidencia_cs: r["cs"]?.toLowerCase() === "sim",
          incidencia_irpf: r["irpf"]?.toLowerCase() === "sim",
        })).filter(r => r.nome);
        
        for (const rec of records) {
          const { error } = await supabase.from("pjecalc_verbas_padrao" as any).insert(rec as any);
          if (!error) inserted++;
        }
      }

      toast.success(`${inserted} registro(s) importado(s) com sucesso`);
      onImported();
    } catch (err: any) {
      toast.error("Erro na importação: " + (err.message || "Formato inválido"));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [tipo, onImported]);

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
        Importar CSV
      </Button>
    </div>
  );
}

// ============================================
// Parse helpers
// ============================================
function parseCompetencia(s: string | undefined): string | null {
  if (!s) return null;
  s = s.trim();
  // mm/yyyy or mm/yy
  const m1 = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[2]}-${m1[1].padStart(2, "0")}-01`;
  const m2 = s.match(/^(\d{1,2})\/(\d{2})$/);
  if (m2) return `20${m2[2]}-${m2[1].padStart(2, "0")}-01`;
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}/.test(s)) return s.length === 7 ? s + "-01" : s;
  return null;
}
function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  s = s.trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
function parseNumBR(s: string | undefined): number | null {
  if (!s) return null;
  s = s.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ============================================
// Table-specific renderers
// ============================================

function SalarioMinimoView() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_salario_minimo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_salario_minimo" as any).select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <CsvImporter tipo="salario-minimo" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_salario_minimo"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Valor do Salário"]}
            rows={pageRows.map((r: any) => [fmtComp(r.competencia), fmt(r.valor)])}
            aligns={["center", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function SalarioFamiliaView() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_salario_familia"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_salario_familia" as any).select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Group by competencia, pivot faixas
  const grouped = new Map<string, any>();
  (data || []).forEach((r: any) => {
    if (!grouped.has(r.competencia)) grouped.set(r.competencia, {});
    grouped.get(r.competencia)![`f${r.faixa}`] = r;
  });
  const rows = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <CsvImporter tipo="salario-familia" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_salario_familia"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "F1 Vl. Inicial", "F1 Vl. Final", "F1 Vl. do Salário", "F2 Vl. Inicial", "F2 Vl. Final", "F2 Vl. do Salário"]}
            rows={pageRows.map(([comp, faixas]) => [
              fmtComp(comp),
              fmt(faixas.f1?.valor_inicial), fmt(faixas.f1?.valor_final), fmt(faixas.f1?.valor_cota),
              fmt(faixas.f2?.valor_inicial), fmt(faixas.f2?.valor_final), fmt(faixas.f2?.valor_cota),
            ])}
            aligns={["center", "right", "right", "right", "right", "right", "right"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function SeguroDesempregoView() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_seguro_desemprego"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_seguro_desemprego" as any).select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const grouped = new Map<string, any>();
  (data || []).forEach((r: any) => {
    if (!grouped.has(r.competencia)) grouped.set(r.competencia, { piso: r.valor_piso, teto: r.valor_teto });
    grouped.get(r.competencia)![`f${r.faixa}`] = r;
  });
  const rows = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <CsvImporter tipo="seguro-desemprego" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_seguro_desemprego"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Vl. Piso", "F1 Vl. Inicial", "F1 Vl. Final", "F1 Percentual (%)", "F2 Vl. Inicial", "F2 Percentual (%)", "F2 Vl. da Soma", "Vl. Teto"]}
            rows={pageRows.map(([comp, d]) => [
              fmtComp(comp), fmt(d.piso),
              fmt(d.f1?.valor_inicial), fmt(d.f1?.valor_final), fmt(d.f1?.percentual),
              fmt(d.f2?.valor_inicial), fmt(d.f2?.percentual), fmt(d.f2?.valor_soma),
              fmt(d.teto),
            ])}
            aligns={["center", "right", "right", "right", "right", "right", "right", "right", "right"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function ContribuicaoSocialView() {
  const [tab, setTab] = useState("segurado_empregado");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_contribuicao_social", tab],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_contribuicao_social" as any)
        .select("*").eq("tipo", tab).order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const grouped = new Map<string, any>();
  (data || []).forEach((r: any) => {
    if (!grouped.has(r.competencia)) grouped.set(r.competencia, { teto_max: r.teto_maximo, teto_ben: r.teto_beneficio });
    grouped.get(r.competencia)![`f${r.faixa}`] = r;
  });
  const rows = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="segurado_empregado">Segurado Empregado</TabsTrigger>
            <TabsTrigger value="empregado_domestico">Empregado Doméstico</TabsTrigger>
          </TabsList>
        </Tabs>
        <CsvImporter tipo="contribuicao-social" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_contribuicao_social"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "F1 Vl. Inicial", "F1 Vl. Final", "F1 (%)", "F2 Vl. Inicial", "F2 Vl. Final", "F2 (%)", "F3 Vl. Inicial", "F3 Vl. Final", "F3 (%)", "Teto Máx.", "Teto Ben."]}
            rows={pageRows.map(([comp, d]) => [
              fmtComp(comp),
              fmt(d.f1?.valor_inicial), fmt(d.f1?.valor_final), fmt(d.f1?.aliquota),
              fmt(d.f2?.valor_inicial), fmt(d.f2?.valor_final), fmt(d.f2?.aliquota),
              fmt(d.f3?.valor_inicial), fmt(d.f3?.valor_final), fmt(d.f3?.aliquota),
              fmt(d.teto_max), fmt(d.teto_ben),
            ])}
            aligns={Array(12).fill("right").map((_, i) => i === 0 ? "center" : "right") as any}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function ImpostoRendaView() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_imposto_renda"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_imposto_renda" as any).select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <CsvImporter tipo="imposto-renda" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_imposto_renda"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Dedução por Dependente", "Dedução por Aposentado Maior que 65 Anos", "Faixas"]}
            rows={pageRows.map((r: any) => [
              fmtComp(r.competencia), fmt(r.deducao_dependente), fmt(r.deducao_aposentado_65), "Exibir",
            ])}
            aligns={["center", "center", "center", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function CustasJudiciaisView() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_custas_judiciais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_custas_judiciais" as any).select("*").order("vigencia_inicio", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  return (
    <div>
      <div className="flex justify-end mb-3">
        <CsvImporter tipo="custas-judiciais" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_custas_judiciais"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : (data || []).length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <DataTable
            headers={[
              "Início", "Fim", "Atos Oficiais Zona Urbana", "Atos Oficiais Zona Rural",
              "Agravo de Instrumento", "Agravo de Petição", "Impugnação à Sentença de Liquidação",
              "Recurso de Revista", "Embargos à Arrematação", "Embargos à Execução",
              "Embargos de Terceiros", "Piso - Custas Conhecimento", "Teto - Custas Liquidação", "Teto - Custas de Autos"
            ]}
            rows={(data || []).map((r: any) => [
              fmtDate(r.vigencia_inicio), r.vigencia_fim ? fmtDate(r.vigencia_fim) : "",
              fmt(r.atos_oficiais_urbana), fmt(r.atos_oficiais_rural),
              fmt(r.agravo_instrumento), fmt(r.agravo_peticao), fmt(r.impugnacao_sentenca),
              fmt(r.recurso_revista), fmt(r.embargos_arrematacao), fmt(r.embargos_execucao),
              fmt(r.embargos_terceiros), fmt(r.piso_custas_conhecimento), fmt(r.teto_custas_liquidacao), fmt(r.teto_custas_autos),
            ])}
            aligns={Array(14).fill("right").map((_, i) => i < 2 ? "center" : "right") as any}
          />
        </div>
      )}
    </div>
  );
}

function CorrecaoMonetariaView() {
  const [indice, setIndice] = useState("IPCA-E");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_correcao_monetaria", indice],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_correcao_monetaria" as any)
        .select("*").eq("indice", indice).order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Índice:</span>
          <Select value={indice} onValueChange={(v) => { setIndice(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["IPCA-E", "INPC", "TR", "SELIC", "IGP-M", "FACDT"].map(i => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CsvImporter tipo="correcao-monetaria" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_correcao_monetaria"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Índice Mensal", "Acumulado", "Fonte"]}
            rows={pageRows.map((r: any) => [fmtComp(r.competencia), fmt(r.valor), r.acumulado ? fmt(r.acumulado) : "—", r.fonte || "—"])}
            aligns={["center", "right", "right", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function JurosMoraView() {
  const [tipoJuros, setTipoJuros] = useState("trabalhista");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pjecalc_juros_mora", tipoJuros],
    queryFn: async () => {
      const { data, error } = await supabase.from("pjecalc_juros_mora" as any)
        .select("*").eq("tipo", tipoJuros).order("competencia", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <Select value={tipoJuros} onValueChange={(v) => { setTipoJuros(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trabalhista">Trabalhista</SelectItem>
            <SelectItem value="selic">SELIC</SelectItem>
            <SelectItem value="civil">Civil</SelectItem>
          </SelectContent>
        </Select>
        <CsvImporter tipo="juros-mora" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_juros_mora"] })} />
      </div>
      {isLoading ? <LoadingSpinner /> : rows.length === 0 ? <EmptyState /> : (
        <>
          <DataTable
            headers={["Mês/Ano", "Taxa Mensal (%)", "Acumulado"]}
            rows={pageRows.map((r: any) => [fmtComp(r.competencia), fmt(r.taxa_mensal), r.acumulado ? fmt(r.acumulado) : "—"])}
            aligns={["center", "right", "right"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function PisosSalariaisView() {
  const [filterNome, setFilterNome] = useState("");
  const [filterUf, setFilterUf] = useState("all");
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pjecalc_pisos_salariais", filterNome, filterUf],
    queryFn: async () => {
      let q = supabase.from("pjecalc_pisos_salariais" as any).select("*").order("competencia", { ascending: false }).limit(500);
      if (filterUf !== "all") q = q.eq("uf", filterUf);
      if (filterNome) q = q.ilike("nome", `%${filterNome}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: searched,
  });

  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Dados da Busca</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={filterNome} onChange={e => setFilterNome(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => { setSearched(true); setPage(1); refetch(); }}>
              <Search className="h-3.5 w-3.5 mr-1" /> Buscar
            </Button>
            <CsvImporter tipo="pisos-salariais" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_pisos_salariais"] })} />
          </div>
        </CardContent>
      </Card>
      {isLoading ? <LoadingSpinner /> : searched && rows.length === 0 ? <EmptyState msg="Nenhum piso salarial encontrado." /> : searched ? (
        <>
          <DataTable
            headers={["Mês/Ano", "Nome", "UF", "Valor", "Categoria"]}
            rows={pageRows.map((r: any) => [fmtComp(r.competencia), r.nome, r.uf, fmt(r.valor), r.categoria || "—"])}
            aligns={["center", "left", "center", "right", "left"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

function ValeTransporteView() {
  const [filterLinha, setFilterLinha] = useState("");
  const [filterUf, setFilterUf] = useState("all");
  const [filterMun, setFilterMun] = useState("");
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pjecalc_vale_transporte", filterLinha, filterUf, filterMun],
    queryFn: async () => {
      let q = supabase.from("pjecalc_vale_transporte" as any).select("*").order("vigencia_inicio", { ascending: false }).limit(500);
      if (filterUf !== "all") q = q.eq("uf", filterUf);
      if (filterMun) q = q.ilike("municipio", `%${filterMun}%`);
      if (filterLinha) q = q.ilike("linha", `%${filterLinha}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: searched,
  });

  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Dados da Busca</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Linha</label>
              <Input value={filterLinha} onChange={e => setFilterLinha(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <label className="text-xs text-muted-foreground">Município</label>
              <Input value={filterMun} onChange={e => setFilterMun(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => { setSearched(true); setPage(1); refetch(); }}>
              <Search className="h-3.5 w-3.5 mr-1" /> Buscar
            </Button>
            <CsvImporter tipo="vale-transporte" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_vale_transporte"] })} />
          </div>
        </CardContent>
      </Card>
      {isLoading ? <LoadingSpinner /> : searched && rows.length === 0 ? <EmptyState msg="Nenhum registro encontrado." /> : searched ? (
        <>
          <DataTable
            headers={["Linha", "UF", "Município", "Valor", "Vigência Início", "Vigência Fim"]}
            rows={pageRows.map((r: any) => [r.linha, r.uf, r.municipio || "—", fmt(r.valor), fmtDate(r.vigencia_inicio), r.vigencia_fim ? fmtDate(r.vigencia_fim) : "—"])}
            aligns={["left", "center", "left", "right", "center", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

function FeriadosView() {
  const [filterUf, setFilterUf] = useState("all");
  const [filterMun, setFilterMun] = useState("");
  const [filterNome, setFilterNome] = useState("");
  const [searched, setSearched] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["calendars_feriados", filterUf, filterMun, filterNome],
    queryFn: async () => {
      let q = supabase.from("calendars").select("*").order("ano", { ascending: false });
      if (filterUf !== "all") q = q.eq("uf", filterUf);
      if (filterMun) q = q.ilike("municipio", `%${filterMun}%`);
      if (filterNome) q = q.ilike("nome", `%${filterNome}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: searched,
  });

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Dados da Busca</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={filterNome} onChange={e => setFilterNome(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select value={filterUf} onValueChange={setFilterUf}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Município</label>
              <Input value={filterMun} onChange={e => setFilterMun(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <Button size="sm" className="mt-3" onClick={() => { setSearched(true); refetch(); }}>
            <Search className="h-3.5 w-3.5 mr-1" /> Buscar
          </Button>
        </CardContent>
      </Card>
      {isLoading ? <LoadingSpinner /> : searched && (data || []).length === 0 ? <EmptyState msg="Nenhum calendário encontrado." /> : searched ? (
        <div className="space-y-3">
          {(data || []).map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">{c.nome}</span>
                  <Badge variant="secondary" className="text-[10px]">{c.uf}</Badge>
                  {c.municipio && <Badge variant="outline" className="text-[10px]">{c.municipio}</Badge>}
                  <Badge variant="outline" className="text-[10px]">{c.ano}</Badge>
                </div>
                {Array.isArray(c.feriados) && c.feriados.length > 0 ? (
                  <DataTable
                    headers={["Data", "Nome", "Tipo"]}
                    rows={c.feriados.map((f: any) => [f.data || "—", f.nome || "—", f.tipo || "—"])}
                    aligns={["center", "left", "center"]}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Sem feriados cadastrados.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VerbasView() {
  const [filterNome, setFilterNome] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterValor, setFilterValor] = useState("all");
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pjecalc_verbas_padrao", filterNome, filterTipo, filterValor],
    queryFn: async () => {
      let q = supabase.from("pjecalc_verbas_padrao" as any).select("*").eq("ativo", true).order("nome");
      if (filterNome) q = q.ilike("nome", `%${filterNome}%`);
      if (filterTipo !== "all") q = q.eq("tipo", filterTipo);
      if (filterValor !== "all") q = q.eq("valor_tipo", filterValor);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: searched,
  });

  const rows = data || [];
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Dados da Busca</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={filterNome} onChange={e => setFilterNome(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Valor</label>
              <Select value={filterValor} onValueChange={setFilterValor}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="calculado">Calculado</SelectItem>
                  <SelectItem value="informado">Informado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="reflexa">Reflexa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => { setSearched(true); setPage(1); refetch(); }}>
              <Search className="h-3.5 w-3.5 mr-1" /> Buscar
            </Button>
            <CsvImporter tipo="verbas" onImported={() => qc.invalidateQueries({ queryKey: ["pjecalc_verbas_padrao"] })} />
          </div>
        </CardContent>
      </Card>
      {isLoading ? <LoadingSpinner /> : searched && rows.length === 0 ? <EmptyState msg="Nenhuma verba encontrada." /> : searched ? (
        <>
          <DataTable
            headers={["Nome", "Tipo", "Valor", "Característica", "Ocorrência", "FGTS", "CS", "IRPF"]}
            rows={pageRows.map((r: any) => [
              r.nome, r.tipo, r.valor_tipo, r.caracteristica, r.ocorrencia_pagamento,
              r.incidencia_fgts ? "Sim" : "Não", r.incidencia_cs ? "Sim" : "Não", r.incidencia_irpf ? "Sim" : "Não",
            ])}
            aligns={["left", "center", "center", "center", "center", "center", "center", "center"]}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}

function AtualizacaoIndicesView() {
  const [selectedTrt, setSelectedTrt] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const qc = useQueryClient();

  const handleAutoImport = async (trt: string) => {
    setSelectedTrt(trt);
    setSeeding(true);
    setSeedResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("seed-pjecalc-tables", {
        body: { trt },
      });
      if (error) throw error;
      setSeedResult(data);
      toast.success(`Tabelas do ${trt} importadas com sucesso! ${data?.total_registros || 0} registros.`);
      // Invalidate all table queries
      qc.invalidateQueries();
    } catch (err: any) {
      toast.error("Erro na importação automática: " + (err.message || "Falha"));
      setSeedResult({ error: err.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-import by TRT */}
      <Card className="border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm">Importação Automática por TRT</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Selecione o TRT do processo para importar automaticamente todas as tabelas oficiais do PJe-Calc
            (salário mínimo, INSS, IRRF, custas, feriados regionais, verbas padrão e mais).
          </p>

          {seeding && (
            <div className="flex items-center gap-3 mb-4 p-3 rounded bg-primary/5 border border-primary/20">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Importando tabelas do {selectedTrt}...</p>
                <p className="text-xs text-muted-foreground">Aguarde, isso pode levar alguns segundos.</p>
              </div>
            </div>
          )}

          {seedResult && !seedResult.error && (
            <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium text-primary">
                ✅ Importação concluída — {seedResult.total_registros} registros processados
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {seedResult.detalhes && Object.entries(seedResult.detalhes).map(([k, v]) => (
                  <div key={k} className="text-[10px] text-muted-foreground">
                    <span className="font-medium">{k.replace(/_/g, " ")}:</span> {String(v)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TRTS).map(([trt, nome]) => (
              <button
                key={trt}
                onClick={() => handleAutoImport(trt)}
                disabled={seeding}
                className="flex items-center gap-2 p-2.5 rounded border border-border/50 text-xs hover:bg-primary/5 hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <Badge variant={selectedTrt === trt && seedResult && !seedResult.error ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {trt.replace("TRT", "TRT ")}
                </Badge>
                <span className="text-muted-foreground truncate">{nome}</span>
                {seeding && selectedTrt === trt && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                {selectedTrt === trt && seedResult && !seedResult.error && <span className="ml-auto text-primary">✓</span>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual CSV fallback */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-sm mb-2">Importação Manual (CSV)</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Caso precise importar dados específicos não incluídos na importação automática, use os importadores CSV abaixo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(TABELA_CONFIG).filter(([k]) => k !== "atualizacao-indices").map(([key, config]) => (
              <Card key={key} className="border border-border/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{config.title}</p>
                    <p className="text-[10px] text-muted-foreground">{config.description}</p>
                  </div>
                  <CsvImporter tipo={key} onImported={() => qc.invalidateQueries()} />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Shared components
// ============================================

function DataTable({ headers, rows, aligns }: { headers: string[]; rows: string[][]; aligns?: string[] }) {
  return (
    <div className="overflow-x-auto border border-border rounded">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-primary/10 border-b border-border">
            {headers.map((h, i) => (
              <th key={i} className="p-2 font-semibold text-foreground" style={{ textAlign: (aligns?.[i] || "left") as any }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-muted/20" : "bg-muted/40"}>
              {row.map((cell, ci) => (
                <td key={ci} className="p-2 border-b border-border/30" style={{ textAlign: (aligns?.[ci] || "left") as any }}>
                  <span className="font-medium">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function EmptyState({ msg }: { msg?: string }) {
  return (
    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{msg || "Nenhum dado cadastrado. Importe um arquivo CSV para popular esta tabela."}</CardContent></Card>
  );
}

// ============================================
// Main component
// ============================================

const VIEW_MAP: Record<string, React.FC> = {
  "salario-minimo": SalarioMinimoView,
  "salario-familia": SalarioFamiliaView,
  "seguro-desemprego": SeguroDesempregoView,
  "contribuicao-social": ContribuicaoSocialView,
  "imposto-renda": ImpostoRendaView,
  "custas-judiciais": CustasJudiciaisView,
  "correcao-monetaria": CorrecaoMonetariaView,
  "juros-mora": JurosMoraView,
  "pisos-salariais": PisosSalariaisView,
  "vale-transporte": ValeTransporteView,
  "feriados": FeriadosView,
  "verbas": VerbasView,
  "atualizacao-indices": AtualizacaoIndicesView,
};

export default function Tabelas() {
  const { tipo } = useParams<{ tipo: string }>();
  const config = tipo ? TABELA_CONFIG[tipo] : null;
  const ViewComponent = tipo ? VIEW_MAP[tipo] : null;

  if (!config || !ViewComponent) {
    return (
      <MainLayoutPremium title="Tabelas" breadcrumbs={[{ label: "Tabelas" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Selecione uma tabela</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha uma tabela no menu lateral para visualizar os dados de referência.
          </p>
        </div>
      </MainLayoutPremium>
    );
  }

  return (
    <MainLayoutPremium
      title={config.title}
      breadcrumbs={[{ label: "Tabelas" }, { label: config.title }]}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <ViewComponent />
      </div>
    </MainLayoutPremium>
  );
}

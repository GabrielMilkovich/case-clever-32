import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const TABELA_CONFIG: Record<string, { title: string; description: string; source: string }> = {
  "salario-minimo": { title: "Salário Mínimo", description: "Valores históricos do salário mínimo nacional", source: "index_series" },
  "pisos-salariais": { title: "Pisos Salariais", description: "Pisos salariais por categoria profissional", source: "index_series" },
  "salario-familia": { title: "Salário-família", description: "Tabela de cotas do salário-família", source: "index_series" },
  "seguro-desemprego": { title: "Seguro-desemprego", description: "Faixas de cálculo do seguro-desemprego", source: "index_series" },
  "vale-transporte": { title: "Vale-transporte", description: "Percentuais e regras do vale-transporte", source: "index_series" },
  "feriados": { title: "Feriados e Pontos Facultativos", description: "Calendário de feriados nacionais, estaduais e municipais", source: "calendars" },
  "verbas": { title: "Verbas", description: "Cadastro de verbas trabalhistas padrão", source: "calculators" },
  "contribuicao-social": { title: "Contribuição Social", description: "Tabelas de alíquotas do INSS (segurado e empregador)", source: "index_series" },
  "imposto-renda": { title: "Imposto de Renda", description: "Tabela progressiva do IRRF e RRA", source: "index_series" },
  "custas-judiciais": { title: "Custas Judiciais", description: "Tabelas de custas por tribunal", source: "index_series" },
  "correcao-monetaria": { title: "Correção Monetária", description: "Índices IPCA-E, INPC, TR e SELIC", source: "index_series" },
  "juros-mora": { title: "Juros de Mora", description: "Tabelas de juros conforme ADC 58/59 STF", source: "index_series" },
  "atualizacao-indices": { title: "Atualização de Tabelas e Índices", description: "Gestão e importação de séries de índices", source: "index_series" },
};

export default function Tabelas() {
  const { tipo } = useParams<{ tipo: string }>();
  const config = tipo ? TABELA_CONFIG[tipo] : null;
  const [filter, setFilter] = useState("");

  const { data: indexData = [], isLoading: indexLoading } = useQuery({
    queryKey: ["tabelas_index", tipo],
    queryFn: async () => {
      if (!config || config.source !== "index_series") return [];
      const { data, error } = await supabase
        .from("index_series")
        .select("*")
        .order("competencia", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!config && config.source === "index_series",
  });

  const { data: calendarsData = [], isLoading: calendarsLoading } = useQuery({
    queryKey: ["tabelas_calendars", tipo],
    queryFn: async () => {
      if (!config || config.source !== "calendars") return [];
      const { data, error } = await supabase
        .from("calendars")
        .select("*")
        .order("ano", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!config && config.source === "calendars",
  });

  if (!config) {
    return (
      <MainLayoutPremium title="Tabelas" breadcrumbs={[{ label: "Tabelas" }]}>
        <div className="empty-state">
          <Search className="empty-state-icon" />
          <h3 className="empty-state-title">Selecione uma tabela</h3>
          <p className="empty-state-description">
            Escolha uma tabela no menu lateral para visualizar os dados de referência.
          </p>
        </div>
      </MainLayoutPremium>
    );
  }

  const isLoading = indexLoading || calendarsLoading;

  const filteredIndex = indexData.filter((r: any) =>
    !filter || r.nome?.toLowerCase().includes(filter.toLowerCase()) ||
    r.competencia?.includes(filter)
  );

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

        {/* Filter */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por nome ou competência..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : config.source === "calendars" ? (
          <div className="space-y-3">
            {calendarsData.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum calendário cadastrado.</CardContent></Card>
            ) : calendarsData.map((c: any) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {c.nome}
                    <Badge variant="secondary" className="text-[10px]">{c.uf}</Badge>
                    {c.municipio && <Badge variant="outline" className="text-[10px]">{c.municipio}</Badge>}
                    <Badge variant="outline" className="text-[10px]">{c.ano}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {Array.isArray(c.feriados) ? `${c.feriados.length} feriado(s)` : "Sem feriados"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filteredIndex.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum dado encontrado.</CardContent></Card>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-3 text-left font-medium">Nome</th>
                    <th className="p-3 text-left font-medium">Competência</th>
                    <th className="p-3 text-right font-medium">Valor</th>
                    <th className="p-3 text-left font-medium">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIndex.slice(0, 200).map((r: any) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3">{r.nome}</td>
                      <td className="p-3 font-mono text-xs">{r.competencia}</td>
                      <td className="p-3 text-right font-mono">{Number(r.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-xs text-muted-foreground">{r.fonte || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredIndex.length > 200 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Exibindo 200 de {filteredIndex.length} registros. Use o filtro para refinar.
              </p>
            )}
          </div>
        )}
      </div>
    </MainLayoutPremium>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { CaseCard } from "@/components/cases/CaseCard";
import { CreateCaseDialog } from "@/components/cases/CreateCaseDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Filter, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Case {
  id: string;
  cliente: string;
  numero_processo: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criado_em: string;
}

export default function Casos() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Case[];
    },
  });

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.numero_processo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: cases.length,
    rascunho: cases.filter((c) => c.status === "rascunho").length,
    em_analise: cases.filter((c) => c.status === "em_analise").length,
    calculado: cases.filter((c) => c.status === "calculado").length,
    revisado: cases.filter((c) => c.status === "revisado").length,
  };

  return (
    <MainLayoutPremium
      breadcrumbs={[{ label: "Casos" }]}
      title="Casos"
    >
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Casos Trabalhistas</h1>
            <p className="text-sm text-muted-foreground">
              {cases.length} caso{cases.length !== 1 ? "s" : ""} cadastrado{cases.length !== 1 ? "s" : ""}
            </p>
          </div>
          <CreateCaseDialog />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou processo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
              <SelectItem value="rascunho">Rascunho ({statusCounts.rascunho})</SelectItem>
              <SelectItem value="em_analise">Em Análise ({statusCounts.em_analise})</SelectItem>
              <SelectItem value="calculado">Calculado ({statusCounts.calculado})</SelectItem>
              <SelectItem value="revisado">Revisado ({statusCounts.revisado})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {cases.length === 0 ? "Nenhum caso cadastrado. Crie seu primeiro caso!" : "Nenhum caso encontrado com esses filtros."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCases.map((c, i) => (
              <div key={c.id} className="animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <CaseCard
                  id={c.id}
                  cliente={c.cliente}
                  numeroProcesso={c.numero_processo}
                  status={c.status}
                  criadoEm={c.criado_em}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayoutPremium>
  );
}

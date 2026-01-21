import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { CaseCard } from "@/components/cases/CaseCard";
import { CreateCaseDialog } from "@/components/cases/CreateCaseDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Filter } from "lucide-react";
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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Casos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os seus casos trabalhistas
            </p>
          </div>
          <CreateCaseDialog />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou processo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="calculado">Calculado</SelectItem>
              <SelectItem value="revisado">Revisado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cases Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {cases.length === 0
                ? "Nenhum caso cadastrado. Crie seu primeiro caso!"
                : "Nenhum caso encontrado com esses filtros."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCases.map((caseItem, index) => (
              <div
                key={caseItem.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CaseCard
                  id={caseItem.id}
                  cliente={caseItem.cliente}
                  numeroProcesso={caseItem.numero_processo}
                  status={caseItem.status}
                  criadoEm={caseItem.criado_em}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Case {
  id: string;
  cliente: string;
  numero_processo: string | null;
  status: "rascunho" | "em_analise" | "calculado" | "revisado";
  criado_em: string;
  atualizado_em: string | null;
}

interface ValidationPending {
  case_id: string;
  cliente: string;
  pending_count: number;
}

interface RecentCalculation {
  id: string;
  case_id: string;
  cliente: string;
  executado_em: string;
  total_bruto: number;
}

const statusConfig = {
  rascunho: { label: "Rascunho", icon: FileText, color: "text-muted-foreground", bg: "bg-muted/50" },
  em_analise: { label: "Em Análise", icon: Sparkles, color: "text-amber-600", bg: "bg-amber-50" },
  calculado: { label: "Calculado", icon: Calculator, color: "text-emerald-600", bg: "bg-emerald-50" },
  revisado: { label: "Revisado", icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
};

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  // Fetch cases
  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ["dashboard-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("atualizado_em", { ascending: false, nullsFirst: false })
        .limit(10);
      
      if (error) throw error;
      return data as Case[];
    },
  });

  // Fetch validation pending counts
  const { data: validationPending = [] } = useQuery({
    queryKey: ["dashboard-validation-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facts")
        .select("case_id, cases!inner(cliente)")
        .eq("confirmado", false)
        .limit(100);
      
      if (error) throw error;
      
      // Group by case_id
      const grouped = (data || []).reduce((acc, item) => {
        const existing = acc.find(x => x.case_id === item.case_id);
        if (existing) {
          existing.pending_count++;
        } else {
          acc.push({
            case_id: item.case_id,
            cliente: (item.cases as any)?.cliente || "—",
            pending_count: 1,
          });
        }
        return acc;
      }, [] as ValidationPending[]);
      
      return grouped.slice(0, 5);
    },
  });

  // Fetch recent calculations
  const { data: recentCalcs = [] } = useQuery({
    queryKey: ["dashboard-recent-calcs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calc_snapshots")
        .select("id, case_id, created_at, total_bruto, cases!inner(cliente)")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        case_id: item.case_id,
        cliente: (item.cases as any)?.cliente || "—",
        executado_em: item.created_at,
        total_bruto: item.total_bruto || 0,
      })) as RecentCalculation[];
    },
  });

  // Fetch documents pending processing
  const { data: docsPending = 0 } = useQuery({
    queryKey: ["dashboard-docs-pending"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "queued", "processing"]);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = {
    total: cases.length,
    emAnalise: cases.filter((c) => c.status === "em_analise").length,
    calculados: cases.filter((c) => c.status === "calculado").length,
    revisados: cases.filter((c) => c.status === "revisado").length,
  };

  const totalPendingValidations = validationPending.reduce((sum, v) => sum + v.pending_count, 0);

  return (
    <MainLayoutPremium
      breadcrumbs={[]}
      title="Visão Geral"
    >
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-primary-foreground shadow-lg">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Bem-vindo ao JurisCálculo
              </h1>
              <p className="text-primary-foreground/80 max-w-xl">
                Sistema de liquidação trabalhista com precisão pericial. Gerencie casos, valide fatos e gere cálculos auditáveis.
              </p>
            </div>
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 shadow-lg btn-premium gap-2"
              onClick={() => navigate("/casos")}
            >
              <Plus className="h-5 w-5" />
              Novo Caso
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Casos Ativos"
            value={stats.total}
            subtitle={`${stats.emAnalise} em análise`}
            icon={Briefcase}
            trend="+12%"
            color="primary"
          />
          <StatCard
            title="Pendências"
            value={totalPendingValidations}
            subtitle={`${validationPending.length} casos`}
            icon={ShieldCheck}
            color="amber"
            alert={totalPendingValidations > 10}
          />
          <StatCard
            title="Cálculos"
            value={stats.calculados + stats.revisados}
            subtitle={`${stats.revisados} revisados`}
            icon={Calculator}
            color="emerald"
          />
          <StatCard
            title="Docs Processando"
            value={docsPending}
            subtitle="em fila"
            icon={FileCheck}
            color="blue"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Work Queue - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Fila de Trabalho
              </h2>
              
              {validationPending.length === 0 && recentCalcs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">Tudo em dia! Nenhuma pendência.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {validationPending.slice(0, 3).map((item, idx) => (
                    <WorkQueueItem
                      key={item.case_id}
                      type="validation"
                      title={`Validar ${item.pending_count} fatos`}
                      subtitle={item.cliente}
                      onClick={() => navigate(`/casos/${item.case_id}`)}
                      delay={idx * 50}
                    />
                  ))}
                  {docsPending > 0 && (
                    <WorkQueueItem
                      type="processing"
                      title={`${docsPending} documentos processando`}
                      subtitle="Aguardando OCR e indexação"
                      onClick={() => navigate("/documentos")}
                      delay={150}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Recent Cases */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Casos Recentes
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/casos")} className="text-primary">
                  Ver todos
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              {loadingCases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum caso cadastrado ainda.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate("/casos")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro caso
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {cases.slice(0, 5).map((caseItem, idx) => {
                    const StatusIcon = statusConfig[caseItem.status].icon;
                    return (
                      <Link
                        key={caseItem.id}
                        to={`/casos/${caseItem.id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 group animate-slide-up"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            statusConfig[caseItem.status].bg
                          )}>
                            <StatusIcon className={cn("h-5 w-5", statusConfig[caseItem.status].color)} />
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">
                              {caseItem.cliente}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {caseItem.numero_processo || "Sem processo"} • {
                                formatDistanceToNow(new Date(caseItem.atualizado_em || caseItem.criado_em), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", statusConfig[caseItem.status].color)}
                          >
                            {statusConfig[caseItem.status].label}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Recent Calculations */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Últimos Cálculos
              </h2>
              
              {recentCalcs.length === 0 ? (
                <div className="text-center py-6">
                  <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum cálculo executado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalcs.map((calc, idx) => (
                    <Link
                      key={calc.id}
                      to={`/casos/${calc.case_id}`}
                      className="block p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 animate-fade-in"
                      style={{ animationDelay: `${idx * 75}ms` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{calc.cliente}</span>
                        <Badge variant="secondary" className="text-xs">
                          {format(new Date(calc.executado_em), "dd/MM", { locale: ptBR })}
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold text-primary">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(calc.total_bruto)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Produtividade
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Casos Finalizados</span>
                    <span className="font-semibold">{stats.revisados}/{stats.total}</span>
                  </div>
                  <Progress 
                    value={stats.total > 0 ? (stats.revisados / stats.total) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Validações Pendentes</span>
                    <span className="font-semibold">{totalPendingValidations}</span>
                  </div>
                  <Progress 
                    value={Math.max(0, 100 - totalPendingValidations * 5)} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            {/* Calendar Widget */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Hoje
              </h2>
              <p className="text-2xl font-bold text-foreground">
                {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(), "EEEE", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayoutPremium>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  alert,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color: "primary" | "amber" | "emerald" | "blue";
  alert?: boolean;
}) {
  const colorClasses = {
    primary: "from-primary/10 to-primary/5 border-primary/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  };
  
  const iconColors = {
    primary: "text-primary bg-primary/10",
    amber: "text-amber-600 bg-amber-500/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    blue: "text-blue-600 bg-blue-500/10",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
      colorClasses[color]
    )}>
      {alert && (
        <div className="absolute top-3 right-3">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconColors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <Badge variant="secondary" className="text-xs text-emerald-600 bg-emerald-50">
            {trend}
          </Badge>
        )}
      </div>
      
      <div className="mt-4">
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
        <p className="text-xs text-muted-foreground/80">{subtitle}</p>
      </div>
    </div>
  );
}

// Work Queue Item Component
function WorkQueueItem({
  type,
  title,
  subtitle,
  onClick,
  delay = 0,
}: {
  type: "validation" | "processing" | "calculation";
  title: string;
  subtitle: string;
  onClick: () => void;
  delay?: number;
}) {
  const typeConfig = {
    validation: { icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50" },
    processing: { icon: Loader2, color: "text-blue-600", bg: "bg-blue-50" },
    calculation: { icon: Calculator, color: "text-emerald-600", bg: "bg-emerald-50" },
  };

  const Icon = typeConfig[type].icon;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 text-left group animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0", typeConfig[type].bg)}>
        <Icon className={cn("h-5 w-5", typeConfig[type].color, type === "processing" && "animate-spin")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </button>
  );
}

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  ChevronDown,
  LogOut,
  Table2,
  DollarSign,
  Building2,
  Users,
  Shield,
  Bus,
  Calendar,
  FileText,
  Receipt,
  Percent,
  Landmark,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoMrd from "@/assets/logo-mrdcalc.png";

const tabelasItems = [
  { icon: DollarSign, label: "Salário Mínimo", path: "/tabelas/salario-minimo" },
  { icon: Building2, label: "Pisos Salariais", path: "/tabelas/pisos-salariais" },
  { icon: Users, label: "Salário-família", path: "/tabelas/salario-familia" },
  { icon: Shield, label: "Seguro-desemprego", path: "/tabelas/seguro-desemprego" },
  { icon: Bus, label: "Vale-transporte", path: "/tabelas/vale-transporte" },
  { icon: Calendar, label: "Feriados e Pontos Facultativos", path: "/tabelas/feriados" },
  { icon: FileText, label: "Verbas", path: "/tabelas/verbas" },
  { icon: Receipt, label: "Contribuição Social", path: "/tabelas/contribuicao-social" },
  { icon: Percent, label: "Imposto de Renda", path: "/tabelas/imposto-renda" },
  { icon: Landmark, label: "Custas Judiciais", path: "/tabelas/custas-judiciais" },
  { icon: TrendingUp, label: "Correção Monetária", path: "/tabelas/correcao-monetaria" },
  { icon: Clock, label: "Juros de Mora", path: "/tabelas/juros-mora" },
  { icon: RefreshCw, label: "Atualização de Tabelas e Índices", path: "/tabelas/atualizacao-indices" },
];

export function SidebarPremium() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [tabelasOpen, setTabelasOpen] = useState(pathname.startsWith("/tabelas"));

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      toast.success("Sessão encerrada");
      navigate("/auth");
    }
  };

  const isActive = (path: string) => {
    if (path === "/casos") return pathname === "/casos" || pathname.startsWith("/casos/");
    return pathname === path;
  };

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col overflow-hidden"
      style={{
        backgroundColor: 'hsl(215 45% 13%)',
        borderRight: '1px solid hsl(215 35% 20%)',
      }}
    >
      {/* Logo */}
      <div
        className="flex h-16 items-center gap-3 px-5"
        style={{ borderBottom: '1px solid hsl(215 35% 20%)' }}
      >
        <img src={logoMrd} alt="MRDCalc" className="h-9 w-9 object-contain" />
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight" style={{ color: 'hsl(210 25% 92%)' }}>
            MRDCalc
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'hsl(210 25% 92% / 0.35)' }}>
            Liquidação
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <div className="space-y-0.5">
          <Link
            to="/casos"
            className={cn(
              "sidebar-nav-item relative",
              isActive("/casos") && "active"
            )}
          >
            <Briefcase className="h-4 w-4 flex-shrink-0" />
            <span>Casos</span>
          </Link>
        </div>

        {/* Tabelas */}
        <div className="mt-6">
          <Collapsible open={tabelasOpen} onOpenChange={setTabelasOpen}>
            <CollapsibleTrigger asChild>
              <button className="sidebar-nav-item w-full justify-between">
                <span className="flex items-center gap-3">
                  <Table2 className="h-4 w-4 flex-shrink-0" />
                  <span>Tabelas</span>
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform duration-200", tabelasOpen && "rotate-180")}
                  style={{ color: 'hsl(210 25% 92% / 0.35)' }}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="space-y-0.5 mt-1 ml-3 pl-3" style={{ borderLeft: '1px solid hsl(215 35% 20% / 0.6)' }}>
                {tabelasItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn("sidebar-nav-item", isActive(item.path) && "active")}
                  >
                    <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid hsl(215 35% 20%)' }}>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full"
          style={{ color: 'hsl(210 25% 92% / 0.35)' }}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}

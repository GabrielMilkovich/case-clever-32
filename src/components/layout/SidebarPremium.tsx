import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Search,
  BookOpen,
  Settings,
  ChevronDown,
  Calculator,
  Users,
  Database,
  LogOut,
  Scale,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Briefcase, label: "Casos", path: "/casos" },
  { icon: Calculator, label: "Novo Cálculo", path: "/novo-calculo" },
  { icon: Scale, label: "Regras & Tabelas", path: "/regras-tabelas" },
  { icon: Search, label: "Busca", path: "/busca" },
  { icon: BookOpen, label: "Biblioteca", path: "/documentos" },
];

const adminNavItems = [
  { icon: Calculator, label: "Calculadoras", path: "/admin/calculadoras" },
  { icon: Users, label: "Perfis", path: "/admin/perfis" },
  { icon: Database, label: "Índices", path: "/admin/indices" },
  { icon: FlaskConical, label: "Testes", path: "/admin/testes" },
];

export function SidebarPremium() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/admin"));

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
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col overflow-hidden"
      style={{
        backgroundColor: 'hsl(222 47% 14%)',
        borderRight: '1px solid hsl(222 30% 22%)',
      }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-3 px-5"
        style={{ borderBottom: '1px solid hsl(222 30% 22%)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ background: 'linear-gradient(135deg, hsl(40 76% 52%), hsl(36 80% 46%))' }}
        >
          <Scale className="h-4 w-4" style={{ color: 'hsl(222 47% 11%)' }} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight" style={{ color: 'hsl(213 31% 91%)' }}>
            JurisCálculo
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'hsl(213 31% 91% / 0.4)' }}>
            Trabalhista
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
        <div className="space-y-0.5">
          {mainNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "sidebar-nav-item relative",
                isActive(item.path) && "active"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Admin */}
        <div className="mt-6">
          <div className="px-3 mb-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'hsl(213 31% 91% / 0.3)' }}>
              Administração
            </span>
          </div>
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
            <CollapsibleTrigger asChild>
              <button className="sidebar-nav-item w-full justify-between">
                <span className="flex items-center gap-3">
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span>Configurar</span>
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform duration-200", adminOpen && "rotate-180")}
                  style={{ color: 'hsl(213 31% 91% / 0.4)' }}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="space-y-0.5 mt-1 ml-3 pl-3" style={{ borderLeft: '1px solid hsl(222 30% 22% / 0.6)' }}>
                {adminNavItems.map((item) => (
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
      <div className="px-3 py-3 space-y-0.5" style={{ borderTop: '1px solid hsl(222 30% 22%)' }}>
        <Link to="/configuracoes" className={cn("sidebar-nav-item", isActive("/configuracoes") && "active")}>
          <Settings className="h-4 w-4 flex-shrink-0" />
          <span>Configurações</span>
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full"
          style={{ color: 'hsl(213 31% 91% / 0.4)' }}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}

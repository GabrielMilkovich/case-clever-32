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
  { icon: LayoutDashboard, label: "Visão Geral", path: "/" },
  { icon: Briefcase, label: "Casos", path: "/casos" },
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
      toast.success("Logout realizado com sucesso");
      navigate("/auth");
    }
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside 
      className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r overflow-hidden"
      style={{ 
        backgroundColor: 'hsl(215 50% 18%)', 
        borderColor: 'hsl(215 40% 25%)' 
      }}
    >
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(38 75% 55% / 0.05), transparent, transparent)' }} />
      
      {/* Logo */}
      <div 
        className="relative flex h-16 items-center gap-3 border-b px-5"
        style={{ borderColor: 'hsl(215 40% 25%)' }}
      >
        <div 
          className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 hover:scale-105"
          style={{ 
            background: 'linear-gradient(135deg, hsl(38 75% 55%), hsl(38 65% 48%))',
            boxShadow: '0 4px 12px hsl(38 75% 55% / 0.25)'
          }}
        >
          <Scale className="h-5 w-5" style={{ color: 'hsl(215 25% 15%)' }} />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight" style={{ color: 'hsl(210 25% 92%)' }}>
            JurisCálculo
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'hsl(210 25% 92% / 0.5)' }}>
            Gestão Trabalhista
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-5 custom-scrollbar">
        {/* Main Nav */}
        <div className="space-y-1">
          {mainNavItems.map((item, idx) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "sidebar-nav-item animate-fade-in",
                isActive(item.path) && "active"
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Admin Section */}
        <div className="mt-8">
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
            <CollapsibleTrigger asChild>
              <button className="sidebar-nav-item w-full justify-between group">
                <span className="flex items-center gap-3">
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">Administração</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    adminOpen && "rotate-180"
                  )}
                  style={{ color: 'hsl(210 25% 92% / 0.5)' }}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div 
                className="space-y-1 mt-2 ml-4 border-l-2 pl-3"
                style={{ borderColor: 'hsl(215 40% 25% / 0.5)' }}
              >
                {adminNavItems.map((item, idx) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "sidebar-nav-item",
                      isActive(item.path) && "active"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </nav>

      {/* Footer */}
      <div 
        className="relative border-t p-3 space-y-1"
        style={{ borderColor: 'hsl(215 40% 25%)' }}
      >
        <Link
          to="/configuracoes"
          className={cn(
            "sidebar-nav-item",
            isActive("/configuracoes") && "active"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">Configurações</span>
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full transition-all duration-200"
          style={{ color: 'hsl(210 25% 92% / 0.5)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'hsl(0 72% 65%)';
            e.currentTarget.style.backgroundColor = 'hsl(0 72% 51% / 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'hsl(210 25% 92% / 0.5)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}

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
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-sidebar-background border-r border-sidebar-border overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-sidebar-primary/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Logo */}
      <div className="relative flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-amber-600 shadow-lg shadow-sidebar-primary/25 transition-transform duration-300 hover:scale-105">
          <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
            JurisCálculo
          </span>
          <span className="text-[11px] text-sidebar-foreground/50 font-medium uppercase tracking-wider">
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
                    "h-4 w-4 text-sidebar-foreground/50 transition-transform duration-300",
                    adminOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="space-y-1 mt-2 ml-4 border-l-2 border-sidebar-border/50 pl-3">
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
      <div className="relative border-t border-sidebar-border p-3 space-y-1">
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
          className="sidebar-nav-item w-full text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}

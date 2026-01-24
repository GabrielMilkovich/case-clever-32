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
  FileText,
  LogOut,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-sidebar-foreground">
            JurisCálculo
          </span>
          <span className="text-xs text-sidebar-foreground/60">
            Gestão Trabalhista
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Main Nav */}
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "sidebar-nav-item",
                isActive(item.path) && "active"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Admin Section */}
        <div className="mt-6">
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
            <CollapsibleTrigger asChild>
              <button className="sidebar-nav-item w-full justify-between group">
                <span className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  <span>Administração</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    adminOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1 ml-3 border-l border-sidebar-border pl-3">
              {adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "sidebar-nav-item",
                    isActive(item.path) && "active"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link
          to="/configuracoes"
          className={cn(
            "sidebar-nav-item",
            isActive("/configuracoes") && "active"
          )}
        >
          <Settings className="h-5 w-5" />
          <span>Configurações</span>
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full text-sidebar-foreground/60 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}

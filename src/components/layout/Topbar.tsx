import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Search,
  Plus,
  Bell,
  ChevronRight,
  Home,
  FileText,
  Calculator,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  breadcrumbs?: Breadcrumb[];
  title?: string;
}

export function Topbar({ breadcrumbs = [], title }: TopbarProps) {
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair: " + error.message);
    } else {
      toast.success("Logout realizado com sucesso");
      navigate("/auth");
    }
  };

  // Keyboard shortcut for command palette
  useState(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  });

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-sm">
            <Link to="/" className="breadcrumb-item flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">JurisCálculo</span>
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center">
                <ChevronRight className="breadcrumb-separator h-4 w-4" />
                {crumb.href ? (
                  <Link to={crumb.href} className="breadcrumb-item">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-foreground">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
          {title && (
            <h1 className="text-lg font-semibold text-foreground ml-2 hidden md:block">
              {title}
            </h1>
          )}
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground font-normal gap-2"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span>Buscar...</span>
            <kbd className="kbd ml-auto">⌘K</kbd>
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-2"
            onClick={() => navigate("/casos")}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Caso</span>
          </Button>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    JC
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover" align="end">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Digite para buscar..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Ações Rápidas">
            <CommandItem onSelect={() => { navigate("/casos"); setCommandOpen(false); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Caso
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/busca"); setCommandOpen(false); }}>
              <Search className="mr-2 h-4 w-4" />
              Buscar Documentos
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navegação">
            <CommandItem onSelect={() => { navigate("/"); setCommandOpen(false); }}>
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/casos"); setCommandOpen(false); }}>
              <FileText className="mr-2 h-4 w-4" />
              Casos
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/admin/calculadoras"); setCommandOpen(false); }}>
              <Calculator className="mr-2 h-4 w-4" />
              Calculadoras
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/configuracoes"); setCommandOpen(false); }}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

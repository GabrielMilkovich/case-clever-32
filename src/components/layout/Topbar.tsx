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
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 shadow-sm">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-sm">
            <Link 
              to="/" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">JurisCálculo</span>
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center">
                <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
                {crumb.href ? (
                  <Link 
                    to={crumb.href} 
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-foreground">
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
            className="w-full justify-start text-muted-foreground font-normal gap-2 h-10 rounded-xl border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-4 w-4 text-muted-foreground/70" />
            <span className="text-muted-foreground/70">Buscar...</span>
            <kbd className="ml-auto inline-flex h-5 items-center gap-1 rounded border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="gap-2 h-9 rounded-lg shadow-sm btn-premium bg-primary hover:bg-primary/90"
            onClick={() => navigate("/casos")}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">Novo Caso</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors duration-200"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent ring-2 ring-background animate-pulse" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-border/60 hover:ring-primary/50 transition-all duration-200">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
                    JC
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover/95 backdrop-blur-lg border-border/60 shadow-lg rounded-xl" align="end">
              <DropdownMenuLabel className="font-semibold">Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/60" />
              <DropdownMenuItem 
                onClick={() => navigate("/configuracoes")}
                className="cursor-pointer rounded-lg focus:bg-muted/80 transition-colors duration-150"
              >
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate("/configuracoes")}
                className="cursor-pointer rounded-lg focus:bg-muted/80 transition-colors duration-150"
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/60" />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg transition-colors duration-150"
              >
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

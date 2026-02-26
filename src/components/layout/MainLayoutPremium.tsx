import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarPremium } from "./SidebarPremium";
import { Topbar } from "./Topbar";
import { supabase } from "@/integrations/supabase/client";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface MainLayoutPremiumProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  title?: string;
}

export function MainLayoutPremium({ children, breadcrumbs, title }: MainLayoutPremiumProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SidebarPremium />
      <div className="ml-60 min-h-screen flex flex-col">
        <Topbar breadcrumbs={breadcrumbs} title={title} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

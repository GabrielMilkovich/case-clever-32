import { ReactNode } from "react";
import { SidebarPremium } from "./SidebarPremium";
import { Topbar } from "./Topbar";

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
  return (
    <div className="min-h-screen bg-background">
      <SidebarPremium />
      <div className="ml-64 min-h-screen flex flex-col">
        <Topbar breadcrumbs={breadcrumbs} title={title} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

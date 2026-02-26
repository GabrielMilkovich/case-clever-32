import { ReactNode } from "react";
import { MainLayoutPremium } from "./MainLayoutPremium";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <MainLayoutPremium>
      {children}
    </MainLayoutPremium>
  );
}

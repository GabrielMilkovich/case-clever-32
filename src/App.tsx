import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Casos from "./pages/Casos";
import CasoDetalhe from "./pages/CasoDetalhe";
import Documentos from "./pages/Documentos";
import Busca from "./pages/Busca";
import Configuracoes from "./pages/Configuracoes";
import AdminCalculadoras from "./pages/admin/Calculadoras";
import AdminPerfis from "./pages/admin/Perfis";
import AdminIndices from "./pages/admin/Indices";
import AdminTestes from "./pages/admin/Testes";
import NovoCalculo from "./pages/NovoCalculo";
import RegrasTabelas from "./pages/RegrasTabelas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/casos" element={<Casos />} />
          <Route path="/casos/:id" element={<CasoDetalhe />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/busca" element={<Busca />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/novo-calculo" element={<NovoCalculo />} />
          <Route path="/regras-tabelas" element={<RegrasTabelas />} />
          <Route path="/admin/calculadoras" element={<AdminCalculadoras />} />
          <Route path="/admin/perfis" element={<AdminPerfis />} />
          <Route path="/admin/indices" element={<AdminIndices />} />
          <Route path="/admin/testes" element={<AdminTestes />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

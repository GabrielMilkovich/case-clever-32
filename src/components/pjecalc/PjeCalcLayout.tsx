import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PjeCalcSidebar, PjeCalcModule, MODULES } from "./PjeCalcSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Calculator, FileDown } from "lucide-react";

// Module components
import DadosProcesso from "./modules/DadosProcesso";
import ParametrosCalculo from "./modules/ParametrosCalculo";
import HistoricoSalarial from "./modules/HistoricoSalarial";
import Faltas from "./modules/Faltas";
import Ferias from "./modules/Ferias";
import CartaoPonto from "./modules/CartaoPonto";
import Verbas from "./modules/Verbas";
import FGTSPanel from "./modules/FGTSPanel";
import ContribuicaoSocial from "./modules/ContribuicaoSocial";
import ImpostoRenda from "./modules/ImpostoRenda";
import CorrecaoJuros from "./modules/CorrecaoJuros";
import Resumo from "./modules/Resumo";

const MODULE_COMPONENTS: Record<PjeCalcModule, React.ComponentType<{ caseId: string }>> = {
  "dados-processo": DadosProcesso,
  "parametros": ParametrosCalculo,
  "historico-salarial": HistoricoSalarial,
  "faltas": Faltas,
  "ferias": Ferias,
  "cartao-ponto": CartaoPonto,
  "verbas": Verbas,
  "fgts": FGTSPanel,
  "contribuicao-social": ContribuicaoSocial,
  "imposto-renda": ImpostoRenda,
  "correcao-juros": CorrecaoJuros,
  "resumo": Resumo,
};

export default function PjeCalcLayout() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<PjeCalcModule>("dados-processo");
  const [collapsed, setCollapsed] = useState(false);
  const [caseName, setCaseName] = useState("");

  useEffect(() => {
    if (!caseId) return;
    supabase
      .from("cases")
      .select("cliente, numero_processo")
      .eq("id", caseId)
      .single()
      .then(({ data }) => {
        if (data) setCaseName(data.numero_processo || data.cliente);
      });
  }, [caseId]);

  if (!caseId) return null;

  const ActiveComponent = MODULE_COMPONENTS[activeModule];
  const currentIdx = MODULES.findIndex((m) => m.id === activeModule);
  const currentModule = MODULES[currentIdx];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <PjeCalcSidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/casos/${caseId}`)}
              className="h-7 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
              {caseName || "Carregando..."}
            </span>
            <span className="text-xs text-muted-foreground">
              — {currentModule.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Save className="h-3.5 w-3.5 mr-1" />
              Salvar
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Calculator className="h-3.5 w-3.5 mr-1" />
              Calcular
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <FileDown className="h-3.5 w-3.5 mr-1" />
              Exportar
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <ActiveComponent caseId={caseId} />
        </main>
      </div>
    </div>
  );
}

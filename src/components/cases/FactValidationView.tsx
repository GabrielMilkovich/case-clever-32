// =====================================================
// COMPONENTE: VALIDAÇÃO DE FATOS COM SPLIT VIEW
// Visualização lado-a-lado: Formulário | Documento
// =====================================================

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Calculator,
  Sparkles,
  Lock,
  Unlock,
} from "lucide-react";

// =====================================================
// TYPES
// =====================================================

interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  origem: string;
  confianca: number | null;
  confirmado: boolean;
  citacao?: string | null;
  pagina?: number | null;
}

interface Document {
  id: string;
  tipo: string;
  arquivo_url: string | null;
  uploaded_em: string;
}

interface FactValidationViewProps {
  caseId: string;
  facts: Fact[];
  documents: Document[];
  onFactsChange?: () => void;
  onValidationComplete?: () => void;
}

// Fatos críticos que DEVEM ser confirmados antes do cálculo
const CRITICAL_FACTS = [
  "data_admissao",
  "data_demissao",
  "salario_base",
  "salario_mensal",
  "jornada_contratual",
];

// Labels para tipos de fatos
const tipoLabels: Record<string, string> = {
  data: "Data",
  moeda: "Moeda",
  numero: "Número",
  texto: "Texto",
  boolean: "Sim/Não",
};

// Labels para origem dos fatos
const origemLabels: Record<string, string> = {
  ia_extracao: "IA",
  usuario: "Manual",
  documento: "Documento",
};

// Labels para chaves de fatos
const chaveLabels: Record<string, string> = {
  data_admissao: "Data de Admissão",
  data_demissao: "Data de Demissão",
  salario_base: "Salário Base",
  salario_mensal: "Salário Mensal",
  jornada_contratual: "Jornada Contratual",
  jornada_alegada: "Jornada Alegada",
  intervalo_intrajornada: "Intervalo Intrajornada",
  adicional_insalubridade: "Adicional Insalubridade",
  adicional_periculosidade: "Adicional Periculosidade",
  horas_extras_mensais: "Horas Extras (Média Mensal)",
  cargo: "Cargo",
  funcao: "Função",
  motivo_demissao: "Motivo Demissão",
  aviso_previo: "Aviso Prévio",
  ferias_vencidas: "Férias Vencidas",
  fgts_depositado: "FGTS Depositado",
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function FactValidationView({
  caseId,
  facts,
  documents,
  onFactsChange,
  onValidationComplete,
}: FactValidationViewProps) {
  const queryClient = useQueryClient();
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [editForm, setEditForm] = useState({ valor: "", tipo: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ chave: "", valor: "", tipo: "texto" });

  // Separar fatos por status
  const pendingFacts = facts.filter((f) => !f.confirmado);
  const confirmedFacts = facts.filter((f) => f.confirmado);

  // Identificar fatos críticos não confirmados
  const unconfirmedCriticalFacts = useMemo(() => {
    return facts.filter(
      (f) => CRITICAL_FACTS.includes(f.chave) && !f.confirmado
    );
  }, [facts]);

  const missingCriticalKeys = useMemo(() => {
    const keysInCase = new Set(facts.map((f) => f.chave));
    return CRITICAL_FACTS.filter((k) => !keysInCase.has(k));
  }, [facts]);

  // Verificar se pode calcular (todos críticos confirmados)
  const canCalculate = useMemo(() => {
    const criticalFactsInCase = facts.filter((f) =>
      CRITICAL_FACTS.includes(f.chave)
    );
    return (
      criticalFactsInCase.length > 0 &&
      criticalFactsInCase.every((f) => f.confirmado)
    );
  }, [facts]);

  // =====================================================
  // MUTATIONS
  // =====================================================

  const confirmMutation = useMutation({
    mutationFn: async ({
      factId,
      confirmed,
    }: {
      factId: string;
      confirmed: boolean;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("facts")
        .update({
          confirmado: confirmed,
          confirmado_por: confirmed ? session?.session?.user.id : null,
          confirmado_em: confirmed ? new Date().toISOString() : null,
        })
        .eq("id", factId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      onFactsChange?.();
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({
      factId,
      valor,
      tipo,
    }: {
      factId: string;
      valor: string;
      tipo: string;
    }) => {
      const { error } = await supabase
        .from("facts")
        .update({
          valor,
          tipo: tipo as "data" | "moeda" | "numero" | "texto" | "boolean",
        })
        .eq("id", factId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      setEditingFact(null);
      toast.success("Fato atualizado!");
      onFactsChange?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (factId: string) => {
      const { error } = await supabase.from("facts").delete().eq("id", factId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      toast.success("Fato removido!");
      onFactsChange?.();
    },
  });

  const createCriticalFactMutation = useMutation({
    mutationFn: async ({ chave, valor, tipo }: { chave: string; valor: string; tipo: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error } = await supabase.from("facts").insert({
        case_id: caseId,
        chave,
        valor,
        tipo: tipo as "data" | "moeda" | "numero" | "texto" | "boolean",
        origem: "usuario",
        // Como é inserção manual do usuário, já nasce confirmado.
        confirmado: true,
        confirmado_por: userId ?? null,
        confirmado_em: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      toast.success("Fato crítico adicionado e confirmado!");
      setCreateOpen(false);
      setCreateForm({ chave: "", valor: "", tipo: "texto" });
      onFactsChange?.();
    },
    onError: (e) => {
      console.error(e);
      toast.error("Não foi possível adicionar o fato.");
    },
  });

  const openCreateForFirstMissing = () => {
    const nextKey = missingCriticalKeys[0] || "";
    setCreateForm((prev) => ({ ...prev, chave: prev.chave || nextKey }));
    setCreateOpen(true);
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getConfidenceConfig = (confianca: number | null) => {
    if (!confianca || confianca === 0)
      return {
        color: "bg-gray-100 text-gray-600 border-gray-300",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        icon: AlertTriangle,
        label: "Sem dados",
      };
    if (confianca >= 0.8)
      return {
        color: "bg-green-100 text-green-700 border-green-300",
        bgColor: "bg-green-50/50",
        borderColor: "border-green-200",
        icon: ShieldCheck,
        label: "Alta confiança",
      };
    if (confianca >= 0.5)
      return {
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
        bgColor: "bg-yellow-50/50",
        borderColor: "border-yellow-200",
        icon: AlertTriangle,
        label: "Verificar",
      };
    return {
      color: "bg-red-100 text-red-700 border-red-300",
      bgColor: "bg-red-50/50",
      borderColor: "border-red-200",
      icon: ShieldAlert,
      label: "Baixa confiança",
    };
  };

  const isCritical = (chave: string) => CRITICAL_FACTS.includes(chave);

  const handleViewDocument = (fact: Fact) => {
    setSelectedFact(fact);
    // Por enquanto, abre o primeiro documento disponível
    // Futuramente, linkar com fact_sources para abrir o documento específico
    if (documents.length > 0 && documents[0].arquivo_url) {
      setSelectedDocUrl(documents[0].arquivo_url);
    }
  };

  const handleEdit = (fact: Fact) => {
    setEditingFact(fact);
    setEditForm({ valor: fact.valor, tipo: fact.tipo });
  };

  const handleSaveEdit = () => {
    if (editingFact) {
      editMutation.mutate({
        factId: editingFact.id,
        valor: editForm.valor,
        tipo: editForm.tipo,
      });
    }
  };

  // =====================================================
  // RENDER FACT ROW
  // =====================================================

  const renderFactRow = (fact: Fact) => {
    const confidence = getConfidenceConfig(fact.confianca);
    const critical = isCritical(fact.chave);
    const ConfidenceIcon = confidence.icon;

    return (
      <div
        key={fact.id}
        className={`p-4 rounded-lg border-2 transition-all ${confidence.bgColor} ${confidence.borderColor} ${
          critical ? "ring-2 ring-primary/20" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Fact Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                {chaveLabels[fact.chave] || fact.chave}
              </span>
              {critical && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="destructive" className="text-xs">
                        Crítico
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este fato deve ser confirmado antes do cálculo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Badge variant="outline" className="text-xs">
                {tipoLabels[fact.tipo] || fact.tipo}
              </Badge>
            </div>

            <div className="text-lg font-bold text-foreground">{fact.valor}</div>

            {/* Citation Display */}
            {fact.citacao && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md border border-muted">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Citação Original
                      {fact.pagina && (
                        <span className="ml-2 text-primary">(Página {fact.pagina})</span>
                      )}
                    </p>
                    <p className="text-sm italic text-foreground/80">
                      "{fact.citacao}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <Badge className={confidence.color}>
                <ConfidenceIcon className="h-3 w-3 mr-1" />
                {fact.confianca ? `${Math.round(fact.confianca * 100)}%` : "N/A"}
              </Badge>
              <Badge variant="secondary">
                {origemLabels[fact.origem] || fact.origem}
              </Badge>
              {fact.confirmado && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirmado
                </Badge>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2">
            {!fact.confirmado ? (
              <Button
                size="sm"
                onClick={() =>
                  confirmMutation.mutate({ factId: fact.id, confirmed: true })
                }
                disabled={confirmMutation.isPending}
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                Confirmar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  confirmMutation.mutate({ factId: fact.id, confirmed: false })
                }
                disabled={confirmMutation.isPending}
                className="gap-1"
              >
                <Clock className="h-4 w-4" />
                Reverter
              </Button>
            )}

            <div className="flex gap-1">
              {documents.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleViewDocument(fact)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(fact)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => deleteMutation.mutate(fact.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  if (facts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum fato extraído ainda.
            <br />
            Faça upload de documentos e use a IA para extrair fatos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Status Banner */}
      <Card
        className={
          canCalculate
            ? "border-green-300 bg-green-50"
            : "border-yellow-300 bg-yellow-50"
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {canCalculate ? (
                <Unlock className="h-6 w-6 text-green-600" />
              ) : (
                <Lock className="h-6 w-6 text-yellow-600" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    canCalculate ? "text-green-700" : "text-yellow-700"
                  }`}
                >
                  {canCalculate
                    ? "✓ Validação Completa - Pronto para Calcular"
                    : `⚠ ${unconfirmedCriticalFacts.length} fato(s) crítico(s) pendente(s)`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {canCalculate
                    ? "Todos os fatos críticos foram confirmados"
                    : "Confirme os fatos marcados como 'Crítico' para liberar o cálculo"}
                </p>

                {!canCalculate && missingCriticalKeys.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Faltando no caso: {missingCriticalKeys.map((k) => chaveLabels[k] || k).join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!canCalculate && missingCriticalKeys.length > 0 && (
                <Button variant="outline" onClick={openCreateForFirstMissing}>
                  Adicionar fato crítico
                </Button>
              )}
              <Button disabled={!canCalculate} onClick={onValidationComplete} className="gap-2">
                <Calculator className="h-4 w-4" />
                {canCalculate ? "Prosseguir para Cálculo" : "Bloqueado"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-foreground">{facts.length}</p>
            <p className="text-sm text-muted-foreground">Total de Fatos</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {confirmedFacts.length}
            </p>
            <p className="text-sm text-muted-foreground">Confirmados</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {pendingFacts.length}
            </p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {facts.filter((f) => (f.confianca || 0) < 0.5).length}
            </p>
            <p className="text-sm text-muted-foreground">Baixa Confiança</p>
          </CardContent>
        </Card>
      </div>

      {/* Split View: Facts | Document */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Facts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fatos Extraídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {/* Critical Facts First */}
                {unconfirmedCriticalFacts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                      <ShieldAlert className="h-4 w-4" />
                      Fatos Críticos Pendentes
                    </div>
                    {unconfirmedCriticalFacts.map(renderFactRow)}
                    <Separator className="my-4" />
                  </>
                )}

                {/* Other Pending Facts */}
                {pendingFacts.filter((f) => !CRITICAL_FACTS.includes(f.chave))
                  .length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-yellow-600 font-medium">
                      <Clock className="h-4 w-4" />
                      Outros Fatos Pendentes
                    </div>
                    {pendingFacts
                      .filter((f) => !CRITICAL_FACTS.includes(f.chave))
                      .map(renderFactRow)}
                    <Separator className="my-4" />
                  </>
                )}

                {/* Confirmed Facts */}
                {confirmedFacts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <CheckCircle className="h-4 w-4" />
                      Fatos Confirmados
                    </div>
                    {confirmedFacts.map(renderFactRow)}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Document Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visualização do Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDocUrl ? (
              <div className="h-[600px] rounded-lg overflow-hidden border">
                <iframe
                  src={selectedDocUrl}
                  className="w-full h-full"
                  title="Document Preview"
                />
              </div>
            ) : (
              <div className="h-[600px] rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Selecione um fato para visualizar</p>
                  <p className="text-sm">
                    Clique no ícone de olho ao lado de um fato
                  </p>
                  {documents.length === 0 && (
                    <p className="text-sm mt-2 text-yellow-600">
                      Nenhum documento anexado ao caso
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingFact}
        onOpenChange={(open) => !open && setEditingFact(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar: {chaveLabels[editingFact?.chave || ""] || editingFact?.chave}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                value={editForm.valor}
                onChange={(e) =>
                  setEditForm({ ...editForm, valor: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={editForm.tipo}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFact(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={editMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Critical Fact Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar fato crítico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chave</Label>
              <Select
                value={createForm.chave}
                onValueChange={(value) => setCreateForm((p) => ({ ...p, chave: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CRITICAL_FACTS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {chaveLabels[k] || k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                value={createForm.valor}
                onChange={(e) => setCreateForm((p) => ({ ...p, valor: e.target.value }))}
                placeholder="Ex.: 01/02/2024, R$ 2.500,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={createForm.tipo}
                onValueChange={(value) => setCreateForm((p) => ({ ...p, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                createCriticalFactMutation.mutate({
                  chave: createForm.chave,
                  valor: createForm.valor,
                  tipo: createForm.tipo,
                })
              }
              disabled={!createForm.chave || !createForm.valor || createCriticalFactMutation.isPending}
            >
              Adicionar e confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

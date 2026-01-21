// =====================================================
// COMPONENTE: TABELA DE FATOS COM CONFIRMAÇÃO
// =====================================================

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  CheckCheck,
  AlertTriangle,
} from "lucide-react";

interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  origem: string;
  confianca: number | null;
  confirmado: boolean;
}

interface FactsTableProps {
  caseId: string;
  facts: Fact[];
  onFactsChange?: () => void;
}

const tipoLabels: Record<string, string> = {
  data: "Data",
  moeda: "Moeda",
  numero: "Número",
  texto: "Texto",
  boolean: "Sim/Não",
};

const origemLabels: Record<string, string> = {
  ia_extracao: "IA",
  usuario: "Manual",
  documento: "Documento",
};

export function FactsTable({ caseId, facts, onFactsChange }: FactsTableProps) {
  const queryClient = useQueryClient();
  const [editingFact, setEditingFact] = useState<Fact | null>(null);
  const [editForm, setEditForm] = useState({ valor: "", tipo: "" });

  const pendingFacts = facts.filter((f) => !f.confirmado);
  const confirmedFacts = facts.filter((f) => f.confirmado);

  // Mutation para confirmar/desconfirmar fato
  const confirmMutation = useMutation({
    mutationFn: async ({ factId, confirmed }: { factId: string; confirmed: boolean }) => {
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

  // Mutation para editar fato
  const editMutation = useMutation({
    mutationFn: async ({ factId, valor, tipo }: { factId: string; valor: string; tipo: string }) => {
      const { error } = await supabase
        .from("facts")
        .update({ valor, tipo: tipo as "data" | "moeda" | "numero" | "texto" | "boolean" })
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

  // Mutation para deletar fato
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

  // Confirmar todos os pendentes
  const confirmAllMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("facts")
        .update({
          confirmado: true,
          confirmado_por: session?.session?.user.id,
          confirmado_em: new Date().toISOString(),
        })
        .eq("case_id", caseId)
        .eq("confirmado", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facts", caseId] });
      toast.success("Todos os fatos confirmados!");
      onFactsChange?.();
    },
  });

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

  const getConfidenceColor = (confianca: number | null) => {
    if (!confianca) return "bg-gray-100 text-gray-600";
    if (confianca >= 0.8) return "bg-green-100 text-green-700";
    if (confianca >= 0.5) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (facts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
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
      {/* Pending Facts */}
      {pendingFacts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Fatos Pendentes de Confirmação ({pendingFacts.length})
            </CardTitle>
            <Button
              onClick={() => confirmAllMutation.mutate()}
              disabled={confirmAllMutation.isPending}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Confirmar Todos
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fato</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingFacts.map((fact) => (
                  <TableRow key={fact.id} className="bg-yellow-50/50">
                    <TableCell className="font-medium">{fact.chave}</TableCell>
                    <TableCell className="font-semibold">{fact.valor}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tipoLabels[fact.tipo] || fact.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      {fact.confianca && (
                        <Badge className={getConfidenceColor(fact.confianca)}>
                          {Math.round(fact.confianca * 100)}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {origemLabels[fact.origem] || fact.origem}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmMutation.mutate({ factId: fact.id, confirmed: true })}
                          disabled={confirmMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirmed Facts */}
      {confirmedFacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Fatos Confirmados ({confirmedFacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fato</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmedFacts.map((fact) => (
                  <TableRow key={fact.id} className="bg-green-50/50">
                    <TableCell className="font-medium">{fact.chave}</TableCell>
                    <TableCell className="font-semibold">{fact.valor}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tipoLabels[fact.tipo] || fact.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
                          onClick={() => confirmMutation.mutate({ factId: fact.id, confirmed: false })}
                          disabled={confirmMutation.isPending}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingFact} onOpenChange={(open) => !open && setEditingFact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fato: {editingFact?.chave}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                value={editForm.valor}
                onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={editForm.tipo}
                onValueChange={(value) => setEditForm({ ...editForm, tipo: value })}
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
    </div>
  );
}

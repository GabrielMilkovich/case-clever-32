import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Scale,
  Plus,
  Edit,
  Check,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Controversy {
  id: string;
  campo: string;
  descricao: string;
  status: "incontroverso" | "controvertido" | "resolvido";
  valor_escolhido?: string;
  justificativa?: string;
  fundamentacao_legal?: string;
  fact_ids?: string[];
  document_ids?: string[];
  impacto_estimado?: number;
  prioridade: "baixa" | "media" | "alta" | "critica";
  resolvido_em?: string;
  created_at: string;
}

interface ControversyManagerProps {
  caseId: string;
  facts: Array<{ id: string; chave: string; valor: string; confirmado: boolean }>;
  documents: Array<{ id: string; tipo: string; file_name?: string }>;
}

const statusConfig = {
  incontroverso: { label: "Incontroverso", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  controvertido: { label: "Controvertido", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  resolvido: { label: "Resolvido", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Check },
};

const prioridadeConfig = {
  baixa: { label: "Baixa", className: "bg-slate-100 text-slate-800" },
  media: { label: "Média", className: "bg-yellow-100 text-yellow-800" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-800" },
  critica: { label: "Crítica", className: "bg-red-100 text-red-800" },
};

const JUSTIFICATIVA_TEMPLATES = [
  "Valor confirmado pelo documento X, página Y.",
  "Valor adotado por ausência de impugnação específica.",
  "Média aritmética dos últimos 12 meses conforme jurisprudência.",
  "Valor mais favorável ao reclamante, conforme in dubio pro operario.",
  "Valor constante do TRCT, documento oficial.",
  "Valor arbitrado por equidade (Art. 8º CLT).",
];

export function ControversyManager({ caseId, facts, documents }: ControversyManagerProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Controversy>>({
    status: "controvertido",
    prioridade: "media",
  });

  // Fetch controversies
  const { data: controversies = [], isLoading } = useQuery({
    queryKey: ["case_controversies", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_controversies")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Controversy[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Controversy>) => {
      if (editingId) {
        const { error } = await supabase
          .from("case_controversies")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
            resolvido_em: data.status === "resolvido" ? new Date().toISOString() : null,
          })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("case_controversies")
          .insert([{
            case_id: caseId,
            campo: data.campo!,
            descricao: data.descricao!,
            status: data.status!,
            valor_escolhido: data.valor_escolhido,
            justificativa: data.justificativa,
            fundamentacao_legal: data.fundamentacao_legal,
            impacto_estimado: data.impacto_estimado,
            prioridade: data.prioridade,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case_controversies", caseId] });
      toast.success(editingId ? "Controvérsia atualizada!" : "Controvérsia criada!");
      setDialogOpen(false);
      setEditingId(null);
      setFormData({ status: "controvertido", prioridade: "media" });
    },
    onError: (e) => {
      toast.error("Erro: " + (e as Error).message);
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, justificativa }: { id: string; justificativa: string }) => {
      const { error } = await supabase
        .from("case_controversies")
        .update({
          status: "resolvido",
          justificativa,
          resolvido_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case_controversies", caseId] });
      toast.success("Controvérsia resolvida!");
    },
  });

  const openEdit = (controversy: Controversy) => {
    setEditingId(controversy.id);
    setFormData(controversy);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ status: "controvertido", prioridade: "media" });
    setDialogOpen(true);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const unresolvedCount = controversies.filter(c => c.status === "controvertido").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Pontos Controvertidos
          {unresolvedCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unresolvedCount} pendente(s)
            </Badge>
          )}
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Controvérsia" : "Nova Controvérsia"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campo/Rubrica</Label>
                  <Input
                    placeholder="Ex: Horas Extras, Salário Base"
                    value={formData.campo || ""}
                    onChange={(e) => setFormData({ ...formData, campo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as Controversy["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incontroverso">Incontroverso</SelectItem>
                      <SelectItem value="controvertido">Controvertido</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição da Controvérsia</Label>
                <Textarea
                  placeholder="Descreva o ponto controvertido..."
                  value={formData.descricao || ""}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Escolhido</Label>
                  <Input
                    placeholder="Ex: R$ 2.500,00 ou 220 horas"
                    value={formData.valor_escolhido || ""}
                    onChange={(e) => setFormData({ ...formData, valor_escolhido: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Impacto Estimado (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={formData.impacto_estimado || ""}
                    onChange={(e) => setFormData({ ...formData, impacto_estimado: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(v) => setFormData({ ...formData, prioridade: v as Controversy["prioridade"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Justificativa / Fundamentação</Label>
                <Textarea
                  placeholder="Justifique a escolha do valor..."
                  value={formData.justificativa || ""}
                  onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {JUSTIFICATIVA_TEMPLATES.slice(0, 3).map((tpl, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => setFormData({ ...formData, justificativa: tpl })}
                    >
                      {tpl.slice(0, 30)}...
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fundamentação Legal</Label>
                <Input
                  placeholder="Ex: Art. 59 CLT, Súmula 85 TST"
                  value={formData.fundamentacao_legal || ""}
                  onChange={(e) => setFormData({ ...formData, fundamentacao_legal: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={!formData.campo || !formData.descricao || saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton-shimmer h-12 rounded-lg" />
            <div className="skeleton-shimmer h-12 rounded-lg" />
          </div>
        ) : controversies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum ponto controvertido registrado.</p>
            <p className="text-xs mt-1">Adicione controvérsias identificadas no caso.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Impacto</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {controversies.map((c) => {
                const StatusIcon = statusConfig[c.status].icon;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{c.campo}</span>
                        {c.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {c.descricao}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("gap-1", statusConfig[c.status].className)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[c.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={prioridadeConfig[c.prioridade].className}>
                        {prioridadeConfig[c.prioridade].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.valor_escolhido || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(c.impacto_estimado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(c)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {c.status === "controvertido" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600"
                            onClick={() => {
                              const justif = prompt("Justificativa para resolver:");
                              if (justif) resolveMutation.mutate({ id: c.id, justificativa: justif });
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

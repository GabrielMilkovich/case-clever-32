/**
 * Phase 4, Item 10: Sistema de Observações Técnicas por Módulo
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props {
  caseId: string;
  modulo: string;
}

const TIPOS = [
  { value: 'observacao', label: 'Observação' },
  { value: 'justificativa', label: 'Justificativa' },
  { value: 'divergencia', label: 'Divergência' },
  { value: 'criterio', label: 'Critério Adotado' },
];

export function ObservacoesModulo({ caseId, modulo }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("observacao");

  const { data: obs = [] } = useQuery({
    queryKey: ["pjecalc_observacoes", caseId, modulo],
    queryFn: () => svc.getObservacoes(caseId, modulo),
  });

  const salvar = async () => {
    if (!texto.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await svc.insertObservacao({
      case_id: caseId,
      modulo,
      tipo,
      texto: texto.trim(),
      created_by: user?.id,
    });
    setTexto("");
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ["pjecalc_observacoes", caseId, modulo] });
    toast.success("Observação registrada");
  };

  const tipoBadgeColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    observacao: 'secondary',
    justificativa: 'default',
    divergencia: 'destructive',
    criterio: 'outline',
  };

  return (
    <div className="border-t border-border/50 pt-3 mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> Observações ({obs.length})
        </span>
        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-3 animate-fade-in">
          <div className="flex gap-2">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-7 text-[10px] w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-[10px]" onClick={salvar} disabled={!texto.trim()}>Salvar</Button>
          </div>
          <Textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Descreva a observação, justificativa ou critério..."
            className="text-xs min-h-[60px]"
          />
        </div>
      )}

      {obs.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {obs.map((o) => (
            <div key={o.id} className="flex items-start gap-2 text-[10px] bg-muted/30 rounded p-2">
              <Badge variant={tipoBadgeColor[o.tipo] || 'secondary'} className="text-[9px] flex-shrink-0">{o.tipo}</Badge>
              <span className="flex-1">{o.texto}</span>
              <Button variant="ghost" size="icon" className="h-4 w-4 flex-shrink-0" onClick={async () => {
                await svc.deleteObservacao(o.id);
                qc.invalidateQueries({ queryKey: ["pjecalc_observacoes", caseId, modulo] });
              }}>
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

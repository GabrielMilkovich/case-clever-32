import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Edit } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

export default function Verbas({ caseId }: Props) {
  const [verbas, setVerbas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("pjecalc_verbas").select("*").eq("case_id", caseId).order("ordem").then(({ data }) => {
      setVerbas(data || []);
      setLoading(false);
    });
  }, [caseId]);

  const addVerba = async (tipo: "principal" | "reflexa") => {
    const newVerba = {
      case_id: caseId,
      nome: tipo === "principal" ? "Nova Verba Principal" : "Nova Verba Reflexa",
      tipo,
      caracteristica: "comum",
      periodo_inicio: new Date().toISOString().slice(0, 10),
      periodo_fim: new Date().toISOString().slice(0, 10),
      multiplicador: 1,
      ordem: verbas.length,
    };
    const { data } = await supabase.from("pjecalc_verbas").insert(newVerba).select().single();
    if (data) {
      setVerbas([...verbas, data]);
      toast.success("Verba adicionada");
    }
  };

  const removeVerba = async (id: string) => {
    await supabase.from("pjecalc_verbas").delete().eq("id", id);
    setVerbas(verbas.filter((v) => v.id !== id));
    toast.success("Verba removida");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">07 — Verbas</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => addVerba("principal")}><Plus className="h-4 w-4 mr-1" /> Principal</Button>
          <Button size="sm" variant="outline" onClick={() => addVerba("reflexa")}><Plus className="h-4 w-4 mr-1" /> Reflexa</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-8">#</TableHead>
              <TableHead className="text-xs">Nome</TableHead>
              <TableHead className="text-xs w-24">Tipo</TableHead>
              <TableHead className="text-xs w-28">Característica</TableHead>
              <TableHead className="text-xs w-28">Período Início</TableHead>
              <TableHead className="text-xs w-28">Período Fim</TableHead>
              <TableHead className="text-xs w-24 text-right">Multiplicador</TableHead>
              <TableHead className="text-xs w-24">Valor</TableHead>
              <TableHead className="text-xs w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {verbas.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Nenhuma verba cadastrada.</TableCell></TableRow>
            ) : verbas.map((v, idx) => (
              <TableRow key={v.id}>
                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="text-xs font-medium">{v.nome}</TableCell>
                <TableCell>
                  <Badge variant={v.tipo === "principal" ? "default" : "secondary"} className="text-[10px]">
                    {v.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{v.caracteristica}</TableCell>
                <TableCell className="text-xs">{v.periodo_inicio}</TableCell>
                <TableCell className="text-xs">{v.periodo_fim}</TableCell>
                <TableCell className="text-xs text-right">{v.multiplicador}</TableCell>
                <TableCell className="text-xs">{v.valor}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeVerba(v.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

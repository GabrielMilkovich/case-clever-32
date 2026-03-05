import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import * as svc from "@/lib/pjecalc/service";

interface Props { caseId: string; }

export function FGTSSaldosSaques({ caseId }: Props) {
  const qc = useQueryClient();

  const { data: registros = [] } = useQuery({
    queryKey: ["pjecalc_fgts_saldos_saques", caseId],
    queryFn: () => svc.getFgtsSaldosSaques(caseId),
  });

  const addRegistro = async () => {
    await svc.insertFgtsSaldoSaque({ case_id: caseId, tipo: 'saldo', data: new Date().toISOString().slice(0, 10), valor: 0 });
    qc.invalidateQueries({ queryKey: ["pjecalc_fgts_saldos_saques", caseId] });
  };

  const updateField = async (id: string, field: string, value: unknown) => {
    await svc.updateFgtsSaldoSaque(id, { [field]: value });
    qc.invalidateQueries({ queryKey: ["pjecalc_fgts_saldos_saques", caseId] });
  };

  const totalSaldos = registros.filter((r) => r.tipo === 'saldo').reduce((s, r) => s + ((r.valor as number) || 0), 0);
  const totalSaques = registros.filter((r) => r.tipo === 'saque').reduce((s, r) => s + ((r.valor as number) || 0), 0);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Saldos e Saques</CardTitle>
          <Button size="sm" variant="outline" onClick={addRegistro} className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
        </div>
      </CardHeader>
      <CardContent>
        {registros.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum saldo ou saque registrado. Clique em Adicionar.</p>
        ) : (
          <>
            <div className="flex gap-4 mb-3">
              <div className="text-xs"><span className="text-muted-foreground">Saldos: </span><span className="font-mono font-medium">{fmt(totalSaldos)}</span></div>
              <div className="text-xs"><span className="text-muted-foreground">Saques: </span><span className="font-mono font-medium">{fmt(totalSaques)}</span></div>
            </div>
            <div className="space-y-2">
              {registros.map((r) => (
                <div key={r.id as string} className="flex items-center gap-2 p-2 border border-border/30 rounded-md">
                  <Select defaultValue={r.tipo as string} onValueChange={v => updateField(r.id as string, 'tipo', v)}>
                    <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="saldo">Saldo</SelectItem><SelectItem value="saque">Saque</SelectItem></SelectContent>
                  </Select>
                  <Input type="date" defaultValue={r.data as string} className="h-7 text-xs w-36" onBlur={e => updateField(r.id as string, 'data', e.target.value)} />
                  <Input type="number" step="0.01" defaultValue={(r.valor as number) || 0} className="h-7 text-xs w-28" placeholder="R$" onBlur={e => updateField(r.id as string, 'valor', parseFloat(e.target.value) || 0)} />
                  <Input defaultValue={(r.observacao as string) || ''} className="h-7 text-xs flex-1" placeholder="Observação" onBlur={e => updateField(r.id as string, 'observacao', e.target.value)} />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                    await svc.deleteFgtsSaldoSaque(r.id as string);
                    qc.invalidateQueries({ queryKey: ["pjecalc_fgts_saldos_saques", caseId] });
                  }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

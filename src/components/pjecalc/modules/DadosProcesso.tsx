import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  caseId: string;
}

export default function DadosProcesso({ caseId }: Props) {
  const [caseData, setCaseData] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [caseRes, contractRes, partiesRes] = await Promise.all([
        supabase.from("cases").select("*").eq("id", caseId).single(),
        supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle(),
        supabase.from("parties").select("*").eq("case_id", caseId),
      ]);
      setCaseData(caseRes.data);
      setContract(contractRes.data || {
        case_id: caseId,
        data_admissao: "",
        data_demissao: "",
        tipo_demissao: null,
        funcao: "",
        salario_inicial: null,
      });
      setParties(partiesRes.data || []);
      setLoading(false);
    };
    load();
  }, [caseId]);

  const handleSave = async () => {
    if (!caseData) return;
    await supabase.from("cases").update({
      cliente: caseData.cliente,
      numero_processo: caseData.numero_processo,
      tribunal: caseData.tribunal,
    }).eq("id", caseId);

    if (contract?.id) {
      await supabase.from("employment_contracts").update(contract).eq("id", contract.id);
    } else {
      await supabase.from("employment_contracts").insert({ ...contract, case_id: caseId });
    }
    toast.success("Dados do processo salvos");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">01 — Dados do Processo</h2>
        <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 px-4 pb-4">
          <div>
            <Label className="text-xs">Reclamante (Cliente)</Label>
            <Input value={caseData?.cliente || ""} onChange={(e) => setCaseData({ ...caseData, cliente: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Nº do Processo</Label>
            <Input value={caseData?.numero_processo || ""} onChange={(e) => setCaseData({ ...caseData, numero_processo: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Tribunal / Vara</Label>
            <Input value={caseData?.tribunal || ""} onChange={(e) => setCaseData({ ...caseData, tribunal: e.target.value })} className="h-8 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Contrato de Trabalho</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 px-4 pb-4">
          <div>
            <Label className="text-xs">Data Admissão</Label>
            <Input type="date" value={contract?.data_admissao || ""} onChange={(e) => setContract({ ...contract, data_admissao: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Data Demissão</Label>
            <Input type="date" value={contract?.data_demissao || ""} onChange={(e) => setContract({ ...contract, data_demissao: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Tipo Demissão</Label>
            <Select value={contract?.tipo_demissao || ""} onValueChange={(v) => setContract({ ...contract, tipo_demissao: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sem_justa_causa">Sem Justa Causa</SelectItem>
                <SelectItem value="justa_causa">Justa Causa</SelectItem>
                <SelectItem value="pedido_demissao">Pedido de Demissão</SelectItem>
                <SelectItem value="acordo_mutuo">Acordo Mútuo (Art. 484-A)</SelectItem>
                <SelectItem value="culpa_reciproca">Culpa Recíproca</SelectItem>
                <SelectItem value="rescisao_indireta">Rescisão Indireta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Função</Label>
            <Input value={contract?.funcao || ""} onChange={(e) => setContract({ ...contract, funcao: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Salário Inicial (R$)</Label>
            <Input type="number" step="0.01" value={contract?.salario_inicial || ""} onChange={(e) => setContract({ ...contract, salario_inicial: parseFloat(e.target.value) || null })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Local de Trabalho</Label>
            <Input value={contract?.local_trabalho || ""} onChange={(e) => setContract({ ...contract, local_trabalho: e.target.value })} className="h-8 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Partes</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {parties.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma parte cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {parties.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs font-medium uppercase text-muted-foreground w-24">{p.tipo}</span>
                  <span>{p.nome}</span>
                  {p.documento && <span className="text-muted-foreground">({p.documento})</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

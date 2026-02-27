import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

const TRIBUNAIS = [
  "TRT1 - Rio de Janeiro", "TRT2 - São Paulo", "TRT3 - Minas Gerais",
  "TRT4 - Rio Grande do Sul", "TRT5 - Bahia", "TRT6 - Pernambuco",
  "TRT7 - Ceará", "TRT8 - Pará/Amapá", "TRT9 - Paraná",
  "TRT10 - Distrito Federal/Tocantins", "TRT11 - Amazonas/Roraima",
  "TRT12 - Santa Catarina", "TRT13 - Paraíba", "TRT14 - Rondônia/Acre",
  "TRT15 - Campinas", "TRT16 - Maranhão", "TRT17 - Espírito Santo",
  "TRT18 - Goiás", "TRT19 - Alagoas", "TRT20 - Sergipe",
  "TRT21 - Rio Grande do Norte", "TRT22 - Piauí", "TRT23 - Mato Grosso",
  "TRT24 - Mato Grosso do Sul", "TST",
];

const TIPOS_DEMISSAO = [
  { value: "sem_justa_causa", label: "Sem Justa Causa" },
  { value: "justa_causa", label: "Justa Causa" },
  { value: "pedido_demissao", label: "Pedido de Demissão" },
  { value: "acordo_mutuo", label: "Acordo Mútuo (Art. 484-A CLT)" },
  { value: "culpa_reciproca", label: "Culpa Recíproca" },
  { value: "rescisao_indireta", label: "Rescisão Indireta" },
  { value: "termino_contrato", label: "Término de Contrato" },
  { value: "falecimento", label: "Falecimento" },
];

interface PartyRow {
  id?: string;
  nome: string;
  tipo: "reclamante" | "reclamada";
  documento: string;
  documento_tipo: string;
  _isNew?: boolean;
}

export default function DadosProcesso({ caseId }: Props) {
  const [caseData, setCaseData] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [caseRes, contractRes, partiesRes] = await Promise.all([
        supabase.from("cases").select("*").eq("id", caseId).single(),
        supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle(),
        supabase.from("parties").select("*").eq("case_id", caseId).order("created_at"),
      ]);
      setCaseData(caseRes.data);
      setContract(contractRes.data || {
        case_id: caseId, data_admissao: "", data_demissao: "",
        tipo_demissao: null, funcao: "", salario_inicial: null,
        local_trabalho: "", sindicato: "", observacoes: "",
        jornada_contratual: { horas_semanais: 44, divisor: 220 },
      });
      setParties((partiesRes.data as PartyRow[]) || []);
      setLoading(false);
    };
    load();
  }, [caseId]);

  const setCase = (key: string, val: any) => setCaseData((p: any) => ({ ...p, [key]: val }));
  const setContr = (key: string, val: any) => setContract((p: any) => ({ ...p, [key]: val }));

  const addParty = () => {
    setParties([...parties, {
      nome: "", tipo: "reclamante", documento: "", documento_tipo: "CPF", _isNew: true,
    }]);
  };

  const updateParty = (idx: number, key: string, val: any) => {
    const updated = [...parties];
    (updated[idx] as any)[key] = val;
    setParties(updated);
  };

  const removeParty = async (idx: number) => {
    const p = parties[idx];
    if (p.id) await supabase.from("parties").delete().eq("id", p.id);
    setParties(parties.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!caseData) return;
    
    // Save case
    await supabase.from("cases").update({
      cliente: caseData.cliente,
      numero_processo: caseData.numero_processo,
      tribunal: caseData.tribunal,
    }).eq("id", caseId);

    // Save contract
    if (contract) {
      const payload = { ...contract, case_id: caseId };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (contract.id) {
        await supabase.from("employment_contracts").update(payload).eq("id", contract.id);
      } else {
        const { data } = await supabase.from("employment_contracts").insert(payload).select().single();
        if (data) setContract(data);
      }
    }

    // Save parties
    for (const p of parties) {
      const payload = { case_id: caseId, nome: p.nome, tipo: p.tipo, documento: p.documento, documento_tipo: p.documento_tipo };
      if (p.id && !p._isNew) {
        await supabase.from("parties").update(payload).eq("id", p.id);
      } else {
        const { data } = await supabase.from("parties").insert(payload).select().single();
        if (data) {
          const idx = parties.findIndex(pp => pp === p);
          if (idx >= 0) {
            const updated = [...parties];
            updated[idx] = { ...data, _isNew: false };
            setParties(updated);
          }
        }
      }
    }

    toast.success("Dados do processo salvos");
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">01 — Dados do Processo</h2>
        <Button size="sm" onClick={handleSave} className="h-7 text-xs">
          <Save className="h-3.5 w-3.5 mr-1" /> Salvar
        </Button>
      </div>

      {/* Identificação do Processo */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Identificação do Processo</legend>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <Label className="text-[11px] text-muted-foreground">Nº do Processo</Label>
            <Input value={caseData?.numero_processo || ""} onChange={(e) => setCase("numero_processo", e.target.value)} className="h-7 text-xs" placeholder="0000000-00.0000.0.00.0000" />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px] text-muted-foreground">Tribunal / Vara</Label>
            <Select value={caseData?.tribunal || ""} onValueChange={(v) => setCase("tribunal", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TRIBUNAIS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* Partes */}
      <fieldset className="border border-border rounded p-3 space-y-2">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Partes do Processo</legend>
        <div className="border rounded overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] h-7 py-0">Tipo</TableHead>
                <TableHead className="text-[10px] h-7 py-0">Nome</TableHead>
                <TableHead className="text-[10px] h-7 py-0 w-20">Doc. Tipo</TableHead>
                <TableHead className="text-[10px] h-7 py-0 w-40">Documento</TableHead>
                <TableHead className="text-[10px] h-7 py-0 w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parties.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">Nenhuma parte. Clique em "Adicionar Parte".</TableCell></TableRow>
              ) : parties.map((p, idx) => (
                <TableRow key={p.id || `new-${idx}`} className="hover:bg-muted/30">
                  <TableCell className="py-1">
                    <Select value={p.tipo} onValueChange={(v) => updateParty(idx, "tipo", v)}>
                      <SelectTrigger className="h-6 text-[11px] w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reclamante" className="text-xs">Reclamante</SelectItem>
                        <SelectItem value="reclamada" className="text-xs">Reclamada</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1"><Input value={p.nome} onChange={(e) => updateParty(idx, "nome", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                  <TableCell className="py-1">
                    <Select value={p.documento_tipo || "CPF"} onValueChange={(v) => updateParty(idx, "documento_tipo", v)}>
                      <SelectTrigger className="h-6 text-[11px] w-16"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CPF" className="text-xs">CPF</SelectItem>
                        <SelectItem value="CNPJ" className="text-xs">CNPJ</SelectItem>
                        <SelectItem value="OAB" className="text-xs">OAB</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1"><Input value={p.documento || ""} onChange={(e) => updateParty(idx, "documento", e.target.value)} className="h-6 text-[11px]" /></TableCell>
                  <TableCell className="py-1"><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeParty(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button variant="outline" size="sm" className="h-6 text-[11px]" onClick={addParty}>
          <UserPlus className="h-3 w-3 mr-1" /> Adicionar Parte
        </Button>
      </fieldset>

      {/* Contrato de Trabalho */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Contrato de Trabalho</legend>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Admissão</Label>
            <Input type="date" value={contract?.data_admissao || ""} onChange={(e) => setContr("data_admissao", e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Demissão</Label>
            <Input type="date" value={contract?.data_demissao || ""} onChange={(e) => setContr("data_demissao", e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Tipo de Demissão</Label>
            <Select value={contract?.tipo_demissao || ""} onValueChange={(v) => setContr("tipo_demissao", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TIPOS_DEMISSAO.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Salário Inicial (R$)</Label>
            <Input type="number" step="0.01" value={contract?.salario_inicial ?? ""} onChange={(e) => setContr("salario_inicial", parseFloat(e.target.value) || null)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Função / Cargo</Label>
            <Input value={contract?.funcao || ""} onChange={(e) => setContr("funcao", e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Local de Trabalho</Label>
            <Input value={contract?.local_trabalho || ""} onChange={(e) => setContr("local_trabalho", e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Sindicato</Label>
            <Input value={contract?.sindicato || ""} onChange={(e) => setContr("sindicato", e.target.value)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Horas Semanais</Label>
            <Input type="number" value={contract?.jornada_contratual?.horas_semanais ?? 44} onChange={(e) => setContr("jornada_contratual", { ...contract?.jornada_contratual, horas_semanais: parseInt(e.target.value) || 44 })} className="h-7 text-xs" />
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Observações</Label>
          <Textarea value={contract?.observacoes || ""} onChange={(e) => setContr("observacoes", e.target.value)} className="text-xs h-16 resize-none" />
        </div>
      </fieldset>
    </div>
  );
}

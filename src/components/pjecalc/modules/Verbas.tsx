import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Save, Edit, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

const CARACTERISTICAS = [
  { value: "comum", label: "Comum (mensal)" },
  { value: "13_salario", label: "13º Salário" },
  { value: "ferias", label: "Férias" },
  { value: "aviso_previo", label: "Aviso Prévio" },
  { value: "rescisoria", label: "Rescisória" },
];

const TIPO_DIVISOR = [
  { value: "informado", label: "Informado" },
  { value: "carga_horaria", label: "Carga Horária" },
  { value: "dias_uteis", label: "Dias Úteis" },
  { value: "dias_corridos", label: "Dias Corridos" },
];

const TIPO_QUANTIDADE = [
  { value: "informada", label: "Informada" },
  { value: "avos", label: "Avos (proporcional)" },
  { value: "dias_uteis", label: "Dias Úteis (calendário)" },
  { value: "dias_corridos", label: "Dias Corridos" },
];

const JUROS_OPTS = [
  { value: "ocorrencias_vencidas", label: "Ocorrências vencidas" },
  { value: "data_ajuizamento", label: "Data do ajuizamento" },
  { value: "data_demissao", label: "Data da demissão" },
];

export default function Verbas({ caseId }: Props) {
  const [verbas, setVerbas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVerba, setEditingVerba] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);

  useEffect(() => {
    loadVerbas();
  }, [caseId]);

  const loadVerbas = async () => {
    const { data } = await supabase.from("pjecalc_verbas").select("*").eq("case_id", caseId).order("ordem");
    setVerbas(data || []);
    setLoading(false);
  };

  const addVerba = (tipo: "principal" | "reflexa") => {
    setEditingVerba({
      case_id: caseId, nome: "", tipo, caracteristica: "comum",
      periodo_inicio: "", periodo_fim: "",
      base_calculo: { historicos: [], verbas: [], tabelas: [], integralizar: false, proporcionalizar: false },
      tipo_divisor: "informado", divisor_informado: 30,
      multiplicador: 1, tipo_quantidade: "informada", quantidade_informada: null,
      valor: "calculado", valor_informado_devido: null, valor_informado_pago: null,
      incidencias: { fgts: false, irpf: false, contribuicao_social: false, pensao_alimenticia: false, previdencia_privada: false },
      exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false },
      compor_principal: true, zerar_valor_negativo: false, dobrar_valor_devido: false,
      juros_ajuizamento: "ocorrencias_vencidas",
      gerar_verba_reflexa: "devido", gerar_verba_principal: "devido",
      comportamento_reflexo: null, verba_principal_id: null,
      ordem: verbas.length, comentarios: "",
      _isNew: true,
    });
    setShowEditor(true);
  };

  const editVerba = (v: any) => {
    setEditingVerba({ ...v });
    setShowEditor(true);
  };

  const saveVerba = async () => {
    if (!editingVerba) return;
    const payload = { ...editingVerba, case_id: caseId };
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload._isNew;

    if (editingVerba.id && !editingVerba._isNew) {
      await supabase.from("pjecalc_verbas").update(payload).eq("id", editingVerba.id);
    } else {
      await supabase.from("pjecalc_verbas").insert(payload);
    }
    setShowEditor(false);
    setEditingVerba(null);
    await loadVerbas();
    toast.success("Verba salva");
  };

  const removeVerba = async (id: string) => {
    await supabase.from("pjecalc_verbas").delete().eq("id", id);
    await loadVerbas();
    toast.success("Verba removida");
  };

  const duplicateVerba = async (v: any) => {
    const payload = { ...v, nome: `${v.nome} (cópia)`, ordem: verbas.length };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    await supabase.from("pjecalc_verbas").insert(payload);
    await loadVerbas();
    toast.success("Verba duplicada");
  };

  const toggleOcorrencias = async (verbaId: string) => {
    if (expandedId === verbaId) { setExpandedId(null); return; }
    const { data } = await supabase.from("pjecalc_verba_ocorrencias")
      .select("*").eq("verba_id", verbaId).order("competencia");
    setOcorrencias(data || []);
    setExpandedId(verbaId);
  };

  const setEd = (key: string, val: any) => setEditingVerba((p: any) => ({ ...p, [key]: val }));
  const setInc = (key: string, val: boolean) => setEditingVerba((p: any) => ({ ...p, incidencias: { ...p.incidencias, [key]: val } }));
  const setExcl = (key: string, val: boolean) => setEditingVerba((p: any) => ({ ...p, exclusoes: { ...p.exclusoes, [key]: val } }));

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">07 — Verbas</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => addVerba("principal")} className="h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Principal</Button>
          <Button size="sm" variant="outline" onClick={() => addVerba("reflexa")} className="h-7 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Reflexa</Button>
        </div>
      </div>

      <div className="border rounded overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] h-7 py-0 w-6"></TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-6">#</TableHead>
              <TableHead className="text-[10px] h-7 py-0">Nome</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-20">Tipo</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-24">Característica</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-24">Início</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-24">Fim</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-16 text-right">Mult.</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-16 text-right">Divisor</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-16">Valor</TableHead>
              <TableHead className="text-[10px] h-7 py-0 w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {verbas.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-6">Nenhuma verba cadastrada.</TableCell></TableRow>
            ) : verbas.map((v, idx) => (
              <>
                <TableRow key={v.id} className="hover:bg-muted/30">
                  <TableCell className="py-1">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => toggleOcorrencias(v.id)}>
                      {expandedId === v.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </TableCell>
                  <TableCell className="py-1 text-[11px] text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-1 text-[11px] font-medium">{v.nome || "—"}</TableCell>
                  <TableCell className="py-1">
                    <Badge variant={v.tipo === "principal" ? "default" : "secondary"} className="text-[9px] h-4">{v.tipo}</Badge>
                  </TableCell>
                  <TableCell className="py-1 text-[11px]">{v.caracteristica}</TableCell>
                  <TableCell className="py-1 text-[11px]">{v.periodo_inicio}</TableCell>
                  <TableCell className="py-1 text-[11px]">{v.periodo_fim}</TableCell>
                  <TableCell className="py-1 text-[11px] text-right">{v.multiplicador}</TableCell>
                  <TableCell className="py-1 text-[11px] text-right">{v.divisor_informado}</TableCell>
                  <TableCell className="py-1 text-[11px]">{v.valor}</TableCell>
                  <TableCell className="py-1">
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => editVerba(v)}><Edit className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => duplicateVerba(v)}><Copy className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeVerba(v.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedId === v.id && (
                  <TableRow key={`oc-${v.id}`} className="bg-muted/20">
                    <TableCell colSpan={11} className="p-3">
                      <div className="text-[11px] font-semibold text-muted-foreground mb-2">Ocorrências (mês a mês)</div>
                      {ocorrencias.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">Sem ocorrências. Execute o cálculo para gerar.</p>
                      ) : (
                        <div className="border rounded overflow-auto max-h-60 custom-scrollbar">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[9px] h-6 py-0">Competência</TableHead>
                                <TableHead className="text-[9px] h-6 py-0 text-right">Base</TableHead>
                                <TableHead className="text-[9px] h-6 py-0 text-right">Divisor</TableHead>
                                <TableHead className="text-[9px] h-6 py-0 text-right">Mult.</TableHead>
                                <TableHead className="text-[9px] h-6 py-0 text-right">Qtd.</TableHead>
                                <TableHead className="text-[9px] h-6 py-0 text-right">Devido</TableHead>
                                <TableHead className="text-[9px] h-6 py-0 text-right">Pago</TableHead>
                                <TableHead className="text-[9px] h-6 py-0 text-right">Diferença</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ocorrencias.map((oc) => (
                                <TableRow key={oc.id} className="hover:bg-muted/30">
                                  <TableCell className="py-0.5 text-[10px]">{oc.competencia}</TableCell>
                                  <TableCell className="py-0.5 text-[10px] text-right">{(oc.base_calculo ?? 0).toFixed(2)}</TableCell>
                                  <TableCell className="py-0.5 text-[10px] text-right">{oc.divisor ?? "—"}</TableCell>
                                  <TableCell className="py-0.5 text-[10px] text-right">{oc.multiplicador ?? "—"}</TableCell>
                                  <TableCell className="py-0.5 text-[10px] text-right">{oc.quantidade ?? "—"}</TableCell>
                                  <TableCell className="py-0.5 text-[10px] text-right font-medium">{(oc.valor_devido ?? 0).toFixed(2)}</TableCell>
                                  <TableCell className="py-0.5 text-[10px] text-right">{(oc.valor_pago ?? 0).toFixed(2)}</TableCell>
                                  <TableCell className="py-0.5 text-[10px] text-right font-medium">{(oc.diferenca ?? 0).toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingVerba?._isNew ? "Nova Verba" : "Editar Verba"}</DialogTitle>
          </DialogHeader>
          {editingVerba && (
            <div className="space-y-4">
              {/* Identificação */}
              <fieldset className="border border-border rounded p-3 space-y-3">
                <legend className="text-[11px] font-semibold text-muted-foreground px-1">Identificação</legend>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-[11px] text-muted-foreground">Nome da Verba</Label>
                    <Input value={editingVerba.nome} onChange={(e) => setEd("nome", e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                    <Select value={editingVerba.tipo} onValueChange={(v) => setEd("tipo", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="principal" className="text-xs">Principal</SelectItem>
                        <SelectItem value="reflexa" className="text-xs">Reflexa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Característica</Label>
                    <Select value={editingVerba.caracteristica} onValueChange={(v) => setEd("caracteristica", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CARACTERISTICAS.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Período Início</Label>
                    <Input type="date" value={editingVerba.periodo_inicio} onChange={(e) => setEd("periodo_inicio", e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Período Fim</Label>
                    <Input type="date" value={editingVerba.periodo_fim} onChange={(e) => setEd("periodo_fim", e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
              </fieldset>

              {/* Base / Divisor / Multiplicador / Quantidade */}
              <fieldset className="border border-border rounded p-3 space-y-3">
                <legend className="text-[11px] font-semibold text-muted-foreground px-1">Cálculo: Base × Mult / Divisor × Qtd × Dobra</legend>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Valor</Label>
                    <Select value={editingVerba.valor} onValueChange={(v) => setEd("valor", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calculado" className="text-xs">Calculado</SelectItem>
                        <SelectItem value="informado" className="text-xs">Informado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Tipo Divisor</Label>
                    <Select value={editingVerba.tipo_divisor} onValueChange={(v) => setEd("tipo_divisor", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPO_DIVISOR.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Divisor</Label>
                    <Input type="number" step="0.01" value={editingVerba.divisor_informado ?? 30} onChange={(e) => setEd("divisor_informado", parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Multiplicador</Label>
                    <Input type="number" step="0.00000001" value={editingVerba.multiplicador} onChange={(e) => setEd("multiplicador", parseFloat(e.target.value))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Tipo Quantidade</Label>
                    <Select value={editingVerba.tipo_quantidade} onValueChange={(v) => setEd("tipo_quantidade", v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPO_QUANTIDADE.map(q => <SelectItem key={q.value} value={q.value} className="text-xs">{q.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Quantidade</Label>
                    <Input type="number" step="0.01" value={editingVerba.quantidade_informada ?? ""} onChange={(e) => setEd("quantidade_informada", parseFloat(e.target.value) || null)} className="h-7 text-xs" />
                  </div>
                  {editingVerba.valor === "informado" && (
                    <>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Valor Devido (R$)</Label>
                        <Input type="number" step="0.01" value={editingVerba.valor_informado_devido ?? ""} onChange={(e) => setEd("valor_informado_devido", parseFloat(e.target.value) || null)} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Valor Pago (R$)</Label>
                        <Input type="number" step="0.01" value={editingVerba.valor_informado_pago ?? ""} onChange={(e) => setEd("valor_informado_pago", parseFloat(e.target.value) || null)} className="h-7 text-xs" />
                      </div>
                    </>
                  )}
                </div>
              </fieldset>

              {/* Incidências */}
              <fieldset className="border border-border rounded p-3">
                <legend className="text-[11px] font-semibold text-muted-foreground px-1">Incidências</legend>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { key: "fgts", label: "FGTS" },
                    { key: "irpf", label: "IRPF" },
                    { key: "contribuicao_social", label: "Contrib. Social" },
                    { key: "pensao_alimenticia", label: "Pensão Aliment." },
                    { key: "previdencia_privada", label: "Prev. Privada" },
                  ].map(inc => (
                    <div key={inc.key} className="flex items-center gap-1.5">
                      <Switch checked={editingVerba.incidencias?.[inc.key] || false} onCheckedChange={(v) => setInc(inc.key, v)} className="scale-[0.6]" />
                      <Label className="text-[11px]">{inc.label}</Label>
                    </div>
                  ))}
                </div>
              </fieldset>

              {/* Exclusões e Opções */}
              <fieldset className="border border-border rounded p-3">
                <legend className="text-[11px] font-semibold text-muted-foreground px-1">Exclusões e Opções</legend>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-1.5">
                    <Switch checked={editingVerba.exclusoes?.faltas_justificadas || false} onCheckedChange={(v) => setExcl("faltas_justificadas", v)} className="scale-[0.6]" />
                    <Label className="text-[11px]">Excluir faltas justif.</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={editingVerba.exclusoes?.faltas_nao_justificadas || false} onCheckedChange={(v) => setExcl("faltas_nao_justificadas", v)} className="scale-[0.6]" />
                    <Label className="text-[11px]">Excluir faltas não justif.</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={editingVerba.exclusoes?.ferias_gozadas || false} onCheckedChange={(v) => setExcl("ferias_gozadas", v)} className="scale-[0.6]" />
                    <Label className="text-[11px]">Excluir férias gozadas</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={editingVerba.dobrar_valor_devido || false} onCheckedChange={(v) => setEd("dobrar_valor_devido", v)} className="scale-[0.6]" />
                    <Label className="text-[11px]">Dobrar valor devido</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={editingVerba.zerar_valor_negativo || false} onCheckedChange={(v) => setEd("zerar_valor_negativo", v)} className="scale-[0.6]" />
                    <Label className="text-[11px]">Zerar valor negativo</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={editingVerba.compor_principal || false} onCheckedChange={(v) => setEd("compor_principal", v)} className="scale-[0.6]" />
                    <Label className="text-[11px]">Compor principal</Label>
                  </div>
                </div>
              </fieldset>

              {/* Juros */}
              <fieldset className="border border-border rounded p-3">
                <legend className="text-[11px] font-semibold text-muted-foreground px-1">Juros de Mora</legend>
                <div className="w-64">
                  <Select value={editingVerba.juros_ajuizamento} onValueChange={(v) => setEd("juros_ajuizamento", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JUROS_OPTS.map(j => <SelectItem key={j.value} value={j.value} className="text-xs">{j.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </fieldset>

              {/* Comentários */}
              <div>
                <Label className="text-[11px] text-muted-foreground">Comentários</Label>
                <Textarea value={editingVerba.comentarios || ""} onChange={(e) => setEd("comentarios", e.target.value)} className="text-xs h-12 resize-none" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowEditor(false)} className="h-7 text-xs">Cancelar</Button>
                <Button size="sm" onClick={saveVerba} className="h-7 text-xs"><Save className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

export default function ParametrosCalculo({ caseId }: Props) {
  const [params, setParams] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("pjecalc_parametros").select("*").eq("case_id", caseId).maybeSingle().then(({ data }) => {
      setParams(data || {
        case_id: caseId,
        data_admissao: "", data_demissao: "", data_ajuizamento: "",
        data_inicial: "", data_final: "",
        prescricao_quinquenal: false, prescricao_fgts: false,
        data_prescricao_quinquenal: "",
        carga_horaria_padrao: 220, sabado_dia_util: true,
        zerar_valor_negativo: false, limitar_avos_periodo: false,
        projetar_aviso_indenizado: false,
        prazo_aviso_previo: "nao_apurar", prazo_aviso_dias: null,
        regime_trabalho: "tempo_integral",
        estado: "SP", municipio: "",
        considerar_feriado_estadual: false, considerar_feriado_municipal: false,
        maior_remuneracao: null, ultima_remuneracao: null,
        comentarios: "",
      });
      setLoading(false);
    });
  }, [caseId]);

  const set = (key: string, val: any) => setParams((p: any) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!params) return;
    const payload = { ...params, case_id: caseId };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (params.id) {
      await supabase.from("pjecalc_parametros").update(payload).eq("id", params.id);
    } else {
      const { data } = await supabase.from("pjecalc_parametros").insert(payload).select().single();
      if (data) setParams(data);
    }
    toast.success("Parâmetros salvos");
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">02 — Parâmetros do Cálculo</h2>
        <Button size="sm" onClick={handleSave} className="h-7 text-xs">
          <Save className="h-3.5 w-3.5 mr-1" /> Salvar
        </Button>
      </div>

      {/* Datas */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Datas Principais</legend>
        <div className="grid grid-cols-5 gap-3">
          <div><Label className="text-[11px] text-muted-foreground">Admissão</Label><Input type="date" value={params?.data_admissao || ""} onChange={(e) => set("data_admissao", e.target.value)} className="h-7 text-xs" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Demissão</Label><Input type="date" value={params?.data_demissao || ""} onChange={(e) => set("data_demissao", e.target.value)} className="h-7 text-xs" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Ajuizamento</Label><Input type="date" value={params?.data_ajuizamento || ""} onChange={(e) => set("data_ajuizamento", e.target.value)} className="h-7 text-xs" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Data Inicial Cálculo</Label><Input type="date" value={params?.data_inicial || ""} onChange={(e) => set("data_inicial", e.target.value)} className="h-7 text-xs" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Data Final Cálculo</Label><Input type="date" value={params?.data_final || ""} onChange={(e) => set("data_final", e.target.value)} className="h-7 text-xs" /></div>
        </div>
      </fieldset>

      {/* Prescrição */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Prescrição</legend>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 h-7">
            <Switch checked={params?.prescricao_quinquenal} onCheckedChange={(v) => set("prescricao_quinquenal", v)} className="scale-75" />
            <Label className="text-[11px]">Prescrição Quinquenal</Label>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Data Limite Prescrição</Label>
            <Input type="date" value={params?.data_prescricao_quinquenal || ""} onChange={(e) => set("data_prescricao_quinquenal", e.target.value)} className="h-7 text-xs" disabled={!params?.prescricao_quinquenal} />
          </div>
          <div className="flex items-center gap-2 h-7">
            <Switch checked={params?.prescricao_fgts} onCheckedChange={(v) => set("prescricao_fgts", v)} className="scale-75" />
            <Label className="text-[11px]">Prescrição FGTS (ARE 709.212)</Label>
          </div>
        </div>
      </fieldset>

      {/* Jornada */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Jornada de Trabalho</legend>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Carga Horária Mensal</Label>
            <Input type="number" value={params?.carga_horaria_padrao || 220} onChange={(e) => set("carga_horaria_padrao", parseInt(e.target.value))} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Regime</Label>
            <Select value={params?.regime_trabalho || "tempo_integral"} onValueChange={(v) => set("regime_trabalho", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tempo_integral" className="text-xs">Tempo Integral</SelectItem>
                <SelectItem value="tempo_parcial" className="text-xs">Tempo Parcial</SelectItem>
                <SelectItem value="12x36" className="text-xs">12×36</SelectItem>
                <SelectItem value="6x1" className="text-xs">6×1</SelectItem>
                <SelectItem value="5x2" className="text-xs">5×2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 h-7 mt-4">
            <Switch checked={params?.sabado_dia_util} onCheckedChange={(v) => set("sabado_dia_util", v)} className="scale-75" />
            <Label className="text-[11px]">Sábado é dia útil</Label>
          </div>
          <div className="flex items-center gap-2 h-7 mt-4">
            <Switch checked={params?.limitar_avos_periodo} onCheckedChange={(v) => set("limitar_avos_periodo", v)} className="scale-75" />
            <Label className="text-[11px]">Limitar avos ao período</Label>
          </div>
        </div>
      </fieldset>

      {/* Aviso Prévio */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Aviso Prévio</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Apuração</Label>
            <Select value={params?.prazo_aviso_previo || "nao_apurar"} onValueChange={(v) => set("prazo_aviso_previo", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_apurar" className="text-xs">Não Apurar</SelectItem>
                <SelectItem value="30_dias" className="text-xs">30 dias</SelectItem>
                <SelectItem value="proporcional" className="text-xs">Proporcional (Lei 12.506)</SelectItem>
                <SelectItem value="informado" className="text-xs">Dias Informados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Dias (se informado)</Label>
            <Input type="number" value={params?.prazo_aviso_dias ?? ""} onChange={(e) => set("prazo_aviso_dias", parseInt(e.target.value) || null)} className="h-7 text-xs" disabled={params?.prazo_aviso_previo !== "informado"} />
          </div>
          <div className="flex items-center gap-2 h-7 mt-4">
            <Switch checked={params?.projetar_aviso_indenizado} onCheckedChange={(v) => set("projetar_aviso_indenizado", v)} className="scale-75" />
            <Label className="text-[11px]">Projetar aviso indenizado</Label>
          </div>
        </div>
      </fieldset>

      {/* Remuneração */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Remuneração de Referência</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Maior Remuneração (R$)</Label>
            <Input type="number" step="0.01" value={params?.maior_remuneracao ?? ""} onChange={(e) => set("maior_remuneracao", parseFloat(e.target.value) || null)} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Última Remuneração (R$)</Label>
            <Input type="number" step="0.01" value={params?.ultima_remuneracao ?? ""} onChange={(e) => set("ultima_remuneracao", parseFloat(e.target.value) || null)} className="h-7 text-xs" />
          </div>
          <div className="flex items-center gap-2 h-7 mt-4">
            <Switch checked={params?.zerar_valor_negativo} onCheckedChange={(v) => set("zerar_valor_negativo", v)} className="scale-75" />
            <Label className="text-[11px]">Zerar valor negativo</Label>
          </div>
        </div>
      </fieldset>

      {/* Localidade */}
      <fieldset className="border border-border rounded p-3 space-y-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Localidade e Feriados</legend>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">UF</Label>
            <Select value={params?.estado || "SP"} onValueChange={(v) => set("estado", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UFS.map(uf => <SelectItem key={uf} value={uf} className="text-xs">{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Município</Label>
            <Input value={params?.municipio || ""} onChange={(e) => set("municipio", e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="flex items-center gap-2 h-7 mt-4">
            <Switch checked={params?.considerar_feriado_estadual} onCheckedChange={(v) => set("considerar_feriado_estadual", v)} className="scale-75" />
            <Label className="text-[11px]">Feriado Estadual</Label>
          </div>
          <div className="flex items-center gap-2 h-7 mt-4">
            <Switch checked={params?.considerar_feriado_municipal} onCheckedChange={(v) => set("considerar_feriado_municipal", v)} className="scale-75" />
            <Label className="text-[11px]">Feriado Municipal</Label>
          </div>
        </div>
      </fieldset>

      {/* Comentários */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Comentários</legend>
        <Textarea value={params?.comentarios || ""} onChange={(e) => set("comentarios", e.target.value)} className="text-xs h-16 resize-none" placeholder="Observações gerais sobre os parâmetros do cálculo..." />
      </fieldset>
    </div>
  );
}

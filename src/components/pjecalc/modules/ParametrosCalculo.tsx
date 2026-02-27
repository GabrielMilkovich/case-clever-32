import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface Props { caseId: string; }

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
        carga_horaria_padrao: 220, sabado_dia_util: true,
        zerar_valor_negativo: false, limitar_avos_periodo: false,
        projetar_aviso_indenizado: false,
        prazo_aviso_previo: "nao_apurar",
        regime_trabalho: "tempo_integral",
        estado: "SP", municipio: "",
        considerar_feriado_estadual: false, considerar_feriado_municipal: false,
      });
      setLoading(false);
    });
  }, [caseId]);

  const handleSave = async () => {
    if (!params) return;
    const payload = { ...params, case_id: caseId };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (params.id) {
      await supabase.from("pjecalc_parametros").update(payload).eq("id", params.id);
    } else {
      await supabase.from("pjecalc_parametros").insert(payload);
    }
    toast.success("Parâmetros salvos");
  };

  const set = (key: string, val: any) => setParams((p: any) => ({ ...p, [key]: val }));

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">02 — Parâmetros do Cálculo</h2>
        <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
      </div>

      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Datas Principais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 px-4 pb-4">
          <div><Label className="text-xs">Admissão</Label><Input type="date" value={params?.data_admissao || ""} onChange={(e) => set("data_admissao", e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Demissão</Label><Input type="date" value={params?.data_demissao || ""} onChange={(e) => set("data_demissao", e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Ajuizamento</Label><Input type="date" value={params?.data_ajuizamento || ""} onChange={(e) => set("data_ajuizamento", e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Data Inicial do Cálculo</Label><Input type="date" value={params?.data_inicial || ""} onChange={(e) => set("data_inicial", e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Data Final do Cálculo</Label><Input type="date" value={params?.data_final || ""} onChange={(e) => set("data_final", e.target.value)} className="h-8 text-sm" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Prescrição</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 px-4 pb-4">
          <div className="flex items-center gap-2">
            <Switch checked={params?.prescricao_quinquenal} onCheckedChange={(v) => set("prescricao_quinquenal", v)} />
            <Label className="text-xs">Prescrição Quinquenal</Label>
          </div>
          <div><Label className="text-xs">Data Limite Prescrição</Label><Input type="date" value={params?.data_prescricao_quinquenal || ""} onChange={(e) => set("data_prescricao_quinquenal", e.target.value)} className="h-8 text-sm" /></div>
          <div className="flex items-center gap-2">
            <Switch checked={params?.prescricao_fgts} onCheckedChange={(v) => set("prescricao_fgts", v)} />
            <Label className="text-xs">Prescrição FGTS (ARE 709.212)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Jornada e Aviso Prévio</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 px-4 pb-4">
          <div><Label className="text-xs">Carga Horária Mensal</Label><Input type="number" value={params?.carga_horaria_padrao || 220} onChange={(e) => set("carga_horaria_padrao", parseInt(e.target.value))} className="h-8 text-sm" /></div>
          <div>
            <Label className="text-xs">Regime de Trabalho</Label>
            <Select value={params?.regime_trabalho || "tempo_integral"} onValueChange={(v) => set("regime_trabalho", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tempo_integral">Tempo Integral</SelectItem>
                <SelectItem value="tempo_parcial">Tempo Parcial</SelectItem>
                <SelectItem value="12x36">12×36</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Aviso Prévio</Label>
            <Select value={params?.prazo_aviso_previo || "nao_apurar"} onValueChange={(v) => set("prazo_aviso_previo", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_apurar">Não Apurar</SelectItem>
                <SelectItem value="30_dias">30 dias</SelectItem>
                <SelectItem value="proporcional">Proporcional (Lei 12.506)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={params?.sabado_dia_util} onCheckedChange={(v) => set("sabado_dia_util", v)} />
            <Label className="text-xs">Sábado é dia útil</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={params?.projetar_aviso_indenizado} onCheckedChange={(v) => set("projetar_aviso_indenizado", v)} />
            <Label className="text-xs">Projetar aviso indenizado</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={params?.zerar_valor_negativo} onCheckedChange={(v) => set("zerar_valor_negativo", v)} />
            <Label className="text-xs">Zerar valor negativo</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-sm">Localidade</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 px-4 pb-4">
          <div><Label className="text-xs">Estado (UF)</Label><Input value={params?.estado || ""} onChange={(e) => set("estado", e.target.value)} className="h-8 text-sm" maxLength={2} /></div>
          <div><Label className="text-xs">Município</Label><Input value={params?.municipio || ""} onChange={(e) => set("municipio", e.target.value)} className="h-8 text-sm" /></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><Switch checked={params?.considerar_feriado_estadual} onCheckedChange={(v) => set("considerar_feriado_estadual", v)} /><Label className="text-xs">Feriado Estadual</Label></div>
            <div className="flex items-center gap-2"><Switch checked={params?.considerar_feriado_municipal} onCheckedChange={(v) => set("considerar_feriado_municipal", v)} /><Label className="text-xs">Feriado Municipal</Label></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

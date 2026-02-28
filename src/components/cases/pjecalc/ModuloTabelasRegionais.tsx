import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, DollarSign, Bus, Users, Loader2, Info } from "lucide-react";

// =====================================================
// TABELAS REGIONAIS — Piso Salarial, VT, Salário-Família
// =====================================================

interface PisoSalarial {
  categoria: string;
  faixa: string;
  valor: number;
  vigencia_inicio: string;
  vigencia_fim?: string;
  uf: string;
  fonte: string;
}

// Pisos salariais regionais (Lei Estadual — exemplos dos principais estados)
const PISOS_REGIONAIS: PisoSalarial[] = [
  // São Paulo — LC 1.437/2024
  { categoria: 'Faixa I — Trabalhadores domésticos, serventes, auxiliares', faixa: 'I', valor: 1640.00, vigencia_inicio: '2024-04-01', uf: 'SP', fonte: 'LC 1.437/2024' },
  { categoria: 'Faixa II — Operadores de máquinas, motoristas', faixa: 'II', valor: 1676.55, vigencia_inicio: '2024-04-01', uf: 'SP', fonte: 'LC 1.437/2024' },
  { categoria: 'Faixa III — Técnicos de enfermagem, técnicos administrativos', faixa: 'III', valor: 1694.16, vigencia_inicio: '2024-04-01', uf: 'SP', fonte: 'LC 1.437/2024' },
  { categoria: 'Faixa IV — Professores do ensino básico', faixa: 'IV', valor: 1712.00, vigencia_inicio: '2024-04-01', uf: 'SP', fonte: 'LC 1.437/2024' },
  // Rio de Janeiro — Lei 9.843/2022
  { categoria: 'Faixa I — Trabalhadores agropecuários, domésticos', faixa: 'I', valor: 1412.00, vigencia_inicio: '2024-01-01', uf: 'RJ', fonte: 'Lei 9.843/2022 + reajuste' },
  { categoria: 'Faixa II — Trabalhadores da indústria, comércio', faixa: 'II', valor: 1527.00, vigencia_inicio: '2024-01-01', uf: 'RJ', fonte: 'Lei 9.843/2022 + reajuste' },
  { categoria: 'Faixa III — Técnicos de nível médio', faixa: 'III', valor: 1578.00, vigencia_inicio: '2024-01-01', uf: 'RJ', fonte: 'Lei 9.843/2022 + reajuste' },
  // Paraná — Lei 21.364/2023
  { categoria: 'Faixa I — Serviços gerais', faixa: 'I', valor: 1856.94, vigencia_inicio: '2024-05-01', uf: 'PR', fonte: 'Lei 21.364/2023 + reajuste' },
  { categoria: 'Faixa II — Técnicos e operadores', faixa: 'II', valor: 1927.02, vigencia_inicio: '2024-05-01', uf: 'PR', fonte: 'Lei 21.364/2023 + reajuste' },
  // RS — Lei 15.897/2023
  { categoria: 'Faixa I — Agropecuários, domésticos', faixa: 'I', valor: 1573.89, vigencia_inicio: '2024-02-01', uf: 'RS', fonte: 'Lei 15.897/2023 + reajuste' },
  { categoria: 'Faixa II — Indústria, comércio', faixa: 'II', valor: 1609.35, vigencia_inicio: '2024-02-01', uf: 'RS', fonte: 'Lei 15.897/2023 + reajuste' },
  // SC — Lei 18.681/2023
  { categoria: 'Faixa I — Serviços gerais', faixa: 'I', valor: 1612.26, vigencia_inicio: '2024-01-01', uf: 'SC', fonte: 'Lei 18.681/2023 + reajuste' },
  { categoria: 'Faixa II — Técnicos', faixa: 'II', valor: 1669.65, vigencia_inicio: '2024-01-01', uf: 'SC', fonte: 'Lei 18.681/2023 + reajuste' },
];

// Salário-Família — Portaria MPS (valores 2025)
interface SalarioFamiliaFaixa {
  ate_salario: number;
  valor_cota: number;
  vigencia: string;
  fonte: string;
}

const SALARIO_FAMILIA_FAIXAS: SalarioFamiliaFaixa[] = [
  { ate_salario: 1819.26, valor_cota: 62.04, vigencia: '01/2025', fonte: 'Portaria MPS nº 6/2025' },
];

// Vale-Transporte — principais capitais
interface VTRegional {
  cidade: string;
  uf: string;
  tarifa_onibus: number;
  tarifa_metro: number;
  vigencia: string;
  fonte: string;
}

const VT_REGIONAIS: VTRegional[] = [
  { cidade: 'São Paulo', uf: 'SP', tarifa_onibus: 4.40, tarifa_metro: 4.40, vigencia: '01/2024', fonte: 'SPTrans/Metrô' },
  { cidade: 'Rio de Janeiro', uf: 'RJ', tarifa_onibus: 4.30, tarifa_metro: 7.50, vigencia: '01/2024', fonte: 'SMTR-RJ/MetrôRio' },
  { cidade: 'Belo Horizonte', uf: 'MG', tarifa_onibus: 4.50, tarifa_metro: 4.50, vigencia: '01/2024', fonte: 'BHTrans/CBTU' },
  { cidade: 'Curitiba', uf: 'PR', tarifa_onibus: 6.00, tarifa_metro: 0, vigencia: '01/2024', fonte: 'URBS' },
  { cidade: 'Porto Alegre', uf: 'RS', tarifa_onibus: 4.80, tarifa_metro: 4.80, vigencia: '01/2024', fonte: 'EPTC/Trensurb' },
  { cidade: 'Salvador', uf: 'BA', tarifa_onibus: 4.90, tarifa_metro: 4.90, vigencia: '01/2024', fonte: 'SEMOB/CCR' },
  { cidade: 'Recife', uf: 'PE', tarifa_onibus: 4.10, tarifa_metro: 4.10, vigencia: '01/2024', fonte: 'Grande Recife Consórcio' },
  { cidade: 'Fortaleza', uf: 'CE', tarifa_onibus: 3.60, tarifa_metro: 3.60, vigencia: '01/2024', fonte: 'ETUFOR/Metrofor' },
  { cidade: 'Brasília', uf: 'DF', tarifa_onibus: 5.50, tarifa_metro: 5.50, vigencia: '01/2024', fonte: 'SEMOB-DF/Metrô-DF' },
  { cidade: 'Goiânia', uf: 'GO', tarifa_onibus: 4.30, tarifa_metro: 0, vigencia: '01/2024', fonte: 'CMTC' },
  { cidade: 'Florianópolis', uf: 'SC', tarifa_onibus: 5.75, tarifa_metro: 0, vigencia: '01/2024', fonte: 'Consórcio Fênix' },
  { cidade: 'Manaus', uf: 'AM', tarifa_onibus: 4.50, tarifa_metro: 0, vigencia: '01/2024', fonte: 'SMTU' },
];

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const UFS_COM_PISO = [...new Set(PISOS_REGIONAIS.map(p => p.uf))].sort();

interface Props {
  caseId: string;
  estado?: string;
  municipio?: string;
}

export function ModuloTabelasRegionais({ caseId, estado, municipio }: Props) {
  const [tab, setTab] = useState<'piso' | 'vt' | 'familia'>('piso');
  const [searchPiso, setSearchPiso] = useState('');
  const [ufFilter, setUfFilter] = useState(estado || 'SP');
  const [searchVT, setSearchVT] = useState('');

  // Filter pisos
  const pisosFiltrados = useMemo(() => {
    return PISOS_REGIONAIS.filter(p => {
      if (p.uf !== ufFilter) return false;
      if (searchPiso && !p.categoria.toLowerCase().includes(searchPiso.toLowerCase())) return false;
      return true;
    });
  }, [ufFilter, searchPiso]);

  // Filter VT
  const vtFiltrados = useMemo(() => {
    if (!searchVT) return VT_REGIONAIS;
    const s = searchVT.toLowerCase();
    return VT_REGIONAIS.filter(v => v.cidade.toLowerCase().includes(s) || v.uf.toLowerCase().includes(s));
  }, [searchVT]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Tabelas Regionais de Referência
        </h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Consulte pisos salariais estaduais, tarifas de vale-transporte e cotas de salário-família atualizadas.
      </p>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border pb-1">
        {[
          { id: 'piso' as const, label: 'Pisos Salariais', icon: DollarSign },
          { id: 'vt' as const, label: 'Vale-Transporte', icon: Bus },
          { id: 'familia' as const, label: 'Salário-Família', icon: Users },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md transition-colors ${
              tab === t.id 
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Piso Salarial Tab */}
      {tab === 'piso' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <Select value={ufFilter} onValueChange={setUfFilter}>
              <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UFS_COM_PISO.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar categoria..." value={searchPiso} onChange={e => setSearchPiso(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <Badge variant="outline" className="text-[10px]">{pisosFiltrados.length} faixas</Badge>
          </div>

          {!UFS_COM_PISO.includes(ufFilter) ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Info className="h-4 w-4" />
              Estado {ufFilter} adota o salário mínimo federal como piso. Apenas SP, RJ, PR, RS e SC possuem pisos estaduais.
            </CardContent></Card>
          ) : pisosFiltrados.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma faixa encontrada.</CardContent></Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">Faixa</th>
                    <th className="p-2 text-left font-medium">Categoria / Descrição</th>
                    <th className="p-2 text-right font-medium">Valor</th>
                    <th className="p-2 text-center font-medium">Vigência</th>
                    <th className="p-2 text-left font-medium">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {pisosFiltrados.map((p, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-2 text-center"><Badge variant="secondary" className="text-[9px]">{p.faixa}</Badge></td>
                      <td className="p-2">{p.categoria}</td>
                      <td className="p-2 text-right font-mono font-medium text-primary">{fmt(p.valor)}</td>
                      <td className="p-2 text-center font-mono text-muted-foreground">{p.vigencia_inicio}</td>
                      <td className="p-2 text-muted-foreground">{p.fonte}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vale-Transporte Tab */}
      {tab === 'vt' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar cidade..." value={searchVT} onChange={e => setSearchVT(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <Badge variant="outline" className="text-[10px]">{vtFiltrados.length} cidades</Badge>
          </div>
          <Card>
            <CardContent className="p-2">
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>VT: empregador desconta até 6% do salário básico (Art. 4°, Lei 7.418/85). O excedente é custo patronal.</span>
              </div>
            </CardContent>
          </Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left font-medium">Cidade</th>
                  <th className="p-2 text-center font-medium">UF</th>
                  <th className="p-2 text-right font-medium">Ônibus</th>
                  <th className="p-2 text-right font-medium">Metrô</th>
                  <th className="p-2 text-right font-medium">Ida+Volta/dia</th>
                  <th className="p-2 text-center font-medium">Vigência</th>
                </tr>
              </thead>
              <tbody>
                {vtFiltrados.map((v, i) => (
                  <tr key={i} className={`border-b border-border/30 hover:bg-muted/20 ${v.uf === estado ? 'bg-primary/5' : ''}`}>
                    <td className="p-2 font-medium">{v.cidade}</td>
                    <td className="p-2 text-center"><Badge variant="outline" className="text-[9px]">{v.uf}</Badge></td>
                    <td className="p-2 text-right font-mono">{fmt(v.tarifa_onibus)}</td>
                    <td className="p-2 text-right font-mono">{v.tarifa_metro > 0 ? fmt(v.tarifa_metro) : '—'}</td>
                    <td className="p-2 text-right font-mono font-medium text-primary">{fmt((v.tarifa_onibus + (v.tarifa_metro || v.tarifa_onibus)) * 2)}</td>
                    <td className="p-2 text-center text-muted-foreground">{v.vigencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salário-Família Tab */}
      {tab === 'familia' && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-2">
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>CF Art. 7°, XII + Lei 4.266/63. Cota por filho de até 14 anos ou inválido de qualquer idade. Valor atualizado anualmente por Portaria do MPS.</span>
              </div>
            </CardContent>
          </Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left font-medium">Remuneração até</th>
                  <th className="p-2 text-right font-medium">Valor da Cota</th>
                  <th className="p-2 text-center font-medium">Vigência</th>
                  <th className="p-2 text-left font-medium">Fonte</th>
                </tr>
              </thead>
              <tbody>
                {SALARIO_FAMILIA_FAIXAS.map((f, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="p-2 font-mono">{fmt(f.ate_salario)}</td>
                    <td className="p-2 text-right font-mono font-medium text-primary">{fmt(f.valor_cota)}</td>
                    <td className="p-2 text-center text-muted-foreground">{f.vigencia}</td>
                    <td className="p-2 text-muted-foreground">{f.fonte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Simulação de Cotas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Remuneração Mensal</Label>
                  <Input type="number" placeholder="0,00" className="mt-1 h-8 text-xs" id="sf-remuneracao" />
                </div>
                <div>
                  <Label className="text-xs">Nº de Dependentes</Label>
                  <Input type="number" placeholder="0" className="mt-1 h-8 text-xs" id="sf-dependentes" />
                </div>
                <div>
                  <Label className="text-xs">Valor Mensal</Label>
                  <div className="mt-1 h-8 flex items-center text-sm font-mono font-bold text-primary" id="sf-resultado">
                    —
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                const rem = parseFloat((document.getElementById('sf-remuneracao') as HTMLInputElement)?.value || '0');
                const deps = parseInt((document.getElementById('sf-dependentes') as HTMLInputElement)?.value || '0');
                const faixa = SALARIO_FAMILIA_FAIXAS.find(f => rem <= f.ate_salario);
                const resultado = faixa ? faixa.valor_cota * deps : 0;
                const el = document.getElementById('sf-resultado');
                if (el) el.textContent = resultado > 0 ? fmt(resultado) + `/mês (${deps} × ${fmt(faixa!.valor_cota)})` : 'Sem direito (remuneração acima do teto)';
              }}>
                Calcular
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

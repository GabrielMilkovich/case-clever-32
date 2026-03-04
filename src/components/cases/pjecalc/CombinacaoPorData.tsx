/**
 * UI para configurar "Combinação por Data" de índices e juros
 * Estilo PJe-Calc: múltiplos regimes por período temporal
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TrendingUp, Percent, ArrowRight } from "lucide-react";
import type { CombinacaoIndice, CombinacaoJuros } from "@/lib/pjecalc/correction-by-date";

interface Props {
  combinacoesIndice: CombinacaoIndice[];
  combinacoesJuros: CombinacaoJuros[];
  onChange: (indice: CombinacaoIndice[], juros: CombinacaoJuros[]) => void;
}

const INDICES = [
  { value: "IPCAE", label: "IPCA-E" },
  { value: "IPCA", label: "IPCA" },
  { value: "SELIC", label: "SELIC" },
  { value: "SEM_CORRECAO", label: "Sem Correção" },
  { value: "TR", label: "TR" },
  { value: "INPC", label: "INPC" },
  { value: "IGP-M", label: "IGP-M" },
  { value: "FACDT", label: "FACDT" },
];

const JUROS_TIPOS = [
  { value: "TRD_SIMPLES", label: "TRD Simples (1% a.m.)" },
  { value: "SELIC", label: "SELIC (engloba correção)" },
  { value: "TAXA_LEGAL", label: "Taxa Legal" },
  { value: "NENHUM", label: "Nenhum" },
];

export function CombinacaoPorData({ combinacoesIndice, combinacoesJuros, onChange }: Props) {
  const addIndice = () => {
    const last = combinacoesIndice[combinacoesIndice.length - 1];
    onChange([...combinacoesIndice, { de: last?.ate || "", indice: "IPCA" }], combinacoesJuros);
  };

  const removeIndice = (idx: number) => {
    onChange(combinacoesIndice.filter((_, i) => i !== idx), combinacoesJuros);
  };

  const updateIndice = (idx: number, patch: Partial<CombinacaoIndice>) => {
    onChange(
      combinacoesIndice.map((c, i) => i === idx ? { ...c, ...patch } : c),
      combinacoesJuros
    );
  };

  const addJuros = () => {
    const last = combinacoesJuros[combinacoesJuros.length - 1];
    onChange(combinacoesIndice, [...combinacoesJuros, { de: last?.ate || "", tipo: "SELIC" }]);
  };

  const removeJuros = (idx: number) => {
    onChange(combinacoesIndice, combinacoesJuros.filter((_, i) => i !== idx));
  };

  const updateJuros = (idx: number, patch: Partial<CombinacaoJuros>) => {
    onChange(
      combinacoesIndice,
      combinacoesJuros.map((c, i) => i === idx ? { ...c, ...patch } : c)
    );
  };

  return (
    <div className="space-y-4">
      {/* Índices por data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Combinação de Índices por Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {combinacoesIndice.map((c, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded border border-border/50 bg-muted/20">
              <Badge variant="outline" className="text-[9px] font-mono">{i + 1}</Badge>
              
              {c.ate && !c.de ? (
                <span className="text-[10px] text-muted-foreground">Até</span>
              ) : c.de && !c.ate ? (
                <span className="text-[10px] text-muted-foreground">A partir de</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">De</span>
              )}
              
              {c.de !== undefined && (
                <Input
                  type="date"
                  value={c.de || ""}
                  onChange={e => updateIndice(i, { de: e.target.value })}
                  className="h-7 text-[10px] w-32"
                />
              )}
              
              {c.ate !== undefined && c.de !== undefined && (
                <>
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="date"
                    value={c.ate || ""}
                    onChange={e => updateIndice(i, { ate: e.target.value })}
                    className="h-7 text-[10px] w-32"
                  />
                </>
              )}
              
              {c.ate !== undefined && !c.de && (
                <Input
                  type="date"
                  value={c.ate || ""}
                  onChange={e => updateIndice(i, { ate: e.target.value })}
                  className="h-7 text-[10px] w-32"
                />
              )}
              
              <Select value={c.indice} onValueChange={v => updateIndice(i, { indice: v })}>
                <SelectTrigger className="h-7 text-[10px] w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDICES.map(idx => (
                    <SelectItem key={idx.value} value={idx.value} className="text-xs">{idx.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeIndice(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={addIndice}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Regime
          </Button>
          
          {combinacoesIndice.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Nenhuma combinação. Clique para adicionar regimes de correção por período.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Juros por data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-primary" />
            Combinação de Juros por Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {combinacoesJuros.map((c, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded border border-border/50 bg-muted/20">
              <Badge variant="outline" className="text-[9px] font-mono">{i + 1}</Badge>
              
              {c.ate && !c.de ? (
                <span className="text-[10px] text-muted-foreground">Até</span>
              ) : c.de && !c.ate ? (
                <span className="text-[10px] text-muted-foreground">A partir de</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">De</span>
              )}
              
              {c.de !== undefined && (
                <Input
                  type="date"
                  value={c.de || ""}
                  onChange={e => updateJuros(i, { de: e.target.value })}
                  className="h-7 text-[10px] w-32"
                />
              )}
              
              {c.ate !== undefined && c.de !== undefined && (
                <>
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="date"
                    value={c.ate || ""}
                    onChange={e => updateJuros(i, { ate: e.target.value })}
                    className="h-7 text-[10px] w-32"
                  />
                </>
              )}
              
              {c.ate !== undefined && !c.de && (
                <Input
                  type="date"
                  value={c.ate || ""}
                  onChange={e => updateJuros(i, { ate: e.target.value })}
                  className="h-7 text-[10px] w-32"
                />
              )}
              
              <Select value={c.tipo} onValueChange={v => updateJuros(i, { tipo: v })}>
                <SelectTrigger className="h-7 text-[10px] w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JUROS_TIPOS.map(j => (
                    <SelectItem key={j.value} value={j.value} className="text-xs">{j.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {c.tipo === "TRD_SIMPLES" && (
                <Input
                  type="number"
                  step="0.01"
                  value={c.percentual ?? 1}
                  onChange={e => updateJuros(i, { percentual: parseFloat(e.target.value) || 1 })}
                  className="h-7 text-[10px] w-16"
                  placeholder="%"
                />
              )}
              
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeJuros(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={addJuros}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Regime de Juros
          </Button>
          
          {combinacoesJuros.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Nenhuma combinação. Clique para adicionar regimes de juros por período.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

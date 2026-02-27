import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Printer } from "lucide-react";

interface Props { caseId: string; }

export default function Resumo({ caseId }: Props) {
  const sections = [
    { label: "Verbas Principais", bruto: "—", descontos: "—", liquido: "—" },
    { label: "Verbas Reflexas (Férias)", bruto: "—", descontos: "—", liquido: "—" },
    { label: "Verbas Reflexas (13º)", bruto: "—", descontos: "—", liquido: "—" },
    { label: "Verbas Rescisórias", bruto: "—", descontos: "—", liquido: "—" },
    { label: "FGTS (Depósitos)", bruto: "—", descontos: "—", liquido: "—" },
    { label: "FGTS (Multa 40%)", bruto: "—", descontos: "—", liquido: "—" },
    { label: "FGTS (LC 110)", bruto: "—", descontos: "—", liquido: "—" },
  ];

  const deducoes = [
    { label: "INSS Segurado", valor: "—" },
    { label: "IRRF (Art. 12-A)", valor: "—" },
    { label: "Pensão Alimentícia", valor: "—" },
  ];

  const atualizacao = [
    { label: "Correção Monetária", valor: "—" },
    { label: "Juros de Mora", valor: "—" },
    { label: "Multa Art. 523 CPC (10%)", valor: "—" },
    { label: "Honorários Sucumbenciais", valor: "—" },
  ];

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">12 — Resumo / Relatório</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs"><Printer className="h-3.5 w-3.5 mr-1" /> Imprimir</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs"><FileDown className="h-3.5 w-3.5 mr-1" /> PDF</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs"><FileDown className="h-3.5 w-3.5 mr-1" /> Excel</Button>
        </div>
      </div>

      {/* Créditos */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Créditos do Reclamante</legend>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] h-7 py-0">Rubrica</TableHead>
              <TableHead className="text-[10px] h-7 py-0 text-right">Bruto (R$)</TableHead>
              <TableHead className="text-[10px] h-7 py-0 text-right">Descontos (R$)</TableHead>
              <TableHead className="text-[10px] h-7 py-0 text-right">Líquido (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((s, i) => (
              <TableRow key={i} className="hover:bg-muted/30">
                <TableCell className="py-1 text-[11px]">{s.label}</TableCell>
                <TableCell className="py-1 text-[11px] text-right">{s.bruto}</TableCell>
                <TableCell className="py-1 text-[11px] text-right">{s.descontos}</TableCell>
                <TableCell className="py-1 text-[11px] text-right font-medium">{s.liquido}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className="py-1 text-[11px]">Subtotal Créditos</TableCell>
              <TableCell className="py-1 text-[11px] text-right">R$ —</TableCell>
              <TableCell className="py-1 text-[11px] text-right">R$ —</TableCell>
              <TableCell className="py-1 text-[11px] text-right">R$ —</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </fieldset>

      {/* Deduções */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Deduções</legend>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] h-7 py-0">Descrição</TableHead>
              <TableHead className="text-[10px] h-7 py-0 text-right">Valor (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deducoes.map((d, i) => (
              <TableRow key={i} className="hover:bg-muted/30">
                <TableCell className="py-1 text-[11px]">{d.label}</TableCell>
                <TableCell className="py-1 text-[11px] text-right">{d.valor}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className="py-1 text-[11px]">Total Deduções</TableCell>
              <TableCell className="py-1 text-[11px] text-right">R$ —</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </fieldset>

      {/* Atualização */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Atualização Monetária</legend>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] h-7 py-0">Item</TableHead>
              <TableHead className="text-[10px] h-7 py-0 text-right">Valor (R$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {atualizacao.map((a, i) => (
              <TableRow key={i} className="hover:bg-muted/30">
                <TableCell className="py-1 text-[11px]">{a.label}</TableCell>
                <TableCell className="py-1 text-[11px] text-right">{a.valor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </fieldset>

      {/* Contribuição Social Patronal */}
      <fieldset className="border border-border rounded p-3">
        <legend className="text-xs font-semibold text-muted-foreground px-1">Contribuição Social — Empregador</legend>
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">INSS Patronal (20%)</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">SAT/RAT</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
          <div className="border rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Terceiros</div>
            <div className="text-sm font-bold">R$ —</div>
          </div>
        </div>
      </fieldset>

      {/* Total Geral */}
      <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Crédito Líquido do Reclamante</div>
            <div className="text-xl font-bold text-primary">R$ —</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total da Execução (c/ CS Patronal)</div>
            <div className="text-xl font-bold text-foreground">R$ —</div>
          </div>
        </div>
      </div>
    </div>
  );
}

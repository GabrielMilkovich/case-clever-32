interface Props { caseId: string; }

export default function CartaoPonto({ caseId }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">06 — Cartão de Ponto</h2>
      <div className="border rounded-lg p-8 text-center">
        <p className="text-sm text-muted-foreground">Módulo de Cartão de Ponto — em desenvolvimento.</p>
        <p className="text-xs text-muted-foreground mt-2">Futuramente: upload de planilha CSV com horas por dia.</p>
      </div>
    </div>
  );
}

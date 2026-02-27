/**
 * Relatório de Critérios Legais
 * Gera documento explicando os parâmetros, índices e regras aplicados.
 */
import type { PjeLiquidacaoResult, PjeParametros, PjeCorrecaoConfig, PjeIRConfig, PjeCSConfig, PjeFGTSConfig } from "./engine";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function gerarRelatorioCriteriosLegais(
  result: PjeLiquidacaoResult,
  params: PjeParametros,
  correcao: PjeCorrecaoConfig,
  ir: PjeIRConfig,
  cs: PjeCSConfig,
  fgts: PjeFGTSConfig,
  meta: { processo?: string; cliente?: string; engineVersion?: string }
) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Critérios Legais — ${meta.processo || "PJe-Calc"}</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 15px; text-align: center; margin-bottom: 10px; color: #1e40af; }
  h2 { font-size: 12px; margin: 14px 0 6px; border-bottom: 2px solid #1e40af; padding-bottom: 3px; color: #1e40af; }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
  .header .subtitle { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th, td { padding: 4px 8px; border: 1px solid #ddd; font-size: 9px; }
  th { background: #f0f4ff; font-weight: 600; text-align: left; width: 35%; }
  td { font-family: 'Consolas', monospace; }
  .section { margin-bottom: 12px; }
  .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>RELATÓRIO DE CRITÉRIOS LEGAIS</h1>
    <div class="subtitle">${meta.processo ? `Processo nº ${meta.processo}` : "Cálculo Trabalhista"}</div>
    ${meta.cliente ? `<div class="subtitle">Reclamante: ${meta.cliente}</div>` : ""}
  </div>

  <h2>1. Parâmetros do Contrato</h2>
  <table>
    <tr><th>Data de Admissão</th><td>${params.data_admissao || '—'}</td></tr>
    <tr><th>Data de Demissão</th><td>${params.data_demissao || '—'}</td></tr>
    <tr><th>Data de Ajuizamento</th><td>${params.data_ajuizamento || '—'}</td></tr>
    <tr><th>Estado / Município</th><td>${params.estado} / ${params.municipio || '—'}</td></tr>
    <tr><th>Carga Horária Mensal</th><td>${params.carga_horaria_padrao}h</td></tr>
    <tr><th>Regime de Trabalho</th><td>${params.regime_trabalho === 'tempo_integral' ? 'Tempo Integral' : 'Tempo Parcial'}</td></tr>
    <tr><th>Prescrição Quinquenal</th><td>${params.prescricao_quinquenal ? 'Sim' : 'Não'}</td></tr>
    <tr><th>Prescrição FGTS</th><td>${params.prescricao_fgts ? 'Sim (ARE 709.212/DF)' : 'Não'}</td></tr>
    <tr><th>Limitar Avos ao Período</th><td>${params.limitar_avos_periodo ? 'Sim' : 'Não'}</td></tr>
    <tr><th>Sábado como Dia Útil</th><td>${params.sabado_dia_util ? 'Sim' : 'Não'}</td></tr>
  </table>

  <h2>2. Correção Monetária e Juros</h2>
  <table>
    <tr><th>Índice de Correção</th><td>${correcao.indice}</td></tr>
    <tr><th>Data de Liquidação</th><td>${correcao.data_liquidacao}</td></tr>
    <tr><th>Transição ADC 58/59 STF</th><td>${correcao.indice === 'IPCA-E' || correcao.indice === 'SELIC' ? 'Sim — IPCA-E (pré-citação) → SELIC (pós-citação)' : 'Não aplicável'}</td></tr>
    <tr><th>Juros de Mora</th><td>${correcao.juros_tipo === 'simples_mensal' ? `${correcao.juros_percentual}% a.m. (simples)` : correcao.juros_tipo === 'selic' ? 'Taxa SELIC' : 'Não aplicado'}</td></tr>
    <tr><th>Início dos Juros</th><td>${correcao.juros_inicio === 'ajuizamento' ? 'Ajuizamento' : correcao.juros_inicio === 'citacao' ? 'Citação' : 'Vencimento'}</td></tr>
    <tr><th>Multa Art. 523 CPC</th><td>${correcao.multa_523 ? `Sim (${correcao.multa_523_percentual}%)` : 'Não'}</td></tr>
  </table>

  <h2>3. Contribuição Social</h2>
  <table>
    <tr><th>Segurado</th><td>${cs.apurar_segurado ? 'Progressiva EC 103/2019' : 'Não apurado'}</td></tr>
    <tr><th>Cobrar do Reclamante</th><td>${cs.cobrar_reclamante ? 'Sim' : 'Não'}</td></tr>
    <tr><th>Empregador</th><td>${cs.apurar_empresa ? `Sim — ${cs.aliquota_empresa_fixa || 20}%` : 'Não'}</td></tr>
    <tr><th>SAT/RAT</th><td>${cs.apurar_sat ? `Sim — ${cs.aliquota_sat_fixa || 2}%` : 'Não'}</td></tr>
    <tr><th>Terceiros</th><td>${cs.apurar_terceiros ? `Sim — ${cs.aliquota_terceiros_fixa || 5.8}%` : 'Não'}</td></tr>
    <tr><th>Simples Nacional</th><td>${(cs.periodos_simples?.length || 0) > 0 ? 'Sim (isenção CS patronal)' : 'Não'}</td></tr>
    <tr><th>CS sobre Salários Pagos</th><td>${cs.cs_sobre_salarios_pagos ? 'Sim' : 'Não'}</td></tr>
  </table>

  <h2>4. Imposto de Renda</h2>
  <table>
    <tr><th>Método</th><td>Art. 12-A, Lei 7.713/88 (RRA)</td></tr>
    <tr><th>Meses RRA</th><td>${result.imposto_renda.meses_rra}</td></tr>
    <tr><th>Tributação Exclusiva 13º</th><td>${ir.tributacao_exclusiva_13 ? 'Sim' : 'Não'}</td></tr>
    <tr><th>Tributação Separada Férias</th><td>${ir.tributacao_separada_ferias ? 'Sim' : 'Não'}</td></tr>
    <tr><th>Deduzir CS</th><td>${ir.deduzir_cs ? 'Sim' : 'Não'}</td></tr>
    <tr><th>Deduzir Prev. Privada</th><td>${ir.deduzir_prev_privada ? 'Sim' : 'Não'}</td></tr>
    <tr><th>Dependentes</th><td>${ir.dependentes}</td></tr>
  </table>

  <h2>5. FGTS</h2>
  <table>
    <tr><th>Apurar</th><td>${fgts.apurar ? 'Sim — 8% sobre diferenças' : 'Não'}</td></tr>
    <tr><th>Multa</th><td>${fgts.multa_apurar ? `${fgts.multa_percentual}% (${fgts.multa_tipo})` : 'Não'}</td></tr>
    <tr><th>LC 110/2001 (10%)</th><td>${fgts.lc110_10 ? 'Sim' : 'Não'}</td></tr>
    <tr><th>LC 110/2001 (0,5%)</th><td>${fgts.lc110_05 ? 'Sim' : 'Não'}</td></tr>
  </table>

  <h2>6. Verbas Deferidas</h2>
  <table>
    <tr><th>Total de Verbas</th><td>${result.verbas.length}</td></tr>
    <tr><th>Principais</th><td>${result.verbas.filter(v => v.tipo === 'principal').length}</td></tr>
    <tr><th>Reflexas</th><td>${result.verbas.filter(v => v.tipo === 'reflexa').length}</td></tr>
  </table>
  <table>
    <tr><th style="width:50%">Verba</th><th>Tipo</th><th>Característica</th></tr>
    ${result.verbas.map(v => `<tr><td>${v.nome}</td><td>${v.tipo}</td><td>${v.caracteristica}</td></tr>`).join('')}
  </table>

  <h2>7. Resultado</h2>
  <table>
    <tr><th>Principal Bruto</th><td>${fmt(result.resumo.principal_bruto)}</td></tr>
    <tr><th>Correção Monetária</th><td>${fmt(result.resumo.principal_corrigido - result.resumo.principal_bruto)}</td></tr>
    <tr><th>Juros de Mora</th><td>${fmt(result.resumo.juros_mora)}</td></tr>
    <tr><th>FGTS Total</th><td>${fmt(result.resumo.fgts_total)}</td></tr>
    <tr><th>CS Segurado (desconto)</th><td>${fmt(result.resumo.cs_segurado)}</td></tr>
    <tr><th>IRRF (desconto)</th><td>${fmt(result.resumo.ir_retido)}</td></tr>
    <tr><th>Líquido Reclamante</th><td><strong>${fmt(result.resumo.liquido_reclamante)}</strong></td></tr>
    <tr><th>Total Reclamada</th><td><strong>${fmt(result.resumo.total_reclamada)}</strong></td></tr>
  </table>

  <div class="footer">
    Relatório de Critérios Legais — MRDcalc v${meta.engineVersion || "2.1.0"} — ${new Date().toLocaleString("pt-BR")}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

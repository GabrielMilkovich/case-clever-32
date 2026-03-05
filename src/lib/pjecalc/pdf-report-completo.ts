/**
 * PJe-Calc — Relatório Completo de Liquidação (Nível Pericial)
 * Gera relatório PDF profissional unificado no padrão judicial,
 * com capa, dados do processo, composição, verbas, FGTS, CS, IR, memória e critérios.
 */
import type { PjeLiquidacaoResult } from "./engine";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtNum = (v: number) => (v || 0).toFixed(4);
const pct = (v: number) => `${(v || 0).toFixed(2)}%`;
const fmtDate = (d: string | undefined) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export interface RelatorioCompletoMeta {
  cliente?: string;
  processo?: string;
  dataLiquidacao?: string;
  engineVersion?: string;
  reclamado?: string;
  vara?: string;
  perito?: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  dataAjuizamento?: string;
  funcao?: string;
  indiceCorrecao?: string;
  jurosTipo?: string;
  jurosPercentual?: number;
  jurosInicio?: string;
}

export function gerarRelatorioCompleto(
  result: PjeLiquidacaoResult,
  meta: RelatorioCompletoMeta
) {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const horaGeracao = new Date().toLocaleString("pt-BR");
  const nProcesso = meta.processo || '—';
  const hashId = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // ── Seção de Verbas por Ocorrência (Memória) ──
  const memoriaVerbas = result.verbas.map((v, vi) => {
    const ocRows = v.ocorrencias.map(oc => `
      <tr>
        <td class="comp">${oc.competencia}</td>
        <td class="num">${fmt(oc.base)}</td>
        <td class="num">${fmtNum(oc.multiplicador)}</td>
        <td class="num">${fmtNum(oc.divisor)}</td>
        <td class="num">${fmtNum(oc.quantidade)}</td>
        <td class="num">${oc.dobra > 1 ? '×2' : '×1'}</td>
        <td class="num">${fmt(oc.devido)}</td>
        <td class="num">${fmt(oc.pago)}</td>
        <td class="num dif">${fmt(oc.diferenca)}</td>
        <td class="num">${fmtNum(oc.indice_correcao)}</td>
        <td class="num">${fmt(oc.valor_corrigido)}</td>
        <td class="num">${fmt(oc.juros)}</td>
        <td class="num total-col">${fmt(oc.valor_final)}</td>
      </tr>
    `).join("");

    return `
      <div class="verba-block">
        <div class="verba-header">
          <span class="verba-num">${vi + 1}.</span>
          <span class="verba-nome">${v.nome}</span>
          <span class="verba-badge ${v.tipo === 'principal' ? 'badge-principal' : 'badge-reflexa'}">${v.tipo === 'principal' ? 'PRINCIPAL' : 'REFLEXA'}</span>
          <span class="verba-char">${v.caracteristica || ''}</span>
        </div>
        <table class="mem-table">
          <thead>
            <tr>
              <th>Comp.</th><th>Base (R$)</th><th>Mult.</th><th>Div.</th><th>Qtd.</th><th>Dobra</th>
              <th>Devido</th><th>Pago</th><th>Diferença</th><th>Índice</th><th>Corrigido</th>
              <th>Juros</th><th class="total-col">Final</th>
            </tr>
          </thead>
          <tbody>
            ${ocRows}
            <tr class="subtotal-row">
              <td colspan="6"><strong>SUBTOTAL — ${v.nome}</strong></td>
              <td class="num"><strong>${fmt(v.total_devido)}</strong></td>
              <td class="num"><strong>${fmt(v.total_pago)}</strong></td>
              <td class="num dif"><strong>${fmt(v.total_diferenca)}</strong></td>
              <td></td>
              <td class="num"><strong>${fmt(v.total_corrigido)}</strong></td>
              <td class="num"><strong>${fmt(v.total_juros)}</strong></td>
              <td class="num total-col"><strong>${fmt(v.total_final)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }).join("");

  // ── FGTS detalhamento ──
  const fgtsRows = result.fgts.depositos.map(d => `
    <tr>
      <td class="comp">${d.competencia}</td>
      <td class="num">${fmt(d.base)}</td>
      <td class="num">${pct(d.aliquota * 100)}</td>
      <td class="num">${fmt(d.valor)}</td>
    </tr>
  `).join("");

  // ── CS detalhamento ──
  const csSegRows = result.contribuicao_social.segurado_devidos.map(s => `
    <tr>
      <td class="comp">${s.competencia}</td>
      <td class="num">${fmt(s.base)}</td>
      <td class="num">${pct(s.aliquota * 100)}</td>
      <td class="num">${fmt(s.valor)}</td>
      <td class="num">${fmt(s.recolhido)}</td>
      <td class="num dif">${fmt(s.diferenca)}</td>
    </tr>
  `).join("");

  const csEmpRows = result.contribuicao_social.empregador.map(e => `
    <tr>
      <td class="comp">${e.competencia}</td>
      <td class="num">${fmt(e.empresa)}</td>
      <td class="num">${fmt(e.sat)}</td>
      <td class="num">${fmt(e.terceiros)}</td>
      <td class="num total-col">${fmt(e.empresa + e.sat + e.terceiros)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Liquidação — Processo ${nProcesso}</title>
<style>
  @page { margin: 12mm 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 9px; color: #111827; line-height: 1.45; background: #fff; }
  
  /* ── CAPA ── */
  .capa { 
    page-break-after: always; 
    display: flex; flex-direction: column; justify-content: center; align-items: center; 
    min-height: 90vh; text-align: center; 
  }
  .capa-titulo { font-size: 22px; font-weight: 800; color: #1e3a5f; letter-spacing: 1px; margin-bottom: 6px; text-transform: uppercase; }
  .capa-subtitulo { font-size: 14px; color: #374151; margin-bottom: 24px; }
  .capa-box { 
    border: 2px solid #1e3a5f; border-radius: 8px; padding: 24px 40px; 
    display: inline-block; text-align: left; margin-top: 16px; 
  }
  .capa-box table { font-size: 11px; }
  .capa-box th { text-align: left; padding: 4px 16px 4px 0; color: #6b7280; font-weight: 600; }
  .capa-box td { padding: 4px 0; font-weight: 700; color: #111827; }
  .capa-footer { margin-top: 40px; font-size: 9px; color: #9ca3af; }
  .capa-valor { font-size: 28px; font-weight: 800; color: #1e3a5f; margin: 20px 0; font-family: 'Consolas', monospace; }
  .capa-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  
  /* ── LAYOUT ── */
  h1 { font-size: 15px; text-align: center; color: #1e3a5f; margin: 0 0 4px; }
  h2 { 
    font-size: 11px; margin: 18px 0 6px; padding: 4px 8px; 
    background: #1e3a5f; color: white; border-radius: 3px; 
    page-break-after: avoid; 
  }
  h3 { font-size: 10px; margin: 10px 0 3px; color: #1e3a5f; }
  
  .page-header { 
    text-align: center; margin-bottom: 12px; padding-bottom: 8px; 
    border-bottom: 2px solid #1e3a5f; 
  }
  .page-header .subtitle { font-size: 10px; color: #6b7280; }
  
  /* ── TABELAS ── */
  table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; }
  th, td { padding: 3px 5px; border: 1px solid #d1d5db; font-size: 8px; }
  th { background: #e8edf5; font-weight: 700; text-align: center; color: #1e3a5f; }
  td.num { text-align: right; font-family: 'Consolas', 'Courier New', monospace; }
  td.comp { text-align: center; font-family: 'Consolas', monospace; font-size: 7.5px; }
  td.dif { color: #b91c1c; }
  .total-col { background: #f0f4ff; font-weight: 700; }
  
  tr.subtotal-row { background: #e8edf5; font-weight: 700; }
  tr.grand-total { background: #1e3a5f; color: white; font-weight: 800; font-size: 9px; }
  tr.grand-total td { border-color: #1e3a5f; }
  tr.highlight-row { background: #eff6ff; }
  tr.deduction { color: #991b1b; }
  
  /* ── RESUMO GRID ── */
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin: 8px 0 14px; }
  .summary-box { 
    border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; text-align: center; 
    background: #fafbfc; 
  }
  .summary-box .label { font-size: 7px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; }
  .summary-box .value { font-size: 14px; font-weight: 800; font-family: 'Consolas', monospace; margin-top: 2px; }
  .summary-box.primary { border-color: #1e3a5f; background: #eff6ff; }
  .summary-box.primary .value { color: #1e3a5f; }
  .summary-box.success { border-color: #059669; background: #ecfdf5; }
  .summary-box.success .value { color: #059669; }
  .summary-box.danger { border-color: #dc2626; background: #fef2f2; }
  .summary-box.danger .value { color: #dc2626; }
  
  /* ── VERBAS MEMÓRIA ── */
  .verba-block { margin-bottom: 14px; page-break-inside: avoid; }
  .verba-header { 
    display: flex; align-items: center; gap: 6px; 
    padding: 4px 8px; background: #f3f4f6; border-radius: 4px; margin-bottom: 3px; 
  }
  .verba-num { font-weight: 800; color: #1e3a5f; font-size: 10px; }
  .verba-nome { font-weight: 700; font-size: 9.5px; }
  .verba-badge { 
    font-size: 6.5px; padding: 1px 5px; border-radius: 3px; font-weight: 700; letter-spacing: 0.3px; 
  }
  .badge-principal { background: #1e3a5f; color: white; }
  .badge-reflexa { background: #d1d5db; color: #374151; }
  .verba-char { font-size: 7.5px; color: #6b7280; font-style: italic; }
  
  .mem-table th { font-size: 7px; padding: 2px 3px; }
  .mem-table td { font-size: 7px; padding: 2px 3px; }
  
  /* ── COMPOSIÇÃO ── */
  .composicao-table th { text-align: left; width: 55%; background: #f9fafb; }
  .composicao-table td { text-align: right; font-family: 'Consolas', monospace; font-weight: 600; }
  .composicao-table tr.sep { border-top: 2px solid #1e3a5f; }
  .composicao-table tr.sep td, .composicao-table tr.sep th { padding-top: 6px; }
  
  /* ── FOOTER ── */
  .footer { 
    margin-top: 20px; text-align: center; font-size: 7px; color: #9ca3af; 
    border-top: 1px solid #d1d5db; padding-top: 6px; 
  }
  .footer .hash { font-family: monospace; font-size: 6.5px; color: #d1d5db; }
  
  .nota { 
    font-size: 7.5px; color: #6b7280; font-style: italic; margin: 3px 0 8px; 
    padding: 3px 8px; background: #fffbeb; border-left: 3px solid #f59e0b; 
  }
  
  .assinatura-block {
    display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;
  }
  .assinatura-line {
    text-align: center; padding-top: 40px; border-top: 1px solid #374151;
    font-size: 8px; color: #374151;
  }
  
  @media print { 
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
    .no-print { display: none; }
  }
  
  .btn-print {
    position: fixed; top: 10px; right: 10px; z-index: 9999;
    padding: 10px 24px; background: #1e3a5f; color: white; border: none; border-radius: 6px;
    font-size: 13px; font-weight: 700; cursor: pointer;
  }
  .btn-print:hover { background: #2d5a8a; }
</style>
</head>
<body>
  <button class="btn-print no-print" onclick="window.print()">📄 Exportar PDF</button>

  <!-- ═══════════════ CAPA ═══════════════ -->
  <div class="capa">
    <div class="capa-titulo">RELATÓRIO DE CÁLCULO DE LIQUIDAÇÃO</div>
    <div class="capa-subtitulo">Cálculos Trabalhistas — Processo Judicial</div>
    
    <div class="capa-box">
      <table>
        <tr><th>Processo nº</th><td>${nProcesso}</td></tr>
        <tr><th>Reclamante</th><td>${meta.cliente || '—'}</td></tr>
        ${meta.reclamado ? `<tr><th>Reclamado</th><td>${meta.reclamado}</td></tr>` : ''}
        ${meta.vara ? `<tr><th>Vara</th><td>${meta.vara}</td></tr>` : ''}
        <tr><th>Data da Liquidação</th><td>${fmtDate(meta.dataLiquidacao) || hoje}</td></tr>
      </table>
    </div>
    
    <div class="capa-label" style="margin-top: 32px;">VALOR LÍQUIDO DO RECLAMANTE</div>
    <div class="capa-valor">${fmt(result.resumo.liquido_reclamante)}</div>
    <div class="capa-label">VALOR TOTAL DA RECLAMADA</div>
    <div class="capa-valor" style="color: #dc2626; font-size: 22px;">${fmt(result.resumo.total_reclamada)}</div>
    
    <div class="capa-footer">
      Gerado por MRDcalc — Motor PJe-Calc v${meta.engineVersion || "2.1.0"}<br/>
      ${horaGeracao}
    </div>
  </div>

  <!-- ═══════════════ PÁGINA 1: RESUMO ═══════════════ -->
  <div class="page-header">
    <h1>RELATÓRIO DE LIQUIDAÇÃO</h1>
    <div class="subtitle">Processo nº ${nProcesso} — ${meta.cliente || ''}</div>
  </div>

  <h2>1. DADOS DO PROCESSO</h2>
  <table>
    <tr><th style="text-align:left;width:35%">Reclamante</th><td>${meta.cliente || '—'}</td></tr>
    ${meta.reclamado ? `<tr><th style="text-align:left">Reclamado</th><td>${meta.reclamado}</td></tr>` : ''}
    <tr><th style="text-align:left">Nº do Processo</th><td>${nProcesso}</td></tr>
    ${meta.vara ? `<tr><th style="text-align:left">Vara / Tribunal</th><td>${meta.vara}</td></tr>` : ''}
    <tr><th style="text-align:left">Data de Admissão</th><td>${fmtDate(meta.dataAdmissao)}</td></tr>
    <tr><th style="text-align:left">Data de Demissão</th><td>${fmtDate(meta.dataDemissao)}</td></tr>
    <tr><th style="text-align:left">Data de Ajuizamento</th><td>${fmtDate(meta.dataAjuizamento)}</td></tr>
    ${meta.funcao ? `<tr><th style="text-align:left">Função</th><td>${meta.funcao}</td></tr>` : ''}
    <tr><th style="text-align:left">Data da Liquidação</th><td>${fmtDate(meta.dataLiquidacao) || hoje}</td></tr>
    <tr><th style="text-align:left">Índice de Correção</th><td>${meta.indiceCorrecao || 'IPCA-E'}</td></tr>
    <tr><th style="text-align:left">Juros de Mora</th><td>${meta.jurosTipo === 'selic' ? 'SELIC' : `${pct(meta.jurosPercentual || 1)} a.m. (${meta.jurosInicio === 'citacao' ? 'citação' : 'ajuizamento'})`}</td></tr>
  </table>

  <h2>2. RESUMO DA LIQUIDAÇÃO</h2>
  <div class="summary-grid">
    <div class="summary-box"><div class="label">Principal Bruto</div><div class="value">${fmt(result.resumo.principal_bruto)}</div></div>
    <div class="summary-box primary"><div class="label">Corrigido + Juros</div><div class="value">${fmt(result.resumo.principal_corrigido + result.resumo.juros_mora)}</div></div>
    <div class="summary-box success"><div class="label">Líquido Reclamante</div><div class="value">${fmt(result.resumo.liquido_reclamante)}</div></div>
    <div class="summary-box danger"><div class="label">Total Reclamada</div><div class="value">${fmt(result.resumo.total_reclamada)}</div></div>
  </div>

  <h2>3. COMPOSIÇÃO DA LIQUIDAÇÃO</h2>
  <table class="composicao-table">
    <tbody>
      <tr><th>Principal Bruto</th><td>${fmt(result.resumo.principal_bruto)}</td></tr>
      <tr><th>(+) Correção Monetária</th><td>${fmt(result.resumo.principal_corrigido - result.resumo.principal_bruto)}</td></tr>
      <tr><th>(+) Juros de Mora</th><td>${fmt(result.resumo.juros_mora)}</td></tr>
      <tr><th>(+) FGTS (depósitos + multa)</th><td>${fmt(result.resumo.fgts_total)}</td></tr>
      <tr class="deduction"><th>(−) Contribuição Social — Segurado</th><td>${fmt(-result.resumo.cs_segurado)}</td></tr>
      <tr class="deduction"><th>(−) Imposto de Renda Retido (IRRF)</th><td>${fmt(-result.resumo.ir_retido)}</td></tr>
      ${result.resumo.seguro_desemprego > 0 ? `<tr><th>(+) Seguro-Desemprego (indenização)</th><td>${fmt(result.resumo.seguro_desemprego)}</td></tr>` : ""}
      ${(result.resumo.salario_familia || 0) > 0 ? `<tr><th>(+) Salário-Família</th><td>${fmt(result.resumo.salario_familia)}</td></tr>` : ""}
      ${result.resumo.multa_523 > 0 ? `<tr><th>(+) Multa Art. 523, §1º CPC</th><td>${fmt(result.resumo.multa_523)}</td></tr>` : ""}
      ${(result.resumo.multa_467 || 0) > 0 ? `<tr><th>(+) Multa Art. 467 CLT</th><td>${fmt(result.resumo.multa_467)}</td></tr>` : ""}
      ${result.resumo.honorarios_sucumbenciais > 0 ? `<tr><th>(+) Honorários Sucumbenciais</th><td>${fmt(result.resumo.honorarios_sucumbenciais)}</td></tr>` : ""}
      ${result.resumo.honorarios_contratuais > 0 ? `<tr><th>(+) Honorários Contratuais</th><td>${fmt(result.resumo.honorarios_contratuais)}</td></tr>` : ""}
      ${result.resumo.custas > 0 ? `<tr><th>(+) Custas Processuais</th><td>${fmt(result.resumo.custas)}</td></tr>` : ""}
      ${(result.resumo.previdencia_privada || 0) > 0 ? `<tr class="deduction"><th>(−) Previdência Privada</th><td>${fmt(-result.resumo.previdencia_privada)}</td></tr>` : ""}
      ${(result.resumo.pensao_total || 0) > 0 ? `<tr class="deduction"><th>(−) Pensão Alimentícia</th><td>${fmt(-result.resumo.pensao_total)}</td></tr>` : ""}
      <tr class="grand-total"><th style="text-align:left">LÍQUIDO RECLAMANTE</th><td>${fmt(result.resumo.liquido_reclamante)}</td></tr>
      <tr class="highlight-row"><th style="text-align:left">Contribuição Social — Empregador</th><td>${fmt(result.resumo.cs_empregador)}</td></tr>
      <tr class="grand-total"><th style="text-align:left">TOTAL RECLAMADA</th><td>${fmt(result.resumo.total_reclamada)}</td></tr>
    </tbody>
  </table>

  <h2>4. DISCRIMINAÇÃO POR VERBA</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Verba</th><th>Tipo</th>
        <th>Devido</th><th>Pago</th><th>Diferença</th>
        <th>Corrigido</th><th>Juros</th><th class="total-col">Final</th>
      </tr>
    </thead>
    <tbody>
      ${result.verbas.map(v => `
        <tr>
          <td style="text-align:left">${v.nome}</td>
          <td class="comp">${v.tipo === "principal" ? "P" : "R"}</td>
          <td class="num">${fmt(v.total_devido)}</td>
          <td class="num">${fmt(v.total_pago)}</td>
          <td class="num dif">${fmt(v.total_diferenca)}</td>
          <td class="num">${fmt(v.total_corrigido)}</td>
          <td class="num">${fmt(v.total_juros)}</td>
          <td class="num total-col">${fmt(v.total_final)}</td>
        </tr>
      `).join("")}
      <tr class="grand-total">
        <td colspan="2" style="text-align:left"><strong>TOTAL GERAL</strong></td>
        <td class="num">${fmt(result.verbas.reduce((s, v) => s + v.total_devido, 0))}</td>
        <td class="num">${fmt(result.verbas.reduce((s, v) => s + v.total_pago, 0))}</td>
        <td class="num">${fmt(result.verbas.reduce((s, v) => s + v.total_diferenca, 0))}</td>
        <td class="num">${fmt(result.verbas.reduce((s, v) => s + v.total_corrigido, 0))}</td>
        <td class="num">${fmt(result.verbas.reduce((s, v) => s + v.total_juros, 0))}</td>
        <td class="num">${fmt(result.verbas.reduce((s, v) => s + v.total_final, 0))}</td>
      </tr>
    </tbody>
  </table>

  <!-- ═══════════════ MEMÓRIA DE CÁLCULO ═══════════════ -->
  <h2>5. MEMÓRIA DE CÁLCULO — DETALHAMENTO POR OCORRÊNCIA</h2>
  <div class="nota">Fórmula: Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra — Diferença = Devido − Pago</div>
  ${memoriaVerbas}

  <!-- ═══════════════ FGTS ═══════════════ -->
  ${result.fgts.total_fgts > 0 ? `
  <h2>6. FGTS — DEPÓSITOS POR COMPETÊNCIA</h2>
  <table>
    <thead><tr><th>Comp.</th><th>Base (R$)</th><th>Alíquota</th><th>Valor (R$)</th></tr></thead>
    <tbody>
      ${fgtsRows}
      <tr class="subtotal-row">
        <td colspan="3"><strong>Total Depósitos</strong></td>
        <td class="num"><strong>${fmt(result.fgts.total_depositos)}</strong></td>
      </tr>
      <tr><td colspan="3">Multa FGTS (${pct(result.fgts.multa_percentual || 40)})</td><td class="num">${fmt(result.fgts.multa_valor)}</td></tr>
      ${result.fgts.lc110_10 > 0 ? `<tr><td colspan="3">LC 110/2001 (10%)</td><td class="num">${fmt(result.fgts.lc110_10)}</td></tr>` : ''}
      ${result.fgts.lc110_05 > 0 ? `<tr><td colspan="3">LC 110/2001 (0,5%)</td><td class="num">${fmt(result.fgts.lc110_05)}</td></tr>` : ''}
      <tr class="grand-total"><td colspan="3"><strong>TOTAL FGTS</strong></td><td class="num"><strong>${fmt(result.fgts.total_fgts)}</strong></td></tr>
    </tbody>
  </table>` : ''}

  <!-- ═══════════════ CS ═══════════════ -->
  ${result.contribuicao_social.total_segurado > 0 ? `
  <h2>7. CONTRIBUIÇÃO SOCIAL — SEGURADO</h2>
  <table>
    <thead><tr><th>Comp.</th><th>Base</th><th>Alíquota</th><th>Valor</th><th>Recolhido</th><th>Diferença</th></tr></thead>
    <tbody>
      ${csSegRows}
      <tr class="subtotal-row">
        <td colspan="3"><strong>Total CS Segurado</strong></td>
        <td class="num"><strong>${fmt(result.contribuicao_social.total_segurado)}</strong></td>
        <td></td><td></td>
      </tr>
    </tbody>
  </table>` : ''}

  ${result.contribuicao_social.empregador.length > 0 ? `
  <h2>8. CONTRIBUIÇÃO SOCIAL — EMPREGADOR</h2>
  <table>
    <thead><tr><th>Comp.</th><th>Empresa</th><th>SAT/RAT</th><th>Terceiros</th><th class="total-col">Total</th></tr></thead>
    <tbody>
      ${csEmpRows}
      <tr class="grand-total">
        <td><strong>TOTAL</strong></td>
        <td class="num"><strong>${fmt(result.contribuicao_social.empregador.reduce((s, e) => s + e.empresa, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.contribuicao_social.empregador.reduce((s, e) => s + e.sat, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.contribuicao_social.empregador.reduce((s, e) => s + e.terceiros, 0))}</strong></td>
        <td class="num"><strong>${fmt(result.resumo.cs_empregador)}</strong></td>
      </tr>
    </tbody>
  </table>` : ''}

  <!-- ═══════════════ IR ═══════════════ -->
  ${result.imposto_renda.imposto_devido > 0 ? `
  <h2>9. IMPOSTO DE RENDA — Art. 12-A, Lei 7.713/88 (RRA)</h2>
  <table class="composicao-table">
    <tr><th>Base de Cálculo</th><td>${fmt(result.imposto_renda.base_calculo)}</td></tr>
    <tr><th>Deduções</th><td>${fmt(result.imposto_renda.deducoes)}</td></tr>
    <tr><th>Meses RRA</th><td>${result.imposto_renda.meses_rra}</td></tr>
    ${result.imposto_renda.faixas_aplicadas ? result.imposto_renda.faixas_aplicadas.map((f: any) => `
      <tr><th>Faixa ${f.faixa}: até ${fmt(f.valor_ate)}</th><td>Alíquota ${pct(f.aliquota * 100)} — ${fmt(f.imposto)}</td></tr>
    `).join('') : ''}
    <tr class="grand-total"><th style="text-align:left">IRRF DEVIDO</th><td>${fmt(result.imposto_renda.imposto_devido)}</td></tr>
  </table>
  <div class="nota">Rendimentos Recebidos Acumuladamente (RRA): a base é dividida pelo nº de meses, aplicando-se a tabela progressiva proporcional. Fundamento: Art. 12-A, Lei 7.713/88.</div>
  ` : ''}

  <!-- ═══════════════ DECLARAÇÃO ═══════════════ -->
  <h2>DECLARAÇÃO DE CONFORMIDADE</h2>
  <div style="font-size: 8px; line-height: 1.5; text-align: justify; margin: 8px 0;">
    O presente relatório foi elaborado com base nos critérios e parâmetros de cálculo estabelecidos pela decisão judicial, 
    utilizando como referência a metodologia do sistema PJe-Calc (CSJT). Todos os valores foram apurados considerando as 
    tabelas oficiais de índices de correção monetária, contribuição previdenciária e imposto de renda vigentes nos respectivos 
    períodos. A fórmula padrão aplicada é: <strong>Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra</strong>.
    Os índices de correção, tabelas de INSS e IRRF são obtidos de fontes oficiais (IBGE, BCB, Receita Federal do Brasil).
  </div>

  <!-- ═══════════════ ASSINATURAS ═══════════════ -->
  <div class="assinatura-block">
    <div>
      <div class="assinatura-line">
        ${meta.perito || 'Calculista Responsável'}<br/>
        <span style="font-size: 7px; color: #9ca3af;">Perito / Assistente Técnico</span>
      </div>
    </div>
    <div>
      <div class="assinatura-line">
        Local e Data<br/>
        <span style="font-size: 7px; color: #9ca3af;">__________, ${hoje}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    Relatório de Liquidação — Processo nº ${nProcesso} — MRDcalc v${meta.engineVersion || "2.1.0"} — ${horaGeracao}
    <br/>
    <span class="hash">ID: ${hashId}</span>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    // Auto-trigger print dialog for PDF export
    setTimeout(() => win.print(), 600);
  }
}

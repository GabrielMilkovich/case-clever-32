/**
 * PJe-Calc — Relatório Completo de Liquidação
 * Formato fiel ao padrão oficial PJe-Calc CSJT (landscape A4)
 * Seções: Resumo, Créditos/Descontos, Débitos Reclamado, Critérios, 
 *         Dados do Cálculo, Faltas/Férias, Cartão de Ponto Diário
 */
import type { PjeLiquidacaoResult } from "./engine";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
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
  uf?: string;
  municipio?: string;
  cargaHoraria?: number;
  sabadoDiaUtil?: boolean;
  prescricaoQuinquenal?: boolean;
  prescricaoTrintenaria?: boolean;
  regimeTrabalho?: string;
  projetarAvisoPrevio?: boolean;
  considerarFeriados?: boolean;
  considerarFeriadosEstaduais?: boolean;
  zerarNegativo?: boolean;
  honorariosNome?: string;
  /** Faltas do caso para seção de Faltas */
  faltas?: Array<{ inicio: string; fim: string; justificada: boolean; justificativa?: string }>;
  /** Férias do caso */
  ferias?: Array<{
    relativa?: string;
    periodo_aquisitivo_inicio?: string;
    periodo_aquisitivo_fim?: string;
    periodo_concessivo_inicio?: string;
    periodo_concessivo_fim?: string;
    prazo?: number;
    situacao?: string;
    abono?: boolean;
    gozo1_inicio?: string;
    gozo1_fim?: string;
    gozo2_inicio?: string;
    gozo2_fim?: string;
    gozo3_inicio?: string;
    gozo3_fim?: string;
  }>;
  /** Pontos facultativos */
  pontosFacultativos?: Array<{ nome: string; abrangencia: string }>;
  /** Cartão de ponto diário */
  cartaoPontoDiario?: Array<{
    data: string;
    dia: string;
    frequencia: string;
    hs_trabalhadas: number;
    hs_ext_diarias: number;
    hs_ext_semanais: number;
    hs_ext_repousos: number;
    hs_ext_feriados: number;
    hs_interjornadas: number;
    hs_art384: number;
  }>;
  /** Critérios de cálculo e fundamentação legal */
  criterios?: string[];
}

/* ═══════ CSS ═══════ */
const CSS = `
@page { margin: 10mm 12mm; size: A4 landscape; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: Arial, Helvetica, sans-serif; 
  font-size: 8pt; 
  color: #000; 
  line-height: 1.35; 
  background: #fff; 
}

/* ── Header de cada página ── */
.page-header {
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start;
  border-bottom: 2px solid #003366;
  padding-bottom: 4px;
  margin-bottom: 8px;
}
.page-header-left { font-size: 7pt; color: #555; }
.page-header-right { text-align: right; font-size: 7pt; color: #555; }
.page-header-center { text-align: center; flex: 1; }
.page-header-center h1 { font-size: 11pt; color: #003366; margin: 0; font-weight: 700; }
.page-header-center .subtitle { font-size: 8pt; color: #333; }

/* ── Títulos de seção ── */
h2 { 
  font-size: 9pt; 
  font-weight: 700; 
  color: #003366; 
  margin: 14px 0 6px; 
  padding: 3px 0;
  border-bottom: 1px solid #003366;
}
h3 { font-size: 8pt; font-weight: 700; color: #003366; margin: 8px 0 4px; }

/* ── Info grid ── */
.info-grid { margin: 4px 0 10px; }
.info-row { display: flex; margin-bottom: 1px; }
.info-label { font-weight: 700; width: 220px; font-size: 7.5pt; color: #333; padding: 2px 4px; background: #f5f5f5; border: 1px solid #ddd; }
.info-value { font-size: 7.5pt; padding: 2px 6px; border: 1px solid #ddd; border-left: none; flex: 1; }

/* ── Tabelas ── */
table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 7.5pt; }
th { 
  background: #003366; 
  color: #fff; 
  font-weight: 700; 
  text-align: center; 
  padding: 3px 4px; 
  border: 1px solid #003366;
  font-size: 7pt;
}
td { padding: 2px 4px; border: 1px solid #ccc; }
td.num { text-align: right; font-family: 'Courier New', monospace; }
td.left { text-align: left; }
td.center { text-align: center; }
tr:nth-child(even) { background: #f9f9f9; }
tr.total-row { background: #e6edf5; font-weight: 700; }
tr.total-row td { border-color: #999; }
tr.grand-total { background: #003366; color: #fff; font-weight: 700; }
tr.grand-total td { border-color: #003366; }
tr.deduction td { color: #990000; }
tr.subtotal td { font-weight: 700; border-top: 2px solid #003366; background: #e6edf5; }

/* ── Resumo boxes ── */
.resumo-valores {
  display: flex; gap: 16px; margin: 12px 0 16px; justify-content: center;
}
.resumo-box {
  text-align: center; padding: 10px 20px;
  border: 2px solid #003366; border-radius: 4px; background: #f0f4fa;
}
.resumo-box .label { font-size: 7pt; color: #555; text-transform: uppercase; letter-spacing: 0.3px; }
.resumo-box .value { font-size: 16pt; font-weight: 800; color: #003366; font-family: 'Courier New', monospace; margin-top: 2px; }
.resumo-box.danger { border-color: #cc0000; background: #fff5f5; }
.resumo-box.danger .value { color: #cc0000; }

/* ── Footer ── */
.page-footer {
  margin-top: 12px; padding-top: 4px; border-top: 1px solid #ccc;
  display: flex; justify-content: space-between;
  font-size: 6.5pt; color: #888;
}

/* ── Page breaks ── */
.page-break { page-break-before: always; }

/* ── Assinatura ── */
.assinatura-block {
  display: flex; gap: 60px; justify-content: center; margin-top: 30px;
}
.assinatura-line {
  text-align: center; padding-top: 30px; border-top: 1px solid #333;
  font-size: 7pt; color: #333; min-width: 200px;
}

@media print { 
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
  .no-print { display: none; }
}

.btn-bar {
  position: fixed; top: 8px; right: 8px; z-index: 9999;
  display: flex; gap: 8px;
}
.btn-bar button {
  padding: 8px 20px; background: #003366; color: white; border: none; border-radius: 4px;
  font-size: 11px; font-weight: 700; cursor: pointer;
}
.btn-bar button:hover { background: #004488; }
`;

/* ═══════ Header de página ═══════ */
function pageHeader(meta: RelatorioCompletoMeta, title: string) {
  return `
  <div class="page-header">
    <div class="page-header-left">
      Processo: ${meta.processo || '—'}<br/>
      Cálculo: MRDcalc
    </div>
    <div class="page-header-center">
      <h1>${title}</h1>
      <div class="subtitle">
        Reclamante: ${meta.cliente || '—'}
        ${meta.reclamado ? ` — Reclamado: ${meta.reclamado}` : ''}
      </div>
    </div>
    <div class="page-header-right">
      Período: ${fmtDate(meta.dataAdmissao?.substring(0, 10))} a ${fmtDate(meta.dataDemissao?.substring(0, 10))}<br/>
      Liquidação: ${fmtDate(meta.dataLiquidacao)}
    </div>
  </div>`;
}

function pageFooter(meta: RelatorioCompletoMeta) {
  const hoje = new Date().toLocaleString("pt-BR");
  return `
  <div class="page-footer">
    <span>Cálculo liquidado por MRDcalc v${meta.engineVersion || "2.1.0"} em ${hoje}</span>
    <span>Processo: ${meta.processo || '—'}</span>
  </div>`;
}

/* ═══════ Build HTML ═══════ */
function buildRelatorioCompletoHTML(
  result: PjeLiquidacaoResult,
  meta: RelatorioCompletoMeta
): string {
  const nProcesso = meta.processo || '—';

  // ──────────── PÁGINA 1: RESUMO DO CÁLCULO ────────────
  const verbasRows = result.verbas.map(v => `
    <tr>
      <td class="left">${v.nome}</td>
      <td class="num">${fmt(v.total_corrigido)}</td>
      <td class="num">${fmt(v.total_juros)}</td>
      <td class="num">${fmt(v.total_final)}</td>
    </tr>
  `).join('');

  const totalCorrigido = result.verbas.reduce((s, v) => s + v.total_corrigido, 0);
  const totalJuros = result.verbas.reduce((s, v) => s + v.total_juros, 0);
  const totalFinal = result.verbas.reduce((s, v) => s + v.total_final, 0);

  // Add FGTS rows to resumo
  const fgtsRow = result.fgts.total_fgts > 0 ? `
    <tr>
      <td class="left">FGTS ${(result.fgts.aliquota_padrao || 0.08) * 100}%</td>
      <td class="num">${fmt(result.fgts.total_depositos)}</td>
      <td class="num">—</td>
      <td class="num">${fmt(result.fgts.total_depositos)}</td>
    </tr>
    <tr>
      <td class="left">MULTA SOBRE FGTS ${(result.fgts.multa_percentual || 0.4) * 100}%</td>
      <td class="num">${fmt(result.fgts.multa_valor)}</td>
      <td class="num">—</td>
      <td class="num">${fmt(result.fgts.multa_valor)}</td>
    </tr>
  ` : '';

  const grandTotalCorrigido = totalCorrigido + (result.fgts.total_depositos || 0) + (result.fgts.multa_valor || 0);
  const grandTotalJuros = totalJuros;
  const grandTotalFinal = totalFinal + (result.fgts.total_fgts || 0);

  const pctRemuneratorio = grandTotalFinal > 0 
    ? ((totalFinal / grandTotalFinal) * 100).toFixed(2) 
    : '0.00';

  const page1 = `
  ${pageHeader(meta, 'PLANILHA DE CÁLCULO')}

  <h2>Resumo do Cálculo</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width:55%">Descrição do Bruto Devido ao Reclamante</th>
        <th style="width:15%">Valor Corrigido</th>
        <th style="width:15%">Juros</th>
        <th style="width:15%">Total</th>
      </tr>
    </thead>
    <tbody>
      ${verbasRows}
      ${fgtsRow}
      <tr class="grand-total">
        <td class="left">Total</td>
        <td class="num">${fmt(grandTotalCorrigido)}</td>
        <td class="num">${fmt(grandTotalJuros)}</td>
        <td class="num">${fmt(grandTotalFinal)}</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size: 7pt; color: #555;">Percentual de Parcelas Remuneratórias e Tributáveis: ${pctRemuneratorio}%</p>

  <!-- Créditos e Descontos -->
  <h2>Descrição de Créditos e Descontos do Reclamante</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width:65%">VERBAS</th>
        <th style="width:35%">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${result.fgts.total_fgts > 0 ? `<tr><td class="left">FGTS</td><td class="num">${fmt(result.fgts.total_fgts)}</td></tr>` : ''}
      <tr><td class="left">Bruto Devido ao Reclamante</td><td class="num">${fmt(grandTotalFinal)}</td></tr>
      ${result.resumo.cs_segurado > 0 ? `<tr class="deduction"><td class="left">DEDUÇÃO DE CONTRIBUIÇÃO SOCIAL</td><td class="num">(${fmt(result.resumo.cs_segurado)})</td></tr>` : ''}
      ${result.resumo.ir_retido > 0 ? `<tr class="deduction"><td class="left">IRPF DEVIDO PELO RECLAMANTE</td><td class="num">(${fmt(result.resumo.ir_retido)})</td></tr>` : `<tr><td class="left">IRPF DEVIDO PELO RECLAMANTE</td><td class="num">0,00</td></tr>`}
      ${(result.resumo.pensao_total || 0) > 0 ? `<tr class="deduction"><td class="left">PENSÃO ALIMENTÍCIA</td><td class="num">(${fmt(result.resumo.pensao_total)})</td></tr>` : ''}
      ${(result.resumo.previdencia_privada || 0) > 0 ? `<tr class="deduction"><td class="left">PREVIDÊNCIA PRIVADA</td><td class="num">(${fmt(result.resumo.previdencia_privada)})</td></tr>` : ''}
      <tr class="total-row"><td class="left">Total de Descontos</td><td class="num">(${fmt(result.resumo.cs_segurado + result.resumo.ir_retido + (result.resumo.pensao_total || 0) + (result.resumo.previdencia_privada || 0))})</td></tr>
      <tr class="grand-total"><td class="left">Líquido Devido ao Reclamante</td><td class="num">${fmt(result.resumo.liquido_reclamante)}</td></tr>
    </tbody>
  </table>

  <!-- Débitos do Reclamado -->
  <h2>Descrição de Débitos do Reclamado por Credor</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width:65%">Descrição</th>
        <th style="width:35%">Valor</th>
      </tr>
    </thead>
    <tbody>
      <tr><td class="left">LÍQUIDO DEVIDO AO RECLAMANTE</td><td class="num">${fmt(result.resumo.liquido_reclamante)}</td></tr>
      ${result.resumo.cs_empregador > 0 ? `<tr><td class="left">CONTRIBUIÇÃO SOCIAL SOBRE SALÁRIOS DEVIDOS</td><td class="num">${fmt(result.resumo.cs_empregador)}</td></tr>` : ''}
      ${result.resumo.honorarios_sucumbenciais > 0 ? `<tr><td class="left">HONORÁRIOS SUCUMBENCIAIS${meta.honorariosNome ? ' PARA ' + meta.honorariosNome.toUpperCase() : ''}</td><td class="num">${fmt(result.resumo.honorarios_sucumbenciais)}</td></tr>` : ''}
      ${result.resumo.honorarios_contratuais > 0 ? `<tr><td class="left">HONORÁRIOS CONTRATUAIS${meta.honorariosNome ? ' PARA ' + meta.honorariosNome.toUpperCase() : ''}</td><td class="num">${fmt(result.resumo.honorarios_contratuais)}</td></tr>` : ''}
      ${result.resumo.custas > 0 ? `<tr><td class="left">CUSTAS PROCESSUAIS</td><td class="num">${fmt(result.resumo.custas)}</td></tr>` : ''}
      ${result.resumo.ir_retido > 0 ? `<tr><td class="left">IRPF DEVIDO PELO RECLAMANTE</td><td class="num">${fmt(result.resumo.ir_retido)}</td></tr>` : `<tr><td class="left">IRPF DEVIDO PELO RECLAMANTE</td><td class="num">0,00</td></tr>`}
      <tr class="grand-total"><td class="left">Total Devido pelo Reclamado</td><td class="num">${fmt(result.resumo.total_reclamada)}</td></tr>
    </tbody>
  </table>

  <!-- Critérios -->
  <h2>Critério de Cálculo e Fundamentação Legal</h2>
  <div style="font-size: 7.5pt; line-height: 1.5; text-align: justify;">
    <ol style="padding-left: 16px;">
      ${(meta.criterios && meta.criterios.length > 0)
        ? meta.criterios.map(c => `<li style="margin-bottom: 3px;">${c}</li>`).join('')
        : buildDefaultCriterios(meta, result)}
    </ol>
  </div>

  ${pageFooter(meta)}
  `;

  // ──────────── PÁGINA 2: DADOS DO CÁLCULO ────────────
  const faltasRows = (meta.faltas || []).map(f => `
    <tr>
      <td class="center">${fmtDate(f.inicio)}</td>
      <td class="center">${fmtDate(f.fim)}</td>
      <td class="center">${f.justificada ? 'Sim' : 'Não'}</td>
      <td class="left">${f.justificativa || '—'}</td>
    </tr>
  `).join('');

  const feriasRows = (meta.ferias || []).map(f => `
    <tr>
      <td class="center">${f.relativa || '—'}</td>
      <td class="center">${fmtDate(f.periodo_aquisitivo_inicio)} a ${fmtDate(f.periodo_aquisitivo_fim)}</td>
      <td class="center">${fmtDate(f.periodo_concessivo_inicio)} a ${fmtDate(f.periodo_concessivo_fim)}</td>
      <td class="center">${f.prazo || 30}</td>
      <td class="center">${f.situacao || '—'}</td>
      <td class="center">${f.abono ? 'Sim' : 'Não'}</td>
      <td class="center">${f.gozo1_inicio ? fmtDate(f.gozo1_inicio) + ' a ' + fmtDate(f.gozo1_fim) : '—'}</td>
      <td class="center">${f.gozo2_inicio ? fmtDate(f.gozo2_inicio) + ' a ' + fmtDate(f.gozo2_fim) : '—'}</td>
      <td class="center">${f.gozo3_inicio ? fmtDate(f.gozo3_inicio) + ' a ' + fmtDate(f.gozo3_fim) : '—'}</td>
    </tr>
  `).join('');

  const pontosFacRows = (meta.pontosFacultativos || []).map(p => `
    <tr><td class="left">${p.nome}</td><td class="center">${p.abrangencia}</td></tr>
  `).join('');

  const page2 = `
  <div class="page-break"></div>
  ${pageHeader(meta, 'PLANILHA DE CÁLCULO')}

  <h2>Dados do Cálculo</h2>
  <div class="info-grid">
    <div class="info-row"><div class="info-label">Estado</div><div class="info-value">${meta.uf || '—'}</div></div>
    <div class="info-row"><div class="info-label">Município</div><div class="info-value">${meta.municipio || '—'}</div></div>
    <div class="info-row"><div class="info-label">Admissão</div><div class="info-value">${fmtDate(meta.dataAdmissao)}</div></div>
    <div class="info-row"><div class="info-label">Demissão</div><div class="info-value">${fmtDate(meta.dataDemissao)}</div></div>
    <div class="info-row"><div class="info-label">Regime de Trabalho</div><div class="info-value">${meta.regimeTrabalho || 'Tempo Integral'}</div></div>
    <div class="info-row"><div class="info-label">Aplicar Prescrição Quinquenal</div><div class="info-value">${meta.prescricaoQuinquenal ? 'Sim' : 'Não'}</div></div>
    <div class="info-row"><div class="info-label">Aplicar Prescrição Trintenária</div><div class="info-value">${meta.prescricaoTrintenaria ? 'Sim' : 'Não'}</div></div>
    <div class="info-row"><div class="info-label">Projetar Aviso Prévio Indenizado</div><div class="info-value">${meta.projetarAvisoPrevio !== false ? 'Sim' : 'Não'}</div></div>
    <div class="info-row"><div class="info-label">Considerar Feriados</div><div class="info-value">${meta.considerarFeriados !== false ? 'Sim' : 'Não'}</div></div>
    <div class="info-row"><div class="info-label">Considerar Feriados Estaduais</div><div class="info-value">${meta.considerarFeriadosEstaduais !== false ? 'Sim' : 'Não'}</div></div>
    <div class="info-row"><div class="info-label">Carga Horária (Padrão)</div><div class="info-value">${(meta.cargaHoraria || 220).toFixed(2)}</div></div>
    <div class="info-row"><div class="info-label">Sábado como Dia Útil</div><div class="info-value">${meta.sabadoDiaUtil ? 'Sim' : 'Não'}</div></div>
    <div class="info-row"><div class="info-label">Zerar Valor Negativo (Padrão)</div><div class="info-value">${meta.zerarNegativo ? 'Sim' : 'Não'}</div></div>
  </div>

  ${pontosFacRows ? `
  <h3>PONTOS FACULTATIVOS</h3>
  <table>
    <thead><tr><th style="text-align:left">Nome</th><th>Abrangência</th></tr></thead>
    <tbody>${pontosFacRows}</tbody>
  </table>` : ''}

  <h2>Faltas e Férias</h2>

  <h3>FALTAS</h3>
  ${faltasRows ? `
  <table>
    <thead><tr><th>Início</th><th>Fim</th><th>Justificada</th><th style="text-align:left">Justificativa</th></tr></thead>
    <tbody>${faltasRows}</tbody>
  </table>` : '<p style="font-size:7pt; color:#888;">Nenhuma falta registrada.</p>'}

  <h3>FÉRIAS</h3>
  ${feriasRows ? `
  <table>
    <thead>
      <tr>
        <th>Relativa</th><th>Período Aquisitivo</th><th>Período Concessivo</th>
        <th>Prazo</th><th>Situação</th><th>Abono</th>
        <th>Período de Gozo 1</th><th>Período de Gozo 2</th><th>Período de Gozo 3</th>
      </tr>
    </thead>
    <tbody>${feriasRows}</tbody>
  </table>` : '<p style="font-size:7pt; color:#888;">Nenhum período de férias registrado.</p>'}

  ${pageFooter(meta)}
  `;

  // ──────────── PÁGINAS 3+: CARTÃO DE PONTO DIÁRIO ────────────
  let cartaoPages = '';
  const cartao = meta.cartaoPontoDiario || [];
  
  if (cartao.length > 0) {
    const ROWS_PER_PAGE = 35;
    for (let i = 0; i < cartao.length; i += ROWS_PER_PAGE) {
      const chunk = cartao.slice(i, i + ROWS_PER_PAGE);
      const rows = chunk.map(c => `
        <tr>
          <td class="center">${fmtDate(c.data)}</td>
          <td class="center">${c.dia}</td>
          <td class="center">${c.frequencia || '—'}</td>
          <td class="num">${c.hs_trabalhadas.toFixed(2)}</td>
          <td class="num">${c.hs_ext_diarias.toFixed(2)}</td>
          <td class="num">${c.hs_ext_semanais.toFixed(2)}</td>
          <td class="num">${c.hs_ext_repousos.toFixed(2)}</td>
          <td class="num">${c.hs_ext_feriados.toFixed(2)}</td>
          <td class="num">${c.hs_interjornadas.toFixed(2)}</td>
          <td class="num">${c.hs_art384.toFixed(2)}</td>
        </tr>
      `).join('');

      cartaoPages += `
      <div class="page-break"></div>
      ${pageHeader(meta, 'Cartão de Ponto Diário')}
      <h3>OCORRÊNCIAS DO CARTÃO DE PONTO DIÁRIO</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th><th>Dia</th><th>Frequência</th>
            <th>Hs Trabalhadas</th><th>Hs Ext Diárias</th><th>Hs Ext Semanais</th>
            <th>Hs Ext Diárias em Repousos</th><th>Hs Ext Diárias em Feriados</th>
            <th>Hs Interjornadas</th><th>Hs Art 384</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${pageFooter(meta)}
      `;
    }
  }

  // ──────────── PÁGINA FINAL: MEMÓRIA DE CÁLCULO DETALHADA ────────────
  const memoriaVerbas = result.verbas.map((v, vi) => {
    const ocRows = v.ocorrencias.map(oc => `
      <tr>
        <td class="center">${oc.competencia}</td>
        <td class="num">${fmt(oc.base)}</td>
        <td class="num">${oc.multiplicador.toFixed(4)}</td>
        <td class="num">${oc.divisor.toFixed(4)}</td>
        <td class="num">${oc.quantidade.toFixed(4)}</td>
        <td class="num">${oc.dobra > 1 ? '×2' : '×1'}</td>
        <td class="num">${fmt(oc.devido)}</td>
        <td class="num">${fmt(oc.pago)}</td>
        <td class="num" style="color:#990000">${fmt(oc.diferenca)}</td>
        <td class="num">${oc.indice_correcao.toFixed(6)}</td>
        <td class="num">${fmt(oc.valor_corrigido)}</td>
        <td class="num">${fmt(oc.juros)}</td>
        <td class="num" style="font-weight:700">${fmt(oc.valor_final)}</td>
      </tr>
    `).join('');

    return `
    <div style="margin-bottom: 12px; page-break-inside: avoid;">
      <h3 style="background: #e6edf5; padding: 3px 6px; border-radius: 2px;">
        ${vi + 1}. ${v.nome} 
        <span style="font-size: 6pt; color: #666; font-weight: 400;">[${v.tipo === 'principal' ? 'PRINCIPAL' : 'REFLEXA'}${v.caracteristica ? ' — ' + v.caracteristica : ''}]</span>
      </h3>
      <table>
        <thead>
          <tr>
            <th>Comp.</th><th>Base</th><th>Mult.</th><th>Div.</th><th>Qtd.</th><th>Dobra</th>
            <th>Devido</th><th>Pago</th><th>Diferença</th><th>Índice</th><th>Corrigido</th>
            <th>Juros</th><th>Final</th>
          </tr>
        </thead>
        <tbody>
          ${ocRows}
          <tr class="subtotal">
            <td colspan="6" class="left"><strong>SUBTOTAL — ${v.nome}</strong></td>
            <td class="num"><strong>${fmt(v.total_devido)}</strong></td>
            <td class="num"><strong>${fmt(v.total_pago)}</strong></td>
            <td class="num" style="color:#990000"><strong>${fmt(v.total_diferenca)}</strong></td>
            <td></td>
            <td class="num"><strong>${fmt(v.total_corrigido)}</strong></td>
            <td class="num"><strong>${fmt(v.total_juros)}</strong></td>
            <td class="num"><strong>${fmt(v.total_final)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    `;
  }).join('');

  const memoriaPage = `
  <div class="page-break"></div>
  ${pageHeader(meta, 'MEMÓRIA DE CÁLCULO')}
  <p style="font-size: 7pt; color: #555; margin-bottom: 8px; background: #fffde6; padding: 3px 6px; border-left: 3px solid #e6a800;">
    Fórmula: Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra — Diferença = Devido − Pago
  </p>
  ${memoriaVerbas}
  ${pageFooter(meta)}
  `;

  // ──────────── CS DETALHAMENTO ────────────
  let csPage = '';
  if (result.contribuicao_social.total_segurado > 0) {
    const csSegRows = result.contribuicao_social.segurado_devidos.map(s => `
      <tr>
        <td class="center">${s.competencia}</td>
        <td class="num">${fmt(s.base)}</td>
        <td class="num">${(s.aliquota * 100).toFixed(2)}%</td>
        <td class="num">${fmt(s.valor)}</td>
        <td class="num">${fmt(s.recolhido)}</td>
        <td class="num" style="color:#990000">${fmt(s.diferenca)}</td>
      </tr>
    `).join('');

    const csEmpRows = result.contribuicao_social.empregador.map(e => `
      <tr>
        <td class="center">${e.competencia}</td>
        <td class="num">${fmt(e.empresa)}</td>
        <td class="num">${fmt(e.sat)}</td>
        <td class="num">${fmt(e.terceiros)}</td>
        <td class="num">${fmt(e.empresa + e.sat + e.terceiros)}</td>
      </tr>
    `).join('');

    csPage = `
    <div class="page-break"></div>
    ${pageHeader(meta, 'CONTRIBUIÇÃO SOCIAL')}
    
    <h2>Contribuição Social — Segurado</h2>
    <table>
      <thead><tr><th>Comp.</th><th>Base</th><th>Alíquota</th><th>Valor</th><th>Recolhido</th><th>Diferença</th></tr></thead>
      <tbody>
        ${csSegRows}
        <tr class="grand-total">
          <td colspan="3" class="left"><strong>Total CS Segurado</strong></td>
          <td class="num"><strong>${fmt(result.contribuicao_social.total_segurado)}</strong></td>
          <td></td><td></td>
        </tr>
      </tbody>
    </table>

    ${csEmpRows ? `
    <h2>Contribuição Social — Empregador</h2>
    <table>
      <thead><tr><th>Comp.</th><th>Empresa</th><th>SAT/RAT</th><th>Terceiros</th><th>Total</th></tr></thead>
      <tbody>
        ${csEmpRows}
        <tr class="grand-total">
          <td class="left"><strong>TOTAL</strong></td>
          <td class="num"><strong>${fmt(result.contribuicao_social.empregador.reduce((s, e) => s + e.empresa, 0))}</strong></td>
          <td class="num"><strong>${fmt(result.contribuicao_social.empregador.reduce((s, e) => s + e.sat, 0))}</strong></td>
          <td class="num"><strong>${fmt(result.contribuicao_social.empregador.reduce((s, e) => s + e.terceiros, 0))}</strong></td>
          <td class="num"><strong>${fmt(result.resumo.cs_empregador)}</strong></td>
        </tr>
      </tbody>
    </table>` : ''}
    ${pageFooter(meta)}
    `;
  }

  // ──────────── IR DETALHAMENTO ────────────
  let irPage = '';
  if (result.imposto_renda.imposto_devido > 0) {
    irPage = `
    <div class="page-break"></div>
    ${pageHeader(meta, 'IMPOSTO DE RENDA')}
    <h2>Imposto de Renda — Art. 12-A, Lei 7.713/88 (RRA)</h2>
    <div class="info-grid">
      <div class="info-row"><div class="info-label">Base de Cálculo</div><div class="info-value">${fmt(result.imposto_renda.base_calculo)}</div></div>
      <div class="info-row"><div class="info-label">Deduções</div><div class="info-value">${fmt(result.imposto_renda.deducoes)}</div></div>
      <div class="info-row"><div class="info-label">Meses RRA</div><div class="info-value">${result.imposto_renda.meses_rra}</div></div>
      <div class="info-row" style="font-weight:700; background:#003366; color:#fff;"><div class="info-label" style="background:#003366; color:#fff; border-color:#003366;">IRRF DEVIDO</div><div class="info-value" style="border-color:#003366; color:#fff; background:#003366;">${fmt(result.imposto_renda.imposto_devido)}</div></div>
    </div>
    <p style="font-size: 7pt; color: #555; margin-top: 8px; background: #fffde6; padding: 3px 6px; border-left: 3px solid #e6a800;">
      Rendimentos Recebidos Acumuladamente (RRA): a base é dividida pelo nº de meses, aplicando-se a tabela progressiva proporcional. Fundamento: Art. 12-A, Lei 7.713/88.
    </p>
    ${pageFooter(meta)}
    `;
  }

  // ──────────── ASSINATURA ────────────
  const hoje = new Date().toLocaleDateString("pt-BR");
  const assinaturaPage = `
  <div class="page-break"></div>
  ${pageHeader(meta, 'DECLARAÇÃO DE CONFORMIDADE')}
  <div style="font-size: 7.5pt; line-height: 1.6; text-align: justify; margin: 16px 0;">
    O presente relatório foi elaborado com base nos critérios e parâmetros de cálculo estabelecidos pela decisão judicial, 
    utilizando como referência a metodologia do sistema PJe-Calc (CSJT). Todos os valores foram apurados considerando as 
    tabelas oficiais de índices de correção monetária, contribuição previdenciária e imposto de renda vigentes nos respectivos 
    períodos. A fórmula padrão aplicada é: <strong>Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra</strong>.
    Os índices de correção, tabelas de INSS e IRRF são obtidos de fontes oficiais (IBGE, BCB, Receita Federal do Brasil).
  </div>

  <div class="resumo-valores">
    <div class="resumo-box">
      <div class="label">Líquido Devido ao Reclamante</div>
      <div class="value">R$ ${fmt(result.resumo.liquido_reclamante)}</div>
    </div>
    <div class="resumo-box danger">
      <div class="label">Total Devido pelo Reclamado</div>
      <div class="value">R$ ${fmt(result.resumo.total_reclamada)}</div>
    </div>
  </div>

  <div class="assinatura-block">
    <div>
      <div class="assinatura-line">
        ${meta.perito || 'Calculista Responsável'}<br/>
        <span style="font-size: 6pt; color: #888;">Perito / Assistente Técnico</span>
      </div>
    </div>
    <div>
      <div class="assinatura-line">
        Local e Data<br/>
        <span style="font-size: 6pt; color: #888;">__________, ${hoje}</span>
      </div>
    </div>
  </div>
  ${pageFooter(meta)}
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Liquidação — Processo ${nProcesso}</title>
<style>${CSS}</style>
</head>
<body>
  <div class="btn-bar no-print">
    <button onclick="window.print()">📄 Imprimir / Salvar PDF</button>
  </div>
  ${page1}
  ${page2}
  ${cartaoPages}
  ${memoriaPage}
  ${csPage}
  ${irPage}
  ${assinaturaPage}
</body>
</html>`;
}

/* ═══════ Critérios default ═══════ */
function buildDefaultCriterios(meta: RelatorioCompletoMeta, result: PjeLiquidacaoResult): string {
  const items: string[] = [];
  items.push('Prazo do aviso prévio apurado segundo a Lei nº 12.506/2011.');
  items.push('Avos de férias e/ou 13º salário apurados considerando a projeção do prazo do aviso prévio.');
  
  const indice = meta.indiceCorrecao || 'IPCA-E';
  items.push(`Valores corrigidos pelo índice '${indice}', acumulados a partir do mês subsequente ao vencimento, conforme súmula nº 381 do TST.`);
  
  items.push('Alíquota de contribuição social empresa fixada em 20% durante todo o período.');
  items.push('Contribuições sociais sobre salários devidos calculadas conforme os itens IV e V da Súmula nº 368 do TST.');
  items.push('Imposto de renda apurado através da \'tabela progressiva acumulada\' vigente no mês da liquidação (Art. 12-A da Lei nº 7.713/1988).');
  
  if (meta.jurosTipo === 'selic') {
    items.push('Juros apurados pela taxa SELIC conforme decisão do STF na ADC 58.');
  } else {
    items.push(`Juros de mora de ${meta.jurosPercentual || 1}% a.m. desde ${meta.jurosInicio === 'citacao' ? 'a citação' : 'o ajuizamento'}.`);
  }
  
  items.push('Juros de mora sobre verbas apurados após a dedução da contribuição social devida pelo reclamante.');
  
  return items.map(i => `<li style="margin-bottom: 3px;">${i}</li>`).join('');
}

/* ═══════ Exports ═══════ */

export function gerarRelatorioCompleto(
  result: PjeLiquidacaoResult,
  meta: RelatorioCompletoMeta
) {
  const html = buildRelatorioCompletoHTML(result, meta);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }
}

export function downloadRelatorioCompleto(
  result: PjeLiquidacaoResult,
  meta: RelatorioCompletoMeta
) {
  const html = buildRelatorioCompletoHTML(result, meta);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nomeArquivo = meta.processo
    ? `relatorio-liquidacao-${meta.processo.replace(/[^a-zA-Z0-9.-]/g, "_")}.html`
    : `relatorio-liquidacao-${Date.now()}.html`;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

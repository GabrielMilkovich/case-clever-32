// =====================================================
// EDGE FUNCTION: EXTRACT-AND-FILL
// OCR via Mistral API + Extração Estruturada via OpenAI (Lovable AI)
// Auto-Preenchimento PJe-Calc
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// =====================================================
// TOOL DEFINITIONS — Structured extraction schemas
// =====================================================

const EXTRACTION_TOOLS = [
  {
    type: "function",
    function: {
      name: "extrair_dados_documento",
      description: "Extrai TODOS os dados estruturados de um documento trabalhista brasileiro (holerite, CTPS, TRCT, cartão de ponto, ficha financeira, contrato, sentença, petição). Preenche todos os campos encontrados.",
      parameters: {
        type: "object",
        properties: {
          tipo_documento: {
            type: "string",
            enum: ["holerite", "ctps", "trct", "cartao_ponto", "ficha_financeira", "contrato", "sentenca", "peticao", "extrato_fgts", "outro"],
            description: "Tipo do documento identificado"
          },
          confianca_geral: {
            type: "number",
            description: "Confiança geral da extração (0 a 1)"
          },
          // DADOS DO PROCESSO
          dados_processo: {
            type: "object",
            properties: {
              numero_processo: { type: "string", description: "Número CNJ do processo (NNNNNNN-NN.NNNN.N.NN.NNNN)" },
              vara: { type: "string" },
              tribunal: { type: "string" },
              juiz: { type: "string" },
              data_ajuizamento: { type: "string", description: "YYYY-MM-DD" },
              data_sentenca: { type: "string", description: "YYYY-MM-DD" },
            }
          },
          // DADOS DAS PARTES
          reclamante: {
            type: "object",
            properties: {
              nome: { type: "string" },
              cpf: { type: "string" },
              pis_pasep: { type: "string" },
              ctps_numero: { type: "string" },
              ctps_serie: { type: "string" },
            }
          },
          reclamada: {
            type: "object",
            properties: {
              nome: { type: "string" },
              cnpj: { type: "string" },
              razao_social: { type: "string" },
            }
          },
          // DADOS DO CONTRATO
          contrato: {
            type: "object",
            properties: {
              data_admissao: { type: "string", description: "YYYY-MM-DD" },
              data_demissao: { type: "string", description: "YYYY-MM-DD" },
              cargo_funcao: { type: "string" },
              salario_base: { type: "number", description: "Último salário base em reais" },
              tipo_demissao: { type: "string", enum: ["sem_justa_causa", "com_justa_causa", "pedido_demissao", "acordo", "outro"] },
              jornada: { type: "string", description: "Ex: 08:00 às 17:48, seg a sex" },
              carga_horaria_mensal: { type: "number", description: "Ex: 220" },
            }
          },
          // RUBRICAS / VERBAS (holerites, fichas financeiras)
          rubricas: {
            type: "array",
            description: "Todas as rubricas de pagamento encontradas",
            items: {
              type: "object",
              properties: {
                codigo: { type: "string", description: "Código da rubrica" },
                denominacao: { type: "string", description: "Nome/descrição da rubrica" },
                tipo: { type: "string", enum: ["vencimento", "desconto", "base", "informativo"] },
                categoria: {
                  type: "string",
                  enum: ["salario_base", "comissao", "hora_extra", "adicional_noturno", "dsr", "premio", "gratificacao", "periculosidade", "insalubridade", "ferias", "decimo_terceiro", "fgts", "inss", "irrf", "vale_transporte", "vale_refeicao", "outros"],
                },
                valores_mensais: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      competencia: { type: "string", description: "YYYY-MM" },
                      valor: { type: "number" },
                      referencia: { type: "string", description: "Ex: 30d, 220h, 50%" },
                    },
                    required: ["competencia", "valor"]
                  }
                }
              },
              required: ["denominacao", "tipo", "valores_mensais"]
            }
          },
          // TRCT
          trct: {
            type: "object",
            properties: {
              data_aviso_previo: { type: "string", description: "YYYY-MM-DD" },
              aviso_previo_tipo: { type: "string", enum: ["trabalhado", "indenizado", "nao_aplicavel"] },
              aviso_previo_dias: { type: "number" },
              saldo_salario_dias: { type: "number" },
              saldo_salario_valor: { type: "number" },
              decimo_terceiro_proporcional: { type: "number" },
              ferias_vencidas: { type: "number" },
              ferias_proporcionais: { type: "number" },
              terco_ferias: { type: "number" },
              fgts_mes_anterior: { type: "number" },
              fgts_mes_rescisao: { type: "number" },
              fgts_multa_40: { type: "number" },
              total_bruto: { type: "number" },
              total_descontos: { type: "number" },
              total_liquido: { type: "number" },
              verbas_rescisorias: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    codigo: { type: "string" },
                    descricao: { type: "string" },
                    valor: { type: "number" },
                    tipo: { type: "string", enum: ["vencimento", "desconto"] }
                  },
                  required: ["descricao", "valor", "tipo"]
                }
              }
            }
          },
          // CARTÃO DE PONTO
          cartao_ponto: {
            type: "object",
            properties: {
              periodo: { type: "string", description: "Ex: 01/2023 a 12/2023" },
              registros: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    data: { type: "string", description: "YYYY-MM-DD" },
                    entrada1: { type: "string", description: "HH:MM" },
                    saida1: { type: "string", description: "HH:MM" },
                    entrada2: { type: "string", description: "HH:MM" },
                    saida2: { type: "string", description: "HH:MM" },
                    entrada3: { type: "string", description: "HH:MM (se houver)" },
                    saida3: { type: "string", description: "HH:MM (se houver)" },
                    horas_normais: { type: "string" },
                    horas_extras: { type: "string" },
                    horas_noturnas: { type: "string" },
                    observacao: { type: "string", description: "Ex: FALTA, ATESTADO, FÉRIAS, FOLGA" },
                  },
                  required: ["data"]
                }
              }
            }
          },
          // FÉRIAS
          ferias: {
            type: "array",
            items: {
              type: "object",
              properties: {
                periodo_aquisitivo_inicio: { type: "string", description: "YYYY-MM-DD" },
                periodo_aquisitivo_fim: { type: "string", description: "YYYY-MM-DD" },
                gozo_inicio: { type: "string", description: "YYYY-MM-DD" },
                gozo_fim: { type: "string", description: "YYYY-MM-DD" },
                dias: { type: "number" },
                abono_pecuniario: { type: "boolean" },
                dias_abono: { type: "number" },
                situacao: { type: "string", enum: ["GOZADAS", "VENCIDAS", "PROPORCIONAIS", "INDENIZADAS"] },
              },
              required: ["periodo_aquisitivo_inicio", "periodo_aquisitivo_fim"]
            }
          },
          // FGTS
          fgts: {
            type: "object",
            properties: {
              saldo_total: { type: "number" },
              depositos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    competencia: { type: "string", description: "YYYY-MM" },
                    valor_deposito: { type: "number" },
                    saldo_apos: { type: "number" },
                  },
                  required: ["competencia", "valor_deposito"]
                }
              }
            }
          },
          // SENTENÇA — pedidos deferidos/indeferidos
          sentenca: {
            type: "object",
            properties: {
              pedidos_deferidos: {
                type: "array",
                items: { type: "string" }
              },
              pedidos_indeferidos: {
                type: "array",
                items: { type: "string" }
              },
              parametros_liquidacao: {
                type: "object",
                properties: {
                  indice_correcao: { type: "string" },
                  juros: { type: "string" },
                  data_inicio_juros: { type: "string", description: "YYYY-MM-DD" },
                  honorarios_percentual: { type: "number" },
                  custas_processuais: { type: "number" },
                }
              }
            }
          },
          // TEXTO OCR COMPLETO (para referência e chunks)
          texto_ocr_completo: {
            type: "string",
            description: "Texto completo extraído do documento preservando formatação"
          },
          paginas_detectadas: { type: "number" },
        },
        required: ["tipo_documento", "confianca_geral", "texto_ocr_completo"]
      }
    }
  }
];

const SYSTEM_PROMPT = `Você é o mais preciso sistema de OCR e extração de dados para documentos trabalhistas brasileiros.

SUA MISSÃO: Extrair ABSOLUTAMENTE TODOS os dados do documento com 100% de precisão.

REGRAS DE OURO:
1. VALORES MONETÁRIOS: Use formato numérico decimal (1234.56, NÃO 1.234,56). Nunca arredonde.
2. DATAS: Sempre no formato YYYY-MM-DD (ex: 2023-01-15)
3. COMPETÊNCIAS: Sempre YYYY-MM (ex: 2023-01)
4. CPF: Mantenha formatação XXX.XXX.XXX-XX
5. CNPJ: Mantenha formatação XX.XXX.XXX/XXXX-XX
6. COMPLETUDE: Extraia TUDO. Se o documento tem 50 rubricas, retorne as 50. Se tem 365 dias de ponto, retorne os 365.
7. TABELAS: Leia TODAS as colunas e linhas sem exceção
8. TEXTO ILEGÍVEL: Marque como null, nunca invente valores
9. MÚLTIPLAS PÁGINAS: Combine dados de todas as páginas em uma estrutura única
10. CLASSIFICAÇÃO DE RUBRICAS: Identifique corretamente vencimentos vs descontos

IDENTIFICAÇÃO DE TIPO DE DOCUMENTO:
- Holerite/Contracheque: tem rubricas com códigos, vencimentos e descontos, competência mensal
- CTPS: páginas com dados do contrato, anotações gerais
- TRCT: Termo de Rescisão, com verbas rescisórias detalhadas
- Cartão de Ponto: registros diários de entrada/saída
- Ficha Financeira: tabela anual com rubricas por mês
- Extrato FGTS: movimentações de depósitos/saques
- Sentença/Acórdão: decisão judicial com pedidos deferidos
- Petição: petição inicial ou contestação

PARA HOLERITES E FICHAS FINANCEIRAS:
- Extraia TODAS as rubricas de PAGAMENTO (vencimentos)
- Extraia TODAS as rubricas de DESCONTO separadamente  
- Identifique salário base, comissões, hora extra, adicional noturno, DSR
- Para cada rubrica, extraia código, denominação, referência e valor

PARA TRCT:
- Extraia TODAS as verbas rescisórias com código e valor
- Identifique: saldo de salário, aviso prévio, 13º proporcional, férias + 1/3, FGTS
- Capture total bruto, total descontos e líquido

PARA CARTÃO DE PONTO:
- Extraia TODOS os registros diários (entrada/saída de cada período)
- Identifique dias com falta, atestado, férias, folga
- Calcule horas quando possível

O campo texto_ocr_completo DEVE conter o texto integral do documento.`;

// =====================================================
// STAGE 1: Mistral OCR — extract raw text from document
// Supports PDFs via /v1/ocr API and images via chat API
// =====================================================

// OCR for PDFs using dedicated Mistral OCR API (/v1/ocr)
async function mistralOcrPdf(
  documentUrl: string,
  mistralApiKey: string
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[OCR] Mistral OCR API attempt ${attempt} (PDF via URL)`);
    try {
      const response = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mistralApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-ocr-latest",
          document: {
            type: "document_url",
            document_url: documentUrl,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[OCR] Mistral OCR API ${response.status}:`, errText.substring(0, 300));
        if (response.status === 429) {
          await delay(RETRY_DELAY_MS * attempt * 3);
          continue;
        }
        lastError = new Error(`Mistral OCR API ${response.status}`);
        if (response.status >= 500) { await delay(RETRY_DELAY_MS * attempt); continue; }
        break;
      }

      const data = await response.json();
      // OCR API returns { pages: [{ markdown: "..." }, ...] }
      const pages = data.pages || [];
      const fullText = pages.map((p: any) => p.markdown || p.text || "").join("\n\n---PAGE BREAK---\n\n");
      if (fullText.length > 50) {
        console.log(`[OCR] Mistral OCR API success: ${fullText.length} chars, ${pages.length} pages`);
        return fullText;
      }
      lastError = new Error("OCR returned too little text");
      continue;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error(`Mistral OCR failed: ${lastError?.message}`);
}

// OCR for images using Mistral chat API
async function mistralOcrImage(
  base64Data: string,
  mimeType: string,
  mistralApiKey: string
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[OCR] Mistral chat attempt ${attempt} (image)`);
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mistralApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extraia TODO o texto deste documento trabalhista brasileiro. Preserve a formatação de tabelas, valores monetários e datas exatamente como aparecem. Inclua TODAS as linhas, colunas e dados sem omitir nada. Retorne apenas o texto extraído, sem comentários."
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64Data}` },
                },
              ],
            },
          ],
          max_tokens: 16000,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[OCR] Mistral ${response.status}:`, errText.substring(0, 200));
        if (response.status === 429) {
          await delay(RETRY_DELAY_MS * attempt * 3);
          continue;
        }
        lastError = new Error(`Mistral OCR ${response.status}`);
        if (response.status >= 500) { await delay(RETRY_DELAY_MS * attempt); continue; }
        break;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text.length > 50) {
        console.log(`[OCR] Mistral success: ${text.length} chars`);
        return text;
      }
      lastError = new Error("OCR returned too little text");
      continue;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error(`Mistral OCR failed: ${lastError?.message}`);
}

// =====================================================
// STAGE 2: OpenAI (Lovable AI) — structured extraction from OCR text
// =====================================================
async function extractStructured(
  ocrText: string,
  lovableApiKey: string
): Promise<any> {
  let lastError: Error | null = null;
  // Cascade: try Google Gemini first (cheaper/faster), then OpenAI as fallback
  const models = [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "google/gemini-3-flash-preview",
    "openai/gpt-5-mini",
    "openai/gpt-5",
  ];

  // Truncate OCR text if too large (>200k chars) to avoid token limits
  const maxChars = 200000;
  const truncatedOcr = ocrText.length > maxChars
    ? ocrText.substring(0, maxChars) + "\n\n[... TEXTO TRUNCADO ...]"
    : ocrText;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[EXTRACT] ${model} attempt ${attempt}`);
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: `Analise o texto abaixo extraído por OCR de um documento trabalhista e extraia ABSOLUTAMENTE TODOS os dados usando a função extrair_dados_documento. Não omita nenhuma informação.\n\n--- TEXTO DO DOCUMENTO ---\n${truncatedOcr}\n--- FIM DO TEXTO ---`
              },
            ],
            tools: EXTRACTION_TOOLS,
            tool_choice: { type: "function", function: { name: "extrair_dados_documento" } },
            max_tokens: 128000,
            temperature: 0.05,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[EXTRACT] ${model} ${response.status}:`, errText.substring(0, 200));
          // 402 = no credits — skip directly to next model, no retries
          if (response.status === 402) {
            console.warn(`[EXTRACT] ${model} returned 402 (no credits), skipping to next model`);
            lastError = new Error(`Créditos insuficientes (${model})`);
            break;
          }
          if (response.status === 429) { await delay(RETRY_DELAY_MS * attempt * 3); continue; }
          if (response.status >= 500) { await delay(RETRY_DELAY_MS * attempt); continue; }
          lastError = new Error(`API ${response.status}`);
          break;
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          try {
            const extracted = JSON.parse(toolCall.function.arguments);
            if (!extracted.texto_ocr_completo) extracted.texto_ocr_completo = ocrText;
            console.log(`[EXTRACT] SUCCESS with ${model}: tipo=${extracted.tipo_documento}, rubricas=${extracted.rubricas?.length || 0}`);
            return extracted;
          } catch (parseErr) {
            console.error(`[EXTRACT] JSON parse error from ${model}:`, parseErr);
            lastError = new Error("Erro ao interpretar resposta do modelo");
            continue;
          }
        }

        // Fallback: try to extract JSON from content
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.texto_ocr_completo) parsed.texto_ocr_completo = ocrText;
            console.log(`[EXTRACT] SUCCESS (content fallback) with ${model}`);
            return parsed;
          } catch {
            // ignore parse error, try next attempt
          }
        }

        lastError = new Error("Modelo não retornou dados estruturados");
        continue;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[EXTRACT] ${model} exception:`, lastError.message);
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
    console.warn(`[EXTRACT] Model ${model} exhausted, trying next...`);
  }
  throw new Error(`Extração falhou em todos os modelos. Último erro: ${lastError?.message}`);
}

// =====================================================
// AUTO-FILL: Grava dados extraídos nas tabelas pjecalc
// =====================================================

async function autoFill(supabase: any, caseId: string, extracted: any) {
  const fills: string[] = [];

  // Helper: await and log errors without crashing
  async function safeOp(label: string, fn: () => Promise<any>) {
    try {
      const result = await fn();
      if (result?.error) {
        console.error(`[FILL] ${label}:`, result.error.message);
      } else {
        fills.push(label);
      }
    } catch (err) {
      console.error(`[FILL] ${label}:`, err);
    }
  }

  // Map tipo_demissao from AI output to valid enum values
  function mapTipoDemissao(val: string | undefined): string | null {
    if (!val) return null;
    const map: Record<string, string> = {
      'com_justa_causa': 'justa_causa',
      'justa_causa': 'justa_causa',
      'sem_justa_causa': 'sem_justa_causa',
      'pedido_demissao': 'pedido_demissao',
      'rescisao_indireta': 'rescisao_indireta',
      'acordo': 'acordo',
    };
    return map[val] || null;
  }

  try {
    // =====================================================
    // 0. ENSURE pjecalc_calculos exists — get calculo_id
    // =====================================================
    let { data: calcRow } = await supabase
      .from("pjecalc_calculos")
      .select("id")
      .eq("case_id", caseId)
      .maybeSingle();

    if (!calcRow) {
      // Pre-created in processDocumentInBackground, but just in case
      const { data: caseRow } = await supabase.from("cases").select("criado_por").eq("id", caseId).maybeSingle();
      const userId = caseRow?.criado_por;
      if (userId) {
        const { data: newCalc } = await supabase
          .from("pjecalc_calculos")
          .insert({ case_id: caseId, user_id: userId })
          .select("id")
          .single();
        calcRow = newCalc;
      }
    }

    const calculoId = calcRow?.id;
    if (!calculoId) {
      console.error("[FILL] Cannot get/create pjecalc_calculos — aborting fill");
      return fills;
    }

    // =====================================================
    // 1. DADOS DO PROCESSO → update pjecalc_calculos directly
    // =====================================================
    if (extracted.dados_processo || extracted.reclamante || extracted.reclamada) {
      const dp = extracted.dados_processo || {};
      const rec = extracted.reclamante || {};
      const rda = extracted.reclamada || {};

      await safeOp("dados_processo", () =>
        supabase.from("pjecalc_calculos").update({
          processo_cnj: dp.numero_processo || undefined,
          vara: dp.vara || undefined,
          tribunal: dp.tribunal || undefined,
          reclamante_nome: rec.nome || undefined,
          reclamante_cpf: rec.cpf || undefined,
          reclamado_nome: rda.nome || rda.razao_social || undefined,
          reclamado_cnpj: rda.cnpj || undefined,
        }).eq("id", calculoId)
      );

      // Also update the cases table for display
      if (rec.nome || dp.numero_processo) {
        await supabase.from("cases").update({
          cliente: rec.nome || undefined,
          numero_processo: dp.numero_processo || undefined,
          tribunal: dp.tribunal || dp.vara || undefined,
        }).eq("id", caseId);
      }
    }

    // =====================================================
    // 2. PARÂMETROS DO CONTRATO → update pjecalc_calculos directly
    // =====================================================
    if (extracted.contrato) {
      const c = extracted.contrato;
      const dp = extracted.dados_processo || {};

      await safeOp("parametros", () =>
        supabase.from("pjecalc_calculos").update({
          data_admissao: c.data_admissao || undefined,
          data_demissao: c.data_demissao || undefined,
          data_ajuizamento: dp.data_ajuizamento || undefined,
          divisor_horas: c.carga_horaria_mensal || 220,
          tipo_demissao: mapTipoDemissao(c.tipo_demissao),
        }).eq("id", calculoId)
      );

      // Also create employment_contracts record
      if (c.data_admissao) {
        await safeOp("contrato_emprego", () =>
          supabase.from("employment_contracts").upsert({
            case_id: caseId,
            data_admissao: c.data_admissao,
            data_demissao: c.data_demissao || null,
            funcao: c.cargo_funcao || null,
            salario_inicial: c.salario_base || null,
            tipo_demissao: mapTipoDemissao(c.tipo_demissao),
            jornada_contratual: c.jornada ? { descricao: c.jornada, carga_mensal: c.carga_horaria_mensal || 220 } : null,
          }, { onConflict: 'case_id' })
        );
      }
    }

    // =====================================================
    // 3. HISTÓRICO SALARIAL → pjecalc_hist_salarial (real table)
    // =====================================================
    if (extracted.rubricas?.length > 0) {
      const vencimentos = extracted.rubricas.filter((r: any) => r.tipo === "vencimento");

      for (const rub of vencimentos) {
        if (!rub.valores_mensais?.length && !rub.denominacao) continue;

        const tipoVar = ["salario_base"].includes(rub.categoria) ? "FIXO" : "VARIAVEL";
        const firstVal = rub.valores_mensais?.[0]?.valor || 0;

        // Upsert into real table (has unique constraint on calculo_id, nome)
        const { data: histData, error: histErr } = await supabase
          .from("pjecalc_hist_salarial")
          .upsert({
            calculo_id: calculoId,
            nome: rub.denominacao,
            tipo_variacao: tipoVar,
            valor_fixo: firstVal,
            incide_fgts: !["vale_transporte", "vale_refeicao"].includes(rub.categoria),
            incide_inss: true,
            observacoes: rub.codigo ? `Código: ${rub.codigo}` : null,
          }, { onConflict: 'calculo_id,nome' })
          .select('id')
          .single();

        if (histErr) {
          console.error("[FILL] historico_salarial:", histErr.message);
          continue;
        }

        const histId = histData?.id;

        // Insert monthly values into real table (has unique on hist_salarial_id, competencia)
        if (histId && rub.valores_mensais?.length > 0) {
          for (const vm of rub.valores_mensais) {
            if (!vm.competencia || vm.valor === undefined || vm.valor === null) continue;

            await supabase.from("pjecalc_hist_salarial_mes").upsert({
              calculo_id: calculoId,
              hist_salarial_id: histId,
              competencia: vm.competencia.length === 7 ? vm.competencia + "-01" : vm.competencia,
              valor: vm.valor,
              origem: "informado",
            }, { onConflict: 'hist_salarial_id,competencia' }).then(({ error }: any) => {
              if (error) console.error(`[FILL] hist_mes ${vm.competencia}:`, error.message);
            });
          }
        }
      }

      const totalMensais = vencimentos.reduce((sum: number, r: any) => sum + (r.valores_mensais?.length || 0), 0);
      fills.push(`historico_salarial (${vencimentos.length} rubricas, ${totalMensais} valores mensais)`);
    }

    // =====================================================
    // 4. VERBAS DO CÁLCULO → pjecalc_verba_base (real table)
    // =====================================================
    if (extracted.rubricas?.length > 0) {
      const vencimentos = extracted.rubricas.filter((r: any) => r.tipo === "vencimento");

      for (const rub of vencimentos) {
        if (!rub.valores_mensais?.length) continue;

        const competencias = rub.valores_mensais.map((v: any) => v.competencia).sort();
        const periodoInicio = competencias[0] ? competencias[0] + "-01" : null;
        const periodoFim = competencias[competencias.length - 1]
          ? competencias[competencias.length - 1] + "-28"
          : null;

        await supabase.from("pjecalc_verba_base").upsert({
          calculo_id: calculoId,
          nome: rub.denominacao,
          codigo: rub.codigo || null,
          caracteristica: rub.categoria === "salario_base" ? "FIXA" : "COMUM",
          periodicidade: "MENSAL",
          multiplicador: 1,
          divisor: 1,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          ordem: 0,
          ativa: true,
          hist_salarial_nome: rub.denominacao,
          valor: "calculado",
        }, { onConflict: 'calculo_id,nome' }).then(({ error }: any) => {
          if (error) console.error("[FILL] verbas:", error.message);
        });
      }
      fills.push(`verbas (${vencimentos.length})`);
    }

    // =====================================================
    // 5. FÉRIAS — use view insert (trigger handles it)
    // =====================================================
    if (extracted.ferias?.length > 0) {
      for (const f of extracted.ferias) {
        await safeOp(`ferias_${f.periodo_aquisitivo_inicio}`, () =>
          supabase.from("pjecalc_ferias").insert({
            case_id: caseId,
            periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio,
            periodo_aquisitivo_fim: f.periodo_aquisitivo_fim,
            gozo_inicio: f.gozo_inicio || null,
            gozo_fim: f.gozo_fim || null,
            dias: f.dias || 30,
            abono: f.abono_pecuniario || false,
            dias_abono: f.dias_abono || 0,
            situacao: f.situacao || "GOZADAS",
          })
        );
      }
      fills.push(`ferias (${extracted.ferias.length})`);
    }

    // =====================================================
    // 6. CARTÃO DE PONTO (registros diários)
    // =====================================================
    if (extracted.cartao_ponto?.registros?.length > 0) {
      const registros = extracted.cartao_ponto.registros;
      // pjecalc_cartao_ponto is a VIEW without INSTEAD OF INSERT trigger.
      // Insert directly into the real table: pjecalc_apuracao_diaria
      for (let i = 0; i < registros.length; i += 50) {
        const batch = registros.slice(i, i + 50).map((r: any) => {
          // Parse hours to minutes for the real table schema
          const horasNormais = parseFloat(r.horas_normais) || 0;
          const horasExtras = parseFloat(r.horas_extras) || 0;
          const horasNoturnas = parseFloat(r.horas_noturnas) || 0;
          const isFalta = !r.entrada1 && /falta|ausencia|ausência/i.test(r.observacao || "");
          return {
            calculo_id: calculoId,
            data: r.data,
            frequencia_str: [r.entrada1, r.saida1, r.entrada2, r.saida2, r.entrada3, r.saida3].filter(Boolean).join(" | ") || null,
            horas_trabalhadas: horasNormais,
            horas_extras_diaria: horasExtras,
            horas_noturnas: horasNoturnas,
            minutos_trabalhados: Math.round(horasNormais * 60),
            minutos_extra_diaria: Math.round(horasExtras * 60),
            minutos_noturno: Math.round(horasNoturnas * 60),
            is_falta: isFalta,
            is_dsr: /dsr|domingo|repouso/i.test(r.observacao || ""),
            is_feriado: /feriado/i.test(r.observacao || ""),
            origem: "OCR",
          };
        });

        await supabase.from("pjecalc_apuracao_diaria").insert(batch).then(({ error }: any) => {
          if (error) console.error("[FILL] cartao_ponto batch:", error.message);
        });
      }
      fills.push(`cartao_ponto (${registros.length} dias)`);
    }

    // =====================================================
    // 7. TRCT — Verbas rescisórias
    // =====================================================
    if (extracted.trct) {
      const trct = extracted.trct;

      // Update contract with TRCT info
      if (trct.data_aviso_previo) {
        await supabase.from("pjecalc_calculos").update({
          data_demissao: trct.data_aviso_previo,
        }).eq("id", calculoId);
      }

      // Insert TRCT verbas as "pago" entries
      if (trct.verbas_rescisorias?.length > 0) {
        for (const verba of trct.verbas_rescisorias) {
          await supabase.from("pjecalc_ocorrencias").insert({
            case_id: caseId,
            verba_nome: verba.descricao,
            competencia: extracted.contrato?.data_demissao || new Date().toISOString().slice(0, 10),
            base_valor: verba.valor || 0,
            multiplicador_valor: 1,
            divisor_valor: 1,
            quantidade_valor: 1,
            dobra: 1,
            devido: verba.tipo === "vencimento" ? verba.valor : 0,
            pago: verba.tipo === "vencimento" ? verba.valor : 0,
            diferenca: 0,
            correcao: 0,
            juros: 0,
            total: 0,
            origem: "TRCT",
            ativa: true,
          }).then(({ error }: any) => {
            if (error) console.error(`[FILL] trct_verba ${verba.descricao}:`, error.message);
          });
        }
        fills.push(`trct_verbas (${trct.verbas_rescisorias.length})`);
      }

      // Store TRCT totals as facts
      const trctFacts: Array<{chave: string; valor: string}> = [];
      if (trct.total_bruto) trctFacts.push({ chave: "trct_total_bruto", valor: String(trct.total_bruto) });
      if (trct.total_liquido) trctFacts.push({ chave: "trct_total_liquido", valor: String(trct.total_liquido) });
      if (trct.total_descontos) trctFacts.push({ chave: "trct_total_descontos", valor: String(trct.total_descontos) });
      if (trct.fgts_multa_40) trctFacts.push({ chave: "trct_fgts_multa_40", valor: String(trct.fgts_multa_40) });
      if (trct.aviso_previo_tipo) trctFacts.push({ chave: "aviso_previo_tipo", valor: trct.aviso_previo_tipo });
      if (trct.aviso_previo_dias) trctFacts.push({ chave: "aviso_previo_dias", valor: String(trct.aviso_previo_dias) });
      if (trct.saldo_salario_valor) trctFacts.push({ chave: "saldo_salario", valor: String(trct.saldo_salario_valor) });
      if (trct.decimo_terceiro_proporcional) trctFacts.push({ chave: "13_proporcional_trct", valor: String(trct.decimo_terceiro_proporcional) });
      if (trct.ferias_proporcionais) trctFacts.push({ chave: "ferias_proporcionais_trct", valor: String(trct.ferias_proporcionais) });

      for (const fact of trctFacts) {
        await supabase.from("facts").upsert({
          case_id: caseId,
          chave: fact.chave,
          valor: fact.valor,
          tipo: "monetario",
          origem: "ia_extracao",
          confianca: extracted.confianca_geral || 0.9,
        }, { onConflict: 'case_id,chave' }).then(({ error }: any) => {
          if (error) console.error(`[FILL] fact ${fact.chave}:`, error.message);
        });
      }
      if (trctFacts.length > 0) fills.push(`trct_fatos (${trctFacts.length})`);
    }

    // =====================================================
    // 8. FGTS
    // =====================================================
    if (extracted.fgts) {
      // pjecalc_fgts_config is a VIEW without INSTEAD OF INSERT trigger.
      // FGTS config is derived from pjecalc_calculos, so just update that table.
      await safeOp("fgts_config", () =>
        supabase.from("pjecalc_calculos").update({
          multa_477_habilitada: true,
        }).eq("id", calculoId)
      );

      // Store FGTS deposits as facts
      if (extracted.fgts.depositos?.length > 0) {
        for (const dep of extracted.fgts.depositos) {
          await supabase.from("facts").upsert({
            case_id: caseId,
            chave: `fgts_deposito_${dep.competencia}`,
            valor: String(dep.valor_deposito),
            tipo: "monetario",
            origem: "ia_extracao",
            confianca: extracted.confianca_geral || 0.9,
          }, { onConflict: 'case_id,chave' });
        }
        fills.push(`fgts_depositos (${extracted.fgts.depositos.length})`);
      }
      if (extracted.fgts.saldo_total) {
        await supabase.from("facts").upsert({
          case_id: caseId,
          chave: "fgts_saldo_total",
          valor: String(extracted.fgts.saldo_total),
          tipo: "monetario",
          origem: "ia_extracao",
        }, { onConflict: 'case_id,chave' });
      }
    }

    // =====================================================
    // 9. SENTENÇA — pedidos deferidos → verbas + parâmetros
    // =====================================================
    if (extracted.sentenca) {
      const sent = extracted.sentenca;

      // Create verbas from deferidos → real table
      if (sent.pedidos_deferidos?.length > 0) {
        for (let i = 0; i < sent.pedidos_deferidos.length; i++) {
          const pedido = sent.pedidos_deferidos[i];
          await supabase.from("pjecalc_verba_base").upsert({
            calculo_id: calculoId,
            nome: pedido,
            caracteristica: "COMUM",
            periodicidade: "MENSAL",
            multiplicador: 1,
            divisor: 1,
            ordem: i,
            ativa: true,
            valor: "calculado",
            observacoes: "Deferido em sentença",
          }, { onConflict: 'calculo_id,nome' }).then(({ error }: any) => {
            if (error) console.error(`[FILL] verba_sentenca ${pedido.substring(0, 60)}:`, error.message);
          });
        }
        fills.push(`sentenca_pedidos (${sent.pedidos_deferidos.length} deferidos)`);
      }

      // Store indeferidos as facts
      if (sent.pedidos_indeferidos?.length > 0) {
        await supabase.from("facts").upsert({
          case_id: caseId,
          chave: "pedidos_indeferidos",
          valor: sent.pedidos_indeferidos.join("; "),
          tipo: "texto",
          origem: "ia_extracao",
        }, { onConflict: 'case_id,chave' });
      }

      // Parâmetros de liquidação → update pjecalc_calculos directly
      if (sent.parametros_liquidacao) {
        const pl = sent.parametros_liquidacao;

        if (pl.honorarios_percentual) {
          await supabase.from("pjecalc_calculos").update({
            honorarios_percentual: pl.honorarios_percentual,
            honorarios_sobre: 'condenacao',
          }).eq("id", calculoId);
          fills.push("honorarios_sentenca");
        }

        if (pl.custas_processuais) {
          await safeOp("custas_sentenca", () =>
            supabase.from("pjecalc_calculos").update({
              custas_percentual: 2,
              custas_limite: pl.custas_processuais,
            }).eq("id", calculoId)
          );
        }

        // Store correction/juros info as facts
        if (pl.indice_correcao) {
          await supabase.from("facts").upsert({
            case_id: caseId, chave: "indice_correcao", valor: pl.indice_correcao, tipo: "texto", origem: "ia_extracao",
          }, { onConflict: 'case_id,chave' });
        }
        if (pl.juros) {
          await supabase.from("facts").upsert({
            case_id: caseId, chave: "juros_mora", valor: pl.juros, tipo: "texto", origem: "ia_extracao",
          }, { onConflict: 'case_id,chave' });
        }
        if (pl.data_inicio_juros) {
          await supabase.from("facts").upsert({
            case_id: caseId, chave: "data_inicio_juros", valor: pl.data_inicio_juros, tipo: "data", origem: "ia_extracao",
          }, { onConflict: 'case_id,chave' });
        }

        fills.push("sentenca_parametros");
      }
    }

    // =====================================================
    // 10. FALTAS (from cartão de ponto observations)
    // =====================================================
    if (extracted.cartao_ponto?.registros?.length > 0) {
      const faltas = extracted.cartao_ponto.registros.filter(
        (r: any) => r.observacao && /falta|ausencia|ausência/i.test(r.observacao) && !r.entrada1
      );
      for (const falta of faltas) {
        await supabase.from("pjecalc_faltas").insert({
          case_id: caseId,
          data_inicial: falta.data,
          data_final: falta.data,
          tipo_falta: "FALTA",
          justificada: /atestado|justificad/i.test(falta.observacao || ""),
          motivo: falta.observacao,
        }).then(({ error }: any) => {
          if (error) console.error(`[FILL] falta ${falta.data}:`, error.message);
        });
      }
      if (faltas.length > 0) fills.push(`faltas (${faltas.length})`);
    }

    // =====================================================
    // 11. STORE ALL EXTRACTED FACTS
    // =====================================================
    const allFacts: Array<{chave: string; valor: string; tipo: string}> = [];

    const rec = extracted.reclamante || {};
    const rda = extracted.reclamada || {};
    const cont = extracted.contrato || {};
    const dp = extracted.dados_processo || {};

    if (rec.nome) allFacts.push({ chave: "reclamante", valor: rec.nome, tipo: "texto" });
    if (rec.cpf) allFacts.push({ chave: "cpf_reclamante", valor: rec.cpf, tipo: "texto" });
    if (rec.pis_pasep) allFacts.push({ chave: "pis_pasep", valor: rec.pis_pasep, tipo: "texto" });
    if (rec.ctps_numero) allFacts.push({ chave: "ctps_numero", valor: rec.ctps_numero, tipo: "texto" });
    if (rec.ctps_serie) allFacts.push({ chave: "ctps_serie", valor: rec.ctps_serie, tipo: "texto" });
    if (rda.nome || rda.razao_social) allFacts.push({ chave: "reclamada", valor: rda.nome || rda.razao_social, tipo: "texto" });
    if (rda.cnpj) allFacts.push({ chave: "cnpj_reclamada", valor: rda.cnpj, tipo: "texto" });
    if (cont.data_admissao) allFacts.push({ chave: "data_admissao", valor: cont.data_admissao, tipo: "data" });
    if (cont.data_demissao) allFacts.push({ chave: "data_demissao", valor: cont.data_demissao, tipo: "data" });
    if (cont.cargo_funcao) allFacts.push({ chave: "cargo", valor: cont.cargo_funcao, tipo: "texto" });
    if (cont.salario_base) allFacts.push({ chave: "salario_base", valor: String(cont.salario_base), tipo: "monetario" });
    if (cont.jornada) allFacts.push({ chave: "jornada_contratual", valor: cont.jornada, tipo: "texto" });
    if (cont.carga_horaria_mensal) allFacts.push({ chave: "carga_horaria", valor: String(cont.carga_horaria_mensal), tipo: "numerico" });
    if (cont.tipo_demissao) allFacts.push({ chave: "tipo_demissao", valor: cont.tipo_demissao, tipo: "texto" });
    if (dp.numero_processo) allFacts.push({ chave: "numero_processo", valor: dp.numero_processo, tipo: "texto" });
    if (dp.vara) allFacts.push({ chave: "vara", valor: dp.vara, tipo: "texto" });
    if (dp.tribunal) allFacts.push({ chave: "tribunal", valor: dp.tribunal, tipo: "texto" });
    if (dp.data_ajuizamento) allFacts.push({ chave: "data_ajuizamento", valor: dp.data_ajuizamento, tipo: "data" });
    if (dp.data_sentenca) allFacts.push({ chave: "data_sentenca", valor: dp.data_sentenca, tipo: "data" });

    if (allFacts.length > 0) {
      for (const fact of allFacts) {
        await supabase.from("facts").upsert({
          case_id: caseId,
          chave: fact.chave,
          valor: fact.valor,
          tipo: fact.tipo as any,
          origem: "extracao",
          confianca: extracted.confianca_geral || 0.9,
          confirmado: true,
        }, { onConflict: 'case_id,chave' }).then(({ error }: any) => {
          if (error) console.error(`[FILL] fact ${fact.chave}:`, error.message);
        });
      }
      fills.push(`facts (${allFacts.length})`);
    }

    // =====================================================
    // 12. AUTO-CONFIGURE MODULES
    // =====================================================
    await autoConfigureModules(supabase, caseId, extracted, fills);

  } catch (err) {
    console.error("[FILL] Global error:", err);
  }

  return fills;
}

/**
 * Auto-configura todos os módulos do cálculo com defaults sensatos
 */
async function autoConfigureModules(supabase: any, caseId: string, extracted: any, fills: string[]) {
  // Wait for pjecalc_calculos to be created by trigger
  await new Promise(r => setTimeout(r, 500));

  const { data: calculoRow } = await supabase
    .from("pjecalc_calculos")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  if (!calculoRow) return;
  const calcId = calculoRow.id;

  // Configure calculos defaults
  const { error: calcErr } = await supabase.from("pjecalc_calculos").update({
    honorarios_percentual: extracted.sentenca?.parametros_liquidacao?.honorarios_percentual || 15,
    honorarios_sobre: 'condenacao',
    custas_percentual: 2,
    custas_limite: 10.64,
    multa_477_habilitada: true,
    multa_467_habilitada: false,
    data_liquidacao: new Date().toISOString().slice(0, 10),
  }).eq("id", calcId);
  if (calcErr) console.error("[FILL] calculos config:", calcErr.message);
  else fills.push("modulos_config");

  // Correcao monetaria config
  const { data: existCorrecao } = await supabase
    .from("pjecalc_atualizacao_config")
    .select("id, regime_padrao")
    .eq("calculo_id", calcId)
    .eq("tipo", "correcao")
    .maybeSingle();

  if (!existCorrecao) {
    await supabase.from("pjecalc_atualizacao_config").insert({
      calculo_id: calcId,
      tipo: "correcao",
      regime_padrao: "IPCA-E",
    });
  }

  // Juros config
  const { data: existJuros } = await supabase
    .from("pjecalc_atualizacao_config")
    .select("id")
    .eq("calculo_id", calcId)
    .eq("tipo", "juros")
    .maybeSingle();

  if (!existJuros) {
    await supabase.from("pjecalc_atualizacao_config").insert({
      calculo_id: calcId,
      tipo: "juros",
      regime_padrao: "simples_mensal",
    });
  }
}

// =====================================================
// BACKGROUND PROCESSING FUNCTION
// =====================================================

async function processDocumentInBackground(
  document_id: string,
  fileUrl: string,
  doc: any,
  MISTRAL_API_KEY: string,
  LOVABLE_API_KEY: string,
  supabase: any
) {
  try {
    // Detect MIME type
    let mimeType = doc.mime_type || "application/pdf";
    if (!mimeType || mimeType === "application/octet-stream") {
      const fn = (doc.file_name || "").toLowerCase();
      if (fn.endsWith(".pdf")) mimeType = "application/pdf";
      else if (fn.endsWith(".png")) mimeType = "image/png";
      else if (fn.endsWith(".jpg") || fn.endsWith(".jpeg")) mimeType = "image/jpeg";
      else mimeType = "application/pdf";
    }

    const isPdf = mimeType === "application/pdf";
    let ocrText: string;

    if (isPdf) {
      // PDFs: use Mistral OCR API (/v1/ocr) with the signed URL directly — no download needed
      console.log(`[EXTRACT] Using Mistral OCR API for PDF: ${doc.file_name}`);
      ocrText = await mistralOcrPdf(fileUrl, MISTRAL_API_KEY);
    } else {
      // Images: download and use chat API with base64
      console.log(`[EXTRACT] Using Mistral chat API for image: ${doc.file_name}`);
      let fileBuffer: ArrayBuffer | null = null;
      for (let dl = 0; dl < 3; dl++) {
        try {
          const resp = await fetch(fileUrl);
          if (!resp.ok) throw new Error(`Download ${resp.status}`);
          fileBuffer = await resp.arrayBuffer();
          break;
        } catch (err) {
          if (dl === 2) throw err;
          await delay(1000);
        }
      }
      if (!fileBuffer || fileBuffer.byteLength === 0) {
        throw new Error("Empty file downloaded");
      }
      const base64Data = arrayBufferToBase64(fileBuffer);
      console.log(`[EXTRACT] File: ${fileBuffer.byteLength} bytes, base64: ${base64Data.length} chars`);
      fileBuffer = null;
      ocrText = await mistralOcrImage(base64Data, mimeType, MISTRAL_API_KEY);
    }
    console.log(`[EXTRACT] OCR complete: ${ocrText.length} chars`);

    // Stage 2: OpenAI structured extraction from OCR text
    const extracted = await extractStructured(ocrText, LOVABLE_API_KEY);

    // Pre-create pjecalc_calculos with user_id to avoid NULL user_id errors from view triggers
    let userId = doc.owner_user_id;
    if (!userId) {
      const { data: caseRow } = await supabase.from("cases").select("criado_por").eq("id", doc.case_id).maybeSingle();
      userId = caseRow?.criado_por;
    }
    if (userId) {
      const { data: existingCalc } = await supabase
        .from("pjecalc_calculos")
        .select("id")
        .eq("case_id", doc.case_id)
        .maybeSingle();
      if (!existingCalc) {
        await supabase.from("pjecalc_calculos").insert({
          case_id: doc.case_id,
          user_id: userId,
        });
        console.log(`[EXTRACT] Pre-created pjecalc_calculos for case ${doc.case_id}`);
      }
    }

    // Auto-fill pjecalc tables
    const fills = await autoFill(supabase, doc.case_id, extracted);
    const extractedOcrText = extracted.texto_ocr_completo || "";
    await supabase.from("documents").update({
      status: "extracted",
      tipo: extracted.tipo_documento || doc.tipo,
      page_count: extracted.paginas_detectadas || 1,
      ocr_confidence: extracted.confianca_geral || 0.9,
      ocr_confianca: extracted.confianca_geral || 0.9,
      processing_completed_at: new Date().toISOString(),
      error_message: null,
      metadata: {
        ...(doc.metadata || {}),
        extraction_completed_at: new Date().toISOString(),
        text_length: extractedOcrText.length,
        extracted_text_preview: extractedOcrText.substring(0, 500),
        tipo_detectado: extracted.tipo_documento,
        rubricas_extraidas: extracted.rubricas?.length || 0,
        auto_fill_fields: fills,
        has_contrato: !!extracted.contrato,
        has_trct: !!extracted.trct,
        has_cartao_ponto: !!extracted.cartao_ponto?.registros?.length,
        has_ferias: !!extracted.ferias?.length,
        has_sentenca: !!extracted.sentenca,
      },
    }).eq("id", document_id);

    // Store extracted text as chunks for search
    if (extractedOcrText.length > 100) {
      await supabase.from("document_chunks").delete().eq("document_id", document_id);
      await supabase.from("doc_chunks").delete().eq("document_id", document_id);

      const chunkSize = 1000;
      const overlap = 200;
      const chunks: any[] = [];
      let start = 0;
      let idx = 0;

      while (start < extractedOcrText.length) {
        const end = Math.min(start + chunkSize, extractedOcrText.length);
        chunks.push({
          case_id: doc.case_id,
          document_id,
          content: extractedOcrText.substring(start, end),
          page_number: 1,
          chunk_index: idx,
          doc_type: extracted.tipo_documento || doc.tipo || "outro",
          metadata: { index: idx, char_count: end - start },
        });
        idx++;
        start = end - overlap;
        if (start >= extractedOcrText.length) break;
      }

      if (chunks.length > 0) {
        const { error: chunkErr } = await supabase.from("document_chunks").insert(chunks);
        if (chunkErr) console.error("[EXTRACT] Chunk insert error:", chunkErr.message);
      }
    }

    console.log(`[EXTRACT] COMPLETE: tipo=${extracted.tipo_documento}, fills=[${fills.join(", ")}]`);

  } catch (extractError) {
    console.error("[EXTRACT] FAILURE:", extractError);
    await supabase.from("documents").update({
      status: "failed",
      error_message: extractError instanceof Error ? extractError.message : "Unknown error",
      processing_completed_at: new Date().toISOString(),
    }).eq("id", document_id);
  }
}

// =====================================================
// MAIN HANDLER — Returns immediately, processes in background
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch document
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get file URL
    let fileUrl = doc.arquivo_url;
    if (!fileUrl && doc.storage_path) {
      for (const bucket of ["juriscalculo-documents", "case-documents"]) {
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(doc.storage_path, 3600);
        if (signed?.signedUrl) {
          fileUrl = signed.signedUrl;
          break;
        }
      }
    }

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "No file URL available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[EXTRACT] Starting for document ${document_id}: ${doc.file_name}`);

    // Update status immediately
    await supabase.from("documents").update({
      status: "extracting",
      processing_started_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", document_id);

    // Start background processing — does NOT block the response
    EdgeRuntime.waitUntil(
      processDocumentInBackground(document_id, fileUrl, doc, MISTRAL_API_KEY, LOVABLE_API_KEY, supabase)
    );

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        status: "processing",
        message: "Extração iniciada em background. Acompanhe pelo status do documento.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[EXTRACT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

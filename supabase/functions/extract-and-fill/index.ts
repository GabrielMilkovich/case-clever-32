// =====================================================
// EDGE FUNCTION: EXTRACT-AND-FILL
// OCR + Extração Estruturada + Auto-Preenchimento PJe-Calc
// Usa Gemini 2.5 Pro para máxima precisão
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

async function callAI(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<any> {
  let lastError: Error | null = null;

  // Try Gemini 2.5 Pro first (best accuracy), then Flash as fallback
  const models = ["google/gemini-2.5-pro", "google/gemini-2.5-flash", "google/gemini-3-flash-preview"];

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[EXTRACT] Attempt ${attempt} with ${model}`);

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analise este documento trabalhista e extraia ABSOLUTAMENTE TODOS os dados usando a função extrair_dados_documento. Não omita nenhuma informação."
                  },
                  {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64Data}` },
                  },
                ],
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
          console.error(`[EXTRACT] API ${response.status}:`, errText.substring(0, 200));

          if (response.status === 429) {
            await delay(RETRY_DELAY_MS * attempt * 3);
            continue;
          }
          if (response.status >= 500) {
            await delay(RETRY_DELAY_MS * attempt);
            continue;
          }
          lastError = new Error(`API ${response.status}`);
          break; // next model
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          const extracted = JSON.parse(toolCall.function.arguments);
          console.log(`[EXTRACT] SUCCESS with ${model}: tipo=${extracted.tipo_documento}, rubricas=${extracted.rubricas?.length || 0}`);
          return extracted;
        }

        // Fallback: try parsing from content
        const content = data.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        lastError = new Error("No structured data returned");
        continue;
      } catch (err) {
        console.error(`[EXTRACT] Error:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
    console.warn(`[EXTRACT] Model ${model} exhausted, trying next...`);
  }

  throw new Error(`Extraction failed: ${lastError?.message}`);
}

// =====================================================
// AUTO-FILL: Grava dados extraídos nas tabelas pjecalc
// =====================================================

async function autoFill(supabase: any, caseId: string, extracted: any) {
  const fills: string[] = [];

  try {
    // 1. DADOS DO PROCESSO
    if (extracted.dados_processo || extracted.reclamante || extracted.reclamada) {
      const dp = extracted.dados_processo || {};
      const rec = extracted.reclamante || {};
      const rda = extracted.reclamada || {};

      await supabase.from("pjecalc_dados_processo").upsert({
        case_id: caseId,
        numero_processo: dp.numero_processo || null,
        vara: dp.vara || null,
        reclamante_nome: rec.nome || null,
        reclamante_cpf: rec.cpf || null,
        reclamada_nome: rda.nome || rda.razao_social || null,
        reclamada_cnpj: rda.cnpj || null,
      }, { onConflict: 'case_id' }).then(({ error }: any) => {
        if (error) console.error("[FILL] dados_processo:", error.message);
        else fills.push("dados_processo");
      });
    }

    // 2. PARÂMETROS (contrato)
    if (extracted.contrato) {
      const c = extracted.contrato;
      await supabase.from("pjecalc_parametros").upsert({
        case_id: caseId,
        data_admissao: c.data_admissao || null,
        data_demissao: c.data_demissao || null,
        data_ajuizamento: extracted.dados_processo?.data_ajuizamento || null,
        carga_horaria_padrao: c.carga_horaria_mensal || 220,
      }, { onConflict: 'case_id' }).then(({ error }: any) => {
        if (error) console.error("[FILL] parametros:", error.message);
        else fills.push("parametros");
      });
    }

    // 3. HISTÓRICO SALARIAL (from rubricas)
    if (extracted.rubricas?.length > 0) {
      const vencimentos = extracted.rubricas.filter((r: any) => r.tipo === "vencimento");

      for (const rub of vencimentos) {
        if (!rub.valores_mensais?.length) continue;

        // Create hist_salarial entry
        const { error: histErr } = await supabase.from("pjecalc_historico_salarial").upsert({
          case_id: caseId,
          nome: rub.denominacao,
          tipo_valor: rub.categoria === "salario_base" ? "FIXO" : "VARIAVEL",
          valor_informado: rub.valores_mensais[0]?.valor || 0,
          incidencia_fgts: !["vale_transporte", "vale_refeicao"].includes(rub.categoria),
          incidencia_cs: true,
          observacoes: rub.codigo ? `Código: ${rub.codigo}` : null,
        }, { onConflict: 'case_id,nome' });

        if (histErr) {
          console.error("[FILL] historico_salarial:", histErr.message);
        }
      }
      fills.push(`historico_salarial (${vencimentos.length} rubricas)`);
    }

    // 4. VERBAS (from rubricas with period info)
    if (extracted.rubricas?.length > 0) {
      const vencimentos = extracted.rubricas.filter((r: any) => r.tipo === "vencimento");

      for (const rub of vencimentos) {
        if (!rub.valores_mensais?.length) continue;

        const competencias = rub.valores_mensais.map((v: any) => v.competencia).sort();
        const periodoInicio = competencias[0] ? competencias[0] + "-01" : null;
        const periodoFim = competencias[competencias.length - 1]
          ? competencias[competencias.length - 1] + "-28"
          : null;

        await supabase.from("pjecalc_verbas").upsert({
          case_id: caseId,
          nome: rub.denominacao,
          codigo: rub.codigo || null,
          caracteristica: rub.categoria === "salario_base" ? "FIXA" : "COMUM",
          ocorrencia_pagamento: "MENSAL",
          multiplicador: 1,
          divisor_informado: 1,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          ordem: 0,
          ativa: true,
          hist_salarial_nome: rub.denominacao,
          valor: "calculado",
        }, { onConflict: 'case_id,nome' }).then(({ error }: any) => {
          if (error) console.error("[FILL] verbas:", error.message);
        });
      }
      fills.push(`verbas (${vencimentos.length})`);
    }

    // 5. FÉRIAS
    if (extracted.ferias?.length > 0) {
      for (const f of extracted.ferias) {
        await supabase.from("pjecalc_ferias").insert({
          case_id: caseId,
          periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio,
          periodo_aquisitivo_fim: f.periodo_aquisitivo_fim,
          gozo_inicio: f.gozo_inicio || null,
          gozo_fim: f.gozo_fim || null,
          dias: f.dias || 30,
          abono: f.abono_pecuniario || false,
          dias_abono: f.dias_abono || 0,
          situacao: f.situacao || "GOZADAS",
        }).then(({ error }: any) => {
          if (error) console.error("[FILL] ferias:", error.message);
        });
      }
      fills.push(`ferias (${extracted.ferias.length})`);
    }

    // 6. CARTÃO DE PONTO
    if (extracted.cartao_ponto?.registros?.length > 0) {
      const registros = extracted.cartao_ponto.registros;
      // Insert in batches of 50
      for (let i = 0; i < registros.length; i += 50) {
        const batch = registros.slice(i, i + 50).map((r: any) => ({
          case_id: caseId,
          data: r.data,
          entrada_1: r.entrada1 || null,
          saida_1: r.saida1 || null,
          entrada_2: r.entrada2 || null,
          saida_2: r.saida2 || null,
          entrada_3: r.entrada3 || null,
          saida_3: r.saida3 || null,
          horas_normais: r.horas_normais || null,
          horas_extras: r.horas_extras || null,
          horas_noturnas: r.horas_noturnas || null,
          observacao: r.observacao || null,
          origem: "OCR",
        }));

        await supabase.from("pjecalc_cartao_ponto").insert(batch).then(({ error }: any) => {
          if (error) console.error("[FILL] cartao_ponto batch:", error.message);
        });
      }
      fills.push(`cartao_ponto (${registros.length} dias)`);
    }

    // 7. FGTS
    if (extracted.fgts?.depositos?.length > 0) {
      await supabase.from("pjecalc_fgts_config").upsert({
        case_id: caseId,
        apurar_fgts: true,
        apurar_multa_40: true,
      }, { onConflict: 'case_id' }).then(({ error }: any) => {
        if (error) console.error("[FILL] fgts_config:", error.message);
      });
      fills.push("fgts_config");
    }

    // 8. SENTENÇA — parâmetros de liquidação
    if (extracted.sentenca?.parametros_liquidacao) {
      const pl = extracted.sentenca.parametros_liquidacao;

      if (pl.indice_correcao) {
        await supabase.from("pjecalc_correcao_config").upsert({
          case_id: caseId,
          indice: pl.indice_correcao,
        }, { onConflict: 'case_id' }).then(({ error }: any) => {
          if (error) console.error("[FILL] correcao_config:", error.message);
        });
      }

      if (pl.honorarios_percentual) {
        await supabase.from("pjecalc_honorarios").upsert({
          case_id: caseId,
          tipo: "percentual",
          percentual: pl.honorarios_percentual,
        }, { onConflict: 'case_id' }).then(({ error }: any) => {
          if (error) console.error("[FILL] honorarios:", error.message);
        });
      }

      if (pl.custas_processuais) {
        await supabase.from("pjecalc_custas_config").upsert({
          case_id: caseId,
          valor: pl.custas_processuais,
        }, { onConflict: 'case_id' }).then(({ error }: any) => {
          if (error) console.error("[FILL] custas:", error.message);
        });
      }

      fills.push("sentenca_parametros");
    }
  } catch (err) {
    console.error("[FILL] Global error:", err);
  }

  return fills;
}

// =====================================================
// MAIN HANDLER
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

    // Update status
    await supabase.from("documents").update({
      status: "extracting",
      processing_started_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", document_id);

    try {
      // Download file
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

      // Detect MIME type
      let mimeType = doc.mime_type || "application/pdf";
      if (!mimeType || mimeType === "application/octet-stream") {
        const fn = (doc.file_name || "").toLowerCase();
        if (fn.endsWith(".pdf")) mimeType = "application/pdf";
        else if (fn.endsWith(".png")) mimeType = "image/png";
        else if (fn.endsWith(".jpg") || fn.endsWith(".jpeg")) mimeType = "image/jpeg";
        else mimeType = "application/pdf";
      }

      const base64Data = arrayBufferToBase64(fileBuffer);
      console.log(`[EXTRACT] File: ${fileBuffer.byteLength} bytes, base64: ${base64Data.length} chars`);

      // Call AI for structured extraction
      const extracted = await callAI(base64Data, mimeType, LOVABLE_API_KEY);

      // Auto-fill pjecalc tables
      const fills = await autoFill(supabase, doc.case_id, extracted);

      // Update document with results
      const ocrText = extracted.texto_ocr_completo || "";
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
          text_length: ocrText.length,
          extracted_text_preview: ocrText.substring(0, 500),
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

      // Also store extracted text as chunks for search
      if (ocrText.length > 100) {
        // Delete old chunks
        await supabase.from("document_chunks").delete().eq("document_id", document_id);
        await supabase.from("doc_chunks").delete().eq("document_id", document_id);

        // Create simple chunks (skip embeddings since model not available)
        const chunkSize = 1000;
        const overlap = 200;
        const chunks: any[] = [];
        let start = 0;
        let idx = 0;

        while (start < ocrText.length) {
          const end = Math.min(start + chunkSize, ocrText.length);
          chunks.push({
            case_id: doc.case_id,
            document_id,
            content: ocrText.substring(start, end),
            page_number: 1,
            chunk_index: idx,
            doc_type: extracted.tipo_documento || doc.tipo || "outro",
            metadata: { index: idx, char_count: end - start },
          });
          idx++;
          start = end - overlap;
          if (start >= ocrText.length) break;
        }

        if (chunks.length > 0) {
          const { error: chunkErr } = await supabase.from("document_chunks").insert(chunks);
          if (chunkErr) console.error("[EXTRACT] Chunk insert error:", chunkErr.message);
        }
      }

      console.log(`[EXTRACT] COMPLETE: tipo=${extracted.tipo_documento}, fills=[${fills.join(", ")}]`);

      return new Response(
        JSON.stringify({
          success: true,
          document_id,
          tipo_documento: extracted.tipo_documento,
          confianca: extracted.confianca_geral,
          rubricas_extraidas: extracted.rubricas?.length || 0,
          auto_fill: fills,
          dados_extraidos: {
            tem_processo: !!extracted.dados_processo,
            tem_contrato: !!extracted.contrato,
            tem_rubricas: (extracted.rubricas?.length || 0) > 0,
            tem_trct: !!extracted.trct,
            tem_cartao_ponto: (extracted.cartao_ponto?.registros?.length || 0) > 0,
            tem_ferias: (extracted.ferias?.length || 0) > 0,
            tem_fgts: !!extracted.fgts,
            tem_sentenca: !!extracted.sentenca,
          },
          text_length: (extracted.texto_ocr_completo || "").length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (extractError) {
      console.error("[EXTRACT] FAILURE:", extractError);

      await supabase.from("documents").update({
        status: "failed",
        error_message: extractError instanceof Error ? extractError.message : "Unknown error",
        processing_completed_at: new Date().toISOString(),
      }).eq("id", document_id);

      throw extractError;
    }

  } catch (error) {
    console.error("[EXTRACT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// =====================================================
// EDGE FUNCTION: EXTRACT-AND-FILL
// OCR + Extração Estruturada + Auto-Preenchimento PJe-Calc
// Uses Gemini 2.5 Flash for speed + lower memory
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 2;
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
// TOOL DEFINITIONS — Lightweight extraction schema
// =====================================================

const EXTRACTION_TOOLS = [
  {
    type: "function",
    function: {
      name: "extrair_dados_documento",
      description: "Extrai dados estruturados de um documento trabalhista brasileiro.",
      parameters: {
        type: "object",
        properties: {
          tipo_documento: {
            type: "string",
            enum: ["holerite", "ctps", "trct", "cartao_ponto", "ficha_financeira", "contrato", "sentenca", "peticao", "extrato_fgts", "outro"],
          },
          confianca_geral: { type: "number" },
          dados_processo: {
            type: "object",
            properties: {
              numero_processo: { type: "string" },
              vara: { type: "string" },
              tribunal: { type: "string" },
              data_ajuizamento: { type: "string" },
              data_sentenca: { type: "string" },
            }
          },
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
          contrato: {
            type: "object",
            properties: {
              data_admissao: { type: "string" },
              data_demissao: { type: "string" },
              cargo_funcao: { type: "string" },
              salario_base: { type: "number" },
              tipo_demissao: { type: "string", enum: ["sem_justa_causa", "com_justa_causa", "pedido_demissao", "acordo", "outro"] },
              jornada: { type: "string" },
              carga_horaria_mensal: { type: "number" },
            }
          },
          rubricas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                codigo: { type: "string" },
                denominacao: { type: "string" },
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
                      competencia: { type: "string" },
                      valor: { type: "number" },
                      referencia: { type: "string" },
                    },
                    required: ["competencia", "valor"]
                  }
                }
              },
              required: ["denominacao", "tipo", "valores_mensais"]
            }
          },
          trct: {
            type: "object",
            properties: {
              aviso_previo_tipo: { type: "string", enum: ["trabalhado", "indenizado", "nao_aplicavel"] },
              aviso_previo_dias: { type: "number" },
              saldo_salario_valor: { type: "number" },
              decimo_terceiro_proporcional: { type: "number" },
              ferias_vencidas: { type: "number" },
              ferias_proporcionais: { type: "number" },
              terco_ferias: { type: "number" },
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
          cartao_ponto: {
            type: "object",
            properties: {
              registros: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    data: { type: "string" },
                    entrada1: { type: "string" },
                    saida1: { type: "string" },
                    entrada2: { type: "string" },
                    saida2: { type: "string" },
                    horas_extras: { type: "string" },
                    observacao: { type: "string" },
                  },
                  required: ["data"]
                }
              }
            }
          },
          ferias: {
            type: "array",
            items: {
              type: "object",
              properties: {
                periodo_aquisitivo_inicio: { type: "string" },
                periodo_aquisitivo_fim: { type: "string" },
                gozo_inicio: { type: "string" },
                gozo_fim: { type: "string" },
                dias: { type: "number" },
                abono_pecuniario: { type: "boolean" },
                situacao: { type: "string", enum: ["GOZADAS", "VENCIDAS", "PROPORCIONAIS", "INDENIZADAS"] },
              },
              required: ["periodo_aquisitivo_inicio", "periodo_aquisitivo_fim"]
            }
          },
          fgts: {
            type: "object",
            properties: {
              saldo_total: { type: "number" },
              depositos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    competencia: { type: "string" },
                    valor_deposito: { type: "number" },
                  },
                  required: ["competencia", "valor_deposito"]
                }
              }
            }
          },
          sentenca: {
            type: "object",
            properties: {
              pedidos_deferidos: { type: "array", items: { type: "string" } },
              pedidos_indeferidos: { type: "array", items: { type: "string" } },
              parametros_liquidacao: {
                type: "object",
                properties: {
                  indice_correcao: { type: "string" },
                  juros: { type: "string" },
                  honorarios_percentual: { type: "number" },
                  custas_processuais: { type: "number" },
                }
              }
            }
          },
          paginas_detectadas: { type: "number" },
        },
        required: ["tipo_documento", "confianca_geral"]
      }
    }
  }
];

const SYSTEM_PROMPT = `Você é um sistema de OCR e extração de dados para documentos trabalhistas brasileiros.

REGRAS:
1. VALORES MONETÁRIOS: Use formato decimal (1234.56, NÃO 1.234,56)
2. DATAS: YYYY-MM-DD. COMPETÊNCIAS: YYYY-MM
3. Extraia TUDO. Se tem 50 rubricas, retorne as 50.
4. Texto ilegível: null, nunca invente valores
5. Classifique vencimentos vs descontos corretamente
6. Para holerites/fichas: extraia TODAS as rubricas com código, denominação e valores mensais
7. Para TRCT: todas as verbas rescisórias com código e valor
8. Para cartão de ponto: todos os registros diários
9. NÃO retorne texto_ocr_completo - apenas dados estruturados`;

async function callAI(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<any> {
  let lastError: Error | null = null;

  // Use Flash for speed and lower memory
  const models = ["google/gemini-2.5-flash", "google/gemini-2.5-pro"];

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
                    text: "Analise este documento trabalhista e extraia TODOS os dados usando a função extrair_dados_documento."
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
          break;
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          const extracted = JSON.parse(toolCall.function.arguments);
          console.log(`[EXTRACT] SUCCESS with ${model}: tipo=${extracted.tipo_documento}, rubricas=${extracted.rubricas?.length || 0}`);
          return extracted;
        }

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

  async function safe(label: string, fn: () => Promise<any>) {
    try {
      const result = await fn();
      if (result?.error) {
        console.error(`[FILL] ${label}:`, result.error.message);
      } else {
        fills.push(label);
      }
    } catch (err: any) {
      console.error(`[FILL] ${label}:`, err?.message || err);
    }
  }

  try {
    // 1. DADOS DO PROCESSO — uses IOI trigger view, just insert
    if (extracted.dados_processo || extracted.reclamante || extracted.reclamada) {
      const dp = extracted.dados_processo || {};
      const rec = extracted.reclamante || {};
      const rda = extracted.reclamada || {};

      // Check if dados_processo already exists for this case
      const { data: existing } = await supabase.from("pjecalc_dados_processo").select("id").eq("case_id", caseId).maybeSingle();
      
      if (existing) {
        // Update via the calculos table directly
        const { data: calc } = await supabase.from("pjecalc_calculos").select("id").eq("case_id", caseId).maybeSingle();
        if (calc) {
          await safe("dados_processo", () =>
            supabase.from("pjecalc_calculos").update({
              processo_cnj: dp.numero_processo || undefined,
              reclamante_nome: rec.nome || undefined,
              reclamante_cpf: rec.cpf || undefined,
              reclamado_nome: rda.nome || rda.razao_social || undefined,
              reclamado_cnpj: rda.cnpj || undefined,
              vara: dp.vara || undefined,
            }).eq("id", calc.id)
          );
        }
      } else {
        await safe("dados_processo", () =>
          supabase.from("pjecalc_dados_processo").insert({
            case_id: caseId,
            numero_processo: dp.numero_processo || null,
            vara: dp.vara || null,
            reclamante_nome: rec.nome || null,
            reclamante_cpf: rec.cpf || null,
            reclamada_nome: rda.nome || rda.razao_social || null,
            reclamada_cnpj: rda.cnpj || null,
          })
        );
      }

      if (rec.nome || dp.numero_processo) {
        await supabase.from("cases").update({
          cliente: rec.nome || undefined,
          numero_processo: dp.numero_processo || undefined,
          tribunal: dp.tribunal || dp.vara || undefined,
        }).eq("id", caseId);
      }
    }

    // 2. PARÂMETROS DO CONTRATO — uses IOI trigger view
    if (extracted.contrato) {
      const c = extracted.contrato;
      const dp = extracted.dados_processo || {};

      const { data: existParam } = await supabase.from("pjecalc_parametros").select("id").eq("case_id", caseId).maybeSingle();
      
      if (existParam) {
        const { data: calc } = await supabase.from("pjecalc_calculos").select("id").eq("case_id", caseId).maybeSingle();
        if (calc) {
          await safe("parametros", () =>
            supabase.from("pjecalc_calculos").update({
              data_admissao: c.data_admissao ? new Date(c.data_admissao) : undefined,
              data_demissao: c.data_demissao ? new Date(c.data_demissao) : undefined,
              data_ajuizamento: dp.data_ajuizamento ? new Date(dp.data_ajuizamento) : undefined,
              divisor_horas: c.carga_horaria_mensal || 220,
            }).eq("id", calc.id)
          );
        }
      } else {
        await safe("parametros", () =>
          supabase.from("pjecalc_parametros").insert({
            case_id: caseId,
            data_admissao: c.data_admissao || null,
            data_demissao: c.data_demissao || null,
            data_ajuizamento: dp.data_ajuizamento || null,
            carga_horaria_padrao: c.carga_horaria_mensal || 220,
            ultima_remuneracao: c.salario_base || null,
            maior_remuneracao: c.salario_base || null,
          })
        );
      }

      // Employment contracts
      if (c.data_admissao) {
        const { data: existContract } = await supabase.from("employment_contracts").select("id").eq("case_id", caseId).maybeSingle();
        if (existContract) {
          await safe("contrato_emprego", () =>
            supabase.from("employment_contracts").update({
              data_admissao: c.data_admissao,
              data_demissao: c.data_demissao || null,
              funcao: c.cargo_funcao || null,
              salario_inicial: c.salario_base || null,
              tipo_demissao: c.tipo_demissao || null,
            }).eq("id", existContract.id)
          );
        } else {
          await safe("contrato_emprego", () =>
            supabase.from("employment_contracts").insert({
              case_id: caseId,
              data_admissao: c.data_admissao,
              data_demissao: c.data_demissao || null,
              funcao: c.cargo_funcao || null,
              salario_inicial: c.salario_base || null,
              tipo_demissao: c.tipo_demissao || null,
            })
          );
        }
      }
    }

    // 3. HISTÓRICO SALARIAL + VALORES MENSAIS
    if (extracted.rubricas?.length > 0) {
      const vencimentos = extracted.rubricas.filter((r: any) => r.tipo === "vencimento");

      for (const rub of vencimentos) {
        if (!rub.valores_mensais?.length && !rub.denominacao) continue;

        const tipoVar = ["salario_base"].includes(rub.categoria) ? "FIXO" : "VARIAVEL";
        const firstVal = rub.valores_mensais?.[0]?.valor || 0;

        const { data: histData, error: histErr } = await supabase
          .from("pjecalc_historico_salarial")
          .upsert({
            case_id: caseId,
            nome: rub.denominacao,
            tipo_valor: tipoVar,
            valor_informado: firstVal,
            incidencia_fgts: !["vale_transporte", "vale_refeicao"].includes(rub.categoria),
            incidencia_cs: true,
            observacoes: rub.codigo ? `Código: ${rub.codigo}` : null,
          }, { onConflict: 'case_id,nome' })
          .select('id')
          .single();

        if (histErr) {
          console.error("[FILL] historico_salarial:", histErr.message);
          continue;
        }

        if (histData?.id && rub.valores_mensais?.length > 0) {
          for (const vm of rub.valores_mensais) {
            if (!vm.competencia || vm.valor === undefined) continue;
            await supabase.from("pjecalc_historico_ocorrencias").upsert({
              historico_id: histData.id,
              competencia: vm.competencia.length === 7 ? vm.competencia + "-01" : vm.competencia,
              valor: vm.valor,
              tipo: "informado",
            }, { onConflict: 'historico_id,competencia' });
          }
        }
      }

      const totalMensais = vencimentos.reduce((sum: number, r: any) => sum + (r.valores_mensais?.length || 0), 0);
      fills.push(`historico (${vencimentos.length} rubricas, ${totalMensais} meses)`);
    }

    // 4. VERBAS DO CÁLCULO
    if (extracted.rubricas?.length > 0) {
      const vencimentos = extracted.rubricas.filter((r: any) => r.tipo === "vencimento" && r.valores_mensais?.length);

      for (const rub of vencimentos) {
        const competencias = rub.valores_mensais.map((v: any) => v.competencia).sort();
        await supabase.from("pjecalc_verbas").upsert({
          case_id: caseId,
          nome: rub.denominacao,
          codigo: rub.codigo || null,
          caracteristica: rub.categoria === "salario_base" ? "FIXA" : "COMUM",
          ocorrencia_pagamento: "MENSAL",
          multiplicador: 1,
          divisor_informado: 1,
          periodo_inicio: competencias[0] ? competencias[0] + "-01" : null,
          periodo_fim: competencias[competencias.length - 1] ? competencias[competencias.length - 1] + "-28" : null,
          ordem: 0,
          ativa: true,
          hist_salarial_nome: rub.denominacao,
          valor: "calculado",
        }, { onConflict: 'case_id,nome' });
      }
      fills.push(`verbas (${vencimentos.length})`);
    }

    // 5. FÉRIAS
    if (extracted.ferias?.length > 0) {
      for (const f of extracted.ferias) {
        await safe(`ferias`, () =>
          supabase.from("pjecalc_ferias").insert({
            case_id: caseId,
            periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio,
            periodo_aquisitivo_fim: f.periodo_aquisitivo_fim,
            gozo_inicio: f.gozo_inicio || null,
            gozo_fim: f.gozo_fim || null,
            dias: f.dias || 30,
            abono: f.abono_pecuniario || false,
            situacao: f.situacao || "GOZADAS",
          })
        );
      }
      fills.push(`ferias (${extracted.ferias.length})`);
    }

    // 6. CARTÃO DE PONTO
    if (extracted.cartao_ponto?.registros?.length > 0) {
      const registros = extracted.cartao_ponto.registros;
      for (let i = 0; i < registros.length; i += 50) {
        const batch = registros.slice(i, i + 50).map((r: any) => ({
          case_id: caseId,
          data: r.data,
          entrada_1: r.entrada1 || null,
          saida_1: r.saida1 || null,
          entrada_2: r.entrada2 || null,
          saida_2: r.saida2 || null,
          horas_extras: r.horas_extras || null,
          observacao: r.observacao || null,
          origem: "OCR",
        }));
        await supabase.from("pjecalc_cartao_ponto").insert(batch);
      }
      fills.push(`cartao_ponto (${registros.length})`);
    }

    // 7. TRCT
    if (extracted.trct?.verbas_rescisorias?.length > 0) {
      for (const verba of extracted.trct.verbas_rescisorias) {
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
        });
      }
      fills.push(`trct (${extracted.trct.verbas_rescisorias.length})`);
    }

    // 8. FGTS
    if (extracted.fgts) {
      await supabase.from("pjecalc_fgts_config").upsert({
        case_id: caseId,
        apurar_fgts: true,
        apurar_multa_40: true,
        percentual_multa: 40,
      }, { onConflict: 'case_id' });
      fills.push("fgts_config");
    }

    // 9. SENTENÇA
    if (extracted.sentenca?.pedidos_deferidos?.length > 0) {
      for (let i = 0; i < extracted.sentenca.pedidos_deferidos.length; i++) {
        const pedido = extracted.sentenca.pedidos_deferidos[i];
        await supabase.from("pjecalc_verbas").upsert({
          case_id: caseId,
          nome: pedido,
          caracteristica: "COMUM",
          ocorrencia_pagamento: "MENSAL",
          multiplicador: 1,
          divisor_informado: 1,
          ordem: i,
          ativa: true,
          valor: "calculado",
          observacoes: "Deferido em sentença",
        }, { onConflict: 'case_id,nome' });
      }
      fills.push(`sentenca (${extracted.sentenca.pedidos_deferidos.length})`);
    }

    // 10. FACTS — use upsert with the new unique constraint
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
    if (cont.tipo_demissao) allFacts.push({ chave: "tipo_demissao", valor: cont.tipo_demissao, tipo: "texto" });
    if (dp.numero_processo) allFacts.push({ chave: "numero_processo", valor: dp.numero_processo, tipo: "texto" });
    if (dp.vara) allFacts.push({ chave: "vara", valor: dp.vara, tipo: "texto" });
    if (dp.tribunal) allFacts.push({ chave: "tribunal", valor: dp.tribunal, tipo: "texto" });

    // TRCT facts
    if (extracted.trct) {
      const t = extracted.trct;
      if (t.total_bruto) allFacts.push({ chave: "trct_total_bruto", valor: String(t.total_bruto), tipo: "monetario" });
      if (t.total_liquido) allFacts.push({ chave: "trct_total_liquido", valor: String(t.total_liquido), tipo: "monetario" });
      if (t.fgts_multa_40) allFacts.push({ chave: "trct_fgts_multa_40", valor: String(t.fgts_multa_40), tipo: "monetario" });
      if (t.aviso_previo_tipo) allFacts.push({ chave: "aviso_previo_tipo", valor: t.aviso_previo_tipo, tipo: "texto" });
    }

    for (const fact of allFacts) {
      await supabase.from("facts").upsert({
        case_id: caseId,
        chave: fact.chave,
        valor: fact.valor,
        tipo: fact.tipo as any,
        origem: "extracao",
        confianca: extracted.confianca_geral || 0.9,
        confirmado: true,
      }, { onConflict: 'case_id,chave' });
    }
    if (allFacts.length > 0) fills.push(`facts (${allFacts.length})`);

    // 11. AUTO-CONFIGURE MODULES
    await autoConfigureModules(supabase, caseId, extracted, fills);

  } catch (err: any) {
    console.error("[FILL] Global error:", err?.message || err);
  }

  return fills;
}

async function autoConfigureModules(supabase: any, caseId: string, extracted: any, fills: string[]) {
  await delay(500);

  const { data: calculoRow } = await supabase
    .from("pjecalc_calculos")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  if (!calculoRow) return;
  const calcId = calculoRow.id;

  await supabase.from("pjecalc_calculos").update({
    honorarios_percentual: extracted.sentenca?.parametros_liquidacao?.honorarios_percentual || 15,
    honorarios_sobre: 'condenacao',
    custas_percentual: 2,
    custas_limite: 10.64,
    multa_477_habilitada: true,
    data_liquidacao: new Date().toISOString().slice(0, 10),
  }).eq("id", calcId);
  fills.push("modulos_config");

  const { data: existCorrecao } = await supabase
    .from("pjecalc_atualizacao_config")
    .select("id")
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
// MAIN HANDLER — Process in background with waitUntil
// =====================================================

async function processDocumentInBackground(
  document_id: string,
  fileUrl: string,
  doc: any,
  LOVABLE_API_KEY: string,
  supabase: any
) {
  try {
    // Download file
    const resp = await fetch(fileUrl);
    if (!resp.ok) throw new Error(`Download ${resp.status}`);
    const fileBuffer = await resp.arrayBuffer();

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      throw new Error("Empty file downloaded");
    }

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

    // Call AI
    const extracted = await callAI(base64Data, mimeType, LOVABLE_API_KEY);

    // Auto-fill
    const fills = await autoFill(supabase, doc.case_id, extracted);

    // Update document
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
        tipo_detectado: extracted.tipo_documento,
        rubricas_extraidas: extracted.rubricas?.length || 0,
        auto_fill_fields: fills,
      },
    }).eq("id", document_id);

    console.log(`[EXTRACT] COMPLETE: tipo=${extracted.tipo_documento}, fills=[${fills.join(", ")}]`);

  } catch (extractError: any) {
    console.error("[EXTRACT] FAILURE:", extractError?.message || extractError);
    await supabase.from("documents").update({
      status: "failed",
      error_message: extractError instanceof Error ? extractError.message : "Unknown error",
      processing_completed_at: new Date().toISOString(),
    }).eq("id", document_id);
  }
}

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

    await supabase.from("documents").update({
      status: "extracting",
      processing_started_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", document_id);

    // Background processing
    EdgeRuntime.waitUntil(
      processDocumentInBackground(document_id, fileUrl, doc, LOVABLE_API_KEY, supabase)
    );

    return new Response(
      JSON.stringify({ success: true, document_id, status: "processing" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[EXTRACT] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

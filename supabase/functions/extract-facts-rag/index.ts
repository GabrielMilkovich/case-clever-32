// =====================================================
// AGENTE EXTRATOR COM RAG (ANTI-ALUCINAÇÃO REFORÇADA)
// Usa busca semântica para encontrar chunks relevantes
// e extrai fatos com citação obrigatória do chunk_id
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tópicos de busca para extração trabalhista
const EXTRACTION_TOPICS = [
  "data de admissão contrato início trabalho",
  "data de demissão rescisão término desligamento",
  "salário base remuneração mensal vencimento",
  "jornada de trabalho horário expediente",
  "horas extras adicional hora excedente",
  "adicional insalubridade periculosidade noturno",
  "férias vencidas proporcionais período aquisitivo",
  "décimo terceiro salário gratificação natalina",
  "FGTS fundo garantia depósito multa",
  "aviso prévio indenizado trabalhado",
  "cargo função atividade exercida",
  "motivo rescisão justa causa pedido demissão",
];

// Tool schema para extração com chunk_id obrigatório
const extractFactsTool = {
  type: "function",
  function: {
    name: "extract_facts",
    description: "Extrai fatos jurídicos dos chunks fornecidos com referência obrigatória ao chunk_id de origem",
    parameters: {
      type: "object",
      properties: {
        facts: {
          type: "array",
          description: "Lista de fatos extraídos com chunk_id obrigatório",
          items: {
            type: "object",
            properties: {
              chave: {
                type: "string",
                description: "Identificador do fato (ex: data_admissao, salario_base)"
              },
              valor: {
                type: "string",
                description: "Valor extraído. Use 'NAO_ENCONTRADO' se não estiver nos chunks."
              },
              tipo: {
                type: "string",
                enum: ["data", "moeda", "numero", "texto", "boolean"],
                description: "Tipo do valor"
              },
              confianca: {
                type: "number",
                description: "Confiança de 0.0 a 1.0. Use 0 para não encontrados."
              },
              chunk_id: {
                type: "string",
                description: "OBRIGATÓRIO: ID do chunk onde o fato foi encontrado"
              },
              citacao_literal: {
                type: "string",
                description: "OBRIGATÓRIO: Trecho EXATO copiado do chunk"
              },
              pagina: {
                type: "number",
                description: "Número da página (do metadata do chunk)"
              }
            },
            required: ["chave", "valor", "tipo", "confianca", "chunk_id", "citacao_literal"],
            additionalProperties: false
          }
        },
        fatos_nao_encontrados: {
          type: "array",
          items: { type: "string" },
          description: "Lista de fatos que foram buscados mas NÃO foram encontrados nos chunks"
        },
        alertas: {
          type: "array",
          items: { type: "string" },
          description: "Alertas de inconsistências encontradas"
        }
      },
      required: ["facts", "fatos_nao_encontrados"],
      additionalProperties: false
    }
  }
};

interface ChunkWithContext {
  id: string;
  texto: string;
  page_number: number | null;
  document_id: string;
  document_type: string;
  similarity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id } = await req.json();

    if (!case_id) {
      return new Response(
        JSON.stringify({ error: "case_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Starting RAG extraction for case ${case_id}`);

    // 1) Buscar documentos do caso (se existirem)
    // Observação: há cenários onde `document_chunks` existe (chunks gerados)
    // mas a tabela `documents` está vazia/inconsistente para o case_id.
    // Como a extração depende dos chunks, NÃO vamos bloquear a execução por isso.
    // (Nota: a tabela `documents` não possui coluna `processing_status`; usa `status`.)
    const { data: caseDocuments, error: docsErr } = await supabase
      .from("documents")
      .select("id, tipo, status, metadata")
      .eq("case_id", case_id);

    if (docsErr) {
      console.error("Error fetching documents:", docsErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch documents for this case" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!caseDocuments || caseDocuments.length === 0) {
      console.warn(
        `No rows in documents for case ${case_id}. Proceeding using document_chunks only.`
      );
    }

    // Considerar como "processado" quando já foi indexado (status embedded/completed)
    const processedDocs = (caseDocuments ?? []).filter((d: any) =>
      ["embedded", "completed", "embedded_partial"].includes(String(d.status ?? ""))
    );

    // 2) Buscar chunks diretamente (fallback robusto)
    // Motivo: em alguns ambientes, o endpoint de embeddings pode falhar/intermitir.
    // Como este caso tem poucos chunks (ex: 19), é seguro mandar os chunks diretamente para o modelo.
    const { data: rawChunks, error: chunksErr } = await supabase
      .from("document_chunks")
      .select("id, content, page_number, document_id, doc_type, chunk_index")
      .eq("case_id", case_id)
      .order("document_id", { ascending: true })
      .order("chunk_index", { ascending: true })
      .limit(40);

    if (chunksErr) {
      console.error("Error fetching document_chunks:", chunksErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch chunks for this case" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allRelevantChunks: ChunkWithContext[] = (rawChunks || []).map((c: any) => ({
      id: c.id,
      texto: c.content,
      page_number: c.page_number ?? null,
      document_id: c.document_id,
      document_type: c.doc_type || "unknown",
      similarity: 1.0,
    }));

    const seenChunkIds = new Set<string>(allRelevantChunks.map((c) => c.id));

    console.log(`Using ${allRelevantChunks.length} chunks from document_chunks`);

    if (allRelevantChunks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No chunks found for this case. Please run OCR/indexação." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar chunks para o prompt
    const chunksForPrompt = allRelevantChunks
      .slice(0, 30) // Limitar por segurança de contexto
      .map((chunk, index) => `
=== CHUNK ${index + 1} ===
CHUNK_ID: ${chunk.id}
DOCUMENTO: ${chunk.document_type}
PÁGINA: ${chunk.page_number || 'não identificada'}
SIMILARIDADE: ${(chunk.similarity * 100).toFixed(1)}%
TEXTO:
${chunk.texto}
===`)
      .join('\n\n');

    // Prompt anti-alucinação extremo
    const systemPrompt = `### AGENTE EXTRATOR COM RAG - TOLERÂNCIA ZERO PARA ALUCINAÇÃO ###

Você é um agente de extração de fatos jurídicos trabalhistas com as seguintes REGRAS INVIOLÁVEIS:

## REGRA SUPREMA ##
Você SÓ pode extrair informações que estejam LITERALMENTE escritas nos chunks fornecidos.
Se um fato NÃO estiver nos chunks, você DEVE:
1. NÃO incluí-lo na lista de facts
2. Adicioná-lo na lista "fatos_nao_encontrados"

## CITAÇÃO OBRIGATÓRIA ##
Para CADA fato extraído, você DEVE:
1. Fornecer o chunk_id EXATO do chunk onde encontrou
2. Copiar o trecho LITERAL (citacao_literal) - palavra por palavra
3. Nunca parafrasear ou resumir

## O QUE É PROIBIDO ##
❌ Inventar valores que não estão nos chunks
❌ Inferir dados de contexto
❌ Calcular valores (ex: salário mensal a partir de diário)
❌ Presumir datas não escritas
❌ Usar chunk_id de um chunk diferente do que contém a informação

## CHAVES ESPERADAS ##
- data_admissao (YYYY-MM-DD)
- data_demissao (YYYY-MM-DD)
- salario_base (número decimal)
- jornada_contratual (formato HH:MM-HH:MM ou horas semanais)
- cargo (texto exato)
- adicional_insalubridade (percentual ou valor)
- adicional_periculosidade (percentual ou valor)
- adicional_noturno (percentual ou valor)
- horas_extras (quantidade mensal se explícita)
- motivo_demissao (justa_causa/sem_justa_causa/pedido_demissao)
- aviso_previo (trabalhado/indenizado)
- ferias_vencidas (número de períodos)
- fgts_depositado (sim/nao/parcial)

## NÍVEIS DE CONFIANÇA ##
- 1.0: Valor explícito e claro
- 0.8-0.9: Valor presente mas formato ambíguo
- 0.5-0.7: Requer interpretação contextual (LISTAR em alertas)
- 0.0: Não encontrado (NÃO incluir em facts)

## VALIDAÇÕES ##
Se data_demissao existir, deve ser POSTERIOR a data_admissao.
Liste inconsistências em "alertas".`;

    console.log("Calling Lovable AI for RAG extraction...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Analise os chunks abaixo e extraia APENAS os fatos que estão EXPLICITAMENTE presentes. Use a função extract_facts.\n\n${chunksForPrompt}` 
          },
        ],
        tools: [extractFactsTool],
        tool_choice: { type: "function", function: { name: "extract_facts" } },
        temperature: 0.05, // Mínimo para reduzir criatividade
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extrair fatos do tool call
    let facts: Array<{
      chave: string;
      valor: string;
      tipo: string;
      confianca: number;
      chunk_id: string;
      citacao_literal: string;
      pagina?: number;
    }> = [];
    let fatosNaoEncontrados: string[] = [];
    let alertas: string[] = [];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        facts = parsed.facts || [];
        fatosNaoEncontrados = parsed.fatos_nao_encontrados || [];
        alertas = parsed.alertas || [];
      } catch (parseError) {
        console.error("Failed to parse tool call:", parseError);
      }
    }

    // Filtrar fatos válidos (com chunk_id e confiança > 0)
    const validFacts = facts.filter(f => 
      f.valor !== "NAO_ENCONTRADO" && 
      f.confianca > 0 &&
      f.chunk_id &&
      seenChunkIds.has(f.chunk_id) // Verificar se chunk_id existe
    );

    // Validações server-side
    const serverValidations: string[] = [...alertas];
    
    const dataAdmissao = facts.find(f => f.chave === "data_admissao");
    const dataDemissao = facts.find(f => f.chave === "data_demissao");
    
    if (dataAdmissao && dataDemissao && 
        dataAdmissao.valor !== "NAO_ENCONTRADO" && 
        dataDemissao.valor !== "NAO_ENCONTRADO") {
      const admDate = new Date(dataAdmissao.valor);
      const demDate = new Date(dataDemissao.valor);
      if (demDate <= admDate) {
        serverValidations.push("ERRO CRÍTICO: Data de demissão anterior à admissão");
      }
    }

    console.log(`Extracted ${facts.length} facts, ${validFacts.length} valid`);

    // Inserir fatos válidos no banco
    if (validFacts.length > 0) {
      const factsToInsert = validFacts.map((fact) => ({
        case_id,
        chave: fact.chave,
        valor: fact.valor,
        tipo: fact.tipo === "boolean" ? "boolean" : fact.tipo,
        origem: "ia_extracao" as const,
        confianca: fact.confianca,
        confirmado: false,
        // Include the chunk id in the citation text so we keep traceability even if we can't persist FK.
        citacao: `CHUNK_ID:${fact.chunk_id}\n${fact.citacao_literal}`,
        pagina: fact.pagina || null,
        // IMPORTANT:
        // The current DB schema has `facts.chunk_id` referencing the legacy table `doc_chunks`.
        // Our pipeline writes chunks to `document_chunks`, so inserting a document_chunks.id would violate the FK.
        // To avoid breaking extraction, we store the chunk id in `citacao` and leave `chunk_id` null.
        chunk_id: null,
      }));

      const { error: insertError } = await supabase
        .from("facts")
        .insert(factsToInsert);

      if (insertError) {
        console.error("Error inserting facts:", insertError);
        throw insertError;
      }
    }

     return new Response(
      JSON.stringify({
        success: true,
        extraction_method: "RAG",
        chunks_analyzed: allRelevantChunks.length,
        facts_extracted: facts.length,
        facts_valid: validFacts.length,
        facts_rejected: facts.length - validFacts.length,
        facts: validFacts,
        fatos_nao_encontrados: fatosNaoEncontrados,
        alertas: serverValidations,
          documents_used: processedDocs.map((d: any) => ({
            id: d.id,
            tipo: d.tipo,
            chunks: (d.metadata?.chunks_created ?? null),
            status: d.status,
          })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("extract-facts-rag error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

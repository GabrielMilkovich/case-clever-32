// =====================================================
// EDGE FUNCTION: EXECUTAR TAREFA DE EXTRAÇÃO
// Busca semântica + Agente Extrator anti-alucinação
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedFact {
  chave: string;
  valor: string;
  tipo: "data" | "moeda" | "numero" | "texto" | "boolean";
  chunk_id: string;
  page_number: number;
  quote: string;
  confidence: number;
}

interface ExtractionResult {
  facts: ExtractedFact[];
  not_found: string[];
  warnings: string[];
}

// Função para gerar embedding
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000),
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding || [];
}

// Função de extração anti-alucinação
async function extractFactsFromChunks(
  query: string,
  chunks: Array<{
    chunk_id: string;
    page_number: number;
    content: string;
    doc_type: string;
    similarity: number;
  }>,
  taskType: string,
  apiKey: string
): Promise<ExtractionResult> {
  
  const chunksContext = chunks.map((c, i) => 
    `[CHUNK_${i}|ID:${c.chunk_id}|PÁG:${c.page_number || '?'}|TIPO:${c.doc_type}|SIM:${c.similarity.toFixed(3)}]\n${c.content}\n[/CHUNK_${i}]`
  ).join('\n\n');

  const systemPrompt = `Você é um extrator de fatos jurídicos de ALTA PRECISÃO para cálculos trabalhistas.

REGRAS ABSOLUTAS (VIOLAÇÃO = FALHA):
1. NUNCA invente dados. Se não encontrar, diga "not_found".
2. Todo fato DEVE ter:
   - chunk_id: exatamente o ID do chunk de origem
   - page_number: número da página
   - quote: trecho LITERAL copiado do documento (mínimo 10 palavras)
   - confidence: sua confiança de 0.0 a 1.0

3. Tipos de fatos:
   - data: formato YYYY-MM-DD
   - moeda: apenas números (ex: 1234.56, sem R$)
   - numero: inteiros ou decimais
   - texto: strings
   - boolean: true/false

4. Chaves esperadas por tema:
   ${getExpectedKeys(taskType)}

5. Se um dado aparecer em múltiplos chunks, use o mais recente ou mais confiável.

FORMATO DE RESPOSTA (JSON estrito):
{
  "facts": [
    {
      "chave": "nome_da_chave",
      "valor": "valor_extraído",
      "tipo": "tipo_do_valor",
      "chunk_id": "uuid-do-chunk",
      "page_number": 1,
      "quote": "trecho literal do documento com contexto",
      "confidence": 0.95
    }
  ],
  "not_found": ["chave1", "chave2"],
  "warnings": ["observação1", "observação2"]
}`;

  const userPrompt = `TAREFA: ${taskType}
PERGUNTA: ${query}

CHUNKS RECUPERADOS (use APENAS estes para extrair):
${chunksContext}

Extraia todos os fatos relevantes. Se não encontrar algum dado esperado, liste em "not_found".
Responda APENAS com JSON válido.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 8000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Extraction API error:", errorText);
    throw new Error(`Extraction API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  try {
    const result = JSON.parse(content);
    return {
      facts: result.facts || [],
      not_found: result.not_found || [],
      warnings: result.warnings || [],
    };
  } catch (parseError) {
    console.error("Failed to parse extraction result:", content);
    throw new Error("Failed to parse extraction result as JSON");
  }
}

function getExpectedKeys(taskType: string): string {
  const keysByType: Record<string, string> = {
    vinculo_datas: `
      - data_admissao: data de início do contrato
      - data_demissao: data de término (se houver)
      - cargo: função/cargo exercido
      - empregador: nome da empresa`,
    remuneracao: `
      - salario_base: último salário base
      - salario_inicial: primeiro salário
      - adicional_periculosidade: percentual ou valor
      - adicional_insalubridade: percentual ou grau
      - comissoes: valores de comissões
      - gratificacoes: valores de gratificações`,
    jornada: `
      - horario_entrada: hora de entrada
      - horario_saida: hora de saída
      - intervalo_almoco: duração do intervalo
      - horas_extras_diarias: média de HE
      - dias_trabalhados_semana: dias por semana`,
    fgts: `
      - saldo_fgts: saldo da conta
      - depositos_mensais: valores depositados
      - multa_40: valor da multa se rescisão`,
    beneficios: `
      - vale_transporte: valor diário
      - vale_alimentacao: valor mensal
      - plano_saude: desconto mensal
      - outros_beneficios: lista de benefícios`,
  };
  return keysByType[taskType] || "Extraia todos os fatos relevantes encontrados.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task_id } = await req.json();

    if (!task_id) {
      return new Response(
        JSON.stringify({ error: "task_id is required" }),
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

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar tarefa
    const { data: task, error: taskError } = await supabase
      .from("extraction_tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: "Task not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar permissão
    if (task.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this task" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Running extraction task ${task_id}: ${task.task_type}`);

    // Atualizar status
    await supabase
      .from("extraction_tasks")
      .update({
        status: "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", task_id);

    try {
      // 1. Gerar embedding da query
      const queryEmbedding = await generateEmbedding(task.query, LOVABLE_API_KEY);
      console.log(`Generated query embedding`);

      // 2. Buscar chunks relevantes usando a função de match
      const docTypes = task.filters?.doc_types || null;
      
      const { data: chunks, error: searchError } = await supabase.rpc(
        "match_document_chunks",
        {
          p_case_id: task.case_id,
          p_query_embedding: `[${queryEmbedding.join(',')}]`,
          p_top_k: task.top_k || 20,
          p_doc_types: docTypes,
        }
      );

      if (searchError) {
        console.error("Semantic search error:", searchError);
        throw new Error(`Semantic search failed: ${searchError.message}`);
      }

      console.log(`Found ${chunks?.length || 0} relevant chunks`);

      if (!chunks || chunks.length === 0) {
        await supabase
          .from("extraction_tasks")
          .update({
            status: "done",
            result_json: {
              facts: [],
              not_found: ["Nenhum documento indexado encontrado para este caso"],
              warnings: ["Execute o processamento de documentos primeiro"],
              chunks_searched: 0,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", task_id);

        return new Response(
          JSON.stringify({
            success: true,
            task_id,
            status: "done",
            facts_extracted: 0,
            message: "No indexed documents found for this case",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Executar extração anti-alucinação
      const extractionResult = await extractFactsFromChunks(
        task.query,
        chunks.map((c: any) => ({
          chunk_id: c.chunk_id,
          page_number: c.page_number,
          content: c.content,
          doc_type: c.doc_type || "outro",
          similarity: c.similarity,
        })),
        task.task_type,
        LOVABLE_API_KEY
      );

      console.log(`Extracted ${extractionResult.facts.length} facts, ${extractionResult.not_found.length} not found`);

      // 4. Salvar resultado na tarefa
      await supabase
        .from("extraction_tasks")
        .update({
          status: "done",
          result_json: {
            ...extractionResult,
            chunks_searched: chunks.length,
            extracted_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", task_id);

      // 5. Opcional: Criar registros em fact_evidences para cada fato extraído
      if (extractionResult.facts.length > 0) {
        const evidences = extractionResult.facts.map((fact) => ({
          case_id: task.case_id,
          fact_id: null, // Será preenchido quando o usuário confirmar o fato
          document_id: chunks.find((c: any) => c.chunk_id === fact.chunk_id)?.document_id,
          chunk_id: fact.chunk_id,
          page_number: fact.page_number,
          quote: fact.quote,
          confidence: fact.confidence,
        })).filter(e => e.document_id); // Apenas com document_id válido

        // Não inserir ainda - aguardar confirmação do usuário
        console.log(`Prepared ${evidences.length} evidence records for user confirmation`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          task_id,
          status: "done",
          facts_extracted: extractionResult.facts.length,
          not_found: extractionResult.not_found,
          warnings: extractionResult.warnings,
          chunks_searched: chunks.length,
          message: "Extraction completed. Facts ready for user review.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (extractionError) {
      console.error("Extraction error:", extractionError);
      
      await supabase
        .from("extraction_tasks")
        .update({
          status: "failed",
          error_message: extractionError instanceof Error ? extractionError.message : "Extraction failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", task_id);

      throw extractionError;
    }

  } catch (error) {
    console.error("run-extraction-task error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

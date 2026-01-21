// =====================================================
// AGENTE 1: EXTRATOR DE FATOS JURÍDICOS
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool schema para extração estruturada
const extractFactsTool = {
  type: "function",
  function: {
    name: "extract_facts",
    description: "Extrai fatos jurídicos de documentos trabalhistas e retorna em formato estruturado",
    parameters: {
      type: "object",
      properties: {
        facts: {
          type: "array",
          description: "Lista de fatos extraídos do documento",
          items: {
            type: "object",
            properties: {
              chave: {
                type: "string",
                description: "Identificador do fato (ex: data_admissao, salario_base, jornada_contratual)"
              },
              valor: {
                type: "string",
                description: "Valor extraído como string (datas em YYYY-MM-DD, valores monetários sem R$)"
              },
              tipo: {
                type: "string",
                enum: ["data", "moeda", "numero", "texto", "booleano"],
                description: "Tipo do valor extraído"
              },
              confianca: {
                type: "number",
                description: "Confiança na extração de 0.0 a 1.0"
              },
              contexto: {
                type: "string",
                description: "Trecho do documento onde o fato foi encontrado (opcional)"
              }
            },
            required: ["chave", "valor", "tipo", "confianca"],
            additionalProperties: false
          }
        }
      },
      required: ["facts"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id, document_texts } = await req.json();
    
    if (!case_id || !document_texts || !Array.isArray(document_texts)) {
      return new Response(
        JSON.stringify({ error: "case_id and document_texts are required" }),
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
    const combinedText = document_texts.join("\n\n---DOCUMENTO---\n\n");

    const systemPrompt = `Você é um assistente de extração de fatos jurídicos trabalhistas.

Leia o documento e extraia APENAS:
- Datas (admissão, demissão, eventos como férias, afastamentos)
- Valores monetários (salários, adicionais, gratificações)
- Jornadas (contratual, alegada, intervalos)
- Eventos (afastamentos, promoções, acidentes)

Chaves padrão a utilizar:
- data_admissao, data_demissao
- salario_base, salario_mensal
- adicional_insalubridade, adicional_periculosidade
- jornada_contratual, jornada_alegada
- intervalo_intrajornada
- horas_extras_mensais (média estimada)
- cargo, funcao
- data_ferias_inicio, data_ferias_fim
- motivo_demissao (justa_causa, sem_justa_causa, pedido)

Formate datas como YYYY-MM-DD, valores monetários apenas números (ex: 3200.00).
Atribua confiança alta (>0.8) para dados explícitos, baixa (<0.5) para inferidos.`;

    console.log("Calling Lovable AI for fact extraction with tool calling...");

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
          { role: "user", content: `Analise os seguintes documentos trabalhistas e extraia todos os fatos relevantes:\n\n${combinedText.substring(0, 50000)}` },
        ],
        tools: [extractFactsTool],
        tool_choice: { type: "function", function: { name: "extract_facts" } },
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract facts from tool call response
    let facts: Array<{
      chave: string;
      valor: string;
      tipo: string;
      confianca: number;
      contexto?: string;
    }> = [];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        facts = parsed.facts || [];
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    // Fallback: try parsing content directly
    if (facts.length === 0) {
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          facts = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Failed to parse content as JSON:", parseError);
      }
    }

    console.log(`Extracted ${facts.length} facts`);

    // Insert facts into database
    if (facts.length > 0) {
      const factsToInsert = facts.map((fact) => ({
        case_id,
        chave: fact.chave,
        valor: fact.valor,
        tipo: fact.tipo || "texto",
        origem: "ia_extracao",
        confianca: fact.confianca || 0.8,
        confirmado: false,
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
        facts_extracted: facts.length,
        facts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-facts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

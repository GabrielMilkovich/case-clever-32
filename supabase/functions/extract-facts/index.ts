import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Create Supabase client with user's auth
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Combine document texts
    const combinedText = document_texts.join("\n\n---DOCUMENTO---\n\n");

    const systemPrompt = `Você é um especialista em direito trabalhista brasileiro. Sua tarefa é analisar documentos de um caso trabalhista e extrair fatos estruturados.

Para cada fato encontrado, retorne um objeto JSON com:
- chave: identificador do fato (ex: "data_admissao", "salario_base", "jornada_contratual")
- valor: valor extraído como string (datas em ISO, números com vírgula, textos simples)
- tipo: "data" | "moeda" | "numero" | "texto" | "boolean"
- confianca: número de 0.0 a 1.0 indicando sua confiança na extração

Fatos típicos a extrair:
- Datas: admissão, demissão, início de férias, término de férias
- Valores: salário base, salário mensal, adicionais (insalubridade, periculosidade), horas extras
- Jornadas: jornada contratual, jornada alegada, intervalo intrajornada
- Eventos: promoções, afastamentos, acidentes

Responda APENAS com um array JSON, sem texto adicional.`;

    const userPrompt = `Analise os seguintes documentos trabalhistas e extraia todos os fatos relevantes:\n\n${combinedText.substring(0, 50000)}`;

    console.log("Calling Lovable AI for fact extraction...");

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
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
    const content = aiData.choices?.[0]?.message?.content || "[]";

    console.log("AI response received:", content.substring(0, 500));

    // Parse the JSON response
    let facts: Array<{
      chave: string;
      valor: string;
      tipo: string;
      confianca: number;
    }> = [];

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        facts = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      facts = [];
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

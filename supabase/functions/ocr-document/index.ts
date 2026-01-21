// =====================================================
// EDGE FUNCTION: OCR DE DOCUMENTOS
// Extrai texto usando Vision AI (Google Gemini)
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para extrair texto usando Vision AI
async function extractTextWithVision(
  fileUrl: string,
  mimeType: string,
  apiKey: string
): Promise<{ text: string; pageCount: number; confidence: number }> {
  console.log(`Extracting text from ${mimeType} using Vision AI...`);
  
  // Baixar o arquivo
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    throw new Error(`Failed to download file: ${fileResponse.status}`);
  }
  
  const fileBuffer = await fileResponse.arrayBuffer();
  const base64Data = btoa(
    new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  // Usar Gemini Vision para OCR
  const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Você é um sistema de OCR de alta precisão para documentos trabalhistas brasileiros.

TAREFA: Extraia TODO o texto deste documento de forma estruturada e precisa.

REGRAS OBRIGATÓRIAS:
1. Mantenha EXATAMENTE a formatação original (parágrafos, listas, tabelas, cabeçalhos)
2. Para documentos com múltiplas páginas: marque "--- PÁGINA X ---" antes de cada página
3. Para tabelas: use formato markdown com | para colunas
4. Para texto manuscrito: transcreva e marque com [manuscrito: texto]
5. Para carimbos/assinaturas: marque [carimbo] ou [assinatura]
6. Para valores monetários: mantenha formatação brasileira (R$ 1.234,56)
7. Para datas: mantenha formato brasileiro (DD/MM/AAAA)
8. NÃO resuma, interprete ou omita NADA
9. Se algum texto estiver ilegível: marque [ilegível]
10. Extraia TODOS os números, mesmo de tabelas complexas

Após o texto, adicione:
---METADADOS---
páginas_detectadas: N
confiança_ocr: 0.XX (sua estimativa de 0 a 1)
tipo_documento: (holerite/ctps/contrato/ponto/fgts/peticao/sentenca/outro)

Responda APENAS com o texto extraído e metadados, sem explicações adicionais.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 32000,
      temperature: 0.05, // Muito baixa para máxima precisão
    }),
  });

  if (!visionResponse.ok) {
    const errorText = await visionResponse.text();
    console.error("Vision API error:", errorText);
    throw new Error(`Vision API error: ${visionResponse.status}`);
  }

  const visionData = await visionResponse.json();
  const extractedContent = visionData.choices?.[0]?.message?.content || "";
  
  // Separar texto dos metadados
  const metadataSplit = extractedContent.split("---METADADOS---");
  const text = metadataSplit[0].trim();
  const metadataText = metadataSplit[1] || "";
  
  // Extrair contagem de páginas
  const pageMatches = text.match(/---\s*PÁGINA\s*\d+\s*---/gi) || [];
  let pageCount = pageMatches.length;
  
  // Tentar extrair dos metadados
  const paginasMatch = metadataText.match(/páginas_detectadas:\s*(\d+)/i);
  if (paginasMatch) {
    pageCount = Math.max(pageCount, parseInt(paginasMatch[1], 10));
  }
  pageCount = Math.max(pageCount, 1);
  
  // Extrair confiança
  let confidence = 0.85; // Default
  const confiancaMatch = metadataText.match(/confiança_ocr:\s*([\d.]+)/i);
  if (confiancaMatch) {
    confidence = parseFloat(confiancaMatch[1]);
  }
  
  return { text, pageCount, confidence };
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

    // Buscar documento
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*, cases!inner(criado_por)")
      .eq("id", document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar permissão
    if (document.cases.criado_por !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this document" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se tem URL do arquivo
    let fileUrl = document.arquivo_url;
    if (!fileUrl && document.storage_path) {
      const { data: signedUrlData } = await supabase.storage
        .from("juriscalculo-documents")
        .createSignedUrl(document.storage_path, 3600);
      fileUrl = signedUrlData?.signedUrl;
    }

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "No file URL available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting OCR for document ${document_id}`);

    // Atualizar status
    await supabase
      .from("documents")
      .update({
        status: "ocr_running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    try {
      // Executar OCR
      const mimeType = document.mime_type || "application/pdf";
      const { text, pageCount, confidence } = await extractTextWithVision(
        fileUrl,
        mimeType,
        LOVABLE_API_KEY
      );

      console.log(`OCR completed: ${text.length} chars, ${pageCount} pages, ${confidence} confidence`);

      // Atualizar documento com resultado do OCR
      await supabase
        .from("documents")
        .update({
          status: "ocr_done",
          page_count: pageCount,
          ocr_confidence: confidence,
          updated_at: new Date().toISOString(),
          metadata: {
            ...document.metadata,
            ocr_completed_at: new Date().toISOString(),
            text_length: text.length,
            extracted_text_preview: text.substring(0, 500),
          },
        })
        .eq("id", document_id);

      // Salvar texto extraído em campo temporário ou retornar
      // O texto será usado pela função chunk-and-embed

      return new Response(
        JSON.stringify({
          success: true,
          document_id,
          status: "ocr_done",
          page_count: pageCount,
          text_length: text.length,
          confidence,
          extracted_text: text, // Retornar para a próxima etapa
          message: "OCR completed. Call chunk-and-embed to continue.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (ocrError) {
      console.error("OCR error:", ocrError);
      
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: ocrError instanceof Error ? ocrError.message : "OCR failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document_id);

      throw ocrError;
    }

  } catch (error) {
    console.error("ocr-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

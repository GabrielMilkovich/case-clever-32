// =====================================================
// EDGE FUNCTION: INICIAR PROCESSAMENTO DE DOCUMENTO
// Detecta tipo MIME, agenda OCR se necessário
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tipos que precisam de OCR
const OCR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/tiff",
];

// Tipos que podem ter texto ou precisar OCR
const PDF_MIME_TYPES = ["application/pdf"];

// Tipos de documento
const DOCX_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

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

    const mimeType = document.mime_type || "";
    let newStatus = "processing";
    let processType = "unknown";

    // Determinar tipo de processamento necessário
    if (OCR_MIME_TYPES.includes(mimeType)) {
      newStatus = "ocr_pending";
      processType = "ocr_image";
    } else if (PDF_MIME_TYPES.includes(mimeType)) {
      // PDFs podem ter texto nativo ou ser escaneados
      newStatus = "ocr_pending";
      processType = "ocr_pdf";
    } else if (DOCX_MIME_TYPES.includes(mimeType)) {
      newStatus = "chunk_pending";
      processType = "docx_extract";
    } else {
      // Tipo desconhecido, tentar OCR
      newStatus = "ocr_pending";
      processType = "ocr_fallback";
    }

    console.log(`Document ${document_id}: mime=${mimeType}, processType=${processType}`);

    // Atualizar status do documento
    await supabase
      .from("documents")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...document.metadata,
          process_type: processType,
          process_started_at: new Date().toISOString(),
        },
      })
      .eq("id", document_id);

    // Gerar URL assinada para o arquivo
    const { data: signedUrlData } = await supabase.storage
      .from("juriscalculo-documents")
      .createSignedUrl(document.storage_path, 3600);

    if (!signedUrlData?.signedUrl) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Could not generate signed URL for file",
        })
        .eq("id", document_id);

      return new Response(
        JSON.stringify({ error: "Could not access file in storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar arquivo_url com URL assinada
    await supabase
      .from("documents")
      .update({ arquivo_url: signedUrlData.signedUrl })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        status: newStatus,
        process_type: processType,
        mime_type: mimeType,
        message: `Processing started. Type: ${processType}. Call ocr-document to continue.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("process-document-start error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

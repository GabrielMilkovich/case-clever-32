// =====================================================
// EDGE FUNCTION: OCR via Mistral OCR API
// Uses mistral-ocr-latest for high-quality document OCR
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr";

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

/**
 * Call Mistral OCR API with a document URL or base64 data.
 * Returns markdown text extracted from all pages.
 */
export async function callMistralOCR(
  fileUrl: string | null,
  base64Data: string | null,
  mimeType: string,
  apiKey: string
): Promise<{ text: string; pageCount: number }> {
  let document: any;

  if (fileUrl && !base64Data) {
    // Try URL-based first (works for publicly accessible URLs)
    const isPdf = mimeType === "application/pdf" || (fileUrl || "").toLowerCase().includes(".pdf");
    if (isPdf) {
      document = { type: "document_url", document_url: fileUrl };
    } else {
      document = { type: "image_url", image_url: fileUrl };
    }
  } else if (base64Data) {
    // Use base64 upload
    const isPdf = mimeType === "application/pdf";
    if (isPdf) {
      // Mistral OCR accepts base64 PDF via upload endpoint
      // We need to upload first then reference
      // For now use the files API approach
      const uploadResp = await fetch("https://api.mistral.ai/v1/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
        body: (() => {
          const formData = new FormData();
          const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: mimeType });
          formData.append("file", blob, "document.pdf");
          formData.append("purpose", "ocr");
          return formData;
        })(),
      });

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        console.error("[MISTRAL-OCR] Upload failed:", uploadResp.status, errText);
        throw new Error(`Mistral file upload failed: ${uploadResp.status}`);
      }

      const uploadData = await uploadResp.json();
      console.log("[MISTRAL-OCR] File uploaded:", uploadData.id);

      // Wait a moment for file to be processed
      await new Promise(r => setTimeout(r, 1000));

      // Get signed URL for the uploaded file
      const signedResp = await fetch(`https://api.mistral.ai/v1/files/${uploadData.id}/url?expiry=300`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${apiKey}` },
      });

      if (!signedResp.ok) {
        const errText = await signedResp.text();
        console.error("[MISTRAL-OCR] Signed URL failed:", signedResp.status, errText);
        throw new Error(`Mistral signed URL failed: ${signedResp.status}`);
      }

      const signedData = await signedResp.json();
      document = { type: "document_url", document_url: signedData.url };
    } else {
      // Image: use data URL
      document = { type: "image_url", image_url: `data:${mimeType};base64,${base64Data}` };
    }
  } else {
    throw new Error("Either fileUrl or base64Data must be provided");
  }

  console.log("[MISTRAL-OCR] Calling OCR API with document type:", document.type);

  const response = await fetch(MISTRAL_OCR_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document,
      include_image_base64: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[MISTRAL-OCR] API error:", response.status, errText);
    throw new Error(`Mistral OCR API error ${response.status}: ${errText.substring(0, 200)}`);
  }

  const result = await response.json();
  
  // Mistral OCR returns pages array with markdown content
  const pages = result.pages || [];
  const pageCount = pages.length || 1;
  
  // Combine all pages into a single markdown text
  const text = pages.map((page: any, idx: number) => {
    const header = pages.length > 1 ? `--- PÁGINA ${idx + 1} ---\n` : "";
    return header + (page.markdown || page.text || "");
  }).join("\n\n");

  console.log(`[MISTRAL-OCR] Extracted ${text.length} chars from ${pageCount} pages`);

  return { text, pageCount };
}

// Standalone endpoint for direct OCR calls
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url, base64_data, mime_type } = await req.json();

    if (!file_url && !base64_data) {
      return new Response(
        JSON.stringify({ error: "file_url or base64_data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }

    const mimeType = mime_type || "application/pdf";
    const result = await callMistralOCR(file_url, base64_data, mimeType, MISTRAL_API_KEY);

    return new Response(
      JSON.stringify({
        success: true,
        text: result.text,
        page_count: result.pageCount,
        text_length: result.text.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[MISTRAL-OCR] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

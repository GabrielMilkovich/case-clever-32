-- Substituir função match_document_chunks com nova assinatura
DROP FUNCTION IF EXISTS public.match_document_chunks(vector, float, int, uuid, text);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_case_id uuid,
  p_query_embedding vector(1536),
  p_top_k int,
  p_doc_types text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  page_number int,
  content text,
  doc_type text,
  similarity numeric
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dc.id AS chunk_id,
    dc.document_id,
    dc.page_number,
    dc.content,
    dc.doc_type,
    (1 - (dc.embedding <=> p_query_embedding))::numeric AS similarity
  FROM document_chunks dc
  WHERE dc.case_id = p_case_id
    AND dc.embedding IS NOT NULL
    AND (p_doc_types IS NULL OR dc.doc_type = ANY(p_doc_types))
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_top_k;
$$;
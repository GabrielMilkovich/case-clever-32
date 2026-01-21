-- Move vector extension out of public schema (security linter)
ALTER EXTENSION vector SET SCHEMA extensions;

-- Recreate view as security invoker (avoid SECURITY DEFINER)
DROP VIEW IF EXISTS public.case_processing_stats;

CREATE VIEW public.case_processing_stats
WITH (security_invoker=on)
AS
SELECT c.id AS case_id,
  c.criado_por AS owner_id,
  count(d.id) AS total_documents,
  count(d.id) FILTER (WHERE d.status = 'embedded'::text) AS indexed_documents,
  count(d.id) FILTER (WHERE d.status = ANY (ARRAY['uploaded'::text, 'pending'::text])) AS pending_documents,
  count(d.id) FILTER (WHERE d.status = 'processing'::text) AS processing_documents,
  count(d.id) FILTER (WHERE d.status = 'failed'::text) AS failed_documents,
  COALESCE(sum(dc.chunk_count), 0::numeric) AS total_chunks,
  max(d.processing_completed_at) AS last_processed_at
FROM cases c
LEFT JOIN documents d ON d.case_id = c.id
LEFT JOIN (
  SELECT document_chunks.document_id,
    count(*) AS chunk_count
  FROM document_chunks
  WHERE document_chunks.embedding IS NOT NULL
  GROUP BY document_chunks.document_id
) dc ON dc.document_id = d.id
WHERE c.criado_por = auth.uid()
GROUP BY c.id, c.criado_por;

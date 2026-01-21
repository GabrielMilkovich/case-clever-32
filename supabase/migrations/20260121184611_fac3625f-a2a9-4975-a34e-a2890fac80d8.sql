-- Fix Security Definer View - recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.case_processing_stats;

CREATE VIEW public.case_processing_stats AS
SELECT 
  c.id as case_id,
  c.criado_por as owner_id,
  COUNT(d.id) as total_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'embedded') as indexed_documents,
  COUNT(d.id) FILTER (WHERE d.status IN ('uploaded', 'pending')) as pending_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'processing') as processing_documents,
  COUNT(d.id) FILTER (WHERE d.status = 'failed') as failed_documents,
  COALESCE(SUM(dc.chunk_count), 0) as total_chunks,
  MAX(d.processing_completed_at) as last_processed_at
FROM cases c
LEFT JOIN documents d ON d.case_id = c.id
LEFT JOIN (
  SELECT document_id, COUNT(*) as chunk_count
  FROM document_chunks
  WHERE embedding IS NOT NULL
  GROUP BY document_id
) dc ON dc.document_id = d.id
WHERE c.criado_por = auth.uid()
GROUP BY c.id, c.criado_por;

-- Grant access to the view
GRANT SELECT ON public.case_processing_stats TO authenticated;
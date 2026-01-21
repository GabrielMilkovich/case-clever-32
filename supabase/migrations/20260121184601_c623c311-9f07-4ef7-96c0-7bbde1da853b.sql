-- =====================================================
-- MIGRATION: PERFORMANCE - FILA DE DOCUMENTOS E CONTROLES
-- =====================================================

-- 1. Adicionar campo de prioridade e processamento em lote aos documentos
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS queue_priority integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS queued_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS processing_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS processing_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3;

-- 2. Criar enum para status de processamento mais granular
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processing_status') THEN
    CREATE TYPE public.processing_status AS ENUM (
      'pending',
      'queued',
      'processing',
      'chunking',
      'embedding',
      'completed',
      'failed',
      'retrying'
    );
  END IF;
END$$;

-- 3. Tabela de controle de fila de processamento
CREATE TABLE IF NOT EXISTS public.document_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  priority integer DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Índices para performance da fila
CREATE INDEX IF NOT EXISTS idx_document_queue_status ON public.document_queue(status);
CREATE INDEX IF NOT EXISTS idx_document_queue_priority ON public.document_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_document_queue_case ON public.document_queue(case_id);

-- RLS para document_queue
ALTER TABLE public.document_queue ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver a fila dos seus casos
CREATE POLICY "Users can view their document queue"
ON public.document_queue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = document_queue.case_id
    AND c.criado_por = auth.uid()
  )
);

-- 4. Adicionar configurações de extração na tarefa
ALTER TABLE public.extraction_tasks
ADD COLUMN IF NOT EXISTS top_k integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS similarity_threshold numeric DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS processing_time_ms integer,
ADD COLUMN IF NOT EXISTS chunks_analyzed integer;

-- 5. Índices para otimizar busca por doc_type nos chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_type ON public.document_chunks(doc_type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_case_doc_type ON public.document_chunks(case_id, doc_type);

-- 6. Índice parcial para chunks com embedding (acelera busca vetorial)
CREATE INDEX IF NOT EXISTS idx_document_chunks_has_embedding 
ON public.document_chunks(case_id) 
WHERE embedding IS NOT NULL;

-- 7. Função helper para enfileirar documentos de um caso
CREATE OR REPLACE FUNCTION public.queue_case_documents(
  p_case_id uuid,
  p_priority integer DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  queued_count integer;
BEGIN
  -- Inserir documentos pendentes na fila
  INSERT INTO document_queue (document_id, case_id, priority)
  SELECT d.id, d.case_id, p_priority
  FROM documents d
  WHERE d.case_id = p_case_id
    AND (d.status IS NULL OR d.status IN ('uploaded', 'failed'))
    AND NOT EXISTS (
      SELECT 1 FROM document_queue q
      WHERE q.document_id = d.id
      AND q.status IN ('pending', 'processing')
    );
    
  GET DIAGNOSTICS queued_count = ROW_COUNT;
  RETURN queued_count;
END;
$$;

-- 8. Função para obter próximo documento da fila (por prioridade)
CREATE OR REPLACE FUNCTION public.get_next_queued_document()
RETURNS TABLE (
  queue_id uuid,
  document_id uuid,
  case_id uuid,
  priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE document_queue q
  SET status = 'processing',
      started_at = now()
  WHERE q.id = (
    SELECT sq.id
    FROM document_queue sq
    WHERE sq.status = 'pending'
    ORDER BY sq.priority DESC, sq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.id, q.document_id, q.case_id, q.priority;
END;
$$;

-- 9. View para estatísticas de processamento por caso
CREATE OR REPLACE VIEW public.case_processing_stats AS
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
GROUP BY c.id, c.criado_por;

-- Grant access to the view
GRANT SELECT ON public.case_processing_stats TO authenticated;
-- Adicionar colunas extras à tabela documents existente
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS owner_user_id uuid,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS page_count int,
ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Atualizar owner_user_id com base no case
UPDATE public.documents d
SET owner_user_id = c.criado_por
FROM public.cases c
WHERE d.case_id = c.id AND d.owner_user_id IS NULL;

-- Índices para documents
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- Renomear doc_chunks para document_chunks e adicionar colunas
-- Primeiro criar a nova tabela document_chunks
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number int,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  content_hash text,
  doc_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migrar dados de doc_chunks para document_chunks se existirem
INSERT INTO public.document_chunks (id, document_id, content, metadata, embedding, created_at)
SELECT dc.id, dc.document_id, dc.texto, dc.metadata, dc.embedding::vector(1536), now()
FROM public.doc_chunks dc
ON CONFLICT (id) DO NOTHING;

-- Adicionar case_id aos chunks migrados
UPDATE public.document_chunks dc
SET case_id = d.case_id
FROM public.documents d
WHERE dc.document_id = d.id AND dc.case_id IS NULL;

-- Índices para document_chunks
CREATE INDEX IF NOT EXISTS idx_chunks_case ON public.document_chunks(case_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doctype ON public.document_chunks(doc_type);

-- Índice vetorial IVFFlat para busca por similaridade
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON public.document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Tabela de evidências (vínculo entre facts e origem documental)
CREATE TABLE IF NOT EXISTS public.fact_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  fact_id uuid NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_id uuid NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  page_number int,
  quote text NOT NULL,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_evidences_case ON public.fact_evidences(case_id);
CREATE INDEX IF NOT EXISTS idx_fact_evidences_fact ON public.fact_evidences(fact_id);

-- Tabela de tarefas de extração (processamento assíncrono por tema)
CREATE TABLE IF NOT EXISTS public.extraction_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  task_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  query text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_k int NOT NULL DEFAULT 20,
  result_json jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_tasks_case ON public.extraction_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_extraction_tasks_status ON public.extraction_tasks(status);

-- RLS para document_chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of their cases"
ON public.document_chunks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = document_chunks.case_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert chunks to their cases"
ON public.document_chunks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = document_chunks.case_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete chunks of their cases"
ON public.document_chunks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = document_chunks.case_id AND c.criado_por = auth.uid()
));

-- RLS para fact_evidences
ALTER TABLE public.fact_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidences of their cases"
ON public.fact_evidences FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = fact_evidences.case_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert evidences to their cases"
ON public.fact_evidences FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = fact_evidences.case_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete evidences of their cases"
ON public.fact_evidences FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases c
  WHERE c.id = fact_evidences.case_id AND c.criado_por = auth.uid()
));

-- RLS para extraction_tasks
ALTER TABLE public.extraction_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their extraction tasks"
ON public.extraction_tasks FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their extraction tasks"
ON public.extraction_tasks FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their extraction tasks"
ON public.extraction_tasks FOR UPDATE
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their extraction tasks"
ON public.extraction_tasks FOR DELETE
USING (owner_user_id = auth.uid());

-- Função de busca semântica otimizada
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_case_id uuid DEFAULT NULL,
  filter_doc_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  case_id uuid,
  document_id uuid,
  page_number int,
  chunk_index int,
  content text,
  doc_type text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.case_id,
    dc.document_id,
    dc.page_number,
    dc.chunk_index,
    dc.content,
    dc.doc_type,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE 
    (filter_case_id IS NULL OR dc.case_id = filter_case_id)
    AND (filter_doc_type IS NULL OR dc.doc_type = filter_doc_type)
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
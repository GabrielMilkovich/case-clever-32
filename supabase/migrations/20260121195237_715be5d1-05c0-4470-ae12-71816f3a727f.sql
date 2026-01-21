-- Add missing metadata column used across document pipeline
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Helpful index for querying by processing progress fields in metadata (optional)
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin
ON public.documents
USING GIN (metadata);

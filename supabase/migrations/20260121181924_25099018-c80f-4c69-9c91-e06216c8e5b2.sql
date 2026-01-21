-- Criar bucket privado para documentos jurídicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'juriscalculo-documents',
  'juriscalculo-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Apenas dono do caso pode fazer upload
CREATE POLICY "Users can upload documents to their cases"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'juriscalculo-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Apenas dono do caso pode visualizar
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'juriscalculo-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Apenas dono pode deletar
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'juriscalculo-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Apenas dono pode atualizar
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'juriscalculo-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
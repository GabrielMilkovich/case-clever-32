-- =====================================================
-- MÓDULO 5A: COMPLETAR SETUP RAG
-- =====================================================

-- Adicionar chunk_id na tabela facts para rastreabilidade
ALTER TABLE facts ADD COLUMN IF NOT EXISTS chunk_id uuid REFERENCES doc_chunks(id);

-- Policy para permitir INSERT de chunks para documentos de casos do usuário
DROP POLICY IF EXISTS "Users can insert chunks to their documents" ON doc_chunks;
CREATE POLICY "Users can insert chunks to their documents"
ON doc_chunks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.id = doc_chunks.document_id 
    AND c.criado_por = auth.uid()
  )
);

-- Policy para permitir DELETE de chunks para documentos de casos do usuário
DROP POLICY IF EXISTS "Users can delete chunks of their documents" ON doc_chunks;
CREATE POLICY "Users can delete chunks of their documents"
ON doc_chunks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM documents d
    JOIN cases c ON c.id = d.case_id
    WHERE d.id = doc_chunks.document_id 
    AND c.criado_por = auth.uid()
  )
);

-- Policy para UPDATE nos documentos
DROP POLICY IF EXISTS "Users can update their documents" ON documents;
CREATE POLICY "Users can update their documents"
ON documents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = documents.case_id 
    AND cases.criado_por = auth.uid()
  )
);
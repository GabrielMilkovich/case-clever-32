-- Create status enum for cases
CREATE TYPE public.case_status AS ENUM ('rascunho', 'em_analise', 'calculado', 'revisado');

-- Create document type enum
CREATE TYPE public.doc_type AS ENUM ('peticao', 'trct', 'holerite', 'cartao_ponto', 'sentenca', 'outro');

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Cases table
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente TEXT NOT NULL,
  numero_processo TEXT,
  status case_status DEFAULT 'rascunho',
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  tipo doc_type DEFAULT 'outro',
  arquivo_url TEXT,
  hash TEXT,
  uploaded_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document chunks for RAG
CREATE TABLE public.doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  texto TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536)
);

-- Enable RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cases (users can only see their own cases)
CREATE POLICY "Users can view their own cases"
ON public.cases FOR SELECT
USING (auth.uid() = criado_por);

CREATE POLICY "Users can create their own cases"
ON public.cases FOR INSERT
WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Users can update their own cases"
ON public.cases FOR UPDATE
USING (auth.uid() = criado_por);

CREATE POLICY "Users can delete their own cases"
ON public.cases FOR DELETE
USING (auth.uid() = criado_por);

-- RLS Policies for documents (through case ownership)
CREATE POLICY "Users can view documents of their cases"
ON public.documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases 
  WHERE cases.id = documents.case_id 
  AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can insert documents to their cases"
ON public.documents FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases 
  WHERE cases.id = documents.case_id 
  AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can delete documents from their cases"
ON public.documents FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases 
  WHERE cases.id = documents.case_id 
  AND cases.criado_por = auth.uid()
));

-- RLS Policies for doc_chunks (through document/case ownership)
CREATE POLICY "Users can view chunks of their documents"
ON public.doc_chunks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.documents d
  JOIN public.cases c ON c.id = d.case_id
  WHERE d.id = doc_chunks.document_id 
  AND c.criado_por = auth.uid()
));

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('case-documents', 'case-documents', false);

-- Storage policies
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'case-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'case-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
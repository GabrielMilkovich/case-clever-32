-- Enum for fact types
CREATE TYPE public.fact_type AS ENUM ('data', 'moeda', 'numero', 'texto', 'boolean');

-- Enum for fact origin
CREATE TYPE public.fact_origem AS ENUM ('ia_extracao', 'usuario', 'documento');

-- Facts table - stores extracted information from documents
CREATE TABLE public.facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  chave text NOT NULL,
  valor text NOT NULL,
  tipo public.fact_type NOT NULL DEFAULT 'texto',
  origem public.fact_origem NOT NULL DEFAULT 'usuario',
  confianca float CHECK (confianca >= 0.0 AND confianca <= 1.0),
  confirmado boolean DEFAULT false,
  confirmado_por uuid,
  confirmado_em timestamp with time zone,
  criado_em timestamp with time zone DEFAULT now()
);

-- Fact sources table - links facts to document excerpts
CREATE TABLE public.fact_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id uuid NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  pagina int,
  trecho text
);

-- Enable RLS
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies for facts (via case ownership)
CREATE POLICY "Users can view facts of their cases"
ON public.facts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = facts.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can insert facts to their cases"
ON public.facts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = facts.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can update facts of their cases"
ON public.facts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = facts.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can delete facts of their cases"
ON public.facts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = facts.case_id AND cases.criado_por = auth.uid()
));

-- RLS policies for fact_sources (via fact -> case ownership)
CREATE POLICY "Users can view fact sources of their cases"
ON public.fact_sources FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.facts f
  JOIN public.cases c ON c.id = f.case_id
  WHERE f.id = fact_sources.fact_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can insert fact sources to their cases"
ON public.fact_sources FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.facts f
  JOIN public.cases c ON c.id = f.case_id
  WHERE f.id = fact_sources.fact_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete fact sources of their cases"
ON public.fact_sources FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.facts f
  JOIN public.cases c ON c.id = f.case_id
  WHERE f.id = fact_sources.fact_id AND c.criado_por = auth.uid()
));

-- Index for faster lookups
CREATE INDEX idx_facts_case_id ON public.facts(case_id);
CREATE INDEX idx_facts_chave ON public.facts(chave);
CREATE INDEX idx_fact_sources_fact_id ON public.fact_sources(fact_id);
CREATE INDEX idx_fact_sources_document_id ON public.fact_sources(document_id);
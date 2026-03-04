
-- ============================================
-- A1) DocumentPipeline: ingestão robusta
-- ============================================

-- Tipos de documento para pipeline
CREATE TYPE public.pipeline_doc_type AS ENUM (
  'CTPS', 'CARTAO_PONTO', 'FICHA_FINANCEIRA', 'CONTRACHEQUE', 'PJC', 'OUTRO'
);

CREATE TYPE public.extracao_status AS ENUM (
  'AUTO', 'REVISAR', 'CONFIRMADO', 'REJEITADO'
);

-- Tabela principal do pipeline
CREATE TABLE public.document_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  pipeline_type pipeline_doc_type NOT NULL DEFAULT 'OUTRO',
  hash TEXT,
  pages_count INTEGER,
  empresa_detectada TEXT,
  template_detectado TEXT,
  template_version TEXT,
  periodo_detectado_inicio DATE,
  periodo_detectado_fim DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  validation_warnings JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens de extração individuais
CREATE TABLE public.extracao_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.document_pipeline(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  field_key TEXT NOT NULL,
  valor TEXT,
  confidence NUMERIC(5,4),
  page INTEGER,
  evidence_text TEXT,
  bbox JSONB,
  source_doc_id UUID REFERENCES public.documents(id),
  status extracao_status NOT NULL DEFAULT 'AUTO',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  target_table TEXT,
  target_field TEXT,
  competencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mapeamento de rubricas versionado
CREATE TABLE public.rubrica_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_pattern TEXT,
  codigo_original TEXT NOT NULL,
  descricao_original TEXT NOT NULL,
  rubrica_destino TEXT NOT NULL,
  categoria TEXT,
  regex_pattern TEXT,
  is_pgto BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_pattern, codigo_original, descricao_original, version)
);

-- Conflitos entre fontes documentais
CREATE TABLE public.fonte_conflito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  competencia TEXT NOT NULL,
  campo TEXT NOT NULL,
  valor_fonte_a TEXT,
  fonte_a_doc_id UUID REFERENCES public.documents(id),
  valor_fonte_b TEXT,
  fonte_b_doc_id UUID REFERENCES public.documents(id),
  valor_escolhido TEXT,
  resolvido_por UUID,
  resolvido_em TIMESTAMPTZ,
  justificativa TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.document_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracao_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrica_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fonte_conflito ENABLE ROW LEVEL SECURITY;

-- Policies para document_pipeline
CREATE POLICY "Users can manage own pipeline docs" ON public.document_pipeline
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policies para extracao_item (via pipeline ownership)
CREATE POLICY "Users can manage extraction items" ON public.extracao_item
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.document_pipeline dp WHERE dp.id = extracao_item.pipeline_id AND dp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.document_pipeline dp WHERE dp.id = extracao_item.pipeline_id AND dp.user_id = auth.uid()));

-- rubrica_map is shared (read all, write authenticated)
CREATE POLICY "Anyone can read rubrica maps" ON public.rubrica_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert rubrica maps" ON public.rubrica_map FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update rubrica maps" ON public.rubrica_map FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- fonte_conflito via case ownership
CREATE POLICY "Users can manage conflicts" ON public.fonte_conflito
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = fonte_conflito.case_id AND c.criado_por = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = fonte_conflito.case_id AND c.criado_por = auth.uid()));

-- Indexes
CREATE INDEX idx_document_pipeline_case ON public.document_pipeline(case_id);
CREATE INDEX idx_document_pipeline_doc ON public.document_pipeline(document_id);
CREATE INDEX idx_extracao_item_pipeline ON public.extracao_item(pipeline_id);
CREATE INDEX idx_extracao_item_case ON public.extracao_item(case_id);
CREATE INDEX idx_extracao_item_status ON public.extracao_item(status);
CREATE INDEX idx_rubrica_map_empresa ON public.rubrica_map(empresa_pattern);
CREATE INDEX idx_fonte_conflito_case ON public.fonte_conflito(case_id);

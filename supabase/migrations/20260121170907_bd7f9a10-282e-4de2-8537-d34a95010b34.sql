-- Index series - economic indices (IPCA-E, INPC, Selic, etc.)
CREATE TABLE public.index_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  competencia date NOT NULL,
  valor numeric(10,6) NOT NULL,
  fonte text,
  versao int DEFAULT 1,
  criado_em timestamp with time zone DEFAULT now()
);

-- Tax tables - INSS/IRRF brackets by period
CREATE TABLE public.tax_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  faixas jsonb NOT NULL DEFAULT '[]',
  criado_em timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.index_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_tables ENABLE ROW LEVEL SECURITY;

-- Public read for authenticated users (reference data)
CREATE POLICY "Authenticated users can view index series"
ON public.index_series FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view tax tables"
ON public.tax_tables FOR SELECT
TO authenticated
USING (true);

-- Indexes for fast lookups
CREATE INDEX idx_index_series_nome ON public.index_series(nome);
CREATE INDEX idx_index_series_competencia ON public.index_series(competencia);
CREATE INDEX idx_index_series_lookup ON public.index_series(nome, competencia);
CREATE UNIQUE INDEX idx_index_series_unique ON public.index_series(nome, competencia, versao);

CREATE INDEX idx_tax_tables_tipo ON public.tax_tables(tipo);
CREATE INDEX idx_tax_tables_vigencia ON public.tax_tables(vigencia_inicio, vigencia_fim);
CREATE INDEX idx_tax_tables_lookup ON public.tax_tables(tipo, vigencia_inicio);
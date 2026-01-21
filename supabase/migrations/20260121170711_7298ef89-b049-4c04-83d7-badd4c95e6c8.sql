-- Calculators table - available calculation formulas
CREATE TABLE public.calculators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  categoria text NOT NULL,
  descricao text,
  inputs_esperados jsonb DEFAULT '{}',
  outputs jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now()
);

-- Calculator versions table - versioned rules when laws change
CREATE TABLE public.calculator_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculator_id uuid NOT NULL REFERENCES public.calculators(id) ON DELETE CASCADE,
  versao text NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  regras jsonb DEFAULT '{}',
  codigo_ref text,
  changelog text,
  ativo boolean DEFAULT true,
  criado_por uuid,
  criado_em timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calculators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_versions ENABLE ROW LEVEL SECURITY;

-- Calculators are PUBLIC READ (all authenticated users can see them)
CREATE POLICY "Authenticated users can view active calculators"
ON public.calculators FOR SELECT
TO authenticated
USING (ativo = true);

-- Calculator versions are also PUBLIC READ
CREATE POLICY "Authenticated users can view calculator versions"
ON public.calculator_versions FOR SELECT
TO authenticated
USING (ativo = true);

-- Only admins/system can insert/update calculators (via service role)
-- No insert/update/delete policies for regular users

-- Indexes for performance
CREATE INDEX idx_calculators_nome ON public.calculators(nome);
CREATE INDEX idx_calculators_categoria ON public.calculators(categoria);
CREATE INDEX idx_calculator_versions_calculator_id ON public.calculator_versions(calculator_id);
CREATE INDEX idx_calculator_versions_vigencia ON public.calculator_versions(vigencia_inicio, vigencia_fim);

-- Unique constraint: one version per calculator per validity period
CREATE UNIQUE INDEX idx_calculator_version_unique ON public.calculator_versions(calculator_id, versao);
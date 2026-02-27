
-- Multas CLT (Art. 467 e 477)
CREATE TABLE IF NOT EXISTS public.pjecalc_multas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar_467 BOOLEAN DEFAULT false,
  valor_467 NUMERIC DEFAULT 0,
  apurar_477 BOOLEAN DEFAULT false,
  valor_477_tipo TEXT DEFAULT 'salario',
  valor_477_informado NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Salário-Família config
CREATE TABLE IF NOT EXISTS public.pjecalc_salario_familia_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar BOOLEAN DEFAULT false,
  numero_filhos INT DEFAULT 0,
  filhos_detalhes JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pensão Alimentícia config
CREATE TABLE IF NOT EXISTS public.pjecalc_pensao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar BOOLEAN DEFAULT false,
  percentual NUMERIC DEFAULT 0,
  valor_fixo NUMERIC,
  base TEXT DEFAULT 'liquido',
  beneficiario TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add case_id to existing verba_ocorrencias if missing
ALTER TABLE public.pjecalc_verba_ocorrencias ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE;

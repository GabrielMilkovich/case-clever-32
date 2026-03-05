
-- Table: sentenca_rulesets (rules from court decisions for worktime adjustment)
CREATE TABLE public.sentenca_rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Regra da Sentença',
  texto_sentenca TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  date_range_start DATE,
  date_range_end DATE,
  apply_days TEXT[] DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sentenca_rulesets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their case rulesets" ON public.sentenca_rulesets FOR ALL USING (true) WITH CHECK (true);

-- Table: worktime_adjustments (adjusted daily records with audit trail)
CREATE TABLE public.worktime_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  ponto_diario_id UUID,
  data DATE NOT NULL,
  original_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  adjusted_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied_rules UUID[] DEFAULT '{}',
  horas_trabalhadas_original NUMERIC(6,2) DEFAULT 0,
  horas_trabalhadas_ajustadas NUMERIC(6,2) DEFAULT 0,
  extras_diarias NUMERIC(6,2) DEFAULT 0,
  flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, data)
);

ALTER TABLE public.worktime_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage worktime adjustments" ON public.worktime_adjustments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_worktime_adjustments_case_date ON public.worktime_adjustments(case_id, data);
CREATE INDEX idx_sentenca_rulesets_case ON public.sentenca_rulesets(case_id);

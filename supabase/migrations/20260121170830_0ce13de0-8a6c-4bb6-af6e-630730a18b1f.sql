-- Calculation runs - each calculation execution
CREATE TABLE public.calculation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.calculation_profiles(id) ON DELETE SET NULL,
  facts_snapshot jsonb DEFAULT '{}',
  calculators_used jsonb DEFAULT '{}',
  resultado_bruto jsonb DEFAULT '{}',
  resultado_liquido jsonb DEFAULT '{}',
  warnings jsonb DEFAULT '[]',
  executado_em timestamp with time zone DEFAULT now(),
  executado_por uuid
);

-- Audit lines - line-by-line calculation memory
CREATE TABLE public.audit_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.calculation_runs(id) ON DELETE CASCADE,
  calculadora text NOT NULL,
  competencia text,
  linha int NOT NULL,
  descricao text,
  formula text,
  valor_bruto numeric(12,2),
  valor_liquido numeric(12,2),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.calculation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_lines ENABLE ROW LEVEL SECURITY;

-- RLS for calculation_runs (via case ownership)
CREATE POLICY "Users can view runs of their cases"
ON public.calculation_runs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = calculation_runs.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can create runs for their cases"
ON public.calculation_runs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = calculation_runs.case_id AND cases.criado_por = auth.uid()
));

CREATE POLICY "Users can delete runs of their cases"
ON public.calculation_runs FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.cases
  WHERE cases.id = calculation_runs.case_id AND cases.criado_por = auth.uid()
));

-- RLS for audit_lines (via run -> case ownership)
CREATE POLICY "Users can view audit lines of their runs"
ON public.audit_lines FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.calculation_runs r
  JOIN public.cases c ON c.id = r.case_id
  WHERE r.id = audit_lines.run_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can create audit lines for their runs"
ON public.audit_lines FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.calculation_runs r
  JOIN public.cases c ON c.id = r.case_id
  WHERE r.id = audit_lines.run_id AND c.criado_por = auth.uid()
));

CREATE POLICY "Users can delete audit lines of their runs"
ON public.audit_lines FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.calculation_runs r
  JOIN public.cases c ON c.id = r.case_id
  WHERE r.id = audit_lines.run_id AND c.criado_por = auth.uid()
));

-- Indexes for performance
CREATE INDEX idx_calculation_runs_case_id ON public.calculation_runs(case_id);
CREATE INDEX idx_calculation_runs_profile_id ON public.calculation_runs(profile_id);
CREATE INDEX idx_calculation_runs_executado_em ON public.calculation_runs(executado_em DESC);
CREATE INDEX idx_audit_lines_run_id ON public.audit_lines(run_id);
CREATE INDEX idx_audit_lines_calculadora ON public.audit_lines(calculadora);
CREATE INDEX idx_audit_lines_competencia ON public.audit_lines(competencia);
CREATE INDEX idx_audit_lines_ordem ON public.audit_lines(run_id, linha);
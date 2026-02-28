
CREATE TABLE IF NOT EXISTS public.pjecalc_parametros_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  data_inicial DATE,
  data_final DATE,
  valor_booleano BOOLEAN DEFAULT false,
  valor_numerico NUMERIC,
  valor_texto TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pjecalc_parametros_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their case extras"
  ON public.pjecalc_parametros_extras
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_pjecalc_parametros_extras_case ON public.pjecalc_parametros_extras(case_id, tipo);

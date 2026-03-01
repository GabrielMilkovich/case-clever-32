
-- Add metadata columns to pjecalc_ocorrencias for enhanced audit trail
ALTER TABLE public.pjecalc_ocorrencias 
  ADD COLUMN IF NOT EXISTS parametros_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verba_principal_id uuid,
  ADD COLUMN IF NOT EXISTS tipo_fracao text DEFAULT 'manter_fracao';

-- Add fracao_mes_modo to pjecalc_verbas for fraction handling
ALTER TABLE public.pjecalc_verbas
  ADD COLUMN IF NOT EXISTS fracao_mes_modo text DEFAULT 'manter_fracao';

-- Comment for documentation
COMMENT ON COLUMN public.pjecalc_ocorrencias.parametros_json IS 'Snapshot of parameters used to generate this occurrence';
COMMENT ON COLUMN public.pjecalc_ocorrencias.verba_principal_id IS 'Link to parent verba for reflexa occurrences';
COMMENT ON COLUMN public.pjecalc_ocorrencias.tipo_fracao IS 'Fraction mode: manter_fracao, integralizar, desprezar, desprezar_menor_15';
COMMENT ON COLUMN public.pjecalc_verbas.fracao_mes_modo IS 'How to handle partial months: manter_fracao, integralizar, desprezar, desprezar_menor_15';

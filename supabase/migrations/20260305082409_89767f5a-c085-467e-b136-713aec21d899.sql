
-- Add CS employer config columns to pjecalc_calculos
ALTER TABLE public.pjecalc_calculos 
  ADD COLUMN IF NOT EXISTS cs_aliquota_empresa numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS cs_aliquota_sat numeric DEFAULT 2,
  ADD COLUMN IF NOT EXISTS cs_aliquota_terceiros numeric DEFAULT 5.8,
  ADD COLUMN IF NOT EXISTS cs_cobrar_reclamante boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cs_sobre_salarios_pagos boolean DEFAULT false;

-- Recreate pjecalc_cs_config view with new columns
DROP VIEW IF EXISTS public.pjecalc_cs_config;
CREATE OR REPLACE VIEW public.pjecalc_cs_config AS
SELECT 
  c.id,
  c.case_id,
  true AS habilitado,
  'progressiva'::text AS regime,
  COALESCE(c.cs_aliquota_empresa, 20) AS aliquota_empresa,
  COALESCE(c.cs_aliquota_sat, 2) AS aliquota_sat,
  COALESCE(c.cs_aliquota_terceiros, 5.8) AS aliquota_terceiros,
  COALESCE(c.cs_cobrar_reclamante, true) AS cobrar_reclamante,
  COALESCE(c.cs_sobre_salarios_pagos, false) AS cs_sobre_salarios_pagos,
  c.created_at
FROM public.pjecalc_calculos c;

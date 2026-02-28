
-- =====================================================
-- FASE 5: Persistência de Ocorrências
-- =====================================================

-- [1A] pjecalc_ocorrencias (ocorrências de verbas)
CREATE TABLE IF NOT EXISTS public.pjecalc_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL,
  verba_id UUID NOT NULL,
  competencia TEXT NOT NULL, -- YYYY-MM
  ativa BOOLEAN NOT NULL DEFAULT true,
  origem TEXT NOT NULL DEFAULT 'CALCULADA' CHECK (origem IN ('CALCULADA','INFORMADA')),
  base_valor NUMERIC NOT NULL DEFAULT 0,
  divisor_valor NUMERIC NOT NULL DEFAULT 30,
  multiplicador_valor NUMERIC NOT NULL DEFAULT 1,
  quantidade_valor NUMERIC NOT NULL DEFAULT 1,
  dobra NUMERIC NOT NULL DEFAULT 1,
  devido NUMERIC NOT NULL DEFAULT 0,
  pago NUMERIC NOT NULL DEFAULT 0,
  diferenca NUMERIC NOT NULL DEFAULT 0,
  correcao NUMERIC NOT NULL DEFAULT 0,
  juros NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  meta_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(calculo_id, verba_id, competencia)
);

CREATE INDEX idx_pjecalc_ocorrencias_calculo ON public.pjecalc_ocorrencias(calculo_id);
CREATE INDEX idx_pjecalc_ocorrencias_verba ON public.pjecalc_ocorrencias(verba_id);
CREATE INDEX idx_pjecalc_ocorrencias_comp ON public.pjecalc_ocorrencias(competencia);

-- [1B] pjecalc_fgts_ocorrencias
CREATE TABLE IF NOT EXISTS public.pjecalc_fgts_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL,
  competencia TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  base_historico NUMERIC NOT NULL DEFAULT 0,
  base_verbas NUMERIC NOT NULL DEFAULT 0,
  base_total NUMERIC NOT NULL DEFAULT 0,
  aliquota NUMERIC NOT NULL DEFAULT 0.08,
  valor NUMERIC NOT NULL DEFAULT 0,
  multa NUMERIC NOT NULL DEFAULT 0,
  recolhido NUMERIC NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'CALCULADA' CHECK (origem IN ('CALCULADA','INFORMADA')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(calculo_id, competencia)
);

CREATE INDEX idx_pjecalc_fgts_oc_calculo ON public.pjecalc_fgts_ocorrencias(calculo_id);

-- [1C] pjecalc_cs_ocorrencias
CREATE TABLE IF NOT EXISTS public.pjecalc_cs_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id UUID NOT NULL,
  competencia TEXT NOT NULL,
  aba TEXT NOT NULL DEFAULT 'DEVIDOS' CHECK (aba IN ('DEVIDOS','PAGOS')),
  ativa BOOLEAN NOT NULL DEFAULT true,
  base NUMERIC NOT NULL DEFAULT 0,
  segurado NUMERIC NOT NULL DEFAULT 0,
  empresa NUMERIC NOT NULL DEFAULT 0,
  sat NUMERIC NOT NULL DEFAULT 0,
  terceiros NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'CALCULADA' CHECK (origem IN ('CALCULADA','INFORMADA')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(calculo_id, competencia, aba)
);

CREATE INDEX idx_pjecalc_cs_oc_calculo ON public.pjecalc_cs_ocorrencias(calculo_id);

-- RLS Policies (open for authenticated users - same pattern as rest of system)
ALTER TABLE public.pjecalc_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_fgts_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_cs_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.pjecalc_ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.pjecalc_fgts_ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.pjecalc_cs_ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon for dev (same as other pjecalc tables)
CREATE POLICY "Allow all for anon" ON public.pjecalc_ocorrencias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.pjecalc_fgts_ocorrencias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.pjecalc_cs_ocorrencias FOR ALL TO anon USING (true) WITH CHECK (true);

-- RPC for batch update
CREATE OR REPLACE FUNCTION public.pjecalc_batch_update_ocorrencias(
  p_calculo_id UUID,
  p_filtro JSONB, -- { verba_ids?: string[], competencia_inicio?: string, competencia_fim?: string }
  p_changes JSONB  -- { campo: valor } ex: { "pago": 100, "ativa": false }
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE pjecalc_ocorrencias
  SET
    base_valor = COALESCE((p_changes->>'base_valor')::numeric, base_valor),
    divisor_valor = COALESCE((p_changes->>'divisor_valor')::numeric, divisor_valor),
    multiplicador_valor = COALESCE((p_changes->>'multiplicador_valor')::numeric, multiplicador_valor),
    quantidade_valor = COALESCE((p_changes->>'quantidade_valor')::numeric, quantidade_valor),
    dobra = COALESCE((p_changes->>'dobra')::numeric, dobra),
    pago = COALESCE((p_changes->>'pago')::numeric, pago),
    ativa = COALESCE((p_changes->>'ativa')::boolean, ativa),
    origem = 'INFORMADA',
    updated_at = now()
  WHERE calculo_id = p_calculo_id
    AND (p_filtro->>'verba_ids' IS NULL OR verba_id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filtro->'verba_ids'))))
    AND (p_filtro->>'competencia_inicio' IS NULL OR competencia >= p_filtro->>'competencia_inicio')
    AND (p_filtro->>'competencia_fim' IS NULL OR competencia <= p_filtro->>'competencia_fim');

  GET DIAGNOSTICS affected = ROW_COUNT;
  
  -- Recalculate devido and diferenca for affected rows
  UPDATE pjecalc_ocorrencias
  SET
    devido = ROUND((base_valor * multiplicador_valor / NULLIF(divisor_valor, 0)) * quantidade_valor * dobra, 2),
    diferenca = ROUND((base_valor * multiplicador_valor / NULLIF(divisor_valor, 0)) * quantidade_valor * dobra, 2) - pago,
    total = ROUND((base_valor * multiplicador_valor / NULLIF(divisor_valor, 0)) * quantidade_valor * dobra, 2) - pago + correcao + juros
  WHERE calculo_id = p_calculo_id
    AND (p_filtro->>'verba_ids' IS NULL OR verba_id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(p_filtro->'verba_ids'))))
    AND (p_filtro->>'competencia_inicio' IS NULL OR competencia >= p_filtro->>'competencia_inicio')
    AND (p_filtro->>'competencia_fim' IS NULL OR competencia <= p_filtro->>'competencia_fim');

  RETURN affected;
END;
$$;

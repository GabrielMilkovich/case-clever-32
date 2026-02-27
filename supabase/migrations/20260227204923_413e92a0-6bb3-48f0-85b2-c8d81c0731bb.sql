
-- pjecalc_imposto_renda_faixas: unique on (ir_id, faixa)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pjecalc_imposto_renda_faixas_irid_faixa_unique') THEN
    ALTER TABLE public.pjecalc_imposto_renda_faixas ADD CONSTRAINT pjecalc_imposto_renda_faixas_irid_faixa_unique UNIQUE (ir_id, faixa);
  END IF;
END $$;

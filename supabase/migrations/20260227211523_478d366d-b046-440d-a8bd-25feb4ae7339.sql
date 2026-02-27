
-- Only create the two missing tables (cs_config already exists)

-- Case-level Custas config (if not already created by previous partial migration)
CREATE TABLE IF NOT EXISTS public.pjecalc_custas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  apurar boolean DEFAULT true,
  percentual numeric DEFAULT 2,
  valor_minimo numeric DEFAULT 10.64,
  valor_maximo numeric,
  isento boolean DEFAULT false,
  assistencia_judiciaria boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_custas_config' AND policyname = 'Allow authenticated full access on pjecalc_custas_config') THEN
    ALTER TABLE public.pjecalc_custas_config ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow authenticated full access on pjecalc_custas_config" ON public.pjecalc_custas_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Case-level Seguro Desemprego config
CREATE TABLE IF NOT EXISTS public.pjecalc_seguro_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  apurar boolean DEFAULT false,
  parcelas integer DEFAULT 5,
  valor_parcela numeric,
  recebeu boolean DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pjecalc_seguro_config' AND policyname = 'Allow authenticated full access on pjecalc_seguro_config') THEN
    ALTER TABLE public.pjecalc_seguro_config ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow authenticated full access on pjecalc_seguro_config" ON public.pjecalc_seguro_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

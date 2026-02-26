
-- V3 Schema changes (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_sources' AND column_name='status') THEN
    ALTER TABLE public.legal_sources ADD COLUMN status text NOT NULL DEFAULT 'vigente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_rules' AND column_name='status') THEN
    ALTER TABLE public.legal_rules ADD COLUMN status text NOT NULL DEFAULT 'vigente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_rules' AND column_name='referencia_curta') THEN
    ALTER TABLE public.legal_rules ADD COLUMN referencia_curta text;
  END IF;
END $$;


-- Step 1: Create audit/versioning infrastructure
CREATE TABLE IF NOT EXISTS public.reference_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'api',
  url text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_sources ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_sources') THEN
    CREATE POLICY "auth_manage_ref_sources" ON public.reference_sources FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_table_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  update_frequency text NOT NULL DEFAULT 'monthly',
  source_id uuid REFERENCES public.reference_sources(id),
  is_auto_importable boolean NOT NULL DEFAULT false,
  requires_manual_input boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ok',
  last_import_at timestamptz,
  last_import_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_table_registry ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_table_registry') THEN
    CREATE POLICY "auth_manage_registry" ON public.reference_table_registry FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_slug text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trigger text NOT NULL DEFAULT 'manual',
  result text NOT NULL DEFAULT 'pending',
  errors jsonb DEFAULT '[]'::jsonb,
  stats jsonb DEFAULT '{}'::jsonb,
  raw_file_path text,
  raw_file_hash text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reference_import_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_import_runs') THEN
    CREATE POLICY "auth_manage_import_runs" ON public.reference_import_runs FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reference_table_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_slug text NOT NULL,
  competency_year int NOT NULL,
  competency_month int,
  valid_from date,
  valid_to date,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  source_snapshot jsonb DEFAULT '{}'::jsonb,
  notes text,
  import_run_id uuid REFERENCES public.reference_import_runs(id)
);
ALTER TABLE public.reference_table_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reference_table_versions') THEN
    CREATE POLICY "auth_manage_versions" ON public.reference_table_versions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END$$;

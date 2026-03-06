
-- Table: indices_oficiais - stores BCB time series data (IPCA-E, SELIC)
CREATE TABLE IF NOT EXISTS public.indices_oficiais (
  serie_id INTEGER NOT NULL,
  data_referencia DATE NOT NULL,
  valor DECIMAL(12, 6) NOT NULL,
  ultima_atualizacao TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (serie_id, data_referencia)
);

-- Table: sync_status - tracks sync state per series
CREATE TABLE IF NOT EXISTS public.sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serie_id INTEGER NOT NULL UNIQUE,
  serie_nome TEXT,
  last_processed_date DATE,
  status TEXT DEFAULT 'pending',
  last_sync_attempt TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: indices_oficiais is public read, authenticated write
ALTER TABLE public.indices_oficiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read indices" ON public.indices_oficiais FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert indices" ON public.indices_oficiais FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update indices" ON public.indices_oficiais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS: sync_status
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sync_status" ON public.sync_status FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage sync_status" ON public.sync_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial sync_status entries
INSERT INTO public.sync_status (serie_id, serie_nome, status) VALUES
  (10764, 'IPCA-E', 'pending'),
  (4390, 'SELIC', 'pending')
ON CONFLICT (serie_id) DO NOTHING;

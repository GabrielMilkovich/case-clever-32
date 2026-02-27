
CREATE TABLE IF NOT EXISTS public.pjecalc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid,
  modulo text NOT NULL,
  acao text NOT NULL,
  campo text,
  valor_anterior text,
  valor_novo text,
  justificativa text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select" ON public.pjecalc_audit_log FOR SELECT USING (true);
CREATE POLICY "audit_log_insert" ON public.pjecalc_audit_log FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pjecalc_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  modulo text NOT NULL,
  tipo text DEFAULT 'observacao',
  texto text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obs_all" ON public.pjecalc_observacoes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.pjecalc_metricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid,
  evento text NOT NULL,
  modulo text,
  duracao_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_metricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metricas_all" ON public.pjecalc_metricas FOR ALL USING (true) WITH CHECK (true);

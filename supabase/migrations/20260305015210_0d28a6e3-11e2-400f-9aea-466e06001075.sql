
-- Add missing columns to pjecalc_calculos for PJC import parity
ALTER TABLE public.pjecalc_calculos 
  ADD COLUMN IF NOT EXISTS sabado_dia_util boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS projeta_aviso boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS considera_feriado_estadual boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS considera_feriado_municipal boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS prescricao_quinquenal boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS prescricao_fgts boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS zera_negativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS limitar_avos boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dia_fechamento integer DEFAULT 31,
  ADD COLUMN IF NOT EXISTS duplicado_de uuid REFERENCES public.pjecalc_calculos(id),
  ADD COLUMN IF NOT EXISTS pjc_import_metadata jsonb;

-- Add missing columns to pjecalc_verba_base for full PJC formula parity
ALTER TABLE public.pjecalc_verba_base
  ADD COLUMN IF NOT EXISTS quantidade_tipo text DEFAULT 'INFORMADA',
  ADD COLUMN IF NOT EXISTS quantidade_valor numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS divisor_tipo text DEFAULT 'OUTRO_VALOR',
  ADD COLUMN IF NOT EXISTS base_tabelada text,
  ADD COLUMN IF NOT EXISTS excluir_falta_justificada boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluir_falta_nao_justificada boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluir_ferias_gozadas boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gerar_principal text DEFAULT 'DIFERENCA',
  ADD COLUMN IF NOT EXISTS gerar_reflexo text DEFAULT 'DIFERENCA',
  ADD COLUMN IF NOT EXISTS compor_principal boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS pjc_id text;

-- Add missing columns to pjecalc_reflexo for full behavior parity  
ALTER TABLE public.pjecalc_reflexo
  ADD COLUMN IF NOT EXISTS multiplicador numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS divisor numeric DEFAULT 12,
  ADD COLUMN IF NOT EXISTS divisor_tipo text DEFAULT 'INFORMADO',
  ADD COLUMN IF NOT EXISTS quantidade_tipo text DEFAULT 'AVOS',
  ADD COLUMN IF NOT EXISTS pjc_id text;

-- Add integral tracking columns to pjecalc_ocorrencia_calculo
ALTER TABLE public.pjecalc_ocorrencia_calculo
  ADD COLUMN IF NOT EXISTS base_integral numeric,
  ADD COLUMN IF NOT EXISTS quantidade_integral numeric,
  ADD COLUMN IF NOT EXISTS devido_integral numeric,
  ADD COLUMN IF NOT EXISTS pago_integral numeric,
  ADD COLUMN IF NOT EXISTS indice_acumulado numeric,
  ADD COLUMN IF NOT EXISTS parametros_snapshot jsonb;

-- Create pjc_import_jobs table for tracking imports
CREATE TABLE IF NOT EXISTS public.pjc_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'PENDENTE',
  arquivo_nome text,
  arquivo_hash text,
  resultado jsonb,
  verbas_importadas integer DEFAULT 0,
  reflexos_importados integer DEFAULT 0,
  historicos_importados integer DEFAULT 0,
  warnings jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.pjc_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own imports" ON public.pjc_import_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Create function to block edits on FECHADO calculations
CREATE OR REPLACE FUNCTION public.pjecalc_block_fechado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  -- Get status of parent calculation
  SELECT status INTO v_status FROM pjecalc_calculos WHERE id = COALESCE(NEW.calculo_id, OLD.calculo_id);
  IF v_status = 'FECHADO' THEN
    RAISE EXCEPTION 'Cálculo está FECHADO. Operações de escrita bloqueadas.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to key child tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'pjecalc_verba_base',
    'pjecalc_reflexo',
    'pjecalc_ocorrencia_calculo',
    'pjecalc_hist_salarial',
    'pjecalc_hist_salarial_mes',
    'pjecalc_evento_intervalo'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_block_fechado ON %I; CREATE TRIGGER trg_block_fechado BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION pjecalc_block_fechado();',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- =====================================================
-- 1. pjecalc_ir_faixas — View over pjecalc_imposto_renda + pjecalc_imposto_renda_faixas
-- =====================================================
CREATE OR REPLACE VIEW public.pjecalc_ir_faixas AS
SELECT 
  f.id,
  ir.competencia AS competencia_inicio,
  f.faixa,
  f.valor_inicial,
  f.valor_final,
  f.aliquota,
  f.parcela_deduzir,
  ir.deducao_dependente
FROM public.pjecalc_imposto_renda_faixas f
JOIN public.pjecalc_imposto_renda ir ON ir.id = f.ir_id
ORDER BY ir.competencia, f.faixa;

-- =====================================================
-- 2. pjecalc_fgts_saldos_saques
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_fgts_saldos_saques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  case_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'saldo',
  data date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_fgts_saldos_saques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage fgts saldos" ON public.pjecalc_fgts_saldos_saques
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 3. pjecalc_observacoes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pjecalc_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  modulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'nota',
  texto text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pjecalc_observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage observacoes" ON public.pjecalc_observacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

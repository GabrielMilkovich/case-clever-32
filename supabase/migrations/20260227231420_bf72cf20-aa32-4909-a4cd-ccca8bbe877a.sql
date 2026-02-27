
-- Coluna de status para fechar/reabrir cálculo
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberto';
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS fechado_em timestamptz;
ALTER TABLE public.pjecalc_liquidacao_resultado ADD COLUMN IF NOT EXISTS fechado_por uuid;

-- Tabela de Previdência Privada
CREATE TABLE IF NOT EXISTS public.pjecalc_previdencia_privada_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  percentual numeric NOT NULL DEFAULT 0,
  base_calculo text NOT NULL DEFAULT 'diferenca',
  deduzir_ir boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);
ALTER TABLE public.pjecalc_previdencia_privada_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read prev_priv" ON public.pjecalc_previdencia_privada_config FOR SELECT USING (true);
CREATE POLICY "Auth can manage prev_priv" ON public.pjecalc_previdencia_privada_config FOR ALL USING (auth.role() = 'authenticated');

-- Configuração de colunas dinâmicas do cartão de ponto (por case)
CREATE TABLE IF NOT EXISTS public.pjecalc_cartao_ponto_colunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  colunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);
ALTER TABLE public.pjecalc_cartao_ponto_colunas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cp_cols" ON public.pjecalc_cartao_ponto_colunas FOR SELECT USING (true);
CREATE POLICY "Auth can manage cp_cols" ON public.pjecalc_cartao_ponto_colunas FOR ALL USING (auth.role() = 'authenticated');

-- Adicionar campo de dados dinâmicos extras ao cartão de ponto
ALTER TABLE public.pjecalc_cartao_ponto ADD COLUMN IF NOT EXISTS dados_extras jsonb DEFAULT '{}'::jsonb;

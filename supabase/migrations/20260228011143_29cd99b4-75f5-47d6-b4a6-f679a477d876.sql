
-- Add status and lock fields to liquidacao_resultado for lock/unlock/duplicate
ALTER TABLE IF EXISTS pjecalc_liquidacao_resultado 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  ADD COLUMN IF NOT EXISTS fechado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fechado_por TEXT,
  ADD COLUMN IF NOT EXISTS duplicado_de UUID;

-- Add proporcionalizar_devido and proporcionalizar_pago to verbas
ALTER TABLE IF EXISTS pjecalc_verbas
  ADD COLUMN IF NOT EXISTS proporcionalizar_devido BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS proporcionalizar_pago BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_multiplicador TEXT DEFAULT 'informado',
  ADD COLUMN IF NOT EXISTS media_quantidade BOOLEAN DEFAULT false;


-- Tabela de registros diários de ponto (como no PJe-Calc real)
-- Cada linha = 1 dia com horários de entrada, saída, intervalo
CREATE TABLE public.pjecalc_ponto_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  dia_semana TEXT, -- 'Segunda', 'Terça', etc.
  entrada_1 TEXT, -- '08:00'
  saida_1 TEXT,   -- '12:00'
  entrada_2 TEXT, -- '13:00' (volta intervalo)
  saida_2 TEXT,   -- '17:00'
  entrada_3 TEXT, -- turno extra
  saida_3 TEXT,
  frequencia TEXT, -- horários concatenados para exibição
  horas_trabalhadas NUMERIC(6,2) DEFAULT 0,
  horas_extras_diarias NUMERIC(6,2) DEFAULT 0,
  horas_extras_semanais NUMERIC(6,2) DEFAULT 0,
  horas_extras_dsr NUMERIC(6,2) DEFAULT 0,
  horas_noturnas NUMERIC(6,2) DEFAULT 0,
  intervalo_suprimido NUMERIC(6,2) DEFAULT 0,
  sobreaviso NUMERIC(6,2) DEFAULT 0,
  tipo TEXT DEFAULT 'normal', -- 'normal', 'falta', 'feriado', 'folga', 'atestado', 'ferias'
  observacao TEXT,
  origem TEXT DEFAULT 'INFORMADA', -- 'INFORMADA', 'FIXADA' (jornada fixada pelo juiz)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, data)
);

-- Índice para busca rápida por caso e período
CREATE INDEX idx_ponto_diario_case_data ON public.pjecalc_ponto_diario(case_id, data);

-- RLS
ALTER TABLE public.pjecalc_ponto_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ponto_diario" ON public.pjecalc_ponto_diario
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Função para calcular horas entre dois horários (texto HH:MM)
CREATE OR REPLACE FUNCTION public.pjecalc_calc_horas_entre(h_inicio TEXT, h_fim TEXT)
RETURNS NUMERIC AS $$
DECLARE
  t1 TIME;
  t2 TIME;
  diff INTERVAL;
BEGIN
  IF h_inicio IS NULL OR h_fim IS NULL OR h_inicio = '' OR h_fim = '' THEN
    RETURN 0;
  END IF;
  t1 := h_inicio::TIME;
  t2 := h_fim::TIME;
  IF t2 < t1 THEN
    -- Atravessou meia-noite
    diff := (t2 + INTERVAL '24 hours') - t1;
  ELSE
    diff := t2 - t1;
  END IF;
  RETURN EXTRACT(EPOCH FROM diff) / 3600.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

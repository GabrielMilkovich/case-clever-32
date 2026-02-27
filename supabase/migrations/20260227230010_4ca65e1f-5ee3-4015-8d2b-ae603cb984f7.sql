
-- Tabela de faixas INSS versionadas por competência
CREATE TABLE public.pjecalc_inss_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_inicio date NOT NULL,
  competencia_fim date,
  faixa integer NOT NULL,
  valor_ate numeric NOT NULL,
  aliquota numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_inss_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read inss_faixas" ON public.pjecalc_inss_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage inss_faixas" ON public.pjecalc_inss_faixas FOR ALL USING (auth.role() = 'authenticated');

-- Tabela de faixas IR versionadas por competência
CREATE TABLE public.pjecalc_ir_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_inicio date NOT NULL,
  competencia_fim date,
  faixa integer NOT NULL,
  valor_ate numeric NOT NULL,
  aliquota numeric NOT NULL,
  deducao numeric NOT NULL DEFAULT 0,
  deducao_dependente numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pjecalc_ir_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ir_faixas" ON public.pjecalc_ir_faixas FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage ir_faixas" ON public.pjecalc_ir_faixas FOR ALL USING (auth.role() = 'authenticated');

-- Seed INSS 2023
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota) VALUES
('2023-01-01', '2023-12-31', 1, 1320.00, 0.075),
('2023-01-01', '2023-12-31', 2, 2571.29, 0.09),
('2023-01-01', '2023-12-31', 3, 3856.94, 0.12),
('2023-01-01', '2023-12-31', 4, 7507.49, 0.14);

-- Seed INSS 2024
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota) VALUES
('2024-01-01', '2024-12-31', 1, 1412.00, 0.075),
('2024-01-01', '2024-12-31', 2, 2666.68, 0.09),
('2024-01-01', '2024-12-31', 3, 5999.54, 0.12),
('2024-01-01', '2024-12-31', 4, 7786.02, 0.14);

-- Seed INSS 2025
INSERT INTO public.pjecalc_inss_faixas (competencia_inicio, faixa, valor_ate, aliquota) VALUES
('2025-01-01', 1, 1518.00, 0.075),
('2025-01-01', 2, 2793.88, 0.09),
('2025-01-01', 3, 5839.45, 0.12),
('2025-01-01', 4, 8157.41, 0.14);

-- Seed IR 2023 (maio em diante)
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2023-05-01', '2023-12-31', 1, 2112.00, 0, 0, 189.59),
('2023-05-01', '2023-12-31', 2, 2826.65, 0.075, 158.40, 189.59),
('2023-05-01', '2023-12-31', 3, 3751.05, 0.15, 370.40, 189.59),
('2023-05-01', '2023-12-31', 4, 4664.68, 0.225, 651.73, 189.59),
('2023-05-01', '2023-12-31', 5, 999999999, 0.275, 884.96, 189.59);

-- Seed IR 2024
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, competencia_fim, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2024-01-01', '2024-12-31', 1, 2259.20, 0, 0, 189.59),
('2024-01-01', '2024-12-31', 2, 2826.65, 0.075, 169.44, 189.59),
('2024-01-01', '2024-12-31', 3, 3751.05, 0.15, 381.44, 189.59),
('2024-01-01', '2024-12-31', 4, 4664.68, 0.225, 662.77, 189.59),
('2024-01-01', '2024-12-31', 5, 999999999, 0.275, 896.00, 189.59);

-- Seed IR 2025
INSERT INTO public.pjecalc_ir_faixas (competencia_inicio, faixa, valor_ate, aliquota, deducao, deducao_dependente) VALUES
('2025-01-01', 1, 2259.20, 0, 0, 189.59),
('2025-01-01', 2, 2826.65, 0.075, 169.44, 189.59),
('2025-01-01', 3, 3751.05, 0.15, 381.44, 189.59),
('2025-01-01', 4, 4664.68, 0.225, 662.77, 189.59),
('2025-01-01', 5, 999999999, 0.275, 896.00, 189.59);

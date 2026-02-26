-- Inserir tabelas INSS progressivas (Portaria MPS/MF)
-- 2024: Portaria MPS/MF nº 12/2024
INSERT INTO tax_tables (id, tipo, vigencia_inicio, vigencia_fim, faixas) VALUES
(gen_random_uuid(), 'inss', '2024-01-01', '2024-12-31', 
  '[{"ate": 1412.00, "aliquota": 0.075}, {"ate": 2666.68, "aliquota": 0.09}, {"ate": 4000.03, "aliquota": 0.12}, {"ate": 7786.02, "aliquota": 0.14}]'::jsonb
),
-- 2025: Portaria MPS/MF nº 6/2025
(gen_random_uuid(), 'inss', '2025-01-01', NULL, 
  '[{"ate": 1518.00, "aliquota": 0.075}, {"ate": 2793.88, "aliquota": 0.09}, {"ate": 4190.83, "aliquota": 0.12}, {"ate": 8157.41, "aliquota": 0.14}]'::jsonb
);

-- Create calculator versions for each calculator
INSERT INTO public.calculator_versions (calculator_id, versao, vigencia_inicio, ativo, regras, changelog) VALUES
  ('7f39fe1e-e210-4d17-bd53-b78b236a2c4d', '1.0.0', '2024-01-01', true, '{"adicional_50": 0.5, "adicional_100": 1.0, "regras": {"base": "salario_hora", "divisor": 220}}', 'Versão inicial - horas extras'),
  ('8e72e1d4-25ef-404f-97c2-b4f3ac57eb29', '1.0.0', '2024-01-01', true, '{"fator_13": 0.0833, "regras": {"proporcional": true}}', 'Versão inicial - reflexos 13º'),
  ('bc90b40e-ab4a-44f8-9baa-7b8f8be1f718', '1.0.0', '2024-01-01', true, '{"fator_ferias": 0.1111, "terco_constitucional": true, "regras": {"proporcional": true}}', 'Versão inicial - reflexos férias'),
  ('5efb4e02-87fc-43c5-a1de-bbf96218d3bb', '1.0.0', '2024-01-01', true, '{"aliquota": 0.08, "multa_rescisoria": 0.4, "regras": {"incide_sobre": ["he_50", "he_100", "dsr"]}}', 'Versão inicial - FGTS'),
  ('92de77f5-49bb-40f9-aea8-0ab0c1df7e98', '1.0.0', '2024-01-01', true, '{"progressivo": true, "regras": {"tabela_vigente": true}}', 'Versão inicial - INSS'),
  ('fcde3bbf-4170-42a5-b913-6b508bbf0f6a', '1.0.0', '2024-01-01', true, '{"indice": "ipca_e", "juros": "selic", "regras": {"aplicar_juros": true}}', 'Versão inicial - atualização monetária');
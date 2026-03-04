
DROP VIEW IF EXISTS public.pjecalc_correcao_config;

CREATE VIEW public.pjecalc_correcao_config AS
SELECT c.id,
    c.case_id,
    ac.regime_padrao AS indice,
    ac.combinacoes_indice,
    ac.combinacoes_juros,
    c.created_at,
    (SELECT regime_padrao FROM pjecalc_atualizacao_config WHERE calculo_id = c.id AND tipo = 'juros' LIMIT 1) AS juros_tipo,
    CASE WHEN ac.regime_padrao IN ('IPCAE','IPCA-E') AND 
         EXISTS (SELECT 1 FROM pjecalc_atualizacao_config WHERE calculo_id = c.id AND tipo = 'juros' AND regime_padrao = 'SELIC')
    THEN true ELSE false END AS transicao_adc58,
    c.data_ajuizamento::text AS data_citacao,
    'mensal'::text AS epoca,
    NULL::text AS data_fixa,
    1 AS juros_percentual,
    'ajuizamento'::text AS juros_inicio,
    true AS juros_pro_rata,
    NULL::text AS indice_pos_citacao,
    false AS multa_523,
    10 AS multa_523_percentual,
    false AS multa_467,
    50 AS multa_467_percentual,
    c.data_liquidacao::text AS data_liquidacao
FROM pjecalc_calculos c
LEFT JOIN pjecalc_atualizacao_config ac ON ac.calculo_id = c.id AND ac.tipo = 'correcao';

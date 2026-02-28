
-- Fix calc_irrf to use pjecalc_imposto_renda_faixas table instead of non-existent faixas column
CREATE OR REPLACE FUNCTION public.calc_irrf(p_base numeric, p_dependentes integer DEFAULT 0, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_competencia date; 
  v_deducao_dep numeric; 
  v_faixa RECORD; 
  v_base_calc numeric; 
  v_imposto numeric := 0;
BEGIN
  SELECT competencia, COALESCE(deducao_dependente, 0) 
  INTO v_competencia, v_deducao_dep
  FROM pjecalc_imposto_renda 
  WHERE competencia <= p_date 
  ORDER BY competencia DESC LIMIT 1;

  IF v_competencia IS NULL THEN 
    RETURN jsonb_build_object('valor', 0, 'error', 'Tabela IRRF não encontrada'); 
  END IF;

  v_base_calc := p_base - (v_deducao_dep * p_dependentes);
  IF v_base_calc <= 0 THEN 
    RETURN jsonb_build_object('valor', 0, 'isento', true); 
  END IF;

  -- Query from the faixas table joined by ir_id
  FOR v_faixa IN 
    SELECT f.faixa, f.valor_inicial, f.valor_final, f.aliquota, f.parcela_deduzir
    FROM pjecalc_imposto_renda_faixas f
    JOIN pjecalc_imposto_renda ir ON ir.id = f.ir_id
    WHERE ir.competencia = v_competencia
    ORDER BY f.faixa
  LOOP
    IF v_base_calc >= v_faixa.valor_inicial AND
       (v_faixa.valor_final IS NULL OR v_base_calc <= v_faixa.valor_final) THEN
      v_imposto := ROUND(v_base_calc * v_faixa.aliquota / 100 - COALESCE(v_faixa.parcela_deduzir, 0), 2);
      RETURN jsonb_build_object(
        'valor', GREATEST(v_imposto, 0), 
        'base_original', p_base, 
        'deducao_dependentes', v_deducao_dep * p_dependentes,
        'base_calc', v_base_calc, 
        'aliquota', v_faixa.aliquota, 
        'competencia_tabela', v_competencia
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('valor', 0, 'isento', true, 'base_calc', v_base_calc);
END;
$function$;

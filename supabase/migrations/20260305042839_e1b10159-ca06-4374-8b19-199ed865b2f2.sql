
-- 1. Add missing columns to pjecalc_verba_base
ALTER TABLE pjecalc_verba_base ADD COLUMN IF NOT EXISTS verba_principal_id UUID REFERENCES pjecalc_verba_base(id) ON DELETE SET NULL;
ALTER TABLE pjecalc_verba_base ADD COLUMN IF NOT EXISTS valor TEXT NOT NULL DEFAULT 'calculado';
ALTER TABLE pjecalc_verba_base ADD COLUMN IF NOT EXISTS valor_informado_devido NUMERIC;
ALTER TABLE pjecalc_verba_base ADD COLUMN IF NOT EXISTS valor_informado_pago NUMERIC;

-- 2. Drop existing triggers and view
DROP TRIGGER IF EXISTS pjecalc_verbas_insert ON pjecalc_verbas;
DROP TRIGGER IF EXISTS pjecalc_verbas_delete ON pjecalc_verbas;
DROP FUNCTION IF EXISTS pjecalc_verbas_ioi() CASCADE;
DROP FUNCTION IF EXISTS pjecalc_verbas_iod() CASCADE;
DROP VIEW IF EXISTS pjecalc_verbas;

-- 3. Recreate view with proper base_calculo, verba_principal_id, tipo, valor
CREATE OR REPLACE VIEW pjecalc_verbas AS
SELECT
  v.id,
  c.case_id,
  v.calculo_id,
  v.nome,
  v.codigo,
  v.caracteristica,
  v.periodicidade AS ocorrencia_pagamento,
  CASE
    WHEN v.verba_principal_id IS NOT NULL THEN 'reflexa'
    ELSE 'principal'
  END AS tipo,
  v.multiplicador,
  v.divisor AS divisor_informado,
  v.periodo_inicio::text AS periodo_inicio,
  v.periodo_fim::text AS periodo_fim,
  v.ordem,
  v.ativa,
  v.incide_inss,
  v.incide_fgts,
  v.incide_ir,
  v.verba_principal_id,
  v.valor,
  v.valor_informado_devido,
  v.valor_informado_pago,
  v.hist_salarial_nome,
  jsonb_build_object(
    'historicos', COALESCE(
      (SELECT jsonb_agg(hs.id)
       FROM pjecalc_hist_salarial hs
       WHERE hs.calculo_id = v.calculo_id AND hs.nome = v.hist_salarial_nome),
      '[]'::jsonb
    ),
    'tabelas', '[]'::jsonb,
    'verbas', CASE
      WHEN v.verba_principal_id IS NOT NULL THEN jsonb_build_array(v.verba_principal_id)
      ELSE '[]'::jsonb
    END
  ) AS base_calculo,
  '{}'::jsonb AS incidencias,
  v.observacoes,
  v.created_at,
  v.updated_at
FROM pjecalc_verba_base v
JOIN pjecalc_calculos c ON v.calculo_id = c.id;

-- 4. Recreate INSERT trigger with all new fields
CREATE OR REPLACE FUNCTION pjecalc_verbas_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_verba_base (
    calculo_id, nome, codigo, caracteristica, periodicidade,
    multiplicador, divisor, periodo_inicio, periodo_fim,
    ordem, ativa, observacoes, hist_salarial_nome,
    verba_principal_id, valor, valor_informado_devido, valor_informado_pago
  )
  VALUES (
    v_cid, NEW.nome, NEW.codigo,
    COALESCE(NEW.caracteristica, 'COMUM'),
    COALESCE(NEW.ocorrencia_pagamento, 'MENSAL'),
    COALESCE(NEW.multiplicador, 1),
    COALESCE(NEW.divisor_informado, 1),
    NULLIF(NEW.periodo_inicio,'')::date,
    NULLIF(NEW.periodo_fim,'')::date,
    COALESCE(NEW.ordem, 0),
    COALESCE(NEW.ativa, true),
    NEW.observacoes,
    NEW.hist_salarial_nome,
    NEW.verba_principal_id,
    COALESCE(NEW.valor, 'calculado'),
    NEW.valor_informado_devido,
    NEW.valor_informado_pago
  )
  RETURNING id INTO NEW.id;
  RETURN NEW;
END;
$function$;

-- 5. Recreate DELETE trigger
CREATE OR REPLACE FUNCTION pjecalc_verbas_iod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM pjecalc_verba_base WHERE id = OLD.id;
  RETURN OLD;
END;
$function$;

-- 6. Attach triggers to view
CREATE TRIGGER pjecalc_verbas_insert
  INSTEAD OF INSERT ON pjecalc_verbas
  FOR EACH ROW
  EXECUTE FUNCTION pjecalc_verbas_ioi();

CREATE TRIGGER pjecalc_verbas_delete
  INSTEAD OF DELETE ON pjecalc_verbas
  FOR EACH ROW
  EXECUTE FUNCTION pjecalc_verbas_iod();

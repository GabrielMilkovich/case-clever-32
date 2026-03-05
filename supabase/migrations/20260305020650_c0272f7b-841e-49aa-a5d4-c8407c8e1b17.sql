-- Create pjecalc_historico_ocorrencias as a view over the real v2 table
CREATE OR REPLACE VIEW public.pjecalc_historico_ocorrencias AS
SELECT 
  m.id,
  m.hist_salarial_id AS historico_id,
  c.case_id,
  m.competencia::text AS competencia,
  m.valor,
  COALESCE(m.origem, 'informado') AS tipo,
  m.created_at
FROM pjecalc_hist_salarial_mes m
JOIN pjecalc_hist_salarial h ON m.hist_salarial_id = h.id
JOIN pjecalc_calculos c ON h.calculo_id = c.id;

-- Create trigger function for INSERT on the view
CREATE OR REPLACE FUNCTION public.pjecalc_hist_ocorr_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_calculo_id UUID;
BEGIN
  -- Get calculo_id from the hist_salarial record
  SELECT calculo_id INTO v_calculo_id FROM pjecalc_hist_salarial WHERE id = NEW.historico_id;
  IF v_calculo_id IS NULL THEN
    RAISE EXCEPTION 'historico_id not found in pjecalc_hist_salarial';
  END IF;
  
  INSERT INTO pjecalc_hist_salarial_mes (calculo_id, hist_salarial_id, competencia, valor, origem)
  VALUES (
    v_calculo_id,
    NEW.historico_id,
    CASE WHEN length(NEW.competencia) = 7 THEN NEW.competencia || '-01' ELSE NEW.competencia END::date,
    COALESCE(NEW.valor, 0),
    COALESCE(NEW.tipo, 'informado')
  );
  RETURN NEW;
END;
$$;

-- Create trigger function for UPDATE on the view
CREATE OR REPLACE FUNCTION public.pjecalc_hist_ocorr_iou()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pjecalc_hist_salarial_mes SET
    valor = COALESCE(NEW.valor, valor),
    origem = COALESCE(NEW.tipo, origem)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger function for DELETE on the view
CREATE OR REPLACE FUNCTION public.pjecalc_hist_ocorr_iod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM pjecalc_hist_salarial_mes WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Attach triggers to the view
CREATE TRIGGER pjecalc_hist_ocorr_insert INSTEAD OF INSERT ON pjecalc_historico_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_ocorr_ioi();
CREATE TRIGGER pjecalc_hist_ocorr_update INSTEAD OF UPDATE ON pjecalc_historico_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_ocorr_iou();
CREATE TRIGGER pjecalc_hist_ocorr_delete INSTEAD OF DELETE ON pjecalc_historico_ocorrencias FOR EACH ROW EXECUTE FUNCTION pjecalc_hist_ocorr_iod();

-- Create the underlying table for seguro-desemprego config
CREATE TABLE IF NOT EXISTS public.pjecalc_seguro_desemprego_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.pjecalc_calculos(id) ON DELETE CASCADE,
  apurar boolean NOT NULL DEFAULT false,
  parcelas integer NOT NULL DEFAULT 5,
  valor_parcela numeric,
  recebeu boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calculo_id)
);

ALTER TABLE public.pjecalc_seguro_desemprego_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage seguro config" ON public.pjecalc_seguro_desemprego_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create the compatibility view
CREATE OR REPLACE VIEW public.pjecalc_seguro_config AS
SELECT
  sd.id,
  c.case_id,
  sd.calculo_id,
  sd.apurar,
  sd.parcelas,
  sd.valor_parcela,
  sd.recebeu,
  sd.observacoes,
  sd.created_at,
  sd.updated_at
FROM public.pjecalc_seguro_desemprego_config sd
JOIN public.pjecalc_calculos c ON c.id = sd.calculo_id;

-- IOI trigger for the view
CREATE OR REPLACE FUNCTION public.pjecalc_seguro_ioi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := pjecalc_get_calculo_id(NEW.case_id);
  INSERT INTO pjecalc_seguro_desemprego_config (calculo_id, apurar, parcelas, valor_parcela, recebeu, observacoes)
  VALUES (v_cid, COALESCE(NEW.apurar, false), COALESCE(NEW.parcelas, 5), NEW.valor_parcela, COALESCE(NEW.recebeu, false), NEW.observacoes)
  ON CONFLICT (calculo_id) DO UPDATE SET
    apurar = EXCLUDED.apurar,
    parcelas = EXCLUDED.parcelas,
    valor_parcela = EXCLUDED.valor_parcela,
    recebeu = EXCLUDED.recebeu,
    observacoes = EXCLUDED.observacoes,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pjecalc_seguro_config_ioi
  INSTEAD OF INSERT ON public.pjecalc_seguro_config
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_seguro_ioi();

-- IOU trigger
CREATE OR REPLACE FUNCTION public.pjecalc_seguro_iou()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pjecalc_seguro_desemprego_config SET
    apurar = COALESCE(NEW.apurar, apurar),
    parcelas = COALESCE(NEW.parcelas, parcelas),
    valor_parcela = NEW.valor_parcela,
    recebeu = COALESCE(NEW.recebeu, recebeu),
    observacoes = COALESCE(NEW.observacoes, observacoes),
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pjecalc_seguro_config_iou
  INSTEAD OF UPDATE ON public.pjecalc_seguro_config
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_seguro_iou();

-- IOD trigger
CREATE OR REPLACE FUNCTION public.pjecalc_seguro_iod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM pjecalc_seguro_desemprego_config WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER pjecalc_seguro_config_iod
  INSTEAD OF DELETE ON public.pjecalc_seguro_config
  FOR EACH ROW EXECUTE FUNCTION public.pjecalc_seguro_iod();

NOTIFY pgrst, 'reload schema';
